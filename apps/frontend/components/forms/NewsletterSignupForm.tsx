'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Loader2, Mail } from 'lucide-react';
import { newsletterSchema, type NewsletterFormData } from '@/lib/validation/newsletter-schema';
import { useTrackEvent } from '@/lib/analytics/useTrackEvent';

interface NewsletterSignupFormProps {
  variant?: 'footer' | 'inline' | 'popup';
  showNameField?: boolean;
}

export function NewsletterSignupForm({ variant = 'footer', showNameField = false }: NewsletterSignupFormProps) {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const trackEvent = useTrackEvent();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
  });

  const onSubmit = async (data: NewsletterFormData) => {
    try {
      setSubmitStatus('idle');
      setErrorMessage('');

      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, source: variant }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ニュースレターの登録に失敗しました');
      }

      setSubmitStatus('success');
      trackEvent('Newsletter Signup Click', { location: variant });
      reset();

      // Reset success message after 10 seconds
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 10000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'エラーが発生しました。もう一度お試しください。');
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="p-6 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg text-center">
        <CheckCircle className="text-[#10b981] mx-auto mb-3" size={40} />
        <h3 className="text-lg font-bold text-[#111827] mb-2">登録完了</h3>
        <p className="text-[#4b5563] text-sm">
          ニュースレターへの登録が完了しました。
          <br />
          ウェルカムメールをご確認ください。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {submitStatus === 'error' && errorMessage && (
        <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
          <p className="text-[#ef4444] text-sm">{errorMessage}</p>
        </div>
      )}

      {showNameField && (
        <div>
          <label htmlFor="newsletter-name" className="block text-sm font-medium text-[#111827] mb-2">
            お名前（任意）
          </label>
          <input
            id="newsletter-name"
            type="text"
            {...register('name')}
            className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-colors"
            placeholder="山田 太郎"
          />
        </div>
      )}

      <div>
        <label htmlFor="newsletter-email" className="block text-sm font-medium text-[#111827] mb-2">
          メールアドレス
          <span className="text-[#ef4444] ml-1" aria-label="required">
            *
          </span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" size={20} />
          <input
            id="newsletter-email"
            type="email"
            {...register('email')}
            className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-colors ${
              errors.email ? 'border-[#ef4444]' : 'border-[#e5e7eb]'
            }`}
            placeholder="your@email.com"
            aria-required="true"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </div>
        {errors.email && (
          <p id="email-error" role="alert" className="mt-2 text-sm text-[#ef4444]">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Honeypot field - hidden from users */}
      <input
        type="text"
        {...register('website')}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div>
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            {...register('consent')}
            className="mt-1 mr-3 w-5 h-5 text-[#10b981] border-[#e5e7eb] rounded focus:ring-2 focus:ring-[#10b981]"
            aria-required="true"
            aria-invalid={errors.consent ? 'true' : 'false'}
            aria-describedby={errors.consent ? 'consent-error' : undefined}
          />
          <span className="text-sm text-[#4b5563]">
            <a href="/privacy" className="text-[#1e3a8a] hover:underline" target="_blank" rel="noopener noreferrer">
              プライバシーポリシー
            </a>
            に同意します
            <span className="text-[#ef4444] ml-1" aria-label="required">
              *
            </span>
          </span>
        </label>
        {errors.consent && (
          <p id="consent-error" role="alert" className="mt-2 text-sm text-[#ef4444]">
            {errors.consent.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#10b981] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={isSubmitting ? '送信中...' : 'ニュースレターに登録'}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <Loader2 className="animate-spin mr-2" size={20} />
            送信中...
          </span>
        ) : (
          '登録する'
        )}
      </button>
    </form>
  );
}
