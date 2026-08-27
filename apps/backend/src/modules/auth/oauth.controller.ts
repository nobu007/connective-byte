/**
 * OAuth Controller
 *
 * すべての応答は 302 リダイレクト（JSON なし）:
 * OAuth フローはブラウザの top-level navigation で動くため、
 * API エラー形状ではなくフロント（/login/）の error クエリで結果を伝える。
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import { authContainer } from './auth.container';
import { OAuthService } from './services/oauth-service';
import { OAuthProvider } from './interfaces/user-repository';
import {
  OAUTH_STATE_COOKIE_NAME,
  getCookie,
  setRefreshTokenCookie,
  setOAuthStateCookie,
  clearOAuthStateCookie,
} from './utils/cookies';
import { signOAuthState, verifyOAuthState, sanitizeRedirectPath } from './utils/oauth-state';
import { AuthError } from './errors';
import { getClientIp, parseDeviceInfo } from '../../common/utils/request-info';
import { SessionContext } from './services/auth-service';

const oauthService: OAuthService = authContainer.oauthService;

/** フロントのベースURL（/login/ へのリダイレクト用） */
function frontendBaseUrl(): string {
  return process.env.SITE_URL || 'https://connectivebyte.com';
}

function loginRedirect(errorCode: string): string {
  return `${frontendBaseUrl()}/login/?error=${errorCode}`;
}

function buildContext(req: Request): SessionContext {
  const userAgent = (req.headers['user-agent'] as string) ?? undefined;
  return {
    ipAddress: getClientIp(req),
    deviceInfo: parseDeviceInfo(userAgent),
    userAgent: userAgent ?? null,
  };
}

/**
 * Start OAuth flow
 * GET /api/auth/google（routes で provider を固定して生成）
 */
export function handleOAuthStart(provider: OAuthProvider): RequestHandler {
  return (req: Request, res: Response): void => {
    const redirect = sanitizeRedirectPath(req.query.redirect);

    if (!oauthService.isConfigured(provider)) {
      res.redirect(302, loginRedirect('oauth_unavailable'));
      return;
    }

    const nonce = crypto.randomUUID();
    const state = signOAuthState({ nonce, redirect });

    setOAuthStateCookie(res, state);
    res.redirect(302, oauthService.buildAuthorizationUrl(provider, state));
  };
}

/**
 * OAuth callback
 * GET /api/auth/google/callback
 *
 * state は署名JWT + double-submit cookie（cb_oauth_state）で検証する。
 * 成功時は cb_rt を設定し、state.redirect へ 302。
 */
export function handleOAuthCallback(provider: OAuthProvider): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 成否に関わらず state Cookie は使い捨て
    clearOAuthStateCookie(res);

    try {
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const providerError = typeof req.query.error === 'string' ? req.query.error : '';

      // ユーザーが同意画面で拒否
      if (providerError === 'access_denied') {
        res.redirect(302, loginRedirect('oauth_cancelled'));
        return;
      }

      if (!code || !state) {
        res.redirect(302, loginRedirect('oauth_state'));
        return;
      }

      const cookieState = getCookie(req, OAUTH_STATE_COOKIE_NAME);
      if (!cookieState || cookieState !== state) {
        res.redirect(302, loginRedirect('oauth_state'));
        return;
      }

      const payload = verifyOAuthState(state);
      if (!payload) {
        res.redirect(302, loginRedirect('oauth_state'));
        return;
      }

      try {
        const result = await oauthService.handleCallback({
          provider,
          code,
          state,
          cookieState,
          context: buildContext(req),
        });

        setRefreshTokenCookie(res, result.refreshToken);
        res.redirect(302, `${frontendBaseUrl()}${payload.redirect}`);
      } catch (error) {
        // service のエラーコードをフロントの error クエリへ変換
        const code = error instanceof AuthError ? error.code : 'AUTH_OAUTH_002';
        const errorCode =
          code === 'AUTH_OAUTH_004'
            ? 'oauth_email_unverified'
            : code === 'AUTH_OAUTH_003'
              ? 'oauth_unavailable'
              : 'oauth_failed';
        res.redirect(302, loginRedirect(errorCode));
      }
    } catch (error) {
      next(error);
    }
  };
}
