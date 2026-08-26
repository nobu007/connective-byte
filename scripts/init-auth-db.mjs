/**
 * auth 用データベース（Neon Postgres）の初期化
 *
 * 使い方（ルート .env の DATABASE_URL を使用）:
 *   npm run init:auth-db
 *
 * 冪等: CREATE TABLE IF NOT EXISTS のみ行うため再実行可能。
 * テーブル定義は apps/backend/src/modules/auth/implementations/postgres-user-repository.ts
 * と対応する。
 */

import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL が設定されていません。.env に Neon の接続文字列を追加してください。');
  process.exit(1);
}

const sql = neon(connectionString);

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'learner',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
  )`,
];

for (const statement of STATEMENTS) {
  await sql(statement);
}

const tables = await sql(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name`
);

console.log('✅ auth テーブル初期化完了:', tables.map((t) => t.table_name).join(', '));
