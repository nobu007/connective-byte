/**
 * BaseController Tests
 * Comprehensive tests for BaseController validation and error handling
 */

import { Request, Response } from 'express';
import { BaseController } from '../BaseController';
import { Logger, ValidationError } from '../../types';

// Mock logger
const mockLogger: Logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Test controller implementation
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

  public testHandleError(error: unknown, req: Request, res: Response): void {
    this.handleError(error, req, res);
  }

  public testValidateBody<T>(
    req: Request,
    res: Response,
    validationFn: (data: T) => ValidationError[] | null
  ): boolean {
    return this.validateBody(req, res, validationFn);
  }

  public testValidateQuery<T>(
    req: Request,
    res: Response,
    validationFn: (data: T) => ValidationError[] | null
  ): boolean {
    return this.validateQuery(req, res, validationFn);
  }

  public testValidateParams<T>(
    req: Request,
    res: Response,
    validationFn: (data: T) => ValidationError[] | null
  ): boolean {
    return this.validateParams(req, res, validationFn);
  }

  public testLogRequest(req: Request): void {
    this.logRequest(req);
  }

  public testCreateValidator() {
    return this.createValidator();
  }
}

// Mock Express request and response
const createMockRequest = (overrides?: Partial<Request>): Request => {
  return {
    method: 'GET',
    path: '/test',
    query: {},
    body: {},
    params: {},
    ip: '127.0.0.1',
    get: jest.fn((header: string) => {
      if (header === 'user-agent') return 'test-agent';
      return undefined;
    }),
    ...overrides,
  } as unknown as Request;
};

const createMockResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

describe('BaseController', () => {
  let controller: TestController;
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TestController(mockLogger);
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('sendSuccess', () => {
    it('should send success response with default status code 200', () => {
      const data = { message: 'Success' };
      controller.testSendSuccess(res, data);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data,
          timestamp: expect.any(String),
        })
      );
    });

    it('should send success response with custom status code', () => {
      const data = { id: 1 };
      controller.testSendSuccess(res, data, 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data,
        })
      );
    });
  });

  describe('sendError', () => {
    it('should send error response with default status code 500', () => {
      const message = 'Internal error';
      controller.testSendError(res, message);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message,
          timestamp: expect.any(String),
        })
      );
    });

    it('should send error response with validation errors', () => {
      const message = 'Validation failed';
      const errors: ValidationError[] = [{ field: 'email', message: 'Invalid email' }];
      controller.testSendError(res, message, 400, errors);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message,
          errors,
        })
      );
    });
  });

  describe('validateBody', () => {
    it('should return true for valid body', () => {
      req.body = { email: 'test@example.com' };
      const validationFn = jest.fn().mockReturnValue(null);

      const result = controller.testValidateBody(req, res, validationFn);

      expect(result).toBe(true);
      expect(validationFn).toHaveBeenCalledWith(req.body);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return false and send error for invalid body', () => {
      req.body = { email: 'invalid' };
      const errors: ValidationError[] = [{ field: 'email', message: 'Invalid email' }];
      const validationFn = jest.fn().mockReturnValue(errors);

      const result = controller.testValidateBody(req, res, validationFn);

      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Validation failed',
          errors,
        })
      );
    });
  });

  describe('validateQuery', () => {
    it('should return true for valid query', () => {
      req.query = { page: '1' };
      const validationFn = jest.fn().mockReturnValue(null);

      const result = controller.testValidateQuery(req, res, validationFn);

      expect(result).toBe(true);
      expect(validationFn).toHaveBeenCalledWith(req.query);
    });

    it('should return false and send error for invalid query', () => {
      req.query = { page: 'invalid' };
      const errors: ValidationError[] = [{ field: 'page', message: 'Must be a number' }];
      const validationFn = jest.fn().mockReturnValue(errors);

      const result = controller.testValidateQuery(req, res, validationFn);

      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateParams', () => {
    it('should return true for valid params', () => {
      req.params = { id: '123' };
      const validationFn = jest.fn().mockReturnValue(null);

      const result = controller.testValidateParams(req, res, validationFn);

      expect(result).toBe(true);
    });

    it('should return false and send error for invalid params', () => {
      req.params = { id: 'abc' };
      const errors: ValidationError[] = [{ field: 'id', message: 'Must be a number' }];
      const validationFn = jest.fn().mockReturnValue(errors);

      const result = controller.testValidateParams(req, res, validationFn);

      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      controller.testHandleError(error, req, res);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should map validation errors to 400', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      controller.testHandleError(error, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should map unauthorized errors to 401', () => {
      const error = new Error('Unauthorized');
      error.name = 'UnauthorizedError';
      controller.testHandleError(error, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should map not found errors to 404', () => {
      const error = new Error('Not found');
      error.name = 'NotFoundError';
      controller.testHandleError(error, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should sanitize sensitive data in logs', () => {
      req.body = { email: 'test@example.com', password: 'secret123' };
      const error = new Error('Test error');
      controller.testHandleError(error, req, res);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          body: expect.objectContaining({
            password: '***REDACTED***',
          }),
        })
      );
    });
  });

  describe('logRequest', () => {
    it('should log request details', () => {
      controller.testLogRequest(req);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Incoming request'),
        expect.objectContaining({
          method: 'GET',
          path: '/test',
          ip: '127.0.0.1',
        })
      );
    });

    it('should increment request count', () => {
      controller.testLogRequest(req);
      controller.testLogRequest(req);

      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          requestId: 2,
        })
      );
    });
  });

  describe('createValidator', () => {
    it('should create ValidationBuilder instance', () => {
      const validator = controller.testCreateValidator();
      expect(validator).toBeDefined();
      expect(typeof validator.required).toBe('function');
      expect(typeof validator.build).toBe('function');
    });
  });
});
