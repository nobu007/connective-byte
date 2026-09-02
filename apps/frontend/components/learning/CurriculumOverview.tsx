'use client';

/**
 * カリキュラム一覧（Phase → Module → Session）
 *
 * 目次・タイトルはセールスコピーとして全公開。Weeks 2-12（requiresPurchase）
 * は未購入なら本文がロックされるため locked バッジと「有料」チップを表示。
 * progress はログイン時のみ渡す。
 */

import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, Lock } from 'lucide-react';
import type { PhaseWithModules, ProgressOverview, SessionProgressStatus } from '@/lib/api/learning-api';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';

interface Props {
  phases: PhaseWithModules[];
  progress: ProgressOverview | null;
  /** 受講登録（購入）済みか。未購入だと Week 2 以降がロック表示になる */
  purchased: boolean;
}

export function CurriculumOverview({ phases, progress, purchased }: Props) {
  const statusOf = (sessionId: string): SessionProgressStatus | 'not_started' =>
    progress?.sessions.find((s) => s.sessionId === sessionId)?.status ?? 'not_started';
  const moduleEntry = (moduleId: string) => progress?.modules.find((m) => m.moduleId === moduleId);

  return (
    <div className="space-y-10">
      {phases.map((phase) => (
        <section key={phase.id} aria-labelledby={`phase-${phase.number}`}>
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-wider text-[#10b981] uppercase">
              Phase {phase.number} · Week {phase.startWeek}-{phase.endWeek}
            </p>
            <h2 id={`phase-${phase.number}`} className="text-xl font-bold text-gray-900">
              {phase.title}
            </h2>
            {phase.description && <p className="text-sm text-gray-600">{phase.description}</p>}
          </div>

          <div className="space-y-4">
            {phase.modules.map((module) => {
              const entry = moduleEntry(module.id);
              const locked = Boolean(module.requiresPurchase) && !purchased;
              return (
                <article
                  key={module.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-[#10b981]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/learning/?module=${encodeURIComponent(module.slug)}`}
                        className="font-semibold text-gray-900 hover:text-[#1e3a8a] hover:underline"
                      >
                        <BookOpen size={16} className="inline mr-1.5 text-[#1e3a8a]" aria-hidden />
                        Week {module.weekNumber}: {module.title}
                      </Link>
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
                      {module.description && <p className="mt-1 text-sm text-gray-600">{module.description}</p>}
                    </div>
                    {entry && (
                      <div className="flex-shrink-0 w-32">
                        <ProgressBar completed={entry.completedSessions} total={entry.totalSessions} />
                        <p className="mt-1 text-xs text-gray-500 text-right">
                          {entry.completedSessions}/{entry.totalSessions}
                        </p>
                      </div>
                    )}
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {module.sessions.map((session) => (
                      <li key={session.id} className="flex items-center justify-between gap-2">
                        <Link
                          href={`/learning/?module=${encodeURIComponent(module.slug)}&session=${encodeURIComponent(session.slug)}`}
                          className="text-sm text-gray-700 hover:text-[#1e3a8a] hover:underline truncate"
                        >
                          {session.title}
                        </Link>
                        <span className="flex items-center gap-3 flex-shrink-0">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={12} aria-hidden /> {session.durationMinutes}分
                          </span>
                          <StatusBadge status={locked ? 'locked' : statusOf(session.id)} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
            {phase.modules.length === 0 && (
              <p className="text-sm text-gray-400">この Phase のモジュールはまだ公開されていません。</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
