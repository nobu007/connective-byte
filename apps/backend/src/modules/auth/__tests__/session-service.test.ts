/**
 * Session Service Tests
 * マイページ「セッション」タブのロジック検証
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { SessionService } from '../services/session-service';
import { JsonUserRepository } from '../implementations/json-user-repository';
import { DeviceInfo } from '../interfaces/user-repository';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const DEVICE: DeviceInfo = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
  browser: 'Chrome',
  os: 'Windows',
  device: 'Desktop',
};

async function createUser(repository: JsonUserRepository, email: string): Promise<string> {
  const user = await repository.create({
    email,
    passwordHash: 'hash',
    fullName: 'Session User',
    role: 'learner',
    isVerified: true,
    bio: null,
    timezone: 'UTC',
    githubUsername: null,
    purchasedAt: null,
    deletionScheduledAt: null,
    deletedAt: null,
  });
  return user.id;
}

describe('SessionService', () => {
  let repository: JsonUserRepository;
  let service: SessionService;
  let userId: string;
  let otherUserId: string;

  beforeEach(async () => {
    const dbPath = path.join(os.tmpdir(), `auth-session-test-${crypto.randomUUID()}.json`);
    repository = new JsonUserRepository(dbPath);
    service = new SessionService(repository);
    userId = await createUser(repository, `session-${Date.now()}@example.com`);
    otherUserId = await createUser(repository, `other-${Date.now()}@example.com`);
  });

  describe('listSessions', () => {
    it('should mark the session matching the current refresh token', async () => {
      const a = await repository.createSession({
        userId,
        refreshTokenHash: sha256('token-a'),
        deviceInfo: DEVICE,
        ipAddress: '203.0.113.1',
        expiresAt: new Date(Date.now() + 3600_000),
      });
      await repository.createSession({
        userId,
        refreshTokenHash: sha256('token-b'),
        deviceInfo: DEVICE,
        ipAddress: '203.0.113.2',
        expiresAt: new Date(Date.now() + 3600_000),
      });

      const sessions = await service.listSessions(userId, 'token-a');

      expect(sessions).toHaveLength(2);
      const current = sessions.find((s) => s.id === a.id);
      expect(current?.isCurrent).toBe(true);
      expect(sessions.filter((s) => s.isCurrent)).toHaveLength(1);
    });
  });

  describe('findCurrentSession', () => {
    it('should resolve the session record for the cookie token', async () => {
      const a = await repository.createSession({
        userId,
        refreshTokenHash: sha256('token-a'),
        deviceInfo: DEVICE,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 3600_000),
      });

      const found = await service.findCurrentSession(userId, 'token-a');
      expect(found?.id).toBe(a.id);

      expect(await service.findCurrentSession(userId, 'unknown-token')).toBeNull();
    });
  });

  describe('revokeSession', () => {
    it('should revoke an owned session', async () => {
      const a = await repository.createSession({
        userId,
        refreshTokenHash: sha256('token-a'),
        deviceInfo: DEVICE,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 3600_000),
      });

      const result = await service.revokeSession(userId, a.id);
      expect(result).toBe('revoked');
      expect(await repository.findSessionsByUser(userId)).toHaveLength(0);
    });

    it('should reject another user’s session id with 404', async () => {
      const other = await repository.createSession({
        userId: otherUserId,
        refreshTokenHash: sha256('token-other'),
        deviceInfo: DEVICE,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 3600_000),
      });

      await expect(service.revokeSession(userId, other.id)).rejects.toMatchObject({
        code: 'AUTH_SESSION_001',
        httpStatus: 404,
      });
      // 相手のセッションは失効しない
      expect(await repository.findSessionsByUser(otherUserId)).toHaveLength(1);
    });

    it('should reject an unknown session id with 404', async () => {
      await expect(service.revokeSession(userId, crypto.randomUUID())).rejects.toMatchObject({
        code: 'AUTH_SESSION_001',
        httpStatus: 404,
      });
    });
  });

  describe('revokeOthers', () => {
    it('should revoke all sessions except the current one', async () => {
      await repository.createSession({
        userId,
        refreshTokenHash: sha256('token-a'),
        deviceInfo: DEVICE,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 3600_000),
      });
      await repository.createSession({
        userId,
        refreshTokenHash: sha256('token-b'),
        deviceInfo: DEVICE,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 3600_000),
      });
      await repository.createSession({
        userId,
        refreshTokenHash: sha256('token-c'),
        deviceInfo: DEVICE,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 3600_000),
      });

      const revokedCount = await service.revokeOthers(userId, 'token-b');

      expect(revokedCount).toBe(2);
      const remaining = await repository.findSessionsByUser(userId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].refreshTokenHash).toBe(sha256('token-b'));
    });

    it('should reject when the current token has no session', async () => {
      await repository.createSession({
        userId,
        refreshTokenHash: sha256('token-a'),
        deviceInfo: DEVICE,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 3600_000),
      });

      await expect(service.revokeOthers(userId, 'unknown-token')).rejects.toMatchObject({
        code: 'AUTH_TOKEN_002',
        httpStatus: 401,
      });
    });
  });
});
