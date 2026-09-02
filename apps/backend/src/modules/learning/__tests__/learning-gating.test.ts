/**
 * Weeks 2-12 購入ゲーティングの行列テスト
 *
 * learningRoutes を実 router としてマウントし（optionalAuthenticate が本番と同じ
 * 位置で走る）、week-01（無料）と week-05（有料）の seed に対して
 * 匿名 / 未購入 / 購入済 の3視点で挙動を検証する。
 * 購入の付与は PurchaseRepository.grant を直接使う（webhook 経由の付与は
 * payments 側のテスト済み。ここは学習側の資格判定が対象）。
 */

process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express, { Application } from 'express';
import crypto from 'crypto';
import learningRoutes from '../../../routes/learningRoutes';
import { learningContainer } from '../learning.container';
import { paymentsContainer } from '../../payments/payments.container';
import { authContainer } from '../../auth/auth.container';
import { generateToken } from '../../../middleware/auth';
import { PRICE_AMOUNT_TOTAL, PRICE_CURRENCY } from '../../payments/services/payment-service';

const unique = () => crypto.randomUUID().slice(0, 8);

async function createUser(): Promise<{ id: string; token: string }> {
  const user = await authContainer.userRepository.create({
    email: `gating-${crypto.randomUUID().slice(0, 8)}@example.com`,
    passwordHash: 'hash',
    fullName: 'Gating Tester',
    role: 'learner',
    isVerified: true,
    purchasedAt: null,
    bio: null,
    timezone: 'UTC',
    githubUsername: null,
    deletionScheduledAt: null,
    deletedAt: null,
  });
  return {
    id: user.id,
    token: generateToken({ id: user.id, email: user.email, role: 'learner' }),
  };
}

/** week-01 と week-05 に公開モジュール+セッションを1つずつ作る */
async function seedWeeks(suffix: string): Promise<{ freeSlug: string; paidSlug: string }> {
  const freeModule = await learningContainer.learningService.createModule({
    slug: `week-01-${suffix}`,
    title: 'Week 1 無料',
    weekNumber: 1,
    isPublished: true,
  });
  await learningContainer.learningService.createSession({
    moduleId: freeModule.id,
    slug: `day-01-${suffix}`,
    title: '無料 Day 1',
    content: '# 無料本文',
    durationMinutes: 30,
    isPublished: true,
  });

  const paidModule = await learningContainer.learningService.createModule({
    slug: `week-05-${suffix}`,
    title: 'Week 5 有料',
    weekNumber: 5,
    isPublished: true,
  });
  await learningContainer.learningService.createSession({
    moduleId: paidModule.id,
    slug: `day-05-${suffix}`,
    title: '有料 Day 1',
    content: '# 有料本文',
    durationMinutes: 45,
    isPublished: true,
  });

  return { freeSlug: `day-01-${suffix}`, paidSlug: `day-05-${suffix}` };
}

describe('Learning 購入ゲーティング（FREE_WEEKS=1）', () => {
  let app: Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(learningRoutes);
  });

  it('匿名でも Week 1 の本文は閲覧できる', async () => {
    const suffix = unique();
    const { freeSlug } = await seedWeeks(suffix);

    const response = await request(app).get(`/api/learning/sessions/${freeSlug}`).expect(200);
    expect(response.body.data.session.content).toContain('無料本文');
    // 応答は Authorization（購入状態）で変化するため共有キャッシュ不可
    expect(response.headers['cache-control']).toContain('private');
  });

  it('匿名で Week 5 を開くと 403 PAYMENT_001（401 にしない: refresh サイクル防止）', async () => {
    const suffix = unique();
    const { paidSlug } = await seedWeeks(suffix);

    const response = await request(app).get(`/api/learning/sessions/${paidSlug}`).expect(403);
    expect(response.body.error.code).toBe('PAYMENT_001');
  });

  it('認証済みでも未購入なら Week 5 は 403', async () => {
    const suffix = unique();
    const { paidSlug } = await seedWeeks(suffix);
    const viewer = await createUser();

    const response = await request(app)
      .get(`/api/learning/sessions/${paidSlug}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .expect(403);
    expect(response.body.error.code).toBe('PAYMENT_001');
  });

  it('購入者は Week 5 を閲覧できる（moduleWeekNumber も返す）', async () => {
    const suffix = unique();
    const { paidSlug } = await seedWeeks(suffix);
    const buyer = await createUser();
    await paymentsContainer.purchaseRepository.grant({
      userId: buyer.id,
      stripeCheckoutSessionId: `cs_gating_${suffix}`,
      stripePaymentIntentId: `pi_gating_${suffix}`,
      amountTotal: PRICE_AMOUNT_TOTAL,
      currency: PRICE_CURRENCY,
    });

    const response = await request(app)
      .get(`/api/learning/sessions/${paidSlug}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
    expect(response.body.data.session.content).toContain('有料本文');
    expect(response.body.data.session.moduleWeekNumber).toBe(5);
  });

  it('未購入の Week 5 への進捗 PUT は 403、購入者は 200', async () => {
    const suffix = unique();
    const { paidSlug } = await seedWeeks(suffix);
    const paidSession = await learningContainer.learningRepository.findSessionBySlug(
      paidSlug,
      false
    );
    if (!paidSession) throw new Error('seed 失敗');

    const learner = await createUser();
    await request(app)
      .put(`/api/learning/progress/sessions/${paidSession.id}`)
      .set('Authorization', `Bearer ${learner.token}`)
      .send({ status: 'completed' })
      .expect(403);

    const buyer = await createUser();
    await paymentsContainer.purchaseRepository.grant({
      userId: buyer.id,
      stripeCheckoutSessionId: `cs_gating_progress_${suffix}`,
      stripePaymentIntentId: `pi_gating_progress_${suffix}`,
      amountTotal: PRICE_AMOUNT_TOTAL,
      currency: PRICE_CURRENCY,
    });
    await request(app)
      .put(`/api/learning/progress/sessions/${paidSession.id}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ status: 'completed' })
      .expect(200);
  });

  it('curriculum は全員同一で、要購入週に requiresPurchase が付く（セールスコピー）', async () => {
    const suffix = unique();
    await seedWeeks(suffix);

    const response = await request(app).get('/api/learning/curriculum').expect(200);
    const modules = response.body.data.phases.flatMap(
      (p: { modules: { slug: string; requiresPurchase?: boolean }[] }) => p.modules
    );
    const free = modules.find((m: { slug: string }) => m.slug === `week-01-${suffix}`);
    const paid = modules.find((m: { slug: string }) => m.slug === `week-05-${suffix}`);
    expect(free?.requiresPurchase).toBe(false);
    expect(paid?.requiresPurchase).toBe(true);
    // ツリーは頻繁に叩かれるため共有キャッシュ維持（応答は全員同一）
    expect(response.headers['cache-control']).toContain('public');
  });
});
