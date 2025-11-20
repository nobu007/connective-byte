import { POST } from '../route';
import { NextRequest } from 'next/server';
import { resetRateLimit } from '@/lib/rate-limit';
import { Resend } from 'resend';
import { z } from 'zod';
import { newsletterSchema } from '@/lib/validation/newsletter-schema';

// Polyfill Response.json for Jest environment
if (!Response.json) {
  Response.json = function (data: unknown, init?: ResponseInit) {
    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const response = new Response(blob, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    return response;
  };
}

// Mock Resend
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      contacts: {
        create: jest.fn().mockResolvedValue({ id: 'contact_123' }),
      },
      emails: {
        send: jest.fn().mockResolvedValue({ id: 'email_123' }),
      },
    })),
  };
});

// Helper function to create a mock NextRequest
type NewsletterRequestPayload = Partial<z.infer<typeof newsletterSchema>>;

function createRequest(body: NewsletterRequestPayload, ip: string = 'test-ip'): NextRequest {
  const headers = new Headers();
  headers.set('x-forwarded-for', ip);
  headers.set('x-real-ip', ip);
  headers.set('content-type', 'application/json');

  const mockRequest = {
    json: jest.fn().mockResolvedValue(body),
    headers,
  } satisfies Partial<NextRequest> & {
    json: () => Promise<NewsletterRequestPayload>;
    headers: Headers;
  };

  return mockRequest as unknown as NextRequest;
}

// Helper function to parse response
async function parseResponse<TResponse = Record<string, unknown>>(response: Response): Promise<TResponse> {
  const text = await response.text();
  return JSON.parse(text) as TResponse;
}

// Mock environment variables
const originalEnv = process.env;

describe('POST /api/newsletter', () => {
  type MockResend = {
    contacts: { create: jest.Mock<Promise<{ id: string }>, [Record<string, unknown>]> };
    emails: { send: jest.Mock<Promise<{ id: string }>, [Record<string, unknown>]> };
  };

  let mockResend: MockResend;

  beforeEach(() => {
    // Reset environment variables
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'test_api_key',
      RESEND_AUDIENCE_ID: 'test_audience_id',
    };

    // Get mocked Resend instance
    mockResend = new Resend() as unknown as MockResend;

    // Reset rate limiting
    resetRateLimit('test-ip');
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Successful subscription', () => {
    it('should successfully subscribe with valid email and name', async () => {
      const request = createRequest(
        {
          email: 'test@example.com',
          name: 'Test User',
          consent: true,
        },
        'test-ip',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('登録が完了しました');
      expect(mockResend.contacts.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        firstName: 'Test User',
        audienceId: 'test_audience_id',
      });
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should successfully subscribe with email only (no name)', async () => {
      const request = createRequest(
        {
          email: 'test@example.com',
          consent: true,
        },
        'test-ip-2',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockResend.contacts.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        firstName: undefined,
        audienceId: 'test_audience_id',
      });
    });
  });

  describe('Validation errors', () => {
    it('should reject invalid email format', async () => {
      const request = createRequest(
        {
          email: 'invalid-email',
          consent: true,
        },
        'test-ip-3',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('有効なメールアドレス');
      expect(mockResend.contacts.create).not.toHaveBeenCalled();
    });

    it('should reject missing email', async () => {
      const request = createRequest(
        {
          consent: true,
        },
        'test-ip-4',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(mockResend.contacts.create).not.toHaveBeenCalled();
    });

    it('should reject missing consent', async () => {
      const request = createRequest(
        {
          email: 'test@example.com',
          consent: false,
        },
        'test-ip-5',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('プライバシーポリシーに同意');
      expect(mockResend.contacts.create).not.toHaveBeenCalled();
    });

    it('should reject disposable email domains', async () => {
      const request = createRequest(
        {
          email: 'test@tempmail.com',
          consent: true,
        },
        'test-ip-6',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('このメールアドレスは使用できません');
      expect(mockResend.contacts.create).not.toHaveBeenCalled();
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limit after 3 requests', async () => {
      const testIp = 'rate-limit-test-ip';

      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        const request = createRequest(
          {
            email: `test${i}@example.com`,
            consent: true,
          },
          testIp,
        );

        const response = await POST(request);
        expect(response.status).toBe(200);
      }

      // 4th request should be rate limited
      const request = createRequest(
        {
          email: 'test4@example.com',
          consent: true,
        },
        testIp,
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(429);
      expect(data.error).toContain('送信回数が上限に達しました');
      expect(data.resetTime).toBeDefined();
    });

    it('should track different IPs independently', async () => {
      const ip1 = 'ip-1';
      const ip2 = 'ip-2';

      const request1 = createRequest(
        {
          email: 'test1@example.com',
          consent: true,
        },
        ip1,
      );

      const request2 = createRequest(
        {
          email: 'test2@example.com',
          consent: true,
        },
        ip2,
      );

      const response1 = await POST(request1);
      const response2 = await POST(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Honeypot detection', () => {
    it('should detect bot submission via honeypot field', async () => {
      const request = createRequest(
        {
          email: 'bot@example.com',
          consent: true,
          website: 'http://spam.com', // Honeypot field filled
        },
        'bot-ip',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      // Should return fake success to avoid revealing honeypot
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // But should NOT actually add to Resend
      expect(mockResend.contacts.create).not.toHaveBeenCalled();
      expect(mockResend.emails.send).not.toHaveBeenCalled();
    });
  });

  describe('Resend API integration', () => {
    it('should handle already subscribed users gracefully', async () => {
      // Mock Resend to throw "already exists" error
      mockResend.contacts.create.mockRejectedValueOnce(new Error('Contact already exists in audience'));

      const request = createRequest(
        {
          email: 'existing@example.com',
          consent: true,
        },
        'existing-user-ip',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      // Should still return success
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Welcome email should still be sent
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should handle Resend API errors', async () => {
      // Mock Resend to throw generic error
      mockResend.contacts.create.mockRejectedValueOnce(new Error('API Error'));

      const request = createRequest(
        {
          email: 'test@example.com',
          consent: true,
        },
        'error-test-ip',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('エラーが発生しました');
    });

    it('should handle welcome email sending failure gracefully', async () => {
      // Mock email sending to fail
      mockResend.emails.send.mockRejectedValueOnce(new Error('Email sending failed'));

      const request = createRequest(
        {
          email: 'test@example.com',
          consent: true,
        },
        'email-fail-ip',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      // Should still return success since subscriber was added
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockResend.contacts.create).toHaveBeenCalled();
    });
  });

  describe('Configuration errors', () => {
    it('should return error when RESEND_API_KEY is not configured', async () => {
      delete process.env.RESEND_API_KEY;

      const request = createRequest(
        {
          email: 'test@example.com',
          consent: true,
        },
        'config-test-ip',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('メール送信サービスが設定されていません');
    });

    it('should return error when RESEND_AUDIENCE_ID is not configured', async () => {
      delete process.env.RESEND_AUDIENCE_ID;

      const request = createRequest(
        {
          email: 'test@example.com',
          consent: true,
        },
        'config-test-ip-2',
      );

      const response = await POST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('ニュースレター設定が完了していません');
    });
  });
});
