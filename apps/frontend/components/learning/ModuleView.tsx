'use client';

/**
 * モジュール詳細（セッション一覧 + 進捗）
 *
 * Week 2 以降（requiresPurchase）は未購入だとセッションがロック表示に
 * なる（本文は LockedSessionView で受講登録へ導く）。
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Lock } from 'lucide-react';
import type { ModuleWithSessions, ProgressOverview, SessionProgressStatus } from '@/lib/api/learning-api';
import { PURCHASE_PRICE_LABEL } from '@/lib/api/payments-api';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';

interface Props {
  module: ModuleWithSessions;
  progress: ProgressOverview | null;
  /** 受講登録（購入）済みか */
  purchased: boolean;
}

export function ModuleView({ module, progress, purchased }: Props) {
  const statusOf = (sessionId: string): SessionProgressStatus | 'not_started' =>
    progress?.sessions.find((s) => s.sessionId === sessionId)?.status ?? 'not_started';
  const entry = progress?.modules.find((m) => m.moduleId === module.id);
  const locked = Boolean(module.requiresPurchase) && !purchased;

  return (
    <div>
      <Link
        href="/learning/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a8a] mb-4"
      >
        <ArrowLeft size={14} aria-hidden /> カリキュラム一覧へ
      </Link>

      <header className="mb-8">
        <p className="text-xs font-semibold tracking-wider text-[#10b981] uppercase">Week {module.weekNumber}</p>
        <h1 className="text-2xl font-bold text-gray-900">
          {module.title}
          <span
            className={`inline-flex items-center gap-1 ml-2 align-middle text-[11px] font-semibold px-1.5 py-0.5 rounded ${locked ? 'text-[#1e3a8a] bg-[#1e3a8a]/5' : 'text-[#10b981] bg-[#10b981]/5'}`}
          >
            {locked ? (
              <>
                <Lock size={10} aria-hidden /> 有料
              </>
            ) : (
              '無料'
            )}
          </span>
        </h1>
        {module.description && <p className="mt-2 text-gray-600">{module.description}</p>}
        {entry && (
          <div className="mt-4 max-w-xs">
            <ProgressBar completed={entry.completedSessions} total={entry.totalSessions} />
            <p className="mt-1 text-xs text-gray-500">
              {entry.completedSessions}/{entry.totalSessions} セッション完了
            </p>
          </div>
        )}
      </header>

      {locked && (
        <p className="mb-6 p-4 bg-[#1e3a8a]/[0.03] border border-[#1e3a8a]/10 rounded-lg text-sm text-gray-700">
          この週の本文は受講登録（{PURCHASE_PRICE_LABEL}・Weeks 2-12 全て）で解放されます。
          セッションを開くと登録画面が表示されます。
        </p>
      )}

      <ol className="space-y-3">
        {module.sessions.map((session, index) => (
          <li key={session.id}>
            <Link
              href={`/learning/?module=${encodeURIComponent(module.slug)}&session=${encodeURIComponent(session.slug)}`}
              className="flex items-center justify-between gap-4 border border-gray-200 rounded-lg p-4 hover:border-[#10b981]/50 transition-colors"
            >
              <span className="min-w-0">
                <span className="block font-medium text-gray-900">
                  {index + 1}. {session.title}
                </span>
                {session.description && (
                  <span className="block text-sm text-gray-600 truncate">{session.description}</span>
                )}
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} aria-hidden /> {session.durationMinutes}分
                </span>
              </span>
              <StatusBadge status={locked ? 'locked' : statusOf(session.id)} />
            </Link>
          </li>
        ))}
        {module.sessions.length === 0 && (
          <li className="text-sm text-gray-400">セッションはまだ公開されていません。</li>
        )}
      </ol>
    </div>
  );
}
