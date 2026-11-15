/**
 * auth API クライアント Tests
 * single-flight refresh・強制ログアウト通知・Bearer ヘッダーを MSW で検証
 */

import { rest } from 'msw';
import { server } from '../../../mocks/server';
import {
  apiFetch,
  authApi,
  googleLoginUrl,
  onUnauthorized,
  refreshAccessToken,
  AUTH_SESSION_EXPIRED,
  type AuthUser,
} from '../auth-api';
import { getAccessToken, setAccessToken } from '../../auth/token-store';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  fullName: 'テストユーザー',
  role: 'learner',
  isVerified: true,
  bio: null,
  timezone: 'UTC',
  githubUsername: null,
  purchasedAt: null,
  deletionScheduledAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function ok(data: unknown) {
  return { success: true, data };
}

describe('auth-api', () => {
  afterEach(() => {
    setAccessToken(null);
  });

  describe('apiFetch single-flight refresh', () => {
    it('coalesces parallel 401s into a single refresh request', async () => {
      let refreshCalls = 0;
      let meCalls = 0;

      server.use(
        rest.post('**/api/auth/refresh', (_req, res, ctx) => {
          refreshCalls += 1;
          return res(ctx.status(200), ctx.json(ok({ accessToken: 'new-token' })));
        }),
        rest.get('**/api/auth/me', (req, res, ctx) => {
          meCalls += 1;
          if (req.headers.get('authorization') === 'Bearer new-token') {
            return res(ctx.status(200), ctx.json(ok({ user: mockUser, oauthAccounts: [] })));
          }
          return res(ctx.status(401), ctx.json({ error: { code: 'AUTH_TOKEN_003', message: 'expired' } }));
        }),
      );

      const [a, b] = await Promise.all([
        apiFetch<{ user: AuthUser }>('/api/auth/me'),
        apiFetch<{ user: AuthUser }>('/api/auth/me'),
      ]);

      expect(refreshCalls).toBe(1);
      expect(meCalls).toBe(4); // 2 × 初回401 + 2 × 再試行
      expect(a.user.id).toBe('user-1');
      expect(b.user.id).toBe('user-1');
      expect(getAccessToken()).toBe('new-token');
    });

    it('throws AUTH_SESSION_EXPIRED and notifies listeners when refresh fails', async () => {
      server.use(
        rest.post('**/api/auth/refresh', (_req, res, ctx) =>
          res(ctx.status(401), ctx.json({ error: { code: 'AUTH_TOKEN_001', message: 'invalid' } })),
        ),
        rest.get('**/api/auth/me', (_req, res, ctx) =>
          res(ctx.status(401), ctx.json({ error: { code: 'AUTH_TOKEN_003', message: 'expired' } })),
        ),
      );

      const listener = jest.fn();
      const unsubscribe = onUnauthorized(listener);
      setAccessToken('stale-token');

      await expect(apiFetch('/api/auth/me')).rejects.toMatchObject({
        code: AUTH_SESSION_EXPIRED,
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBeNull();
      unsubscribe();
      // 解除後は通知されない
      await expect(apiFetch('/api/auth/me')).rejects.toMatchObject({ code: AUTH_SESSION_EXPIRED });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('propagates error code and message on non-401 failures', async () => {
      server.use(
        rest.post('**/api/auth/refresh', (_req, res, ctx) =>
          res(ctx.status(200), ctx.json(ok({ accessToken: 'tok' }))),
        ),
        rest.post('**/api/auth/change-password', (_req, res, ctx) =>
          res(ctx.status(400), ctx.json({ error: { code: 'AUTH_PASSWORD_001', message: 'wrong current password' } })),
        ),
      );

      await expect(
        apiFetch('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ newPassword: 'NewPassword1' }),
        }),
      ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_001', message: 'wrong current password' });
    });
  });

  describe('authApi', () => {
    it('login stores the access token and later calls send it as Bearer', async () => {
      let receivedAuth: string | null = null;

      server.use(
        rest.post('**/api/auth/login', (_req, res, ctx) =>
          res(ctx.status(200), ctx.json(ok({ user: mockUser, accessToken: 'tok-1' }))),
        ),
        rest.get('**/api/auth/me', (req, res, ctx) => {
          receivedAuth = req.headers.get('authorization');
          return res(ctx.status(200), ctx.json(ok({ user: mockUser, oauthAccounts: [] })));
        }),
      );

      const user = await authApi.login('test@example.com', 'Password123');
      expect(user.id).toBe('user-1');
      expect(getAccessToken()).toBe('tok-1');

      await authApi.fetchMe();
      expect(receivedAuth).toBe('Bearer tok-1');
    });

    it('register stores the access token', async () => {
      server.use(
        rest.post('**/api/auth/register', (_req, res, ctx) =>
          res(ctx.status(201), ctx.json(ok({ user: mockUser, accessToken: 'tok-2' }))),
        ),
      );

      const user = await authApi.register({
        fullName: 'テストユーザー',
        email: 'new@example.com',
        password: 'Password123',
      });
      expect(user.email).toBe('test@example.com');
      expect(getAccessToken()).toBe('tok-2');
    });

    it('logout clears the token even when the API call fails', async () => {
      server.use(rest.post('**/api/auth/logout', (_req, res, ctx) => res(ctx.status(500))));

      setAccessToken('tok-3');
      await authApi.logout();
      expect(getAccessToken()).toBeNull();
    });

    it('unwraps session list data', async () => {
      server.use(
        rest.post('**/api/auth/refresh', (_req, res, ctx) =>
          res(ctx.status(200), ctx.json(ok({ accessToken: 'tok' }))),
        ),
        rest.get('**/api/auth/sessions', (_req, res, ctx) =>
          res(
            ctx.status(200),
            ctx.json(
              ok({
                sessions: [
                  {
                    id: 's1',
                    deviceInfo: { userAgent: 'UA', browser: 'Chrome', os: 'macOS', device: 'Desktop' },
                    ipAddress: '203.0.113.1',
                    createdAt: '2026-01-01T00:00:00Z',
                    lastActivityAt: '2026-01-02T00:00:00Z',
                    expiresAt: '2026-12-01T00:00:00Z',
                    isCurrent: true,
                  },
                ],
              }),
            ),
          ),
        ),
      );

      const sessions = await authApi.listSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].isCurrent).toBe(true);
    });
  });

  describe('refreshAccessToken', () => {
    it('reports false and clears the token on failure', async () => {
      server.use(rest.post('**/api/auth/refresh', (_req, res, ctx) => res(ctx.status(401))));

      setAccessToken('dying-token');
      await expect(refreshAccessToken()).resolves.toBe(false);
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('googleLoginUrl', () => {
    it('builds a top-level navigation URL with the redirect path', () => {
      expect(googleLoginUrl('/mypage/')).toBe('https://api.connectivebyte.com/api/auth/google?redirect=%2Fmypage%2F');
      expect(googleLoginUrl()).toBe('https://api.connectivebyte.com/api/auth/google?redirect=%2F');
    });
  });
});
