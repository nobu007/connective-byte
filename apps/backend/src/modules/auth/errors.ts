/**
 * 認証ドメインのエラー型
 *
 * controller が error.message の文字列判定でステータスを決めるのをやめ、
 * エラーコード + HTTP ステータスをドメイン層で持たせる。
 */

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
    /** 429系で Retry-After ヘッダに使う秒数 */
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
