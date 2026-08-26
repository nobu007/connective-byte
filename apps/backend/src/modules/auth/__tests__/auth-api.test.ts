/**
 * Auth API Integration Tests
 * Tests HTTP endpoints for authentication
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

    it('should register a new user successfully', async () => {
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
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
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
      expect(response.body.error.message).toBe('Registration failed. Please check your input.');
      // Should not reveal that email already exists
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

    it('should login with valid credentials', async () => {
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
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
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

  describe('POST /api/auth/refresh', () => {
    it('should require refresh token', async () => {
      const response = await request(app).post('/api/auth/refresh').send({}).expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_TOKEN_001');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_TOKEN_002');
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

    it('should indicate password reset not fully implemented', async () => {
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

    it('should indicate email verification not fully implemented', async () => {
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
    it('should require authentication for GET /api/auth/me', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    it('should require authentication for POST /api/auth/logout', async () => {
      await request(app).post('/api/auth/logout').send({ refreshToken: 'token' }).expect(401);
    });
  });
});
