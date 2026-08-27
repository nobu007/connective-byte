'use client';

/**
 * 学習コンテンツ管理画面（content_administrator / system_admin 専用）
 *
 * - RequireAuth で未ログインは /login/?next= へ
 * - learner には 403 パネル（API も authorize で拒否するため二重防御）
 * - モジュール: 公開切替・並替・削除 / セッション: 作成・編集・公開切替・並替・削除
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  learningAdminApi,
  type PhaseWithModules,
  type SessionDetail,
  type SessionSummary,
} from '@/lib/api/learning-api';
import { AdminModuleList } from '@/components/learning/admin/AdminModuleList';
import { SessionEditor } from '@/components/learning/admin/SessionEditor';

type EditorTarget = { kind: 'new'; moduleId: string } | { kind: 'edit'; session: SessionDetail };

function AdminContent() {
  const { user } = useAuth();
  const [phases, setPhases] = useState<PhaseWithModules[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [editorSession, setEditorSession] = useState<SessionDetail | null>(null);

  const isAdmin = user?.role === 'content_administrator' || user?.role === 'system_admin';

  const reload = useCallback(async () => {
    try {
      const tree = await learningAdminApi.getCurriculum();
      setPhases(tree);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました。');
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin, reload]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        setBusy(true);
        await fn();
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作に失敗しました。');
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const openEditor = useCallback(async (target: EditorTarget) => {
    if (target.kind === 'edit') {
      setEditor(target);
      setEditorSession(target.session);
      return;
    }
    setEditor(target);
    setEditorSession(null);
  }, []);

  /** 一覧の SessionSummary には本文が無いため詳細取得してからエディタを開く */
  const openSessionEditor = useCallback(
    async (summary: SessionSummary) => {
      try {
        setBusy(true);
        const detail = await learningAdminApi.getSession(summary.id);
        await openEditor({ kind: 'edit', session: detail });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'セッションの取得に失敗しました。');
      } finally {
        setBusy(false);
      }
    },
    [openEditor],
  );

  const closeEditor = useCallback(() => {
    setEditor(null);
    setEditorSession(null);
  }, []);

  if (!isAdmin) {
    return (
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="p-6 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-lg text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">アクセス権限がありません</h1>
            <p className="text-sm text-gray-600">この画面はコンテンツ管理者（content_administrator）向けです。</p>
            <Link
              href="/learning/"
              className="inline-block mt-4 px-5 py-2 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#1e40af]"
            >
              ラーニングに戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href="/learning/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a8a] mb-4"
        >
          <ArrowLeft size={14} aria-hidden /> ラーニングへ
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">コンテンツ管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            Markdown 本文のコードサンプルはそのまま保存されます（サニタイズ対象外）。
          </p>
        </header>

        {error && (
          <p
            className="mb-6 p-4 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-lg text-sm text-[#ef4444]"
            role="alert"
          >
            {error}
          </p>
        )}

        {editor ? (
          <SessionEditor
            session={editorSession}
            moduleId={editor.kind === 'new' ? editor.moduleId : ''}
            onSaved={(_session: SessionSummary) => {
              closeEditor();
              void reload();
            }}
            onCancel={closeEditor}
          />
        ) : phases ? (
          <AdminModuleList
            phases={phases}
            busy={busy}
            onToggleModulePublish={(id, next) =>
              void run(() => learningAdminApi.updateModule(id, { isPublished: next }))
            }
            onReorderModule={(id, direction) => void run(() => learningAdminApi.reorderModule(id, direction))}
            onDeleteModule={(id) => {
              if (
                window.confirm(
                  'モジュールを削除すると配下のセッションと学習者の進捗もすべて削除されます。よろしいですか？',
                )
              ) {
                void run(() => learningAdminApi.deleteModule(id));
              }
            }}
            onSessionAction={{
              onTogglePublish: (session) =>
                void run(() =>
                  learningAdminApi.updateSession(session.id, {
                    isPublished: !session.isPublished,
                  }),
                ),
              onReorder: (session, direction) => void run(() => learningAdminApi.reorderSession(session.id, direction)),
              onEdit: (session) => void openSessionEditor(session),
              onDelete: (session) => {
                if (window.confirm(`セッション「${session.title}」を削除します。よろしいですか？`)) {
                  void run(() => learningAdminApi.deleteSession(session.id));
                }
              },
            }}
            onNewSession={(moduleId) => void openEditor({ kind: 'new', moduleId })}
          />
        ) : !error ? (
          <div className="flex justify-center py-16" role="status" aria-label="読み込み中">
            <Loader2 size={40} className="text-[#1e3a8a] animate-spin" />
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function LearningAdminPage() {
  return (
    <RequireAuth>
      <AdminContent />
    </RequireAuth>
  );
}
