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

export abstract class BaseController {
  protected readonly logger: Logger;
  protected readonly controllerName: string;

  constructor(controllerName: string, logger?: Logger) {
    this.controllerName = controllerName;
    this.logger = logger || this.createDefaultLogger();
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

    this.logger.error(
      `${this.controllerName}: Error handling ${req.method} ${req.path}`,
      errorObj,
      {
        method: req.method,
        path: req.path,
        query: req.query,
      }
    );

    // Map error types to HTTP status codes
    const statusCode = this.getStatusCodeFromError(errorObj);
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : errorObj.message;

    this.sendError(res, message, statusCode);
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
