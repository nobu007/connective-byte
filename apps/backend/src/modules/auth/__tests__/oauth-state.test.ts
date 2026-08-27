/**
 * OAuth State Tests
 * 署名 state（JWT）と リダイレクトパス検証の確認
 */

process.env.JWT_SECRET = 'test-secret-key';

import { signOAuthState, verifyOAuthState, sanitizeRedirectPath } from '../utils/oauth-state';

describe('oauth-state', () => {
  describe('signOAuthState / verifyOAuthState', () => {
    it('should round-trip a payload', () => {
      const state = signOAuthState({ nonce: 'abc123', redirect: '/mypage/' });
      expect(verifyOAuthState(state)).toEqual({ nonce: 'abc123', redirect: '/mypage/' });
    });

    it('should reject a tampered signature', () => {
      const state = signOAuthState({ nonce: 'abc123', redirect: '/' });
      const tampered = `${state.slice(0, -6)}XXXXXX`;
      expect(verifyOAuthState(tampered)).toBeNull();
    });

    it('should reject a token signed with a different secret', () => {
      const state = signOAuthState({ nonce: 'abc123', redirect: '/' });
      const previous = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'other-secret';
      expect(verifyOAuthState(state)).toBeNull();
      process.env.JWT_SECRET = previous;
    });

    it('should reject an expired state', () => {
      const state = signOAuthState({ nonce: 'abc123', redirect: '/' }, -1);
      expect(verifyOAuthState(state)).toBeNull();
    });

    it('should reject a non-state JWT or garbage', () => {
      expect(verifyOAuthState('garbage')).toBeNull();
      expect(verifyOAuthState('')).toBeNull();
      // JWT だが nonce/redirect を持たない
      const jwt = require('jsonwebtoken');
      const other = jwt.sign({ foo: 'bar' }, 'test-secret-key');
      expect(verifyOAuthState(other)).toBeNull();
    });
  });

  describe('sanitizeRedirectPath', () => {
    it('should accept in-site paths', () => {
      expect(sanitizeRedirectPath('/mypage/')).toBe('/mypage/');
      expect(sanitizeRedirectPath('/')).toBe('/');
      expect(sanitizeRedirectPath('/articles/abc?x=1')).toBe('/articles/abc?x=1');
    });

    it('should neutralize open-redirect targets', () => {
      expect(sanitizeRedirectPath('https://evil.example.com')).toBe('/');
      expect(sanitizeRedirectPath('//evil.example.com')).toBe('/');
      expect(sanitizeRedirectPath('/\\evil.example.com')).toBe('/');
      expect(sanitizeRedirectPath('mypage')).toBe('/');
      expect(sanitizeRedirectPath(undefined)).toBe('/');
      expect(sanitizeRedirectPath(['/x'] as unknown)).toBe('/');
    });
  });
});
