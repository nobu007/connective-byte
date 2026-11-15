/**
 * 認証 Cookie ユーティリティ
 *
 * リフレッシュトークンは httpOnly Cookie（cb_rt）で管理し、レスポンスJSONには
 * 含めない（XSS によるトークン窃取の経路を減らすため）。
 * connectivebyte.com（フロント）と api.connectivebyte.com（API）は同一サイト
 * （同一 eTLD+1）のため、Domain=.connectivebyte.com + SameSite=Lax で
 * フロントからの XHR に Cookie が送られる。第三者Cookieではない。
 *
 * 本番（NODE_ENV=production）のみ Secure + Domain を付与し、
 * ローカル開発（http://localhost）ではホスト専用Cookieとして動作する。
 */

import { Request, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'cb_rt';
export const OAUTH_STATE_COOKIE_NAME = 'cb_oauth_state';

const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30日（トークン有効期間と同一）
const OAUTH_STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000; // 10分

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/** ドメイン属性は本番のみ（.connectivebyte.com）。開発では undefined = ホスト専用 */
function cookieDomain(): string | undefined {
  return isProduction() ? '.connectivebyte.com' : undefined;
}

/** Cookie ヘッダーを手動パース（cookie-parser 依存を避ける） */
export function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (typeof header !== 'string' || header.length === 0) return undefined;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return part.slice(eq + 1).trim();
      }
    }
  }
  return undefined;
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    domain: cookieDomain(),
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    domain: cookieDomain(),
    path: '/api/auth',
  });
}

export function setOAuthStateCookie(res: Response, state: string): void {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    domain: cookieDomain(),
    path: '/api/auth',
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_MS,
  });
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    domain: cookieDomain(),
    path: '/api/auth',
  });
}
