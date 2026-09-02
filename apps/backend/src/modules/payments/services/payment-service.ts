/**
 * Payment Service
 *
 * Stripe Webhook（Payment Link 決済）の処理と購入状態の照会。
 * Stripe API は呼ばない（Webhook 限定設計・stripe SDK 非依存）。
 *
 * エラー戦略（Webhook）: 署名・パース・設定エラーのみ throw（4xx/5xx）。
 * ドメイン上の不整合（金額不一致・ユーザー未解決・FK 違反）は log + 正常返却。
 * Stripe は非 2xx を受けると自動再送するため、再送で解決しないものを
 * ずっとリトライさせないためである。未解決分は grant-purchase.mjs で手動対応。
 */

import { PurchaseRepository } from '../interfaces/purchase-repository';
import { UserRepository } from '../../auth/interfaces/user-repository';
import { PaymentError } from '../errors';
import { verifyStripeSignature } from './webhook-signature';

/** 販売SKU: 12週一括 29,800円（税込・免税事業者のため tax なし・jpy = 小数なし整数） */
export const PRICE_AMOUNT_TOTAL = 29800;
export const PRICE_CURRENCY = 'jpy';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Stripe イベントのうち本サービスが扱う最小フィールド（型検証は service 内で実施） */
interface StripeEvent {
  id?: string;
  type: string;
  data?: { object?: Record<string, unknown> };
}

interface StripeCheckoutSession {
  id: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  client_reference_id?: string | null;
  payment_intent?: string | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
}

function toCheckoutSession(
  object: Record<string, unknown> | undefined
): StripeCheckoutSession | null {
  if (!object || typeof object !== 'object') return null;
  return object as unknown as StripeCheckoutSession;
}

export interface PaymentStatusView {
  purchased: boolean;
  purchasedAt: string | null;
  purchase: { grantedAt: string; amountTotal: number; currency: string } | null;
}

export class PaymentService {
  constructor(
    private readonly purchases: PurchaseRepository,
    private readonly users: UserRepository
  ) {}

  /**
   * Stripe Webhook を1件処理する。処理成功・ドメイン no-op は
   * { received: true } を返し、署名・パース・設定エラーは PaymentError を throw する。
   */
  async handleWebhook(
    rawBody: string,
    signatureHeader: string | undefined
  ): Promise<{ received: true }> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      // 設定漏れは loud にfail（Stripe が再送し、ダッシュボードに配送失敗が出る）
      throw new PaymentError('PAYMENT_CONFIG_001', 'STRIPE_WEBHOOK_SECRET is not configured', 500);
    }

    await verifyStripeSignature(signatureHeader, rawBody, secret);

    let event: StripeEvent;
    try {
      event = JSON.parse(rawBody) as StripeEvent;
    } catch {
      throw new PaymentError('PAYMENT_EVENT_001', 'Webhook payload is not valid JSON', 400);
    }
    if (!event || typeof event.type !== 'string') {
      throw new PaymentError('PAYMENT_EVENT_001', 'Webhook payload is missing event type', 400);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(toCheckoutSession(event.data?.object), event.id);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data?.object, event.id);
        break;
      default:
        // 登録していないイベント種別は受領だけして終了（正常扱い）
        break;
    }

    return { received: true };
  }

  /** checkout.session.completed → 購入付与 */
  private async handleCheckoutCompleted(
    session: StripeCheckoutSession | null,
    eventId: string | undefined
  ): Promise<void> {
    if (!session || typeof session.id !== 'string') {
      console.warn(
        JSON.stringify({
          code: 'PAYMENT_UNMATCHED_001',
          message: 'checkout.session object missing',
          eventId,
        })
      );
      return;
    }
    if (session.payment_status !== 'paid') {
      // 非支払い完了（unpaid 等）は無視（Payment Link では通常起こらない）
      return;
    }
    if (session.amount_total !== PRICE_AMOUNT_TOTAL || session.currency !== PRICE_CURRENCY) {
      // 金額・通貨が想定SKUと不一致 → 付与せず警告のみ（価格改定時の検知器）
      console.warn(
        JSON.stringify({
          code: 'PAYMENT_UNMATCHED_001',
          message: 'amount/currency mismatch — not granted',
          eventId,
          checkoutSessionId: session.id,
          amountTotal: session.amount_total,
          currency: session.currency,
        })
      );
      return;
    }

    const user = await this.resolveUser(session);
    if (!user) {
      console.warn(
        JSON.stringify({
          code: 'PAYMENT_UNMATCHED_001',
          message: 'no matching user — not granted (manual grant may be needed)',
          eventId,
          checkoutSessionId: session.id,
          clientReferenceId: session.client_reference_id ?? null,
        })
      );
      return;
    }

    try {
      await this.purchases.grant({
        userId: user.id,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent ?? null,
        amountTotal: session.amount_total!,
        currency: session.currency!,
      });
    } catch (error) {
      // Postgres: 存在しない user_id への FK 違反（23503）等。再送で解決しないため log+正常扱い
      console.error(
        JSON.stringify({
          code: 'PAYMENT_UNMATCHED_001',
          message: 'grant failed',
          eventId,
          checkoutSessionId: session.id,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      return;
    }

    // /api/auth/me 用ミラー（正本は purchases 行）
    await this.users.update(user.id, { purchasedAt: new Date().toISOString() });
  }

  /** charge.refunded → 購入取り消し */
  private async handleChargeRefunded(
    object: Record<string, unknown> | undefined,
    eventId: string | undefined
  ): Promise<void> {
    const paymentIntentId =
      typeof object?.payment_intent === 'string' ? object.payment_intent : null;
    if (!paymentIntentId) {
      console.warn(
        JSON.stringify({
          code: 'PAYMENT_UNMATCHED_001',
          message: 'charge object missing payment_intent',
          eventId,
        })
      );
      return;
    }

    // 部分返金もこのイベントで流れる。確定仕様として全額・部分を問わず取り消す
    // （全額返金のみに限定する場合は amount_refunded === amount の比較をここに入れる）
    const revoked = await this.purchases.revokeByPaymentIntent(paymentIntentId);
    if (!revoked) {
      // 未登録 or 取り消し済み → 冪等 no-op
      return;
    }

    // 他に有効な購入が残っていなければ purchasedAt もクリア
    const stillActive = await this.purchases.hasActivePurchase(revoked.userId);
    if (!stillActive) {
      await this.users.update(revoked.userId, { purchasedAt: null });
    }
  }

  /** client_reference_id（=userId）を優先し、なければ決済時 email で照会 */
  private async resolveUser(session: StripeCheckoutSession) {
    const ref = session.client_reference_id;
    if (ref && UUID_PATTERN.test(ref)) {
      const byId = await this.users.findById(ref);
      if (byId) return byId;
    }

    const email = session.customer_details?.email ?? session.customer_email;
    if (email) {
      // findByEmail はリポジトリ側で lowercase して照会する
      return this.users.findByEmail(email);
    }
    return null;
  }

  /** GET /api/payments/status 用ビュー（正本の purchases を読む） */
  async getStatus(userId: string): Promise<PaymentStatusView> {
    const user = await this.users.findById(userId);
    const latestActive = (await this.purchases.findByUser(userId)).find(
      (p) => p.status === 'active'
    );
    return {
      purchased: Boolean(latestActive),
      purchasedAt: latestActive ? latestActive.grantedAt : null,
      purchase: latestActive
        ? {
            grantedAt: latestActive.grantedAt,
            amountTotal: latestActive.amountTotal,
            currency: latestActive.currency,
          }
        : null,
    };
  }

  /** learning ゲーティングの判定入口（EntitlementChecker 契約と構造的互換） */
  async hasEntitlement(userId: string): Promise<boolean> {
    return this.purchases.hasActivePurchase(userId);
  }
}
