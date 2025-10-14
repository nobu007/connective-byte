/**
 * Base Service Class
 * Abstract base class for all service layer components
 * Following clean architecture - provides common service functionality
 *
 * Benefits:
 * - Consistent error handling across all services
 * - Built-in logging capability with structured logging
 * - Standardized result wrapping
 * - Reusable validation patterns
 */

import { ServiceResult, Logger } from '../types';

export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly serviceName: string;

  constructor(serviceName: string, logger?: Logger) {
    this.serviceName = serviceName;
    // Use provided logger or create default logger
    // LoggingService will be integrated later to avoid circular dependency
    this.logger = logger || this.createDefaultLogger();
  }

  /**
   * Execute service operation with automatic error handling
   * @param operation - Async operation to execute
   * @param context - Context information for logging
   * @returns Service result with success/error status
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    const operationContext = context || 'operation';

    try {
      this.logger.debug(`${this.serviceName}: Starting ${operationContext}`);

      const data = await operation();
      const duration = Date.now() - startTime;

      this.logger.info(`${this.serviceName}: ${operationContext} completed`, {
        duration,
        success: true,
      });

      return {
        success: true,
        data,
        metadata: { duration },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      this.logger.error(
        `${this.serviceName}: ${operationContext} failed`,
        errorObj,
        { duration }
      );

      return {
        success: false,
        error: errorObj,
        metadata: { duration },
      };
    }
  }

  /**
   * Execute synchronous operation with error handling
   * @param operation - Sync operation to execute
   * @param context - Context information for logging
   * @returns Service result with success/error status
   */
  protected executeSync<T>(
    operation: () => T,
    context?: string
  ): ServiceResult<T> {
    const operationContext = context || 'operation';

    try {
      this.logger.debug(`${this.serviceName}: Starting ${operationContext}`);
      const data = operation();

      this.logger.info(`${this.serviceName}: ${operationContext} completed`, {
        success: true,
      });

      return {
        success: true,
        data,
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      this.logger.error(
        `${this.serviceName}: ${operationContext} failed`,
        errorObj
      );

      return {
        success: false,
        error: errorObj,
      };
    }
  }

  /**
   * Validate input data
   * Override in subclasses for specific validation logic
   * @param data - Data to validate
   * @returns Validation errors or null if valid
   */
  protected validate<T>(data: T): string[] | null {
    // Default: no validation errors
    // Subclasses should override for specific validation
    return null;
  }

  /**
   * Create default console logger
   * Can be replaced with structured logger (Winston, Pino, etc.)
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
