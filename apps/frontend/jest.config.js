const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Module path mapping for monorepo structure
  moduleDirectories: ['node_modules', '<rootDir>/../..'],
  // 注意: ESM-only パッケージ（react-markdown 等）の transform 指定は
  // ここでは効かない。next/jest は transformIgnorePatterns の先頭に
  // '/node_modules/' を強制し、ユーザ設定は追記しかできないため。
  // next.config.ts の transpilePackages で指定すること。
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config);
