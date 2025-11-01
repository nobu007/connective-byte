/**
 * Health Controller
 * Handles HTTP requests for health check endpoints
 * Following clean architecture - controller layer handles request/response
 * Extended with BaseController for consistent response formatting
 */

import { Request, Response } from 'express';
import { BaseController } from '../common/base/BaseController';
import { healthService } from '../services/healthService';
import { loggingService } from '../services/loggingService';

/**
 * Enhanced Health Controller using BaseController
 * Provides consistent response formatting and error handling
 * Uses centralized logging service for structured logging
 */
class HealthController extends BaseController {
  constructor() {
    // Use centralized logging service
    super('HealthController', loggingService.createLogger('HealthController'));
  }

  /**
   * Handle health check request
   * @param req - Express request object
   * @param res - Express response object
   */
  public async handleHealthCheck(req: Request, res: Response): Promise<void> {
    await this.executeAction(req, res, async (req, res) => {
      const result = await healthService.getHealthStatus();

      if (!result.success || !result.data) {
        this.sendError(res, 'Failed to retrieve health status', 503);
        return;
      }

      const healthStatus = result.data;

      // Return 503 if any health check failed
      if (healthStatus.status === 'error') {
        this.sendSuccess(res, healthStatus, 503);
        return;
      }

      // Return 200 for healthy status
      this.sendSuccess(res, healthStatus, 200);
    });
  }

  /**
   * Handle root endpoint request
   * @param req - Express request object
   * @param res - Express response object
   */
  public handleRoot(req: Request, res: Response): void {
    this.sendSuccess(res, {
      message: 'Hello from backend!',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
      },
    });
  }
}

// Export singleton instance
const healthController = new HealthController();

// Export bound methods for Express route compatibility
export const handleHealthCheck = healthController.handleHealthCheck.bind(healthController);
export const handleRoot = healthController.handleRoot.bind(healthController);
