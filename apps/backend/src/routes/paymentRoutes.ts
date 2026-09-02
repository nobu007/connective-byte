/**
 * Payment Routes
 *
 * Webhook は認証なし（Stripe 署名検証が本体の保護）・status は authenticate 必須。
 * 本番 worker（src/worker.ts）はグローバル apiLimiter を持たないため、
 * この router が独自の limiter を携帯する（learningRoutes と同じ方針）。
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import {
  handleStripeWebhook,
  handleGetPaymentStatus,
} from '../modules/payments/payments.controller';

const router = Router();

// Webhook: Stripe の再送も含めて余裕を持たせる（通常は1決済あたり数件）
const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  code: 'RATE_LIMIT_007',
  message: 'Too many webhook requests.',
});

// --- Webhook（Stripe → サーバー。認証なし・署名検証のみ） ---
// sanitizeInput は security.ts 側で /api/payments/webhook を免除
// （署名検証に生ボディを使うため、本文の再構築・サニタイズが署名を壊す）

router.post('/api/payments/webhook', webhookLimiter, handleStripeWebhook);

// --- 購入状態（要認証） ---

router.get('/api/payments/status', authenticate, handleGetPaymentStatus);

export default router;
