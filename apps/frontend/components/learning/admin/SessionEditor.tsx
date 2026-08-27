'use client';

/**
 * セッション編集フォーム（作成・更新・Markdownプレビュー）
 *
 * - 検証は zod（lib/validation/learning-schema）。サーバ側でも同一形式を検証
 * - 本文 textarea + プレビュー切替（MarkdownContent を再利用）
 * - objectives は「1行1目標」の textarea
 */

import React, { useState } from 'react';
import { Eye, Loader2, Save, X } from 'lucide-react';
import { MarkdownContent } from '../MarkdownContent';
import { learningAdminApi, type SessionDetail, type SessionSummary } from '@/lib/api/learning-api';
import { sessionFormSchema, fieldErrors } from '@/lib/validation/learning-schema';

interface Props {
  /** 編集対象（null なら新規作成） */
  session: SessionDetail | null;
  /** 作成時に必要。編集時は参照しない */
  moduleId: string;
  onSaved: (session: SessionSummary) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#1e3a8a] focus:outline-none';

export function SessionEditor({ session, moduleId, onSaved, onCancel }: Props) {
  const [slug, setSlug] = useState(session?.slug ?? '');
  const [title, setTitle] = useState(session?.title ?? '');
  const [description, setDescription] = useState(session?.description ?? '');
  const [content, setContent] = useState(session?.content ?? '');
  const [durationMinutes, setDurationMinutes] = useState(String(session?.durationMinutes ?? 30));
  const [objectivesText, setObjectivesText] = useState((session?.objectives ?? []).join('\n'));
  const [isPublished, setIsPublished] = useState(session?.isPublished ?? false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    const objectives = objectivesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const parsed = sessionFormSchema.safeParse({
      slug,
      title,
      description,
      content,
      durationMinutes,
      objectives,
      isPublished,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setApiError('');

    try {
      setBusy(true);
      const saved = session
        ? await learningAdminApi.updateSession(session.id, parsed.data)
        : await learningAdminApi.createSession({ moduleId, ...parsed.data });
      onSaved(saved);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{session ? 'セッションを編集' : '新規セッション'}</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              slug <span className="text-gray-400">（URL名: day-01 等）</span>
            </span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={inputClass}
              placeholder="day-02"
              aria-invalid={Boolean(errors.slug)}
            />
            {errors.slug && <span className="block mt-1 text-xs text-[#ef4444]">{errors.slug}</span>}
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">所要時間（分）</span>
            <input
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              inputMode="numeric"
              className={inputClass}
              aria-invalid={Boolean(errors.durationMinutes)}
            />
            {errors.durationMinutes && (
              <span className="block mt-1 text-xs text-[#ef4444]">{errors.durationMinutes}</span>
            )}
          </label>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">タイトル</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && <span className="block mt-1 text-xs text-[#ef4444]">{errors.title}</span>}
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            説明 <span className="text-gray-400">（一覧に表示される短文）</span>
          </span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(errors.description)}
          />
          {errors.description && <span className="block mt-1 text-xs text-[#ef4444]">{errors.description}</span>}
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            目標 <span className="text-gray-400">（1行につき1件）</span>
          </span>
          <textarea
            value={objectivesText}
            onChange={(e) => setObjectivesText(e.target.value)}
            rows={3}
            className={inputClass}
            aria-invalid={Boolean(errors.objectives)}
          />
          {errors.objectives && <span className="block mt-1 text-xs text-[#ef4444]">{errors.objectives}</span>}
        </label>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">本文（Markdown）</span>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-[#1e3a8a] hover:underline"
              aria-pressed={showPreview}
            >
              <Eye size={12} aria-hidden /> {showPreview ? '編集に戻る' : 'プレビュー'}
            </button>
          </div>
          {showPreview ? (
            <div className="border border-gray-200 rounded-lg p-4 min-h-64 bg-gray-50">
              <MarkdownContent content={content} />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              className={`${inputClass} font-mono text-xs`}
              aria-label="本文（Markdown）"
              aria-invalid={Boolean(errors.content)}
            />
          )}
          {errors.content && <span className="block mt-1 text-xs text-[#ef4444]">{errors.content}</span>}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="rounded border-gray-300"
          />
          公開する
        </label>

        {apiError && (
          <p className="text-sm text-[#ef4444]" role="alert">
            {apiError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#1e40af] disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
            保存
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <X size={16} aria-hidden /> キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
