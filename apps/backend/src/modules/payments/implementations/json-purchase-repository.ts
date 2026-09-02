/**
 * JSON File-based Purchase Repository Implementation
 *
 * ローカル開発・テスト用（DATABASE_URL 未設定時に container が選択）。
 * json-learning-repository と同じ fs/promises lazy-init パターン。
 */

import fs from 'fs/promises';
import path from 'path';
import {
  PurchaseRepository,
  PurchaseRecord,
  GrantPurchaseInput,
} from '../interfaces/purchase-repository';

interface Database {
  purchases: PurchaseRecord[];
}

function nowIso(): string {
  return new Date().toISOString();
}

export class JsonPurchaseRepository implements PurchaseRepository {
  private dbPath: string;
  private data: Database;
  private loaded = false;

  constructor(
    dbPath: string = process.env.PAYMENTS_DB_PATH ||
      path.join(process.cwd(), 'data/payments', 'purchases.json')
  ) {
    this.dbPath = dbPath;
    this.data = { purchases: [] };
  }

  private async initialize(): Promise<void> {
    if (this.loaded) return;

    const exists = await fs
      .access(this.dbPath)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      const parsed = JSON.parse(await fs.readFile(this.dbPath, 'utf-8'));
      this.data = { purchases: parsed.purchases ?? [] };
    } else {
      this.data = { purchases: [] };
      await this.save();
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  async grant(input: GrantPurchaseInput): Promise<PurchaseRecord> {
    await this.initialize();
    const now = nowIso();
    // Postgres の ON CONFLICT DO UPDATE と同じ意味論: 既存行は再付与で上書き
    const existing = this.data.purchases.find(
      (p) => p.stripeCheckoutSessionId === input.stripeCheckoutSessionId
    );
    if (existing) {
      existing.status = 'active';
      existing.stripePaymentIntentId =
        existing.stripePaymentIntentId ?? input.stripePaymentIntentId;
      existing.revokedAt = null;
      existing.updatedAt = now;
      await this.save();
      return existing;
    }

    const record: PurchaseRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      status: 'active',
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      amountTotal: input.amountTotal,
      currency: input.currency,
      grantedAt: now,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.data.purchases.push(record);
    await this.save();
    return record;
  }

  async revokeByPaymentIntent(paymentIntentId: string): Promise<PurchaseRecord | null> {
    await this.initialize();
    const existing = this.data.purchases.find(
      (p) => p.stripePaymentIntentId === paymentIntentId && p.status === 'active'
    );
    if (!existing) return null;

    existing.status = 'refunded';
    existing.revokedAt = nowIso();
    existing.updatedAt = nowIso();
    await this.save();
    return existing;
  }

  async hasActivePurchase(userId: string): Promise<boolean> {
    await this.initialize();
    return this.data.purchases.some((p) => p.userId === userId && p.status === 'active');
  }

  async findByUser(userId: string): Promise<PurchaseRecord[]> {
    await this.initialize();
    return this.data.purchases
      .filter((p) => p.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}
