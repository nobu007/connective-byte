'use client';

/**
 * マイページ - セッションタブ
 * アクティブセッション一覧（端末・IP・最終活動）と個別/一括失効
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, LogOut, Monitor, RefreshCw } from 'lucide-react';
import { authApi, type SessionView } from '@/lib/api/auth-api';
import { FormError } from '@/components/forms/FormError';
import { Button } from '@/components/ui/Button';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function deviceLabel(session: SessionView): string {
  const { browser, os, device } = session.deviceInfo;
  return [browser, os, device].filter(Boolean).join(' / ') || '不明なデバイス';
}

export function SessionList() {
  const [sessions, setSessions] = useState<SessionView[] | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErrorMessage('');
      setSessions(await authApi.listSessions());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'セッション一覧の取得に失敗しました。');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRevoke = async (session: SessionView) => {
    try {
      setRevokingId(session.id);
      setNotice('');
      setErrorMessage('');
      await authApi.revokeSession(session.id);
      setSessions((current) => current?.filter((s) => s.id !== session.id) ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'セッションの失効に失敗しました。');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      setNotice('');
      setErrorMessage('');
      const count = await authApi.revokeOtherSessions();
      setNotice(`他の${count}件のセッションをログアウトしました。`);
      setSessions(await authApi.listSessions());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'セッションの失効に失敗しました。');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
      {errorMessage && (
        <div className="mb-6">
          <FormError message={errorMessage} />
        </div>
      )}

      {sessions === null ? (
        <div className="py-12 flex justify-center" role="status" aria-label="読み込み中">
          <Loader2 size={32} className="text-[#1e3a8a] animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-600">アクティブなセッション: {sessions.length}件</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <span className="inline-flex items-center">
                  <RefreshCw size={14} className="mr-1" />
                  更新
                </span>
              </Button>
              {sessions.length > 1 && (
                <Button variant="secondary" size="sm" onClick={() => void handleRevokeOthers()}>
                  他のすべてをログアウト
                </Button>
              )}
            </div>
          </div>

          {notice && (
            <p className="mb-4 text-sm text-[#059669]" role="status">
              {notice}
            </p>
          )}

          <ul className="divide-y divide-gray-200" role="list">
            {sessions.map((session) => (
              <li key={session.id} className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Monitor size={16} className="text-gray-400" aria-hidden="true" />
                    {deviceLabel(session)}
                    {session.isCurrent && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#059669]">
                        現在のセッション
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    IP: {session.ipAddress ?? '不明'} ／ 最終活動: {formatDateTime(session.lastActivityAt)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ログイン: {formatDateTime(session.createdAt)} ～ 有効期限:
                    {formatDateTime(session.expiresAt)}
                  </p>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => void handleRevoke(session)}
                    disabled={revokingId === session.id}
                    className="flex-shrink-0 inline-flex items-center text-sm text-[#ef4444] hover:underline disabled:opacity-50"
                  >
                    <LogOut size={14} className="mr-1" />
                    {revokingId === session.id ? '処理中…' : 'ログアウト'}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {sessions.length === 0 && (
            <p className="py-8 text-center text-gray-500">アクティブなセッションはありません。</p>
          )}
        </>
      )}
    </div>
  );
}
