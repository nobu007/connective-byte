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
 */
export async function handleGetProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // JWTクレームではなくDBの最新状態を返す（プロフィール編集・削除猶予の反映）
    const user = req.user ? await authContainer.userRepository.findById(req.user.id) : null;

    if (!user) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_003',
          message: 'User not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isVerified: user.isVerified,
          bio: user.bio,
          timezone: user.timezone,
          githubUsername: user.githubUsername,
          deletionScheduledAt: user.deletionScheduledAt,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
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
