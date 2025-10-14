/**
 * Health Routes
 * Defines routes for health check endpoints
 * Following clean architecture - route layer defines HTTP endpoints
 */

import { Router } from 'express';
import { handleHealthCheck } from '../controllers/healthController';

const router = Router();

/**
 * GET /api/health
 * Returns the current health status of the application
 */
router.get('/api/health', handleHealthCheck);

export default router;
