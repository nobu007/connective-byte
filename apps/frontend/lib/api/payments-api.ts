/**
 * payments API クライアント
 *
 * SKU: 12週一括買い切り 29,800円（税込・免税事業者）。
 * 決済は Stripe Payment Link（ダッシュボード作成・外部遷移）で、
 * サーバーは Webhook で付与/取り消しを行うのみ。
 * 型は apps/backend/src/modules/payments/services/payment-service.ts と同期。
 */

import { apiFetch } from './auth-api';

export interface PurchaseSummary {
  grantedAt: string;
  amountTotal: number;
  currency: string;
}

export interface PaymentStatus {
  purchased: boolean;
  purchasedAt: string | null;
  purchase: PurchaseSummary | null;
}

/** 表示用の価格ラベル（価格破壊禁止方針・単一ソース） */
export const PURCHASE_PRICE_LABEL = '29,800円（税込）';

export const paymentsApi = {
  getStatus(): Promise<PaymentStatus> {
    return apiFetch<PaymentStatus>('/api/payments/status');
  },
};

/**
 * Stripe Payment Link URL（Pages 環境変数 NEXT_PUBLIC_STRIPE_PAYMENT_LINK でビルド時埋め込み）。
 * 未設定なら null を返す（呼び出し側はボタンを伏せ、壊れた導線を出さない）。
 * env は呼び出し毎に評価する（モジュール定数化すると import 順で埋め込み前に読まれる）。
 */
export function buildPaymentLink(userId: string, email: string): string | null {
  const link = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || '';
  if (!link) return null;
  const params = new URLSearchParams({
    client_reference_id: userId,
    prefilled_email: email,
  });
  const separator = link.includes('?') ? '&' : '?';
  return `${link}${separator}${params.toString()}`;
}
