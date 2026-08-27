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
    public readonly httpStatus: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
