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
 * Enhanced Health Service using BaseService
 * Provides extensible health checking with multiple checks
 * Uses centralized logging service for structured logging
 */
export class HealthService extends BaseService {
  private healthChecks: Map<string, HealthCheckFunction> = new Map();

  constructor() {
    // Use centralized logging service
    super('HealthService', loggingService.createLogger('HealthService'));
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    this.registerCheck('uptime', this.checkUptime.bind(this));
    this.registerCheck('memory', this.checkMemory.bind(this));
  }

  /**
   * Register a new health check
   * Allows extensibility - external modules can add their own checks
   * @param name - Unique name for the check
   * @param checkFn - Async function that performs the check
   */
  public registerCheck(name: string, checkFn: HealthCheckFunction): void {
    this.healthChecks.set(name, checkFn);
    this.logger.debug(`Health check registered: ${name}`);
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
   * Executes all registered health checks
   * @returns Service result with health status
   */
  public async getHealthStatus(): Promise<ServiceResult<HealthStatus>> {
    return this.executeOperation(async () => {
      const checks: HealthCheck[] = [];

      // Execute all registered health checks in parallel
      const checkPromises = Array.from(this.healthChecks.entries()).map(async ([name, checkFn]) => {
        try {
          const startTime = Date.now();
          const result = await checkFn();
          return {
            ...result,
            responseTime: Date.now() - startTime,
          };
        } catch (error) {
          this.logger.error(`Health check failed: ${name}`, error as Error);
          return {
            name,
            status: 'error' as const,
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const checkResults = await Promise.all(checkPromises);
      checks.push(...checkResults);

      // Determine overall status
      const hasErrors = checks.some((check) => check.status === 'error');
      const overallStatus: HealthStatus['status'] = hasErrors ? 'error' : 'ok';

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
      };
    }, 'getHealthStatus');
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
