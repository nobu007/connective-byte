import type { UserRepository } from '../modules/auth/interfaces/user-repository';
import type { PurchaseRepository } from '../modules/payments/interfaces/purchase-repository';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
type Dependencies = {
  databaseUrl: string;
  users: Pick<UserRepository, 'findById'>;
  purchases: Pick<PurchaseRepository, 'findByUser'>;
  listIds: (after: string | null, limit: number) => Promise<string[]>;
};

/** Service-binding RPC only. Never mount this handler on an HTTP route. */
export async function communicationRead(input: unknown, deps: Dependencies): Promise<unknown> {
  try {
    if (!deps.databaseUrl || !input || typeof input !== 'object') throw Error();
    const request = input as Record<string, unknown>;
    if (request.operation === 'check_target') {
      const url = new URL(deps.databaseUrl);
      const hostname = url.hostname.replace(/-pooler(?=\.)/, '');
      return {
        version: 1,
        matches:
          request.hostname === hostname &&
          request.database === decodeURIComponent(url.pathname.slice(1)) &&
          request.port === (url.port || '5432'),
      };
    }
    if (request.operation === 'list') {
      const after = request.after;
      const limit = request.limit;
      if (
        !(after === null || (typeof after === 'string' && uuid.test(after))) ||
        typeof limit !== 'number' ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
      )
        throw Error();
      const ids = await deps.listIds(after, limit);
      if (
        ids.length > limit ||
        ids.some(
          (id, index) =>
            !uuid.test(id) || (index ? id <= ids[index - 1] : after !== null && id <= after)
        )
      )
        throw Error();
      return { version: 1, ids };
    }
    if (request.operation === 'member') {
      const id = request.id;
      if (typeof id !== 'string' || !uuid.test(id)) throw Error();
      const user = await deps.users.findById(id);
      if (!user || user.deletedAt) return { version: 1, user: null, purchases: [] };
      if (user.id !== id || typeof user.isVerified !== 'boolean') throw Error();
      const history = await deps.purchases.findByUser(id);
      if (history.some((p) => p.userId !== id || !['active', 'refunded'].includes(p.status)))
        throw Error();
      return {
        version: 1,
        user: {
          id: user.id,
          email: user.email,
          isVerified: user.isVerified,
          deletedAt: user.deletedAt,
          deletionScheduledAt: user.deletionScheduledAt,
        },
        purchases: history.map((p) => ({ userId: p.userId, status: p.status })),
      };
    }
    throw Error();
  } catch {
    // Repository errors can contain SQL, credentials, or customer information.
    throw new Error('communication_source_unavailable');
  }
}
