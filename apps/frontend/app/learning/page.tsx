'use client';

/**
 * ラーニング: カリキュラム配信 + 進捗トラッキング + 購入ゲーティング
 *
 * 静的エクスポート（output:'export'）のため動的ルートは使えない。
 * 単一ページ + クエリパラメータで3ビューを切替える:
 *   /learning/                          → カリキュラム一覧
 *   /learning/?module=week-01          → モジュール詳細
 *   /learning/?module=week-01&session=week-01-day-01 → セッション本文
 *
 * 公開ポリシー: Week 1 は無料公開。Weeks 2-12 は受講登録（購入）済みのみ
 * 本文を表示し、未購入は LockedSessionView（受講登録へ導く）になる。
 * useSearchParams は <Suspense> 内で使う（静的exportのビルド要件）。
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
import { PURCHASE_PRICE_LABEL } from '@/lib/api/payments-api';
import { CurriculumOverview } from '@/components/learning/CurriculumOverview';
import { ModuleView } from '@/components/learning/ModuleView';
import { SessionView } from '@/components/learning/SessionView';
import { LockedSessionView } from '@/components/learning/LockedSessionView';
import { ProgressBar } from '@/components/learning/ProgressBar';

function LearningContent() {
  const { user, status: authStatus } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleSlug = searchParams.get('module');
  const sessionSlug = searchParams.get('session');

  const [phases, setPhases] = useState<PhaseWithModules[] | null>(null);
  const [module, setModule] = useState<ModuleWithSessions | null>(null);
  const [session, setSession] = useState<SessionDetail | null>(null);
  /** 403 PAYMENT_001 で弾かれたセッションslug（LockedSessionView 表示の判定） */
  const [lockedSlug, setLockedSlug] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressOverview | null>(null);
  const [error, setError] = useState('');

  // 受講登録済みか（webhook 付与で users.purchasedAt が反映される）
  const purchased = Boolean(user?.purchasedAt);

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
    setLockedSlug(null);
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
        // 有料週はセッション自体は存在するため、404リダイレクトより先に判定する
        if (err instanceof AuthApiError && err.code === 'PAYMENT_001') {
          setLockedSlug(sessionSlug);
          return;
        }
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

  // ロック表示に使う概要（タイトル・目標）は全員同一の curriculum ツリーから引く
  const lockedSummary = useMemo(() => {
    if (!lockedSlug || !phases) return null;
    for (const phase of phases) {
      for (const m of phase.modules) {
        const s = m.sessions.find((x) => x.slug === lockedSlug);
        if (s) return { session: s, module: m };
      }
    }
    return null;
  }, [lockedSlug, phases]);

  const handleProgressChanged = useCallback(() => {
    loadProgress();
  }, [loadProgress]);

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-wider text-[#10b981] uppercase mb-2">12週間カリキュラム</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ラーニング</h1>
          <p className="text-gray-600">
            Week 1 は無料公開。Weeks 2-12 は受講登録（{PURCHASE_PRICE_LABEL}）で解放されます。
          </p>
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

        {lockedSlug && module ? (
          <LockedSessionView
            title={lockedSummary?.session.title ?? null}
            description={lockedSummary?.session.description ?? null}
            objectives={lockedSummary?.session.objectives ?? []}
            moduleTitle={lockedSummary?.module.title ?? module.title}
            moduleSlug={moduleSlug ?? ''}
            sessionSlug={lockedSlug}
            user={user}
          />
        ) : session && module ? (
          <SessionView
            session={session}
            module={module}
            progress={progress}
            onProgressChanged={handleProgressChanged}
          />
        ) : module ? (
          <ModuleView module={module} progress={progress} purchased={purchased} />
        ) : phases ? (
          <CurriculumOverview phases={phases} progress={progress} purchased={purchased} />
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
