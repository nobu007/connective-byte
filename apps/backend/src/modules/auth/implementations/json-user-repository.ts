/**
 * JSON File-based User Repository Implementation
 * Lightweight implementation for development/testing
 * Can be swapped with Prisma/PostgreSQL in production
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  UserRepository,
  User,
  RefreshToken,
  EmailVerificationToken,
  PasswordResetToken,
} from '../interfaces/user-repository';

interface StoredToken {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

interface Database {
  users: User[];
  refreshTokens: StoredToken[];
  emailVerificationTokens: StoredToken[];
  passwordResetTokens: StoredToken[];
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
      refreshTokens: [],
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
        // 旧形式ファイル（トークン配列なし）への後方互換
        this.data = {
          users: parsed.users ?? [],
          refreshTokens: parsed.refreshTokens ?? [],
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
        refreshTokens: [],
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
    return this.data.users.find((u) => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.initialize();
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    await this.initialize();

    const now = new Date().toISOString();
    const user: User = {
      id: crypto.randomUUID(),
      ...userData,
      email: userData.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    this.data.users.push(user);
    await this.save();
    return user;
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    await this.initialize();

    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    this.data.users[index] = {
      ...this.data.users[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await this.save();
    return this.data.users[index];
  }

  async storeRefreshToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    await this.initialize();

    this.data.refreshTokens.push({
      tokenHash,
      userId,
      expiresAt: expiresAt.toISOString(),
    });

    await this.save();
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    await this.initialize();

    const token = this.data.refreshTokens.find((t) => t.tokenHash === tokenHash);
    if (!token) return null;

    // Check expiration
    if (new Date(token.expiresAt) < new Date()) {
      await this.removeRefreshToken(tokenHash);
      return null;
    }

    return {
      token: token.tokenHash,
      userId: token.userId,
      expiresAt: token.expiresAt,
    };
  }

  async removeRefreshToken(tokenHash: string): Promise<void> {
    await this.initialize();
    this.data.refreshTokens = this.data.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
    await this.save();
  }

  async removeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.initialize();
    this.data.refreshTokens = this.data.refreshTokens.filter((t) => t.userId !== userId);
    await this.save();
  }

  async cleanExpiredTokens(): Promise<void> {
    await this.initialize();
    const now = new Date();
    const isAlive = (t: StoredToken) => new Date(t.expiresAt) > now;
    this.data.refreshTokens = this.data.refreshTokens.filter(isAlive);
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
