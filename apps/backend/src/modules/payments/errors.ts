/**
 * payments ドメインのエラー型
 *
 * learning の LearningError と同様、エラーコード + HTTP ステータスを
 * ドメイン層で持たせ、controller は変換のみ行う。
 *
 * Webhook のエラー戦略: 署名・パース・設定エラーのみ 4xx/5xx を返し、
 * ドメイン上の不整合（金額不一致・ユーザー未解決）は log + 200 で受ける
 * （5xx や 4xx を返すと Stripe は自動再送を重ねるため）。
 */

export class PaymentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}
