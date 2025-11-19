import { z } from 'zod';

// List of common disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'maildrop.cc',
];

/**
 * Check if an email address uses a disposable email domain
 */
function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Newsletter subscription form validation schema
 */
export const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください')
    .refine((email) => !isDisposableEmail(email), {
      message: 'このメールアドレスは使用できません',
    }),
  name: z.string().optional(),
  consent: z.boolean().refine((val) => val === true, {
    message: 'プライバシーポリシーに同意してください',
  }),
  // Honeypot field for bot detection (should remain empty)
  website: z.string().max(0).optional(),
});

export type NewsletterFormData = z.infer<typeof newsletterSchema>;
