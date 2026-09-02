/**
 * Jest 全スイート共通セットアップ（setupFiles = フレームワークとテストコードの前に実行）
 *
 * JSON ユーザーストアを実行毎の一時ファイルへ分離する。
 * 既定パス（data/auth/users.json）は実行間で永続するため、login_failed などの
 * 失敗ログが蓄積し、ロックアウトしきい値（10回/1h）を跨ぐと無関係のテストが
 * 429 で壊れる。
 *
 * setupFiles はテストファイル毎に再実行されるが、jest はワーカーを再利用するため
 * pid だけでは同一ワーカー内の複数スイートが同一ファイルを共有してしまう
 * （公開セッション等がスイート間で漏れ、learning-admin-api の totalSessions が
 * order-dependent に壊れる実例あり）。ランダム接尾辞でテストファイル毎に完全分離する。
 */
const os = require('os');

const uniqueSuffix = `${process.pid}-${Math.random().toString(36).slice(2)}`;

process.env.AUTH_DB_PATH = `${os.tmpdir()}/auth-jest-${uniqueSuffix}.json`;
// learning も同様にテスト実行間で状態を分離（カリキュラム・進捗の蓄積を防ぐ）
process.env.LEARNING_DB_PATH = `${os.tmpdir()}/learning-jest-${uniqueSuffix}.json`;
// payments（購入記録）も同様にテスト実行間で状態を分離
process.env.PAYMENTS_DB_PATH = `${os.tmpdir()}/payments-jest-${uniqueSuffix}.json`;
