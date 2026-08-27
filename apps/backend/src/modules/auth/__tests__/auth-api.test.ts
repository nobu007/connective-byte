/**
 * Auth API Integration Tests
 * Tests HTTP endpoints for authentication
 *
 * リフレッシュトークンは httpOnly Cookie（cb_rt）で授受するため、
 * supertest では set-cookie ヘッダーから抽出して Cookie ヘッダーで送る。
 */

// Set JWT_SECRET before importing any auth modules
process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express, { Application } from 'express';

// Import handlers directly to avoid rate limiter in tests
import {
  handleRegister,
  handleLogin,
  handleGetProfile,
  handleRefreshToken,
  handleLogout,
  handleVerifyEmail,
  handleForgotPassword,
  handleResetPassword,
} from '../auth.controller';

/** set-cookie から指定Cookie名の "name=value" ペアを取り出す */
function extractCookie(response: request.Response, name: string): string | null {
  const setCookies: string[] | string = response.headers['set-cookie'];
  if (!setCookies) return null;
  const cookies = Array.isArray(setCookies) ? setCookies : [setCookies];
  const match = cookies.find((c) => c.startsWith(`${name}=`));
  return match ? match.split(';')[0] : null;
}

/** set-cookie ヘッダー全体を1つの文字列に正規化（検証用） */
function setCookieHeader(response: request.Response): string {
  const raw = response.headers['set-cookie'];
  if (!raw) return '';
  return Array.isArray(raw) ? raw.join('\n') : String(raw);
}

describe('Auth API Endpoints', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Register routes without rate limiter for testing
    app.post('/api/auth/register', handleRegister);
    app.post('/api/auth/login', handleLogin);
    app.post('/api/auth/refresh', handleRefreshToken);
    app.get('/api/auth/me', handleGetProfile);
    app.post('/api/auth/logout', handleLogout);
    app.post('/api/auth/verify-email', handleVerifyEmail);
    app.post('/api/auth/forgot-password', handleForgotPassword);
    app.post('/api/auth/reset-password', handleResetPassword);
  });

  describe('POST /api/auth/register', () => {
    // Use unique email for each test to avoid duplicate email issues
    const getUniqueEmail = (testName: string) => `test-${Date.now()}-${testName}@example.com`;

    it('should register a new user and set refresh cookie', async () => {
      const email = getUniqueEmail('success');
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecurePass123',
          fullName: 'Test User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.user.fullName).toBe('Test User');
      expect(response.body.data.user.role).toBe('learner');
      // アクセストークンのみ返却（refreshTokenはJSONに含めない）
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeUndefined();
      expect(response.body.data.tokens).toBeUndefined();

      // リフレッシュトークンは httpOnly Cookie で設定される
      const cookieHeader = setCookieHeader(response);
      expect(cookieHeader).toContain('cb_rt=');
      expect(cookieHeader).toMatch(/HttpOnly/i);
      expect(cookieHeader).toContain('Path=/api/auth');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123',
          fullName: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_REG_003');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: getUniqueEmail('weak-password'),
          password: 'weak',
          fullName: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      // The error message should mention password requirements
      expect(response.body.error.message).toMatch(/password/i);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: getUniqueEmail('missing-fields'),
          // password missing
          fullName: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_REG_001');
    });

    it('should reject duplicate email with generic error', async () => {
      const email = getUniqueEmail('duplicate');
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecurePass123',
          fullName: 'Test User',
        })
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'AnotherPass123',
          fullName: 'Another User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_REG_002');
      // Should not reveal that email already exists
      expect(response.body.error.message).not.toMatch(/exists|already|duplicate/i);
    });

    it('should handle password strength validation', async () => {
      const testCases = [
        { password: 'short', expectedError: 'at least 8 characters', emailSuffix: 'short' },
        { password: 'nouppercase123', expectedError: 'uppercase', emailSuffix: 'nouppercase' },
        { password: 'NOLOWERCASE123', expectedError: 'lowercase', emailSuffix: 'nolowercase' },
        { password: 'NoNumbers', expectedError: 'number', emailSuffix: 'nonumbers' },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: getUniqueEmail(testCase.emailSuffix),
            password: testCase.password,
            fullName: 'Test User',
          })
          .expect(400);

        expect(response.body.error).toBeDefined();
        expect(response.body.error.message).toMatch(new RegExp(testCase.expectedError, 'i'));
      }
    });
  });

  describe('POST /api/auth/login', () => {
    let testEmail: string;

    beforeEach(async () => {
      // Create a test user with unique email for each test
      testEmail = `login-${Date.now()}@example.com`;
      await request(app).post('/api/auth/register').send({
        email: testEmail,
        password: 'SecurePass123',
        fullName: 'Login User',
      });
    });

    it('should login with valid credentials and set refresh cookie', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'SecurePass123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeUndefined();

      const cookieHeader = setCookieHeader(response);
      expect(cookieHeader).toContain('cb_rt=');
      expect(cookieHeader).toMatch(/HttpOnly/i);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_LOGIN_002');
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should be case-insensitive for email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail.toUpperCase(),
          password: 'SecurePass123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject missing fields', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          // password missing
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/refresh (cookie)', () => {
    it('should reject when refresh cookie is missing', async () => {
      const response = await request(app).post('/api/auth/refresh').send({}).expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_TOKEN_002');
    });

    it('should reject invalid refresh cookie value', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'cb_rt=garbage-token-value')
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_TOKEN_002');
      // 無効トークンではCookieを破棄する
      const cleared = extractCookie(response, 'cb_rt');
      expect(cleared).toBe('cb_rt=');
      expect(setCookieHeader(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    it('should rotate refresh cookie and return new access token', async () => {
      const email = `refresh-${Date.now()}@example.com`;
      const registerResponse = await request(app).post('/api/auth/register').send({
        email,
        password: 'SecurePass123',
        fullName: 'Refresh User',
      });
      const refreshCookie = extractCookie(registerResponse, 'cb_rt');
      expect(refreshCookie).toMatch(/^cb_rt=[0-9a-f]{64}$/);

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie!)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();

      // ローテーション: 新しいCookie値は旧と異なる
      const newCookie = extractCookie(response, 'cb_rt');
      expect(newCookie).toMatch(/^cb_rt=[0-9a-f]{64}$/);
      expect(newCookie).not.toBe(refreshCookie);

      // 旧Cookieでは再利用検知で401（全セッション失効）
      const reuseResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie!)
        .expect(401);
      expect(reuseResponse.body.error.code).toBe('AUTH_TOKEN_002');
    });

    it('should reject JSON-body refreshToken (cookie only)', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'whatever-token' })
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_TOKEN_002');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout with refresh cookie and clear it', async () => {
      const email = `logout-${Date.now()}@example.com`;
      const registerResponse = await request(app).post('/api/auth/register').send({
        email,
        password: 'SecurePass123',
        fullName: 'Logout User',
      });
      const refreshCookie = extractCookie(registerResponse, 'cb_rt');

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', refreshCookie!)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Cookie破棄
      expect(setCookieHeader(response)).toMatch(/Expires=Thu, 01 Jan 1970/);

      // 失効後のトークンでは refresh 不可
      await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie!).expect(401);
    });

    it('should be idempotent without authentication or cookie', async () => {
      // authenticate不要・Cookie不在でも200（冪等）
      const response = await request(app).post('/api/auth/logout').send({}).expect(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 200 even with garbage cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'cb_rt=garbage')
        .expect(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should always return success for security', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'any@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Don't reveal if email exists
    });

    it('should require email', async () => {
      const response = await request(app).post('/api/auth/forgot-password').send({}).expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_RESET_001');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should require token and new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          // newPassword missing
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_RESET_002');
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          newPassword: 'NewPass123',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_RESET_003');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should require token', async () => {
      const response = await request(app).post('/api/auth/verify-email').send({}).expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_VERIFY_001');
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'some-token',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_VERIFY_002');
    });
  });

  describe('Protected endpoints', () => {
    it('should return 401 for GET /api/auth/me without user context', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });
  });
});
