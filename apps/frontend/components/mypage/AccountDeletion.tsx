'use client';

/**
 * マイページ - アカウントタブ
 * アカウント削除の予約（30日猶予）と取消。
 * 予約済みの場合、猶予期間の案内と取消のみを表示。
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth-api';
import { useAuth } from '@/components/auth/AuthProvider';
import { FormError } from '@/components/forms/FormError';
import { Button } from '@/components/ui/Button';

interface AccountDeletionProps {
  deletionScheduledAt: string | null;
  /** 予約/取消後に AuthProvider の状態を再取得する */
  onChanged: () => Promise<void>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function AccountDeletion({ deletionScheduledAt, onChanged }: AccountDeletionProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSchedule = async () => {
    try {
      setBusy(true);
      setErrorMessage('');
      await authApi.deleteAccount();
      // サーバー側で全セッション失効 + Cookie 破棄済みのためローカルも同期
      await logout();
      router.push('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '削除予約に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    try {
      setBusy(true);
      setErrorMessage('');
      await authApi.cancelAccountDeletion();
      await onChanged();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '取消に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  if (deletionScheduledAt) {
    return (
      <div className="bg-white border border-[#f59e0b]/40 rounded-lg p-6 sm:p-8">
        {errorMessage && (
          <div className="mb-6">
            <FormError message={errorMessage} />
          </div>
        )}
        <h2 className="text-lg font-bold text-gray-900 mb-2">アカウント削除が予約されています</h2>
        <p className="text-gray-700 mb-6">
          <strong>{formatDate(deletionScheduledAt)}</strong> にアカウントとデータが削除されます。
          それまでにログインして取消すれば、アカウントは維持されます。
        </p>
        <Button variant="secondary" onClick={() => void handleCancel()} disabled={busy}>
          {busy ? (
            <span className="inline-flex items-center">
              <Loader2 size={18} className="mr-2 animate-spin" />
              処理中…
            </span>
          ) : (
            '削除を取り消す'
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
      {errorMessage && (
        <div className="mb-6">
          <FormError message={errorMessage} />
        </div>
      )}

      <h2 className="text-lg font-bold text-gray-900 mb-2">アカウント削除</h2>
      <p className="text-gray-700 mb-6">
        アカウント削除を予約すると、すべてのセッションからログアウトされ、
        <strong>30日後</strong>にアカウントとデータが完全に削除されます。 削除までの期間であればいつでも取り消せます。
      </p>

      {confirming ? (
        <div className="border border-[#ef4444]/30 bg-[#ef4444]/5 rounded-lg p-4 mb-6">
          <p className="flex items-start text-sm text-gray-800 mb-4">
            <AlertTriangle size={18} className="text-[#ef4444] mr-2 flex-shrink-0 mt-0.5" />
            本当にアカウント削除を予約しますか？この操作でログアウトされます。
          </p>
          <div className="flex gap-3">
            <Button onClick={() => void handleSchedule()} disabled={busy}>
              {busy ? (
                <span className="inline-flex items-center">
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  予約中…
                </span>
              ) : (
                '削除を予約する'
              )}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
              やめる
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setConfirming(true)}>
          アカウント削除を予約…
        </Button>
      )}
    </div>
  );
}
