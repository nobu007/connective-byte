/**
 * Cookie utilities tests
 * cb_rt / cb_oauth_state の属性と取得パースの検証
 */

import { Request, Response } from 'express';
import {
  REFRESH_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  getCookie,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  setOAuthStateCookie,
  clearOAuthStateCookie,
} from '../utils/cookies';

/** res.cookie / res.clearCookie の呼び出しを記録するモック */
function createResMock(): Response & { calls: Array<{ name: string; options: object }> } {
  const calls: Array<{ name: string; options: object }> = [];
  const res = {
    cookie: (name: string, _value: string, options: object) => {
      calls.push({ name, options });
      return res;
    },
    clearCookie: (name: string, options: object) => {
      calls.push({ name, options });
      return res;
    },
  };
  return Object.assign(res as object, { calls }) as Response & {
    calls: Array<{ name: string; options: object }>;
  };
}

function createReqWithCookie(header: string | undefined): Request {
  return { headers: header ? { cookie: header } : {} } as unknown as Request;
}

describe('cookie utilities', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('getCookie', () => {
    it('should parse target cookie from header', () => {
      const req = createReqWithCookie('other=1; cb_rt=abc123; more=2');
      expect(getCookie(req, REFRESH_COOKIE_NAME)).toBe('abc123');
    });

    it('should return undefined when header missing or cookie absent', () => {
      expect(getCookie(createReqWithCookie(undefined), REFRESH_COOKIE_NAME)).toBeUndefined();
      expect(getCookie(createReqWithCookie('other=1'), REFRESH_COOKIE_NAME)).toBeUndefined();
      expect(getCookie(createReqWithCookie(''), REFRESH_COOKIE_NAME)).toBeUndefined();
    });

    it('should not match by prefix (cb_rt vs cb_rt2)', () => {
      const req = createReqWithCookie('cb_rt2=xyz');
      expect(getCookie(req, REFRESH_COOKIE_NAME)).toBeUndefined();
    });

    it('should decode URI-encoded values', () => {
      const req = createReqWithCookie('cb_oauth_state=a%2Bb%3Dc');
      expect(getCookie(req, OAUTH_STATE_COOKIE_NAME)).toBe('a+b=c');
    });

    it('should tolerate malformed encoding', () => {
      const req = createReqWithCookie('cb_rt=%E0%A4%A');
      // decodeURIComponent が例外を投える場合でも生の値を返す
      expect(getCookie(req, REFRESH_COOKIE_NAME)).toBe('%E0%A4%A');
    });
  });

  describe('setRefreshTokenCookie', () => {
    it('should set httpOnly lax cookie scoped to /api/auth (dev)', () => {
      process.env.NODE_ENV = 'test';
      const res = createResMock();

      setRefreshTokenCookie(res, 'token-value');

      expect(res.calls).toHaveLength(1);
      expect(res.calls[0].name).toBe(REFRESH_COOKIE_NAME);
      expect(res.calls[0].options).toEqual(
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
          path: '/api/auth',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
      );
      // 開発では Domain 属性なし（localhost のホスト専用Cookie）
      expect(res.calls[0].options).not.toHaveProperty('domain', '.connectivebyte.com');
    });

    it('should add Secure and Domain in production', () => {
      process.env.NODE_ENV = 'production';
      const res = createResMock();

      setRefreshTokenCookie(res, 'token-value');

      expect(res.calls[0].options).toEqual(
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          secure: true,
          domain: '.connectivebyte.com',
          path: '/api/auth',
        })
      );
    });
  });

  describe('clearRefreshTokenCookie', () => {
    it('should clear with matching attributes', () => {
      process.env.NODE_ENV = 'test';
      const res = createResMock();

      clearRefreshTokenCookie(res);

      expect(res.calls).toHaveLength(1);
      expect(res.calls[0].name).toBe(REFRESH_COOKIE_NAME);
      expect(res.calls[0].options).toEqual(
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/auth',
        })
      );
    });
  });

  describe('setOAuthStateCookie', () => {
    it('should set short-lived (10min) cookie', () => {
      process.env.NODE_ENV = 'test';
      const res = createResMock();

      setOAuthStateCookie(res, 'state-value');

      expect(res.calls[0].name).toBe(OAUTH_STATE_COOKIE_NAME);
      expect(res.calls[0].options).toEqual(
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/auth',
          maxAge: 10 * 60 * 1000,
        })
      );
    });

    it('should add Secure and Domain in production', () => {
      process.env.NODE_ENV = 'production';
      const res = createResMock();

      setOAuthStateCookie(res, 'state-value');

      expect(res.calls[0].options).toEqual(
        expect.objectContaining({ secure: true, domain: '.connectivebyte.com' })
      );
    });
  });

  describe('clearOAuthStateCookie', () => {
    it('should clear with matching attributes', () => {
      process.env.NODE_ENV = 'test';
      const res = createResMock();

      clearOAuthStateCookie(res);

      expect(res.calls[0].name).toBe(OAUTH_STATE_COOKIE_NAME);
      expect(res.calls[0].options).toEqual(
        expect.objectContaining({ path: '/api/auth', httpOnly: true })
      );
    });
  });
});
