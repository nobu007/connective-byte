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
import crypto from 'crypto';

// Import handlers directly to avoid rate limiter in tests
import {
  handleRegister,
  handleLogin,
  handleGetProfile,
  handleUpdateProfile,
  handleChangePassword,
  handleListSessions,
  handleRevokeSession,
  handleRevokeOtherSessions,
  handleDeleteAccount,
  handleCancelAccountDeletion,
  handleRefreshToken,
  handleLogout,
  handleVerifyEmail,
  handleForgotPassword,
  handleResetPassword,
} from '../auth.controller';
import { authenticate } from '../../../middleware/auth';

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

    // Register routes without rate limiter for testing.
    // 保護対象には本物の authenticate をマウント（Bearer 認証を実経路で検証）
    app.post('/api/auth/register', handleRegister);
    app.post('/api/auth/login', handleLogin);
    app.post('/api/auth/refresh', handleRefreshToken);
    app.get('/api/auth/me', authenticate, handleGetProfile);
    app.put('/api/auth/me', authenticate, handleUpdateProfile);
    app.post('/api/auth/change-password', authenticate, handleChangePassword);
    app.get('/api/auth/sessions', authenticate, handleListSessions);
    app.post('/api/auth/sessions/revoke-others', authenticate, handleRevokeOtherSessions);
    app.delete('/api/auth/sessions/:sessionId', authenticate, handleRevokeSession);
    app.post('/api/auth/delete-account', authenticate, handleDeleteAccount);
    app.post('/api/auth/delete-account/cancel', authenticate, handleCancelAccountDeletion);
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

    it('should return 429 with Retry-After after 10 failed logins', async () => {
      const email = `lockout-${Date.now()}@example.com`;
      await request(app).post('/api/auth/register').send({
        email,
        password: 'SecurePass123',
        fullName: 'Lockout User',
      });

      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email, password: 'WrongPassword123' })
          .expect(401);
      }

      // 11回目（正しいパスワードでも）はロックアウト
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'SecurePass123' })
        .expect(429);

      expect(response.body.error.code).toBe('AUTH_LOGIN_003');
      expect(response.headers['retry-after']).toBe('3600');
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

  describe('Protected endpoints (Bearer + authenticate)', () => {
    /** register して accessToken とリフレッシュCookieを取得 */
    async function registerUser(label: string) {
      const email = `protected-${label}-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'SecurePass123', fullName: 'Protected User' })
        .expect(201);
      return {
        email,
        accessToken: res.body.data.accessToken as string,
        refreshCookie: extractCookie(res, 'cb_rt') as string,
      };
    }

    const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

    it('should return the 401 envelope without a token', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);
      expect(response.body.error.code).toBe('AUTH_TOKEN_003');
    });

    it('should return 401 for a garbage token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set(bearer('garbage-token'))
        .expect(401);
      expect(response.body.error.code).toBe('AUTH_TOKEN_003');
    });

    it('GET /me should return the profile with an empty oauth list', async () => {
      const user = await registerUser('me');

      const response = await request(app)
        .get('/api/auth/me')
        .set(bearer(user.accessToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.oauthAccounts).toEqual([]);
    });

    it('PUT /me should update the profile', async () => {
      const user = await registerUser('update');

      const response = await request(app)
        .put('/api/auth/me')
        .set(bearer(user.accessToken))
        .send({ fullName: 'Updated Name', bio: 'hello', timezone: 'Asia/Tokyo' })
        .expect(200);

      expect(response.body.data.user.fullName).toBe('Updated Name');
      expect(response.body.data.user.bio).toBe('hello');
      expect(response.body.data.user.timezone).toBe('Asia/Tokyo');
    });

    it('PUT /me should reject invalid input with AUTH_PROFILE_001', async () => {
      const user = await registerUser('invalid');

      const response = await request(app)
        .put('/api/auth/me')
        .set(bearer(user.accessToken))
        .send({ fullName: 'a'.repeat(101) })
        .expect(400);

      expect(response.body.error.code).toBe('AUTH_PROFILE_001');
    });

    it('POST /change-password should reject a wrong current password', async () => {
      const user = await registerUser('wrongpw');

      const response = await request(app)
        .post('/api/auth/change-password')
        .set(bearer(user.accessToken))
        .set('Cookie', user.refreshCookie)
        .send({ currentPassword: 'WrongPass123', newPassword: 'NewPass123' })
        .expect(400);

      expect(response.body.error.code).toBe('AUTH_PASSWORD_001');
    });

    it('POST /change-password should keep the current session and revoke others', async () => {
      // register でセッションA、login でセッションB
      const user = await registerUser('keepcurrent');
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'SecurePass123' })
        .expect(200);
      const sessionBCookie = extractCookie(loginResponse, 'cb_rt') as string;
      const sessionBToken = loginResponse.body.data.accessToken as string;

      await request(app)
        .post('/api/auth/change-password')
        .set(bearer(sessionBToken))
        .set('Cookie', sessionBCookie)
        .send({ currentPassword: 'SecurePass123', newPassword: 'NewPass456' })
        .expect(200);

      // 他セッション（A）は失効
      await request(app).post('/api/auth/refresh').set('Cookie', user.refreshCookie).expect(401);
      // 現在セッション（B）は維持
      await request(app).post('/api/auth/refresh').set('Cookie', sessionBCookie).expect(200);
    });

    it('GET /sessions should require the refresh cookie', async () => {
      const user = await registerUser('sessions-nocookie');

      const response = await request(app)
        .get('/api/auth/sessions')
        .set(bearer(user.accessToken))
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_TOKEN_002');
    });

    it('GET /sessions should list sessions with isCurrent', async () => {
      const user = await registerUser('sessions');
      await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'SecurePass123' })
        .expect(200);

      const response = await request(app)
        .get('/api/auth/sessions')
        .set(bearer(user.accessToken))
        .set('Cookie', user.refreshCookie)
        .expect(200);

      expect(response.body.data.sessions).toHaveLength(2);
      expect(
        response.body.data.sessions.filter((s: { isCurrent: boolean }) => s.isCurrent)
      ).toHaveLength(1);
      expect(response.body.data.sessions[0].deviceInfo).toBeDefined();
    });

    it('DELETE /sessions/:id should revoke an owned session', async () => {
      const user = await registerUser('revoke');
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'SecurePass123' })
        .expect(200);
      const otherCookie = extractCookie(loginResponse, 'cb_rt') as string;

      const list = await request(app)
        .get('/api/auth/sessions')
        .set(bearer(user.accessToken))
        .set('Cookie', user.refreshCookie)
        .expect(200);
      const otherSession = list.body.data.sessions.find(
        (s: { isCurrent: boolean }) => !s.isCurrent
      );

      await request(app)
        .delete(`/api/auth/sessions/${otherSession.id}`)
        .set(bearer(user.accessToken))
        .expect(200);

      // 失効したセッションのCookieでは refresh 不可
      await request(app).post('/api/auth/refresh').set('Cookie', otherCookie).expect(401);
    });

    it('DELETE /sessions/:id should return 404 for an unknown session', async () => {
      const user = await registerUser('revoke-unknown');

      const response = await request(app)
        .delete(`/api/auth/sessions/${crypto.randomUUID()}`)
        .set(bearer(user.accessToken))
        .expect(404);

      expect(response.body.error.code).toBe('AUTH_SESSION_001');
    });

    it('POST /sessions/revoke-others should revoke all but the current session', async () => {
      const user = await registerUser('revokeothers');
      await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'SecurePass123' })
        .expect(200);

      const response = await request(app)
        .post('/api/auth/sessions/revoke-others')
        .set(bearer(user.accessToken))
        .set('Cookie', user.refreshCookie)
        .expect(200);

      expect(response.body.data.revokedCount).toBe(1);
      // 現在セッションは使える
      await request(app).post('/api/auth/refresh').set('Cookie', user.refreshCookie).expect(200);
    });

    it('POST /delete-account should schedule deletion, clear cookie and allow cancel', async () => {
      const user = await registerUser('delete');

      const response = await request(app)
        .post('/api/auth/delete-account')
        .set(bearer(user.accessToken))
        .set('Cookie', user.refreshCookie)
        .expect(200);

      // 30日後の日時が返る
      const scheduledFor = new Date(response.body.data.deletionScheduledFor);
      const delta = scheduledFor.getTime() - Date.now();
      expect(delta).toBeGreaterThan(29 * 24 * 3600 * 1000);
      expect(delta).toBeLessThan(31 * 24 * 3600 * 1000);

      // 全セッション失効 + Cookie破棄
      expect(setCookieHeader(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
      await request(app).post('/api/auth/refresh').set('Cookie', user.refreshCookie).expect(401);

      // 二重予約は409
      const again = await request(app)
        .post('/api/auth/delete-account')
        .set(bearer(user.accessToken))
        .expect(409);
      expect(again.body.error.code).toBe('AUTH_DELETE_001');

      // アクセストークン（15分）は有効なので取り消せる
      await request(app)
        .post('/api/auth/delete-account/cancel')
        .set(bearer(user.accessToken))
        .expect(200);

      // 取り消し済みでの再取り消しは409
      const cancelAgain = await request(app)
        .post('/api/auth/delete-account/cancel')
        .set(bearer(user.accessToken))
        .expect(409);
      expect(cancelAgain.body.error.code).toBe('AUTH_DELETE_002');
    });
  });
});
