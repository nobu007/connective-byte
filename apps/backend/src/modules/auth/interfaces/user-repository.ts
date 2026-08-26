/**
 * User Repository Interface
 * Abstracts user data storage for swappable implementations
 */

export type UserRole = 'learner' | 'content_administrator' | 'system_admin';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshToken {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface EmailVerificationToken {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

export interface PasswordResetToken {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

export interface UserRepository {
  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Create new user
   */
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;

  /**
   * Update user
   */
  update(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null>;

  /**
   * Store refresh token (hashed)
   */
  storeRefreshToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;

  /**
   * Find refresh token by hash
   */
  findRefreshToken(tokenHash: string): Promise<RefreshToken | null>;

  /**
   * Remove refresh token
   */
  removeRefreshToken(tokenHash: string): Promise<void>;

  /**
   * Remove all refresh tokens for user
   */
  removeAllRefreshTokensForUser(userId: string): Promise<void>;

  /**
   * Clean expired refresh tokens
   */
  cleanExpiredTokens(): Promise<void>;

  /**
   * Store email verification token (hashed, 24h expiry per spec)
   */
  storeEmailVerificationToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;

  /**
   * Find email verification token by hash (returns null if missing or expired)
   */
  findEmailVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null>;

  /**
   * Delete email verification token (after successful verification)
   */
  deleteEmailVerificationToken(tokenHash: string): Promise<void>;

  /**
   * Store password reset token (hashed, 1h expiry per spec)
   */
  storePasswordResetToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;

  /**
   * Find password reset token by hash (returns null if missing or expired)
   */
  findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null>;

  /**
   * Delete all password reset tokens for user (after successful reset)
   */
  deletePasswordResetTokensForUser(userId: string): Promise<void>;
}
