/**
 * Purchase Repository Interface
 *
 * 購入記録（purchases）の永続化。Postgres（Neon HTTP）/ Json の2実装がこの契約を実装する。
 *
 * 冪等性の設計:
 * - grant は stripe_checkout_session_id を自然キーとして upsert。
 *   Webhook の再送（checkout.session.completed が2回到着）は1行に収束する
 * - revokeByPaymentIntent の該当なし（未登録 or 既に refund 済み）は null を返し
 *   呼び出し側は no-op として扱う
 */

export type PurchaseStatus = 'active' | 'refunded';

export interface PurchaseRecord {
  id: string;
  userId: string;
  status: PurchaseStatus;
  /** Webhook 冪等性のキー（checkout.session.id） */
  stripeCheckoutSessionId: string;
  /** charge.refunded からの逆引きキー。payment_status=paid 到達時点で埋まる */
  stripePaymentIntentId: string | null;
  amountTotal: number;
  currency: string;
  grantedAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GrantPurchaseInput {
  userId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  amountTotal: number;
  currency: string;
}

export interface PurchaseRepository {
  /**
   * 購入を付与（冪等）。同一 stripe_checkout_session_id の再交付は
   * 再付与（status='active' に戻す）として上書きする
   */
  grant(input: GrantPurchaseInput): Promise<PurchaseRecord>;

  /** payment_intent で特定して取り消し。該当なしは null（冪等 no-op） */
  revokeByPaymentIntent(paymentIntentId: string): Promise<PurchaseRecord | null>;

  /**
   * payment_intent で購入行を照会（status を問わない最新の1行）。
   * charge.refunded の再送で revoke が冪等 no-op になった際に
   * ミラー（users.purchased_at）整合の再計算に使う
   */
  findByPaymentIntent(paymentIntentId: string): Promise<PurchaseRecord | null>;

  /** エンタイトルメント判定（learning ゲーティングから呼ばれる） */
  hasActivePurchase(userId: string): Promise<boolean>;

  /** ユーザーの購入履歴（新しい順） */
  findByUser(userId: string): Promise<PurchaseRecord[]>;
}
