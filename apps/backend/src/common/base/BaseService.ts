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
  private operationCount: number = 0;
  private totalOperationTime: number = 0;
  private failedOperations: number = 0;

  constructor(serviceName: string, logger?: Logger) {
    this.serviceName = serviceName;
    // Use provided logger or create default logger
    // LoggingService will be integrated later to avoid circular dependency
    this.logger = logger || this.createDefaultLogger();
  }

  /**
   * Get service health metrics
   * @returns Service health information
   */
  public getHealthMetrics(): {
    serviceName: string;
    operationCount: number;
    averageOperationTime: number;
    failedOperations: number;
    successRate: number;
  } {
    const averageOperationTime =
      this.operationCount > 0 ? this.totalOperationTime / this.operationCount : 0;
    const successRate =
      this.operationCount > 0
        ? ((this.operationCount - this.failedOperations) / this.operationCount) * 100
        : 100;

    return {
      serviceName: this.serviceName,
      operationCount: this.operationCount,
      averageOperationTime: Math.round(averageOperationTime),
      failedOperations: this.failedOperations,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Reset service metrics (useful for testing)
   */
  protected resetMetrics(): void {
    this.operationCount = 0;
    this.totalOperationTime = 0;
    this.failedOperations = 0;
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
    const operationId = ++this.operationCount;

    try {
      this.logger.debug(`${this.serviceName}: Starting ${operationContext}`, {
        operationId,
        timestamp: new Date().toISOString(),
      });

      const data = await operation();
      const duration = Date.now() - startTime;
      this.totalOperationTime += duration;

      this.logger.info(`${this.serviceName}: ${operationContext} completed`, {
        operationId,
        duration,
        success: true,
        metrics: this.getHealthMetrics(),
      });

      return {
        success: true,
        data,
        metadata: {
          duration,
          operationId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.totalOperationTime += duration;
      this.failedOperations++;

      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Enhanced error context
      const errorContext = {
        operationId,
        duration,
        errorName: errorObj.name,
        errorMessage: errorObj.message,
        errorStack: process.env.NODE_ENV !== 'production' ? errorObj.stack : undefined,
        metrics: this.getHealthMetrics(),
      };

      this.logger.error(`${this.serviceName}: ${operationContext} failed`, errorObj, errorContext);

      return {
        success: false,
        error: errorObj,
        metadata: {
          duration,
          operationId,
          timestamp: new Date().toISOString(),
          errorContext: {
            name: errorObj.name,
            message: errorObj.message,
          },
        },
      };
    }
  }

  /**
   * Execute synchronous operation with error handling
   * @param operation - Sync operation to execute
   * @param context - Context information for logging
   * @returns Service result with success/error status
   */
  protected executeSync<T>(operation: () => T, context?: string): ServiceResult<T> {
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

      this.logger.error(`${this.serviceName}: ${operationContext} failed`, errorObj);

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
