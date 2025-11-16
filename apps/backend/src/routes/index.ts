/**
 * Routes Index
 * Centralizes all route definitions
 * Following single responsibility - manages route registration
 */

import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
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
router.use(authRoutes);

export default router;
