'use client';

/**
 * 管理画面のセッション行（公開切替・並替・削除・編集）
 */

import React from 'react';
import { ArrowDown, ArrowUp, Clock, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import type { SessionSummary } from '@/lib/api/learning-api';

interface Props {
  session: SessionSummary;
  busy: boolean;
  onTogglePublish: (session: SessionSummary) => void;
  onReorder: (session: SessionSummary, direction: 'up' | 'down') => void;
  onEdit: (session: SessionSummary) => void;
  onDelete: (session: SessionSummary) => void;
}

export function SessionRow({ session, busy, onTogglePublish, onReorder, onEdit, onDelete }: Props) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-900 truncate">
          {session.orderIndex}. {session.title}
          {session.isPublished ? (
            <span className="ml-2 text-xs text-[#10b981]">公開中</span>
          ) : (
            <span className="ml-2 text-xs text-gray-400">下書き</span>
          )}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={11} aria-hidden /> {session.slug} · {session.durationMinutes}分
        </span>
      </span>

      <span className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onReorder(session, 'up')}
          disabled={busy}
          aria-label={`${session.title} を上へ移動`}
          className="p-1.5 text-gray-500 hover:text-[#1e3a8a] disabled:opacity-40"
        >
          <ArrowUp size={14} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onReorder(session, 'down')}
          disabled={busy}
          aria-label={`${session.title} を下へ移動`}
          className="p-1.5 text-gray-500 hover:text-[#1e3a8a] disabled:opacity-40"
        >
          <ArrowDown size={14} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onTogglePublish(session)}
          disabled={busy}
          className="p-1.5 text-gray-500 hover:text-[#10b981] disabled:opacity-40"
          aria-label={session.isPublished ? '非公開にする' : '公開する'}
        >
          {session.isPublished ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => onEdit(session)}
          disabled={busy}
          className="p-1.5 text-gray-500 hover:text-[#1e3a8a] disabled:opacity-40"
          aria-label={`${session.title} を編集`}
        >
          <Pencil size={14} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onDelete(session)}
          disabled={busy}
          className="p-1.5 text-gray-400 hover:text-[#ef4444] disabled:opacity-40"
          aria-label={`${session.title} を削除`}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </span>
    </li>
  );
}
