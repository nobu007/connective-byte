/**
 * Entitlement Checker
 *
 * 有料コンテンツ（Weeks 2-12）の閲覧資格を判定する最小インターフェース。
 * 構造的型付けにより payments モジュールの PaymentService がこの契約を
 * 満たす（learning が payments を import しない依存方向を保つ）。
 * 単体テストでは stub で差し替え可能。
 */
export interface EntitlementChecker {
  /** 対象ユーザーが有料コンテンツの閲覧権（購入済み）を持つか */
  hasEntitlement(userId: string): Promise<boolean>;
}

/** 常に許可（ゲーティング無効・既定）。テスト後方互換と無料公開期間の切替用 */
export const allowAllEntitlement: EntitlementChecker = {
  hasEntitlement: async () => true,
};
