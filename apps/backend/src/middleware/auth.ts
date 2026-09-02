import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user information to the request
 */

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * JWT configuration
 *
 * 本番でJWT_SECRET未設定は即fail（推測可能なデフォルト鍵の使用を防止）。
 * 開発/テストのみ既定値へフォールバックする。
 * 本番ではさらに32文字以上を要求（HS256 の鍵長不足を防ぐ）。
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    if (process.env.NODE_ENV === 'production' && secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'dev-only-insecure-secret';
}

const JWT_SECRET = getJwtSecret();
// アクセストークンは短期（15分）。長期の保持はリフレッシュトークン（Cookie）の役割
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

/**
 * Generate JWT token
 */
export function generateToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 * Requires valid JWT token in Authorization header
 */
export const authenticate: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_003',
          message: 'No token provided',
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_003',
          message: 'Invalid or expired token',
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'AUTH_TOKEN_003',
        message: 'Authentication failed',
      },
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it.
 *
 * トークン未送出なら匿名として通す。一方、**送出されたトークンが
 * 無効・期限切れなら 401 を返す**（匿名に落とさない）。
 * 無効トークンを匿名扱いにすると、期限切れの購入者が
 * 「ログインしているのにロック画面」となり、apiFetch の
 * 自動リフレッシュ（401 でのみ発火）も働かないためである。
 */
export const optionalAuthenticate: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_003',
          message: 'Invalid or expired token',
        },
      });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'AUTH_TOKEN_003',
        message: 'Authentication failed',
      },
    });
  }
};

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTH_TOKEN_003',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'AUTH_002',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}

/**
 * API key authentication middleware
 * For service-to-service communication
 */
export const authenticateApiKey: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        error: {
          code: 'AUTH_004',
          message: 'API key required',
        },
      });
      return;
    }

    // Validate API key (in production, check against database)
    const validApiKeys = process.env.API_KEYS?.split(',') || [];

    if (!validApiKeys.includes(apiKey)) {
      res.status(401).json({
        error: {
          code: 'AUTH_004',
          message: 'Invalid API key',
        },
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'AUTH_004',
        message: 'API key authentication failed',
      },
    });
  }
};
