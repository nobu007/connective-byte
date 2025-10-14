/**
 * BaseController Unit Tests
 * Comprehensive tests for the base controller class
 * Tests request handling, response formatting, and error handling
 */

import { Request, Response } from 'express';
import { BaseController } from '../BaseController';
import { Logger, ValidationError } from '../../types';

// Test implementation of BaseController
class TestController extends BaseController {
  constructor(logger?: Logger) {
    super('TestController', logger);
  }

  // Expose protected methods for testing
  public testSendSuccess<T>(res: Response, data: T, statusCode?: number): void {
    this.sendSuccess(res, data, statusCode);
  }

  public testSendError(
    res: Response,
    message: string,
    statusCode?: number,
    errors?: ValidationError[]
  ): void {
    this.sendError(res, message, statusCode, errors);
  }

  public async testExecuteAction(
    req: Request,
    res: Response,
    action: (req: Request, res: Response) => Promise<void>
  ): Promise<void> {
    return this.executeAction(req, res, action);
  }

  public testHandleError(error: unknown, req: Request, res: Response): void {
    this.handleError(error, req, res);
  }

  public testValidateRequest<T>(
    data: T,
    validationFn: (data: T) => ValidationError[] | null
  ): ValidationError[] | null {
    return this.validateRequest(data, validationFn);
  }

  public testGetStatusCodeFromError(error: Error): number {
    return this.getStatusCodeFromError(error);
  }
}

// Mock Express request and response
function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'GET',
    path: '/test',
    query: {},
    params: {},
    body: {},
    ...overrides,
  } as Partial<Request>;
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('BaseController', () => {
  let mockLogger: Logger;
  let controller: TestController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    controller = new TestController(mockLogger);
    mockReq = createMockRequest();
    mockRes = createMockResponse();
  });

  describe('constructor', () => {
    it('should create controller with provided logger', () => {
      expect(controller).toBeDefined();
      expect(controller['logger']).toBe(mockLogger);
      expect(controller['controllerName']).toBe('TestController');
    });

    it('should create controller with default logger if none provided', () => {
      const defaultController = new TestController();
      expect(defaultController).toBeDefined();
      expect(defaultController['logger']).toBeDefined();
    });
  });

  describe('sendSuccess', () => {
    it('should send success response with default status code 200', () => {
      const data = { id: 1, name: 'Test' };

      controller.testSendSuccess(mockRes as Response, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data,
        timestamp: expect.any(String),
      });
    });

    it('should send success response with custom status code', () => {
      const data = { created: true };

      controller.testSendSuccess(mockRes as Response, data, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data,
        })
      );
    });

    it('should include ISO timestamp in response', () => {
      const data = { test: 'data' };

      controller.testSendSuccess(mockRes as Response, data);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(new Date(jsonCall.timestamp).toISOString()).toBe(jsonCall.timestamp);
    });

    it('should handle null data', () => {
      controller.testSendSuccess(mockRes as Response, null);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: null,
        })
      );
    });

    it('should handle complex nested data', () => {
      const complexData = {
        user: { id: 1, profile: { name: 'Test' } },
        items: [{ id: 1 }, { id: 2 }],
      };

      controller.testSendSuccess(mockRes as Response, complexData);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: complexData,
        })
      );
    });
  });

  describe('sendError', () => {
    it('should send error response with default status code 500', () => {
      const message = 'Internal error';

      controller.testSendError(mockRes as Response, message);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message,
        timestamp: expect.any(String),
      });
    });

    it('should send error response with custom status code', () => {
      const message = 'Not found';

      controller.testSendError(mockRes as Response, message, 404);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message,
        })
      );
    });

    it('should include validation errors in response', () => {
      const message = 'Validation failed';
      const errors: ValidationError[] = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];

      controller.testSendError(mockRes as Response, message, 400, errors);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message,
          errors,
        })
      );
    });

    it('should include ISO timestamp in error response', () => {
      controller.testSendError(mockRes as Response, 'Error');

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('executeAction', () => {
    it('should execute action successfully', async () => {
      const action = jest.fn().mockResolvedValue(undefined);

      await controller.testExecuteAction(
        mockReq as Request,
        mockRes as Response,
        action
      );

      expect(action).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should handle action errors and call handleError', async () => {
      const error = new Error('Action failed');
      const action = jest.fn().mockRejectedValue(error);

      await controller.testExecuteAction(
        mockReq as Request,
        mockRes as Response,
        action
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error handling GET /test'),
        error,
        expect.objectContaining({
          method: 'GET',
          path: '/test',
        })
      );

      expect(mockRes.status).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should pass request and response to action', async () => {
      const action = jest.fn().mockImplementation(async (req, res) => {
        expect(req).toBe(mockReq);
        expect(res).toBe(mockRes);
      });

      await controller.testExecuteAction(
        mockReq as Request,
        mockRes as Response,
        action
      );
    });
  });

  describe('handleError', () => {
    beforeEach(() => {
      mockReq = createMockRequest({
        method: 'POST',
        path: '/api/users',
        query: { filter: 'active' },
      });
    });

    it('should handle Error instances', () => {
      const error = new Error('Test error');

      controller.testHandleError(error, mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'TestController: Error handling POST /api/users',
        error,
        {
          method: 'POST',
          path: '/api/users',
          query: { filter: 'active' },
        }
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle non-Error exceptions', () => {
      const error = 'string error';

      controller.testHandleError(error, mockReq as Request, mockRes as Response);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: 'string error',
        }),
        expect.any(Object)
      );
    });

    it('should use production-safe error messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Sensitive error details');

      controller.testHandleError(error, mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.message).toBe('Internal server error');

      process.env.NODE_ENV = originalEnv;
    });

    it('should show detailed error messages in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Detailed error');

      controller.testHandleError(error, mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.message).toBe('Detailed error');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateRequest', () => {
    it('should return validation errors when validation fails', () => {
      const data = { email: 'invalid' };
      const errors: ValidationError[] = [
        { field: 'email', message: 'Invalid format' },
      ];
      const validationFn = jest.fn().mockReturnValue(errors);

      const result = controller.testValidateRequest(data, validationFn);

      expect(result).toEqual(errors);
      expect(validationFn).toHaveBeenCalledWith(data);
    });

    it('should return null when validation passes', () => {
      const data = { email: 'valid@example.com' };
      const validationFn = jest.fn().mockReturnValue(null);

      const result = controller.testValidateRequest(data, validationFn);

      expect(result).toBeNull();
      expect(validationFn).toHaveBeenCalledWith(data);
    });

    it('should handle validation function errors', () => {
      const data = { test: 'data' };
      const validationFn = jest.fn().mockImplementation(() => {
        throw new Error('Validation function crashed');
      });

      const result = controller.testValidateRequest(data, validationFn);

      expect(result).toEqual([
        {
          field: 'unknown',
          message: 'Validation failed',
        },
      ]);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'TestController: Validation error',
        expect.any(Error)
      );
    });
  });

  describe('getStatusCodeFromError', () => {
    it('should return 400 for validation errors', () => {
      const error = new Error('Invalid input');
      error.name = 'ValidationError';

      expect(controller.testGetStatusCodeFromError(error)).toBe(400);
    });

    it('should return 401 for unauthorized errors', () => {
      const error = new Error('Not authenticated');
      error.name = 'UnauthorizedError';

      expect(controller.testGetStatusCodeFromError(error)).toBe(401);
    });

    it('should return 403 for forbidden errors', () => {
      const error = new Error('Access denied');
      error.name = 'ForbiddenError';

      expect(controller.testGetStatusCodeFromError(error)).toBe(403);
    });

    it('should return 404 for not found errors', () => {
      const error = new Error('Resource not found');
      error.name = 'NotFoundError';

      expect(controller.testGetStatusCodeFromError(error)).toBe(404);
    });

    it('should return 409 for conflict errors', () => {
      const error = new Error('Duplicate entry');
      error.name = 'ConflictError';

      expect(controller.testGetStatusCodeFromError(error)).toBe(409);
    });

    it('should return 503 for unavailable errors', () => {
      const error = new Error('Service down');
      error.name = 'ServiceUnavailableError';

      expect(controller.testGetStatusCodeFromError(error)).toBe(503);
    });

    it('should return 500 for unknown errors', () => {
      const error = new Error('Unknown error');
      error.name = 'CustomError';

      expect(controller.testGetStatusCodeFromError(error)).toBe(500);
    });

    it('should be case-insensitive', () => {
      const error1 = new Error('Error');
      error1.name = 'validationerror';
      expect(controller.testGetStatusCodeFromError(error1)).toBe(400);

      const error2 = new Error('Error');
      error2.name = 'VALIDATIONERROR';
      expect(controller.testGetStatusCodeFromError(error2)).toBe(400);
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

    it('should use default logger when none provided', () => {
      const defaultController = new TestController();
      const logger = defaultController['logger'];

      logger.info('Test');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      const defaultController = new TestController();
      const logger = defaultController['logger'];

      logger.info('Info message', { data: 'test' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] Info message',
        { data: 'test' }
      );
    });

    it('should log error messages', () => {
      const defaultController = new TestController();
      const logger = defaultController['logger'];
      const error = new Error('Test error');

      logger.error('Error message', error, { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] Error message',
        'Test error',
        { context: 'test' }
      );
    });

    it('should log warnings', () => {
      const defaultController = new TestController();
      const logger = defaultController['logger'];

      logger.warn('Warning');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning', '');
    });

    it('should log debug in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const defaultController = new TestController();
      const logger = defaultController['logger'];

      logger.debug('Debug info');

      expect(consoleDebugSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const defaultController = new TestController();
      const logger = defaultController['logger'];

      logger.debug('Debug info');

      expect(consoleDebugSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('integration scenarios', () => {
    it('should handle full request-response cycle', async () => {
      const action = jest.fn().mockImplementation(async (req, res) => {
        controller.testSendSuccess(res, { message: 'Success' }, 200);
      });

      await controller.testExecuteAction(
        mockReq as Request,
        mockRes as Response,
        action
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { message: 'Success' },
        })
      );
    });

    it('should handle validation and error response', async () => {
      const data = { email: 'invalid' };
      const validationFn = jest.fn().mockReturnValue([
        { field: 'email', message: 'Invalid' },
      ]);

      const errors = controller.testValidateRequest(data, validationFn);

      if (errors) {
        controller.testSendError(mockRes as Response, 'Validation failed', 400, errors);
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Validation failed',
          errors,
        })
      );
    });
  });
});
