// Optional: configure or set up a testing framework before each test
// if you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// used for __tests__/testing-library.js
import 'whatwg-fetch';
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Import Jest globals
import { beforeAll, afterEach, afterAll } from '@jest/globals';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());
