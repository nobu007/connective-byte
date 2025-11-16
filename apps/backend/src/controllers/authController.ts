import { Request, Response } from 'express';
import { BaseController } from '../common/base/BaseController';
import { generateToken } from '../middleware/auth';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../common/utils/password';

/**
 * Authentication Controller
 * Handles user authentication and authorization
 */
class AuthController extends BaseController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    await this.executeAction(req, res, async () => {
      const { email, password, name } = req.body;

      // Validate input
      const validation = this.validateInput({ email, password, name });
      if (validation.length > 0) {
        this.sendError(res, validation.join(', '), 400);
        return;
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        this.sendError(res, passwordValidation.errors.join(', '), 400);
        return;
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // In production, save user to database
      // For now, just return success
      const user = {
        id: Math.random().toString(36).substring(7),
        email,
        name,
        role: 'user',
      };

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      this.sendSuccess(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        },
        201
      );
    });
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    await this.executeAction(req, res, async () => {
      const { email, password } = req.body;

      // Validate input
      const validation = this.validateInput({ email, password });
      if (validation.length > 0) {
        this.sendError(res, validation.join(', '), 400);
        return;
      }

      // In production, fetch user from database
      // For demo purposes, use a mock user
      const mockUser = {
        id: 'demo-user-id',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'user',
        passwordHash: await hashPassword('Demo123!'), // Demo password
      };

      // Verify credentials
      if (email !== mockUser.email) {
        this.sendError(res, 'Invalid credentials', 401);
        return;
      }

      const isValidPassword = await verifyPassword(password, mockUser.passwordHash);
      if (!isValidPassword) {
        this.sendError(res, 'Invalid credentials', 401);
        return;
      }

      // Generate token
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      this.sendSuccess(res, {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
        token,
      });
    });
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    await this.executeAction(req, res, async () => {
      if (!req.user) {
        this.sendError(res, 'Unauthorized', 401);
        return;
      }

      // In production, fetch full user profile from database
      this.sendSuccess(res, {
        user: req.user,
      });
    });
  }

  /**
   * Refresh token
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    await this.executeAction(req, res, async () => {
      if (!req.user) {
        this.sendError(res, 'Unauthorized', 401);
        return;
      }

      // Generate new token
      const token = generateToken({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      });

      this.sendSuccess(res, { token });
    });
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    await this.executeAction(req, res, async () => {
      // In production with refresh tokens, invalidate the token in database
      // For JWT, client-side removal is sufficient
      this.sendSuccess(res, {
        message: 'Logged out successfully',
      });
    });
  }
}

// Export controller instance
const authController = new AuthController('AuthController');

export const handleRegister = authController.register.bind(authController);
export const handleLogin = authController.login.bind(authController);
export const handleGetProfile = authController.getProfile.bind(authController);
export const handleRefreshToken = authController.refreshToken.bind(authController);
export const handleLogout = authController.logout.bind(authController);
