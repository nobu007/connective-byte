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
  // Stage 2 追加カラム（プロフィール・アカウント削除猶予）
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
  // 旧 refresh_tokens テーブルは sessions に置き換わりコードから未使用。
  // 本番DBが空のため移行は不要だが、既存環境を壊さないようテーブル自体は残置する。
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    prev_refresh_token_hash TEXT,
    device_info JSONB NOT NULL DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (refresh_token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_prev_token_hash ON sessions (prev_refresh_token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at)`,
  `CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // ロックアウト计数（email毎の失敗ログ）に効く部分インデックス
  `CREATE INDEX IF NOT EXISTS idx_auth_logs_lockout ON auth_logs (email, created_at)
     WHERE success = FALSE AND event_type = 'login_failed'`,
  `CREATE INDEX IF NOT EXISTS idx_auth_logs_user_created ON auth_logs (user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs (created_at)`,
  `CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_email TEXT,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts (user_id)`,
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
  await sql.query(statement);
}

const tables = await sql.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name`
);

console.log('✅ auth テーブル初期化完了:', tables.map((t) => t.table_name).join(', '));
