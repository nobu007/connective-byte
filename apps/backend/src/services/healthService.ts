/**
 * Health Service
 * Business logic for health check functionality
 * Following clean architecture - service layer handles business logic
 * Extended with BaseService for consistent error handling and logging
 */

import { BaseService } from '../common/base/BaseService';
import { HealthStatus, HealthCheck, ServiceResult } from '../common/types';
import { loggingService } from './loggingService';

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<HealthCheck>;

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  timeout?: number; // Timeout in milliseconds (default: 5000)
  retries?: number; // Number of retries on failure (default: 0)
  retryDelay?: number; // Delay between retries in milliseconds (default: 1000)
  critical?: boolean; // Whether this check is critical for overall health (default: true)
}

/**
 * Registered health check with configuration
 */
interface RegisteredHealthCheck {
  fn: HealthCheckFunction;
  config: Required<HealthCheckConfig>;
}

/**
 * Health check cache entry
 */
interface CacheEntry {
  result: HealthCheck;
  timestamp: number;
}

/**
 * Enhanced Health Service using BaseService
 * Provides extensible health checking with multiple checks
 * Uses centralized logging service for structured logging
 */
export class HealthService extends BaseService {
  private healthChecks: Map<string, RegisteredHealthCheck> = new Map();
  private checkCache: Map<string, CacheEntry> = new Map();
  private readonly defaultTimeout = 5000;
  private readonly defaultRetries = 0;
  private readonly defaultRetryDelay = 1000;
  private readonly cacheTimeout = 30000; // 30 seconds

  constructor() {
    // Use centralized logging service
    super('HealthService', loggingService.createLogger('HealthService'));
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    this.registerCheck('uptime', this.checkUptime.bind(this), { timeout: 1000 });
    this.registerCheck('memory', this.checkMemory.bind(this), { timeout: 1000 });
    this.registerCheck('diskSpace', this.checkDiskSpace.bind(this), { timeout: 2000 });
  }

  /**
   * Register a new health check
   * Allows extensibility - external modules can add their own checks
   * @param name - Unique name for the check
   * @param checkFn - Async function that performs the check
   * @param config - Optional configuration for the check
   */
  public registerCheck(
    name: string,
    checkFn: HealthCheckFunction,
    config: HealthCheckConfig = {}
  ): void {
    const fullConfig: Required<HealthCheckConfig> = {
      timeout: config.timeout ?? this.defaultTimeout,
      retries: config.retries ?? this.defaultRetries,
      retryDelay: config.retryDelay ?? this.defaultRetryDelay,
      critical: config.critical ?? true,
    };

    this.healthChecks.set(name, { fn: checkFn, config: fullConfig });
    this.logger.debug(`Health check registered: ${name}`, fullConfig);
  }

  /**
   * Remove a health check
   * @param name - Name of the check to remove
   */
  public unregisterCheck(name: string): void {
    this.healthChecks.delete(name);
    this.logger.debug(`Health check unregistered: ${name}`);
  }

  /**
   * Get current health status of the application
   * Executes all registered health checks with caching
   * @param useCache - Whether to use cached results (default: true)
   * @returns Service result with health status
   */
  public async getHealthStatus(useCache: boolean = true): Promise<ServiceResult<HealthStatus>> {
    return this.executeOperation(async () => {
      const checks: HealthCheck[] = [];

      // Execute all registered health checks in parallel
      const checkPromises = Array.from(this.healthChecks.entries()).map(
        async ([name, registered]) => {
          // Check cache first
          if (useCache) {
            const cached = this.getCachedResult(name);
            if (cached) {
              this.logger.debug(`Using cached result for health check: ${name}`);
              return cached;
            }
          }

          // Execute check with timeout and retry
          const result = await this.executeHealthCheck(name, registered);

          // Cache the result
          this.cacheResult(name, result);

          return result;
        }
      );

      const checkResults = await Promise.all(checkPromises);
      checks.push(...checkResults);

      // Determine overall status based on critical checks
      const criticalChecks = Array.from(this.healthChecks.entries())
        .filter(([_, registered]) => registered.config.critical)
        .map(([name]) => name);

      const hasCriticalErrors = checks.some(
        (check) => criticalChecks.includes(check.name) && check.status === 'error'
      );

      const hasNonCriticalErrors = checks.some(
        (check) => !criticalChecks.includes(check.name) && check.status === 'error'
      );

      const overallStatus: HealthStatus['status'] = hasCriticalErrors
        ? 'error'
        : hasNonCriticalErrors
          ? 'degraded'
          : 'ok';

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
      };
    }, 'getHealthStatus');
  }

  /**
   * Execute a single health check with timeout and retry logic
   * @param name - Name of the health check
   * @param registered - Registered health check with configuration
   * @returns Health check result
   */
  private async executeHealthCheck(
    name: string,
    registered: RegisteredHealthCheck
  ): Promise<HealthCheck> {
    const { fn, config } = registered;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.debug(`Retrying health check: ${name} (attempt ${attempt + 1})`);
          await this.delay(config.retryDelay);
        }

        const startTime = Date.now();
        const result = await this.withTimeout(fn(), config.timeout, name);

        return {
          ...result,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Health check attempt failed: ${name}`, {
          attempt: attempt + 1,
          error: lastError.message,
        });
      }
    }

    // All retries failed
    this.logger.error(
      `Health check failed after ${config.retries + 1} attempts: ${name}`,
      lastError
    );
    return {
      name,
      status: 'error',
      message: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Execute a promise with timeout
   * @param promise - Promise to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param checkName - Name of the check (for error messages)
   * @returns Promise result
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    checkName: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Health check timeout: ${checkName}`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Delay execution
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get cached health check result if available and not expired
   * @param name - Name of the health check
   * @returns Cached result or null
   */
  private getCachedResult(name: string): HealthCheck | null {
    const cached = this.checkCache.get(name);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.checkCache.delete(name);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache health check result
   * @param name - Name of the health check
   * @param result - Health check result
   */
  private cacheResult(name: string, result: HealthCheck): void {
    this.checkCache.set(name, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear health check cache
   */
  public clearCache(): void {
    this.checkCache.clear();
    this.logger.debug('Health check cache cleared');
  }

  /**
   * Check if the application is healthy
   * @returns Boolean indicating if the application is healthy
   */
  public async isHealthy(): Promise<boolean> {
    const result = await this.getHealthStatus();
    return result.success && result.data?.status === 'ok';
  }

  /**
   * Uptime health check
   */
  private async checkUptime(): Promise<HealthCheck> {
    const uptime = process.uptime();
    return {
      name: 'uptime',
      status: 'ok',
      message: `Application running for ${uptime.toFixed(2)} seconds`,
    };
  }

  /**
   * Memory usage health check
   */
  private async checkMemory(): Promise<HealthCheck> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);

    // Consider unhealthy if using more than 90% of heap
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const status = heapUsagePercent > 90 ? 'error' : 'ok';

    return {
      name: 'memory',
      status,
      message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent.toFixed(1)}%)`,
    };
  }

  /**
   * Disk space health check
   * Note: This is a basic implementation. For production, consider using a library like 'diskusage'
   */
  private async checkDiskSpace(): Promise<HealthCheck> {
    try {
      // Basic check - just verify we can write to temp directory
      const fs = await import('fs/promises');
      const os = await import('os');
      const path = await import('path');

      const tmpDir = os.tmpdir();
      const testFile = path.join(tmpDir, `.health-check-${Date.now()}`);

      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      return {
        name: 'diskSpace',
        status: 'ok',
        message: 'Disk space available',
      };
    } catch (error) {
      return {
        name: 'diskSpace',
        status: 'error',
        message: error instanceof Error ? error.message : 'Disk space check failed',
      };
    }
  }
}

// Export singleton instance for convenience
export const healthService = new HealthService();

// Backwards compatibility: export individual functions
export async function getHealthStatus(): Promise<HealthStatus> {
  const result = await healthService.getHealthStatus();
  if (result.success && result.data) {
    return result.data;
  }
  throw result.error || new Error('Failed to get health status');
}

export async function isHealthy(): Promise<boolean> {
  return healthService.isHealthy();
}
