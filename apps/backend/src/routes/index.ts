/**
 * Routes Index
 * Centralizes all route definitions
 * Following single responsibility - manages route registration
 */

import { Router } from 'express';
import healthRoutes from './healthRoutes';

const router = Router();

/**
 * Register all application routes
 */
router.use(healthRoutes);

export default router;
