/**
 * Newsletter subscription handler.
 * Shared by the Next.js route handler (development) and the Pages Functions (production).
 */
import { Resend } from 'resend';
import { newsletterSchema } from '../validation/newsletter-schema';
import { rateLimit } from '../rate-limit';
import { WelcomeEmail } from '../../emails/WelcomeEmail';
import { json } from './json';

export async function handleNewsletter(request: Request): Promise<Response> {
  try {
    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const clientIp = Array.isArray(ip) ? ip[0] : ip.split(',')[0];

    // Rate limiting: 3 requests per hour
    const rateLimitResult = await rateLimit(clientIp, 3, 3600);

    if (!rateLimitResult.success) {
      console.warn(`Newsletter rate limit exceeded for IP: ${clientIp}`);
      return json(
        {
          error: '送信回数が上限に達しました。しばらく待ってから再度お試しください。',
          resetTime: rateLimitResult.resetTime,
        },
        429,
      );
    }

    // Parse request body
    const body = await request.json();

    // Honeypot check - if website field is filled, it's likely a bot.
    // Inspect the raw body BEFORE schema validation (the schema rejects a filled
    // honeypot) so bots get a fake success without revealing the trap.
    const honeypot = (body as { website?: unknown }).website;
    if (typeof honeypot === 'string' && honeypot.length > 0) {
      console.log('Newsletter bot detected (honeypot triggered):', (body as { email?: unknown }).email);
      // Return success to avoid revealing the honeypot
      return json({ success: true });
    }

    // Validate request body
    const result = newsletterSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      console.warn('Newsletter validation error:', firstError);
      return json({ error: firstError.message }, 400);
    }

    const { email, name } = result.data;

    // Check if Resend is configured (construct lazily: an unconditional
    // module-level constructor throws during static export page-data collection)
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return json({ error: 'メール送信サービスが設定されていません。管理者にお問い合わせください。' }, 500);
    }

    if (!process.env.RESEND_AUDIENCE_ID) {
      console.error('RESEND_AUDIENCE_ID not configured');
      return json({ error: 'ニュースレター設定が完了していません。管理者にお問い合わせください。' }, 500);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Add subscriber to Resend audience
    try {
      await resend.contacts.create({
        email,
        firstName: name || undefined,
        audienceId: process.env.RESEND_AUDIENCE_ID,
      });

      console.log('Newsletter subscriber added:', { email, name: name || 'N/A' });
    } catch (error: unknown) {
      // Check if already subscribed
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already exists') || message.includes('Contact already exists')) {
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

    return json({
      success: true,
      message: 'ニュースレターへの登録が完了しました。ウェルカムメールをご確認ください。',
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);

    // Return user-friendly error message
    return json({ error: 'エラーが発生しました。もう一度お試しください。' }, 500);
  }
}
