import { newsletterSchema } from '../newsletter-schema';

describe('Newsletter Schema Validation', () => {
  describe('Valid inputs', () => {
    it('should accept valid email and consent', () => {
      const result = newsletterSchema.safeParse({
        email: 'test@example.com',
        consent: true,
        website: '',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.consent).toBe(true);
      }
    });

    it('should accept valid email with name', () => {
      const result = newsletterSchema.safeParse({
        email: 'test@example.com',
        name: 'Test User',
        consent: true,
        website: '',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test User');
      }
    });

    it('should accept email without name', () => {
      const result = newsletterSchema.safeParse({
        email: 'test@example.com',
        consent: true,
        website: '',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Invalid email', () => {
    it('should reject invalid email format', () => {
      const result = newsletterSchema.safeParse({
        email: 'invalid-email',
        consent: true,
        website: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('有効なメールアドレス');
      }
    });

    it('should reject empty email', () => {
      const result = newsletterSchema.safeParse({
        email: '',
        consent: true,
        website: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject disposable email domains', () => {
      const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email'];

      disposableDomains.forEach((domain) => {
        const result = newsletterSchema.safeParse({
          email: `test@${domain}`,
          consent: true,
          website: '',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('このメールアドレスは使用できません');
        }
      });
    });
  });

  describe('Consent validation', () => {
    it('should reject when consent is false', () => {
      const result = newsletterSchema.safeParse({
        email: 'test@example.com',
        consent: false,
        website: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('同意');
      }
    });

    it('should reject when consent is missing', () => {
      const result = newsletterSchema.safeParse({
        email: 'test@example.com',
        website: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Honeypot validation', () => {
    it('should reject when honeypot field is filled', () => {
      const result = newsletterSchema.safeParse({
        email: 'test@example.com',
        consent: true,
        website: 'http://spam.com',
      });

      expect(result.success).toBe(false);
    });

    it('should accept when honeypot field is empty', () => {
      const result = newsletterSchema.safeParse({
        email: 'test@example.com',
        consent: true,
        website: '',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Name validation', () => {
    it('should accept valid names', () => {
      const validNames = ['田中太郎', 'John Doe', 'Alice', '山田 花子'];

      validNames.forEach((name) => {
        const result = newsletterSchema.safeParse({
          email: 'test@example.com',
          name,
          consent: true,
          website: '',
        });

        expect(result.success).toBe(true);
      });
    });
  });
});
