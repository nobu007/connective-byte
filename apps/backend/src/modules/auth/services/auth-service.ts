/**
 * Authentication Service
 * Core business logic for user authentication
 */

import { UserRepository, User, UserRole } from '../interfaces/user-repository';
import { EmailService } from '../interfaces/email-service';
import { hashPassword, verifyPassword } from '../../../common/utils/password';
import { generateToken } from '../../../middleware/auth';
import crypto from 'crypto';

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    isVerified: boolean;
  };
  tokens: AuthTokens;
}

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  /**
   * Validate password strength (spec requirements)
   */
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    // Validate email
    if (!this.validateEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Check for existing email (generic error for security)
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Registration failed');
    }

    // Hash password (12 rounds per spec)
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      role: 'learner', // Default role per spec
      isVerified: false, // Email verification required
    });

    // Send verification email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.emailService.sendVerificationEmail(user.email, verificationToken);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      // Generic error (don't reveal if email exists)
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await verifyPassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    // 保存時と同じSHA-256でハッシュして照合（bcryptはソルトが毎回変わるため検索不可能）
    const tokenHash = this.hashRefreshToken(refreshToken);
    const stored = await this.userRepository.findRefreshToken(tokenHash);
    if (!stored) {
      throw new Error('Invalid refresh token');
    }

    const user = await this.userRepository.findById(stored.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new access token
    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    // Access token (1 hour)
    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Refresh token (30 days)
    const refreshTokenRaw = crypto.randomBytes(32).toString('hex');
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);

    await this.userRepository.storeRefreshToken(
      this.hashRefreshToken(refreshTokenRaw),
      user.id,
      refreshTokenExpiry
    );

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
    };
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.userRepository.removeRefreshToken(this.hashRefreshToken(refreshToken));
  }

  /**
   * リフレッシュトークンは256bitの高エントロピー乱数なので、
   * 保存・照合にはSHA-256で十分（bcryptは毎回ソルトが変わり照合不能）
   */
  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    // In real implementation, verify token from database
    // For now, this is a stub that would update user.isVerified
    throw new Error('Email verification not fully implemented');
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // In real implementation, verify token and update password
    throw new Error('Password reset not fully implemented');
  }
}
