import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { contactSchema } from '@/lib/validation/contact-schema';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'バリデーションエラー', details: result.error.flatten() }, { status: 400 });
    }

    const { name, email, message } = result.data;

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. Email will not be sent.');
      console.log('Contact form submission:', { name, email, message });
      return NextResponse.json(
        { success: true, message: 'お問い合わせを受け付けました（開発モード）' },
        { status: 200 },
      );
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

    return NextResponse.json({ success: true, message: 'お問い合わせを受け付けました' }, { status: 200 });
  } catch (error) {
    console.error('Contact form error:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'メール送信に失敗しました。しばらくしてから再度お試しください。' },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
