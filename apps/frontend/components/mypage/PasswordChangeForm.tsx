'use client';

/**
 * マイページ - セキュリティタブ
 * パスワード変更（成功時: 現在セッション以外はすべて失効）
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth-api';
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validation/auth-schema';
import { FormField } from '@/components/forms/FormField';
import { FormError } from '@/components/forms/FormError';
import { Button } from '@/components/ui/Button';

export function PasswordChangeForm() {
  const [errorMessage, setErrorMessage] = useState('');
  const [changed, setChanged] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      setErrorMessage('');
      setChanged(false);
      await authApi.changePassword({
        currentPassword: data.currentPassword?.trim() === '' ? undefined : data.currentPassword,
        newPassword: data.newPassword,
      });
      setChanged(true);
      reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'パスワード変更に失敗しました。');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8"
      noValidate
    >
      {errorMessage && (
        <div className="mb-6">
          <FormError message={errorMessage} />
        </div>
      )}

      <FormField label="現在のパスワード" htmlFor="currentPassword" error={errors.currentPassword?.message}>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          Google登録のみでパスワードを設定していない場合は空欄のままにしてください
        </p>
      </FormField>

      <FormField label="新しいパスワード" htmlFor="newPassword" required error={errors.newPassword?.message}>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
          aria-invalid={Boolean(errors.newPassword)}
        />
        <p className="mt-2 text-xs text-gray-500">8文字以上で、大文字・小文字・数字を各1文字以上</p>
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
        />
      </FormField>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="inline-flex items-center">
              <Loader2 size={18} className="mr-2 animate-spin" />
              変更中…
            </span>
          ) : (
            'パスワードを変更'
          )}
        </Button>
        {changed && (
          <span className="inline-flex items-center text-sm text-[#059669]" role="status">
            <CheckCircle size={16} className="mr-1" />
            変更しました。他のセッションからはログアウトされました。
          </span>
        )}
      </div>
    </form>
  );
}
