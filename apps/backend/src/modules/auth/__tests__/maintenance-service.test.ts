/**
 * Maintenance Service Tests
 * Cron で日次実行される整理処理の検証
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { MaintenanceService } from '../services/maintenance-service';
import { JsonUserRepository } from '../implementations/json-user-repository';
import { EmailService } from '../interfaces/email-service';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

class MockEmailService implements EmailService {
  sent: Array<{ type: string; email: string }> = [];

  async sendVerificationEmail(email: string): Promise<void> {
    this.sent.push({ type: 'verification', email });
  }
  async sendPasswordResetEmail(email: string): Promise<void> {
    this.sent.push({ type: 'reset', email });
  }
  async sendPasswordChangedNotification(email: string): Promise<void> {
    this.sent.push({ type: 'password_changed', email });
  }
  async sendAccountDeletionNotification(email: string, _scheduledFor: string): Promise<void> {
    this.sent.push({ type: 'deletion_scheduled', email });
  }
  async sendAccountDeletionCancelledNotification(email: string): Promise<void> {
    this.sent.push({ type: 'deletion_cancelled', email });
  }
  async sendAccountDeletionCompletedNotification(email: string): Promise<void> {
    this.sent.push({ type: 'deletion_completed', email });
  }
}

describe('MaintenanceService', () => {
  let repository: JsonUserRepository;
  let emailService: MockEmailService;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `auth-mnt-test-${crypto.randomUUID()}.json`);
    repository = new JsonUserRepository(dbPath);
    emailService = new MockEmailService();
  });

  it('should delete expired sessions and keep active ones', async () => {
    const user = await repository.create({
      email: 'mnt@example.com',
      passwordHash: 'hash',
      fullName: 'Mnt User',
      role: 'learner',
      isVerified: true,
      bio: null,
      timezone: 'UTC',
      githubUsername: null,
      purchasedAt: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });

    await repository.createSession({
      userId: user.id,
      refreshTokenHash: sha256('expired'),
      deviceInfo: { userAgent: '', browser: 'Unknown', os: 'Unknown', device: 'Unknown' },
      ipAddress: null,
      expiresAt: new Date('2026-01-01T00:00:00Z'),
    });
    await repository.createSession({
      userId: user.id,
      refreshTokenHash: sha256('active'),
      deviceInfo: { userAgent: '', browser: 'Unknown', os: 'Unknown', device: 'Unknown' },
      ipAddress: null,
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    });

    const service = new MaintenanceService(
      repository,
      emailService,
      () => new Date('2026-06-01T00:00:00Z')
    );
    const result = await service.run();

    expect(result.expiredSessions).toBe(1);
    const remaining = await repository.findSessionsByUser(user.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].refreshTokenHash).toBe(sha256('active'));
  });

  it('should delete auth logs older than 90 days', async () => {
    const user = await repository.create({
      email: 'logs@example.com',
      passwordHash: 'hash',
      fullName: 'Logs User',
      role: 'learner',
      isVerified: true,
      bio: null,
      timezone: 'UTC',
      githubUsername: null,
      purchasedAt: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });

    // 直接DBファイルへ書き込み、created_at を任意の日時にする
    // （recordAuthLog は現在時刻で記録するため）
    const db = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
    db.authLogs.push(
      {
        id: crypto.randomUUID(),
        eventType: 'login',
        userId: user.id,
        email: 'logs@example.com',
        ipAddress: null,
        userAgent: null,
        success: true,
        failureReason: null,
        createdAt: '2026-01-01T00:00:00.000Z', // 90日+経過
      },
      {
        id: crypto.randomUUID(),
        eventType: 'login',
        userId: user.id,
        email: 'logs@example.com',
        ipAddress: null,
        userAgent: null,
        success: true,
        failureReason: null,
        createdAt: '2026-05-20T00:00:00.000Z', // 窓内
      }
    );
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    const service = new MaintenanceService(
      repository,
      emailService,
      () => new Date('2026-06-01T00:00:00Z')
    );
    const result = await service.run();

    // 2026-06-01 の90日前 = 2026-03-03 → 1月のログのみ削除
    expect(result.oldAuthLogs).toBe(1);
    const after = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
    expect(after.authLogs).toHaveLength(1);
    expect(after.authLogs[0].createdAt).toBe('2026-05-20T00:00:00.000Z');
  });

  it('should clean expired verification/reset tokens', async () => {
    const user = await repository.create({
      email: 'tokens@example.com',
      passwordHash: 'hash',
      fullName: 'Tokens User',
      role: 'learner',
      isVerified: false,
      bio: null,
      timezone: 'UTC',
      githubUsername: null,
      purchasedAt: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });

    await repository.storeEmailVerificationToken(
      sha256('old-verify'),
      user.id,
      new Date('2026-01-01T00:00:00Z')
    );
    await repository.storePasswordResetToken(
      sha256('fresh-reset'),
      user.id,
      new Date('2027-01-01T00:00:00Z')
    );

    const service = new MaintenanceService(
      repository,
      emailService,
      () => new Date('2026-06-01T00:00:00Z')
    );
    await service.run();

    expect(await repository.findEmailVerificationToken(sha256('old-verify'))).toBeNull();
    expect(await repository.findPasswordResetToken(sha256('fresh-reset'))).not.toBeNull();
  });

  it('should return zero counts on an empty database', async () => {
    const service = new MaintenanceService(
      repository,
      emailService,
      () => new Date('2026-06-01T00:00:00Z')
    );
    const result = await service.run();

    expect(result).toEqual({ expiredSessions: 0, oldAuthLogs: 0, processedDeletions: 0 });
  });

  it('should anonymize users whose deletion is due and skip future ones', async () => {
    const dueUser = await repository.create({
      email: 'due@example.com',
      passwordHash: 'hash',
      fullName: 'Due User',
      role: 'learner',
      isVerified: true,
      bio: null,
      timezone: 'UTC',
      githubUsername: null,
      purchasedAt: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });
    const futureUser = await repository.create({
      email: 'future@example.com',
      passwordHash: 'hash',
      fullName: 'Future User',
      role: 'learner',
      isVerified: true,
      bio: null,
      timezone: 'UTC',
      githubUsername: null,
      purchasedAt: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });
    await repository.scheduleAccountDeletion(dueUser.id, new Date('2026-05-01T00:00:00Z'));
    await repository.scheduleAccountDeletion(futureUser.id, new Date('2026-07-01T00:00:00Z'));
    await repository.createSession({
      userId: dueUser.id,
      refreshTokenHash: sha256('due-session'),
      deviceInfo: { userAgent: '', browser: 'Unknown', os: 'Unknown', device: 'Unknown' },
      ipAddress: null,
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    });

    const service = new MaintenanceService(
      repository,
      emailService,
      () => new Date('2026-06-01T00:00:00Z')
    );
    const result = await service.run();

    expect(result.processedDeletions).toBe(1);

    // 匿名化: 元の email では検索できず、無効 email に置換されている。
    // findById/findByEmail は deleted_at 済みユーザーを返さないため生ファイルで検証
    expect(await repository.findByEmail('due@example.com')).toBeNull();
    expect(await repository.findById(dueUser.id)).toBeNull();
    const raw = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
    const anonymized = raw.users.find((u: { id: string }) => u.id === dueUser.id);
    expect(anonymized.email).toBe(`deleted_${dueUser.id}@connectivebyte.invalid`);
    expect(anonymized.deletedAt).not.toBeNull();
    // セッションも失効
    expect(await repository.findSessionsByUser(dueUser.id)).toHaveLength(0);

    // 期限前のユーザーは影響なし
    expect(await repository.findByEmail('future@example.com')).not.toBeNull();

    // 完了メールは匿名化前の元 email 宛に1通
    expect(emailService.sent).toEqual([{ type: 'deletion_completed', email: 'due@example.com' }]);

    // account_deleted ログ
    const db = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
    expect(
      db.authLogs.some(
        (l: { eventType: string; userId: string }) =>
          l.eventType === 'account_deleted' && l.userId === dueUser.id
      )
    ).toBe(true);
  });

  it('should still anonymize when the completion email fails', async () => {
    const user = await repository.create({
      email: 'mailfail@example.com',
      passwordHash: 'hash',
      fullName: 'Mail Fail',
      role: 'learner',
      isVerified: true,
      bio: null,
      timezone: 'UTC',
      githubUsername: null,
      purchasedAt: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });
    await repository.scheduleAccountDeletion(user.id, new Date('2026-05-01T00:00:00Z'));

    const failingEmail = new MockEmailService();
    failingEmail.sendAccountDeletionCompletedNotification = async () => {
      throw new Error('resend unavailable');
    };

    const service = new MaintenanceService(
      repository,
      failingEmail,
      () => new Date('2026-06-01T00:00:00Z')
    );
    const result = await service.run();

    expect(result.processedDeletions).toBe(1);
    expect((await repository.findById(user.id))?.deletedAt).not.toBeNull();
  });
});
