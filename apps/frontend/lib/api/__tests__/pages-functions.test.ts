/**
 * @jest-environment node
 */
import { onRequest as newsletterOnRequest } from '../../../../../functions/api/newsletter';
import { onRequest as contactOnRequest } from '../../../../../functions/api/contact';
import type { PagesFunctionContext } from '../pages-function';
import { resetRateLimit, getRateLimitStatus } from '../../rate-limit';

// Mock Resend — single shared instance so function and test observe the same jest.fn's
jest.mock('resend', () => {
  const instance = {
    contacts: { create: jest.fn().mockResolvedValue({ id: 'contact_123' }) },
    emails: { send: jest.fn().mockResolvedValue({ id: 'email_123' }) },
  };
  return { Resend: jest.fn(() => instance) };
});

function createContext(path: string, body: unknown, ip = 'cf-test-ip'): PagesFunctionContext {
  return {
    request: new Request(`https://connectivebyte.com${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': ip,
      },
      body: JSON.stringify(body),
    }),
    env: {},
    params: {},
    waitUntil: () => {},
  };
}

describe('Cloudflare Pages Functions adapters', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'test_api_key',
      RESEND_AUDIENCE_ID: 'test_audience_id',
    };
    resetRateLimit('cf-test-ip');
    resetRateLimit('cf-mapped-ip');
    resetRateLimit('cf-contact-ip');
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('newsletter function returns the handler response', async () => {
    const response = await newsletterOnRequest(
      createContext('/api/newsletter', {
        email: 'test@example.com',
        consent: true,
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('maps cf-connecting-ip to x-forwarded-for for rate limiting', async () => {
    const response = await newsletterOnRequest(
      createContext(
        '/api/newsletter',
        {
          email: 'test@example.com',
          consent: true,
        },
        'cf-mapped-ip',
      ),
    );

    expect(response.status).toBe(200);
    // レートリミットは変換後のIP（cf-mapped-ip）でカウントされる
    expect(getRateLimitStatus('cf-mapped-ip')).not.toBeNull();
  });

  it('injects env bindings into process.env for the shared handler', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_AUDIENCE_ID;

    const context = createContext('/api/newsletter', {
      email: 'test@example.com',
      consent: true,
    });
    // Pages の envバインディング経由で提供される状況を再現
    (context.env as Record<string, string>).RESEND_API_KEY = 'test_api_key';
    (context.env as Record<string, string>).RESEND_AUDIENCE_ID = 'test_audience_id';

    const response = await newsletterOnRequest(context);

    expect(response.status).toBe(200);
    expect(process.env.RESEND_API_KEY).toBe('test_api_key');
  });

  it('newsletter function rejects invalid input with 400', async () => {
    const response = await newsletterOnRequest(
      createContext('/api/newsletter', {
        email: 'not-an-email',
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('contact function returns the handler response', async () => {
    const response = await contactOnRequest(
      createContext(
        '/api/contact',
        {
          name: 'Test User',
          email: 'test@example.com',
          message: 'これはテスト用のメッセージです。',
          consent: true,
        },
        'cf-contact-ip',
      ),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
