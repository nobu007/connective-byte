/**
 * Resend Email Service (Production Implementation)
 *
 * functions/api の newsletter-handler / contact-handler と同じパターン:
 * リクエスト時に遅延コンストラクトし、process.env.RESEND_API_KEY を使用する。
 * connectivebyte.com ドメインは Resend で検証済み（本番フォームで実績あり）。
 */

import { Resend } from 'resend';
import { EmailService } from '../interfaces/email-service';

function getSiteUrl(): string {
  return process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://connectivebyte.com';
}

function getResend(): Resend {
  // 遅延生成: モジュール読み込み時のAPIキー検証を回避
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(apiKey);
}

const FROM = 'ConnectiveByte <noreply@connectivebyte.com>';

function button(url: string, label: string): string {
  return `<div style="margin:24px 0">
  <a href="${url}" style="background:#1e3a8a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">${label}</a>
</div>
<p style="color:#6b7280;font-size:13px">ボタンが動作しない場合は以下のURLをブラウザで開いてください:<br><a href="${url}" style="word-break:break-all">${url}</a></p>`;
}

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<body style="font-family:sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#1e3a8a">${title}</h2>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
  <p style="color:#9ca3af;font-size:12px">ConnectiveByte — 個を超え、知が立ち上がる場所<br>https://connectivebyte.com</p>
</body>
</html>`;
}

export class ResendEmailService implements EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `${getSiteUrl()}/verify-email?token=${token}`;
    const { error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: 'メールアドレスの確認 — ConnectiveByte',
      html: layout(
        'メールアドレスの確認',
        `<p>ConnectiveByteへのご登録ありがとうございます。</p>
<p>以下のボタンを押してメールアドレスの確認を完了してください（24時間有効）。</p>
${button(url, 'メールアドレスを確認する')}
<p style="color:#6b7280;font-size:13px">このメールに心当たりがない場合は無視してください。</p>`
      ),
    });
    if (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const url = `${getSiteUrl()}/reset-password?token=${token}`;
    const { error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: 'パスワードリセットのご案内 — ConnectiveByte',
      html: layout(
        'パスワードリセット',
        `<p>パスワードリセットのリクエストを受け付けました。</p>
<p>以下のURLから1時間以内に新しいパスワードを設定してください。</p>
${button(url, 'パスワードを再設定する')}
<p style="color:#6b7280;font-size:13px">このメールに心当たりがない場合は無視してください。パスワードは変更されません。</p>`
      ),
    });
    if (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  async sendPasswordChangedNotification(email: string): Promise<void> {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: 'パスワードが変更されました — ConnectiveByte',
      html: layout(
        'パスワード変更のお知らせ',
        `<p>ConnectiveByteアカウントのパスワードが変更されました。</p>
<p>すべてのセッションが無効化されたため、既存のログインは使用できません。</p>
<p style="color:#6b7280;font-size:13px">心当たりがない場合は、直ちにパスワードリセットを行いサポートまでご連絡ください。</p>`
      ),
    });
    if (error) {
      throw new Error(`Failed to send password changed notification: ${error.message}`);
    }
  }

  async sendAccountDeletionNotification(email: string, scheduledFor: string): Promise<void> {
    const date = new Date(scheduledFor);
    const dateText = Number.isNaN(date.getTime())
      ? scheduledFor
      : date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const { error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: 'アカウント削除を受け付けました — ConnectiveByte',
      html: layout(
        'アカウント削除の受け付け',
        `<p>アカウント削除のリクエストを受け付けました。</p>
<p><strong>${dateText}（JST）</strong>にアカウントとデータが完全に削除されます。</p>
<p>それまでの間、マイページから削除を取り消すことができます。</p>
<p style="color:#6b7280;font-size:13px">心当たりがない場合は、お早めにマイページで取り消してください。</p>`
      ),
    });
    if (error) {
      throw new Error(`Failed to send account deletion notification: ${error.message}`);
    }
  }

  async sendAccountDeletionCancelledNotification(email: string): Promise<void> {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: 'アカウント削除を取り消しました — ConnectiveByte',
      html: layout(
        'アカウント削除の取り消し',
        `<p>アカウント削除のリクエストを取り消しました。アカウントは引き続きご利用いただけます。</p>`
      ),
    });
    if (error) {
      throw new Error(`Failed to send account deletion cancelled notification: ${error.message}`);
    }
  }

  async sendAccountDeletionCompletedNotification(email: string): Promise<void> {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: 'アカウント削除が完了しました — ConnectiveByte',
      html: layout(
        'アカウント削除の完了',
        `<p>アカウント削除が完了し、データを匿名化しました。</p>
<p>これまでのご利用ありがとうございました。またのご登録をお待ちしています。</p>`
      ),
    });
    if (error) {
      throw new Error(`Failed to send account deletion completed notification: ${error.message}`);
    }
  }
}
