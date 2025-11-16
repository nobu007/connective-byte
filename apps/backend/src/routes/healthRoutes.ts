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
 * GET /api/health
 * Returns the current health status of the application
 * Rate limited to prevent abuse
 */
router.get('/api/health', healthCheckLimiter, handleHealthCheck);

export default router;
