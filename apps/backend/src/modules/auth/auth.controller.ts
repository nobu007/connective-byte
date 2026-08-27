/**
 * Authentication Controller
 * HTTP request handlers for authentication endpoints
 *
 * リフレッシュトークンは httpOnly Cookie（cb_rt）でのみ授受し、
 * レスポンスJSONには含めない（XSS による窃取経路を遮断）。
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService, SessionContext } from './services/auth-service';
import { AuthError } from './errors';
import { authContainer } from './auth.container';
import {
  REFRESH_COOKIE_NAME,
  getCookie,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from './utils/cookies';
import { getClientIp, parseDeviceInfo } from '../../common/utils/request-info';

const authService: AuthService = authContainer.authService;

/** AuthError を HTTP レスポンスへ変換（それ以外は next へ） */
function handleServiceError(res: Response, next: NextFunction, error: unknown): void {
  if (error instanceof AuthError) {
    if (error.retryAfterSeconds !== undefined) {
      res.set('Retry-After', String(error.retryAfterSeconds));
    }
    res.status(error.httpStatus).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }
  next(error);
}

/** セッション記録用のコンテキスト（IP・デバイス情報）をリクエストから抽出 */
function buildSessionContext(req: Request): SessionContext {
  const userAgent = (req.headers['user-agent'] as string) ?? undefined;
  return {
    ipAddress: getClientIp(req),
    deviceInfo: parseDeviceInfo(userAgent),
    userAgent: userAgent ?? null,
  };
}

/**
 * Register new user
 * POST /api/auth/register
 */
export async function handleRegister(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, fullName } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      res.status(400).json({
        error: {
          code: 'AUTH_REG_001',
          message: 'Email, password, and full name are required',
        },
      });
      return;
    }

    const result = await authService.register(
      { email, password, fullName },
      buildSessionContext(req)
    );

    setRefreshTokenCookie(res, result.refreshToken);
    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function handleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: {
          code: 'AUTH_LOGIN_001',
          message: 'Email and password are required',
        },
      });
      return;
    }

    const result = await authService.login({ email, password }, buildSessionContext(req));

    setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Refresh access token（リフレッシュCookie のローテーション）
 * POST /api/auth/refresh
 */
export async function handleRefreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);

    if (!refreshToken) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_002',
          message: 'Refresh token is required',
        },
      });
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    // 無効トークン（再利用検知・期限切れ含む）ではCookieも破棄
    clearRefreshTokenCookie(res);
    handleServiceError(res, next, error);
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 *
 * JWTクレームではなくDBの最新状態を返す（プロフィール編集・削除猶予の反映）。
 * OAuth連携一覧も併せて返す。
 */
export async function handleGetProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await authContainer.userService.getProfile(req.user!.id);
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Update current user profile
 * PUT /api/auth/me
 */
export async function handleUpdateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 文字列のみ通す（明示的な null はクリア、それ以外の混入は無視）
    const data: Record<string, string | null> = {};
    for (const key of ['fullName', 'bio', 'timezone', 'githubUsername'] as const) {
      const value = req.body[key];
      if (typeof value === 'string' || value === null) {
        data[key] = value;
      }
    }

    const profile = await authContainer.userService.updateProfile(req.user!.id, data);
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Change password
 * POST /api/auth/change-password
 *
 * 現在セッション（Cookie）は維持し、他の全セッションを失効させる。
 */
export async function handleChangePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!newPassword) {
      res.status(400).json({
        error: {
          code: 'AUTH_PASSWORD_001',
          message: 'New password is required',
        },
      });
      return;
    }

    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    const currentSession = refreshToken
      ? await authContainer.sessionService.findCurrentSession(req.user!.id, refreshToken)
      : null;

    await authContainer.userService.changePassword(
      req.user!.id,
      currentPassword,
      newPassword,
      currentSession?.id
    );

    res.status(200).json({
      success: true,
      data: {
        message: 'Password changed successfully',
      },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * List active sessions
 * GET /api/auth/sessions
 */
export async function handleListSessions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_002',
          message: 'Refresh token is required',
        },
      });
      return;
    }

    const sessions = await authContainer.sessionService.listSessions(req.user!.id, refreshToken);
    res.status(200).json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Revoke a specific session
 * DELETE /api/auth/sessions/:sessionId
 */
export async function handleRevokeSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await authContainer.sessionService.revokeSession(req.user!.id, String(req.params.sessionId));
    res.status(200).json({
      success: true,
      data: {
        message: 'Session revoked successfully',
      },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Revoke all sessions except the current one
 * POST /api/auth/sessions/revoke-others
 */
export async function handleRevokeOtherSessions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_002',
          message: 'Refresh token is required',
        },
      });
      return;
    }

    const revokedCount = await authContainer.sessionService.revokeOthers(
      req.user!.id,
      refreshToken
    );
    res.status(200).json({
      success: true,
      data: { revokedCount },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Schedule account deletion (30日猶予)
 * POST /api/auth/delete-account
 *
 * 全セッションが失効するため Cookie も破棄する。
 */
export async function handleDeleteAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deletionScheduledFor = await authContainer.userService.scheduleAccountDeletion(
      req.user!.id
    );

    clearRefreshTokenCookie(res);
    res.status(200).json({
      success: true,
      data: { deletionScheduledFor },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Cancel scheduled account deletion
 * POST /api/auth/delete-account/cancel
 */
export async function handleCancelAccountDeletion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await authContainer.userService.cancelAccountDeletion(req.user!.id);
    res.status(200).json({
      success: true,
      data: {
        message: 'Account deletion cancelled',
      },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 *
 * authenticate 不要・冪等：Cookieが無効/不在でも200を返し、Cookieを破棄する。
 * （アクセストークン期限切れ後でもログアウトできるようにするため）
 */
export async function handleLogout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearRefreshTokenCookie(res);
    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    // セッション失効に失敗してもCookie破棄は行う
    clearRefreshTokenCookie(res);
    next(error);
  }
}

/**
 * Verify email
 * POST /api/auth/verify-email
 */
export async function handleVerifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({
      error: {
        code: 'AUTH_VERIFY_001',
        message: 'Verification token is required',
      },
    });
    return;
  }

  try {
    await authService.verifyEmail(token);
    res.status(200).json({
      success: true,
      data: {
        message: 'Email verified successfully',
      },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export async function handleForgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({
      error: {
        code: 'AUTH_RESET_001',
        message: 'Email is required',
      },
    });
    return;
  }

  try {
    await authService.requestPasswordReset(email);

    // Always return success (don't reveal if email exists)
    res.status(200).json({
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset link has been sent',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export async function handleResetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({
      error: {
        code: 'AUTH_RESET_002',
        message: 'Token and new password are required',
      },
    });
    return;
  }

  try {
    await authService.resetPassword(token, newPassword);
    res.status(200).json({
      success: true,
      data: {
        message: 'Password reset successfully',
      },
    });
  } catch (error) {
    handleServiceError(res, next, error);
  }
}
