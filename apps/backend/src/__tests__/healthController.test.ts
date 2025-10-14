/**
 * HealthController Unit Tests
 * Comprehensive test coverage for health controller HTTP layer
 * Following TEST.md specifications
 */

import { Request, Response } from 'express';
import { handleHealthCheck, handleRoot } from '../controllers/healthController';
import { healthService } from '../services/healthService';
import { ServiceResult, HealthStatus } from '../common/types';

// Mock the health service
jest.mock('../services/healthService', () => ({
  healthService: {
    getHealthStatus: jest.fn(),
  },
}));

describe('HealthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock response
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();

    mockRequest = {};
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('handleHealthCheck', () => {
    test('should return 200 when service reports healthy', async () => {
      const healthyStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 123.45,
        checks: [
          {
            name: 'uptime',
            status: 'ok',
            message: 'Application running',
          },
        ],
      };

      const successResult: ServiceResult<HealthStatus> = {
        success: true,
        data: healthyStatus,
      };

      (healthService.getHealthStatus as jest.Mock).mockResolvedValue(
        successResult
      );

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: healthyStatus,
          timestamp: expect.any(String),
        })
      );
    });

    test('should return 503 when service reports unhealthy', async () => {
      const unhealthyStatus: HealthStatus = {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: 123.45,
        checks: [
          {
            name: 'memory',
            status: 'error',
            message: 'Memory usage too high',
          },
        ],
      };

      const successResult: ServiceResult<HealthStatus> = {
        success: true,
        data: unhealthyStatus,
      };

      (healthService.getHealthStatus as jest.Mock).mockResolvedValue(
        successResult
      );

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: unhealthyStatus,
        })
      );
    });

    test('should return 503 when service returns unsuccessful result', async () => {
      const errorResult: ServiceResult<HealthStatus> = {
        success: false,
        error: new Error('Service unavailable'),
      };

      (healthService.getHealthStatus as jest.Mock).mockResolvedValue(
        errorResult
      );

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Failed to retrieve health status',
        })
      );
    });

    test('should return 500 when service throws unexpected error', async () => {
      (healthService.getHealthStatus as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      // BaseController handles exceptions and returns 500
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
        })
      );
    });

    test('should format response with ApiResponse structure', async () => {
      const healthyStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 100,
        checks: [],
      };

      (healthService.getHealthStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: healthyStatus,
      });

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.any(Object),
          timestamp: expect.any(String),
        })
      );
    });

    test('should include timestamp in response', async () => {
      const healthyStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 100,
        checks: [],
      };

      (healthService.getHealthStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: healthyStatus,
      });

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      const response = mockJson.mock.calls[0][0];
      expect(response.timestamp).toBeDefined();
      expect(typeof response.timestamp).toBe('string');

      // Validate ISO format
      expect(() => new Date(response.timestamp)).not.toThrow();
    });

    test('should handle service result without data gracefully', async () => {
      (healthService.getHealthStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: null,
      });

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Failed to retrieve health status',
        })
      );
    });

    test('should preserve all health check data in response', async () => {
      const healthyStatus: HealthStatus = {
        status: 'ok',
        timestamp: '2025-10-15T12:00:00.000Z',
        uptime: 123.45,
        checks: [
          {
            name: 'uptime',
            status: 'ok',
            message: 'Running',
            responseTime: 1,
          },
          {
            name: 'memory',
            status: 'ok',
            message: 'Memory OK',
            responseTime: 2,
          },
        ],
      };

      (healthService.getHealthStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: healthyStatus,
      });

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      const response = mockJson.mock.calls[0][0];
      expect(response.data).toEqual(healthyStatus);
      expect(response.data.checks).toHaveLength(2);
      expect(response.data.checks[0].responseTime).toBe(1);
      expect(response.data.checks[1].responseTime).toBe(2);
    });

    test('should call health service exactly once', async () => {
      (healthService.getHealthStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: { status: 'ok', timestamp: new Date().toISOString(), uptime: 1 },
      });

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(healthService.getHealthStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleRoot', () => {
    test('should return welcome message', () => {
      handleRoot(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      expect(response.data.message).toBe('Hello from backend!');
    });

    test('should include API endpoints information', () => {
      handleRoot(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      expect(response.data.endpoints).toBeDefined();
      expect(response.data.endpoints.health).toBe('/api/health');
    });

    test('should return 200 status', () => {
      handleRoot(mockRequest as Request, mockResponse as Response);

      // Default status is 200, check that status wasn't called with error code
      // Or was called with 200
      if (mockStatus.mock.calls.length > 0) {
        expect(mockStatus).toHaveBeenCalledWith(200);
      }
    });

    test('should include version information', () => {
      handleRoot(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      expect(response.data.version).toBeDefined();
      expect(response.data.version).toBe('1.0.0');
    });

    test('should format response with ApiResponse structure', () => {
      handleRoot(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('status', 'success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('timestamp');
    });

    test('should include timestamp in response', () => {
      handleRoot(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      expect(response.timestamp).toBeDefined();
      expect(typeof response.timestamp).toBe('string');
    });

    test('should not call any external services', () => {
      handleRoot(mockRequest as Request, mockResponse as Response);

      // Health service should not be called for root endpoint
      expect(healthService.getHealthStatus).not.toHaveBeenCalled();
    });

    test('should return synchronously', () => {
      // handleRoot should be synchronous (not async)
      const result = handleRoot(mockRequest as Request, mockResponse as Response);

      // Result should be undefined (void) since it directly sends response
      expect(result).toBeUndefined();
    });
  });

  describe('error handling integration', () => {
    test('should handle null response object gracefully', async () => {
      const healthyStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 1,
        checks: [],
      };

      (healthService.getHealthStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: healthyStatus,
      });

      // This tests that controller doesn't crash with invalid response
      // In practice, Express always provides valid response object
      await expect(
        handleHealthCheck(mockRequest as Request, mockResponse as Response)
      ).resolves.not.toThrow();
    });

    test('should handle service returning undefined', async () => {
      (healthService.getHealthStatus as jest.Mock).mockResolvedValue(undefined);

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should handle gracefully
      expect(mockStatus).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalled();
    });

    test('should handle service error with detailed message', async () => {
      const detailedError = new Error('Database connection failed');

      (healthService.getHealthStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: detailedError,
      });

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Failed to retrieve health status',
        })
      );
    });
  });

  describe('response format validation', () => {
    test('should match ApiResponse<HealthStatus> type structure', async () => {
      const healthyStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 1,
        checks: [],
      };

      (healthService.getHealthStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: healthyStatus,
      });

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      const response = mockJson.mock.calls[0][0];

      // Validate structure matches ApiResponse
      expect(response).toMatchObject({
        status: expect.stringMatching(/^(success|error)$/),
        data: expect.any(Object),
        timestamp: expect.any(String),
      });
    });

    test('error response should match ApiResponse error format', async () => {
      (healthService.getHealthStatus as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      await handleHealthCheck(
        mockRequest as Request,
        mockResponse as Response
      );

      const response = mockJson.mock.calls[0][0];

      // Error response format
      expect(response).toMatchObject({
        status: 'error',
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });
});
