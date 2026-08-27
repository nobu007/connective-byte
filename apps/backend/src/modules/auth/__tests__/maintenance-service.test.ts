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

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

describe('MaintenanceService', () => {
  let repository: JsonUserRepository;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `auth-mnt-test-${crypto.randomUUID()}.json`);
    repository = new JsonUserRepository(dbPath);
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

    const service = new MaintenanceService(repository, () => new Date('2026-06-01T00:00:00Z'));
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

    const service = new MaintenanceService(repository, () => new Date('2026-06-01T00:00:00Z'));
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

    const service = new MaintenanceService(repository, () => new Date('2026-06-01T00:00:00Z'));
    await service.run();

    expect(await repository.findEmailVerificationToken(sha256('old-verify'))).toBeNull();
    expect(await repository.findPasswordResetToken(sha256('fresh-reset'))).not.toBeNull();
  });

  it('should return zero counts on an empty database', async () => {
    const service = new MaintenanceService(repository, () => new Date('2026-06-01T00:00:00Z'));
    const result = await service.run();

    expect(result).toEqual({ expiredSessions: 0, oldAuthLogs: 0, processedDeletions: 0 });
  });
});
