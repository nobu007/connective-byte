/**
 * PostgreSQL User Repository Implementation (Neon)
 *
 * Cloudflare Workers 上で動作するため、TCP ドライバ(pg)ではなく
 * HTTP fetch ベースの @neondatabase/serverless を使用する
 * （Neon と Cloudflare Workers の公式統合パターン）。
 *
 * テーブル定義は scripts/init-auth-db.mjs を参照。
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless';
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
  DeviceInfo,
} from '../interfaces/user-repository';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  is_verified: boolean;
  bio: string | null;
  timezone: string;
  github_username: string | null;
  deletion_scheduled_at: Date | string | null;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  prev_refresh_token_hash: string | null;
  device_info: Partial<DeviceInfo> | string;
  ip_address: string | null;
  created_at: Date | string;
  last_activity_at: Date | string;
  expires_at: Date | string;
}

interface OAuthAccountRow {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  provider_email: string | null;
  linked_at: Date | string;
}

interface TokenRow {
  token_hash: string;
  user_id: string;
  expires_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIso(value);
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: row.role as User['role'],
    isVerified: row.is_verified,
    bio: row.bio,
    timezone: row.timezone,
    githubUsername: row.github_username,
    deletionScheduledAt: toIsoOrNull(row.deletion_scheduled_at),
    deletedAt: toIsoOrNull(row.deleted_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToSession(row: SessionRow): SessionRecord {
  const raw = typeof row.device_info === 'string' ? JSON.parse(row.device_info) : row.device_info;
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    prevRefreshTokenHash: row.prev_refresh_token_hash,
    deviceInfo: {
      userAgent: raw.userAgent ?? '',
      browser: raw.browser ?? 'Unknown',
      os: raw.os ?? 'Unknown',
      device: raw.device ?? 'Unknown',
    },
    ipAddress: row.ip_address,
    createdAt: toIso(row.created_at),
    lastActivityAt: toIso(row.last_activity_at),
    expiresAt: toIso(row.expires_at),
  };
}

function rowToOAuthAccount(row: OAuthAccountRow): OAuthAccountRecord {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider as OAuthProvider,
    providerUserId: row.provider_user_id,
    providerEmail: row.provider_email,
    linkedAt: toIso(row.linked_at),
  };
}

/** UserRepository.update のフィールド → カラム対応 */
const UPDATE_COLUMNS: Record<string, string> = {
  email: 'email',
  passwordHash: 'password_hash',
  fullName: 'full_name',
  role: 'role',
  isVerified: 'is_verified',
  bio: 'bio',
  timezone: 'timezone',
  githubUsername: 'github_username',
  deletionScheduledAt: 'deletion_scheduled_at',
  deletedAt: 'deleted_at',
};

export class PostgresUserRepository implements UserRepository {
  /**
   * neon() HTTP ドライバ（クエリ毎に独立した fetch）。
   *
   * Pool（WebSocket 接続）をモジュール singleton で保持すると、1リクエスト目で
   * 確立した接続が別リクエストから再利用され、Workers の
   * "Cannot perform I/O on behalf of a different request" で2リクエスト目以降が
   * 全て 500 になる。HTTP ドライバは接続を保持しないためこれを回避できる
   * （Neon × Workers の公式推奨パターン）。
   */
  private sql: NeonQueryFunction<false, false> | null = null;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || process.env.DATABASE_URL || '';
    if (!this.connectionString) {
      throw new Error('DATABASE_URL is required for PostgresUserRepository');
    }
  }

  /** 遅延初期化。pool.query 互換の { rows, rowCount } を返す（rowCount は
   *  RETURNING 付き SQL でのみ正確 — 必要な呼び出し側は RETURNING を付ける） */
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

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.query<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.query<UserRow>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const { rows } = await this.query<UserRow>(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_verified,
                          bio, timezone, github_username)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        crypto.randomUUID(), // JsonUserRepository と同じくリポジトリが id を生成する
        userData.email.toLowerCase(),
        userData.passwordHash,
        userData.fullName,
        userData.role,
        userData.isVerified,
        userData.bio,
        userData.timezone,
        userData.githubUsername,
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
        const value = (data as Record<string, unknown>)[field];
        if (value === null) {
          // NULL はプレースホルダなしで直接（$N を消費しない）
          sets.push(`${column} = NULL`);
        } else {
          sets.push(`${column} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    sets.push(`updated_at = now()`);
    values.push(id);

    const { rows } = await this.query<UserRow>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  // --- sessions ---

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const { rows } = await this.query<SessionRow>(
      `INSERT INTO sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING *`,
      [
        crypto.randomUUID(),
        input.userId,
        input.refreshTokenHash,
        JSON.stringify(input.deviceInfo),
        input.ipAddress,
        input.expiresAt.toISOString(),
      ]
    );
    return rowToSession(rows[0]);
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const { rows } = await this.query<SessionRow>(
      `SELECT * FROM sessions
       WHERE refresh_token_hash = $1 OR prev_refresh_token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return null;

    if (new Date(toIso(row.expires_at)) < new Date()) {
      await this.query('DELETE FROM sessions WHERE id = $1', [row.id]);
      return null;
    }

    return rowToSession(row);
  }

  async findSessionsByUser(userId: string): Promise<SessionRecord[]> {
    const { rows } = await this.query<SessionRow>(
      `SELECT * FROM sessions
       WHERE user_id = $1 AND expires_at > now()
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map(rowToSession);
  }

  async rotateSessionRefreshToken(
    sessionId: string,
    presentedTokenHash: string,
    newTokenHash: string,
    newExpiresAt: Date
  ): Promise<boolean> {
    // WHERE 句で現行ハッシュ一致を条件にする原子更新。
    // 更新0行（rows.length=0）は競合（他のリクエストが先にローテーション）かトークン再利用
    const { rowCount } = await this.query<{ id: string }>(
      `UPDATE sessions
       SET prev_refresh_token_hash = refresh_token_hash,
           refresh_token_hash = $3,
           expires_at = $4,
           last_activity_at = now()
       WHERE id = $1 AND refresh_token_hash = $2
       RETURNING id`,
      [sessionId, presentedTokenHash, newTokenHash, newExpiresAt.toISOString()]
    );
    return rowCount > 0;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  }

  async revokeAllSessionsForUser(userId: string, exceptSessionId?: string): Promise<void> {
    await this.query(
      `DELETE FROM sessions
       WHERE user_id = $1 AND ($2::uuid IS NULL OR id <> $2)`,
      [userId, exceptSessionId ?? null]
    );
  }

  async deleteExpiredSessions(now: Date = new Date()): Promise<number> {
    // HTTP ドライバは影響行数を返さないため CTE で件数を取得する
    const { rows } = await this.query<{ count: number }>(
      `WITH deleted AS (DELETE FROM sessions WHERE expires_at <= $1 RETURNING 1)
       SELECT count(*)::int AS count FROM deleted`,
      [now.toISOString()]
    );
    return rows[0]?.count ?? 0;
  }

  // --- auth logs ---

  async recordAuthLog(entry: AuthLogEntry): Promise<void> {
    await this.query(
      `INSERT INTO auth_logs (id, event_type, user_id, email, ip_address, user_agent, success, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        entry.eventType,
        entry.userId ?? null,
        entry.email ? entry.email.toLowerCase() : null,
        entry.ipAddress ?? null,
        entry.userAgent ?? null,
        entry.success,
        entry.failureReason ?? null,
      ]
    );
  }

  async countRecentFailedLogins(email: string, since: Date): Promise<number> {
    const { rows } = await this.query<{ count: string }>(
      `SELECT count(*) FROM auth_logs
       WHERE email = $1 AND success = FALSE AND event_type = 'login_failed' AND created_at > $2`,
      [email.toLowerCase(), since.toISOString()]
    );
    return parseInt(rows[0].count, 10);
  }

  async deleteAuthLogsOlderThan(cutoff: Date): Promise<number> {
    // HTTP ドライバは影響行数を返さないため CTE で件数を取得する
    const { rows } = await this.query<{ count: number }>(
      `WITH deleted AS (DELETE FROM auth_logs WHERE created_at < $1 RETURNING 1)
       SELECT count(*)::int AS count FROM deleted`,
      [cutoff.toISOString()]
    );
    return rows[0]?.count ?? 0;
  }

  // --- oauth accounts ---

  async findOAuthAccount(
    provider: OAuthProvider,
    providerUserId: string
  ): Promise<OAuthAccountRecord | null> {
    const { rows } = await this.query<OAuthAccountRow>(
      `SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2`,
      [provider, providerUserId]
    );
    return rows[0] ? rowToOAuthAccount(rows[0]) : null;
  }

  async findOAuthAccountsByUser(userId: string): Promise<OAuthAccountRecord[]> {
    const { rows } = await this.query<OAuthAccountRow>(
      `SELECT * FROM oauth_accounts WHERE user_id = $1 ORDER BY linked_at DESC`,
      [userId]
    );
    return rows.map(rowToOAuthAccount);
  }

  async linkOAuthAccount(input: LinkOAuthAccountInput): Promise<OAuthAccountRecord> {
    const { rows } = await this.query<OAuthAccountRow>(
      `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [crypto.randomUUID(), input.userId, input.provider, input.providerUserId, input.providerEmail]
    );
    return rowToOAuthAccount(rows[0]);
  }

  async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void> {
    await this.query('DELETE FROM oauth_accounts WHERE user_id = $1 AND provider = $2', [
      userId,
      provider,
    ]);
  }

  async unlinkAllOAuthAccountsForUser(userId: string): Promise<void> {
    await this.query('DELETE FROM oauth_accounts WHERE user_id = $1', [userId]);
  }

  // --- profile & lifecycle ---

  async updateProfile(id: string, data: UpdateProfileData): Promise<User | null> {
    return this.update(id, data);
  }

  async scheduleAccountDeletion(id: string, scheduledFor: Date): Promise<void> {
    await this.query(
      'UPDATE users SET deletion_scheduled_at = $2, updated_at = now() WHERE id = $1',
      [id, scheduledFor.toISOString()]
    );
  }

  async cancelAccountDeletion(id: string): Promise<void> {
    await this.query(
      'UPDATE users SET deletion_scheduled_at = NULL, updated_at = now() WHERE id = $1',
      [id]
    );
  }

  async findUsersDueForDeletion(now: Date): Promise<User[]> {
    const { rows } = await this.query<UserRow>(
      `SELECT * FROM users
       WHERE deleted_at IS NULL
         AND deletion_scheduled_at IS NOT NULL
         AND deletion_scheduled_at <= $1`,
      [now.toISOString()]
    );
    return rows.map(rowToUser);
  }

  async markUserDeletedAndAnonymize(id: string): Promise<void> {
    await this.query(
      `UPDATE users
       SET deleted_at = now(),
           email = 'deleted_' || id || '@connectivebyte.invalid',
           full_name = 'Deleted User',
           password_hash = '',
           bio = NULL,
           github_username = NULL,
           updated_at = now()
       WHERE id = $1`,
      [id]
    );
  }

  // --- tokens ---

  async storeEmailVerificationToken(
    tokenHash: string,
    userId: string,
    expiresAt: Date
  ): Promise<void> {
    await this.query(
      'INSERT INTO email_verification_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, userId, expiresAt.toISOString()]
    );
  }

  async findEmailVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null> {
    const { rows } = await this.query<TokenRow>(
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
    await this.query('DELETE FROM email_verification_tokens WHERE token_hash = $1', [tokenHash]);
  }

  async storePasswordResetToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    await this.query(
      'INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, userId, expiresAt.toISOString()]
    );
  }

  async findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    const { rows } = await this.query<TokenRow>(
      'SELECT * FROM password_reset_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return null;

    if (new Date(toIso(row.expires_at)) < new Date()) {
      await this.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      return null;
    }

    return { tokenHash: row.token_hash, userId: row.user_id, expiresAt: toIso(row.expires_at) };
  }

  async deletePasswordResetTokensForUser(userId: string): Promise<void> {
    await this.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  }

  async cleanExpiredTokens(): Promise<void> {
    await this.query(`DELETE FROM email_verification_tokens WHERE expires_at < now()`);
    await this.query(`DELETE FROM password_reset_tokens WHERE expires_at < now()`);
  }
}
