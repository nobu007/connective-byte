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
}
