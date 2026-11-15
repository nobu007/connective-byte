'use client';

/**
 * 受講登録（12週カリキュラム購入）の状態カード
 *
 * 未登録 → Stripe Payment Link への CTA / 登録済み → 付与日と閲覧範囲の表示。
 * poll=true（決済からのリターン直後）は Webhook 付与の反映を待って
 * 3秒毎×最大20回 /api/payments/status をポーリングし、反映されたら
 * onPurchased で AuthProvider の user を更新する。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { AuthUser } from '@/lib/api/auth-api';
import { buildPaymentLink, paymentsApi, PURCHASE_PRICE_LABEL, type PaymentStatus } from '@/lib/api/payments-api';
import { useTrackEvent } from '@/lib/analytics/useTrackEvent';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;

interface Props {
  user: AuthUser;
  /** 受講登録完了後に呼ぶ（AuthProvider の user 再取得で全画面のロックが解ける） */
  onPurchased: () => Promise<void> | void;
  /** ?purchase=success リターン時など、Webhook 反映待ちのポーリングを行う */
  poll?: boolean;
}

export function PurchaseStatusCard({ user, onPurchased, poll = false }: Props) {
  const trackEvent = useTrackEvent();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [polling, setPolling] = useState(poll);
  const attemptsRef = useRef(0);
  const onPurchasedRef = useRef(onPurchased);
  onPurchasedRef.current = onPurchased;

  const fetchStatus = useCallback(async (): Promise<boolean> => {
    const next = await paymentsApi.getStatus();
    setStatus(next);
    return next.purchased;
  }, []);

  // 初回取得。poll=true で既に反映済み（Webhook がポーリング開始前に
  // 間に合った）なら待たずに完了扱いにし、AuthProvider の user も更新する
  useEffect(() => {
    void fetchStatus()
      .then((purchased) => {
        if (purchased && poll) {
          setPolling(false);
          void onPurchasedRef.current();
        }
      })
      .catch(() => {
        // 取得失敗時は status=null のまま未登録ビューを表示（CTA は出る）
      });
  }, [fetchStatus, poll]);

  // 決済リターン直後は Webhook → DB 反映に数秒かかるためポーリングする
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => {
      attemptsRef.current += 1;
      void fetchStatus()
        .then((purchased) => {
          if (purchased) {
            setPolling(false);
            void onPurchasedRef.current();
          } else if (attemptsRef.current >= POLL_MAX_ATTEMPTS) {
            setPolling(false);
          }
        })
        .catch(() => {
          // 一時的な失敗では中断せず次の tick で再試行。上限到達で終了
          if (attemptsRef.current >= POLL_MAX_ATTEMPTS) {
            setPolling(false);
          }
        });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [polling, fetchStatus]);

  const paymentLink = buildPaymentLink(user.id, user.email);

  return (
    <section aria-labelledby="purchase-status" className="mb-8">
      <h2 id="purchase-status" className="sr-only">
        受講登録状況
      </h2>
      {status?.purchased ? (
        <div className="p-4 bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg flex items-start gap-3">
          <CheckCircle2 size={20} className="text-[#10b981] flex-shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-medium text-gray-900">受講登録済み（{PURCHASE_PRICE_LABEL}）</p>
            <p className="mt-1 text-sm text-gray-600">
              Weeks 2-12 の全セッションが閲覧できます。
              {status.purchasedAt && <> 登録日: {new Date(status.purchasedAt).toLocaleDateString('ja-JP')}</>}
            </p>
            <Link href="/learning/" className="mt-2 inline-block text-sm font-medium text-[#1e3a8a] hover:underline">
              カリキュラムへ進む →
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#1e3a8a]/[0.03] border border-[#1e3a8a]/10 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">12週間カリキュラムの受講登録</p>
            <p className="mt-1 text-sm text-gray-600">
              Week 1 は無料。Weeks 2-12 の本編（全セッション）は{PURCHASE_PRICE_LABEL}で解放されます。
            </p>
            {polling && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500" role="status">
                <Loader2 size={12} className="animate-spin" aria-hidden /> 決済の反映を確認しています…
              </p>
            )}
          </div>
          {!polling &&
            (paymentLink ? (
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('Purchase CTA Click', { location: 'mypage' })}
                className="flex-shrink-0 self-center px-4 py-2 rounded-lg bg-[#1e3a8a] text-white text-sm font-semibold hover:bg-[#1e3a8a]/90 transition-colors"
              >
                受講登録する
              </a>
            ) : (
              <p className="flex-shrink-0 self-center text-xs text-gray-400">受講登録は準備中です</p>
            ))}
        </div>
      )}
    </section>
  );
}
