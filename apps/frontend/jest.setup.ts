// Optional: configure or set up a testing framework before each test
// if you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// used for __tests__/testing-library.js
import 'whatwg-fetch';
import '@testing-library/jest-dom';
import { configure } from '@testing-library/dom';
import { server } from './mocks/server';

// waitFor/findBy の猶予を広げる（既定1秒）。フルスイート並列実行時は最初の
// render がモジュールグラフのコールドスタートを支払い、fetch 後の初回描画が
// 1秒を超えることがある（実績: learning page の初回waitForが負荷で切断。
// 単独実行では293msで通る負荷依存フレーク）。成功は早く返る・実エラーは5秒後失敗
configure({ asyncUtilTimeout: 5000 });

// web-vitals uses Performance APIs jsdom does not implement; stub all reporters
jest.mock('web-vitals', () => ({
  onCLS: jest.fn(),
  onFCP: jest.fn(),
  onINP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
}));

// jsdom lacks IntersectionObserver (framer-motion in-view) and matchMedia; stub them
if (typeof window !== 'undefined') {
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds: ReadonlyArray<number> = [];
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
      takeRecords = (): IntersectionObserverEntry[] => [];
    };
  }
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })) as unknown as typeof window.matchMedia;
  }
}

// Import Jest globals
import { beforeAll, afterEach, afterAll } from '@jest/globals';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());
