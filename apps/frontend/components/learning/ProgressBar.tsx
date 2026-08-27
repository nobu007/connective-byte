'use client';

/**
 * 進捗バー（completed / total）。total=0 は 0% 表示。
 */

import React from 'react';

export function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div
      className="w-full bg-gray-200 rounded-full h-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={`進捗 ${completed}/${total}`}
    >
      <div className="bg-[#10b981] h-2 rounded-full transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}
