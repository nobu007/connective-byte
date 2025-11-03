import { getConfig } from '../index'; // Import getConfig directly

describe('Config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Most importantly - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  it('should return production config when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    const config = getConfig();
    expect(config.environment).toBe('production');
    expect(config.isProduction).toBe(true);
    expect(config.isDevelopment).toBe(false);
    expect(config.isTest).toBe(false);
  });

  it('should return development config when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    const config = getConfig();
    expect(config.environment).toBe('development');
    expect(config.isProduction).toBe(false);
    expect(config.isDevelopment).toBe(true);
    expect(config.isTest).toBe(false);
  });

  it('should return test config when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';
    const config = getConfig();
    expect(config.environment).toBe('test');
    expect(config.isProduction).toBe(false);
    expect(config.isDevelopment).toBe(false);
    expect(config.isTest).toBe(true);
  });

  it('should return development config by default when NODE_ENV is not set', () => {
    delete process.env.NODE_ENV;
    const config = getConfig();
    expect(config.environment).toBe('development');
    expect(config.isDevelopment).toBe(true);
  });

  it('should use the provided PORT environment variable', () => {
    process.env.PORT = '5000';
    const config = getConfig();
    expect(config.port).toBe(5000);
  });

  it('should use default port 3001 when PORT environment variable is not set', () => {
    delete process.env.PORT;
    const config = getConfig();
    expect(config.port).toBe(3001);
  });
});
