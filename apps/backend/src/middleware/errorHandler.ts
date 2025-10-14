/**
 * Error Handling Middleware
 * Centralized error handling for the application
 * Following clean architecture - middleware handles cross-cutting concerns
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware
 * Catches and formats all errors in a consistent way
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 * Handles requests to non-existent routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
}
