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
}
