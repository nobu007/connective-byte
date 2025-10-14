/**
 * Routes Index
 * Centralizes all route definitions
 * Following single responsibility - manages route registration
 */

import { Router } from 'express';
import healthRoutes from './healthRoutes';
import { handleRoot } from '../controllers/healthController';

const router = Router();

/**
 * Root route
 */
router.get('/', handleRoot);

/**
 * Register all application routes
 */
router.use(healthRoutes);

export default router;
