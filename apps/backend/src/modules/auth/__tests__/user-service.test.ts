/**
 * User Service Tests
 * プロフィール更新・パスワード変更・アカウント削除の検証
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { UserService, ACCOUNT_DELETION_GRACE_MS } from '../services/user-service';
import { JsonUserRepository } from '../implementations/json-user-repository';
import { EmailService } from '../interfaces/email-service';
import { hashPassword, verifyPassword } from '../../../common/utils/password';
import { DeviceInfo } from '../interfaces/user-repository';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const DEVICE: DeviceInfo = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
  browser: 'Chrome',
  os: 'Windows',
  device: 'Desktop',
};

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

describe('UserService', () => {
  let repository: JsonUserRepository;
  let emailService: MockEmailService;
  let service: UserService;
  let dbPath: string;
  let userId: string;
  let currentSessionId: string | undefined;

  /** 固定クロック（30日猶予の計算検証用） */
  const NOW = new Date('2026-06-01T00:00:00Z');

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `auth-user-test-${crypto.randomUUID()}.json`);
    repository = new JsonUserRepository(dbPath);
    emailService = new MockEmailService();
    service = new UserService(repository, emailService, () => NOW);

    const user = await repository.create({
      email: `user-${Date.now()}@example.com`,
      passwordHash: await hashPassword('OldPass123'),
      fullName: 'Test User',
      role: 'learner',
      isVerified: true,
      bio: null,
      timezone: 'UTC',
      githubUsername: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });
    userId = user.id;
    currentSessionId = undefined;
  });

  /** テストユーザーにセッションを追加（期限は実時間基準: findSessionsByUser は期限で濾過する） */
  async function addSession(token: string): Promise<string> {
    const session = await repository.createSession({
      userId,
      refreshTokenHash: sha256(token),
      deviceInfo: DEVICE,
      ipAddress: null,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    return session.id;
  }

  describe('getProfile', () => {
    it('should return the user without password hash and oauth list', async () => {
      const profile = await service.getProfile(userId);

      expect(profile.user.email).toMatch(/@example\.com$/);
      expect(profile.user).not.toHaveProperty('passwordHash');
      expect(profile.oauthAccounts).toEqual([]);
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', async () => {
      const profile = await service.updateProfile(userId, {
        fullName: 'Updated Name',
        bio: 'Full-stack developer',
        timezone: 'Asia/Tokyo',
        githubUsername: 'jinno',
      });

      expect(profile.user.fullName).toBe('Updated Name');
      expect(profile.user.bio).toBe('Full-stack developer');
      expect(profile.user.timezone).toBe('Asia/Tokyo');
      expect(profile.user.githubUsername).toBe('jinno');
    });

    it('should clear bio and githubUsername with null/empty string', async () => {
      await service.updateProfile(userId, { bio: 'temp', githubUsername: 'jinno' });
      const profile = await service.updateProfile(userId, { bio: null, githubUsername: '' });

      expect(profile.user.bio).toBeNull();
      expect(profile.user.githubUsername).toBeNull();
    });

    it.each([
      [{ fullName: 'a'.repeat(101) }, 'fullName'],
      [{ bio: 'b'.repeat(501) }, 'bio'],
      [{ timezone: 't'.repeat(65) }, 'timezone'],
      [{ githubUsername: '-invalid-' }, 'githubUsername'],
    ])('should reject invalid %s', async (data, field) => {
      await expect(service.updateProfile(userId, data)).rejects.toMatchObject({
        code: 'AUTH_PROFILE_001',
        httpStatus: 400,
      });
      // 更新されない
      const profile = await service.getProfile(userId);
      expect(profile.user[field as 'fullName']).not.toBe((data as Record<string, string>)[field]);
    });
  });

  describe('changePassword', () => {
    beforeEach(async () => {
      currentSessionId = await addSession('current-token');
      await addSession('other-token');
    });

    it('should reject a wrong current password', async () => {
      await expect(
        service.changePassword(userId, 'WrongPass123', 'NewPass123', currentSessionId)
      ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_001', httpStatus: 400 });
    });

    it('should reject a missing current password', async () => {
      await expect(
        service.changePassword(userId, undefined, 'NewPass123', currentSessionId)
      ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_001', httpStatus: 400 });
    });

    it('should reject a same password and a weak new password', async () => {
      await expect(
        service.changePassword(userId, 'OldPass123', 'OldPass123', currentSessionId)
      ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_001' });

      await expect(
        service.changePassword(userId, 'OldPass123', 'weak', currentSessionId)
      ).rejects.toMatchObject({ code: 'AUTH_PASSWORD_001' });
    });

    it('should update hash, revoke other sessions, keep current, and notify', async () => {
      await service.changePassword(userId, 'OldPass123', 'NewPass123', currentSessionId);

      // 新パスワードで検証できる
      const user = await repository.findById(userId);
      expect(await verifyPassword('NewPass123', user!.passwordHash)).toBe(true);

      // 現在セッションのみ残る
      const sessions = await repository.findSessionsByUser(userId);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(currentSessionId);

      // 通知メール
      expect(emailService.sent).toContainEqual({
        type: 'password_changed',
        email: user!.email,
      });
    });

    it('should allow OAuth-only users (empty hash) to set a password without current one', async () => {
      await repository.update(userId, { passwordHash: '' });

      await service.changePassword(userId, undefined, 'BrandNew123', currentSessionId);

      const user = await repository.findById(userId);
      expect(await verifyPassword('BrandNew123', user!.passwordHash)).toBe(true);
    });
  });

  describe('scheduleAccountDeletion', () => {
    it('should schedule deletion 30 days ahead, revoke sessions, and email', async () => {
      await addSession('token-a');

      const scheduledFor = await service.scheduleAccountDeletion(userId);

      expect(new Date(scheduledFor).getTime()).toBe(NOW.getTime() + ACCOUNT_DELETION_GRACE_MS);

      const user = await repository.findById(userId);
      expect(user?.deletionScheduledAt).toBe(scheduledFor);
      // 全セッション失効
      expect(await repository.findSessionsByUser(userId)).toHaveLength(0);
      expect(emailService.sent).toContainEqual({
        type: 'deletion_scheduled',
        email: user!.email,
      });
    });

    it('should reject double scheduling with 409', async () => {
      await service.scheduleAccountDeletion(userId);
      await expect(service.scheduleAccountDeletion(userId)).rejects.toMatchObject({
        code: 'AUTH_DELETE_001',
        httpStatus: 409,
      });
    });
  });

  describe('cancelAccountDeletion', () => {
    it('should cancel a scheduled deletion and email', async () => {
      await service.scheduleAccountDeletion(userId);

      await service.cancelAccountDeletion(userId);

      const user = await repository.findById(userId);
      expect(user?.deletionScheduledAt).toBeNull();
      expect(emailService.sent).toContainEqual({ type: 'deletion_cancelled', email: user!.email });
    });

    it('should reject cancel when nothing is scheduled with 409', async () => {
      await expect(service.cancelAccountDeletion(userId)).rejects.toMatchObject({
        code: 'AUTH_DELETE_002',
        httpStatus: 409,
      });
    });
  });

  describe('anonymized email reuse', () => {
    it('should allow re-registering an email after anonymization', async () => {
      const email = `reuse-${Date.now()}@example.com`;
      const user = await repository.create({
        email,
        passwordHash: 'hash',
        fullName: 'Reuse User',
        role: 'learner',
        isVerified: true,
        bio: null,
        timezone: 'UTC',
        githubUsername: null,
        deletionScheduledAt: null,
        deletedAt: null,
      });

      await repository.markUserDeletedAndAnonymize(user.id);

      // 匿名化後は元emailで検索できず、同じemailで再登録可能
      expect(await repository.findByEmail(email)).toBeNull();
      const recreated = await repository.create({
        email,
        passwordHash: 'hash',
        fullName: 'New User',
        role: 'learner',
        isVerified: true,
        bio: null,
        timezone: 'UTC',
        githubUsername: null,
        deletionScheduledAt: null,
        deletedAt: null,
      });
      expect(recreated.email).toBe(email);
    });
  });
});
