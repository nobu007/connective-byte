/**
 * PostgreSQL Purchase Repository Implementation (Neon)
 *
 * neon() HTTP ドライバの遅延初期化は PostgresUserRepository と同じ理由
 * （Workers の "Cannot perform I/O on behalf of a different request" 回避）。
 * テーブル定義は scripts/init-payments-db.mjs を参照。
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import {
  PurchaseRepository,
  PurchaseRecord,
  GrantPurchaseInput,
} from '../interfaces/purchase-repository';

interface PurchaseRow {
  id: string;
  user_id: string;
  status: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_total: number;
  currency: string;
  granted_at: Date | string;
  revoked_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIso(value);
}

const SELECT_COLUMNS = `id, user_id, status, stripe_checkout_session_id, stripe_payment_intent_id,
                        amount_total, currency, granted_at, revoked_at, created_at, updated_at`;

function rowToPurchase(row: PurchaseRow): PurchaseRecord {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status as PurchaseRecord['status'],
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    amountTotal: row.amount_total,
    currency: row.currency,
    grantedAt: toIso(row.granted_at),
    revokedAt: toIsoOrNull(row.revoked_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export class PostgresPurchaseRepository implements PurchaseRepository {
  private sql: NeonQueryFunction<false, false> | null = null;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || process.env.DATABASE_URL || '';
    if (!this.connectionString) {
      throw new Error('DATABASE_URL is required for PostgresPurchaseRepository');
    }
  }

  private async query<T>(
    text: string,
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.sql) {
      this.sql = neon(this.connectionString);
    }
    const rows = (await this.sql.query(text, params)) as T[];
    return { rows, rowCount: rows.length };
  }

  async grant(input: GrantPurchaseInput): Promise<PurchaseRecord> {
    // DO NOTHING でなく DO UPDATE: refund 後に completed の再送が届いた場合は
    // 再付与で上書き（last event wins）。操作者が意図して取り消した後の再送に
    // よる誤再付与の可能性は文書化された限界（DEPLOYMENT_GUIDE.md 参照）。
    const { rows } = await this.query<PurchaseRow>(
      `INSERT INTO purchases (id, user_id, status, stripe_checkout_session_id,
                              stripe_payment_intent_id, amount_total, currency)
       VALUES ($1, $2, 'active', $3, $4, $5, $6)
       ON CONFLICT (stripe_checkout_session_id) DO UPDATE SET
         status = 'active',
         stripe_payment_intent_id = COALESCE(purchases.stripe_payment_intent_id, EXCLUDED.stripe_payment_intent_id),
         revoked_at = NULL,
         updated_at = now()
       RETURNING ${SELECT_COLUMNS}`,
      [
        crypto.randomUUID(),
        input.userId,
        input.stripeCheckoutSessionId,
        input.stripePaymentIntentId,
        input.amountTotal,
        input.currency,
      ]
    );
    return rowToPurchase(rows[0]);
  }

  async revokeByPaymentIntent(paymentIntentId: string): Promise<PurchaseRecord | null> {
    const { rows } = await this.query<PurchaseRow>(
      `UPDATE purchases
       SET status = 'refunded', revoked_at = now(), updated_at = now()
       WHERE stripe_payment_intent_id = $1 AND status = 'active'
       RETURNING ${SELECT_COLUMNS}`,
      [paymentIntentId]
    );
    return rows[0] ? rowToPurchase(rows[0]) : null;
  }

  async findByPaymentIntent(paymentIntentId: string): Promise<PurchaseRecord | null> {
    const { rows } = await this.query<PurchaseRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM purchases WHERE stripe_payment_intent_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [paymentIntentId]
    );
    return rows[0] ? rowToPurchase(rows[0]) : null;
  }

  async hasActivePurchase(userId: string): Promise<boolean> {
    const { rows } = await this.query<{ active: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM purchases WHERE user_id = $1 AND status = 'active'
       ) AS active`,
      [userId]
    );
    return Boolean(rows[0]?.active);
  }

  async findByUser(userId: string): Promise<PurchaseRecord[]> {
    const { rows } = await this.query<PurchaseRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM purchases WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map(rowToPurchase);
  }
}
