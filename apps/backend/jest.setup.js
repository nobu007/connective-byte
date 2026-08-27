/**
 * Jest 全スイート共通セットアップ（setupFiles = フレームワークとテストコードの前に実行）
 *
 * JSON ユーザーストアを実行毎の一時ファイルへ分離する。
 * 既定パス（data/auth/users.json）は実行間で永続するため、login_failed などの
 * 失敗ログが蓄積し、ロックアウトしきい値（10回/1h）を跨ぐと無関係のテストが
 * 429 で壊れる。ワーカー毎に pid 付きの別ファイルで衝突も避ける。
 */
const os = require('os');

process.env.AUTH_DB_PATH = `${os.tmpdir()}/auth-jest-${process.pid}.json`;
