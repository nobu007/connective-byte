/**
 * Authentication Service
 * Core business logic for user authentication
 */

import { UserRepository, User, UserRole, DeviceInfo } from '../interfaces/user-repository';
import { EmailService } from '../interfaces/email-service';
import { AuthError } from '../errors';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from '../../../common/utils/password';
import { generateToken } from '../../../middleware/auth';
import crypto from 'crypto';

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

/** セッション作成時のコンテキスト（controller がリクエストから抽出） */
export interface SessionContext {
  ipAddress: string | null;
  deviceInfo: DeviceInfo;
  userAgent?: string | null;
}

const UNKNOWN_DEVICE: DeviceInfo = {
  userAgent: '',
  browser: 'Unknown',
  os: 'Unknown',
  device: 'Unknown',
};

/** API レスポンスの user オブジェクト（パスワードハッシュ等は含めない） */
export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  /** Cookie 設定用。レスポンスJSONには含めない（controller の責務） */
  refreshToken: string;
}

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30日

/** ログインロックアウト: 1時間以内に10回失敗で拒否（requirements.md仕様） */
const LOGIN_LOCKOUT_THRESHOLD = 10;
const LOGIN_LOCKOUT_WINDOW_MS = 60 * 60 * 1000;

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    /** 期限計算をテストで制御可能にする（デフォルトは実時間） */
    private clock: () => Date = () => new Date()
  ) {}

  /**
   * Validate password strength（規則は common/utils/password.ts に単一化）
   */
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    return validatePasswordStrength(password);
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Register new user
   */
  async register(data: RegisterData, context?: SessionContext): Promise<AuthResponse> {
    // Validate email
    if (!this.validateEmail(data.email)) {
      throw new AuthError('AUTH_REG_003', 'Invalid email format');
    }

    // Validate password
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.valid) {
      throw new AuthError('AUTH_REG_003', passwordValidation.errors.join(', '));
    }

    // Check for existing email (generic error for security)
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AuthError('AUTH_REG_002', 'Registration failed');
    }

    // Hash password（PBKDF2-SHA256 — design.mdのbcrypt仕様からの
    // Workers CPU制限に伴う逸脱は common/utils/password.ts のコメント参照）
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      role: 'learner', // Default role per spec
      isVerified: false, // Email verification required
      bio: null,
      timezone: 'UTC',
      githubUsername: null,
      deletionScheduledAt: null,
      deletedAt: null,
    });

    // 検証トークンをSHA-256ハッシュで保存（24時間有効 — requirements.md仕様）
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(this.clock().getTime() + 24 * 60 * 60 * 1000);
    await this.userRepository.storeEmailVerificationToken(
      this.hashToken(verificationToken),
      user.id,
      verificationExpiry
    );
    await this.emailService.sendVerificationEmail(user.email, verificationToken);

    return this.issueSession(user, context);
  }

  /**
   * Login user
   *
   * ロックアウト: auth_logs の失敗ログ（1h窓・email毎）で计数し、閾値超過は
   * パスワード検証の前に拒否する。監査ログ（成功・失敗・ロック）もここで記録。
   */
  async login(data: LoginData, context?: SessionContext): Promise<AuthResponse> {
    // 監査記録: isVerified 未確認ユーザーもログインを許可する（意図的）。
    // 現状ゲート機能がなく、未確認でも閲覧可能な公開コンテンツと差がないため。
    // ゲート機能追加時に AUTH_VERIFY_* でブロックする。
    const email = data.email.toLowerCase();
    const logContext = {
      email,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    };

    // ロックアウト判定（DB ベース = isolate を跨いで有効）
    const failedCount = await this.userRepository.countRecentFailedLogins(
      email,
      new Date(this.clock().getTime() - LOGIN_LOCKOUT_WINDOW_MS)
    );
    if (failedCount >= LOGIN_LOCKOUT_THRESHOLD) {
      await this.userRepository.recordAuthLog({
        eventType: 'login_locked',
        ...logContext,
        success: false,
        failureReason: 'too_many_failures',
      });
      throw new AuthError(
        'AUTH_LOGIN_003',
        'Too many failed login attempts. Please try again later.',
        429,
        Math.ceil(LOGIN_LOCKOUT_WINDOW_MS / 1000)
      );
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // 未知emailも既知emailと同形の失敗ログ・応答（列挙対策）
      await this.userRepository.recordAuthLog({
        eventType: 'login_failed',
        ...logContext,
        success: false,
        failureReason: 'unknown_email',
      });
      throw new AuthError('AUTH_LOGIN_002', 'Invalid credentials', 401);
    }

    const isValidPassword = await verifyPassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      await this.userRepository.recordAuthLog({
        eventType: 'login_failed',
        ...logContext,
        userId: user.id,
        success: false,
        failureReason: 'invalid_password',
      });
      throw new AuthError('AUTH_LOGIN_002', 'Invalid credentials', 401);
    }

    await this.userRepository.recordAuthLog({
      eventType: 'login',
      ...logContext,
      userId: user.id,
      success: true,
    });

    return this.issueSession(user, context);
  }

  /**
   * Refresh access token（リフレッシュトークンのローテーション + 再利用検知）
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.userRepository.findSessionByTokenHash(tokenHash);
    if (!session) {
      throw new AuthError('AUTH_TOKEN_002', 'Invalid or expired refresh token', 401);
    }

    // 直前のハッシュ（= 一度ローテーション済みのトークン）の再呈示は
    // トークン窃取・リプレイの強い兆候 → 当該ユーザーの全セッションを失効
    if (session.prevRefreshTokenHash === tokenHash) {
      await this.userRepository.revokeAllSessionsForUser(session.userId);
      await this.userRepository.recordAuthLog({
        eventType: 'refresh_reuse_detected',
        userId: session.userId,
        success: false,
        failureReason: 'presented_prev_hash',
      });
      throw new AuthError('AUTH_TOKEN_002', 'Invalid or expired refresh token', 401);
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new AuthError('AUTH_TOKEN_002', 'Invalid or expired refresh token', 401);
    }

    // 原子ローテーション。false = 並行リクエストが先に更新済み（競合）。
    // 安全側に倒して全セッション失効（競合もう一方のローテーション後トークンも
    // 対象。single-flightなフロントでは通常起こらない）
    const newTokenRaw = crypto.randomBytes(32).toString('hex');
    const rotated = await this.userRepository.rotateSessionRefreshToken(
      session.id,
      tokenHash,
      this.hashToken(newTokenRaw),
      new Date(this.clock().getTime() + REFRESH_TOKEN_TTL_MS)
    );
    if (!rotated) {
      await this.userRepository.revokeAllSessionsForUser(session.userId);
      await this.userRepository.recordAuthLog({
        eventType: 'refresh_reuse_detected',
        userId: session.userId,
        success: false,
        failureReason: 'concurrent_rotation',
      });
      throw new AuthError('AUTH_TOKEN_002', 'Invalid or expired refresh token', 401);
    }

    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken, refreshToken: newTokenRaw };
  }

  /**
   * Logout（Cookie のリフレッシュトークンに紐づくセッションを失効）
   * トークン不正でも例外にしない（冪等）
   */
  async logout(refreshToken: string): Promise<void> {
    const session = await this.userRepository.findSessionByTokenHash(this.hashToken(refreshToken));
    if (session) {
      await this.userRepository.revokeSession(session.id);
      await this.userRepository.recordAuthLog({
        eventType: 'logout',
        userId: session.userId,
        success: true,
      });
    }
  }

  /**
   * ユーザーにセッションを発行（アクセストークン + リフレッシュCookie用トークン）
   */
  /** セッション発行（register/login/OAuth 共用。OAuth からも呼ばれるため public） */
  async issueSession(user: User, context?: SessionContext): Promise<AuthResponse> {
    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Refresh token (30 days)
    const refreshTokenRaw = crypto.randomBytes(32).toString('hex');
    await this.userRepository.createSession({
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshTokenRaw),
      deviceInfo: context?.deviceInfo ?? UNKNOWN_DEVICE,
      ipAddress: context?.ipAddress ?? null,
      expiresAt: new Date(this.clock().getTime() + REFRESH_TOKEN_TTL_MS),
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken: refreshTokenRaw,
    };
  }

  /**
   * 検証・リセット・リフレッシュの各トークンは256bitの高エントロピー乱数なので、
   * 保存・照合にはSHA-256で十分（bcryptは毎回ソルトが変わり照合不能）
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const stored = await this.userRepository.findEmailVerificationToken(tokenHash);
    if (!stored) {
      throw new AuthError('AUTH_VERIFY_002', 'Invalid or expired verification token');
    }

    await this.userRepository.update(stored.userId, { isVerified: true });
    await this.userRepository.deleteEmailVerificationToken(tokenHash);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // リセットトークンをSHA-256ハッシュで保存（1時間有効 — requirements.md仕様）
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(this.clock().getTime() + 60 * 60 * 1000);
    await this.userRepository.storePasswordResetToken(
      this.hashToken(resetToken),
      user.id,
      expiresAt
    );
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const stored = await this.userRepository.findPasswordResetToken(tokenHash);
    if (!stored) {
      throw new AuthError('AUTH_RESET_003', 'Invalid or expired reset token');
    }

    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      throw new AuthError('AUTH_RESET_003', validation.errors.join(', '));
    }

    const passwordHash = await hashPassword(newPassword);
    await this.userRepository.update(stored.userId, { passwordHash });

    // 全セッション無効化（requirements.md仕様）+ トークン単用途化
    await this.userRepository.revokeAllSessionsForUser(stored.userId);
    await this.userRepository.deletePasswordResetTokensForUser(stored.userId);
    await this.userRepository.recordAuthLog({
      eventType: 'password_reset',
      userId: stored.userId,
      success: true,
    });

    const user = await this.userRepository.findById(stored.userId);
    if (user) {
      await this.emailService.sendPasswordChangedNotification(user.email);
    }
  }
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isVerified: user.isVerified,
  };
}
