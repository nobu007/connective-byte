/**
 * payments 用データベース（Neon Postgres）の初期化
 *
 * 使い方（ルート .env の DATABASE_URL を使用）:
 *   npm run init:payments-db
 *
 * 冪等: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS のみのため再実行可能。
 * purchases が users（init:auth-db）に FK 依存するため、未作成なら先に init:auth-db を案内して中断。
 * テーブル定義は apps/backend/src/modules/payments/implementations/postgres-purchase-repository.ts
 * と対応する。
 */

import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL が設定されていません。.env に Neon の接続文字列を追加してください。');
  process.exit(1);
}

const sql = neon(connectionString);

// purchases が users に FK を持つため事前確認
const [usersTable] = await sql.query(
  `SELECT to_regclass('public.users') AS reg`
);
if (!usersTable?.reg) {
  console.error('❌ users テーブルが存在しません。先に `npm run init:auth-db` を実行してください。');
  process.exit(1);
}

const STATEMENTS = [
  // 購入記録の正本。stripe_checkout_session_id の UNIQUE 制約が Webhook 再送への
  // 冪等性を担保する（ON CONFLICT DO UPDATE で last event wins）。
  `CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','refunded')),
    stripe_checkout_session_id TEXT NOT NULL UNIQUE,
    stripe_payment_intent_id TEXT,
    amount_total INT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'jpy',
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_user_active
     ON purchases (user_id) WHERE status = 'active'`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_payment_intent
     ON purchases (stripe_payment_intent_id)`,
  // /api/auth/me 用の高速ミラー。正本は purchases（getStatus は purchases を読む）
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ`,
];

for (const statement of STATEMENTS) {
  await sql.query(statement);
}

const tables = await sql.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name`
);

console.log('✅ payments テーブル初期化完了:', tables.map((t) => t.table_name).join(', '));
