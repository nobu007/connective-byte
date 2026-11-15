/**
 * webhook-signature の単体テスト
 *
 * 参照署名はテスト内でのみ node:crypto で生成する
 * （モジュール本体は Workers 互換のため Web Crypto のみを使用）。
 */

import crypto from 'crypto';
import {
  parseSignatureHeader,
  verifyStripeSignature,
  SIGNATURE_TOLERANCE_SECONDS,
} from '../services/webhook-signature';
import { PaymentError } from '../errors';

const SECRET = 'whsec_test_secret';
const RAW_BODY = JSON.stringify({
  id: 'evt_test',
  type: 'checkout.session.completed',
});

function sign(rawBody: string, timestamp: number, secret: string = SECRET): string {
  const mac = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${mac}`;
}

describe('parseSignatureHeader', () => {
  it('t と v1 をパースできる', () => {
    const parsed = parseSignatureHeader('t=1700000000,v1=abc123');
    expect(parsed).toEqual({ t: 1700000000, v1: ['abc123'] });
  });

  it('v1 が複数あっても全て返す（ローテーション）', () => {
    const parsed = parseSignatureHeader('t=1700000000,v1=old,v1=new');
    expect(parsed).toEqual({ t: 1700000000, v1: ['old', 'new'] });
  });

  it('t か v1 が欠けたら null', () => {
    expect(parseSignatureHeader('v1=abc123')).toBeNull();
    expect(parseSignatureHeader('t=1700000000')).toBeNull();
    expect(parseSignatureHeader('')).toBeNull();
  });
});

describe('verifyStripeSignature', () => {
  const now = 1700000000_000;

  it('正しい署名は検証を通過する', async () => {
    const header = sign(RAW_BODY, now / 1000);
    await expect(verifyStripeSignature(header, RAW_BODY, SECRET, now)).resolves.toBeUndefined();
  });

  it('t と v1 の順序が逆でも通過する（順序非依存）', async () => {
    const t = now / 1000;
    const mac = crypto.createHmac('sha256', SECRET).update(`${t}.${RAW_BODY}`).digest('hex');
    await expect(
      verifyStripeSignature(`v1=${mac},t=${t}`, RAW_BODY, SECRET, now)
    ).resolves.toBeUndefined();
  });

  it('ボディが改ざんされていたら PAYMENT_SIGNATURE_002', async () => {
    const header = sign(RAW_BODY, now / 1000);
    await expect(
      verifyStripeSignature(header, RAW_BODY.replace('evt_test', 'evt_evil'), SECRET, now)
    ).rejects.toMatchObject({ code: 'PAYMENT_SIGNATURE_002', httpStatus: 400 });
  });

  it('秘密鍵が異なっていたら PAYMENT_SIGNATURE_002', async () => {
    const header = sign(RAW_BODY, now / 1000, 'whsec_other_secret');
    await expect(verifyStripeSignature(header, RAW_BODY, SECRET, now)).rejects.toMatchObject({
      code: 'PAYMENT_SIGNATURE_002',
    });
  });

  it('タイムスタンプが許容幅を超えて古かったら PAYMENT_TIMESTAMP_001', async () => {
    const old = (now - (SIGNATURE_TOLERANCE_SECONDS + 60) * 1000) / 1000;
    const header = sign(RAW_BODY, old);
    await expect(verifyStripeSignature(header, RAW_BODY, SECRET, now)).rejects.toMatchObject({
      code: 'PAYMENT_TIMESTAMP_001',
      httpStatus: 400,
    });
  });

  it('許容幅の境界（4分古い）は通過する', async () => {
    const edge = (now - 4 * 60 * 1000) / 1000;
    const header = sign(RAW_BODY, edge);
    await expect(verifyStripeSignature(header, RAW_BODY, SECRET, now)).resolves.toBeUndefined();
  });

  it('未来すぎるタイムスタンプも拒否する', async () => {
    const future = (now + (SIGNATURE_TOLERANCE_SECONDS + 60) * 1000) / 1000;
    const header = sign(RAW_BODY, future);
    await expect(verifyStripeSignature(header, RAW_BODY, SECRET, now)).rejects.toMatchObject({
      code: 'PAYMENT_TIMESTAMP_001',
    });
  });

  it('ヘッダー未指定は PAYMENT_SIGNATURE_001', async () => {
    await expect(verifyStripeSignature(undefined, RAW_BODY, SECRET, now)).rejects.toBeInstanceOf(
      PaymentError
    );
  });

  it('v1 のないヘッダーは PAYMENT_SIGNATURE_001', async () => {
    await expect(
      verifyStripeSignature('t=1700000000', RAW_BODY, SECRET, now)
    ).rejects.toMatchObject({ code: 'PAYMENT_SIGNATURE_001' });
  });

  it('複数 v1 の2番目（新秘密鍵）と一致すれば通過する', async () => {
    const t = now / 1000;
    const oldMac = crypto
      .createHmac('sha256', 'whsec_old')
      .update(`${t}.${RAW_BODY}`)
      .digest('hex');
    const newMac = crypto.createHmac('sha256', SECRET).update(`${t}.${RAW_BODY}`).digest('hex');
    await expect(
      verifyStripeSignature(`t=${t},v1=${oldMac},v1=${newMac}`, RAW_BODY, SECRET, now)
    ).resolves.toBeUndefined();
  });
});
