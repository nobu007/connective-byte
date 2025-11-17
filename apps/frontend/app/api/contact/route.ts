import { NextRequest, NextResponse } from 'next/server';
import { contactSchema } from '@/lib/validation/contact-schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'バリデーションエラー', details: result.error.flatten() }, { status: 400 });
    }

    const { name, email, message } = result.data;

    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    // For now, just log the submission
    console.log('Contact form submission:', { name, email, message });

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In production, you would send an email here:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'contact@connectivebyte.com',
      to: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@connectivebyte.com',
      subject: `新しいお問い合わせ: ${name}様より`,
      html: `
        <h2>新しいお問い合わせ</h2>
        <p><strong>お名前:</strong> ${name}</p>
        <p><strong>メールアドレス:</strong> ${email}</p>
        <p><strong>お問い合わせ内容:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });
    */

    return NextResponse.json({ success: true, message: 'お問い合わせを受け付けました' }, { status: 200 });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
