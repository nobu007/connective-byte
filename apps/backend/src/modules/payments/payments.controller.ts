/**
 * Payments Controller
 * HTTP request handlers for payment endpoints
 *
 * Webhook は認証なし（署名検証が本体の認証）。status はルーター側で authenticate 済み。
 */

import { Request, Response, NextFunction } from 'express';
import { PaymentError } from './errors';
import { paymentsContainer } from './payments.container';

const paymentService = paymentsContainer.paymentService;

/** PaymentError を HTTP レスポンスへ変換（それ以外は next へ） */
export function handlePaymentError(res: Response, next: NextFunction, error: unknown): void {
  if (error instanceof PaymentError) {
    res.status(error.httpStatus).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }
  next(error);
}

/**
 * Stripe Webhook
 * POST /api/payments/webhook
 *
 * 署名検証に生ボディ（req.rawBody）を使う。rawBody が無い = ミドルウェア構成の
 * 破壊（Content-Type 不一致等）なので、誤った検証より loud な 400 を返す。
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.rawBody) {
      throw new PaymentError(
        'PAYMENT_SIGNATURE_001',
        'Raw body is not captured for signature verification',
        400
      );
    }
    await paymentService.handleWebhook(
      req.rawBody.toString('utf-8'),
      req.header('stripe-signature')
    );
    res.status(200).json({ received: true });
  } catch (error) {
    handlePaymentError(res, next, error);
  }
}

/**
 * 購入状態の照会
 * GET /api/payments/status （authenticate 済み）
 */
export async function handleGetPaymentStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await paymentService.getStatus(req.user!.id);
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    handlePaymentError(res, next, error);
  }
}
