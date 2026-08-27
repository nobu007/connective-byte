/**
 * PostgreSQL User Repository Implementation (Neon)
 *
 * Cloudflare Workers 上で動作するため、TCP ドライバ(pg)ではなく
 * HTTP fetch ベースの @neondatabase/serverless を使用する
 * （Neon と Cloudflare Workers の公式統合パターン）。
 *
 * テーブル定義は scripts/init-auth-db.mjs を参照。
 */

import { Pool } from '@neondatabase/serverless';
import {
  UserRepository,
  User,
  RefreshToken,
  EmailVerificationToken,
  PasswordResetToken,
  UserRole,
} from '../interfaces/user-repository';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  is_verified: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TokenRow {
  token_hash: string;
  user_id: string;
  expires_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: row.role as UserRole,
    isVerified: row.is_verified,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/** UserRepository.update のフィールド → カラム対応 */
const UPDATE_COLUMNS: Record<string, string> = {
  email: 'email',
  passwordHash: 'password_hash',
  fullName: 'full_name',
  role: 'role',
  isVerified: 'is_verified',
};

export class PostgresUserRepository implements UserRepository {
  private pool: Pool | null = null;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || process.env.DATABASE_URL || '';
    if (!this.connectionString) {
      throw new Error('DATABASE_URL is required for PostgresUserRepository');
    }
  }

  /** 遅延初期化（lab/db/client.ts と同じパターン） */
  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({ connectionString: this.connectionString });
    }
    return this.pool;
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.getPool().query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.getPool().query<UserRow>('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const { rows } = await this.getPool().query<UserRow>(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        crypto.randomUUID(), // JsonUserRepository と同じくリポジトリが id を生成する
        userData.email.toLowerCase(),
        userData.passwordHash,
        userData.fullName,
        userData.role,
        userData.isVerified,
      ]
    );
    return rowToUser(rows[0]);
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [field, column] of Object.entries(UPDATE_COLUMNS)) {
      if (field in data) {
        sets.push(`${column} = $${paramIndex}`);
        values.push((data as Record<string, unknown>)[field]);
        paramIndex++;
      }
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    sets.push(`updated_at = now()`);
    values.push(id);

    const { rows } = await this.getPool().query<UserRow>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async storeRefreshToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    await this.getPool().query(
      'INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, userId, expiresAt.toISOString()]
    );
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    const { rows } = await this.getPool().query<TokenRow>(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return null;

    if (new Date(toIso(row.expires_at)) < new Date()) {
      await this.removeRefreshToken(tokenHash);
      return null;
    }

    return { token: row.token_hash, userId: row.user_id, expiresAt: toIso(row.expires_at) };
  }

  async removeRefreshToken(tokenHash: string): Promise<void> {
    await this.getPool().query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  }

  async removeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.getPool().query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  }

  async cleanExpiredTokens(): Promise<void> {
    await this.getPool().query(
      `DELETE FROM refresh_tokens WHERE expires_at < now();
       DELETE FROM email_verification_tokens WHERE expires_at < now();
       DELETE FROM password_reset_tokens WHERE expires_at < now();`
    );
  }

  async storeEmailVerificationToken(
    tokenHash: string,
    userId: string,
    expiresAt: Date
  ): Promise<void> {
    await this.getPool().query(
      'INSERT INTO email_verification_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, userId, expiresAt.toISOString()]
    );
  }

  async findEmailVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null> {
    const { rows } = await this.getPool().query<TokenRow>(
      'SELECT * FROM email_verification_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return null;

    if (new Date(toIso(row.expires_at)) < new Date()) {
      await this.deleteEmailVerificationToken(tokenHash);
      return null;
    }

    return { tokenHash: row.token_hash, userId: row.user_id, expiresAt: toIso(row.expires_at) };
  }

  async deleteEmailVerificationToken(tokenHash: string): Promise<void> {
    await this.getPool().query('DELETE FROM email_verification_tokens WHERE token_hash = $1', [
      tokenHash,
    ]);
  }

  async storePasswordResetToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    await this.getPool().query(
      'INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, userId, expiresAt.toISOString()]
    );
  }

  async findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    const { rows } = await this.getPool().query<TokenRow>(
      'SELECT * FROM password_reset_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return null;

    if (new Date(toIso(row.expires_at)) < new Date()) {
      await this.getPool().query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [
        tokenHash,
      ]);
      return null;
    }

    return { tokenHash: row.token_hash, userId: row.user_id, expiresAt: toIso(row.expires_at) };
  }

  async deletePasswordResetTokensForUser(userId: string): Promise<void> {
    await this.getPool().query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  }
}
