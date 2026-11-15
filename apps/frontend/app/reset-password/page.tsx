'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { resetPassword } from '@/lib/api/auth-api';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validation/auth-schema';
import { FormField } from '@/components/forms/FormField';
import { FormError } from '@/components/forms/FormError';
import { Button } from '@/components/ui/Button';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    try {
      setSubmitStatus('idle');
      setErrorMessage('');
      await resetPassword(token, data.password);
      setSubmitStatus('success');
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'パスワードの再設定に失敗しました。リンクの有効期限（1時間）が切れている可能性があります。',
      );
    }
  };

  if (!token) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-700 mb-6">再設定トークンがありません。メール内のリンクをそのまま開いてください。</p>
        <Link href="/forgot-password/" className="text-[#1e3a8a] hover:underline font-medium">
          再設定メールを送り直す
        </Link>
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <CheckCircle size={48} className="mx-auto text-[#10b981] mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">パスワードを変更しました</h2>
        <p className="text-gray-700 mb-6">
          新しいパスワードでログインしてください。以前のセッションはすべて無効化されています。
        </p>
        <Link href="/" className="text-[#1e3a8a] hover:underline font-medium">
          ホームへ戻る
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-lg p-8" noValidate>
      {submitStatus === 'error' && (
        <div className="mb-6">
          <FormError message={errorMessage} />
        </div>
      )}

      <FormField label="新しいパスワード" htmlFor="password" required error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
      </FormField>

      <FormField
        label="新しいパスワード（確認）"
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword?.message}
      >
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
        />
      </FormField>

      <p className="text-sm text-gray-500 mb-6">パスワードの条件: 8文字以上、大文字・小文字・数字を各1文字以上</p>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <span className="inline-flex items-center">
            <Loader2 size={18} className="mr-2 animate-spin" />
            変更中…
          </span>
        ) : (
          'パスワードを変更する'
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="pt-24 pb-16">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">新しいパスワードの設定</h1>
          <p className="text-gray-600">Set New Password</p>
        </div>
        <Suspense fallback={<div className="text-center text-gray-600">読み込み中…</div>}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </main>
  );
}
