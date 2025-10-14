/**
 * Health Controller
 * Handles HTTP requests for health check endpoints
 * Following clean architecture - controller layer handles request/response
 */

import { Request, Response } from 'express';
import { getHealthStatus, isHealthy } from '../services/healthService';

/**
 * Handle health check request
 * @param req - Express request object
 * @param res - Express response object
 */
export function handleHealthCheck(req: Request, res: Response): void {
  try {
    if (!isHealthy()) {
      res.status(503).json({
        status: 'error',
        message: 'Service unavailable',
      });
      return;
    }

    const healthStatus = getHealthStatus();
    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

/**
 * Handle root endpoint request
 * @param req - Express request object
 * @param res - Express response object
 */
export function handleRoot(req: Request, res: Response): void {
  res.send('Hello from backend!');
}
