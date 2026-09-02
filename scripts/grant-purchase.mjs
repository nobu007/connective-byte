/**
 * 受講登録の手動付与/取り消し（Neon Postgres）
 *
 * 使い方:
 *   npm run grant-purchase -- <email>            # 付与（29,800円・JPY）
 *   npm run grant-purchase -- <email> --revoke   # 取り消し（返金・振込不能時）
 *
 * Webhook がユーザーを解決できなかった場合（未ログイン購入で email が変わった等）の
 * ランブック。Webhook と同じ状態（purchases 行 + users.purchased_at）を作る。
 * stripe_checkout_session_id は手動付与であることが分かる接頭辞 manual_ を持つ。
 */

import { neon } from '@neondatabase/serverless';

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const email = args.find((a) => !a.startsWith('--'));

if (!email) {
  console.error('使い方: npm run grant-purchase -- <email> [--revoke]');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL が設定されていません。.env に Neon の接続文字列を追加してください。');
  process.exit(1);
}

const sql = neon(connectionString);

const [user] = await sql.query('SELECT id, email, purchased_at FROM users WHERE email = $1', [email]);
if (!user) {
  console.error(`❌ ユーザーが見つかりません: ${email}`);
  process.exit(1);
}

if (revoke) {
  await sql.query(
    `UPDATE purchases SET status = 'refunded', revoked_at = now(), updated_at = now()
     WHERE user_id = $1 AND status = 'active'`,
    [user.id],
  );
  await sql.query('UPDATE users SET purchased_at = NULL, updated_at = now() WHERE id = $1', [user.id]);
  console.log(`✅ ${email} の受講登録を取り消しました（Weeks 2-12 は再ロック）`);
  process.exit(0);
}

// idempotent: 同一 manual_ 行があれば再付与（last event wins）
const checkoutId = `manual_${user.id}`;
await sql.query(
  `INSERT INTO purchases (id, user_id, status, stripe_checkout_session_id, amount_total, currency)
   VALUES ($1, $2, 'active', $3, 29800, 'jpy')
   ON CONFLICT (stripe_checkout_session_id) DO UPDATE
     SET status = 'active', revoked_at = NULL, updated_at = now()`,
  [crypto.randomUUID(), user.id, checkoutId],
);
await sql.query('UPDATE users SET purchased_at = now(), updated_at = now() WHERE id = $1', [user.id]);

console.log(`✅ ${email} に受講登録（29,800円・税込）を付与しました`);
console.log('   （Webhook と同じ状態: purchases 行 + users.purchased_at。次の /api/auth/me で反映）');
