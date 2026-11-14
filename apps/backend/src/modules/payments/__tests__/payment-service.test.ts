/**
 * PaymentService の単体テスト（Json リポジトリ + paymentsContainer 経由）
 *
 * PAYMENTS_DB_PATH / AUTH_DB_PATH は jest.setup.js で一時ファイル分離済み。
 * 参照署名は node:crypto で生成する（モジュール本体は Web Crypto のみ）。
 */

import crypto from 'crypto';
import { paymentsContainer } from '../payments.container';
import { authContainer } from '../../auth/auth.container';
import { PaymentError } from '../errors';
import { PaymentService, PRICE_AMOUNT_TOTAL, PRICE_CURRENCY } from '../services/payment-service';

const SECRET = 'whsec_test_secret';

let stripeSeq = 0;
/** テスト毎に一意な checkout session / payment intent を生成 */
function nextIds(): { sessionId: string; paymentIntentId: string } {
  stripeSeq += 1;
  return { sessionId: `cs_test_${stripeSeq}`, paymentIntentId: `pi_test_${stripeSeq}` };
}

function signedEvent(
  payload: Record<string, unknown>,
  secret: string = SECRET
): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify(payload);
  const t = Math.floor(Date.now() / 1000);
  const mac = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return { rawBody, signature: `t=${t},v1=${mac}` };
}

function checkoutCompletedEvent(
  sessionId: string,
  paymentIntentId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: `evt_${sessionId}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        payment_status: 'paid',
        amount_total: PRICE_AMOUNT_TOTAL,
        currency: PRICE_CURRENCY,
        payment_intent: paymentIntentId,
        ...overrides,
      },
    },
  };
}

function refundedEvent(paymentIntentId: string): Record<string, unknown> {
  return {
    id: `evt_refund_${paymentIntentId}`,
    type: 'charge.refunded',
    data: { object: { payment_intent: paymentIntentId, amount_refunded: PRICE_AMOUNT_TOTAL } },
  };
}

/** テストユーザーを作成して user を返す */
async function createUser(emailPrefix: string) {
  return authContainer.userRepository.create({
    email: `${emailPrefix}-${crypto.randomUUID().slice(0, 8)}@example.com`,
    passwordHash: 'hash',
    fullName: 'Purchase Tester',
    role: 'learner',
    isVerified: true,
    purchasedAt: null,
    bio: null,
    timezone: 'UTC',
    githubUsername: null,
    deletionScheduledAt: null,
    deletedAt: null,
  });
}

describe('PaymentService.handleWebhook', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  });

  it('STRIPE_WEBHOOK_SECRET 未設定は PAYMENT_CONFIG_001(500)', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await expect(
      paymentsContainer.paymentService.handleWebhook('{}', 't=1,v1=x')
    ).rejects.toMatchObject({ code: 'PAYMENT_CONFIG_001', httpStatus: 500 });
  });

  it('正しい支払いで user に紐づく購入が付与され purchasedAt が設定される', async () => {
    const user = await createUser('grant');
    const { sessionId, paymentIntentId } = nextIds();
    const event = checkoutCompletedEvent(sessionId, paymentIntentId, {
      client_reference_id: user.id,
    });
    const { rawBody, signature } = signedEvent(event);

    const result = await paymentsContainer.paymentService.handleWebhook(rawBody, signature);
    expect(result).toEqual({ received: true });

    const status = await paymentsContainer.paymentService.getStatus(user.id);
    expect(status.purchased).toBe(true);
    expect(status.purchase?.amountTotal).toBe(PRICE_AMOUNT_TOTAL);

    const updated = await authContainer.userRepository.findById(user.id);
    expect(updated?.purchasedAt).not.toBeNull();
  });

  it('同一 checkout session の再送は冪等（1行・ purchasedAt 維持）', async () => {
    const user = await createUser('idempotent');
    const { sessionId, paymentIntentId } = nextIds();
    const event = checkoutCompletedEvent(sessionId, paymentIntentId, {
      client_reference_id: user.id,
    });
    const { rawBody, signature } = signedEvent(event);

    await paymentsContainer.paymentService.handleWebhook(rawBody, signature);
    await paymentsContainer.paymentService.handleWebhook(rawBody, signature);

    const purchases = await paymentsContainer.purchaseRepository.findByUser(user.id);
    expect(purchases).toHaveLength(1);
  });

  it('金額が不一致なら付与しない（正常返却）', async () => {
    const user = await createUser('amount');
    const { sessionId, paymentIntentId } = nextIds();
    const event = checkoutCompletedEvent(sessionId, paymentIntentId, {
      client_reference_id: user.id,
      amount_total: 1000,
    });
    const { rawBody, signature } = signedEvent(event);

    await expect(
      paymentsContainer.paymentService.handleWebhook(rawBody, signature)
    ).resolves.toEqual({ received: true });
    expect(await paymentsContainer.paymentService.getStatus(user.id).then((s) => s.purchased)).toBe(
      false
    );
  });

  it('通貨が不一致なら付与しない', async () => {
    const user = await createUser('currency');
    const { sessionId, paymentIntentId } = nextIds();
    const event = checkoutCompletedEvent(sessionId, paymentIntentId, {
      client_reference_id: user.id,
      currency: 'usd',
    });
    const { rawBody, signature } = signedEvent(event);

    await paymentsContainer.paymentService.handleWebhook(rawBody, signature);
    expect((await paymentsContainer.paymentService.getStatus(user.id)).purchased).toBe(false);
  });

  it('payment_status が unpaid なら無視する', async () => {
    const user = await createUser('unpaid');
    const { sessionId, paymentIntentId } = nextIds();
    const event = checkoutCompletedEvent(sessionId, paymentIntentId, {
      client_reference_id: user.id,
      payment_status: 'unpaid',
    });
    const { rawBody, signature } = signedEvent(event);

    await paymentsContainer.paymentService.handleWebhook(rawBody, signature);
    expect((await paymentsContainer.paymentService.getStatus(user.id)).purchased).toBe(false);
  });

  it('client_reference_id が未知でも email が一致するユーザーに付与する（大小文字無視）', async () => {
    const user = await createUser('email-fallback');
    const { sessionId, paymentIntentId } = nextIds();
    const event = checkoutCompletedEvent(sessionId, paymentIntentId, {
      client_reference_id: null,
      customer_details: { email: user.email.toUpperCase() },
    });
    const { rawBody, signature } = signedEvent(event);

    await paymentsContainer.paymentService.handleWebhook(rawBody, signature);
    expect((await paymentsContainer.paymentService.getStatus(user.id)).purchased).toBe(true);
  });

  it('ユーザーを解決できない場合は付与せず正常返却（Stripeの再送ループを避ける）', async () => {
    const { sessionId, paymentIntentId } = nextIds();
    const event = checkoutCompletedEvent(sessionId, paymentIntentId, {
      client_reference_id: null,
      customer_details: { email: 'nobody@example.com' },
    });
    const { rawBody, signature } = signedEvent(event);

    await expect(
      paymentsContainer.paymentService.handleWebhook(rawBody, signature)
    ).resolves.toEqual({ received: true });
  });

  it('charge.refunded で取り消され purchasedAt がクリアされる', async () => {
    const user = await createUser('refund');
    const { sessionId, paymentIntentId } = nextIds();
    const grantEvent = checkoutCompletedEvent(sessionId, paymentIntentId, {
      client_reference_id: user.id,
    });
    const grant = signedEvent(grantEvent);
    await paymentsContainer.paymentService.handleWebhook(grant.rawBody, grant.signature);

    const refund = signedEvent(refundedEvent(paymentIntentId));
    await paymentsContainer.paymentService.handleWebhook(refund.rawBody, refund.signature);

    expect((await paymentsContainer.paymentService.getStatus(user.id)).purchased).toBe(false);
    const updated = await authContainer.userRepository.findById(user.id);
    expect(updated?.purchasedAt).toBeNull();
  });

  it('refund の再送は冪等（2回目も正常返却・purchasedAt は null のまま）', async () => {
    const user = await createUser('refund-retry');
    const { sessionId, paymentIntentId } = nextIds();
    const grant = signedEvent(
      checkoutCompletedEvent(sessionId, paymentIntentId, { client_reference_id: user.id })
    );
    await paymentsContainer.paymentService.handleWebhook(grant.rawBody, grant.signature);

    const refund = signedEvent(refundedEvent(paymentIntentId));
    await paymentsContainer.paymentService.handleWebhook(refund.rawBody, refund.signature);
    await expect(
      paymentsContainer.paymentService.handleWebhook(refund.rawBody, refund.signature)
    ).resolves.toEqual({ received: true });

    const updated = await authContainer.userRepository.findById(user.id);
    expect(updated?.purchasedAt).toBeNull();
  });

  it('revoke 後の users.update 失敗（500→再送）でも purchasedAt をクリアする', async () => {
    const user = await createUser('mirror-retry');
    const { sessionId, paymentIntentId } = nextIds();
    const grant = signedEvent(
      checkoutCompletedEvent(sessionId, paymentIntentId, { client_reference_id: user.id })
    );
    await paymentsContainer.paymentService.handleWebhook(grant.rawBody, grant.signature);
    expect((await authContainer.userRepository.findById(user.id))?.purchasedAt).not.toBeNull();

    // users.update を1回だけ失敗させる（transient 500 → Stripe が refund を再送）
    const realUsers = authContainer.userRepository;
    const flakyUsers: typeof realUsers = Object.create(realUsers);
    let failNext = true;
    flakyUsers.update = async (...args: Parameters<typeof realUsers.update>) => {
      if (failNext) {
        failNext = false;
        throw new Error('simulated transient failure');
      }
      return realUsers.update(...args);
    };
    const service = new PaymentService(paymentsContainer.purchaseRepository, flakyUsers);

    const refund1 = signedEvent(refundedEvent(paymentIntentId));
    // 1回目: revoke 自体は成功するが users.update で失敗 → Stripe に 500
    await expect(service.handleWebhook(refund1.rawBody, refund1.signature)).rejects.toThrow(
      'simulated transient failure'
    );

    // 2回目（再送）: revoke は冪等 no-op になるが、findByPaymentIntent で
    // 対象を復元して purchasedAt のクリアを完了させる
    const refund2 = signedEvent(refundedEvent(paymentIntentId));
    await expect(service.handleWebhook(refund2.rawBody, refund2.signature)).resolves.toEqual({
      received: true,
    });

    const updated = await authContainer.userRepository.findById(user.id);
    expect(updated?.purchasedAt).toBeNull();
    expect((await paymentsContainer.paymentService.getStatus(user.id)).purchased).toBe(false);
  });

  it('未知の payment_intent の refund は no-op（正常返却）', async () => {
    const refund = signedEvent(refundedEvent('pi_unknown'));
    await expect(
      paymentsContainer.paymentService.handleWebhook(refund.rawBody, refund.signature)
    ).resolves.toEqual({ received: true });
  });

  it('登録外のイベント種別は正常返却のみ', async () => {
    const { rawBody, signature } = signedEvent({
      id: 'evt_other',
      type: 'payment_intent.created',
      data: { object: {} },
    });
    await expect(
      paymentsContainer.paymentService.handleWebhook(rawBody, signature)
    ).resolves.toEqual({ received: true });
  });

  it('署名不一致は PAYMENT_SIGNATURE_002 を throw（HTTP層で 400）', async () => {
    const { rawBody } = signedEvent({ id: 'evt_tamper', type: 'charge.refunded', data: {} });
    const t = Math.floor(Date.now() / 1000);
    await expect(
      paymentsContainer.paymentService.handleWebhook(rawBody, `t=${t},v1=${'0'.repeat(64)}`)
    ).rejects.toMatchObject({ code: 'PAYMENT_SIGNATURE_002' });
  });

  it('壊れた JSON は PAYMENT_EVENT_001 を throw', async () => {
    const rawBody = 'not json';
    const t = Math.floor(Date.now() / 1000);
    const mac = crypto.createHmac('sha256', SECRET).update(`${t}.${rawBody}`).digest('hex');
    await expect(
      paymentsContainer.paymentService.handleWebhook(rawBody, `t=${t},v1=${mac}`)
    ).rejects.toBeInstanceOf(PaymentError);
  });
});
