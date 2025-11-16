/**
 * Base Controller Class
 * Abstract base class for all controller layer components
 * Following clean architecture - provides consistent request/response handling
 *
 * Benefits:
 * - Standardized response formatting
 * - Automatic error handling and HTTP status code mapping
 * - Built-in validation support
 * - Reduced boilerplate in controllers
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ValidationError, Logger } from '../types';
import { ValidationBuilder, ValidationResult } from '../utils/validators';

export abstract class BaseController {
  protected readonly logger: Logger;
  protected readonly controllerName: string;
  private requestCount: number = 0;

  constructor(controllerName: string, logger?: Logger) {
    this.controllerName = controllerName;
    this.logger = logger || this.createDefaultLogger();
  }

  /**
   * Log incoming request with details
   * @param req - Express request object
   */
  protected logRequest(req: Request): void {
    this.requestCount++;
    this.logger.info(`${this.controllerName}: Incoming request`, {
      requestId: this.requestCount,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  /**
   * Validate request body with automatic error response
   * @param req - Express request object
   * @param res - Express response object
   * @param validationFn - Validation function
   * @returns true if valid, false if validation failed (response already sent)
   */
  protected validateBody<T>(
    req: Request,
    res: Response,
    validationFn: (data: T) => ValidationResult
  ): boolean {
    const errors = this.validateRequest(req.body as T, validationFn);
    if (errors) {
      this.sendError(res, 'Validation failed', 400, errors);
      return false;
    }
    return true;
  }

  /**
   * Validate request query parameters with automatic error response
   * @param req - Express request object
   * @param res - Express response object
   * @param validationFn - Validation function
   * @returns true if valid, false if validation failed (response already sent)
   */
  protected validateQuery<T>(
    req: Request,
    res: Response,
    validationFn: (data: T) => ValidationResult
  ): boolean {
    const errors = this.validateRequest(req.query as T, validationFn);
    if (errors) {
      this.sendError(res, 'Invalid query parameters', 400, errors);
      return false;
    }
    return true;
  }

  /**
   * Validate request params with automatic error response
   * @param req - Express request object
   * @param res - Express response object
   * @param validationFn - Validation function
   * @returns true if valid, false if validation failed (response already sent)
   */
  protected validateParams<T>(
    req: Request,
    res: Response,
    validationFn: (data: T) => ValidationResult
  ): boolean {
    const errors = this.validateRequest(req.params as T, validationFn);
    if (errors) {
      this.sendError(res, 'Invalid URL parameters', 400, errors);
      return false;
    }
    return true;
  }

  /**
   * Create validation builder for fluent validation
   * @returns ValidationBuilder instance
   */
  protected createValidator(): ValidationBuilder {
    return new ValidationBuilder();
  }

  /**
   * Simple input validation helper
   * @param data - Data to validate
   * @returns Array of validation error messages
   */
  protected validateInput(data: Record<string, any>): string[] {
    const errors: string[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        errors.push(`${key} is required`);
      }
    });

    return errors;
  }

  /**
   * Send success response with consistent formatting
   * @param res - Express response object
   * @param data - Response data
   * @param statusCode - HTTP status code (default: 200)
   */
  protected sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
    const response: ApiResponse<T> = {
      status: 'success',
      data,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send error response with consistent formatting
   * @param res - Express response object
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 500)
   * @param errors - Validation errors if applicable
   */
  protected sendError(
    res: Response,
    message: string,
    statusCode: number = 500,
    errors?: ValidationError[]
  ): void {
    const response: ApiResponse = {
      status: 'error',
      message,
      errors,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Execute controller action with automatic error handling
   * @param req - Express request object
   * @param res - Express response object
   * @param action - Async action to execute
   */
  protected async executeAction(
    req: Request,
    res: Response,
    action: (req: Request, res: Response) => Promise<void>
  ): Promise<void> {
    try {
      await action(req, res);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Handle controller errors with appropriate HTTP status codes
   * @param error - Error object
   * @param req - Express request object
   * @param res - Express response object
   */
  protected handleError(error: unknown, req: Request, res: Response): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Enhanced error context
    const errorContext = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: this.sanitizeBody(req.body),
      params: req.params,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      errorName: errorObj.name,
      errorStack: process.env.NODE_ENV !== 'production' ? errorObj.stack : undefined,
    };

    this.logger.error(
      `${this.controllerName}: Error handling ${req.method} ${req.path}`,
      errorObj,
      errorContext
    );

    // Map error types to HTTP status codes
    const statusCode = this.getStatusCodeFromError(errorObj);
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : errorObj.message;

    this.sendError(res, message, statusCode);
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   * @param body - Request body
   * @returns Sanitized body
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    const sanitized = { ...body } as Record<string, unknown>;

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * Validate request data
   * @param data - Data to validate
   * @param validationFn - Validation function
   * @returns Validation errors or null if valid
   */
  protected validateRequest<T>(
    data: T,
    validationFn: (data: T) => ValidationError[] | null
  ): ValidationError[] | null {
    try {
      return validationFn(data);
    } catch (error) {
      this.logger.error(
        `${this.controllerName}: Validation error`,
        error instanceof Error ? error : new Error(String(error))
      );
      return [
        {
          field: 'unknown',
          message: 'Validation failed',
        },
      ];
    }
  }

  /**
   * Map error to appropriate HTTP status code
   * Can be extended for custom error types
   * @param error - Error object
   * @returns HTTP status code
   */
  protected getStatusCodeFromError(error: Error): number {
    const errorName = error.name.toLowerCase();

    // Common error type mapping
    if (errorName.includes('validation')) return 400;
    if (errorName.includes('unauthorized')) return 401;
    if (errorName.includes('forbidden')) return 403;
    if (errorName.includes('notfound')) return 404;
    if (errorName.includes('conflict')) return 409;
    if (errorName.includes('unavailable')) return 503;

    // Default to 500 for unknown errors
    return 500;
  }

  /**
   * Create default console logger
   */
  private createDefaultLogger(): Logger {
    return {
      info: (message: string, meta?: Record<string, unknown>) => {
        console.log(`[INFO] ${message}`, meta || '');
      },
      error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
        console.error(`[ERROR] ${message}`, error?.message || '', meta || '');
      },
      warn: (message: string, meta?: Record<string, unknown>) => {
        console.warn(`[WARN] ${message}`, meta || '');
      },
      debug: (message: string, meta?: Record<string, unknown>) => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[DEBUG] ${message}`, meta || '');
        }
      },
    };
  }
}
