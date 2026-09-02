/**
 * JsonPurchaseRepository の単体テスト（PAYMENTS_DB_PATH は jest.setup.js で一時ファイル分離済み）
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { JsonPurchaseRepository } from '../implementations/json-purchase-repository';
import { GrantPurchaseInput } from '../interfaces/purchase-repository';

function tmpDbPath(): string {
  return path.join(
    os.tmpdir(),
    `purchases-unit-${process.pid}-${Math.random().toString(36).slice(2)}.json`
  );
}

const GRANT: GrantPurchaseInput = {
  userId: '11111111-1111-4111-8111-111111111111',
  stripeCheckoutSessionId: 'cs_test_001',
  stripePaymentIntentId: 'pi_test_001',
  amountTotal: 29800,
  currency: 'jpy',
};

describe('JsonPurchaseRepository', () => {
  it('grant は新規行を作成する', async () => {
    const repo = new JsonPurchaseRepository(tmpDbPath());
    const record = await repo.grant(GRANT);

    expect(record.status).toBe('active');
    expect(record.stripeCheckoutSessionId).toBe('cs_test_001');
    expect(record.revokedAt).toBeNull();
    expect(await repo.hasActivePurchase(GRANT.userId)).toBe(true);
  });

  it('同一 checkout session の grant 再送は1行に冪等収束する', async () => {
    const repo = new JsonPurchaseRepository(tmpDbPath());
    const first = await repo.grant(GRANT);
    const second = await repo.grant(GRANT);

    expect(second.id).toBe(first.id);
    const all = await repo.findByUser(GRANT.userId);
    expect(all).toHaveLength(1);
  });

  it('refund 後の completed 再送は再付与（last event wins）', async () => {
    const repo = new JsonPurchaseRepository(tmpDbPath());
    await repo.grant(GRANT);

    const revoked = await repo.revokeByPaymentIntent('pi_test_001');
    expect(revoked?.status).toBe('refunded');
    expect(await repo.hasActivePurchase(GRANT.userId)).toBe(false);

    await repo.grant(GRANT);
    expect(await repo.hasActivePurchase(GRANT.userId)).toBe(true);
  });

  it('revokeByPaymentIntent は該当なしで null（冪等 no-op）', async () => {
    const repo = new JsonPurchaseRepository(tmpDbPath());
    expect(await repo.revokeByPaymentIntent('pi_unknown')).toBeNull();

    await repo.grant(GRANT);
    await repo.revokeByPaymentIntent('pi_test_001');
    // 既に refund 済み → 2回目は null
    expect(await repo.revokeByPaymentIntent('pi_test_001')).toBeNull();
  });

  it('ユーザーをまたいで判定が分かれる', async () => {
    const repo = new JsonPurchaseRepository(tmpDbPath());
    await repo.grant(GRANT);
    expect(await repo.hasActivePurchase('22222222-2222-4222-8222-222222222222')).toBe(false);
  });

  it('findByUser は新しい順に返す', async () => {
    const repo = new JsonPurchaseRepository(tmpDbPath());
    await repo.grant(GRANT);
    await repo.grant({ ...GRANT, stripeCheckoutSessionId: 'cs_test_002' });

    const all = await repo.findByUser(GRANT.userId);
    expect(all.map((p) => p.stripeCheckoutSessionId)).toEqual(['cs_test_002', 'cs_test_001']);
  });

  it('ファイルは data ディレクトリ配下に永続化される', async () => {
    const dbPath = tmpDbPath();
    const repo = new JsonPurchaseRepository(dbPath);
    await repo.grant(GRANT);

    const raw = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
    expect(raw.purchases).toHaveLength(1);
    expect(raw.purchases[0].stripeCheckoutSessionId).toBe('cs_test_001');
  });
});
