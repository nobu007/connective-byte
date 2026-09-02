/**
 * Stripe Webhook 署名検証（純関数・DB 非依存）
 *
 * Stripe の署名スキーム: ヘッダー `Stripe-Signature: t=<unix>,v1=<hex>[,v1=<hex>...]`
 * 期待値 = HMAC-SHA256(secret, `${t}.${rawBody}`) の hex。
 *
 * Web Crypto（crypto.subtle）のみを使用（node:crypto 非依存）— Cloudflare Workers
 * 互換。password.ts と同じ方針。
 */

import { PaymentError } from '../errors';

/** 署名のタイムスタンス許容揺れ（リプレイ保護）。Stripe 公式実装と同じ5分 */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/** 定数時間比較（password.ts verifyPassword と同じ XOR 累積パターン） */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** `t=...,v1=...` をパース。t と v1 が揃わなければ null（v1 は複数可: 秘密鍵ローテーション） */
export function parseSignatureHeader(header: string): { t: number; v1: string[] } | null {
  let t: number | null = null;
  const v1: string[] = [];

  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') {
      const parsed = parseInt(value, 10);
      if (Number.isFinite(parsed)) t = parsed;
    } else if (key === 'v1') {
      v1.push(value);
    }
  }

  if (t === null || v1.length === 0) return null;
  return { t, v1 };
}

/**
 * 署名を検証する。不正なら PaymentError を throw する（検証通過は void）。
 *
 * @param header        Stripe-Signature ヘッダー値（未的存在あり）
 * @param rawBody       受信した生ボディ（再構築・サニタイズ禁止）
 * @param secret        エンドポイントの署名シークレット（whsec_...）
 * @param nowMs         検証時刻（テスト注入用。既定は現在時刻）
 */
export async function verifyStripeSignature(
  header: string | undefined,
  rawBody: string,
  secret: string,
  nowMs: number = Date.now()
): Promise<void> {
  if (!header) {
    throw new PaymentError('PAYMENT_SIGNATURE_001', 'Missing Stripe-Signature header', 400);
  }

  const parsed = parseSignatureHeader(header);
  if (!parsed) {
    throw new PaymentError('PAYMENT_SIGNATURE_001', 'Malformed Stripe-Signature header', 400);
  }

  // リプレイ保護: 古い（または未来すぎる）タイムスタンプは拒否
  if (Math.abs(nowMs - parsed.t * 1000) > SIGNATURE_TOLERANCE_SECONDS * 1000) {
    throw new PaymentError(
      'PAYMENT_TIMESTAMP_001',
      'Stripe-Signature timestamp outside tolerance',
      400
    );
  }

  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signedPayload = new TextEncoder().encode(`${parsed.t}.${rawBody}`);
  const digest = new Uint8Array(await subtle.sign('HMAC', key, signedPayload));

  // 複数 v1 のどれかと一致すればよい（秘密鍵ローテーション期間の並列署名）。
  // hex 文字列比較でなく bytes の定数時間比較で判定する
  const matches = parsed.v1.some((candidate) => {
    try {
      return constantTimeEqual(fromHex(candidate), digest);
    } catch {
      return false;
    }
  });

  if (!matches) {
    throw new PaymentError('PAYMENT_SIGNATURE_002', 'Stripe-Signature verification failed', 400);
  }
}
