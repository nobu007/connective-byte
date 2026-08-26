/**
 * Auth Service Unit Tests
 * Tests core business logic for authentication
 */

// Set JWT_SECRET before importing any auth modules
process.env.JWT_SECRET = 'test-secret-key';

import { AuthService } from '../services/auth-service';
import { UserRepository, User, UserRole } from '../interfaces/user-repository';
import { EmailService } from '../interfaces/email-service';
import { hashPassword } from '../../../common/utils/password';

// Mock implementations
class MockUserRepository implements UserRepository {
  private users: User[] = [];
  private refreshTokens: Array<{ tokenHash: string; userId: string; expiresAt: string }> = [];
  private emailVerificationTokens: Array<{ tokenHash: string; userId: string; expiresAt: string }> =
    [];
  private passwordResetTokens: Array<{ tokenHash: string; userId: string; expiresAt: string }> = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      id: `user-${Date.now()}`,
      ...userData,
      email: userData.email.toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    this.users[index] = {
      ...this.users[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.users[index];
  }

  async storeRefreshToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    this.refreshTokens.push({ tokenHash, userId, expiresAt: expiresAt.toISOString() });
  }

  async findRefreshToken(
    tokenHash: string
  ): Promise<{ token: string; userId: string; expiresAt: string } | null> {
    const token = this.refreshTokens.find((t) => t.tokenHash === tokenHash);
    if (!token) return null;

    if (new Date(token.expiresAt) < new Date()) {
      await this.removeRefreshToken(tokenHash);
      return null;
    }

    return { token: token.tokenHash, userId: token.userId, expiresAt: token.expiresAt };
  }

  async removeRefreshToken(tokenHash: string): Promise<void> {
    this.refreshTokens = this.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
  }

  async removeAllRefreshTokensForUser(userId: string): Promise<void> {
    this.refreshTokens = this.refreshTokens.filter((t) => t.userId !== userId);
  }

  async cleanExpiredTokens(): Promise<void> {
    const now = new Date();
    this.refreshTokens = this.refreshTokens.filter((t) => new Date(t.expiresAt) > now);
    this.emailVerificationTokens = this.emailVerificationTokens.filter(
      (t) => new Date(t.expiresAt) > now
    );
    this.passwordResetTokens = this.passwordResetTokens.filter((t) => new Date(t.expiresAt) > now);
  }

  async storeEmailVerificationToken(
    tokenHash: string,
    userId: string,
    expiresAt: Date
  ): Promise<void> {
    this.emailVerificationTokens.push({ tokenHash, userId, expiresAt: expiresAt.toISOString() });
  }

  async findEmailVerificationToken(tokenHash: string): Promise<{
    tokenHash: string;
    userId: string;
    expiresAt: string;
  } | null> {
    const token = this.emailVerificationTokens.find((t) => t.tokenHash === tokenHash);
    if (!token) return null;

    if (new Date(token.expiresAt) < new Date()) {
      this.emailVerificationTokens = this.emailVerificationTokens.filter(
        (t) => t.tokenHash !== tokenHash
      );
      return null;
    }

    return { ...token };
  }

  async deleteEmailVerificationToken(tokenHash: string): Promise<void> {
    this.emailVerificationTokens = this.emailVerificationTokens.filter(
      (t) => t.tokenHash !== tokenHash
    );
  }

  async storePasswordResetToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    this.passwordResetTokens.push({ tokenHash, userId, expiresAt: expiresAt.toISOString() });
  }

  async findPasswordResetToken(tokenHash: string): Promise<{
    tokenHash: string;
    userId: string;
    expiresAt: string;
  } | null> {
    const token = this.passwordResetTokens.find((t) => t.tokenHash === tokenHash);
    if (!token) return null;

    if (new Date(token.expiresAt) < new Date()) {
      this.passwordResetTokens = this.passwordResetTokens.filter((t) => t.tokenHash !== tokenHash);
      return null;
    }

    return { ...token };
  }

  async deletePasswordResetTokensForUser(userId: string): Promise<void> {
    this.passwordResetTokens = this.passwordResetTokens.filter((t) => t.userId !== userId);
  }
}

class MockEmailService implements EmailService {
  sentEmails: Array<{ type: string; email: string; token: string }> = [];

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    this.sentEmails.push({ type: 'verification', email, token });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    this.sentEmails.push({ type: 'reset', email, token });
  }

  async sendPasswordChangedNotification(email: string): Promise<void> {
    this.sentEmails.push({ type: 'password_changed', email, token: '' });
  }
}

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: MockUserRepository;
  let mockEmailService: MockEmailService;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    mockEmailService = new MockEmailService();
    authService = new AuthService(mockUserRepository, mockEmailService);
  });

  describe('validatePassword', () => {
    it('should accept valid password', () => {
      const result = authService.validatePassword('SecurePass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password less than 8 characters', () => {
      const result = authService.validatePassword('Sec123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = authService.validatePassword('securepass123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = authService.validatePassword('SECUREPASS123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = authService.validatePassword('SecurePass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email', () => {
      expect(authService.validateEmail('user@example.com')).toBe(true);
      expect(authService.validateEmail('test.user+tag@domain.co.jp')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(authService.validateEmail('invalid')).toBe(false);
      expect(authService.validateEmail('@example.com')).toBe(false);
      expect(authService.validateEmail('user@')).toBe(false);
    });
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.fullName).toBe('Test User');
      expect(result.user.role).toBe('learner');
      expect(result.user.isVerified).toBe(false);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      expect(mockEmailService.sentEmails).toHaveLength(1);
      expect(mockEmailService.sentEmails[0].type).toBe('verification');
    });

    it('should reject invalid email format', async () => {
      await expect(
        authService.register({
          email: 'invalid-email',
          password: 'SecurePass123',
          fullName: 'Test User',
        })
      ).rejects.toThrow('Invalid email format');
    });

    it('should reject weak password', async () => {
      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'weak',
          fullName: 'Test User',
        })
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should reject duplicate email with generic error', async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'AnotherPass123',
          fullName: 'Another User',
        })
      ).rejects.toThrow('Registration failed');
    });

    it('should be case-insensitive for email duplicates', async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      await expect(
        authService.register({
          email: 'TEST@EXAMPLE.COM',
          password: 'AnotherPass123',
          fullName: 'Another User',
        })
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass123',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should reject invalid email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'SecurePass123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should be case-insensitive for email', async () => {
      const result = await authService.login({
        email: 'TEST@EXAMPLE.COM',
        password: 'SecurePass123',
      });

      expect(result.user).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token with valid refresh token', async () => {
      const registerResult = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      // リフレッシュトークンは不透明なランダム文字列（JWTではない）
      const result = await authService.refreshToken(registerResult.tokens.refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.accessToken).toBeTruthy();

      // 新しいアクセストークンはユーザー情報を含むJWTであること
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(result.accessToken);
      expect(decoded.id).toBe(registerResult.user.id);
      expect(decoded.email).toBe(registerResult.user.email);
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should reject expired token', async () => {
      const registerResult = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      // 保存済みトークンを期限切れに書き換える（SHA-256ハッシュで照合される）
      const crypto = require('crypto');
      const expiredRaw = 'expired-refresh-token-raw';
      const tokenHash = crypto.createHash('sha256').update(expiredRaw).digest('hex');
      await mockUserRepository.storeRefreshToken(
        tokenHash,
        registerResult.user.id,
        new Date(Date.now() - 1000)
      );

      await expect(authService.refreshToken(expiredRaw)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout and remove refresh token', async () => {
      const registerResult = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      const rawToken = registerResult.tokens.refreshToken;
      await authService.logout(registerResult.user.id, rawToken);

      // Verify token was removed（SHA-256ハッシュで照合）
      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const token = await mockUserRepository.findRefreshToken(tokenHash);
      expect(token).toBeNull();
    });

    it('should invalidate refresh token after logout', async () => {
      const registerResult = await authService.register({
        email: 'logout2@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      const rawToken = registerResult.tokens.refreshToken;
      await authService.logout(registerResult.user.id, rawToken);

      await expect(authService.refreshToken(rawToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('requestPasswordReset', () => {
    it('should send reset email for existing user', async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      await authService.requestPasswordReset('test@example.com');

      expect(mockEmailService.sentEmails.length).toBeGreaterThan(0);
      const resetEmail = mockEmailService.sentEmails.find((e) => e.type === 'reset');
      expect(resetEmail).toBeDefined();
      expect(resetEmail?.email).toBe('test@example.com');
      expect(resetEmail?.token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should not reveal if email exists for password reset', async () => {
      // Should not throw even if email doesn't exist
      await expect(
        authService.requestPasswordReset('nonexistent@example.com')
      ).resolves.toBeUndefined();
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email with valid token', async () => {
      const result = await authService.register({
        email: 'verify@example.com',
        password: 'SecurePass123',
        fullName: 'Verify User',
      });

      const verificationEmail = mockEmailService.sentEmails.find((e) => e.type === 'verification');
      expect(verificationEmail).toBeDefined();

      await authService.verifyEmail(verificationEmail!.token);

      const user = await mockUserRepository.findByEmail('verify@example.com');
      expect(user?.isVerified).toBe(true);
      // 検証済みトークンは再利用不可
      await expect(authService.verifyEmail(verificationEmail!.token)).rejects.toThrow();
    });

    it('should reject invalid verification token', async () => {
      await expect(authService.verifyEmail('nonexistent-token')).rejects.toThrow();
    });

    it('should mark user verified in login response after verification', async () => {
      await authService.register({
        email: 'verified@example.com',
        password: 'SecurePass123',
        fullName: 'Verified User',
      });
      const verificationEmail = mockEmailService.sentEmails.find((e) => e.type === 'verification');
      await authService.verifyEmail(verificationEmail!.token);

      const loginResult = await authService.login({
        email: 'verified@example.com',
        password: 'SecurePass123',
      });
      expect(loginResult.user.isVerified).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token and invalidate sessions', async () => {
      await authService.register({
        email: 'reset@example.com',
        password: 'SecurePass123',
        fullName: 'Reset User',
      });

      // ログインしてセッション（refresh token）を作っておく
      const loginResult = await authService.login({
        email: 'reset@example.com',
        password: 'SecurePass123',
      });
      const oldRefreshToken = loginResult.tokens.refreshToken;

      await authService.requestPasswordReset('reset@example.com');
      const resetEmail = mockEmailService.sentEmails.find((e) => e.type === 'reset');
      expect(resetEmail).toBeDefined();

      await authService.resetPassword(resetEmail!.token, 'NewSecurePass456');

      // 新パスワードでログイン可能
      const newLogin = await authService.login({
        email: 'reset@example.com',
        password: 'NewSecurePass456',
      });
      expect(newLogin.user.email).toBe('reset@example.com');

      // 旧パスワードではログイン不可
      await expect(
        authService.login({ email: 'reset@example.com', password: 'SecurePass123' })
      ).rejects.toThrow('Invalid credentials');

      // 旧refresh tokenは無効化されている
      await expect(authService.refreshToken(oldRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );

      // パスワード変更通知が送信されている
      const notification = mockEmailService.sentEmails.find((e) => e.type === 'password_changed');
      expect(notification?.email).toBe('reset@example.com');
    });

    it('should reject invalid reset token', async () => {
      await expect(
        authService.resetPassword('nonexistent-token', 'NewSecurePass456')
      ).rejects.toThrow();
    });

    it('should reject weak new password', async () => {
      await authService.register({
        email: 'weak@example.com',
        password: 'SecurePass123',
        fullName: 'Weak User',
      });
      await authService.requestPasswordReset('weak@example.com');
      const resetEmail = mockEmailService.sentEmails.find((e) => e.type === 'reset');

      await expect(authService.resetPassword(resetEmail!.token, 'weakpass')).rejects.toThrow();
    });

    it('should invalidate reset token after use (single use)', async () => {
      await authService.register({
        email: 'single@example.com',
        password: 'SecurePass123',
        fullName: 'Single Use',
      });
      await authService.requestPasswordReset('single@example.com');
      const resetEmail = mockEmailService.sentEmails.find((e) => e.type === 'reset');

      await authService.resetPassword(resetEmail!.token, 'NewSecurePass456');

      // 同一トークンの再使用は不可
      await expect(
        authService.resetPassword(resetEmail!.token, 'AnotherPass789')
      ).rejects.toThrow();
    });
  });
});
