/**
 * /learning/admin/ 管理画面のテスト
 *
 * - role gate: learner は403パネル（curriculum API も呼ばない）
 * - content_administrator: 一覧 render（公開中/下書き）
 * - 公開切替 → PATCH modules/sessions
 * - 並替 → POST reorder
 * - セッション編集: 詳細取得→フォーム→zod検証（無効slugはPOSTせずエラー表示）
 * - プレビュー描画
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../../../../mocks/server';
import LearningAdminPage from '../page';
import type { PhaseWithModules, SessionDetail } from '@/lib/api/learning-api';
import { setAccessToken } from '@/lib/auth/token-store';

// ---- next/navigation モック（stable な router を返す） ----
const routerState = { replace: jest.fn() };
jest.mock('next/navigation', () => ({
  usePathname: () => '/learning/admin/',
  useRouter: () => routerState,
}));

// ---- 認証状態モック ----
const authState = {
  status: 'unauthenticated' as 'loading' | 'authenticated' | 'unauthenticated',
  user: null as { role: string; fullName: string } | null,
};
jest.mock('../../../../components/auth/AuthProvider', () => ({
  useAuth: () => authState,
}));

// ---- テストデータ ----
const sessionPublished = {
  id: 'sess-1',
  moduleId: 'mod-1',
  slug: 'day-01',
  title: 'AIとは何か',
  description: '導入',
  durationMinutes: 30,
  objectives: ['AIツールの位置づけを説明できる'],
  orderIndex: 1,
  isPublished: true,
};
const sessionDraft = {
  id: 'sess-2',
  moduleId: 'mod-1',
  slug: 'day-02',
  title: 'プロンプトの基本',
  description: null,
  durationMinutes: 45,
  objectives: [],
  orderIndex: 2,
  isPublished: false,
};
const phases: PhaseWithModules[] = [
  {
    id: 'phase-1',
    number: 1,
    title: '基礎構築期',
    description: null,
    startWeek: 1,
    endWeek: 3,
    modules: [
      {
        id: 'mod-1',
        phaseId: 'phase-1',
        slug: 'week-01',
        title: 'AI協働の前提知識',
        description: null,
        weekNumber: 1,
        orderIndex: 1,
        isPublished: true,
        sessions: [sessionPublished, sessionDraft],
      },
    ],
  },
];
const sessionDetail: SessionDetail = {
  ...sessionPublished,
  content: '# 導入\n\n本文です。`onChange={(e) => setValue(e.target.value)}` を含む。',
  moduleSlug: 'week-01',
  moduleTitle: 'AI協働の前提知識',
};

function mockAdminApis() {
  server.use(
    rest.get('**/api/learning/admin/curriculum', (_req, res, ctx) =>
      res(ctx.status(200), ctx.json({ success: true, data: { phases } })),
    ),
    rest.get('**/api/learning/admin/sessions/sess-1', (_req, res, ctx) =>
      res(ctx.status(200), ctx.json({ success: true, data: { session: sessionDetail } })),
    ),
    rest.patch('**/api/learning/admin/sessions/*', (_req, res, ctx) =>
      // 戻り値は一覧再取得で上書きされるため簡易固定
      res(ctx.status(200), ctx.json({ success: true, data: { session: sessionPublished } })),
    ),
  );
}

describe('LearningAdminPage', () => {
  beforeEach(() => {
    authState.status = 'authenticated';
    authState.user = { role: 'content_administrator', fullName: '管理者' };
    setAccessToken('admin-token');
    mockAdminApis();
  });

  it('shows a 403 panel for learners and never fetches the admin tree', async () => {
    authState.user = { role: 'learner', fullName: '学習者' };
    const requests: string[] = [];
    server.use(
      rest.get('**/api/learning/admin/curriculum', (req, res, ctx) => {
        requests.push(req.url.toString());
        return res(ctx.status(200), ctx.json({ success: true, data: { phases } }));
      }),
    );

    render(<LearningAdminPage />);

    expect(await screen.findByRole('heading', { name: 'アクセス権限がありません' })).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('renders the admin tree with publish state', async () => {
    render(<LearningAdminPage />);

    expect(await screen.findByRole('heading', { name: 'コンテンツ管理' })).toBeInTheDocument();
    // 一覧は fetch 後なのでセッション行の到着を待つ
    expect(await screen.findByRole('button', { name: 'AIとは何か を編集' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Phase 1: 基礎構築期/ })).toBeInTheDocument();
    expect(screen.getByText(/Week 1: AI協働の前提知識/)).toBeInTheDocument();
    // 公開状態ラベル（モジュール行・セッション行の両方に出る）
    expect(screen.getAllByText('公開中').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('下書き').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles session publish via PATCH', async () => {
    const patches: string[] = [];
    server.use(
      rest.patch('**/api/learning/admin/sessions/*', (req, res, ctx) => {
        patches.push(JSON.stringify(req.body));
        return res(ctx.status(200), ctx.json({ success: true, data: { session: sessionPublished } }));
      }),
    );

    const user = userEvent.setup();
    render(<LearningAdminPage />);

    const unpublish = await screen.findByRole('button', { name: '非公開にする' });
    await user.click(unpublish);

    await waitFor(() => {
      expect(patches).toEqual([JSON.stringify({ isPublished: false })]);
    });
  });

  it('reorders a session via POST reorder', async () => {
    const bodies: string[] = [];
    server.use(
      rest.post('**/api/learning/admin/sessions/sess-2/reorder', (req, res, ctx) => {
        bodies.push(JSON.stringify(req.body));
        return res(ctx.status(200), ctx.json({ success: true, data: { moved: true } }));
      }),
    );

    const user = userEvent.setup();
    render(<LearningAdminPage />);

    const up = await screen.findByRole('button', { name: 'プロンプトの基本 を上へ移動' });
    await user.click(up);

    await waitFor(() => {
      expect(bodies).toEqual([JSON.stringify({ direction: 'up' })]);
    });
  });

  it('opens the editor, validates with zod, then saves via PATCH', async () => {
    const patches: string[] = [];
    server.use(
      rest.patch('**/api/learning/admin/sessions/*', (req, res, ctx) => {
        patches.push(JSON.stringify(req.body));
        return res(ctx.status(200), ctx.json({ success: true, data: { session: sessionPublished } }));
      }),
    );

    const user = userEvent.setup();
    render(<LearningAdminPage />);

    const edit = await screen.findByRole('button', { name: 'AIとは何か を編集' });
    await user.click(edit);

    // 詳細取得で本文がフォームに入る
    const textarea = await screen.findByRole('textbox', { name: /^本文/ });
    await waitFor(() => {
      expect(textarea).toHaveValue(sessionDetail.content);
    });

    // 無効slug → zodエラー表示・PATCHしない
    const slugInput = screen.getByRole('textbox', { name: /slug/ });
    await user.clear(slugInput);
    await user.type(slugInput, '無効SLUG');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText(/slug は半角英小文字・数字・ハイフン/)).toBeInTheDocument();
    expect(patches).toHaveLength(0);

    // slug を直すと保存される（objectives は配列へ変換）
    await user.clear(slugInput);
    await user.type(slugInput, 'day-01-rev');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(patches).toHaveLength(1);
    });
    const body = JSON.parse(patches[0]) as Record<string, unknown>;
    expect(body.slug).toBe('day-01-rev');
    expect(body.objectives).toEqual(['AIツールの位置づけを説明できる']);
    expect(body.durationMinutes).toBe(30);
    expect(body.isPublished).toBe(true);
  });

  it('renders the markdown preview inside the editor', async () => {
    const user = userEvent.setup();
    render(<LearningAdminPage />);

    await user.click(await screen.findByRole('button', { name: 'AIとは何か を編集' }));
    await screen.findByRole('textbox', { name: /^本文/ });

    const previewToggle = screen.getByRole('button', { name: 'プレビュー' });
    await user.click(previewToggle);

    // Markdown が見出しとして描画される
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '導入' })).toBeInTheDocument();
    });
    // コードサンプルもそのまま含まれる
    expect(screen.getByText(/onChange=\{\(e\) => setValue\(e\.target\.value\)\}/)).toBeInTheDocument();
  });
});
