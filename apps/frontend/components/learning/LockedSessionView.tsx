'use client';

/**
 * 有料週（Weeks 2-12）のロック表示
 *
 * 本文は403 PAYMENT_001で弾かれた際の代替ビュー。タイトル・description・
 * objectives は curriculum ツリー（全員同一のセールスコピー）から表示する。
 * 未ログインならログインへ、ログイン済みなら Stripe Payment Link へ導く。
 */

import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { AuthUser } from '@/lib/api/auth-api';
import { buildPaymentLink, PURCHASE_PRICE_LABEL } from '@/lib/api/payments-api';
import { useTrackEvent } from '@/lib/analytics/useTrackEvent';

interface Props {
  title: string | null;
  description: string | null;
  objectives: string[];
  moduleTitle: string | null;
  moduleSlug: string;
  sessionSlug: string;
  user: AuthUser | null;
}

export function LockedSessionView({
  title,
  description,
  objectives,
  moduleTitle,
  moduleSlug,
  sessionSlug,
  user,
}: Props) {
  const trackEvent = useTrackEvent();
  const paymentLink = user ? buildPaymentLink(user.id, user.email) : null;
  const loginHref = `/login/?next=${encodeURIComponent(`/learning/?module=${moduleSlug}&session=${sessionSlug}`)}`;

  return (
    <div className="border border-gray-200 rounded-lg p-8 text-center">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1e3a8a]/5 text-[#1e3a8a] mb-4">
        <Lock size={24} aria-hidden />
      </span>

      {title && <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>}
      {moduleTitle && <p className="text-sm text-gray-500 mb-4">{moduleTitle}</p>}
      {description && <p className="text-gray-600 mb-6">{description}</p>}

      {objectives.length > 0 && (
        <div className="text-left max-w-md mx-auto mb-8">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">
            このセッションで学べること
          </p>
          <ul className="space-y-1">
            {objectives.map((objective) => (
              <li key={objective} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-[#10b981] mt-0.5" aria-hidden>
                  •
                </span>
                {objective}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-4 bg-[#1e3a8a]/[0.03] border border-[#1e3a8a]/10 rounded-lg">
        <p className="text-sm text-gray-700 mb-4">
          このセッションは Week 2 以降の本編です。受講登録（{PURCHASE_PRICE_LABEL}）で Weeks 2-12
          の全セッションが閲覧できます。
        </p>
        {user ? (
          paymentLink ? (
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('Purchase CTA Click', { location: 'locked-session' })}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#1e3a8a] text-white text-sm font-semibold hover:bg-[#1e3a8a]/90 transition-colors"
            >
              受講登録する（{PURCHASE_PRICE_LABEL}）
            </a>
          ) : (
            <p className="text-sm text-gray-500">受講登録は現在準備中です。しばらくお待ちください。</p>
          )
        ) : (
          <Link
            href={loginHref}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#1e3a8a] text-white text-sm font-semibold hover:bg-[#1e3a8a]/90 transition-colors"
          >
            ログインして受講登録する
          </Link>
        )}
        <p className="mt-3 text-xs text-gray-400">
          <Link href="/learning/" className="underline hover:text-gray-600">
            Week 1 は無料で読めます
          </Link>
        </p>
      </div>
    </div>
  );
}
