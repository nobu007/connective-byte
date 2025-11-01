/**
 * HealthService Unit Tests
 * Comprehensive test coverage for health service business logic
 * Following TEST.md specifications
 */

import { HealthService } from '../services/healthService';
import { HealthCheck } from '../common/types';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    // Create fresh instance for each test to avoid state pollution
    service = new HealthService();
  });

  describe('getHealthStatus', () => {
    test('should return ok status when all checks pass', async () => {
      const result = await service.getHealthStatus();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe('ok');
      expect(result.data?.timestamp).toBeDefined();
      expect(result.data?.uptime).toBeGreaterThan(0);
      expect(result.data?.checks).toBeDefined();
      expect(Array.isArray(result.data?.checks)).toBe(true);
    });

    test('should return error status when any check fails', async () => {
      // Register a failing check
      service.registerCheck('failing-check', async () => ({
        name: 'failing-check',
        status: 'error',
        message: 'This check always fails',
      }));

      const result = await service.getHealthStatus();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('error');
      expect(result.data?.checks).toBeDefined();

      const failedCheck = result.data?.checks?.find((c) => c.name === 'failing-check');
      expect(failedCheck).toBeDefined();
      expect(failedCheck?.status).toBe('error');
    });

    test('should include all registered checks in response', async () => {
      // Register additional checks
      service.registerCheck('custom-check-1', async () => ({
        name: 'custom-check-1',
        status: 'ok',
        message: 'Custom check 1 passed',
      }));

      service.registerCheck('custom-check-2', async () => ({
        name: 'custom-check-2',
        status: 'ok',
        message: 'Custom check 2 passed',
      }));

      const result = await service.getHealthStatus();

      expect(result.data?.checks).toBeDefined();
      const checkNames = result.data?.checks?.map((c) => c.name) || [];

      // Should include default checks
      expect(checkNames).toContain('uptime');
      expect(checkNames).toContain('memory');

      // Should include custom checks
      expect(checkNames).toContain('custom-check-1');
      expect(checkNames).toContain('custom-check-2');

      // Should have exactly 4 checks
      expect(checkNames.length).toBe(4);
    });

    test('should measure response time for each check', async () => {
      const result = await service.getHealthStatus();

      expect(result.data?.checks).toBeDefined();

      // All checks should have responseTime
      result.data?.checks?.forEach((check) => {
        expect(check.responseTime).toBeDefined();
        expect(typeof check.responseTime).toBe('number');
        expect(check.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    test('should handle check exceptions gracefully', async () => {
      // Register a check that throws an exception
      service.registerCheck('throwing-check', async () => {
        throw new Error('Simulated check failure');
      });

      const result = await service.getHealthStatus();

      // Service should not crash
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Check should be marked as error
      const throwingCheck = result.data?.checks?.find((c) => c.name === 'throwing-check');
      expect(throwingCheck).toBeDefined();
      expect(throwingCheck?.status).toBe('error');
      expect(throwingCheck?.message).toContain('Simulated check failure');
    });

    test('should execute checks in parallel for performance', async () => {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // Register slow checks
      service.registerCheck('slow-check-1', async () => {
        await delay(50);
        return { name: 'slow-check-1', status: 'ok' as const };
      });

      service.registerCheck('slow-check-2', async () => {
        await delay(50);
        return { name: 'slow-check-2', status: 'ok' as const };
      });

      const startTime = Date.now();
      await service.getHealthStatus();
      const duration = Date.now() - startTime;

      // If parallel, should take ~50ms, not ~100ms (sequential)
      // Allow some overhead for execution
      expect(duration).toBeLessThan(90);
    });

    test('should include uptime and memory in checks', async () => {
      const result = await service.getHealthStatus();

      const checkNames = result.data?.checks?.map((c) => c.name) || [];
      expect(checkNames).toContain('uptime');
      expect(checkNames).toContain('memory');
    });
  });

  describe('registerCheck', () => {
    test('should register new health check', async () => {
      const customCheck = jest.fn<Promise<HealthCheck>, []>(async () => ({
        name: 'custom',
        status: 'ok',
        message: 'Custom check passed',
      }));

      service.registerCheck('custom', customCheck);

      const result = await service.getHealthStatus();
      const checkNames = result.data?.checks?.map((c) => c.name) || [];

      expect(checkNames).toContain('custom');
      expect(customCheck).toHaveBeenCalled();
    });

    test('should allow multiple checks with different names', async () => {
      service.registerCheck('check-1', async () => ({
        name: 'check-1',
        status: 'ok',
      }));

      service.registerCheck('check-2', async () => ({
        name: 'check-2',
        status: 'ok',
      }));

      service.registerCheck('check-3', async () => ({
        name: 'check-3',
        status: 'ok',
      }));

      const result = await service.getHealthStatus();
      const checkNames = result.data?.checks?.map((c) => c.name) || [];

      expect(checkNames).toContain('check-1');
      expect(checkNames).toContain('check-2');
      expect(checkNames).toContain('check-3');
    });

    test('should override check with same name', async () => {
      const firstCheck = jest.fn<Promise<HealthCheck>, []>(async () => ({
        name: 'duplicate',
        status: 'ok',
        message: 'First check',
      }));

      const secondCheck = jest.fn<Promise<HealthCheck>, []>(async () => ({
        name: 'duplicate',
        status: 'ok',
        message: 'Second check',
      }));

      service.registerCheck('duplicate', firstCheck);
      service.registerCheck('duplicate', secondCheck);

      const result = await service.getHealthStatus();

      // Only second check should be called
      expect(firstCheck).not.toHaveBeenCalled();
      expect(secondCheck).toHaveBeenCalled();

      const duplicateCheck = result.data?.checks?.find((c) => c.name === 'duplicate');
      expect(duplicateCheck?.message).toBe('Second check');
    });
  });

  describe('unregisterCheck', () => {
    test('should remove registered check', async () => {
      service.registerCheck('removable', async () => ({
        name: 'removable',
        status: 'ok',
      }));

      // Verify check is registered
      let result = await service.getHealthStatus();
      let checkNames = result.data?.checks?.map((c) => c.name) || [];
      expect(checkNames).toContain('removable');

      // Unregister and verify removal
      service.unregisterCheck('removable');
      result = await service.getHealthStatus();
      checkNames = result.data?.checks?.map((c) => c.name) || [];
      expect(checkNames).not.toContain('removable');
    });

    test('should not throw if check does not exist', () => {
      // Should not throw
      expect(() => {
        service.unregisterCheck('non-existent-check');
      }).not.toThrow();
    });

    test('should allow re-registration after unregistering', async () => {
      service.registerCheck('toggle', async () => ({
        name: 'toggle',
        status: 'ok',
      }));

      service.unregisterCheck('toggle');

      // Re-register
      service.registerCheck('toggle', async () => ({
        name: 'toggle',
        status: 'ok',
        message: 'Re-registered',
      }));

      const result = await service.getHealthStatus();
      const toggleCheck = result.data?.checks?.find((c) => c.name === 'toggle');
      expect(toggleCheck).toBeDefined();
      expect(toggleCheck?.message).toBe('Re-registered');
    });
  });

  describe('isHealthy', () => {
    test('should return true when status is ok', async () => {
      const healthy = await service.isHealthy();
      expect(healthy).toBe(true);
    });

    test('should return false when status is error', async () => {
      service.registerCheck('failing', async () => ({
        name: 'failing',
        status: 'error',
        message: 'Failed',
      }));

      const healthy = await service.isHealthy();
      expect(healthy).toBe(false);
    });

    test('should return boolean type', async () => {
      const healthy = await service.isHealthy();
      expect(typeof healthy).toBe('boolean');
    });
  });

  describe('default checks', () => {
    describe('checkUptime', () => {
      test('should return ok status', async () => {
        const result = await service.getHealthStatus();
        const uptimeCheck = result.data?.checks?.find((c) => c.name === 'uptime');

        expect(uptimeCheck).toBeDefined();
        expect(uptimeCheck?.status).toBe('ok');
        expect(uptimeCheck?.message).toBeDefined();
        expect(uptimeCheck?.message).toContain('running for');
      });

      test('should include uptime duration in message', async () => {
        const result = await service.getHealthStatus();
        const uptimeCheck = result.data?.checks?.find((c) => c.name === 'uptime');

        expect(uptimeCheck?.message).toMatch(/\d+\.\d+ seconds/);
      });
    });

    describe('checkMemory', () => {
      test('should return ok when usage is low', async () => {
        // Under normal test conditions, memory should be OK
        const result = await service.getHealthStatus();
        const memoryCheck = result.data?.checks?.find((c) => c.name === 'memory');

        expect(memoryCheck).toBeDefined();
        expect(memoryCheck?.status).toBe('ok');
        expect(memoryCheck?.message).toBeDefined();
        expect(memoryCheck?.message).toContain('Heap:');
        expect(memoryCheck?.message).toContain('MB');
      });

      test('should include memory usage percentage', async () => {
        const result = await service.getHealthStatus();
        const memoryCheck = result.data?.checks?.find((c) => c.name === 'memory');

        // Message should contain percentage like "(35.3%)"
        expect(memoryCheck?.message).toMatch(/\(\d+\.\d+%\)/);
      });

      test('should report heap usage in megabytes', async () => {
        const result = await service.getHealthStatus();
        const memoryCheck = result.data?.checks?.find((c) => c.name === 'memory');

        // Should have format like "45.23MB / 128.00MB"
        expect(memoryCheck?.message).toMatch(/\d+\.\d+MB \/ \d+\.\d+MB/);
      });
    });
  });

  describe('service metadata', () => {
    test('should include duration in metadata', async () => {
      const result = await service.getHealthStatus();

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.duration).toBeDefined();
      expect(typeof result.metadata?.duration).toBe('number');
      expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
    });

    test('should return timestamp in ISO format', async () => {
      const result = await service.getHealthStatus();

      expect(result.data?.timestamp).toBeDefined();

      // Validate ISO 8601 format
      const timestamp = result.data?.timestamp || '';
      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    test('should return current uptime', async () => {
      const result = await service.getHealthStatus();

      expect(result.data?.uptime).toBeDefined();
      expect(typeof result.data?.uptime).toBe('number');
      expect(result.data?.uptime).toBeGreaterThan(0);
    });
  });

  describe('backwards compatibility exports', () => {
    // Import the legacy functions
    const {
      getHealthStatus: legacyGetHealthStatus,
      isHealthy: legacyIsHealthy,
    } = require('../services/healthService');

    test('legacy getHealthStatus function should work', async () => {
      const status = await legacyGetHealthStatus();

      expect(status).toBeDefined();
      expect(status.status).toBe('ok');
      expect(status.timestamp).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.checks).toBeDefined();
    });

    test('legacy isHealthy function should work', async () => {
      const healthy = await legacyIsHealthy();
      expect(typeof healthy).toBe('boolean');
      expect(healthy).toBe(true);
    });
  });
});
