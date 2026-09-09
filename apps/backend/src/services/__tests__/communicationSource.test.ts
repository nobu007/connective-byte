import { communicationRead } from '../communicationSource';
import type { User } from '../../modules/auth/interfaces/user-repository';
import type { PurchaseRecord } from '../../modules/payments/interfaces/purchase-repository';

const id = '00000000-0000-4000-8000-000000000001';
const user = {
  id,
  email: 'member@example.invalid',
  isVerified: true,
  deletedAt: null,
  deletionScheduledAt: null,
  passwordHash: 'private-password-hash',
  fullName: 'private-name',
} as User;
const purchase = {
  userId: id,
  status: 'refunded',
  amountTotal: 123,
  stripeCheckoutSessionId: 'private-stripe-id',
} as PurchaseRecord;
function fixture() {
  return {
    databaseUrl:
      'postgresql://private-user:private-password@ep-synthetic-pooler.neon.tech/course?sslmode=require',
    users: { findById: jest.fn().mockResolvedValue(user) },
    purchases: { findByUser: jest.fn().mockResolvedValue([purchase]) },
    listIds: jest.fn().mockResolvedValue([id]),
  };
}
describe('communication Service-binding source', () => {
  it('compares the database target without returning any connection or credential data', async () => {
    const deps = fixture();
    const request = {
      operation: 'check_target',
      hostname: 'ep-synthetic.neon.tech',
      database: 'course',
      port: '5432',
    };
    expect(await communicationRead(request, deps)).toEqual({ version: 1, matches: true });
    expect(await communicationRead({ ...request, database: 'other' }, deps)).toEqual({
      version: 1,
      matches: false,
    });
    expect(deps.users.findById).not.toHaveBeenCalled();
  });
  it('returns only communication fields and complete purchase statuses, including refunds', async () => {
    const deps = fixture();
    const result = await communicationRead({ operation: 'member', id }, deps);
    expect(result).toEqual({
      version: 1,
      user: { id, email: user.email, isVerified: true, deletedAt: null, deletionScheduledAt: null },
      purchases: [{ userId: id, status: 'refunded' }],
    });
    expect(JSON.stringify(result)).not.toMatch(/private-|amountTotal|passwordHash|fullName/);
    expect(deps.purchases.findByUser).toHaveBeenCalledWith(id);
  });
  it('does not manufacture a missing member or conceal a deleted member as verified', async () => {
    for (const value of [null, { ...user, deletedAt: '2026-09-09T00:00:00Z' }]) {
      const deps = fixture();
      deps.users.findById.mockResolvedValue(value);
      expect(await communicationRead({ operation: 'member', id }, deps)).toEqual({
        version: 1,
        user: null,
        purchases: [],
      });
      expect(deps.purchases.findByUser).not.toHaveBeenCalled();
    }
  });
  it('preserves unverified and deletion-pending state for the downstream decision', async () => {
    const deps = fixture();
    deps.users.findById.mockResolvedValue({
      ...user,
      isVerified: false,
      deletionScheduledAt: '2026-09-10T00:00:00Z',
    });
    expect(await communicationRead({ operation: 'member', id }, deps)).toMatchObject({
      user: { isVerified: false, deletionScheduledAt: '2026-09-10T00:00:00Z' },
    });
  });
  it('bounds cursor reads and rejects malformed, duplicated, or regressed pages', async () => {
    const deps = fixture();
    expect(await communicationRead({ operation: 'list', after: null, limit: 10 }, deps)).toEqual({
      version: 1,
      ids: [id],
    });
    expect(deps.listIds).toHaveBeenCalledWith(null, 10);
    await expect(
      communicationRead({ operation: 'list', after: null, limit: 101 }, deps)
    ).rejects.toThrow('communication_source_unavailable');
    await expect(
      communicationRead({ operation: 'list', after: id, limit: 10 }, deps)
    ).rejects.toThrow('communication_source_unavailable');
    deps.listIds.mockResolvedValue([id, id]);
    await expect(
      communicationRead({ operation: 'list', after: null, limit: 10 }, deps)
    ).rejects.toThrow('communication_source_unavailable');
  });
  it('rejects invalid operations/identities and does not expose backend errors or cross-member purchase rows', async () => {
    for (const request of [null, {}, { operation: 'grant' }, { operation: 'member', id: 'bad-id' }])
      await expect(communicationRead(request, fixture())).rejects.toThrow(
        'communication_source_unavailable'
      );
    const deps = fixture();
    deps.purchases.findByUser.mockRejectedValue(Error('postgresql://private-secret'));
    await expect(communicationRead({ operation: 'member', id }, deps)).rejects.toThrow(
      /^communication_source_unavailable$/
    );
    deps.purchases.findByUser.mockResolvedValue([{ ...purchase, userId: 'other' }]);
    await expect(communicationRead({ operation: 'member', id }, deps)).rejects.toThrow(
      'communication_source_unavailable'
    );
    await expect(
      communicationRead({ operation: 'member', id }, { ...fixture(), databaseUrl: '' })
    ).rejects.toThrow('communication_source_unavailable');
  });
});
