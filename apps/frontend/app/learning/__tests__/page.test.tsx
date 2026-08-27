/**
 * /learning/ ページのテスト
 *
 * - カリキュラム一覧（未ログイン: 進捗なしで公開閲覧）
 * - ?module= でモジュール詳細
 * - ?module=&session= でセッション本文（ログイン時: 完了ボタン→PUT progress→進捗再取得）
 * - 未ログインのセッション本文: ログインCTA（進捗APIは呼ばない）
 * - APIエラーの表示
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../../../mocks/server';
import LearningPage from '../page';
import type { PhaseWithModules, ModuleWithSessions, SessionDetail } from '@/lib/api/learning-api';
import { setAccessToken } from '@/lib/auth/token-store';

// ---- next/navigation モック（クエリパラメータをテストごとに差し替え） ----
// router は毎レンダー同一オブジェクトを返すこと（本物の useRouter は stable。
// 新オブジェクトを返すとページ側 effect の依存配列が毎レンダー変化し、
// 無限再取得+クリック直前のアンマウントが起きる）
let queryParams: Record<string, string> = {};
const routerState = { replace: jest.fn() };
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(queryParams),
  useRouter: () => routerState,
}));

// ---- 認証状態モック ----
const authState = {
  status: 'unauthenticated' as 'loading' | 'authenticated' | 'unauthenticated',
};
// 注意: jest.mock のモジュール解決は @/ エイリアスを辿れないため相対パスで指定
// （Navigation.test.tsx と同じ慣行。コンポーネント側の @/ import は同一ファイルへ解決される）
jest.mock('../../../components/auth/AuthProvider', () => ({
  useAuth: () => authState,
}));

// ---- テストデータ ----
const phase: PhaseWithModules = {
  id: 'phase-1',
  number: 1,
  title: '基礎構築期',
  description: 'Week 1-3',
  startWeek: 1,
  endWeek: 3,
  modules: [
    {
      id: 'mod-1',
      phaseId: 'phase-1',
      slug: 'week-01',
      title: 'AI協働の前提知識',
      description: '最初の1週',
      weekNumber: 1,
      orderIndex: 1,
      isPublished: true,
      sessions: [
        {
          id: 'sess-1',
          moduleId: 'mod-1',
          slug: 'day-01',
          title: 'AIとは何か',
          description: '導入',
          durationMinutes: 30,
          objectives: ['AIツールの位置づけを説明できる'],
          orderIndex: 1,
          isPublished: true,
        },
      ],
    },
  ],
};

const moduleDetail: ModuleWithSessions = phase.modules[0];

const sessionDetail: SessionDetail = {
  ...moduleDetail.sessions[0],
  content: '# 導入\n\nこれは本文です。`onChange={...}` を含むコードもそのまま表示する。',
  moduleSlug: 'week-01',
  moduleTitle: moduleDetail.title,
};

function mockLearningApis(overrides?: { curriculumStatus?: number }) {
  server.use(
    rest.get('**/api/learning/curriculum', (_req, res, ctx) =>
      overrides?.curriculumStatus
        ? res(
            ctx.status(overrides.curriculumStatus),
            ctx.json({ error: { code: 'INTERNAL_001', message: 'サーバーエラー' } }),
          )
        : res(ctx.status(200), ctx.json({ success: true, data: { phases: [phase] } })),
    ),
    rest.get('**/api/learning/modules/week-01', (_req, res, ctx) =>
      res(ctx.status(200), ctx.json({ success: true, data: { module: moduleDetail } })),
    ),
    rest.get('**/api/learning/sessions/day-01', (_req, res, ctx) =>
      res(ctx.status(200), ctx.json({ success: true, data: { session: sessionDetail } })),
    ),
  );
}

describe('LearningPage', () => {
  beforeEach(() => {
    queryParams = {};
    authState.status = 'unauthenticated';
    setAccessToken(null);
    routerState.replace.mockClear();
    mockLearningApis();
  });

  it('renders the curriculum overview for anonymous visitors', async () => {
    render(<LearningPage />);

    // h1 は静的・overview は fetch 後なので h2 到着を待つ
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: '基礎構築期' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 1, name: 'ラーニング' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AIとは何か/ })).toBeInTheDocument();
    // 未ログインは未着手バッジ（進捗APIを呼ばない）
    expect(screen.getByText('未着手')).toBeInTheDocument();
  });

  it('does not call the progress API when unauthenticated', async () => {
    const progressRequests: string[] = [];
    server.use(
      rest.get('**/api/learning/progress', (req, res, ctx) => {
        progressRequests.push(req.url.toString());
        return res(ctx.status(200), ctx.json({ success: true, data: emptyOverview() }));
      }),
    );

    render(<LearningPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: '基礎構築期' })).toBeInTheDocument();
    });

    expect(progressRequests).toHaveLength(0);
  });

  it('renders the module view for ?module=', async () => {
    queryParams = { module: 'week-01' };
    render(<LearningPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /AI協働の前提知識/ })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /AIとは何か/ })).toHaveAttribute(
      'href',
      // next/link の正規化: ? 直前の trailing slash は除去される
      '/learning?module=week-01&session=day-01',
    );
    expect(screen.getByText('Week 1')).toBeInTheDocument();
  });

  it('renders session content with markdown body', async () => {
    queryParams = { module: 'week-01', session: 'day-01' };
    render(<LearningPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'AIとは何か' })).toBeInTheDocument();
    });
    // 目標ボックス
    expect(screen.getByText('このセッションの目標')).toBeInTheDocument();
    // Markdown 本文が描画される（コード含む）
    expect(screen.getByText('導入', { selector: 'h1,h2,h3' })).toBeInTheDocument();
    expect(screen.getByText(/onChange=\{...\}/)).toBeInTheDocument();
  });

  describe('authenticated', () => {
    beforeEach(() => {
      authState.status = 'authenticated';
      setAccessToken('test-token');
    });

    it('shows the complete toggle and PUTs progress, then refreshes overview', async () => {
      const putBodies: string[] = [];
      let completed: 0 | 1 = 0;
      server.use(
        rest.get('**/api/learning/progress', (_req, res, ctx) =>
          res(ctx.status(200), ctx.json({ success: true, data: overviewWithCompleted(completed) })),
        ),
        rest.put('**/api/learning/progress/sessions/*', (req, res, ctx) => {
          putBodies.push(JSON.stringify(req.body));
          completed = 1;
          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: {
                progress: {
                  sessionId: 'sess-1',
                  status: 'completed',
                  startedAt: '2026-08-01T00:00:00Z',
                  completedAt: '2026-08-28T00:00:00Z',
                },
              },
            }),
          );
        }),
      );

      queryParams = { module: 'week-01', session: 'day-01' };
      const user = userEvent.setup();
      render(<LearningPage />);

      const complete = await screen.findByRole('button', { name: /完了にする/ });
      await user.click(complete);

      await waitFor(() => {
        expect(putBodies).toEqual([JSON.stringify({ status: 'completed' })]);
      });
      // onProgressChanged で overview 再取得 → 全体進捗が 1/1 に更新される
      await waitFor(() => {
        expect(screen.getByText(/全体の進捗: 1\/1/)).toBeInTheDocument();
      });
    });

    it('reflects existing progress as the revert button', async () => {
      server.use(
        rest.get('**/api/learning/progress', (_req, res, ctx) =>
          res(ctx.status(200), ctx.json({ success: true, data: overviewWithCompleted(1) })),
        ),
      );

      queryParams = { module: 'week-01', session: 'day-01' };
      render(<LearningPage />);

      expect(await screen.findByRole('button', { name: /完了を解除する/ })).toBeInTheDocument();
      expect(screen.getByText('完了')).toBeInTheDocument();
    });
  });

  it('shows a login CTA instead of the progress button when unauthenticated', async () => {
    queryParams = { module: 'week-01', session: 'day-01' };
    render(<LearningPage />);

    const cta = await screen.findByRole('link', { name: /ログインして進捗を記録する/ });
    expect(cta).toHaveAttribute(
      'href',
      // next/link の正規化でパス部は /login（next 値は encodeURIComponent 済みのまま）
      '/login?next=' + encodeURIComponent('/learning/?module=week-01&session=day-01'),
    );
    expect(screen.queryByRole('button', { name: /完了にする/ })).not.toBeInTheDocument();
  });

  it('renders an error message when the curriculum API fails', async () => {
    mockLearningApis({ curriculumStatus: 500 });
    render(<LearningPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('サーバーエラー');
    });
  });
});

// ---- overview helpers ----

function emptyOverview() {
  return {
    sessions: [],
    modules: [],
    overall: { completedSessions: 0, totalSessions: 1 },
  };
}

function overviewWithCompleted(completed: 0 | 1) {
  return {
    sessions:
      completed === 1
        ? [
            {
              sessionId: 'sess-1',
              status: 'completed' as const,
              startedAt: '2026-08-01T00:00:00Z',
              completedAt: '2026-08-28T00:00:00Z',
            },
          ]
        : [],
    modules: [
      {
        moduleId: 'mod-1',
        moduleSlug: 'week-01',
        moduleTitle: moduleDetail.title,
        completedSessions: completed,
        totalSessions: 1,
      },
    ],
    overall: { completedSessions: completed, totalSessions: 1 },
  };
}
