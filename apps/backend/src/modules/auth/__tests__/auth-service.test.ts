/**
 * Auth Service Unit Tests
 * Tests core business logic for authentication
 *
 * UserRepository は本物の JsonUserRepository（テスト毎の一時ファイル）を使用し、
 * ハンドメイドの Mock 実装との型ズレを防ぐ（TS implements は実実装にのみ効く）。
 */

// Set JWT_SECRET before importing any auth modules
process.env.JWT_SECRET = 'test-secret-key';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth-service';
import { JsonUserRepository } from '../implementations/json-user-repository';
import { EmailService } from '../interfaces/email-service';
import { SessionContext } from '../services/auth-service';

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

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const TEST_CONTEXT: SessionContext = {
  ipAddress: '203.0.113.10',
  deviceInfo: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
    browser: 'Chrome',
    os: 'Windows',
    device: 'Desktop',
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
};

describe('AuthService', () => {
  let repository: JsonUserRepository;
  let mockEmailService: MockEmailService;
  let authService: AuthService;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `auth-svc-test-${crypto.randomUUID()}.json`);
    repository = new JsonUserRepository(dbPath);
    mockEmailService = new MockEmailService();
    authService = new AuthService(repository, mockEmailService);
  });

  /** テスト用DBファイルの生の内容（auth_logs 等の検証に使用） */
  async function readDb(): Promise<{
    authLogs: Array<{ eventType: string; email: string | null; success: boolean }>;
    sessions: Array<{ id: string; expiresAt: string }>;
  }> {
    return JSON.parse(await fs.readFile(dbPath, 'utf-8'));
  }

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
    it('should register new user and issue session', async () => {
      const result = await authService.register(
        { email: 'test@example.com', password: 'SecurePass123', fullName: 'Test User' },
        TEST_CONTEXT
      );

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.fullName).toBe('Test User');
      expect(result.user.role).toBe('learner');
      expect(result.user.isVerified).toBe(false);
      expect(result.accessToken).toBeDefined();
      // refreshTokenはCookie設定用に返る（レスポンスJSONには含めないのはcontrollerの責務）
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);

      // セッションがIP・デバイス情報付きで記録されている
      const sessions = await repository.findSessionsByUser(result.user.id);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].deviceInfo.browser).toBe('Chrome');
      expect(sessions[0].ipAddress).toBe('203.0.113.10');
      // 保存されているのはSHA-256ハッシュ（生トークンではない）
      expect(sessions[0].refreshTokenHash).toBe(sha256(result.refreshToken));

      expect(mockEmailService.sentEmails).toHaveLength(1);
      expect(mockEmailService.sentEmails[0].type).toBe('verification');
    });

    it('should issue a 15-minute JWT as access token', async () => {
      const result = await authService.register({
        email: 'claims@example.com',
        password: 'SecurePass123',
        fullName: 'Claims User',
      });

      const decoded = jwt.decode(result.accessToken) as { id: string; exp: number; iat: number };
      expect(decoded.id).toBe(result.user.id);
      // JWT_EXPIRES_IN 既定 15m = 900秒
      expect(decoded.exp - decoded.iat).toBe(900);
    });

    it('should reject invalid email format with AuthError', async () => {
      await expect(
        authService.register({
          email: 'invalid-email',
          password: 'SecurePass123',
          fullName: 'Test User',
        })
      ).rejects.toMatchObject({ code: 'AUTH_REG_003' });
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
      ).rejects.toMatchObject({ code: 'AUTH_REG_002' });
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

    it('should login with valid credentials and create a session', async () => {
      const result = await authService.login(
        { email: 'test@example.com', password: 'SecurePass123' },
        TEST_CONTEXT
      );

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);

      const sessions = await repository.findSessionsByUser(result.user.id);
      expect(sessions.length).toBe(2); // register + login
    });

    it('should reject invalid email', async () => {
      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'SecurePass123' })
      ).rejects.toMatchObject({ code: 'AUTH_LOGIN_002' });
    });

    it('should reject invalid password', async () => {
      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPassword123' })
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

  describe('login lockout & audit logs', () => {
    it('should record login_failed / login logs', async () => {
      await authService.register({
        email: 'audit@example.com',
        password: 'SecurePass123',
        fullName: 'Audit User',
      });

      await expect(
        authService.login({ email: 'audit@example.com', password: 'WrongPass123' })
      ).rejects.toMatchObject({ code: 'AUTH_LOGIN_002' });
      await expect(
        authService.login({ email: 'unknown@example.com', password: 'Whatever123' })
      ).rejects.toMatchObject({ code: 'AUTH_LOGIN_002' });
      await authService.login({ email: 'audit@example.com', password: 'SecurePass123' });

      const db = await readDb();
      const logTypes = db.authLogs.map((l) => l.eventType);
      expect(logTypes).toContain('login_failed');
      expect(logTypes).toContain('login');

      const failed = db.authLogs.filter((l) => l.eventType === 'login_failed');
      // 未知emailと誤パスワードで同形の失敗ログ（列挙対策）
      expect(failed).toHaveLength(2);
      expect(failed.map((l) => l.email)).toEqual(
        expect.arrayContaining(['audit@example.com', 'unknown@example.com'])
      );
      const success = db.authLogs.find((l) => l.eventType === 'login');
      expect(success?.success).toBe(true);
    });

    it('should lock out after 10 failures within 1 hour, before password check', async () => {
      await authService.register({
        email: 'lock@example.com',
        password: 'SecurePass123',
        fullName: 'Lock User',
      });

      for (let i = 0; i < 10; i++) {
        await expect(
          authService.login({ email: 'lock@example.com', password: `WrongPass${i}A` })
        ).rejects.toMatchObject({ code: 'AUTH_LOGIN_002' });
      }

      // 正しいパスワードでも拒否（= パスワード検証前にロックアウト判定）
      await expect(
        authService.login({ email: 'lock@example.com', password: 'SecurePass123' })
      ).rejects.toMatchObject({ code: 'AUTH_LOGIN_003', httpStatus: 429, retryAfterSeconds: 3600 });

      const db = await readDb();
      const locked = db.authLogs.filter((l) => l.eventType === 'login_locked');
      expect(locked).toHaveLength(1);
      expect(locked[0].success).toBe(false);
    });

    it('should unlock after the 1-hour window passes', async () => {
      // リポジトリのログ created_at は実時間で刻まれるため、基準は実時間+マージン
      const base = new Date(Date.now() + 1000);
      let fakeNow = base;
      const clocked = new AuthService(repository, mockEmailService, () => fakeNow);

      await clocked.register({
        email: 'window@example.com',
        password: 'SecurePass123',
        fullName: 'Window User',
      });

      for (let i = 0; i < 10; i++) {
        await expect(
          clocked.login({ email: 'window@example.com', password: 'WrongPass123' })
        ).rejects.toMatchObject({ code: 'AUTH_LOGIN_002' });
      }
      await expect(
        clocked.login({ email: 'window@example.com', password: 'SecurePass123' })
      ).rejects.toMatchObject({ code: 'AUTH_LOGIN_003' });

      // 窓（1h）を過ぎると失敗カウントがリセットされる
      fakeNow = new Date(base.getTime() + 2 * 60 * 60 * 1000);
      const result = await clocked.login({
        email: 'window@example.com',
        password: 'SecurePass123',
      });
      expect(result.user.email).toBe('window@example.com');
    });

    it('should not lock a different email', async () => {
      await authService.register({
        email: 'target@example.com',
        password: 'SecurePass123',
        fullName: 'Target User',
      });
      await authService.register({
        email: 'other@example.com',
        password: 'SecurePass123',
        fullName: 'Other User',
      });

      for (let i = 0; i < 10; i++) {
        await expect(
          authService.login({ email: 'target@example.com', password: 'WrongPass123' })
        ).rejects.toMatchObject({ code: 'AUTH_LOGIN_002' });
      }

      // 別emailは影響を受けない
      const result = await authService.login({
        email: 'other@example.com',
        password: 'SecurePass123',
      });
      expect(result.user.email).toBe('other@example.com');
    });
  });

  describe('refreshToken (rotation)', () => {
    it('should rotate refresh token and return new tokens', async () => {
      const registerResult = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      const oldRefreshToken = registerResult.refreshToken;
      const result = await authService.refreshToken(oldRefreshToken);

      // 新しいアクセストークンはユーザー情報を含むJWTであること
      const decoded = jwt.decode(result.accessToken) as { id: string; email: string };
      expect(decoded.id).toBe(registerResult.user.id);
      expect(decoded.email).toBe(registerResult.user.email);

      // ローテーション: 新しいリフレッシュトークンは旧と異なる
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(result.refreshToken).not.toBe(oldRefreshToken);
    });

    it('should detect reuse of rotated token and revoke all sessions', async () => {
      const registerResult = await authService.register({
        email: 'reuse@example.com',
        password: 'SecurePass123',
        fullName: 'Reuse User',
      });
      const userId = registerResult.user.id;

      // 別セッション（失効されるべき）
      const secondLogin = await authService.login({
        email: 'reuse@example.com',
        password: 'SecurePass123',
      });

      const first = await authService.refreshToken(registerResult.refreshToken);
      expect(await repository.findSessionsByUser(userId)).toHaveLength(2);

      // 旧トークン（= prev hash）の再呈示 → 再利用検知
      const logSpy = jest.spyOn(repository, 'recordAuthLog');
      await expect(authService.refreshToken(registerResult.refreshToken)).rejects.toMatchObject({
        code: 'AUTH_TOKEN_002',
      });

      // 全セッション失効（ローテーション後トークン・第二セッション両方）
      expect(await repository.findSessionsByUser(userId)).toHaveLength(0);
      await expect(authService.refreshToken(first.refreshToken)).rejects.toThrow();
      await expect(authService.refreshToken(secondLogin.refreshToken)).rejects.toThrow();

      // 監査ログ記録
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'refresh_reuse_detected',
          userId,
          success: false,
        })
      );
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toMatchObject({
        code: 'AUTH_TOKEN_002',
      });
    });

    it('should reject expired session token', async () => {
      const registerResult = await authService.register({
        email: 'expired@example.com',
        password: 'SecurePass123',
        fullName: 'Expired User',
      });
      const userId = registerResult.user.id;

      // 期限切れセッションを直接作る（clock非依存にするため）
      const rawToken = crypto.randomBytes(32).toString('hex');
      await repository.createSession({
        userId,
        refreshTokenHash: sha256(rawToken),
        deviceInfo: TEST_CONTEXT.deviceInfo,
        ipAddress: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(authService.refreshToken(rawToken)).rejects.toThrow('Invalid or expired');
    });

    it('should revoke all sessions when atomic rotation fails (concurrent refresh)', async () => {
      const registerResult = await authService.register({
        email: 'conflict@example.com',
        password: 'SecurePass123',
        fullName: 'Conflict User',
      });
      const userId = registerResult.user.id;

      // 並行リクエストが先にローテーションを完了した状況をシミュレート:
      // findSessionByTokenHash は成功するが rotate が競合で false を返す
      jest.spyOn(repository, 'rotateSessionRefreshToken').mockResolvedValue(false);

      await expect(authService.refreshToken(registerResult.refreshToken)).rejects.toMatchObject({
        code: 'AUTH_TOKEN_002',
      });

      expect(await repository.findSessionsByUser(userId)).toHaveLength(0);
    });

    it('should extend session expiry from injected clock', async () => {
      // 実時間より未来にずらす（findSessionsByUser の期限フィルタに掛からないように）
      const fakeNow = new Date(Date.now() + 60_000);
      const clockService = new AuthService(repository, mockEmailService, () => fakeNow);

      const result = await clockService.register({
        email: 'clock@example.com',
        password: 'SecurePass123',
        fullName: 'Clock User',
      });

      const sessions = await repository.findSessionsByUser(result.user.id);
      // 期限 = 注入した clock の 30日後
      expect(sessions[0].expiresAt).toBe(
        new Date(fakeNow.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      );
    });
  });

  describe('logout', () => {
    it('should revoke the session tied to the cookie token', async () => {
      const registerResult = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      });

      const rawToken = registerResult.refreshToken;
      await authService.logout(rawToken);

      expect(await repository.findSessionsByUser(registerResult.user.id)).toHaveLength(0);
      await expect(authService.refreshToken(rawToken)).rejects.toThrow('Invalid or expired');
    });

    it('should revoke only the presented session, not other sessions', async () => {
      const registerResult = await authService.register({
        email: 'multi@example.com',
        password: 'SecurePass123',
        fullName: 'Multi User',
      });
      const secondLogin = await authService.login({
        email: 'multi@example.com',
        password: 'SecurePass123',
      });

      await authService.logout(registerResult.refreshToken);

      const remaining = await repository.findSessionsByUser(registerResult.user.id);
      expect(remaining).toHaveLength(1);
      // 残ったセッションは生きている
      await expect(authService.refreshToken(secondLogin.refreshToken)).resolves.toBeDefined();
    });

    it('should be idempotent for garbage token', async () => {
      await expect(authService.logout('garbage-token')).resolves.toBeUndefined();
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

      const resetEmail = mockEmailService.sentEmails.find((e) => e.type === 'reset');
      expect(resetEmail).toBeDefined();
      expect(resetEmail?.email).toBe('test@example.com');
      expect(resetEmail?.token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should not reveal if email exists for password reset', async () => {
      await expect(
        authService.requestPasswordReset('nonexistent@example.com')
      ).resolves.toBeUndefined();
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email with valid token', async () => {
      await authService.register({
        email: 'verify@example.com',
        password: 'SecurePass123',
        fullName: 'Verify User',
      });

      const verificationEmail = mockEmailService.sentEmails.find((e) => e.type === 'verification');
      expect(verificationEmail).toBeDefined();

      await authService.verifyEmail(verificationEmail!.token);

      const user = await repository.findByEmail('verify@example.com');
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
    it('should reset password with valid token and invalidate all sessions', async () => {
      const registerResult = await authService.register({
        email: 'reset@example.com',
        password: 'SecurePass123',
        fullName: 'Reset User',
      });

      // 複数セッション（register + login）
      const loginResult = await authService.login({
        email: 'reset@example.com',
        password: 'SecurePass123',
      });

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

      // 全セッション無効化（旧トークン両方）
      await expect(authService.refreshToken(registerResult.refreshToken)).rejects.toThrow();
      await expect(authService.refreshToken(loginResult.refreshToken)).rejects.toThrow();

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
