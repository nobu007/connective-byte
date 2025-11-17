/**
 * Health Routes
 * Defines routes for health check endpoints
 * Following clean architecture - route layer defines HTTP endpoints
 */

import { Router } from 'express';
import { handleHealthCheck } from '../controllers/healthController';
import { healthCheckLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Get system health status
 *     description: Returns the current health status of the application including uptime, memory usage, and registered health checks
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/api/health', healthCheckLimiter, handleHealthCheck);

export default router;
