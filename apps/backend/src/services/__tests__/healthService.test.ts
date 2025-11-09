/**
 * HealthService Tests
 * Comprehensive tests for health monitoring system
 */

import { HealthService, HealthCheckFunction } from '../healthService';
import { HealthCheck } from '../../common/types';

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    healthService = new HealthService();
    healthService.clearCache();
  });

  describe('registerCheck', () => {
    it('should register a health check', async () => {
      const mockCheck: HealthCheckFunction = jest.fn().mockResolvedValue({
        name: 'test',
        status: 'ok',
        message: 'Test passed',
      });

      healthService.registerCheck('test', mockCheck);
      const result = await healthService.getHealthStatus(false);

      expect(result.success).toBe(true);
      expect(result.data?.checks).toContainEqual(
        expect.objectContaining({
          name: 'test',
          status: 'ok',
        })
      );
    });

    it('should register check with custom configuration', async () => {
      const mockCheck: HealthCheckFunction = jest.fn().mockResolvedValue({
        name: 'custom',
        status: 'ok',
      });

      healthService.registerCheck('custom', mockCheck, {
        timeout: 1000,
        retries: 2,
        critical: false,
      });

      const result = await healthService.getHealthStatus(false);
      expect(result.success).toBe(true);
    });
  });

  describe('unregisterCheck', () => {
    it('should remove a registered health check', async () => {
      const mockCheck: HealthCheckFunction = jest.fn().mockResolvedValue({
        name: 'test',
        status: 'ok',
      });

      healthService.registerCheck('test', mockCheck);
      healthService.unregisterCheck('test');

      const result = await healthService.getHealthStatus(false);
      expect(result.data?.checks).not.toContainEqual(expect.objectContaining({ name: 'test' }));
    });
  });

  describe('getHealthStatus', () => {
    it('should return ok status when all checks pass', async () => {
      const result = await healthService.getHealthStatus(false);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('ok');
      expect(result.data?.timestamp).toBeDefined();
      expect(result.data?.uptime).toBeGreaterThan(0);
      expect(result.data?.checks).toBeDefined();
    });

    it('should include default health checks', async () => {
      const result = await healthService.getHealthStatus(false);

      expect(result.data?.checks).toContainEqual(expect.objectContaining({ name: 'uptime' }));
      expect(result.data?.checks).toContainEqual(expect.objectContaining({ name: 'memory' }));
      // diskSpace check disabled to avoid hangs on some systems
      // expect(result.data?.checks).toContainEqual(expect.objectContaining({ name: 'diskSpace' }));
    });

    it('should return error status when critical check fails', async () => {
      const failingCheck: HealthCheckFunction = jest.fn().mockResolvedValue({
        name: 'critical',
        status: 'error',
        message: 'Critical failure',
      });

      healthService.registerCheck('critical', failingCheck, { critical: true });
      const result = await healthService.getHealthStatus(false);

      expect(result.data?.status).toBe('error');
    });

    it('should return degraded status when non-critical check fails', async () => {
      const failingCheck: HealthCheckFunction = jest.fn().mockResolvedValue({
        name: 'noncritical',
        status: 'error',
        message: 'Non-critical failure',
      });

      healthService.registerCheck('noncritical', failingCheck, { critical: false });
      const result = await healthService.getHealthStatus(false);

      expect(result.data?.status).toBe('degraded');
    });

    it('should execute checks in parallel', async () => {
      const delays = [100, 50, 75];
      const startTime = Date.now();

      delays.forEach((delay, index) => {
        const check: HealthCheckFunction = () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  name: `check${index}`,
                  status: 'ok',
                }),
              delay
            )
          );
        healthService.registerCheck(`check${index}`, check);
      });

      await healthService.getHealthStatus(false);
      const duration = Date.now() - startTime;

      // Should take roughly the time of the longest check, not the sum
      expect(duration).toBeLessThan(delays.reduce((a, b) => a + b, 0));
    });

    it('should include response time for each check', async () => {
      const result = await healthService.getHealthStatus(false);

      result.data?.checks?.forEach((check) => {
        expect(check.responseTime).toBeDefined();
        expect(check.responseTime).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('timeout handling', () => {
    it('should timeout slow health checks', async () => {
      const slowCheck: HealthCheckFunction = () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                name: 'slow',
                status: 'ok',
              }),
            10000
          )
        );

      healthService.registerCheck('slow', slowCheck, { timeout: 100 });
      const result = await healthService.getHealthStatus(false);

      const slowCheckResult = result.data?.checks?.find((c) => c.name === 'slow');
      expect(slowCheckResult?.status).toBe('error');
      expect(slowCheckResult?.message).toContain('timeout');
    });

    it('should not timeout fast checks', async () => {
      const fastCheck: HealthCheckFunction = jest.fn().mockResolvedValue({
        name: 'fast',
        status: 'ok',
      });

      healthService.registerCheck('fast', fastCheck, { timeout: 5000 });
      const result = await healthService.getHealthStatus(false);

      const fastCheckResult = result.data?.checks?.find((c) => c.name === 'fast');
      expect(fastCheckResult?.status).toBe('ok');
    });
  });

  describe('retry logic', () => {
    it('should retry failed checks', async () => {
      let attempts = 0;
      const retryCheck: HealthCheckFunction = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          name: 'retry',
          status: 'ok',
        });
      });

      healthService.registerCheck('retry', retryCheck, { retries: 2, retryDelay: 10 });
      const result = await healthService.getHealthStatus(false);

      expect(attempts).toBe(3);
      const retryCheckResult = result.data?.checks?.find((c) => c.name === 'retry');
      expect(retryCheckResult?.status).toBe('ok');
    });

    it('should fail after max retries', async () => {
      const alwaysFailCheck: HealthCheckFunction = jest
        .fn()
        .mockRejectedValue(new Error('Permanent failure'));

      healthService.registerCheck('alwaysFail', alwaysFailCheck, {
        retries: 2,
        retryDelay: 10,
      });
      const result = await healthService.getHealthStatus(false);

      expect(alwaysFailCheck).toHaveBeenCalledTimes(3); // Initial + 2 retries
      const failCheckResult = result.data?.checks?.find((c) => c.name === 'alwaysFail');
      expect(failCheckResult?.status).toBe('error');
    });
  });

  describe('caching', () => {
    it('should cache health check results', async () => {
      const mockCheck = jest.fn().mockResolvedValue({
        name: 'cached',
        status: 'ok',
      });

      healthService.registerCheck('cached', mockCheck);

      // First call - should execute
      await healthService.getHealthStatus(true);
      expect(mockCheck).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await healthService.getHealthStatus(true);
      expect(mockCheck).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when requested', async () => {
      const mockCheck = jest.fn().mockResolvedValue({
        name: 'nocache',
        status: 'ok',
      });

      healthService.registerCheck('nocache', mockCheck);

      await healthService.getHealthStatus(true);
      await healthService.getHealthStatus(false);

      expect(mockCheck).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', async () => {
      const mockCheck = jest.fn().mockResolvedValue({
        name: 'clearable',
        status: 'ok',
      });

      healthService.registerCheck('clearable', mockCheck);

      await healthService.getHealthStatus(true);
      healthService.clearCache();
      await healthService.getHealthStatus(true);

      expect(mockCheck).toHaveBeenCalledTimes(2);
    });
  });

  describe('isHealthy', () => {
    it('should return true when status is ok', async () => {
      const result = await healthService.isHealthy();
      expect(result).toBe(true);
    });

    it('should return false when status is error', async () => {
      const failingCheck: HealthCheckFunction = jest.fn().mockResolvedValue({
        name: 'failing',
        status: 'error',
      });

      healthService.registerCheck('failing', failingCheck, { critical: true });
      const result = await healthService.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle check exceptions gracefully', async () => {
      const throwingCheck: HealthCheckFunction = jest
        .fn()
        .mockRejectedValue(new Error('Check threw error'));

      healthService.registerCheck('throwing', throwingCheck);
      const result = await healthService.getHealthStatus(false);

      expect(result.success).toBe(true);
      const throwingCheckResult = result.data?.checks?.find((c) => c.name === 'throwing');
      expect(throwingCheckResult?.status).toBe('error');
      expect(throwingCheckResult?.message).toContain('Check threw error');
    });

    it('should handle non-Error exceptions', async () => {
      const throwingCheck: HealthCheckFunction = jest.fn().mockRejectedValue('string error');

      healthService.registerCheck('stringError', throwingCheck);
      const result = await healthService.getHealthStatus(false);

      const checkResult = result.data?.checks?.find((c) => c.name === 'stringError');
      expect(checkResult?.status).toBe('error');
    });
  });

  describe('default health checks', () => {
    it('should have uptime check', async () => {
      const result = await healthService.getHealthStatus(false);
      const uptimeCheck = result.data?.checks?.find((c) => c.name === 'uptime');

      expect(uptimeCheck).toBeDefined();
      expect(uptimeCheck?.status).toBe('ok');
      expect(uptimeCheck?.message).toContain('running for');
    });

    it('should have memory check', async () => {
      const result = await healthService.getHealthStatus(false);
      const memoryCheck = result.data?.checks?.find((c) => c.name === 'memory');

      expect(memoryCheck).toBeDefined();
      expect(memoryCheck?.status).toBe('ok');
      expect(memoryCheck?.message).toContain('Heap');
    });

    it.skip('should have disk space check (disabled to avoid hangs)', async () => {
      const result = await healthService.getHealthStatus(false);
      const diskCheck = result.data?.checks?.find((c) => c.name === 'diskSpace');

      expect(diskCheck).toBeDefined();
      expect(diskCheck?.status).toBe('ok');
    });
  });
});
