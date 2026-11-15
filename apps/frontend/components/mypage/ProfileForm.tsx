'use client';

/**
 * マイページ - プロフィールタブ
 * fullName / bio / timezone / githubUsername の更新（空文字は null でクリア）
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { authApi, type AuthUser } from '@/lib/api/auth-api';
import { profileSchema, type ProfileFormData } from '@/lib/validation/auth-schema';
import { FormField } from '@/components/forms/FormField';
import { FormError } from '@/components/forms/FormError';
import { Button } from '@/components/ui/Button';

interface ProfileFormProps {
  user: AuthUser;
  /** 更新成功時に AuthProvider の状態へ反映 */
  onUpdated: (user: AuthUser) => void;
}

export function ProfileForm({ user, onUpdated }: ProfileFormProps) {
  const [errorMessage, setErrorMessage] = useState('');
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      bio: user.bio ?? '',
      timezone: user.timezone,
      githubUsername: user.githubUsername ?? '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setErrorMessage('');
      setSaved(false);
      const profile = await authApi.updateProfile({
        fullName: data.fullName.trim(),
        bio: data.bio.trim() === '' ? null : data.bio,
        timezone: data.timezone.trim() === '' ? 'UTC' : data.timezone.trim(),
        githubUsername: data.githubUsername.trim() === '' ? null : data.githubUsername.trim(),
      });
      onUpdated(profile.user);
      setSaved(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存に失敗しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
      {errorMessage && (
        <div className="mb-6">
          <FormError message={errorMessage} />
        </div>
      )}

      <FormField label="お名前" htmlFor="fullName" required error={errors.fullName?.message}>
        <input
          id="fullName"
          type="text"
          {...register('fullName')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
          aria-invalid={Boolean(errors.fullName)}
        />
      </FormField>

      <FormField label="メールアドレス" htmlFor="email-readonly">
        <input
          id="email-readonly"
          type="email"
          value={user.email}
          readOnly
          className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
        />
        <p className="mt-2 text-xs text-gray-500">メールアドレスの変更は現在サポートしていません</p>
      </FormField>

      <FormField label="自己紹介" htmlFor="bio" error={errors.bio?.message}>
        <textarea
          id="bio"
          rows={4}
          {...register('bio')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
          aria-invalid={Boolean(errors.bio)}
        />
        <p className="mt-2 text-xs text-gray-500">500文字以内</p>
      </FormField>

      <FormField label="タイムゾーン" htmlFor="timezone" error={errors.timezone?.message}>
        <input
          id="timezone"
          type="text"
          placeholder="Asia/Tokyo"
          {...register('timezone')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
          aria-invalid={Boolean(errors.timezone)}
        />
      </FormField>

      <FormField label="GitHubユーザー名" htmlFor="githubUsername" error={errors.githubUsername?.message}>
        <input
          id="githubUsername"
          type="text"
          {...register('githubUsername')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
          aria-invalid={Boolean(errors.githubUsername)}
        />
      </FormField>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="inline-flex items-center">
              <Loader2 size={18} className="mr-2 animate-spin" />
              保存中…
            </span>
          ) : (
            '保存する'
          )}
        </Button>
        {saved && (
          <span className="inline-flex items-center text-sm text-[#059669]" role="status">
            <CheckCircle size={16} className="mr-1" />
            保存しました
          </span>
        )}
      </div>
    </form>
  );
}
