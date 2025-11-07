/**
 * BaseService Tests
 * Comprehensive tests for BaseService error handling and operation tracking
 */

import { BaseService } from '../BaseService';
import { Logger, ServiceResult } from '../../types';

// Mock logger
const mockLogger: Logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Test service implementation
class TestService extends BaseService {
  constructor(logger?: Logger) {
    super('TestService', logger);
  }

  // Expose protected methods for testing
  public async testExecuteOperation<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<ServiceResult<T>> {
    return this.executeOperation(operation, context);
  }

  public testExecuteSync<T>(operation: () => T, context?: string): ServiceResult<T> {
    return this.executeSync(operation, context);
  }

  public testResetMetrics(): void {
    this.resetMetrics();
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestService(mockLogger);
  });

  describe('executeOperation', () => {
    it('should execute successful async operation', async () => {
      const operation = jest.fn().mockResolvedValue({ data: 'test' });
      const result = await service.testExecuteOperation(operation, 'test-operation');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'test' });
      expect(result.metadata).toHaveProperty('duration');
      expect(result.metadata).toHaveProperty('operationId');
      expect(result.metadata).toHaveProperty('timestamp');
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle operation errors', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      const result = await service.testExecuteOperation(operation, 'failing-operation');

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.metadata).toHaveProperty('duration');
      expect(result.metadata).toHaveProperty('errorContext');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should track operation metrics', async () => {
      const operation1 = jest.fn().mockResolvedValue('success');
      const operation2 = jest.fn().mockResolvedValue('success');

      await service.testExecuteOperation(operation1);
      await service.testExecuteOperation(operation2);

      const metrics = service.getHealthMetrics();
      expect(metrics.operationCount).toBe(2);
      expect(metrics.failedOperations).toBe(0);
      expect(metrics.successRate).toBe(100);
    });

    it('should track failed operations', async () => {
      const successOp = jest.fn().mockResolvedValue('success');
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      await service.testExecuteOperation(successOp);
      await service.testExecuteOperation(failOp);
      await service.testExecuteOperation(failOp);

      const metrics = service.getHealthMetrics();
      expect(metrics.operationCount).toBe(3);
      expect(metrics.failedOperations).toBe(2);
      expect(metrics.successRate).toBeCloseTo(33.33, 1);
    });

    it('should calculate average operation time', async () => {
      const slowOp = () => new Promise((resolve) => setTimeout(() => resolve('done'), 50));
      const fastOp = () => Promise.resolve('done');

      await service.testExecuteOperation(slowOp);
      await service.testExecuteOperation(fastOp);

      const metrics = service.getHealthMetrics();
      expect(metrics.averageOperationTime).toBeGreaterThan(0);
    });

    it('should include operation ID in metadata', async () => {
      const operation = jest.fn().mockResolvedValue('test');

      const result1 = await service.testExecuteOperation(operation);
      const result2 = await service.testExecuteOperation(operation);

      expect(result1.metadata?.operationId).toBe(1);
      expect(result2.metadata?.operationId).toBe(2);
    });

    it('should log operation start and completion', async () => {
      const operation = jest.fn().mockResolvedValue('test');
      await service.testExecuteOperation(operation, 'test-context');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Starting test-context'),
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('test-context completed'),
        expect.any(Object)
      );
    });

    it('should include metrics in log output', async () => {
      const operation = jest.fn().mockResolvedValue('test');
      await service.testExecuteOperation(operation);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metrics: expect.objectContaining({
            operationCount: 1,
            successRate: 100,
          }),
        })
      );
    });
  });

  describe('executeSync', () => {
    it('should execute successful sync operation', () => {
      const operation = jest.fn().mockReturnValue({ data: 'test' });
      const result = service.testExecuteSync(operation, 'sync-operation');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'test' });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle sync operation errors', () => {
      const error = new Error('Sync operation failed');
      const operation = jest.fn().mockImplementation(() => {
        throw error;
      });
      const result = service.testExecuteSync(operation, 'failing-sync');

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getHealthMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = service.getHealthMetrics();

      expect(metrics).toEqual({
        serviceName: 'TestService',
        operationCount: 0,
        averageOperationTime: 0,
        failedOperations: 0,
        successRate: 100,
      });
    });

    it('should return updated metrics after operations', async () => {
      const operation = jest.fn().mockResolvedValue('test');
      await service.testExecuteOperation(operation);
      await service.testExecuteOperation(operation);

      const metrics = service.getHealthMetrics();
      expect(metrics.operationCount).toBe(2);
      expect(metrics.averageOperationTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to zero', async () => {
      const operation = jest.fn().mockResolvedValue('test');
      await service.testExecuteOperation(operation);
      await service.testExecuteOperation(operation);

      service.testResetMetrics();

      const metrics = service.getHealthMetrics();
      expect(metrics.operationCount).toBe(0);
      expect(metrics.averageOperationTime).toBe(0);
      expect(metrics.failedOperations).toBe(0);
      expect(metrics.successRate).toBe(100);
    });
  });

  describe('error context preservation', () => {
    it('should preserve error name and message in metadata', async () => {
      const error = new Error('Custom error message');
      error.name = 'CustomError';
      const operation = jest.fn().mockRejectedValue(error);

      const result = await service.testExecuteOperation(operation);

      expect(result.metadata?.errorContext).toEqual({
        name: 'CustomError',
        message: 'Custom error message',
      });
    });

    it('should log error stack in non-production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const operation = jest.fn().mockRejectedValue(error);
      await service.testExecuteOperation(operation);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          errorStack: expect.any(String),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('default logger', () => {
    it('should create service without logger', () => {
      const serviceWithoutLogger = new TestService();
      expect(serviceWithoutLogger).toBeDefined();
    });

    it('should use default logger when none provided', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const serviceWithoutLogger = new TestService();
      const operation = jest.fn().mockResolvedValue('test');

      await serviceWithoutLogger.testExecuteOperation(operation);

      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });
});
