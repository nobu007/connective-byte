'use client';

/**
 * 新規登録ページ（登録成功で自動ログイン → /mypage/）
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { googleLoginUrl } from '@/lib/api/auth-api';
import { useAuth } from '@/components/auth/AuthProvider';
import { registerSchema, type RegisterFormData } from '@/lib/validation/auth-schema';
import { FormField } from '@/components/forms/FormField';
import { FormError } from '@/components/forms/FormError';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setErrorMessage('');
      await registerUser({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });
      router.push('/mypage/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登録に失敗しました。');
    }
  };

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">新規登録</h1>
          <p className="text-gray-600">Create Account</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          {errorMessage && (
            <div className="mb-6">
              <FormError message={errorMessage} />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormField label="お名前" htmlFor="fullName" required error={errors.fullName?.message}>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                {...register('fullName')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
                aria-invalid={Boolean(errors.fullName)}
              />
            </FormField>

            <FormField label="メールアドレス" htmlFor="email" required error={errors.email?.message}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
                aria-invalid={Boolean(errors.email)}
              />
            </FormField>

            <FormField label="パスワード" htmlFor="password" required error={errors.password?.message}>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-requirements"
              />
              <p id="password-requirements" className="mt-2 text-xs text-gray-500">
                8文字以上で、大文字・小文字・数字を各1文字以上含めてください
              </p>
            </FormField>

            <FormField
              label="パスワード（確認）"
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
              />
            </FormField>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <span className="inline-flex items-center">
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  登録中…
                </span>
              ) : (
                'アカウントを作成'
              )}
            </Button>
          </form>

          <div className="flex items-center my-6" role="separator">
            <span className="flex-1 border-t border-gray-200" />
            <span className="px-4 text-sm text-gray-500">または</span>
            <span className="flex-1 border-t border-gray-200" />
          </div>

          {/* OAuth は state Cookie のため top-level navigation が必須（fetch 不可） */}
          <a
            href={googleLoginUrl('/mypage/')}
            className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" className="mr-2" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Googleで登録
          </a>

          <p className="mt-8 text-center text-sm text-gray-600">
            既にアカウントをお持ちの場合は{' '}
            <Link href="/login/" className="text-[#1e3a8a] hover:underline font-medium">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
