/**
 * Progress API / Service Tests
 *
 * 進捗 upsert の冪等性・トグル挙動・overview 集計（未公開は分母外）・
 * 学習者間の分離・API の認証と入力検証をカバーする。
 * Phase 1 で実装済みの progress-service / progress ルートに対する検証。
 */

// authenticate が検証する JWT_SECRET を import 前に設定
process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express, { Application } from 'express';
import crypto from 'crypto';
import { authenticate, generateToken } from '../../../middleware/auth';
import { handleGetProgress, handleSetProgress } from '../learning.controller';
import { learningContainer } from '../learning.container';

const unique = () => crypto.randomUUID().slice(0, 8);

/** Phase 1..3 で使う学習者トークン（learner role） */
const learnerId = crypto.randomUUID();
const learnerAuth: [string, string] = [
  'Authorization',
  `Bearer ${generateToken({ id: learnerId, email: 'learner@example.com', role: 'learner' })}`,
];

/** 公開モジュール + 公開セッション2件 + 非公開セッション1件 を作る */
async function seedCurriculum(suffix: string) {
  const service = learningContainer.learningService;
  const module = await service.createModule({
    slug: `week-01-${suffix}`,
    title: 'W1',
    weekNumber: 1,
    isPublished: true,
  });
  const day1 = await service.createSession({
    moduleId: module.id,
    slug: `day-01-${suffix}`,
    title: 'D1',
    content: 'x',
    durationMinutes: 30,
    isPublished: true,
  });
  const day2 = await service.createSession({
    moduleId: module.id,
    slug: `day-02-${suffix}`,
    title: 'D2',
    content: 'y',
    durationMinutes: 30,
    isPublished: true,
  });
  const draft = await service.createSession({
    moduleId: module.id,
    slug: `draft-${suffix}`,
    title: '下書き',
    content: 'z',
    durationMinutes: 10,
  });
  return { module, day1, day2, draft };
}

describe('ProgressService', () => {
  it('upsert は冪等: status 往復でも started_at は初回時刻を保持する', async () => {
    const suffix = unique();
    const { day1 } = await seedCurriculum(suffix);
    const otherLearner = crypto.randomUUID();
    const progress = learningContainer.progressService;

    const first = await progress.setProgress(otherLearner, day1.id, 'in_progress');
    expect(first.status).toBe('in_progress');
    expect(first.completedAt).toBeNull();

    // completed → in_progress → completed と往復
    await progress.setProgress(otherLearner, day1.id, 'completed');
    const reverted = await progress.setProgress(otherLearner, day1.id, 'in_progress');
    expect(reverted.completedAt).toBeNull(); // 解除で completed_at はクリア
    expect(reverted.startedAt).toBe(first.startedAt); // started_at は不変

    const again = await progress.setProgress(otherLearner, day1.id, 'completed');
    expect(again.completedAt).not.toBeNull();
    expect(again.startedAt).toBe(first.startedAt);
  });

  it('未知の sessionId は 404', async () => {
    await expect(
      learningContainer.progressService.setProgress(
        crypto.randomUUID(),
        crypto.randomUUID(),
        'completed'
      )
    ).rejects.toMatchObject({ code: 'LEARNING_PROGRESS_001', httpStatus: 404 });
  });

  it('未公開セッションへの進捗記録は 404', async () => {
    const suffix = unique();
    const { draft } = await seedCurriculum(suffix);
    await expect(
      learningContainer.progressService.setProgress(crypto.randomUUID(), draft.id, 'completed')
    ).rejects.toMatchObject({ code: 'LEARNING_PROGRESS_001', httpStatus: 404 });
  });

  it('overview: 未公開セッションは分母外・セッション0件のモジュールは除外・学習者間は分離', async () => {
    const suffix = unique();
    const { day1, draft } = await seedCurriculum(suffix);
    const me = crypto.randomUUID();
    const other = crypto.randomUUID();
    const progress = learningContainer.progressService;

    // 私は day1 を完了。他人は day1 と下書きに記録を試みる（下書きは404）
    await progress.setProgress(me, day1.id, 'completed');
    await progress.setProgress(other, day1.id, 'completed');

    // シングルトンDBには他テストのモジュールも残るため、対象モジュールの行で検証
    const entryOf = (overview: { modules: Array<{ moduleSlug: string }> }, slug: string) =>
      overview.modules.find((m) => m.moduleSlug === slug);

    const mine = await progress.getOverview(me);
    expect(entryOf(mine, `week-01-${suffix}`)).toMatchObject({
      completedSessions: 1,
      totalSessions: 2, // day2 は未完了・draft は分母外
    });

    // 他学習者の記録は見えない
    expect(mine.sessions).toHaveLength(1);
    expect(mine.sessions[0].sessionId).toBe(day1.id);

    // 未公開セッションを公開すると分母が増える（404で弾かれた他学習者の記録は無い）
    await learningContainer.learningService.updateSession(draft.id, { isPublished: true });
    const afterPublish = await progress.getOverview(me);
    expect(entryOf(afterPublish, `week-01-${suffix}`)).toMatchObject({
      completedSessions: 1,
      totalSessions: 3,
    });

    // 未公開に戻すと分母から除外
    await learningContainer.learningService.updateSession(draft.id, { isPublished: false });
    const afterUnpublish = await progress.getOverview(me);
    expect(entryOf(afterUnpublish, `week-01-${suffix}`)).toMatchObject({
      completedSessions: 1,
      totalSessions: 2,
    });
  });

  it('セッションが1つも公開されていないモジュールは modules 一覧に出ない', async () => {
    const suffix = unique();
    await learningContainer.learningService.createModule({
      slug: `week-02-${suffix}`,
      title: '下書きのみ',
      weekNumber: 2,
      isPublished: true,
    });
    const overview = await learningContainer.progressService.getOverview(crypto.randomUUID());
    expect(overview.modules.map((m) => m.moduleSlug)).not.toContain(`week-02-${suffix}`);
  });
});

describe('Progress API Endpoints', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.get('/api/learning/progress', authenticate, handleGetProgress);
    app.put('/api/learning/progress/sessions/:sessionId', authenticate, handleSetProgress);
  });

  it('GET /api/learning/progress は無認証で 401', async () => {
    const response = await request(app).get('/api/learning/progress').expect(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_003');
  });

  it('GET /api/learning/progress は自分の overview を返す', async () => {
    const response = await request(app)
      .get('/api/learning/progress')
      .set(...learnerAuth)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.overall).toBeDefined();
    expect(Array.isArray(response.body.data.sessions)).toBe(true);
    expect(Array.isArray(response.body.data.modules)).toBe(true);
  });

  it('PUT は status 以外を 400 で拒否する', async () => {
    const response = await request(app)
      .put(`/api/learning/progress/sessions/${crypto.randomUUID()}`)
      .set(...learnerAuth)
      .send({ status: 'done' })
      .expect(400);
    expect(response.body.error.code).toBe('LEARNING_VALIDATION_001');
  });

  it('PUT で完了を記録し、もう一度 PUT で解除できる', async () => {
    const suffix = unique();
    const { day1 } = await seedCurriculum(suffix);

    const completed = await request(app)
      .put(`/api/learning/progress/sessions/${day1.id}`)
      .set(...learnerAuth)
      .send({ status: 'completed' })
      .expect(200);
    expect(completed.body.data.progress).toMatchObject({ sessionId: day1.id, status: 'completed' });
    expect(completed.body.data.progress.completedAt).not.toBeNull();

    const reverted = await request(app)
      .put(`/api/learning/progress/sessions/${day1.id}`)
      .set(...learnerAuth)
      .send({ status: 'in_progress' })
      .expect(200);
    expect(reverted.body.data.progress.completedAt).toBeNull();

    // overview に反映されている
    const overview = await request(app)
      .get('/api/learning/progress')
      .set(...learnerAuth)
      .expect(200);
    expect(overview.body.data.overall.completedSessions).toBe(0);
  });

  it('PUT は未知の sessionId で 404 エンベロープ', async () => {
    const response = await request(app)
      .put(`/api/learning/progress/sessions/${crypto.randomUUID()}`)
      .set(...learnerAuth)
      .send({ status: 'completed' })
      .expect(404);
    expect(response.body.error.code).toBe('LEARNING_PROGRESS_001');
  });

  it('PUT は無認証で 401', async () => {
    await request(app)
      .put(`/api/learning/progress/sessions/${crypto.randomUUID()}`)
      .send({ status: 'completed' })
      .expect(401);
  });
});
