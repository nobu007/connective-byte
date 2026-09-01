/**
 * カリキュラム原稿（content-curriculum/）→ Neon Postgres 取込み
 *
 * 使い方:
 *   npm run import:curriculum -- --dry-run   # DBを書き換えず計画だけ表示
 *   npm run import:curriculum                # 取込み（既存の公開状態・並び順は保持）
 *   npm run import:curriculum -- --publish   # 新規モジュール/セッションを公開状態で作成
 *
 * 冪等: slug（= ディレクトリ名/ファイル名）をキーに upsert。
 * 再実行で本文・タイトル等を更新するが、既存行の is_published / order_index
 * は変更しない（管理UIでの手動調整を壊さない）。
 * 仕様: content-curriculum/README.md
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { neon } from '@neondatabase/serverless';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const publish = args.includes('--publish');

const ROOT = path.resolve('content-curriculum');
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

// --- 原稿の解析 ---

function fail(file, message) {
  console.error(`❌ ${file}: ${message}`);
  process.exit(1);
}

async function loadCurriculum() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  const weekDirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .filter((name) => SLUG_PATTERN.test(name))
    .sort();

  if (weekDirs.length === 0) {
    console.error(`❌ ${ROOT} にモジュールディレクトリ（例: week-01/）がありません`);
    process.exit(1);
  }

  const modules = [];
  for (const dirName of weekDirs) {
    const dirPath = path.join(ROOT, dirName);
    const moduleFile = path.join(dirPath, '_module.md');
    let moduleMeta;
    try {
      moduleMeta = matter(await fs.readFile(moduleFile, 'utf-8')).data;
    } catch {
      fail(moduleFile, '読み込めません（各モジュールディレクトリに _module.md が必要）');
    }
    if (!moduleMeta.title) fail(moduleFile, 'frontmatter に title がありません');
    if (!Number.isInteger(moduleMeta.weekNumber)) {
      fail(moduleFile, 'frontmatter に weekNumber（整数）がありません');
    }

    const files = (await fs.readdir(dirPath))
      .filter((f) => f.endsWith('.md') && f !== '_module.md' && !f.startsWith('.'))
      .sort();

    const sessions = [];
    for (const fileName of files) {
      // slug は learning_sessions で全DB一意（UNIQUE制約）のため
      // ディレクトリ名を接頭辞にして週間の衝突を防ぐ（例: week-02-day-01）
      const slug = `${dirName}-${fileName.replace(/\.md$/, '')}`;
      if (!SLUG_PATTERN.test(slug)) fail(path.join(dirPath, fileName), `slug 形式が不正: ${slug}`);
      const { data, content } = matter(await fs.readFile(path.join(dirPath, fileName), 'utf-8'));
      if (!data.title) fail(path.join(dirPath, fileName), 'frontmatter に title がありません');
      sessions.push({
        slug,
        title: data.title,
        description: data.description ?? null,
        durationMinutes: Number.isInteger(data.durationMinutes) ? data.durationMinutes : 0,
        objectives: Array.isArray(data.objectives) ? data.objectives : [],
        content: content.trim(),
      });
    }

    modules.push({
      slug: dirName,
      title: moduleMeta.title,
      description: moduleMeta.description ?? null,
      weekNumber: moduleMeta.weekNumber,
      sessions,
    });
  }
  return modules;
}

const modules = await loadCurriculum();
const sessionCount = modules.reduce((sum, m) => sum + m.sessions.length, 0);
console.log(
  `📖 ${modules.length} モジュール / ${sessionCount} セッション を検出${dryRun ? '（dry-run）' : ''}`
);
if (publish) console.log('📤 新規行は公開状態（is_published=true）で作成します');

if (dryRun) {
  for (const [i, m] of modules.entries()) {
    console.log(`  [${i + 1}] ${m.slug} — ${m.title}（W${m.weekNumber}, ${m.sessions.length}セッション）`);
    for (const s of m.sessions) console.log(`        ${s.slug} — ${s.title}`);
  }
  console.log('✅ dry-run 完了（DB は変更していません）');
  process.exit(0);
}

// --- DB への upsert ---

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL が設定されていません。.env に Neon の接続文字列を追加してください。');
  process.exit(1);
}
const sql = neon(connectionString);

const DEFAULT_PUBLISHED = publish;

// --- DB への upsert ---

let moduleCreated = 0;
let moduleUpdated = 0;
let sessionCreated = 0;
let sessionUpdated = 0;

for (const [index, m] of modules.entries()) {
  const [phase] = await sql.query(
    'SELECT id FROM phases WHERE $1 BETWEEN start_week AND end_week LIMIT 1',
    [m.weekNumber]
  );
  if (!phase) fail(m.slug, `weekNumber ${m.weekNumber} がどの Phase にも属しません`);

  // neon() の sql.query() は fullResults:false 既定で行配列を直接返す（{rows} ではない）
  const rows = await sql.query(
    `INSERT INTO curriculum_modules (id, phase_id, slug, title, description, week_number, order_index, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (slug) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       week_number = EXCLUDED.week_number,
       phase_id = (SELECT id FROM phases WHERE EXCLUDED.week_number BETWEEN start_week AND end_week),
       updated_at = now()
     RETURNING id, (xmax = 0) AS inserted`,
    [crypto.randomUUID(), phase.id, m.slug, m.title, m.description, m.weekNumber, index + 1, DEFAULT_PUBLISHED]
  );
  const moduleId = rows[0].id;
  rows[0].inserted ? moduleCreated++ : moduleUpdated++;

  for (const [sIndex, s] of m.sessions.entries()) {
    const sessionRows = await sql.query(
      `INSERT INTO learning_sessions (id, module_id, slug, title, description, content,
                                      duration_minutes, objectives, order_index, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
       ON CONFLICT (slug) DO UPDATE SET
         module_id = EXCLUDED.module_id,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         content = EXCLUDED.content,
         duration_minutes = EXCLUDED.duration_minutes,
         objectives = EXCLUDED.objectives,
         updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [
        crypto.randomUUID(), moduleId, s.slug, s.title, s.description, s.content,
        s.durationMinutes, JSON.stringify(s.objectives), sIndex + 1, DEFAULT_PUBLISHED,
      ]
    );
    sessionRows[0].inserted ? sessionCreated++ : sessionUpdated++;
  }
}

console.log(
  `✅ 取込み完了: モジュール ${moduleCreated}作成/${moduleUpdated}更新, ` +
    `セッション ${sessionCreated}作成/${sessionUpdated}更新`
);
