/**
 * @jest-environment node
 */
import { handler as newsletterHandler } from '../../../../../netlify/functions/newsletter';
import { handler as contactHandler } from '../../../../../netlify/functions/contact';
import type { HandlerEvent } from '../../../../../netlify/functions/netlify-function-types';
import { resetRateLimit, getRateLimitStatus } from '../../rate-limit';

// Mock Resend — single shared instance so function and test observe the same jest.fn's
jest.mock('resend', () => {
  const instance = {
    contacts: { create: jest.fn().mockResolvedValue({ id: 'contact_123' }) },
    emails: { send: jest.fn().mockResolvedValue({ id: 'email_123' }) },
  };
  return { Resend: jest.fn(() => instance) };
});

function createEvent(path: string, body: unknown, ip = 'fn-test-ip'): HandlerEvent {
  return {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-nf-client-connection-ip': ip,
    },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

describe('Netlify Functions adapters', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'test_api_key',
      RESEND_AUDIENCE_ID: 'test_audience_id',
    };
    resetRateLimit('fn-test-ip');
    resetRateLimit('fn-mapped-ip');
    resetRateLimit('fn-contact-ip');
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('newsletter function returns the handler response as a function response', async () => {
    const result = await newsletterHandler(
      createEvent('/api/newsletter', { email: 'test@example.com', consent: true }),
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).success).toBe(true);
    expect(result.headers['content-type']).toContain('application/json');
  });

  it('newsletter function maps the Netlify client IP header for rate limiting', async () => {
    await newsletterHandler(
      createEvent('/api/newsletter', { email: 'test@example.com', consent: true }, 'fn-mapped-ip'),
    );

    expect(getRateLimitStatus('fn-mapped-ip')).not.toBeNull();
  });

  it('newsletter function passes through validation errors', async () => {
    const result = await newsletterHandler(createEvent('/api/newsletter', { email: 'invalid', consent: true }));

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBeDefined();
  });

  it('contact function returns the handler response as a function response', async () => {
    const result = await contactHandler(
      createEvent(
        '/api/contact',
        { name: 'Test User', email: 'test@example.com', message: 'これはテスト用のメッセージです。', consent: true },
        'fn-contact-ip',
      ),
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).success).toBe(true);
  });

  it('contact function passes through validation errors', async () => {
    const result = await contactHandler(
      createEvent('/api/contact', { name: 'T', email: 'not-an-email', message: '', consent: false }, 'fn-contact-ip'),
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('バリデーションエラー');
  });
});
