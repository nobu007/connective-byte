/**
 * メモリのみのアクセストークン保持
 *
 * localStorage 不使用（XSS で永続トークンが盗まれる経路を断つ）。
 * ページリロードで消失するため、AuthProvider が mount 時に
 * httpOnly Cookie（cb_rt）から /api/auth/refresh で再取得する。
 */

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
