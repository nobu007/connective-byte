/**
 * Email Service Interface
 * Abstracts email sending for swappable implementations
 */

export interface EmailService {
  /**
   * Send verification email
   */
  sendVerificationEmail(email: string, token: string): Promise<void>;

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(email: string, token: string): Promise<void>;

  /**
   * Send password changed notification
   */
  sendPasswordChangedNotification(email: string): Promise<void>;

  /**
   * アカウント削除を受け付けた旨の通知（30日猶予の案内）
   */
  sendAccountDeletionNotification(email: string, scheduledFor: string): Promise<void>;

  /**
   * アカウント削除の取り消し通知
   */
  sendAccountDeletionCancelledNotification(email: string): Promise<void>;

  /**
   * アカウント削除完了（匿名化）の通知
   */
  sendAccountDeletionCompletedNotification(email: string): Promise<void>;
}
