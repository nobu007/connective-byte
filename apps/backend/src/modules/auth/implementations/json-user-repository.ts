/**
 * JSON File-based User Repository Implementation
 * Lightweight implementation for development/testing
 * Can be swapped with PostgreSQL in production
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  UserRepository,
  User,
  SessionRecord,
  AuthLogEntry,
  OAuthAccountRecord,
  OAuthProvider,
  UpdateProfileData,
  CreateSessionInput,
  LinkOAuthAccountInput,
  EmailVerificationToken,
  PasswordResetToken,
} from '../interfaces/user-repository';

interface StoredToken {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

interface StoredSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  prevRefreshTokenHash: string | null;
  deviceInfo: SessionRecord['deviceInfo'];
  ipAddress: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

interface StoredAuthLog {
  id: string;
  eventType: AuthLogEntry['eventType'];
  userId: string | null;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
}

interface StoredOAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail: string | null;
  linkedAt: string;
}

interface Database {
  users: User[];
  sessions: StoredSession[];
  authLogs: StoredAuthLog[];
  oauthAccounts: StoredOAuthAccount[];
  emailVerificationTokens: StoredToken[];
  passwordResetTokens: StoredToken[];
}

/** 旧形式の User（Stage 2 のフィールド欠損）にデフォルトを補完 */
function normalizeUser(user: User): User {
  return {
    ...user,
    bio: user.bio ?? null,
    timezone: user.timezone ?? 'UTC',
    githubUsername: user.githubUsername ?? null,
    purchasedAt: user.purchasedAt ?? null,
    deletionScheduledAt: user.deletionScheduledAt ?? null,
    deletedAt: user.deletedAt ?? null,
  };
}

export class JsonUserRepository implements UserRepository {
  private dbPath: string;
  private data: Database;

  constructor(
    dbPath: string = process.env.AUTH_DB_PATH || path.join(process.cwd(), 'data/auth', 'users.json')
  ) {
    this.dbPath = dbPath;
    this.data = {
      users: [],
      sessions: [],
      authLogs: [],
      oauthAccounts: [],
      emailVerificationTokens: [],
      passwordResetTokens: [],
    };
  }

  /**
   * Initialize database
   */
  async initialize(): Promise<void> {
    try {
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      const exists = await fs
        .access(this.dbPath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        const content = await fs.readFile(this.dbPath, 'utf-8');
        const parsed = JSON.parse(content);
        // 旧形式ファイル（Stage 2 の配列なし）への後方互換
        this.data = {
          users: (parsed.users ?? []).map(normalizeUser),
          sessions: parsed.sessions ?? [],
          authLogs: parsed.authLogs ?? [],
          oauthAccounts: parsed.oauthAccounts ?? [],
          emailVerificationTokens: parsed.emailVerificationTokens ?? [],
          passwordResetTokens: parsed.passwordResetTokens ?? [],
        };
      } else {
        await this.save();
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      this.data = {
        users: [],
        sessions: [],
        authLogs: [],
        oauthAccounts: [],
        emailVerificationTokens: [],
        passwordResetTokens: [],
      };
    }
  }

  /**
   * Save database to disk
   */
  private async save(): Promise<void> {
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  async findById(id: string): Promise<User | null> {
    await this.initialize();
    const user = this.data.users.find((u) => u.id === id);
    return user && !user.deletedAt ? user : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.initialize();
    const user = this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user && !user.deletedAt ? user : null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    await this.initialize();

    const now = new Date().toISOString();
    const user = normalizeUser({
      id: crypto.randomUUID(),
      ...userData,
      email: userData.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    } as User);

    this.data.users.push(user);
    await this.save();
    return user;
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    await this.initialize();

    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    this.data.users[index] = normalizeUser({
      ...this.data.users[index],
      ...data,
      updatedAt: new Date().toISOString(),
    });

    await this.save();
    return this.data.users[index];
  }

  // --- sessions ---

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    await this.initialize();

    const now = new Date().toISOString();
    const session: StoredSession = {
      id: crypto.randomUUID(),
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      prevRefreshTokenHash: null,
      deviceInfo: input.deviceInfo,
      ipAddress: input.ipAddress,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: input.expiresAt.toISOString(),
    };

    this.data.sessions.push(session);
    await this.save();
    return { ...session };
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    await this.initialize();

    const session = this.data.sessions.find(
      (s) => s.refreshTokenHash === tokenHash || s.prevRefreshTokenHash === tokenHash
    );
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      await this.revokeSession(session.id);
      return null;
    }

    return { ...session };
  }

  async findSessionsByUser(userId: string): Promise<SessionRecord[]> {
    await this.initialize();

    const now = new Date();
    return this.data.sessions
      .filter((s) => s.userId === userId && new Date(s.expiresAt) > now)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((s) => ({ ...s }));
  }

  async rotateSessionRefreshToken(
    sessionId: string,
    presentedTokenHash: string,
    newTokenHash: string,
    newExpiresAt: Date
  ): Promise<boolean> {
    await this.initialize();

    const session = this.data.sessions.find((s) => s.id === sessionId);
    if (!session || session.refreshTokenHash !== presentedTokenHash) return false;

    session.prevRefreshTokenHash = session.refreshTokenHash;
    session.refreshTokenHash = newTokenHash;
    session.expiresAt = newExpiresAt.toISOString();
    session.lastActivityAt = new Date().toISOString();
    await this.save();
    return true;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.initialize();
    this.data.sessions = this.data.sessions.filter((s) => s.id !== sessionId);
    await this.save();
  }

  async revokeAllSessionsForUser(userId: string, exceptSessionId?: string): Promise<void> {
    await this.initialize();
    this.data.sessions = this.data.sessions.filter(
      (s) => s.userId !== userId || (exceptSessionId && s.id === exceptSessionId)
    );
    await this.save();
  }

  async deleteExpiredSessions(now: Date = new Date()): Promise<number> {
    await this.initialize();
    const before = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => new Date(s.expiresAt) > now);
    const deleted = before - this.data.sessions.length;
    if (deleted > 0) await this.save();
    return deleted;
  }

  // --- auth logs ---

  async recordAuthLog(entry: AuthLogEntry): Promise<void> {
    await this.initialize();

    this.data.authLogs.push({
      id: crypto.randomUUID(),
      eventType: entry.eventType,
      userId: entry.userId ?? null,
      email: entry.email ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      success: entry.success,
      failureReason: entry.failureReason ?? null,
      createdAt: new Date().toISOString(),
    });
    await this.save();
  }

  async countRecentFailedLogins(email: string, since: Date): Promise<number> {
    await this.initialize();
    return this.data.authLogs.filter(
      (l) =>
        l.eventType === 'login_failed' &&
        !l.success &&
        l.email === email.toLowerCase() &&
        new Date(l.createdAt) > since
    ).length;
  }

  async deleteAuthLogsOlderThan(cutoff: Date): Promise<number> {
    await this.initialize();
    const before = this.data.authLogs.length;
    this.data.authLogs = this.data.authLogs.filter((l) => new Date(l.createdAt) > cutoff);
    const deleted = before - this.data.authLogs.length;
    if (deleted > 0) await this.save();
    return deleted;
  }

  // --- oauth accounts ---

  async findOAuthAccount(
    provider: OAuthProvider,
    providerUserId: string
  ): Promise<OAuthAccountRecord | null> {
    await this.initialize();
    const account = this.data.oauthAccounts.find(
      (a) => a.provider === provider && a.providerUserId === providerUserId
    );
    return account ? { ...account } : null;
  }

  async findOAuthAccountsByUser(userId: string): Promise<OAuthAccountRecord[]> {
    await this.initialize();
    return this.data.oauthAccounts.filter((a) => a.userId === userId).map((a) => ({ ...a }));
  }

  async linkOAuthAccount(input: LinkOAuthAccountInput): Promise<OAuthAccountRecord> {
    await this.initialize();

    const account: StoredOAuthAccount = {
      id: crypto.randomUUID(),
      userId: input.userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      providerEmail: input.providerEmail,
      linkedAt: new Date().toISOString(),
    };
    this.data.oauthAccounts.push(account);
    await this.save();
    return { ...account };
  }

  async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void> {
    await this.initialize();
    this.data.oauthAccounts = this.data.oauthAccounts.filter(
      (a) => !(a.userId === userId && a.provider === provider)
    );
    await this.save();
  }

  async unlinkAllOAuthAccountsForUser(userId: string): Promise<void> {
    await this.initialize();
    this.data.oauthAccounts = this.data.oauthAccounts.filter((a) => a.userId !== userId);
    await this.save();
  }

  // --- profile & lifecycle ---

  async updateProfile(id: string, data: UpdateProfileData): Promise<User | null> {
    return this.update(id, data);
  }

  async scheduleAccountDeletion(id: string, scheduledFor: Date): Promise<void> {
    await this.update(id, { deletionScheduledAt: scheduledFor.toISOString() });
  }

  async cancelAccountDeletion(id: string): Promise<void> {
    await this.update(id, { deletionScheduledAt: null });
  }

  async findUsersDueForDeletion(now: Date): Promise<User[]> {
    await this.initialize();
    return this.data.users.filter(
      (u) =>
        !u.deletedAt && u.deletionScheduledAt !== null && new Date(u.deletionScheduledAt) <= now
    );
  }

  async markUserDeletedAndAnonymize(id: string): Promise<void> {
    await this.initialize();

    const user = this.data.users.find((u) => u.id === id);
    if (!user) return;

    // email の UNIQUE 制約を保つため一意な無効値へ置換（Postgres 実装と同一方式）
    user.email = `deleted_${id}@connectivebyte.invalid`;
    user.fullName = 'Deleted User';
    user.passwordHash = '';
    user.bio = null;
    user.githubUsername = null;
    user.deletedAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    await this.save();
  }

  // --- tokens ---

  async cleanExpiredTokens(): Promise<void> {
    await this.initialize();
    const now = new Date();
    const isAlive = (t: StoredToken) => new Date(t.expiresAt) > now;
    this.data.emailVerificationTokens = this.data.emailVerificationTokens.filter(isAlive);
    this.data.passwordResetTokens = this.data.passwordResetTokens.filter(isAlive);
    await this.save();
  }

  async storeEmailVerificationToken(
    tokenHash: string,
    userId: string,
    expiresAt: Date
  ): Promise<void> {
    await this.initialize();
    this.data.emailVerificationTokens.push({
      tokenHash,
      userId,
      expiresAt: expiresAt.toISOString(),
    });
    await this.save();
  }

  async findEmailVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null> {
    await this.initialize();
    const token = this.data.emailVerificationTokens.find((t) => t.tokenHash === tokenHash);
    if (!token) return null;

    if (new Date(token.expiresAt) < new Date()) {
      await this.deleteEmailVerificationToken(tokenHash);
      return null;
    }

    return { ...token };
  }

  async deleteEmailVerificationToken(tokenHash: string): Promise<void> {
    await this.initialize();
    this.data.emailVerificationTokens = this.data.emailVerificationTokens.filter(
      (t) => t.tokenHash !== tokenHash
    );
    await this.save();
  }

  async storePasswordResetToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    await this.initialize();
    this.data.passwordResetTokens.push({
      tokenHash,
      userId,
      expiresAt: expiresAt.toISOString(),
    });
    await this.save();
  }

  async findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    await this.initialize();
    const token = this.data.passwordResetTokens.find((t) => t.tokenHash === tokenHash);
    if (!token) return null;

    if (new Date(token.expiresAt) < new Date()) {
      this.data.passwordResetTokens = this.data.passwordResetTokens.filter(
        (t) => t.tokenHash !== tokenHash
      );
      await this.save();
      return null;
    }

    return { ...token };
  }

  async deletePasswordResetTokensForUser(userId: string): Promise<void> {
    await this.initialize();
    this.data.passwordResetTokens = this.data.passwordResetTokens.filter(
      (t) => t.userId !== userId
    );
    await this.save();
  }
}
