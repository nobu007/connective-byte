/**
 * Console Email Service (Stub Implementation)
 * Logs email sending to console for development
 * Can be replaced with Resend implementation in production
 */

import { EmailService } from '../interfaces/email-service';

export class ConsoleEmailService implements EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    console.log(`[EMAIL SERVICE] Verification email sent to: ${email}`);
    console.log(`[EMAIL SERVICE] Verification token: ${token}`);
    console.log(
      `[EMAIL SERVICE] Verification link: http://localhost:3000/verify-email?token=${token}`
    );
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    console.log(`[EMAIL SERVICE] Password reset email sent to: ${email}`);
    console.log(`[EMAIL SERVICE] Reset token: ${token}`);
    console.log(`[EMAIL SERVICE] Reset link: http://localhost:3000/reset-password?token=${token}`);
  }

  async sendPasswordChangedNotification(email: string): Promise<void> {
    console.log(`[EMAIL SERVICE] Password changed notification sent to: ${email}`);
  }

  async sendAccountDeletionNotification(email: string, scheduledFor: string): Promise<void> {
    console.log(`[EMAIL SERVICE] Account deletion scheduled for: ${email} at ${scheduledFor}`);
  }

  async sendAccountDeletionCancelledNotification(email: string): Promise<void> {
    console.log(`[EMAIL SERVICE] Account deletion cancelled for: ${email}`);
  }

  async sendAccountDeletionCompletedNotification(email: string): Promise<void> {
    console.log(`[EMAIL SERVICE] Account deletion completed for: ${email}`);
  }
}
