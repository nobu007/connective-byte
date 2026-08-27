'use client';

/**
 * セッション本文ビュー
 *
 * - 本文は全公開（未ログインでも閲覧可）
 * - 進捗ボタンはログイン時のみ。未ログインは /login/?next= への CTA
 * - 前/次セッションナビは同じモジュール内で移動する
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Clock, Loader2, Target } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  learningApi,
  type ModuleWithSessions,
  type ProgressOverview,
  type SessionDetail,
  type SessionProgressStatus,
} from '@/lib/api/learning-api';
import { MarkdownContent } from './MarkdownContent';
import { StatusBadge } from './StatusBadge';

interface Props {
  session: SessionDetail;
  module: ModuleWithSessions;
  progress: ProgressOverview | null;
  /** 完了切替後に進捗を再取得するためのコールバック（/learning/ ページが保持） */
  onProgressChanged: () => void;
}

export function SessionView({ session, module, progress, onProgressChanged }: Props) {
  const { status: authStatus } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const record = progress?.sessions.find((s) => s.sessionId === session.id);
  const currentStatus: SessionProgressStatus | 'not_started' = record?.status ?? 'not_started';

  // 前/次（同じモジュール内・orderIndex 順）
  const index = module.sessions.findIndex((s) => s.id === session.id);
  const prev = index > 0 ? module.sessions[index - 1] : null;
  const next = index >= 0 && index < module.sessions.length - 1 ? module.sessions[index + 1] : null;

  const handleToggle = async () => {
    const nextStatus: SessionProgressStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    try {
      setBusy(true);
      setError('');
      await learningApi.setProgress(session.id, nextStatus);
      onProgressChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '進捗の更新に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article>
      <Link
        href={`/learning/?module=${encodeURIComponent(session.moduleSlug)}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a8a] mb-4"
      >
        <ArrowLeft size={14} aria-hidden /> {session.moduleTitle} のセッション一覧へ
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          <StatusBadge status={currentStatus} />
        </div>
        {session.description && <p className="mt-2 text-gray-600">{session.description}</p>}
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-gray-400">
          <Clock size={14} aria-hidden /> 所要時間 約{session.durationMinutes}分
        </p>
      </header>

      {session.objectives.length > 0 && (
        <div className="mb-8 p-4 bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-2">
            <Target size={16} className="text-[#10b981]" aria-hidden /> このセッションの目標
          </h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {session.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
      )}

      <MarkdownContent content={session.content} />

      {error && (
        <p className="mt-6 text-sm text-[#ef4444]" role="alert">
          {error}
        </p>
      )}

      <div className="mt-10 pt-6 border-t border-gray-200">
        {authStatus === 'authenticated' ? (
          <button
            onClick={() => void handleToggle()}
            disabled={busy}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              currentStatus === 'completed'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-[#10b981] text-white hover:bg-[#059669]'
            }`}
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : currentStatus === 'completed' ? (
              <CircleDot size={18} aria-hidden />
            ) : (
              <CheckCircle2 size={18} aria-hidden />
            )}
            {currentStatus === 'completed' ? '完了を解除する' : '完了にする'}
          </button>
        ) : (
          authStatus === 'unauthenticated' && (
            <div className="p-4 bg-[#1e3a8a]/5 border border-[#1e3a8a]/20 rounded-lg">
              <p className="text-sm text-gray-700">
                進捗を記録するにはログインが必要です（コンテンツは引き続き閲覧できます）。
              </p>
              <Link
                href={`/login/?next=${encodeURIComponent(`/learning/?module=${session.moduleSlug}&session=${session.slug}`)}`}
                className="inline-block mt-3 px-5 py-2 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#1e40af]"
              >
                ログインして進捗を記録する
              </Link>
            </div>
          )
        )}
      </div>

      <nav className="mt-8 flex justify-between gap-4" aria-label="セッションナビゲーション">
        {prev ? (
          <Link
            href={`/learning/?module=${encodeURIComponent(session.moduleSlug)}&session=${encodeURIComponent(prev.slug)}`}
            className="flex-1 max-w-xs border border-gray-200 rounded-lg p-3 hover:border-[#10b981]/50 transition-colors"
          >
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <ArrowLeft size={12} aria-hidden /> 前へ
            </span>
            <span className="block text-sm font-medium text-gray-900 truncate">{prev.title}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/learning/?module=${encodeURIComponent(session.moduleSlug)}&session=${encodeURIComponent(next.slug)}`}
            className="flex-1 max-w-xs border border-gray-200 rounded-lg p-3 text-right hover:border-[#10b981]/50 transition-colors"
          >
            <span className="flex items-center justify-end gap-1 text-xs text-gray-400">
              次へ <ArrowRight size={12} aria-hidden />
            </span>
            <span className="block text-sm font-medium text-gray-900 truncate">{next.title}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>
    </article>
  );
}
