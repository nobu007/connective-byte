import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { newsletterSchema } from '@/lib/validation/newsletter-schema';
import { rateLimit } from '@/lib/rate-limit';
import { WelcomeEmail } from '@/emails/WelcomeEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const clientIp = Array.isArray(ip) ? ip[0] : ip.split(',')[0];

    // Rate limiting: 3 requests per hour
    const rateLimitResult = await rateLimit(clientIp, 3, 3600);

    if (!rateLimitResult.success) {
      console.warn(`Newsletter rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        {
          error: '送信回数が上限に達しました。しばらく待ってから再度お試しください。',
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = newsletterSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      console.warn('Newsletter validation error:', firstError);
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    const { email, name, website } = result.data;

    // Honeypot check - if website field is filled, it's likely a bot
    if (website) {
      console.log('Newsletter bot detected (honeypot triggered):', email);
      // Return success to avoid revealing the honeypot
      return NextResponse.json({ success: true });
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'メール送信サービスが設定されていません。管理者にお問い合わせください。' },
        { status: 500 },
      );
    }

    if (!process.env.RESEND_AUDIENCE_ID) {
      console.error('RESEND_AUDIENCE_ID not configured');
      return NextResponse.json(
        { error: 'ニュースレター設定が完了していません。管理者にお問い合わせください。' },
        { status: 500 },
      );
    }

    // Add subscriber to Resend audience
    try {
      await resend.contacts.create({
        email,
        firstName: name || undefined,
        audienceId: process.env.RESEND_AUDIENCE_ID,
      });

      console.log('Newsletter subscriber added:', { email, name: name || 'N/A' });
    } catch (error: any) {
      // Check if already subscribed
      if (error?.message?.includes('already exists') || error?.message?.includes('Contact already exists')) {
        console.log('Newsletter subscriber already exists:', email);
        // Still send welcome email and return success
      } else {
        console.error('Error adding subscriber to Resend:', error);
        throw error;
      }
    }

    // Send welcome email
    try {
      await resend.emails.send({
        from: 'ConnectiveByte <info@connectivebyte.com>',
        to: email,
        subject: 'ConnectiveByteニュースレターへようこそ',
        react: WelcomeEmail({ name: name || undefined }),
      });

      console.log('Welcome email sent to:', email);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't fail the request if email sending fails
      // The subscriber is already added to the audience
    }

    // Log subscription event
    const timestamp = new Date().toISOString();
    console.log('Newsletter subscription completed:', {
      email,
      name: name || 'N/A',
      timestamp,
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: 'ニュースレターへの登録が完了しました。ウェルカムメールをご確認ください。',
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);

    // Return user-friendly error message
    return NextResponse.json(
      {
        error: 'エラーが発生しました。もう一度お試しください。',
      },
      { status: 500 },
    );
  }
}
