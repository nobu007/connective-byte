'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { contactSchema, type ContactFormData } from '@/lib/validation/contact-schema';
import { FormField } from './FormField';
import { FormError } from './FormError';
import { Button } from '@/components/ui/Button';
import { ConversionTracker } from '@/components/analytics/ConversionTracker';

interface ContactFormProps {
  // variant?: 'inline' | 'page'; // Reserved for future use
}

export function ContactForm({}: ContactFormProps) {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setSubmitStatus('idle');
      setErrorMessage('');

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'フォームの送信に失敗しました');
      }

      setSubmitStatus('success');
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'フォームの送信中にエラーが発生しました。もう一度お試しください。',
      );
    }
  };

  if (submitStatus === 'success') {
    return (
      <>
        <ConversionTracker event="Contact Form Submission" />
        <div className="p-8 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg text-center">
          <CheckCircle className="text-[#10b981] mx-auto mb-4" size={48} />
          <h3 className="text-2xl font-bold text-[#111827] mb-2">送信完了</h3>
          <p className="text-[#4b5563] mb-6">
            お問い合わせありがとうございます。
            <br />
            2営業日以内にご連絡させていただきます。
          </p>
          <Button onClick={() => setSubmitStatus('idle')} variant="secondary">
            別のメッセージを送信
          </Button>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-labelledby="contact-form-heading" noValidate>
      {submitStatus === 'error' && errorMessage && (
        <div className="mb-6">
          <FormError message={errorMessage} />
        </div>
      )}

      <FormField label="お名前" htmlFor="name" required error={errors.name?.message}>
        <input
          id="name"
          type="text"
          {...register('name')}
          className={`
            w-full px-4 py-3 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent
            transition-colors
            ${errors.name ? 'border-[#ef4444]' : 'border-[#e5e7eb]'}
          `}
          aria-required="true"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
      </FormField>

      <FormField label="メールアドレス" htmlFor="email" required error={errors.email?.message}>
        <input
          id="email"
          type="email"
          {...register('email')}
          className={`
            w-full px-4 py-3 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent
            transition-colors
            ${errors.email ? 'border-[#ef4444]' : 'border-[#e5e7eb]'}
          `}
          aria-required="true"
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
      </FormField>

      <FormField label="お問い合わせ内容" htmlFor="message" required error={errors.message?.message}>
        <textarea
          id="message"
          rows={6}
          {...register('message')}
          className={`
            w-full px-4 py-3 border rounded-lg resize-none
            focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent
            transition-colors
            ${errors.message ? 'border-[#ef4444]' : 'border-[#e5e7eb]'}
          `}
          aria-required="true"
          aria-invalid={errors.message ? 'true' : 'false'}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
      </FormField>

      <div className="mb-6">
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

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
        ariaLabel={isSubmitting ? '送信中...' : 'フォームを送信'}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} />
            送信中...
          </>
        ) : (
          '送信する'
        )}
      </Button>
    </form>
  );
}
