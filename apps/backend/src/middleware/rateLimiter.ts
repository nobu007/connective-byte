import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter configuration for different endpoints
 *
 * 429 ボディは他の auth エラーと同じ { error: { code, message } } エンベロープで返す
 * （フロントの ApiError が code で分岐できるよう統一。retryAfter は追加フィールド）
 */

// Cloudflare Workers 環境では socket.remoteAddress が提供されず req.ip が
// undefined になるため、CF が必ず設定する cf-connecting-ip を優先して鍵を生成する
// （ローカル Express では req.ip が使えるためフォールバック）。IPv6 正規化は
// express-rate-limit の ipKeyGenerator に委譲（ERR_ERL_KEY_GEN_IPV6 対策）。
// cf-connecting-ip は Cloudflare がエッジで上書きするためクライアントからの詐称不可。
const clientIpKeyGenerator = (req: Request): string => {
  const header = req.headers['cf-connecting-ip'];
  if (typeof header === 'string' && header.length > 0) return ipKeyGenerator(header);
  return ipKeyGenerator(req.ip ?? 'unknown');
};

interface RateLimitOptions {
  windowMs: number;
  max: number;
  code: string;
  message: string;
  skipSuccessfulRequests?: boolean;
}

/** エンベロープ統一済みの rate limiter ファクトリ */
function limiter(options: RateLimitOptions) {
  const fallbackRetryAfter = `${options.windowMs / 60000} minutes`;
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: clientIpKeyGenerator,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: options.code,
          message: options.message,
          retryAfter: req.rateLimit?.resetTime
            ? new Date(req.rateLimit.resetTime).toISOString()
            : fallbackRetryAfter,
        },
      });
    },
  });
}

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  code: 'RATE_LIMIT_001',
  message: 'Too many requests. Please try again later.',
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
// （成功はカウントしない = 正常利用では実質的にブロックされない）
export const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  code: 'RATE_LIMIT_002',
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true,
});

// Lenient rate limiter for health checks - 1000 requests per 15 minutes
export const healthCheckLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  code: 'RATE_LIMIT_003',
  message: 'Too many health check requests. Please try again later.',
});

// Create endpoint rate limiter - 20 requests per 15 minutes
export const createLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  code: 'RATE_LIMIT_004',
  message: 'Too many create requests. Please try again later.',
});

/**
 * Custom rate limiter factory for flexible configuration
 */
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  code?: string;
  skipSuccessfulRequests?: boolean;
}) =>
  limiter({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    code: options.code || 'RATE_LIMIT_001',
    message: options.message || 'Too many requests. Please try again later.',
    skipSuccessfulRequests: options.skipSuccessfulRequests,
  });
