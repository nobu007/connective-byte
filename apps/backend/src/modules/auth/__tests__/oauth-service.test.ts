/**
 * OAuth Service Tests
 * code 交換・userinfo・連携/新規作成/ログイン分岐を fetch スタブで検証
 */

process.env.JWT_SECRET = 'test-secret-key';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { OAuthService, ProviderEnv } from '../services/oauth-service';
import { AuthService, SessionContext } from '../services/auth-service';
import { JsonUserRepository } from '../implementations/json-user-repository';
import { EmailService } from '../interfaces/email-service';

const PROVIDER_ENV: ProviderEnv = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectBase: 'http://localhost:3001',
};

class MockEmailService implements EmailService {
  async sendVerificationEmail(): Promise<void> {}
  async sendPasswordResetEmail(): Promise<void> {}
  async sendPasswordChangedNotification(): Promise<void> {}
  async sendAccountDeletionNotification(): Promise<void> {}
  async sendAccountDeletionCancelledNotification(): Promise<void> {}
  async sendAccountDeletionCompletedNotification(): Promise<void> {}
}

const CONTEXT: SessionContext = {
  ipAddress: '203.0.113.99',
  deviceInfo: { userAgent: 'UA', browser: 'Chrome', os: 'Windows', device: 'Desktop' },
  userAgent: 'UA',
};

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
  } as unknown as Response;
}

/** token → userinfo の2段 fetch をスタブ */
function stubFetch(
  accessTokenBody: unknown,
  userinfoBody: unknown,
  userinfoOk = true
): jest.SpyInstance {
  let tokenCalled = false;
  return jest.spyOn(global, 'fetch').mockImplementation(async () => {
    if (!tokenCalled) {
      tokenCalled = true;
      return jsonResponse(accessTokenBody);
    }
    return jsonResponse(userinfoBody, userinfoOk);
  });
}

describe('OAuthService', () => {
  let repository: JsonUserRepository;
  let authService: AuthService;
  let service: OAuthService;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `auth-oauth-test-${crypto.randomUUID()}.json`);
    repository = new JsonUserRepository(dbPath);
    authService = new AuthService(repository, new MockEmailService());
    service = new OAuthService(repository, authService, () => PROVIDER_ENV);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function readLogs(): Promise<Array<{ eventType: string; email: string | null }>> {
    const db = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
    return db.authLogs;
  }

  const googleUser = {
    sub: 'google-sub-1',
    email: 'OAuth@example.com', // 大文字 → lower-case 正規化の確認
    email_verified: true,
    name: 'Google User',
  };

  it('should report configured state from env', () => {
    expect(service.isConfigured('google')).toBe(true);
    const unconfigured = new OAuthService(repository, authService, () => ({}));
    expect(unconfigured.isConfigured('google')).toBe(false);
  });

  it('should build the Google authorization URL', () => {
    const url = new URL(service.buildAuthorizationUrl('google', 'state-value'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3001/api/auth/google/callback'
    );
    expect(url.searchParams.get('state')).toBe('state-value');
    expect(url.searchParams.get('prompt')).toBe('select_account');
  });

  it('should create a new OAuth-only user and issue a session', async () => {
    const fetchMock = stubFetch({ access_token: 'at' }, googleUser);

    const result = await service.handleCallback({
      provider: 'google',
      code: 'auth-code',
      state: 'state-value',
      cookieState: 'state-value',
      context: CONTEXT,
    });

    // code 交換は form-urlencoded で token endpoint へ
    const tokenCall = fetchMock.mock.calls[0];
    expect(tokenCall[0]).toBe('https://oauth2.googleapis.com/token');

    expect(result.linked).toBe(true);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);

    const user = await repository.findByEmail('oauth@example.com');
    expect(user).not.toBeNull();
    expect(user?.passwordHash).toBe('');
    expect(user?.isVerified).toBe(true);
    expect(user?.fullName).toBe('Google User');

    const accounts = await repository.findOAuthAccountsByUser(user!.id);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].providerUserId).toBe('google-sub-1');

    // セッション発行済み
    expect(await repository.findSessionsByUser(user!.id)).toHaveLength(1);

    const logs = await readLogs();
    expect(logs.map((l) => l.eventType)).toEqual(
      expect.arrayContaining(['oauth_link', 'oauth_login'])
    );
  });

  it('should link an existing user by matching email and mark verified', async () => {
    const existing = await repository.create({
      email: 'oauth@example.com',
      passwordHash: 'existing-hash',
      fullName: 'Existing User',
      role: 'learner',
      isVerified: false,
      bio: null,
      timezone: 'UTC',
      githubUsername: null,
      purchasedAt: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });

    stubFetch({ access_token: 'at' }, googleUser);
    const result = await service.handleCallback({
      provider: 'google',
      code: 'auth-code',
      state: 'state-value',
      cookieState: 'state-value',
    });

    expect(result.linked).toBe(true);
    expect(result.user.id).toBe(existing.id);
    // email 一致link で isVerified が付く
    const user = await repository.findById(existing.id);
    expect(user?.isVerified).toBe(true);
    expect(await repository.findOAuthAccountsByUser(existing.id)).toHaveLength(1);
  });

  it('should log in via an existing linked account without re-linking', async () => {
    stubFetch({ access_token: 'at' }, googleUser);
    const first = await service.handleCallback({
      provider: 'google',
      code: 'auth-code',
      state: 'state-value',
      cookieState: 'state-value',
    });
    const userId = first.user.id;

    stubFetch({ access_token: 'at2' }, googleUser);
    const second = await service.handleCallback({
      provider: 'google',
      code: 'auth-code-2',
      state: 'state-value-2',
      cookieState: 'state-value-2',
    });

    expect(second.linked).toBe(false);
    expect(second.user.id).toBe(userId);
    // 連携は1つのまま
    expect(await repository.findOAuthAccountsByUser(userId)).toHaveLength(1);
    // セッションは2本
    expect(await repository.findSessionsByUser(userId)).toHaveLength(2);
  });

  it('should reject a state that does not match the cookie (login-CSRF)', async () => {
    stubFetch({ access_token: 'at' }, googleUser);
    await expect(
      service.handleCallback({
        provider: 'google',
        code: 'auth-code',
        state: 'state-value',
        cookieState: 'different-state',
      })
    ).rejects.toMatchObject({ code: 'AUTH_OAUTH_001', httpStatus: 401 });

    await expect(
      service.handleCallback({
        provider: 'google',
        code: 'auth-code',
        state: 'state-value',
        cookieState: '',
      })
    ).rejects.toMatchObject({ code: 'AUTH_OAUTH_001' });
  });

  it('should reject an unverified provider email', async () => {
    stubFetch({ access_token: 'at' }, { ...googleUser, email_verified: false });
    await expect(
      service.handleCallback({
        provider: 'google',
        code: 'auth-code',
        state: 's',
        cookieState: 's',
      })
    ).rejects.toMatchObject({ code: 'AUTH_OAUTH_004', httpStatus: 401 });
  });

  it('should reject a failed code exchange', async () => {
    stubFetch({ error: 'invalid_grant' }, {}, false);
    await expect(
      service.handleCallback({
        provider: 'google',
        code: 'bad-code',
        state: 's',
        cookieState: 's',
      })
    ).rejects.toMatchObject({ code: 'AUTH_OAUTH_002', httpStatus: 401 });
  });

  it('should reject when the provider is not configured', async () => {
    const unconfigured = new OAuthService(repository, authService, () => ({}));
    await expect(
      unconfigured.handleCallback({
        provider: 'google',
        code: 'c',
        state: 's',
        cookieState: 's',
      })
    ).rejects.toMatchObject({ code: 'AUTH_OAUTH_003', httpStatus: 500 });
  });
});
