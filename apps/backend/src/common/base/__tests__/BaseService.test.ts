/**
 * BaseService Unit Tests
 * Comprehensive tests for the base service class
 * Tests error handling, logging, and operation execution
 */

import { BaseService } from '../BaseService';
import { ServiceResult, Logger } from '../../types';

// Test implementation of BaseService
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

  public testValidate<T>(data: T): string[] | null {
    return this.validate(data);
  }
}

describe('BaseService', () => {
  let mockLogger: Logger;
  let service: TestService;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    service = new TestService(mockLogger);
  });

  describe('constructor', () => {
    it('should create service with provided logger', () => {
      expect(service).toBeDefined();
      expect(service['logger']).toBe(mockLogger);
      expect(service['serviceName']).toBe('TestService');
    });

    it('should create service with default logger if none provided', () => {
      const defaultService = new TestService();
      expect(defaultService).toBeDefined();
      expect(defaultService['logger']).toBeDefined();
    });
  });

  describe('executeOperation', () => {
    it('should execute async operation successfully', async () => {
      const mockData = { id: 1, name: 'Test' };
      const operation = jest.fn().mockResolvedValue(mockData);

      const result = await service.testExecuteOperation(operation, 'testOp');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
      expect(operation).toHaveBeenCalledTimes(1);

      expect(mockLogger.debug).toHaveBeenCalledWith('TestService: Starting testOp');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'TestService: testOp completed',
        expect.objectContaining({
          duration: expect.any(Number),
          success: true,
        })
      );
    });

    it('should handle operation errors gracefully', async () => {
      const mockError = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(mockError);

      const result = await service.testExecuteOperation(operation, 'failOp');

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
      expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'TestService: failOp failed',
        mockError,
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );
    });

    it('should use default context name if not provided', async () => {
      const operation = jest.fn().mockResolvedValue('data');

      await service.testExecuteOperation(operation);

      expect(mockLogger.debug).toHaveBeenCalledWith('TestService: Starting operation');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'TestService: operation completed',
        expect.any(Object)
      );
    });

    it('should handle non-Error exceptions', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      const result = await service.testExecuteOperation(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('string error');
    });

    it('should track operation duration accurately', async () => {
      const delay = 50; // 50ms delay
      const operation = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('data'), delay))
        );

      const result = await service.testExecuteOperation(operation);

      expect(result.success).toBe(true);
      expect(result.metadata?.duration).toBeGreaterThanOrEqual(delay - 10); // Allow small variance
    });
  });

  describe('executeSync', () => {
    it('should execute sync operation successfully', () => {
      const mockData = { value: 42 };
      const operation = jest.fn().mockReturnValue(mockData);

      const result = service.testExecuteSync(operation, 'syncOp');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(operation).toHaveBeenCalledTimes(1);

      expect(mockLogger.debug).toHaveBeenCalledWith('TestService: Starting syncOp');
      expect(mockLogger.info).toHaveBeenCalledWith('TestService: syncOp completed', {
        success: true,
      });
    });

    it('should handle sync operation errors gracefully', () => {
      const mockError = new Error('Sync operation failed');
      const operation = jest.fn().mockImplementation(() => {
        throw mockError;
      });

      const result = service.testExecuteSync(operation, 'failSyncOp');

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);

      expect(mockLogger.error).toHaveBeenCalledWith('TestService: failSyncOp failed', mockError);
    });

    it('should use default context for sync operations', () => {
      const operation = jest.fn().mockReturnValue('data');

      service.testExecuteSync(operation);

      expect(mockLogger.debug).toHaveBeenCalledWith('TestService: Starting operation');
    });

    it('should handle non-Error exceptions in sync operations', () => {
      const operation = jest.fn().mockImplementation(() => {
        throw 'string error';
      });

      const result = service.testExecuteSync(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('string error');
    });

    it('should return data without metadata for sync operations', () => {
      const operation = jest.fn().mockReturnValue('test data');

      const result = service.testExecuteSync(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test data');
      expect(result.metadata).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should return null for valid data (default implementation)', () => {
      const data = { field: 'value' };

      const errors = service.testValidate(data);

      expect(errors).toBeNull();
    });

    it('should work with different data types', () => {
      expect(service.testValidate(null)).toBeNull();
      expect(service.testValidate(undefined)).toBeNull();
      expect(service.testValidate(123)).toBeNull();
      expect(service.testValidate('string')).toBeNull();
      expect(service.testValidate([])).toBeNull();
      expect(service.testValidate({})).toBeNull();
    });
  });

  describe('default logger', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleDebugSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleDebugSpy.mockRestore();
    });

    it('should use default logger when none provided', async () => {
      const defaultService = new TestService();
      const operation = jest.fn().mockResolvedValue('data');

      await defaultService.testExecuteOperation(operation, 'test');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log info messages with default logger', () => {
      const defaultService = new TestService();
      const logger = defaultService['logger'];

      logger.info('Test message', { meta: 'data' });

      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test message', { meta: 'data' });
    });

    it('should log error messages with default logger', () => {
      const defaultService = new TestService();
      const logger = defaultService['logger'];
      const error = new Error('Test error');

      logger.error('Error occurred', error, { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error occurred', 'Test error', {
        context: 'test',
      });
    });

    it('should log warn messages with default logger', () => {
      const defaultService = new TestService();
      const logger = defaultService['logger'];

      logger.warn('Warning message', { level: 'low' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning message', { level: 'low' });
    });

    it('should log debug messages in non-production with default logger', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const defaultService = new TestService();
      const logger = defaultService['logger'];

      logger.debug('Debug message', { detail: 'info' });

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Debug message', { detail: 'info' });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug messages in production with default logger', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const defaultService = new TestService();
      const logger = defaultService['logger'];

      logger.debug('Debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('integration scenarios', () => {
    it('should handle nested async operations', async () => {
      const nestedOperation = jest.fn().mockResolvedValue('nested');
      const mainOperation = jest.fn().mockImplementation(async () => {
        const result = await nestedOperation();
        return `main-${result}`;
      });

      const result = await service.testExecuteOperation(mainOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('main-nested');
      expect(nestedOperation).toHaveBeenCalledTimes(1);
      expect(mainOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle operations that return null or undefined', async () => {
      const nullOperation = jest.fn().mockResolvedValue(null);
      const undefinedOperation = jest.fn().mockResolvedValue(undefined);

      const nullResult = await service.testExecuteOperation(nullOperation);
      const undefinedResult = await service.testExecuteOperation(undefinedOperation);

      expect(nullResult.success).toBe(true);
      expect(nullResult.data).toBeNull();

      expect(undefinedResult.success).toBe(true);
      expect(undefinedResult.data).toBeUndefined();
    });

    it('should handle operations that return complex objects', async () => {
      const complexData = {
        id: 1,
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        date: new Date('2025-01-01'),
      };
      const operation = jest.fn().mockResolvedValue(complexData);

      const result = await service.testExecuteOperation(operation);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(complexData);
    });
  });
});
