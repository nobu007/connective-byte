/**
 * Authentication Routes
 * Defines routes for authentication endpoints
 */

import { Router } from 'express';
import {
  handleRegister,
  handleLogin,
  handleGetProfile,
  handleRefreshToken,
  handleLogout,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 * Rate limited to prevent abuse
 */
router.post('/api/auth/register', authLimiter, handleRegister);

/**
 * POST /api/auth/login
 * Login user and get JWT token
 * Rate limited to prevent brute force attacks
 */
router.post('/api/auth/login', authLimiter, handleLogin);

/**
 * GET /api/auth/me
 * Get current user profile
 * Requires authentication
 */
router.get('/api/auth/me', authenticate, handleGetProfile);

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 * Requires authentication
 */
router.post('/api/auth/refresh', authenticate, handleRefreshToken);

/**
 * POST /api/auth/logout
 * Logout user
 * Requires authentication
 */
router.post('/api/auth/logout', authenticate, handleLogout);

export default router;
