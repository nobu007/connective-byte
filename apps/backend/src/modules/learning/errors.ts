/**
 * learning ドメインのエラー型
 *
 * auth の AuthError と同様、エラーコード + HTTP ステータスを
 * ドメイン層で持たせ、controller は変換のみ行う。
 */

export class LearningError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400
  ) {
    super(message);
    this.name = 'LearningError';
  }
}
