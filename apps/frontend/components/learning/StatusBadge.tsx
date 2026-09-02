'use client';

/**
 * セッションの進捗バッジ（未着手 / 進行中 / 完了 / ロック）
 */

import React from 'react';
import { Circle, CircleDot, CheckCircle2, Lock } from 'lucide-react';
import type { SessionProgressStatus } from '@/lib/api/learning-api';

export function StatusBadge({ status }: { status: SessionProgressStatus | 'not_started' | 'locked' }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#10b981]">
        <CheckCircle2 size={14} aria-hidden /> 完了
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#f97316]">
        <CircleDot size={14} aria-hidden /> 進行中
      </span>
    );
  }
  if (status === 'locked') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a8a]">
        <Lock size={14} aria-hidden /> 受講登録が必要
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
      <Circle size={14} aria-hidden /> 未着手
    </span>
  );
}
