#!/usr/bin/env node
/**
 * learning API E2E — 本番の学習コンテンツ配信・進捗・管理を1ユーザーで通し検証
 * 使い方: npm run e2e:learning [-- <apiBaseUrl>]
 *
 * 検証内容:
 *   公開read（curriculum/module/session） → register（learner） →
 *   進捗 upsert・冪等・復帰 → learner の管理API拒否（403） →
 *   SQL で content_administrator へ昇格 →
 *   管理: セッション本文ラウンドトリップ（onChange= 等バイト同一・sanitize免除）・
 *   zod 検証 400・reorder 端ノーオプ・公開切替で progress 保持・分母変化・
 *   モジュール/セッション作成→CASCADE 削除 →
 *   本文を元に戻しテストユーザーを SQL で完全削除（progress も CASCADE）
 *
 * 注意: DATABASE_URL が必要（role 昇格とクリーンアップに使用）。
 * resend.dev 宛なので実メールは飛ばない。実行ごとにテストユーザーを1件作るが
 * 最後に硬削除するため残らない。
 */

import { neon } from '@neondatabase/serverless';

const base = (process.argv[2] || process.env.E2E_LEARNING_URL || 'https://api.connectivebyte.com').replace(
  /\/+$/,
  '',
);

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

function assert(name, cond, detail = '') {
  record(name, Boolean(cond), cond ? '' : detail);
  return Boolean(cond);
}

async function call(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body || ['POST', 'PUT', 'PATCH'].includes(method)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
      break;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  if (!res) throw lastError;

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { res, json };
}

/** sanitizeInput 免除の検証用: 除去対象パターンを全体に含むコードサンプル */
const DANGEROUS_CONTENT = [
  '# 検証用セッション',
  '',
  '`<script>` タグや `onClick=` / `javascript:` を含むコードはそのまま保存される必要がある。',
  '',
  '```jsx',
  'function Editor({ onChange }) {',
  '  return <input onChange={onChange} onClick="javascript:void(0)" />;',
  '}',
  '```',
  '',
  '```html',
  '<a href="javascript:alert(1)">x</a><script>onerror=alert(2)</script>',
  '```',
  '',
  '- 目標: `on\\w+=` パターンの保持',
].join('\n');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL が設定されていません（role 昇格とクリーンアップに必要）');
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-learning-${runId}@resend.dev`;
  const password = 'E2eLearning2026x';
  console.log(`learning E2E: ${base}\nテストユーザー: ${email}\n`);

  // --- 1. 公開 read（認証なし） ---

  const cur = await call('/api/learning/curriculum');
  if (!assert('GET /curriculum（匿名）→ 200', cur.res.status === 200, `HTTP ${cur.res.status}`)) return report();
  const phases = cur.json?.data?.phases ?? [];
  assert('Phase が3件', phases.length === 3, `${phases.length}件`);
  const module = phases.flatMap((p) => p.modules).find((m) => m.slug === 'week-01');
  const session = module?.sessions?.find((s) => s.slug === 'day-01');
  assert('week-01 / day-01 が公開ツリーに存在', Boolean(session));

  const mod = await call('/api/learning/modules/week-01');
  assert('GET /modules/week-01 → 200', mod.res.status === 200, `HTTP ${mod.res.status}`);
  assert('module がセッション要約を返す', (mod.json?.data?.module?.sessions ?? []).length >= 1);

  const pub = await call('/api/learning/sessions/day-01');
  assert('GET /sessions/day-01（匿名）→ 200', pub.res.status === 200, `HTTP ${pub.res.status}`);
  const originalContent = pub.json?.data?.session?.content ?? '';
  assert('本文が空でない', originalContent.length > 0);

  const notFound = await call('/api/learning/sessions/__absent__');
  assert('存在しない slug → 404', notFound.res.status === 404, `HTTP ${notFound.res.status}`);

  // --- 2. learner として ---

  const reg = await call('/api/auth/register', {
    method: 'POST',
    body: { email, password, fullName: 'Learning E2E' },
  });
  if (!assert('register → 201', reg.res.status === 201, `HTTP ${reg.res.status} ${JSON.stringify(reg.json)}`))
    return report();
  let token = reg.json?.data?.accessToken;

  const prog0 = await call('/api/learning/progress', { token });
  assert('GET /progress（learner）→ 200', prog0.res.status === 200, `HTTP ${prog0.res.status}`);
  assert(
    '初期進捗は 0/1',
    prog0.json?.data?.overall?.totalSessions === 1 && prog0.json?.data?.overall?.completedSessions === 0,
    JSON.stringify(prog0.json?.data?.overall),
  );

  const put1 = await call(`/api/learning/progress/sessions/${session.id}`, {
    method: 'PUT',
    token,
    body: { status: 'completed' },
  });
  assert('PUT progress completed → 200', put1.res.status === 200, `HTTP ${put1.res.status} ${JSON.stringify(put1.json)}`);
  const completedAt1 = put1.json?.data?.progress?.completedAt;
  assert('completedAt が設定される', Boolean(completedAt1));

  const put2 = await call(`/api/learning/progress/sessions/${session.id}`, {
    method: 'PUT',
    token,
    body: { status: 'completed' },
  });
  assert('PUT 冪等（再 completed → 200）', put2.res.status === 200, `HTTP ${put2.res.status}`);
  assert('completedAt が変化しない', put2.json?.data?.progress?.completedAt === completedAt1);

  const put3 = await call(`/api/learning/progress/sessions/${session.id}`, {
    method: 'PUT',
    token,
    body: { status: 'in_progress' },
  });
  assert('in_progress へ復帰 → 200', put3.res.status === 200, `HTTP ${put3.res.status}`);
  assert('復帰時 completedAt=null', put3.json?.data?.progress?.completedAt === null);

  await call(`/api/learning/progress/sessions/${session.id}`, { method: 'PUT', token, body: { status: 'completed' } });
  const prog1 = await call('/api/learning/progress', { token });
  assert(
    '進捗 1/1・モジュール別も 1/1',
    prog1.json?.data?.overall?.completedSessions === 1 &&
      prog1.json?.data?.modules?.[0]?.completedSessions === 1,
    JSON.stringify(prog1.json?.data?.overall),
  );

  const badProgress = await call('/api/learning/progress/sessions/not-a-uuid', {
    method: 'PUT',
    token,
    body: { status: 'completed' },
  });
  assert('不正 sessionId → 4xx', badProgress.res.status >= 400 && badProgress.res.status < 500, `HTTP ${badProgress.res.status}`);

  const learnerAdmin = await call('/api/learning/admin/curriculum', { token });
  assert('learner は管理API → 403', learnerAdmin.res.status === 403, `HTTP ${learnerAdmin.res.status}`);

  // --- 3. content_administrator へ昇格（SQL） ---
  // role は JWT に埋め込まれるため、DB 昇格後に再ログインして新しい token を得る
  // （本番運用でも「サインアップ → 昇格 → 次回ログインから有効」と同じ挙動）

  await sql.query(`UPDATE users SET role = 'content_administrator', updated_at = now() WHERE email = $1`, [email]);
  const relogin = await call('/api/auth/login', { method: 'POST', body: { email, password } });
  if (
    !assert('昇格後に再 login → 200', relogin.res.status === 200, `HTTP ${relogin.res.status} ${JSON.stringify(relogin.json)}`)
  )
    return report();
  token = relogin.json?.data?.accessToken;

  const adminCur = await call('/api/learning/admin/curriculum', { token });
  assert('昇格後に管理 curriculum → 200', adminCur.res.status === 200, `HTTP ${adminCur.res.status}`);

  const detail = await call(`/api/learning/admin/sessions/${session.id}`, { token });
  assert('GET 管理 session 詳細 → 200', detail.res.status === 200, `HTTP ${detail.res.status}`);
  assert('詳細の本文が公開側と同一', (detail.json?.data?.session?.content ?? null) === originalContent);

  // --- 4. 本文ラウンドトリップ（sanitize 免除の核） ---

  const patch = await call(`/api/learning/admin/sessions/${session.id}`, {
    method: 'PATCH',
    token,
    body: { content: DANGEROUS_CONTENT },
  });
  assert('PATCH 本文（onChange= 等を含む）→ 200', patch.res.status === 200, `HTTP ${patch.res.status} ${JSON.stringify(patch.json)}`);

  const reread = await call(`/api/learning/admin/sessions/${session.id}`, { token });
  const roundTrip = reread.json?.data?.session?.content ?? '';
  assert(
    '保存→再取得がバイト同一（sanitize 免除）',
    roundTrip === DANGEROUS_CONTENT,
    `${Buffer.byteLength(roundTrip)} vs ${Buffer.byteLength(DANGEROUS_CONTENT)} bytes`,
  );

  const restore = await call(`/api/learning/admin/sessions/${session.id}`, {
    method: 'PATCH',
    token,
    body: { content: originalContent },
  });
  assert('本文を元に戻す → 200', restore.res.status === 200, `HTTP ${restore.res.status}`);

  // --- 5. zod 検証 ---

  const badSlug = await call(`/api/learning/admin/sessions/${session.id}`, {
    method: 'PATCH',
    token,
    body: { slug: '無効SLUG' },
  });
  assert('不正 slug → 400', badSlug.res.status === 400, `HTTP ${badSlug.res.status}`);

  const badDuration = await call(`/api/learning/admin/sessions/${session.id}`, {
    method: 'PATCH',
    token,
    body: { durationMinutes: 9999 },
  });
  assert('上限超過 durationMinutes → 400', badDuration.res.status === 400, `HTTP ${badDuration.res.status}`);

  // --- 6. reorder 端ノーオプ ---

  const reorderS = await call(`/api/learning/admin/sessions/${session.id}/reorder`, {
    method: 'POST',
    token,
    body: { direction: 'up' },
  });
  assert(
    '先頭セッションの reorder up → moved:false',
    reorderS.res.status === 200 && reorderS.json?.data?.moved === false,
    `HTTP ${reorderS.res.status} ${JSON.stringify(reorderS.json)}`,
  );

  const reorderM = await call(`/api/learning/admin/modules/${module.id}/reorder`, {
    method: 'POST',
    token,
    body: { direction: 'up' },
  });
  assert(
    '先頭モジュールの reorder up → moved:false',
    reorderM.res.status === 200 && reorderM.json?.data?.moved === false,
    `HTTP ${reorderM.res.status} ${JSON.stringify(reorderM.json)}`,
  );

  // --- 7. 公開切替と進捗の相互作用 ---

  const unpublish = await call(`/api/learning/admin/sessions/${session.id}`, {
    method: 'PATCH',
    token,
    body: { isPublished: false },
  });
  assert('セッション非公開化 → 200', unpublish.res.status === 200, `HTTP ${unpublish.res.status}`);

  const pubAfterUnpublish = await call('/api/learning/sessions/day-01');
  assert('非公開 slug は公開側で 404', pubAfterUnpublish.res.status === 404, `HTTP ${pubAfterUnpublish.res.status}`);

  const progUnpub = await call('/api/learning/progress', { token });
  assert(
    '非公開セッションは分母から除外（0/0）',
    progUnpub.json?.data?.overall?.totalSessions === 0 && progUnpub.json?.data?.overall?.completedSessions === 0,
    JSON.stringify(progUnpub.json?.data?.overall),
  );

  const republish = await call(`/api/learning/admin/sessions/${session.id}`, {
    method: 'PATCH',
    token,
    body: { isPublished: true },
  });
  assert('再公開 → 200', republish.res.status === 200, `HTTP ${republish.res.status}`);

  const progRepub = await call('/api/learning/progress', { token });
  assert(
    '再公開で進捗は保持される（1/1）',
    progRepub.json?.data?.overall?.completedSessions === 1,
    JSON.stringify(progRepub.json?.data?.overall),
  );

  // --- 8. モジュール/セッション作成 → CASCADE 削除 ---

  const phase1 = phases.find((p) => p.number === 1);
  const newModule = await call('/api/learning/admin/modules', {
    method: 'POST',
    token,
    body: {
      phaseId: phase1.id,
      slug: `e2e-mod-${runId}`,
      title: 'E2E検証モジュール',
      description: '削除される',
      weekNumber: 2,
      isPublished: false,
    },
  });
  assert('管理 module 作成 → 201', newModule.res.status === 201, `HTTP ${newModule.res.status} ${JSON.stringify(newModule.json)}`);
  const newModuleId = newModule.json?.data?.module?.id;

  const newSession = await call('/api/learning/admin/sessions', {
    method: 'POST',
    token,
    body: {
      moduleId: newModuleId,
      slug: `e2e-sess-${runId}`,
      title: 'E2E検証セッション',
      description: '削除される',
      content: '# 一時\n\n```js\nonChange={fn}\n```',
      durationMinutes: 5,
      objectives: ['検証'],
      isPublished: true,
    },
  });
  assert('管理 session 作成 → 201', newSession.res.status === 201, `HTTP ${newSession.res.status} ${JSON.stringify(newSession.json)}`);

  // 公開には「セッション公開 かつ モジュール公開」が必要なため、モジュールを公開してから検証
  const publishModule = await call(`/api/learning/admin/modules/${newModuleId}`, {
    method: 'PATCH',
    token,
    body: { isPublished: true },
  });
  assert('作成モジュールの公開化 → 200', publishModule.res.status === 200, `HTTP ${publishModule.res.status}`);

  const newSlug = `e2e-sess-${runId}`;
  const dupSlug = await call('/api/learning/admin/sessions', {
    method: 'POST',
    token,
    body: {
      moduleId: newModuleId,
      slug: newSlug,
      title: '重複',
      content: 'x',
      durationMinutes: 5,
      objectives: [],
    },
  });
  assert('重複 slug → 409', dupSlug.res.status === 409, `HTTP ${dupSlug.res.status}`);

  const pubNew = await call(`/api/learning/sessions/${newSlug}`);
  assert('作成（公開）セッションが公開側で閲覧可', pubNew.res.status === 200, `HTTP ${pubNew.res.status}`);

  const delModule = await call(`/api/learning/admin/modules/${newModuleId}`, { method: 'DELETE', token });
  assert('管理 module 削除 → 204', delModule.res.status === 204, `HTTP ${delModule.res.status}`);

  const pubDeleted = await call(`/api/learning/sessions/${newSlug}`);
  assert('CASCADE 削除後は 404', pubDeleted.res.status === 404, `HTTP ${pubDeleted.res.status}`);

  // --- 9. クリーンアップ（users 削除で progress 等も CASCADE） ---

  await sql.query('DELETE FROM users WHERE email = $1', [email]);
  const [gone] = await sql.query('SELECT id FROM users WHERE email = $1', [email]);
  assert('テストユーザーを完全削除', !gone);

  const [progressLeft] = await sql.query('SELECT 1 FROM session_progress LIMIT 1');
  assert('進捗行が残っていない', !progressLeft);

  report();
}

function report() {
  for (const r of results) console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 合格`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error('❌ E2E 実行エラー:', err.message);
  process.exit(1);
});
