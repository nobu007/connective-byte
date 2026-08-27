'use client';

/**
 * 認証コンテキストプロバイダー
 *
 * - mount 時: /api/auth/refresh（Cookie）→ /api/auth/me でセッション復元
 * - apiFetch のリフレッシュ失敗（onUnauthorized）で強制ログアウト
 * - accessToken はメモリのみ。このプロバイダーが状態の唯一の真実源
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, onUnauthorized, refreshAccessToken, AUTH_SESSION_EXPIRED, type AuthUser } from '@/lib/api/auth-api';
import { setAccessToken } from '@/lib/auth/token-store';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** プロフィール更新後などにユーザー状態を差し替える */
  setUser: (user: AuthUser) => void;
  /** サーバーから最新のユーザーを再取得する */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<AuthUser | null>(null);

  // セッション復元: refresh → me
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const refreshed = await refreshAccessToken();
      if (cancelled) return;
      if (!refreshed) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const profile = await authApi.fetchMe();
        if (cancelled) return;
        setUserState(profile.user);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        setUserState(null);
        setStatus('unauthenticated');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // リフレッシュ失敗（全 API で401＋再発行不可）→ 強制ログアウト
  useEffect(() => {
    return onUnauthorized(() => {
      setAccessToken(null);
      setUserState(null);
      setStatus('unauthenticated');
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await authApi.login(email, password);
    setUserState(loggedIn);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: { fullName: string; email: string; password: string }) => {
    const created = await authApi.register(input);
    setUserState(created);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUserState(null);
    setStatus('unauthenticated');
  }, []);

  const setUser = useCallback((nextUser: AuthUser) => {
    setUserState(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await authApi.fetchMe();
    setUserState(profile.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout, setUser, refreshUser }),
    [status, user, login, register, logout, setUser, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/** テスト/ユーティリティ用にエクスポート（画面コードでは useAuth を使う） */
export { AUTH_SESSION_EXPIRED };
