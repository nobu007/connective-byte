'use client';

/**
 * 管理画面のカリキュラム一覧（Phase → Module → Session）
 *
 * モジュールは import script で作成する前提の最小UI:
 * 公開切替・並替・削除のみ（タイトル編集はセッション側で行う）。
 */

import React from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type { PhaseWithModules, SessionSummary } from '@/lib/api/learning-api';
import { SessionRow } from './SessionRow';

interface Props {
  phases: PhaseWithModules[];
  busy: boolean;
  onToggleModulePublish: (moduleId: string, next: boolean) => void;
  onReorderModule: (moduleId: string, direction: 'up' | 'down') => void;
  onDeleteModule: (moduleId: string) => void;
  onSessionAction: {
    onTogglePublish: (session: SessionSummary) => void;
    onReorder: (session: SessionSummary, direction: 'up' | 'down') => void;
    onEdit: (session: SessionSummary) => void;
    onDelete: (session: SessionSummary) => void;
  };
  onNewSession: (moduleId: string) => void;
}

export function AdminModuleList({
  phases,
  busy,
  onToggleModulePublish,
  onReorderModule,
  onDeleteModule,
  onSessionAction,
  onNewSession,
}: Props) {
  return (
    <div className="space-y-8">
      {phases.map((phase) => (
        <section key={phase.id} aria-labelledby={`admin-phase-${phase.number}`}>
          <h2
            id={`admin-phase-${phase.number}`}
            className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2"
          >
            Phase {phase.number}: {phase.title}
            <span className="ml-2 text-xs font-normal text-gray-400">
              Week {phase.startWeek}-{phase.endWeek}
            </span>
          </h2>

          <div className="mt-4 space-y-4">
            {phase.modules.map((module) => (
              <article key={module.id} className="border border-gray-200 rounded-lg p-4" data-module-slug={module.slug}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      Week {module.weekNumber}: {module.title}
                      {module.isPublished ? (
                        <span className="ml-2 text-xs text-[#10b981]">公開中</span>
                      ) : (
                        <span className="ml-2 text-xs text-gray-400">下書き</span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400">{module.slug}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onReorderModule(module.id, 'up')}
                      disabled={busy}
                      aria-label={`モジュール ${module.title} を上へ移動`}
                      className="p-1.5 text-gray-500 hover:text-[#1e3a8a] disabled:opacity-40"
                    >
                      <ArrowUp size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReorderModule(module.id, 'down')}
                      disabled={busy}
                      aria-label={`モジュール ${module.title} を下へ移動`}
                      className="p-1.5 text-gray-500 hover:text-[#1e3a8a] disabled:opacity-40"
                    >
                      <ArrowDown size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleModulePublish(module.id, !module.isPublished)}
                      disabled={busy}
                      className="p-1.5 text-gray-500 hover:text-[#10b981] disabled:opacity-40"
                      aria-label={module.isPublished ? 'モジュールを非公開にする' : 'モジュールを公開する'}
                    >
                      {module.isPublished ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteModule(module.id)}
                      disabled={busy}
                      className="p-1.5 text-gray-400 hover:text-[#ef4444] disabled:opacity-40"
                      aria-label={`モジュール ${module.title} を削除`}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </div>

                <ul className="mt-2">
                  {module.sessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      busy={busy}
                      onTogglePublish={onSessionAction.onTogglePublish}
                      onReorder={onSessionAction.onReorder}
                      onEdit={onSessionAction.onEdit}
                      onDelete={onSessionAction.onDelete}
                    />
                  ))}
                  {module.sessions.length === 0 && (
                    <li className="py-2 text-sm text-gray-400">セッションがありません。</li>
                  )}
                </ul>

                <button
                  type="button"
                  onClick={() => onNewSession(module.id)}
                  disabled={busy}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-[#1e3a8a] hover:underline disabled:opacity-40"
                >
                  <Plus size={14} aria-hidden /> セッションを追加
                </button>
              </article>
            ))}
            {phase.modules.length === 0 && (
              <p className="text-sm text-gray-400">
                この Phase のモジュールはまだありません（import script で作成できます）。
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
