/**
 * Learning API Integration Tests
 *
 * 公開読み取りエンドポイント（認証不要）の HTTP 挙動を検証する。
 * handler を直接マウントして rate limiter を介さない（auth-api.test.ts と同じ手法）。
 * テストデータは learningContainer のシングルトン（LEARNING_DB_PATH の一時ファイル）に
 * ユニーク slug で作成する。
 */

import request from 'supertest';
import express, { Application } from 'express';
import crypto from 'crypto';
import { handleGetCurriculum, handleGetModule, handleGetSession } from '../learning.controller';
import { learningContainer } from '../learning.container';
import learningRoutes from '../../../routes/learningRoutes';

// ファイル内で衝突しないユニーク slug 接尾辞
const unique = () => crypto.randomUUID().slice(0, 8);

describe('Learning API Endpoints (public read)', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.get('/api/learning/curriculum', handleGetCurriculum);
    app.get('/api/learning/modules/:moduleSlug', handleGetModule);
    app.get('/api/learning/sessions/:sessionSlug', handleGetSession);
  });

  describe('GET /api/learning/curriculum', () => {
    it('phase ツリーを success エンベロープで返し Cache-Control を付ける', async () => {
      const response = await request(app).get('/api/learning/curriculum').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.phases)).toBe(true);
      // Json 実装は4 Phase（0=序文 + 1-3）を自動シードする
      expect(response.body.data.phases.map((p: { number: number }) => p.number)).toEqual([
        0, 1, 2, 3,
      ]);
      expect(response.headers['cache-control']).toContain('max-age=60');
      expect(response.headers['cache-control']).toContain('stale-while-revalidate');
    });
  });

  describe('GET /api/learning/modules/:moduleSlug', () => {
    it('公開モジュールをセッション一覧付きで返す', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'Week 1 テスト',
        weekNumber: 1,
        isPublished: true,
      });
      await learningContainer.learningService.createSession({
        moduleId: module.id,
        slug: `day-01-${suffix}`,
        title: 'Day 1',
        content: '# 本文',
        durationMinutes: 30,
        isPublished: true,
      });

      const response = await request(app)
        .get(`/api/learning/modules/week-01-${suffix}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.module.slug).toBe(`week-01-${suffix}`);
      expect(response.body.data.module.sessions).toHaveLength(1);
      expect(response.body.data.module.sessions[0].content).toBeUndefined();
      expect(response.headers['cache-control']).toContain('max-age=60');
    });

    it('未知の slug は error エンベロープの 404', async () => {
      const response = await request(app).get('/api/learning/modules/nope').expect(404);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.code).toBe('LEARNING_MODULE_001');
      expect(response.body.error.message).toBeDefined();
    });

    it('未公開モジュールは 404', async () => {
      const suffix = unique();
      await learningContainer.learningService.createModule({
        slug: `week-02-${suffix}`,
        title: '下書き',
        weekNumber: 2,
      });

      await request(app).get(`/api/learning/modules/week-02-${suffix}`).expect(404);
    });
  });

  describe('GET /api/learning/sessions/:sessionSlug', () => {
    it('本文（Markdown）を含むセッション詳細を返す', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'W1',
        weekNumber: 1,
        isPublished: true,
      });
      await learningContainer.learningService.createSession({
        moduleId: module.id,
        slug: `day-01-${suffix}`,
        title: 'Day 1',
        content: '# 見出し\n\n```js\nonChange={(e) => setValue(e)}\n```',
        durationMinutes: 45,
        objectives: ['目标1'],
        isPublished: true,
      });

      const response = await request(app)
        .get(`/api/learning/sessions/day-01-${suffix}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session.content).toContain('onChange={(e) => setValue(e)}');
      expect(response.body.data.session.moduleSlug).toBe(`week-01-${suffix}`);
      expect(response.body.data.session.objectives).toEqual(['目标1']);
    });

    it('未公開セッションは 404', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'W1',
        weekNumber: 1,
        isPublished: true,
      });
      await learningContainer.learningService.createSession({
        moduleId: module.id,
        slug: `draft-${suffix}`,
        title: '下書き',
        content: 'x',
        durationMinutes: 10,
      });

      const response = await request(app).get(`/api/learning/sessions/draft-${suffix}`).expect(404);
      expect(response.body.error.code).toBe('LEARNING_SESSION_001');
    });

    it('親モジュールが未公開のセッションも 404', async () => {
      const suffix = unique();
      const module = await learningContainer.learningService.createModule({
        slug: `week-01-${suffix}`,
        title: 'W1',
        weekNumber: 1,
      });
      await learningContainer.learningService.createSession({
        moduleId: module.id,
        slug: `orphan-${suffix}`,
        title: '孤立',
        content: 'x',
        durationMinutes: 10,
        isPublished: true,
      });

      await request(app).get(`/api/learning/sessions/orphan-${suffix}`).expect(404);
    });

    it('未知の slug は error エンベロープの 404', async () => {
      const response = await request(app).get('/api/learning/sessions/nope').expect(404);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.code).toBe('LEARNING_SESSION_001');
    });
  });

  describe('UUID パラメータ検証（実 router マウント）', () => {
    // Postgres の uuid 構文エラー（500）を路由で防止する router.param の検証。
    // param 検証はハンドラより先に走るため認証無しでも 400 になる。
    let routerApp: Application;

    beforeEach(() => {
      routerApp = express();
      routerApp.use(express.json());
      routerApp.use(learningRoutes);
    });

    it('不正な sessionId への進捗 PUT は 400', async () => {
      const response = await request(routerApp)
        .put('/api/learning/progress/sessions/not-a-uuid')
        .send({ status: 'completed' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('LEARNING_VALIDATION_001');
    });

    it('不正な管理 :id も 400', async () => {
      await request(routerApp).get('/api/learning/admin/sessions/zzz').expect(400);
    });
  });
});
