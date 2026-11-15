import helmet from 'helmet';
import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Security middleware configuration using helmet
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: true,
  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: 'same-origin' },
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  // Expect-CT (deprecated but kept for backwards compatibility)
  // expectCt: {
  //   maxAge: 86400,
  //   enforce: true,
  // },
  // Frameguard
  frameguard: { action: 'deny' },
  // Hide Powered-By
  hidePoweredBy: true,
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  // IE No Open
  ieNoOpen: true,
  // No Sniff
  noSniff: true,
  // Origin Agent Cluster
  originAgentCluster: true,
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // X-XSS-Protection
  xssFilter: true,
});

/**
 * CORS configuration middleware
 *
 * 許可オリジンは本番ドメインとローカル開発のみ。
 * pages.dev プレビューは認証なしの静的プレビューとして割り切る
 * （CORS を開けると credentialed リクエストが通るため）。
 */
export const corsConfig: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://connectivebyte.com',
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // プロフィール自由記述欄（bio 等）は対象外:
  // 出力は React がエスケープするためサニタイズ不要であり、
  // on\w+= の除去が正当な本文（"ongoing=..." 等）を破壊するため
  if (req.method === 'PUT' && req.path === '/api/auth/me') {
    next();
    return;
  }

  // learning 管理APIの Markdown 本文も対象外:
  // コードサンプル中の onChange= 等を sanitizeString が日常的に破壊するため。
  // 出力は react-markdown が raw HTML を描画しないため安全（rehype-raw 不使用）。
  // 書き込みは authenticate + authorize(content_administrator) で保護される。
  if (req.path.startsWith('/api/learning/admin')) {
    next();
    return;
  }

  // Stripe Webhook も対象外:
  // 署名検証に生ボディ（req.rawBody）を使い、本文は Stripe が送ったまま扱うため
  // （sanitize が本文を書き換えると署名検証が必ず失敗する。学習コンテンツ系と同じ理由）。
  // リクエストの真正性は Stripe-Signature の HMAC 検証で保証される。
  if (req.path === '/api/payments/webhook') {
    next();
    return;
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    });
  }

  // Sanitize body parameters
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
};

/**
 * Sanitize a string by removing potentially dangerous characters
 */
function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const record = obj as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  Object.keys(record).forEach((key) => {
    const value = record[key];
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Request validation middleware
 */
export const validateRequest: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /\.\./g, // Directory traversal
    /[<>]/g, // HTML tags
    /javascript:/gi, // JavaScript protocol
    /data:/gi, // Data protocol
    /vbscript:/gi, // VBScript protocol
  ];

  const url = req.url;
  const isSuspicious = suspiciousPatterns.some((pattern) => pattern.test(url));

  if (isSuspicious) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid request URL',
    });
    return;
  }

  // Check Content-Type for POST/PUT/PATCH requests
  // （ボディを持つリクエストのみ強制。refresh/logout 猶の空ボディ POST は許可）
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    const contentLength = Number(req.headers['content-length'] ?? 0);
    const hasBody = contentLength > 0 || req.headers['transfer-encoding'] !== undefined;
    if (hasBody && (!contentType || !contentType.includes('application/json'))) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type must be application/json',
      });
      return;
    }
  }

  next();
};

/**
 * Security logging middleware
 */
export const securityLogger: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log security-relevant information
  const securityInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer,
  };

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logEntry = {
      ...securityInfo,
      statusCode: res.statusCode,
      duration,
    };

    // Log suspicious activity
    if (res.statusCode >= 400) {
      console.warn('[SECURITY]', logEntry);
    }
  });

  next();
};
