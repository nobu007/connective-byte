/**
 * Learning Admin API Integration Tests
 *
 * 管理エンドポイントの role gate（authenticate + authorize）と
 * write 操作（作成・公開切替・reorder・削除）を検証する。
 * トークンは generateToken（実物の JWT 署名）で作り、本番と同じ
 * middleware チェーンを通す。データは learningContainer シングルトンの
 * 一時ファイルにユニーク slug で作成する。
 */

// authenticate が検証する JWT_SECRET を import 前に設定
process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express, { Application } from 'express';
import crypto from 'crypto';
import { authenticate, authorize, generateToken } from '../../../middleware/auth';
import {
  handleGetAdminCurriculum,
  handleCreateModule,
  handleUpdateModule,
  handleDeleteModule,
  handleReorderModule,
  handleGetAdminSession,
  handleCreateSession,
  handleUpdateSession,
  handleDeleteSession,
  handleReorderSession,
} from '../learning.controller';
import { learningContainer } from '../learning.container';

const unique = () => crypto.randomUUID().slice(0, 8);

/** テスト用ユーザーのアクセストークン（実物の署名プロセスを通す） */
function tokenFor(role: string): string {
  return generateToken({ id: crypto.randomUUID(), email: `user-${role}@example.com`, role });
}

describe('Learning Admin API Endpoints', () => {
  let app: Application;
  // supertest の .set(name, value) に spread するためタプル型で保持
  const learnerAuth: [string, string] = ['Authorization', `Bearer ${tokenFor('learner')}`];
  const adminAuth: [string, string] = [
    'Authorization',
    `Bearer ${tokenFor('content_administrator')}`,
  ];

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const adminGuard = [authenticate, authorize('content_administrator', 'system_admin')];
    app.get('/api/learning/admin/curriculum', ...adminGuard, handleGetAdminCurriculum);
    app.post('/api/learning/admin/modules', ...adminGuard, handleCreateModule);
    app.patch('/api/learning/admin/modules/:id', ...adminGuard, handleUpdateModule);
    app.delete('/api/learning/admin/modules/:id', ...adminGuard, handleDeleteModule);
    app.post('/api/learning/admin/modules/:id/reorder', ...adminGuard, handleReorderModule);
    app.get('/api/learning/admin/sessions/:id', ...adminGuard, handleGetAdminSession);
    app.post('/api/learning/admin/sessions', ...adminGuard, handleCreateSession);
    app.patch('/api/learning/admin/sessions/:id', ...adminGuard, handleUpdateSession);
    app.delete('/api/learning/admin/sessions/:id', ...adminGuard, handleDeleteSession);
    app.post('/api/learning/admin/sessions/:id/reorder', ...adminGuard, handleReorderSession);
  });

  describe('role gate', () => {
    it('トークン無しは 401', async () => {
      const response = await request(app).get('/api/learning/admin/curriculum').expect(401);
      expect(response.body.error.code).toBe('AUTH_TOKEN_003');
    });

    it('learner は 403', async () => {
      const response = await request(app)
        .get('/api/learning/admin/curriculum')
        .set(...learnerAuth)
        .expect(403);
      expect(response.body.error.code).toBe('AUTH_002');
    });

    it('content_administrator は 200（未公開込みのツリー）', async () => {
      const suffix = unique();
      await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: '下書きモジュール',
        weekNumber: 1,
      });

      const response = await request(app)
        .get('/api/learning/admin/curriculum')
        .set(...adminAuth)
        .expect(200);

      expect(response.body.success).toBe(true);
      const slugs = response.body.data.phases.flatMap((p: { modules: Array<{ slug: string }> }) =>
        p.modules.map((m) => m.slug)
      );
      expect(slugs).toContain(`week-01-${suffix}`);
    });

    it('system_administrator でなく system_admin が管理者として通る', async () => {
      // system_admin ロールも authorize の許可リストに含まれること
      const response = await request(app)
        .get('/api/learning/admin/curriculum')
        .set('Authorization', `Bearer ${tokenFor('system_admin')}`)
        .expect(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/learning/admin/modules', () => {
    it('管理者はモジュールを作成できる（201）', async () => {
      const response = await request(app)
        .post('/api/learning/admin/modules')
        .set(...adminAuth)
        .send({ slug: `week-02-${unique()}`, title: '新規週', weekNumber: 2 })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.module).toMatchObject({ weekNumber: 2, isPublished: false });
    });

    it('不正な slug は 400 エンベロープ', async () => {
      const response = await request(app)
        .post('/api/learning/admin/modules')
        .set(...adminAuth)
        .send({ slug: 'BAD_SLUG', title: 'x', weekNumber: 1 })
        .expect(400);
      expect(response.body.error.code).toBe('LEARNING_VALIDATION_001');
    });
  });

  describe('POST /api/learning/admin/sessions', () => {
    it('Markdown コードサンプル付き本文をそのまま保存できる', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'W1',
        weekNumber: 1,
      });
      const content =
        '# 本文\n\n```js\nonChange={(e) => setValue(e.target.value)}\n```\n\n<a href="javascript:alert(1)">x</a>';

      const response = await request(app)
        .post('/api/learning/admin/sessions')
        .set(...adminAuth)
        .send({
          moduleId: module.id,
          slug: `day-01-${suffix}`,
          title: 'Day 1',
          content,
          durationMinutes: 60,
          objectives: ['サニタイズ免除の検証'],
        })
        .expect(201);

      // controller 経由で読み戻し（bare express は sanitizeInput を mount していないが、
      // 本番でも免除されるためバイト同一が保証される）
      const session = await learningContainer.learningService.getAdminSession(
        response.body.data.session.id
      );
      expect(session.content).toBe(content);
    });
  });

  describe('PATCH /api/learning/admin/modules/:id', () => {
    it('公開切替（is_published）ができる。進捗行は保持される', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'W1',
        weekNumber: 1,
        isPublished: true,
      });
      const session = await learningContainer.learningService.createSession({
        moduleId: module.id,
        slug: `day-01-${suffix}`,
        title: 'D1',
        content: 'x',
        durationMinutes: 30,
        isPublished: true,
      });

      // 学習者の進捗を記録
      const learnerId = crypto.randomUUID();
      await learningContainer.progressService.setProgress(learnerId, session.id, 'completed');
      let overview = await learningContainer.progressService.getOverview(learnerId);
      expect(overview.overall).toEqual({ completedSessions: 1, totalSessions: 1 });

      // セッションを非公開に
      await request(app)
        .patch(`/api/learning/admin/sessions/${session.id}`)
        .set(...adminAuth)
        .send({ isPublished: false })
        .expect(200);

      // 分母からは外れるが、記録自体は消えない（再公開で復帰）
      overview = await learningContainer.progressService.getOverview(learnerId);
      expect(overview.overall).toEqual({ completedSessions: 0, totalSessions: 0 });
      expect(overview.sessions).toHaveLength(1);
      expect(overview.sessions[0]).toMatchObject({ sessionId: session.id, status: 'completed' });

      // モジュール単位の公開/非公開も同様に切替可
      await request(app)
        .patch(`/api/learning/admin/modules/${module.id}`)
        .set(...adminAuth)
        .send({ isPublished: false })
        .expect(200);
    });
  });

  describe('POST /api/learning/admin/*/:id/reorder', () => {
    it('先頭での up は moved:false（no-op）', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'W1',
        weekNumber: 1,
      });
      const session = await learningContainer.learningService.createSession({
        moduleId: module.id,
        slug: `day-01-${suffix}`,
        title: 'D1',
        content: 'x',
        durationMinutes: 30,
      });

      const response = await request(app)
        .post(`/api/learning/admin/sessions/${session.id}/reorder`)
        .set(...adminAuth)
        .send({ direction: 'up' })
        .expect(200);

      expect(response.body.data.moved).toBe(false);
    });

    it('不正な direction は 400', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'W1',
        weekNumber: 1,
      });
      await request(app)
        .post(`/api/learning/admin/modules/${module.id}/reorder`)
        .set(...adminAuth)
        .send({ direction: 'sideways' })
        .expect(400);
    });

    it('モジュールの down は次と入れ替わる', async () => {
      const suffix = unique();
      const a = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'A',
        weekNumber: 1,
      });
      const b = await learningContainer.learningService.createModule({
        slug: `week-02-${suffix}`,
        title: 'B',
        weekNumber: 2,
      });

      const response = await request(app)
        .post(`/api/learning/admin/modules/${a.id}/reorder`)
        .set(...adminAuth)
        .send({ direction: 'down' })
        .expect(200);
      expect(response.body.data.moved).toBe(true);

      const tree = await learningContainer.learningService.getAdminCurriculum();
      // Phase 0（序文）が先頭のため week-01/02 は Phase 1 = tree[1]
      const slugs = tree[1].modules.filter((m) => m.slug.endsWith(suffix)).map((m) => m.slug);
      expect(slugs).toEqual([`week-02-${suffix}`, `week-01-${suffix}`]);
    });
  });

  describe('DELETE /api/learning/admin/sessions/:id', () => {
    it('削除すると管理取得で 404', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'W1',
        weekNumber: 1,
      });
      const session = await learningContainer.learningService.createSession({
        moduleId: module.id,
        slug: `day-01-${suffix}`,
        title: 'D1',
        content: 'x',
        durationMinutes: 30,
      });

      await request(app)
        .delete(`/api/learning/admin/sessions/${session.id}`)
        .set(...adminAuth)
        .expect(204);

      await request(app)
        .get(`/api/learning/admin/sessions/${session.id}`)
        .set(...adminAuth)
        .expect(404);
    });
  });

  describe('GET /api/learning/admin/sessions/:id', () => {
    it('未公開セッションでも本文付きで取得できる', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'W1',
        weekNumber: 1,
      });
      const session = await learningContainer.learningService.createSession({
        moduleId: module.id,
        slug: `draft-${suffix}`,
        title: '下書き',
        content: '# 下書き本文',
        durationMinutes: 10,
      });

      const response = await request(app)
        .get(`/api/learning/admin/sessions/${session.id}`)
        .set(...adminAuth)
        .expect(200);

      expect(response.body.data.session.content).toBe('# 下書き本文');
      expect(response.body.data.session.isPublished).toBe(false);
    });
  });
});
