/**
 * auth API（Cloudflare Workers: api.connectivebyte.com）クライアント
 *
 * メールリンク着地ページ（verify-email / reset-password / forgot-password）から使用。
 * API レスポンス形状は apps/backend/src/routes/authRoutes.ts を参照。
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.connectivebyte.com').replace(/\/+$/, '');

interface ApiErrorShape {
  error?: { code?: string; message?: string };
}

async function postJson<T>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as (T & ApiErrorShape & { success?: boolean }) | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'リクエストに失敗しました。もう一度お試しください。');
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
