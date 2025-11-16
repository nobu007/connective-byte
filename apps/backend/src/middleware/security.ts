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
 */
export const corsConfig: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://connectivebyte.netlify.app',
    'https://staging--connectivebyte.netlify.app',
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
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
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
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
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
