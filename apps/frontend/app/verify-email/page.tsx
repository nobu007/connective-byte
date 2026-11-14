'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { verifyEmail } from '@/lib/api/auth-api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('検証トークンがありません。メール内のリンクをそのまま開いてください。');
      return;
    }

    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus('success');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '検証に失敗しました。リンクの有効期限（24時間）が切れている可能性があります。',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">メールアドレスの確認</h1>
          <p className="text-gray-600">Email Verification</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          {status === 'pending' && (
            <>
              <Loader2 size={48} className="mx-auto text-[#1e3a8a] animate-spin mb-4" />
              <p className="text-gray-700">確認中です。しばらくお待ちください…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle size={48} className="mx-auto text-[#10b981] mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">確認が完了しました</h2>
              <p className="text-gray-700 mb-6">メールアドレスの確認が正常に完了しました。</p>
              <Link
                href="/"
                className="inline-block bg-[#1e3a8a] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1e3a8a]/90"
              >
                ホームへ戻る
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={48} className="mx-auto text-[#ef4444] mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">確認できませんでした</h2>
              <p className="text-gray-700 mb-6">{errorMessage}</p>
              <Link href="/" className="text-[#1e3a8a] hover:underline font-medium">
                ホームへ戻る
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="pt-24 pb-16">
          <div className="max-w-md mx-auto px-4 text-center text-gray-600">読み込み中…</div>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
