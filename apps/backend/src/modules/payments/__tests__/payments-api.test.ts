/**
 * Payments API の HTTP 結合テスト
 *
 * 本番と同じ express.json({ verify: captureRawBody }) 構成でマウントして
 * raw body キャプチャ → 署名検証 → エンベロープまでを通しで検証する。
 * rate limiter を介さない mount は learning-api.test.ts と同じ手法。
 */

process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express, { Application } from 'express';
import crypto from 'crypto';
import { captureRawBody } from '../../../middleware/rawBody';
import { authenticate } from '../../../middleware/auth';
import { handleStripeWebhook, handleGetPaymentStatus } from '../payments.controller';
import { generateToken } from '../../../middleware/auth';

const SECRET = 'whsec_test_secret';

function buildApp(): Application {
  const app = express();
  app.use(express.json({ verify: captureRawBody }));
  app.post('/api/payments/webhook', handleStripeWebhook);
  app.get('/api/payments/status', authenticate, handleGetPaymentStatus);
  return app;
}

describe('POST /api/payments/webhook', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  });

  it('署名なしは 400 PAYMENT_SIGNATURE_001', async () => {
    const response = await request(buildApp())
      .post('/api/payments/webhook')
      .send({ id: 'evt_x', type: 'charge.refunded' })
      .expect(400);
    expect(response.body.error.code).toBe('PAYMENT_SIGNATURE_001');
  });

  it('正しい署名なら 200 { received: true }', async () => {
    const payload = { id: 'evt_ok', type: 'payment_intent.created', data: { object: {} } };
    const rawBody = JSON.stringify(payload);
    const t = Math.floor(Date.now() / 1000);
    const mac = crypto.createHmac('sha256', SECRET).update(`${t}.${rawBody}`).digest('hex');

    const response = await request(buildApp())
      .post('/api/payments/webhook')
      .set('stripe-signature', `t=${t},v1=${mac}`)
      .set('Content-Type', 'application/json')
      .send(rawBody)
      .expect(200);
    expect(response.body).toEqual({ received: true });
  });

  it('ボディ改ざんは 400 PAYMENT_SIGNATURE_002', async () => {
    const payload = { id: 'evt_evil', type: 'checkout.session.completed', data: {} };
    const rawBody = JSON.stringify(payload);
    const t = Math.floor(Date.now() / 1000);
    const mac = crypto.createHmac('sha256', SECRET).update(`${t}.${rawBody}`).digest('hex');

    const response = await request(buildApp())
      .post('/api/payments/webhook')
      .set('stripe-signature', `t=${t},v1=${mac}`)
      .send({ id: 'evt_tampered', type: 'checkout.session.completed', data: {} })
      .expect(400);
    expect(response.body.error.code).toBe('PAYMENT_SIGNATURE_002');
  });
});

describe('GET /api/payments/status', () => {
  it('Bearer なしは 401', async () => {
    const response = await request(buildApp()).get('/api/payments/status').expect(401);
    expect(response.body.error).toBeDefined();
  });

  it('有効トークンなら購入状態を返す（未購入形状・no-store）', async () => {
    const token = generateToken({
      id: crypto.randomUUID(),
      email: 'status-user@example.com',
      role: 'learner',
    });

    const response = await request(buildApp())
      .get('/api/payments/status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ purchased: false, purchasedAt: null, purchase: null });
    expect(response.headers['cache-control']).toContain('no-store');
  });
});
