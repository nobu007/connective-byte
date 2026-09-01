'use client';

/**
 * ラーニング: カリキュラム配信 + 進捗トラッキング
 *
 * 静的エクスポート（output:'export'）のため動的ルートは使えない。
 * 単一ページ + クエリパラメータで3ビューを切替える:
 *   /learning/                          → カリキュラム一覧
 *   /learning/?module=week-01          → モジュール詳細
 *   /learning/?module=week-01&session=week-01-day-01 → セッション本文
 *
 * useSearchParams は <Suspense> 内で使う（静的exportのビルド要件）。
 * コンテンツは全公開。進捗はログイン時のみ取得・表示。
 */

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  learningApi,
  type PhaseWithModules,
  type ModuleWithSessions,
  type SessionDetail,
  type ProgressOverview,
} from '@/lib/api/learning-api';
import { ApiError as AuthApiError, AUTH_SESSION_EXPIRED } from '@/lib/api/auth-api';
import { CurriculumOverview } from '@/components/learning/CurriculumOverview';
import { ModuleView } from '@/components/learning/ModuleView';
import { SessionView } from '@/components/learning/SessionView';
import { ProgressBar } from '@/components/learning/ProgressBar';

function LearningContent() {
  const { status: authStatus } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleSlug = searchParams.get('module');
  const sessionSlug = searchParams.get('session');

  const [phases, setPhases] = useState<PhaseWithModules[] | null>(null);
  const [module, setModule] = useState<ModuleWithSessions | null>(null);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [progress, setProgress] = useState<ProgressOverview | null>(null);
  const [error, setError] = useState('');

  // カリキュラムツリーは全ビューの骨格のため常に取得
  useEffect(() => {
    let cancelled = false;
    learningApi
      .getCurriculum()
      .then((tree) => {
        if (!cancelled) setPhases(tree);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '読み込みに失敗しました。');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 進捗はログイン時のみ（未ログインの公開閲覧で401を出さない）
  const loadProgress = useCallback(() => {
    if (authStatus !== 'authenticated') {
      setProgress(null);
      return;
    }
    learningApi
      .getProgress()
      .then(setProgress)
      .catch((err) => {
        // セッション期限切れはコンテンツ閲覧を妨げない
        if (!(err instanceof AuthApiError && err.code === AUTH_SESSION_EXPIRED)) {
          setError(err instanceof Error ? err.message : '進捗の取得に失敗しました。');
        }
      });
  }, [authStatus]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // ビューごとの詳細取得（slug 変更・セッション直接指定に追従）
  useEffect(() => {
    let cancelled = false;
    setModule(null);
    setSession(null);
    setError('');
    if (!moduleSlug) return;

    learningApi
      .getModule(moduleSlug)
      .then((data) => {
        if (cancelled) return;
        setModule(data);
        if (sessionSlug) {
          return learningApi.getSession(sessionSlug).then((detail) => {
            if (!cancelled) setSession(detail);
          });
        }
        return undefined;
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AuthApiError && err.code === AUTH_SESSION_EXPIRED) return;
        // セッションが別モジュールの場合も moduleSlug を正として再誘導
        if (err instanceof AuthApiError && err.code === 'LEARNING_SESSION_001') {
          router.replace(`/learning/?module=${encodeURIComponent(moduleSlug)}`);
          return;
        }
        setError(err instanceof Error ? err.message : '読み込みに失敗しました。');
      });
    return () => {
      cancelled = true;
    };
  }, [moduleSlug, sessionSlug, router]);

  const handleProgressChanged = useCallback(() => {
    loadProgress();
  }, [loadProgress]);

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-wider text-[#10b981] uppercase mb-2">12週間βカリキュラム</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ラーニング</h1>
          <p className="text-gray-600">コンテンツは全員に公開。ログインすると進捗を記録できます。</p>
          {progress && progress.overall.totalSessions > 0 && (
            <div className="mt-4 max-w-sm mx-auto">
              <ProgressBar completed={progress.overall.completedSessions} total={progress.overall.totalSessions} />
              <p className="mt-1 text-sm text-gray-500">
                全体の進捗: {progress.overall.completedSessions}/{progress.overall.totalSessions} セッション
              </p>
            </div>
          )}
        </header>

        {error && (
          <p
            className="mb-6 p-4 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-lg text-sm text-[#ef4444]"
            role="alert"
          >
            {error}
          </p>
        )}

        {session && module ? (
          <SessionView
            session={session}
            module={module}
            progress={progress}
            onProgressChanged={handleProgressChanged}
          />
        ) : module ? (
          <ModuleView module={module} progress={progress} />
        ) : phases ? (
          <CurriculumOverview phases={phases} progress={progress} />
        ) : !error ? (
          <div className="flex justify-center py-16" role="status" aria-label="読み込み中">
            <Loader2 size={40} className="text-[#1e3a8a] animate-spin" />
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function LearningPage() {
  return (
    <Suspense
      fallback={
        <main className="pt-24 pb-16">
          <div className="flex justify-center" role="status" aria-label="読み込み中">
            <Loader2 size={40} className="text-[#1e3a8a] animate-spin" />
          </div>
        </main>
      }
    >
      <LearningContent />
    </Suspense>
  );
}
