/**
 * Contact form handler.
 * Shared by the Next.js route handler (development) and the Netlify Function (production).
 */
import { Resend } from 'resend';
import { contactSchema } from '../validation/contact-schema';
import { json } from './json';

export async function handleContact(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    // Validate with Zod
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return json({ error: 'バリデーションエラー', details: result.error.flatten() }, 400);
    }

    const { name, email, message } = result.data;

    // Initialize Resend only if API key is available (request-time, so tests
    // and static export never trigger the constructor without a key)
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    // Check if Resend API key is configured
    if (!resend) {
      // In development (and tests) accept the submission without email so the
      // form is usable without a Resend account. In production, fail loudly:
      // returning success here would silently drop the inquiry (it would only
      // exist in the function logs) while the visitor believes it was sent.
      const env = process.env.NODE_ENV;
      if (env === 'production') {
        console.error('RESEND_API_KEY not configured. Contact submission rejected.');
        return json({ error: 'メール送信サービスが設定されていません。管理者にお問い合わせください。' }, 500);
      }
      console.warn('RESEND_API_KEY not configured. Email will not be sent.');
      console.log('Contact form submission:', { name, email, message });
      return json({ success: true, message: 'お問い合わせを受け付けました（開発モード）' }, 200);
    }

    // Send email using Resend
    const emailResult = await resend.emails.send({
      from: 'ConnectiveByte <contact@connectivebyte.com>',
      to: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@connectivebyte.com',
      replyTo: email,
      subject: `新しいお問い合わせ: ${name}様より`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #111827; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e3a8a 0%, #10b981 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .field { margin-bottom: 20px; }
              .label { font-weight: 600; color: #1e3a8a; margin-bottom: 5px; }
              .value { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #10b981; }
              .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">新しいお問い合わせ</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">ConnectiveByte ウェブサイトより</p>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">お名前</div>
                  <div class="value">${name}</div>
                </div>
                <div class="field">
                  <div class="label">メールアドレス</div>
                  <div class="value"><a href="mailto:${email}" style="color: #1e3a8a;">${email}</a></div>
                </div>
                <div class="field">
                  <div class="label">お問い合わせ内容</div>
                  <div class="value">${message.replace(/\n/g, '<br>')}</div>
                </div>
                <div class="footer">
                  <p>このメールに返信すると、お客様（${email}）に直接返信できます。</p>
                  <p>送信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Email sent successfully:', emailResult);

    return json({ success: true, message: 'お問い合わせを受け付けました' }, 200);
  } catch (error) {
    console.error('Contact form error:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      return json({ error: 'メール送信に失敗しました。しばらくしてから再度お試しください。' }, 500);
    }

    return json({ error: 'サーバーエラーが発生しました' }, 500);
  }
}
