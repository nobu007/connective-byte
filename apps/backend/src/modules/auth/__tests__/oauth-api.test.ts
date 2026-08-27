/**
 * OAuth API Tests
 * start/callback の 302 リダイレクトと Cookie セット/クリアを検証
 */

process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express, { Application } from 'express';
import { handleOAuthStart, handleOAuthCallback } from '../oauth.controller';
import { signOAuthState } from '../utils/oauth-state';

function extractCookie(response: request.Response, name: string): string | null {
  const raw = response.headers['set-cookie'];
  if (!raw) return null;
  const cookies = Array.isArray(raw) ? raw : [raw];
  const match = cookies.find((c: string) => c.startsWith(`${name}=`));
  return match ? match.split(';')[0] : null;
}

function cookieHeaderValue(response: request.Response): string {
  const raw = response.headers['set-cookie'];
  if (!raw) return '';
  return Array.isArray(raw) ? raw.join('\n') : String(raw);
}

/** state JWT のペイロード部分を base64 デコード */
function decodeStatePayload(state: string): { nonce: string; redirect: string } {
  const payload = state.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
}

describe('OAuth API Endpoints', () => {
  let app: Application;
  const SITE_URL = 'http://localhost:3100';

  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.SITE_URL = SITE_URL;
  });

  afterAll(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.SITE_URL;
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    app = express();
    app.get('/api/auth/google', handleOAuthStart('google'));
    app.get('/api/auth/google/callback', handleOAuthCallback('google'));
  });

  describe('GET /api/auth/google (start)', () => {
    it('should redirect to Google and set the state cookie', async () => {
      const response = await request(app).get('/api/auth/google').expect(302);

      const location = new URL(response.headers.location as string, 'https://x');
      expect(`${location.origin}${location.pathname}`).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth'
      );
      expect(location.searchParams.get('client_id')).toBe('test-client-id');

      const cookie = extractCookie(response, 'cb_oauth_state');
      expect(cookie).toMatch(/^cb_oauth_state=eyJ/);
      expect(cookieHeaderValue(response)).toMatch(/HttpOnly/i);

      // state ペイロードの redirect は既定 '/'
      const state = location.searchParams.get('state')!;
      expect(decodeStatePayload(state).redirect).toBe('/');
    });

    it('should carry a sanitized redirect path in the state', async () => {
      const response = await request(app).get('/api/auth/google?redirect=/mypage/').expect(302);

      const location = new URL(response.headers.location as string, 'https://x');
      expect(decodeStatePayload(location.searchParams.get('state')!).redirect).toBe('/mypage/');
    });

    it('should neutralize an open-redirect target', async () => {
      const response = await request(app)
        .get('/api/auth/google?redirect=//evil.example.com')
        .expect(302);

      const location = new URL(response.headers.location as string, 'https://x');
      expect(decodeStatePayload(location.searchParams.get('state')!).redirect).toBe('/');
    });

    it('should redirect to login error when not configured', async () => {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      const response = await request(app).get('/api/auth/google').expect(302);
      expect(response.headers.location).toBe(`${SITE_URL}/login/?error=oauth_unavailable`);

      process.env.GOOGLE_CLIENT_ID = clientId;
    });
  });

  describe('GET /api/auth/google/callback', () => {
    it('should redirect as cancelled when the user denied consent', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback?error=access_denied')
        .expect(302);

      expect(response.headers.location).toBe(`${SITE_URL}/login/?error=oauth_cancelled`);
      // state Cookie は常に破棄
      expect(cookieHeaderValue(response)).toMatch(/cb_oauth_state=/);
    });

    it('should reject when state or code is missing', async () => {
      const response = await request(app).get('/api/auth/google/callback?code=x').expect(302);
      expect(response.headers.location).toBe(`${SITE_URL}/login/?error=oauth_state`);
    });

    it('should reject when the cookie does not match the state', async () => {
      const state = signOAuthState({ nonce: 'n', redirect: '/' });
      const response = await request(app)
        .get(`/api/auth/google/callback?code=x&state=${encodeURIComponent(state)}`)
        .set('Cookie', `cb_oauth_state=${state}-forged`)
        .expect(302);

      expect(response.headers.location).toBe(`${SITE_URL}/login/?error=oauth_state`);
    });

    it('should redirect to the frontend redirect path on success', async () => {
      const email = `oauth-api-${Date.now()}@example.com`;
      let tokenCalled = false;
      jest.spyOn(global, 'fetch').mockImplementation(async () => {
        if (!tokenCalled) {
          tokenCalled = true;
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'at' }),
          } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            sub: `sub-${email}`,
            email,
            email_verified: true,
            name: 'OAuth API User',
          }),
        } as unknown as Response;
      });

      const state = signOAuthState({ nonce: 'n', redirect: '/mypage/' });
      const response = await request(app)
        .get(`/api/auth/google/callback?code=good&state=${encodeURIComponent(state)}`)
        .set('Cookie', `cb_oauth_state=${state}`)
        .expect(302);

      expect(response.headers.location).toBe(`${SITE_URL}/mypage/`);
      // セッションCookie セット + state Cookie クリア
      const cookies = cookieHeaderValue(response);
      expect(cookies).toMatch(/cb_rt=/);
      expect(cookies).toMatch(/cb_oauth_state=;.*Expires=Thu, 01 Jan 1970/);
    });

    it('should redirect as oauth_failed when code exchange fails', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockImplementation(
          async () => ({ ok: false, status: 400, json: async () => ({}) }) as unknown as Response
        );

      const state = signOAuthState({ nonce: 'n', redirect: '/' });
      const response = await request(app)
        .get(`/api/auth/google/callback?code=bad&state=${encodeURIComponent(state)}`)
        .set('Cookie', `cb_oauth_state=${state}`)
        .expect(302);

      expect(response.headers.location).toBe(`${SITE_URL}/login/?error=oauth_failed`);
    });
  });
});
