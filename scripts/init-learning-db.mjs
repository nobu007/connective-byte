/**
 * learning 用データベース（Neon Postgres）の初期化
 *
 * 使い方（ルート .env の DATABASE_URL を使用）:
 *   npm run init:learning-db
 *
 * 冪等: CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING のみのため再実行可能。
 * users テーブル（init:auth-db）に FK 依存するため、未作成なら先に init:auth-db を案内して中断。
 * テーブル定義は apps/backend/src/modules/learning/implementations/postgres-learning-repository.ts
 * と対応する。
 */

import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL が設定されていません。.env に Neon の接続文字列を追加してください。');
  process.exit(1);
}

const sql = neon(connectionString);

// session_progress が users に FK を持つため事前確認
const [usersTable] = await sql.query(
  `SELECT to_regclass('public.users') AS reg`
);
if (!usersTable?.reg) {
  console.error('❌ users テーブルが存在しません。先に `npm run init:auth-db` を実行してください。');
  process.exit(1);
}

const STATEMENTS = [
  // Phase は3つ固定（W1-3 / W4-8 / W9-12）。管理CRUD対象外で init 時にシードする。
  `CREATE TABLE IF NOT EXISTS phases (
    id UUID PRIMARY KEY,
    number INT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    start_week INT NOT NULL,
    end_week INT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS curriculum_modules (
    id UUID PRIMARY KEY,
    phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE RESTRICT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    week_number INT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_modules_published_order
     ON curriculum_modules (is_published, week_number, order_index)`,
  `CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID PRIMARY KEY,
    module_id UUID NOT NULL REFERENCES curriculum_modules(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 0,
    objectives JSONB NOT NULL DEFAULT '[]',
    order_index INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_module_order ON learning_sessions (module_id, order_index)`,
  `CREATE TABLE IF NOT EXISTS session_progress (
    learner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (learner_id, session_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_progress_learner ON session_progress (learner_id)`,
];

for (const statement of STATEMENTS) {
  await sql.query(statement);
}

// Phase シード（正本 thinking_os-tactics.md: Phase1=W1-4 個人思考OS構築 /
// Phase2=W5-8 チーム協働システム / Phase3=W9-12 組織実装・スケール）
const PHASES = [
  [1, '個人思考OS構築', '思考プロセスの可視化からAI協働まで、個人の思考基盤を築く', 1, 4],
  [2, 'チーム協働システム', '思考の共有とプロトコル統一でチーム協働を実現する', 5, 8],
  [3, '組織実装・スケール', '部門間連携と継続改善システムで組織に展開する', 9, 12],
];

for (const [number, title, description, startWeek, endWeek] of PHASES) {
  await sql.query(
    `INSERT INTO phases (id, number, title, description, start_week, end_week)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (number) DO NOTHING`,
    [crypto.randomUUID(), number, title, description, startWeek, endWeek]
  );
}

const tables = await sql.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name`
);

console.log('✅ learning テーブル初期化完了:', tables.map((t) => t.table_name).join(', '));
