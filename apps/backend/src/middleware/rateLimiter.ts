import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter configuration for different endpoints
 */

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: req.rateLimit?.resetTime
        ? new Date(req.rateLimit.resetTime).toISOString()
        : '15 minutes',
    });
  },
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have exceeded the authentication rate limit. Please try again later.',
      retryAfter: req.rateLimit?.resetTime
        ? new Date(req.rateLimit.resetTime).toISOString()
        : '15 minutes',
    });
  },
});

// Lenient rate limiter for health checks - 1000 requests per 15 minutes
export const healthCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many health check requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many health check requests',
      message: 'You have exceeded the health check rate limit.',
      retryAfter: req.rateLimit?.resetTime
        ? new Date(req.rateLimit.resetTime).toISOString()
        : '15 minutes',
    });
  },
});

// Create endpoint rate limiter - 20 requests per 15 minutes
export const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 create requests per windowMs
  message: {
    error: 'Too many create requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many create requests',
      message: 'You have exceeded the create operation rate limit. Please try again later.',
      retryAfter: req.rateLimit?.resetTime
        ? new Date(req.rateLimit.resetTime).toISOString()
        : '15 minutes',
    });
  },
});

/**
 * Custom rate limiter factory for flexible configuration
 */
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      error: options.message || 'Too many requests, please try again later.',
      retryAfter: `${(options.windowMs || 15 * 60 * 1000) / 60000} minutes`,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests, please try again later.',
        retryAfter: req.rateLimit?.resetTime
          ? new Date(req.rateLimit.resetTime).toISOString()
          : `${(options.windowMs || 15 * 60 * 1000) / 60000} minutes`,
      });
    },
  });
};
