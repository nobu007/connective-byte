/**
 * User Service
 * プロフィール管理・パスワード変更・アカウント削除（マイページの裏側）
 */

import {
  UserRepository,
  User,
  UpdateProfileData,
  OAuthAccountRecord,
} from '../interfaces/user-repository';
import { EmailService } from '../interfaces/email-service';
import { AuthError } from '../errors';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from '../../../common/utils/password';

/** アカウント削除の猶予期間（requirements.md: 30日） */
export const ACCOUNT_DELETION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export interface ProfileView {
  user: Omit<User, 'passwordHash'>;
  oauthAccounts: Array<Pick<OAuthAccountRecord, 'provider' | 'providerEmail' | 'linkedAt'>>;
}

const GITHUB_USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    /** 期限計算をテストで制御可能にする（デフォルトは実時間） */
    private clock: () => Date = () => new Date()
  ) {}

  /** プロフィール取得（パスワードハッシュを除く + OAuth連携一覧） */
  async getProfile(userId: string): Promise<ProfileView> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthError('AUTH_TOKEN_003', 'User not found', 401);
    }

    const oauthAccounts = await this.userRepository.findOAuthAccountsByUser(userId);
    const { passwordHash: _passwordHash, ...safeUser } = user;

    return {
      user: safeUser,
      oauthAccounts: oauthAccounts.map((a) => ({
        provider: a.provider,
        providerEmail: a.providerEmail,
        linkedAt: a.linkedAt,
      })),
    };
  }

  /**
   * プロフィール更新（入力検証もここに集約）
   */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<ProfileView> {
    const errors: string[] = [];

    if (data.fullName !== undefined) {
      data.fullName = data.fullName.trim();
      if (data.fullName.length < 1 || data.fullName.length > 100) {
        errors.push('Full name must be 1-100 characters');
      }
    }
    if (data.bio !== undefined && data.bio !== null && data.bio.length > 500) {
      errors.push('Bio must be at most 500 characters');
    }
    if (data.timezone !== undefined && data.timezone.length > 64) {
      errors.push('Timezone must be at most 64 characters');
    }
    if (data.githubUsername !== undefined && data.githubUsername !== null) {
      data.githubUsername = data.githubUsername.trim();
      if (data.githubUsername !== '' && !GITHUB_USERNAME_RE.test(data.githubUsername)) {
        errors.push('GitHub username format is invalid');
      }
      if (data.githubUsername === '') data.githubUsername = null;
    }

    if (errors.length > 0) {
      throw new AuthError('AUTH_PROFILE_001', errors.join(', '));
    }

    const updated = await this.userRepository.updateProfile(userId, data);
    if (!updated) {
      throw new AuthError('AUTH_TOKEN_003', 'User not found', 401);
    }
    return this.getProfile(userId);
  }

  /**
   * パスワード変更。
   * 現在セッション（Cookieのトークン）は維持し、他の全セッションを失効させる。
   * OAuth専用アカウント（passwordHash 空）は現在パスワード検証をスキップする。
   */
  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
    currentSessionId?: string
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthError('AUTH_TOKEN_003', 'User not found', 401);
    }

    // OAuth専用アカウント（パスワード未設定）以外は現在パスワード必須
    if (user.passwordHash) {
      if (!currentPassword) {
        throw new AuthError('AUTH_PASSWORD_001', 'Current password is required');
      }
      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) {
        throw new AuthError('AUTH_PASSWORD_001', 'Current password is incorrect');
      }
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      throw new AuthError('AUTH_PASSWORD_001', validation.errors.join(', '));
    }
    if (currentPassword && newPassword === currentPassword) {
      throw new AuthError(
        'AUTH_PASSWORD_001',
        'New password must be different from the current one'
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await this.userRepository.update(userId, { passwordHash });

    // 現在セッションのみ残して他を失効 + ログ + 通知
    await this.userRepository.revokeAllSessionsForUser(userId, currentSessionId);
    await this.userRepository.recordAuthLog({
      eventType: 'password_change',
      userId,
      success: true,
    });
    await this.emailService.sendPasswordChangedNotification(user.email);
  }

  /**
   * アカウント削除のスケジュール（30日猶予）。全セッションを失効させる。
   */
  async scheduleAccountDeletion(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthError('AUTH_TOKEN_003', 'User not found', 401);
    }
    if (user.deletionScheduledAt) {
      throw new AuthError('AUTH_DELETE_001', 'Account deletion is already scheduled', 409);
    }

    const scheduledFor = new Date(this.clock().getTime() + ACCOUNT_DELETION_GRACE_MS);
    await this.userRepository.scheduleAccountDeletion(userId, scheduledFor);
    await this.userRepository.revokeAllSessionsForUser(userId);
    await this.userRepository.recordAuthLog({
      eventType: 'account_deletion_scheduled',
      userId,
      email: user.email,
      success: true,
    });
    await this.emailService.sendAccountDeletionNotification(user.email, scheduledFor.toISOString());
    return scheduledFor.toISOString();
  }

  /** アカウント削除の取り消し（猶予期間内） */
  async cancelAccountDeletion(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthError('AUTH_TOKEN_003', 'User not found', 401);
    }
    if (!user.deletionScheduledAt) {
      throw new AuthError('AUTH_DELETE_002', 'No account deletion is scheduled', 409);
    }

    await this.userRepository.cancelAccountDeletion(userId);
    await this.userRepository.recordAuthLog({
      eventType: 'account_deletion_cancelled',
      userId,
      email: user.email,
      success: true,
    });
    await this.emailService.sendAccountDeletionCancelledNotification(user.email);
  }
}
