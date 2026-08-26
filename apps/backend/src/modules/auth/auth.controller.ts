/**
 * Authentication Controller
 * HTTP request handlers for authentication endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService, RegisterData, LoginData } from './services/auth-service';
import { UserRepository } from './interfaces/user-repository';
import { EmailService } from './interfaces/email-service';
import { JsonUserRepository } from './implementations/json-user-repository';
import { PostgresUserRepository } from './implementations/postgres-user-repository';
import { ConsoleEmailService } from './services/console-email-service';
import { ResendEmailService } from './services/resend-email-service';

// 本番（DATABASE_URL = Neon Postgres 設定時）は Postgres + Resend、
// 未設定（ローカル開発・テスト）は Json + Console を使用
const usePostgres = Boolean(process.env.DATABASE_URL);
const userRepository: UserRepository = usePostgres
  ? new PostgresUserRepository()
  : new JsonUserRepository();
const emailService: EmailService = usePostgres
  ? new ResendEmailService()
  : new ConsoleEmailService();
const authService = new AuthService(userRepository, emailService);

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

    const result = await authService.register({ email, password, fullName });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Check if this is a validation error (reveal details for better UX)
      const isValidationError =
        error.message.includes('Password') ||
        error.message.includes('email') ||
        error.message.includes('Invalid');

      res.status(400).json({
        error: {
          code: isValidationError ? 'AUTH_REG_003' : 'AUTH_REG_002',
          message: isValidationError
            ? error.message
            : 'Registration failed. Please check your input.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    } else {
      next(error);
    }
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

    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Generic error for security
      res.status(401).json({
        error: {
          code: 'AUTH_LOGIN_002',
          message: 'Invalid credentials',
        },
      });
    } else {
      next(error);
    }
  }
}

/**
 * Refresh token
 * POST /api/auth/refresh
 */
export async function handleRefreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: {
          code: 'AUTH_TOKEN_001',
          message: 'Refresh token is required',
        },
      });
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_002',
          message: 'Invalid or expired refresh token',
        },
      });
    } else {
      next(error);
    }
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
export async function handleGetProfile(req: Request, res: Response): Promise<void> {
  // User is attached by authenticate middleware
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTH_001',
        message: 'Unauthorized',
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
}

/**
 * Logout user
 * POST /api/auth/logout
 */
export async function handleLogout(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTH_001',
        message: 'Unauthorized',
      },
    });
    return;
  }

  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(req.user.id, refreshToken);
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
}

/**
 * Verify email
 * POST /api/auth/verify-email
 */
export async function handleVerifyEmail(req: Request, res: Response): Promise<void> {
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
    res.status(400).json({
      error: {
        code: 'AUTH_VERIFY_002',
        message: 'Invalid or expired verification token',
      },
    });
  }
}

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export async function handleForgotPassword(req: Request, res: Response): Promise<void> {
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

  await authService.requestPasswordReset(email);

  // Always return success (don't reveal if email exists)
  res.status(200).json({
    success: true,
    data: {
      message: 'If an account exists with this email, a password reset link has been sent',
    },
  });
}

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export async function handleResetPassword(req: Request, res: Response): Promise<void> {
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
    res.status(400).json({
      error: {
        code: 'AUTH_RESET_003',
        message: 'Invalid or expired reset token',
      },
    });
  }
}
