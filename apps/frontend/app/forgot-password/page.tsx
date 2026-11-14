'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api/auth-api';
import { authEmailSchema, type AuthEmailFormData } from '@/lib/validation/auth-schema';
import { FormField } from '@/components/forms/FormField';
import { FormError } from '@/components/forms/FormError';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthEmailFormData>({
    resolver: zodResolver(authEmailSchema),
  });

  const onSubmit = async (data: AuthEmailFormData) => {
    try {
      setSubmitStatus('idle');
      setErrorMessage('');
      await requestPasswordReset(data.email);
      setSubmitStatus('success');
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'リクエストに失敗しました。もう一度お試しください。');
    }
  };

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">パスワードの再設定</h1>
          <p className="text-gray-600">Password Reset</p>
        </div>

        {submitStatus === 'success' ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-[#10b981] mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">メールを送信しました</h2>
            <p className="text-gray-700 mb-6">
              アカウントが存在する場合、パスワード再設定用のリンクを記載したメールを送信しました。
              メール内のリンクから1時間以内に手続きを完了してください。
            </p>
            <Link href="/" className="text-[#1e3a8a] hover:underline font-medium">
              ホームへ戻る
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-lg p-8" noValidate>
            <p className="text-gray-700 mb-6">
              ご登録いただいたメールアドレスを入力してください。再設定用のリンクをメールでお送りします。
            </p>

            {submitStatus === 'error' && (
              <div className="mb-6">
                <FormError message={errorMessage} />
              </div>
            )}

            <FormField label="メールアドレス" htmlFor="email" required error={errors.email?.message}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </FormField>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <span className="inline-flex items-center">
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  送信中…
                </span>
              ) : (
                '再設定メールを送信'
              )}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
