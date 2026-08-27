/**
 * ユーザーのロール変更（Neon Postgres）
 *
 * 使い方:
 *   npm run set-user-role -- <email> <role>
 *   例: npm run set-user-role -- owner@example.com content_administrator
 *
 * role: learner | content_administrator | system_admin
 * 学習コンテンツ管理画面（/learning/admin/）を使うには content_administrator が必要。
 */

import { neon } from '@neondatabase/serverless';

const VALID_ROLES = ['learner', 'content_administrator', 'system_admin'];

const [email, role] = process.argv.slice(2);

if (!email || !role || !VALID_ROLES.includes(role)) {
  console.error('使い方: npm run set-user-role -- <email> <role>');
  console.error(`role は次のいずれか: ${VALID_ROLES.join(' | ')}`);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL が設定されていません。.env に Neon の接続文字列を追加してください。');
  process.exit(1);
}

const sql = neon(connectionString);

const [existing] = await sql.query(
  'SELECT id, email, role FROM users WHERE email = $1',
  [email]
);
if (!existing) {
  console.error(`❌ ユーザーが見つかりません: ${email}（先に本番でサインアップしてください）`);
  process.exit(1);
}

if (existing.role === role) {
  console.log(`✅ ${email} の role は既に ${role} です（変更なし）`);
  process.exit(0);
}

await sql.query('UPDATE users SET role = $2, updated_at = now() WHERE id = $1', [
  existing.id,
  role,
]);

console.log(`✅ ${email} の role を ${existing.role} → ${role} に変更しました`);
