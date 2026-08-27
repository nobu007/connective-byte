/**
 * AuthProvider Tests
 * mount 時セッション復元（refresh→me）・ログアウト・リフレッシュ失敗の遷移を検証
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../../mocks/server';
import { AuthProvider, useAuth } from '../AuthProvider';
import type { AuthUser } from '@/lib/api/auth-api';
import { setAccessToken } from '@/lib/auth/token-store';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  fullName: 'テストユーザー',
  role: 'learner',
  isVerified: true,
  bio: null,
  timezone: 'UTC',
  githubUsername: null,
  deletionScheduledAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

/** status とユーザー名を表示するテスト用コンシューマ */
function StatusProbe() {
  const { status, user, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user?.fullName ?? 'none'}</span>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

function setup() {
  return render(
    <AuthProvider>
      <StatusProbe />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  afterEach(() => {
    setAccessToken(null);
  });

  it('restores the session from the refresh cookie on mount', async () => {
    server.use(
      rest.post('**/api/auth/refresh', (_req, res, ctx) =>
        res(ctx.status(200), ctx.json({ success: true, data: { accessToken: 'tok' } })),
      ),
      rest.get('**/api/auth/me', (_req, res, ctx) =>
        res(ctx.status(200), ctx.json({ success: true, data: { user: mockUser, oauthAccounts: [] } })),
      ),
    );

    setup();

    // mount 直後は復元中
    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('テストユーザー');
  });

  it('becomes unauthenticated when there is no valid refresh cookie', async () => {
    server.use(rest.post('**/api/auth/refresh', (_req, res, ctx) => res(ctx.status(401))));

    setup();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('becomes unauthenticated when /me fails after refresh', async () => {
    server.use(
      rest.post('**/api/auth/refresh', (_req, res, ctx) =>
        res(ctx.status(200), ctx.json({ success: true, data: { accessToken: 'tok' } })),
      ),
      rest.get('**/api/auth/me', (_req, res, ctx) => res(ctx.status(401))),
    );

    setup();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });
  });

  it('clears the session on logout', async () => {
    server.use(
      rest.post('**/api/auth/refresh', (_req, res, ctx) =>
        res(ctx.status(200), ctx.json({ success: true, data: { accessToken: 'tok' } })),
      ),
      rest.get('**/api/auth/me', (_req, res, ctx) =>
        res(ctx.status(200), ctx.json({ success: true, data: { user: mockUser, oauthAccounts: [] } })),
      ),
      rest.post('**/api/auth/logout', (_req, res, ctx) =>
        res(ctx.status(200), ctx.json({ success: true, data: { message: 'ok' } })),
      ),
    );

    setup();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'logout' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });
});
