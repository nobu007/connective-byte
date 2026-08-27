/**
 * auth API（Cloudflare Workers: api.connectivebyte.com）クライアント
 *
 * - 既存3関数（verifyEmail / requestPasswordReset / resetPassword）は
 *   メールリンク着地ページから使用。
 * - apiFetch / authApi はログイン後のメンバー機能で使用。
 *   アクセストークンはメモリのみ（lib/auth/token-store）、
 *   リフレッシュは httpOnly Cookie（cb_rt）で credentials:'include'。
 *
 * API レスポンス形状は apps/backend/src/routes/authRoutes.ts を参照:
 *   成功 { success: true, data: ... } / 失敗 { error: { code, message } }
 */

import { getAccessToken, setAccessToken } from '@/lib/auth/token-store';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.connectivebyte.com').replace(/\/+$/, '');

/** セッション失効を通知するイベントコード（onUnauthorized リスナーへ伝播） */
export const AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED';

interface ApiErrorShape {
  error?: { code?: string; message?: string };
}

/** API エラーコードを持つ Error（画面側でコード別の分岐が可能） */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** リフレッシュ失敗（強制ログアウト）時のリスナー登録。解除関数を返す */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifyUnauthorized(): void {
  unauthorizedListeners.forEach((listener) => listener());
}

function toApiError(data: ApiErrorShape | null, fallback: string): ApiError {
  return new ApiError(data?.error?.code ?? 'UNKNOWN', data?.error?.message || fallback);
}

/** 成功時は { success, data } の data 部を返す。失敗は ApiError を投げる */
async function parseData<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as ({ success?: boolean; data?: T } & ApiErrorShape) | null;
  if (!response.ok) {
    throw toApiError(body, 'リクエストに失敗しました。もう一度お試しください。');
  }
  return (body?.data !== undefined ? body.data : (body as unknown as T)) as T;
}

// ---------------------------------------------------------------------------
// 既存: メールリンク着地ページ用（認証不要・Bearer なし）
// ---------------------------------------------------------------------------

async function postJson<T>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as (T & ApiErrorShape & { success?: boolean }) | null;

  if (!response.ok) {
    throw toApiError(data, 'リクエストに失敗しました。もう一度お試しください。');
  }
  return data as T;
}

export function verifyEmail(token: string): Promise<void> {
  return postJson('/api/auth/verify-email', { token });
}

export function requestPasswordReset(email: string): Promise<void> {
  return postJson('/api/auth/forgot-password', { email });
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return postJson('/api/auth/reset-password', { token, newPassword });
}

// ---------------------------------------------------------------------------
// 型（apps/backend/src/modules/auth/interfaces/user-repository.ts と同期）
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isVerified: boolean;
  bio: string | null;
  timezone: string;
  githubUsername: string | null;
  deletionScheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthAccountView {
  provider: string;
  providerEmail: string | null;
  linkedAt: string;
}

export interface ProfileView {
  user: AuthUser;
  oauthAccounts: OAuthAccountView[];
}

export interface SessionView {
  id: string;
  deviceInfo: { userAgent: string; browser: string; os: string; device: string };
  ipAddress: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface ProfileInput {
  fullName?: string;
  bio?: string | null;
  timezone?: string;
  githubUsername?: string | null;
}

// ---------------------------------------------------------------------------
// リフレッシュ（single-flight）と Bearer 付き fetch
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<boolean> | null = null;

/**
 * アクセストークンを再発行する。
 * 並行呼び出しは1つのリクエストに集約される（single-flight）:
 * 15分で切れるトークンに対し複数タブ/複数リクエストが同時に401を
 * 受けた際、リフレッシュ Cookie のローテーションを複数回走らせると
 * 競合で片方が強制ログアウトされるため。
 */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (!response.ok) {
          setAccessToken(null);
          return false;
        }
        const body = (await response.json().catch(() => null)) as { data?: { accessToken?: string } } | null;
        const token = body?.data?.accessToken ?? null;
        setAccessToken(token);
        return Boolean(token);
      } catch {
        setAccessToken(null);
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * 認証付き API 呼び出し:
 * credentials:'include'（cb_rt Cookie）+ メモリの Bearer トークン。
 * 401 の場合は1回だけ single-flight リフレッシュ → 再試行する。
 * リフレッシュも失敗すれば onUnauthorized を発火し AUTH_SESSION_EXPIRED を投げる。
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const doFetch = (): Promise<Response> => {
    const token = getAccessToken();
    const method = (init.method ?? 'GET').toUpperCase();
    // POST/PUT/PATCH はボディが無くても Content-Type を必須化するミドルウェア対策
    const needsJsonType = Boolean(init.body) || ['POST', 'PUT', 'PATCH'].includes(method);
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(needsJsonType ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      credentials: 'include',
    });
  };

  let response = await doFetch();

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      notifyUnauthorized();
      throw new ApiError(AUTH_SESSION_EXPIRED, 'セッションが期限切れです。再度ログインしてください。');
    }
    response = await doFetch();
  }

  return parseData<T>(response);
}

// ---------------------------------------------------------------------------
// authApi: ログイン/登録/メンバー機能
// ---------------------------------------------------------------------------

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const authApi = {
  /** ログイン。成功時 accessToken をメモリに保存する */
  async login(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json().catch(() => null)) as
      (ApiErrorShape & { data?: { user?: AuthUser; accessToken?: string } }) | null;
    if (!response.ok || !data?.data?.accessToken) {
      throw toApiError(data, 'メールアドレスまたはパスワードが正しくありません。');
    }
    setAccessToken(data.data.accessToken);
    return data.data.user!;
  },

  /** 登録（自動ログイン）。成功時 accessToken をメモリに保存する */
  async register(input: RegisterInput): Promise<AuthUser> {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    const data = (await response.json().catch(() => null)) as
      (ApiErrorShape & { data?: { user?: AuthUser; accessToken?: string } }) | null;
    if (!response.ok || !data?.data?.accessToken) {
      throw toApiError(data, '登録に失敗しました。入力内容をご確認ください。');
    }
    setAccessToken(data.data.accessToken);
    return data.data.user!;
  },

  /** ログアウト（冪等）。Cookie はサーバーが破棄、メモリのトークンも消す */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
    } finally {
      setAccessToken(null);
    }
  },

  fetchMe(): Promise<ProfileView> {
    return apiFetch<ProfileView>('/api/auth/me');
  },

  updateProfile(input: ProfileInput): Promise<ProfileView> {
    return apiFetch<ProfileView>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  changePassword(input: { currentPassword?: string; newPassword: string }): Promise<void> {
    return apiFetch<void>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  listSessions(): Promise<SessionView[]> {
    return apiFetch<{ sessions: SessionView[] }>('/api/auth/sessions').then((d) => d.sessions);
  },

  revokeSession(sessionId: string): Promise<void> {
    return apiFetch<void>(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  },

  revokeOtherSessions(): Promise<number> {
    return apiFetch<{ revokedCount: number }>('/api/auth/sessions/revoke-others', {
      method: 'POST',
    }).then((d) => d.revokedCount);
  },

  deleteAccount(): Promise<{ deletionScheduledFor: string }> {
    return apiFetch<{ deletionScheduledFor: string }>('/api/auth/delete-account', {
      method: 'POST',
    });
  },

  cancelAccountDeletion(): Promise<void> {
    return apiFetch<void>('/api/auth/delete-account/cancel', { method: 'POST' });
  },
};

/**
 * Google ログイン開始URL（<a href> 専用・top-level navigation 必須）:
 * OAuth の state Cookie は api ドメインに発行されるため fetch では動かない。
 */
export function googleLoginUrl(redirectPath = '/'): string {
  return `${API_BASE}/api/auth/google?redirect=${encodeURIComponent(redirectPath)}`;
}
