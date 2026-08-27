/**
 * OAuth state ユーティリティ
 *
 * state は署名付き JWT（10分）。login-CSRF 対策として double-submit cookie
 * （cb_oauth_state）との一致もコールバックで検証する:
 * 純粋な署名stateだけでは「攻撃者が自分の認可コードで被害者をログインさせる」
 * login-CSRF を防げないため、state は当サイトの start エンドポイントが
 * Cookie とペアで発行したものであることを確認する。
 */

import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../../middleware/auth';

export const OAUTH_STATE_TTL_SECONDS = 10 * 60; // 10分

export interface OAuthStatePayload {
  /** ランダムNonce（署名のエントロピー源） */
  nonce: string;
  /** 認証後に戻るフロントパス（'/' 始まり・'//' でない） */
  redirect: string;
}

export function signOAuthState(
  payload: OAuthStatePayload,
  ttlSeconds: number = OAUTH_STATE_TTL_SECONDS
): string {
  return jwt.sign({ nonce: payload.nonce, redirect: payload.redirect }, getJwtSecret(), {
    expiresIn: ttlSeconds,
  });
}

/** 検証失敗（署名改ざん・期限切れ）は null を返す */
export function verifyOAuthState(state: string): OAuthStatePayload | null {
  try {
    const decoded = jwt.verify(state, getJwtSecret());
    if (typeof decoded === 'string') return null;
    const { nonce, redirect } = decoded as jwt.JwtPayload;
    if (typeof nonce !== 'string' || typeof redirect !== 'string') return null;
    return { nonce, redirect };
  } catch {
    return null;
  }
}

/** リダイレクト先の検証: 自サイト内パスのみ（open redirect 防止） */
export function sanitizeRedirectPath(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}
