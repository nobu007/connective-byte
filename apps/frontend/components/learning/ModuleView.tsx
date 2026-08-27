'use client';

/**
 * モジュール詳細（セッション一覧 + 進捗）
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import type { ModuleWithSessions, ProgressOverview, SessionProgressStatus } from '@/lib/api/learning-api';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';

interface Props {
  module: ModuleWithSessions;
  progress: ProgressOverview | null;
}

export function ModuleView({ module, progress }: Props) {
  const statusOf = (sessionId: string): SessionProgressStatus | 'not_started' =>
    progress?.sessions.find((s) => s.sessionId === sessionId)?.status ?? 'not_started';
  const entry = progress?.modules.find((m) => m.moduleId === module.id);

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
        <h1 className="text-2xl font-bold text-gray-900">{module.title}</h1>
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
              <StatusBadge status={statusOf(session.id)} />
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
