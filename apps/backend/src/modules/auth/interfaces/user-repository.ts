/**
 * User Repository Interface
 * Abstracts user data storage for swappable implementations
 */

export type UserRole = 'learner' | 'content_administrator' | 'system_admin';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
  /** 12週コース購入日（users.purchased_at ミラー）。未購入は null。正本は purchases テーブル */
  purchasedAt: string | null;
  bio: string | null;
  timezone: string;
  githubUsername: string | null;
  deletionScheduledAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** セッション一覧表示用の端末情報（User-Agent を軽く分類したもの） */
export interface DeviceInfo {
  userAgent: string;
  browser: string;
  os: string;
  device: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  /** ローテーション直前のハッシュ。再利用検知（リプレイ攻撃）に使用 */
  prevRefreshTokenHash: string | null;
  deviceInfo: DeviceInfo;
  ipAddress: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

export type AuthEventType =
  | 'login'
  | 'login_failed'
  | 'login_locked'
  | 'logout'
  | 'refresh_reuse_detected'
  | 'password_change'
  | 'password_reset'
  | 'oauth_login'
  | 'oauth_link'
  | 'account_deletion_scheduled'
  | 'account_deletion_cancelled'
  | 'account_deleted'
  | 'session_revoked';

export interface AuthLogEntry {
  eventType: AuthEventType;
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
  failureReason?: string | null;
}

export type OAuthProvider = 'google';

export interface OAuthAccountRecord {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail: string | null;
  linkedAt: string;
}

export interface UpdateProfileData {
  fullName?: string;
  /** null でクリア */
  bio?: string | null;
  timezone?: string;
  /** null でクリア */
  githubUsername?: string | null;
}

export interface EmailVerificationToken {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

export interface PasswordResetToken {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

export interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  deviceInfo: DeviceInfo;
  ipAddress: string | null;
  expiresAt: Date;
}

export interface LinkOAuthAccountInput {
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail: string | null;
}

export interface UserRepository {
  /**
   * Find user by ID（deleted_at が設定されたユーザーは返さない）
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email（deleted_at が設定されたユーザーは返さない）
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Create new user
   */
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;

  /**
   * Update user（任意フィールドの部分更新）
   */
  update(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null>;

  // --- sessions（refresh トークンはセッション行として管理・ローテーション対応） ---

  /**
   * セッション作成（refresh トークンハッシュを保存）
   */
  createSession(input: CreateSessionInput): Promise<SessionRecord>;

  /**
   * 現行または直前のハッシュでセッションを検索。
   * 期限切れは惰性削除して null を返す
   */
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>;

  /**
   * ユーザーの有効なセッション一覧（新しい順）
   */
  findSessionsByUser(userId: string): Promise<SessionRecord[]>;

  /**
   * refresh トークンの原子ローテーション。
   * presentedTokenHash が現行と一致した場合のみ更新し、
   * 一致しない（=競合 or 再利用）場合は false を返す
   */
  rotateSessionRefreshToken(
    sessionId: string,
    presentedTokenHash: string,
    newTokenHash: string,
    newExpiresAt: Date
  ): Promise<boolean>;

  /**
   * セッション失効（= 行削除）
   */
  revokeSession(sessionId: string): Promise<void>;

  /**
   * ユーザーの全セッション失効（exceptSessionId を除く）
   */
  revokeAllSessionsForUser(userId: string, exceptSessionId?: string): Promise<void>;

  /**
   * 期限切れセッションの削除（メンテナンス用）。削除件数を返す
   */
  deleteExpiredSessions(now?: Date): Promise<number>;

  // --- auth logs（監査ログ + ログインロックアウト计数の単一ソース） ---

  /**
   * 認証関連イベントの記録
   */
  recordAuthLog(entry: AuthLogEntry): Promise<void>;

  /**
   * 指定日時以降の email によるログイン失敗回数（ロックアウト判定）
   */
  countRecentFailedLogins(email: string, since: Date): Promise<number>;

  /**
   * 指定日時より古いログの削除（メンテナンス用）。削除件数を返す
   */
  deleteAuthLogsOlderThan(cutoff: Date): Promise<number>;

  // --- oauth accounts ---

  findOAuthAccount(
    provider: OAuthProvider,
    providerUserId: string
  ): Promise<OAuthAccountRecord | null>;

  findOAuthAccountsByUser(userId: string): Promise<OAuthAccountRecord[]>;

  linkOAuthAccount(input: LinkOAuthAccountInput): Promise<OAuthAccountRecord>;

  unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void>;

  unlinkAllOAuthAccountsForUser(userId: string): Promise<void>;

  // --- profile & lifecycle ---

  /**
   * プロフィール更新（fullName / bio / timezone / githubUsername）
   */
  updateProfile(id: string, data: UpdateProfileData): Promise<User | null>;

  /**
   * アカウント削除を scheduledFor に予約（30日猶予）
   */
  scheduleAccountDeletion(id: string, scheduledFor: Date): Promise<void>;

  /**
   * 削除予約を取り消し
   */
  cancelAccountDeletion(id: string): Promise<void>;

  /**
   * 削除予約日を過ぎて未処理のユーザー（メンテナンス用）
   */
  findUsersDueForDeletion(now: Date): Promise<User[]>;

  /**
   * 論理削除 + 匿名化（email を一意な無効値へ置換、パスワード無効化）
   */
  markUserDeletedAndAnonymize(id: string): Promise<void>;

  // --- email verification / password reset tokens ---

  /**
   * Store email verification token (hashed, 24h expiry per spec)
   */
  storeEmailVerificationToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;

  /**
   * Find email verification token by hash (returns null if missing or expired)
   */
  findEmailVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null>;

  /**
   * Delete email verification token (after successful verification)
   */
  deleteEmailVerificationToken(tokenHash: string): Promise<void>;

  /**
   * Store password reset token (hashed, 1h expiry per spec)
   */
  storePasswordResetToken(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;

  /**
   * Find password reset token by hash (returns null if missing or expired)
   */
  findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null>;

  /**
   * Delete all password reset tokens for user (after successful reset)
   */
  deletePasswordResetTokensForUser(userId: string): Promise<void>;

  /**
   * Clean expired verification/reset tokens（メンテナンス用）
   */
  cleanExpiredTokens(): Promise<void>;
}
