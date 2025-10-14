/**
 * LoggingService Unit Tests
 * Comprehensive test suite for the logging service
 * Target coverage: > 95%
 */

import { loggingService, LoggingService } from '../loggingService';
import { LogFormatter, LogTransport, LogLevel, LogEntry } from '../../common/types';

describe('LoggingService', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  const originalEnv = process.env;

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Reset log level
    loggingService.setLogLevel('debug');

    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const logger = loggingService.createLogger('TestContext');

      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });

    it('should create multiple independent loggers', () => {
      const logger1 = loggingService.createLogger('Context1');
      const logger2 = loggingService.createLogger('Context2');

      logger1.info('Message from context 1');
      logger2.info('Message from context 2');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy.mock.calls[0][0]).toContain('Context1');
      expect(consoleLogSpy.mock.calls[1][0]).toContain('Context2');
    });

    it('should log with correct context', () => {
      const logger = loggingService.createLogger('TestContext');
      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestContext')
      );
    });
  });

  describe('log level filtering', () => {
    it('should log when level >= configured level', () => {
      loggingService.setLogLevel('info');
      const logger = loggingService.createLogger('Test');

      logger.info('Should appear');
      logger.warn('Should also appear');
      logger.error('Should also appear');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // info
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // warn + error
    });

    it('should skip logs when level < configured level', () => {
      loggingService.setLogLevel('warn');
      const logger = loggingService.createLogger('Test');

      logger.debug('Should not appear');
      logger.info('Should not appear');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should respect debug level', () => {
      loggingService.setLogLevel('debug');
      const logger = loggingService.createLogger('Test');

      logger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });

    it('should respect error level (only errors)', () => {
      loggingService.setLogLevel('error');
      const logger = loggingService.createLogger('Test');

      logger.debug('No');
      logger.info('No');
      logger.warn('No');
      logger.error('Yes');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('setLogLevel', () => {
    it('should update log level dynamically', () => {
      loggingService.setLogLevel('error');
      expect(loggingService.getLogLevel()).toBe('error');

      loggingService.setLogLevel('debug');
      expect(loggingService.getLogLevel()).toBe('debug');
    });

    it('should apply new level to all loggers', () => {
      const logger = loggingService.createLogger('Test');

      loggingService.setLogLevel('error');
      logger.info('Should not appear');

      loggingService.setLogLevel('info');
      logger.info('Should appear');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLogLevel', () => {
    it('should return current log level', () => {
      loggingService.setLogLevel('warn');
      expect(loggingService.getLogLevel()).toBe('warn');
    });
  });

  describe('getConfig', () => {
    it('should return logging configuration', () => {
      const config = loggingService.getConfig();

      expect(config).toHaveProperty('level');
      expect(config).toHaveProperty('format');
      expect(config).toHaveProperty('transports');
    });

    it('should include current level', () => {
      loggingService.setLogLevel('warn');
      const config = loggingService.getConfig();

      expect(config.level).toBe('warn');
    });

    it('should include format and transports', () => {
      const config = loggingService.getConfig();

      expect(['json', 'pretty']).toContain(config.format);
      expect(Array.isArray(config.transports)).toBe(true);
      expect(config.transports).toContain('console');
    });
  });

  describe('Logger instance methods', () => {
    describe('debug', () => {
      it('should log debug message', () => {
        const logger = loggingService.createLogger('Test');
        logger.debug('Debug message');

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Debug message')
        );
      });

      it('should include metadata', () => {
        const logger = loggingService.createLogger('Test');
        logger.debug('Debug message', { key: 'value' });

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('key')
        );
      });
    });

    describe('info', () => {
      it('should log info message', () => {
        const logger = loggingService.createLogger('Test');
        logger.info('Info message');

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Info message')
        );
      });

      it('should format metadata correctly', () => {
        const logger = loggingService.createLogger('Test');
        logger.info('Test', { userId: 123, action: 'login' });

        const output = consoleLogSpy.mock.calls[0][0];
        expect(output).toContain('userId');
        expect(output).toContain('action');
      });
    });

    describe('warn', () => {
      it('should log warning message', () => {
        const logger = loggingService.createLogger('Test');
        logger.warn('Warning message');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Warning message')
        );
      });

      it('should output to stderr', () => {
        const logger = loggingService.createLogger('Test');
        logger.warn('Warning');

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
      });
    });

    describe('error', () => {
      it('should log error message', () => {
        const logger = loggingService.createLogger('Test');
        logger.error('Error message');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error message')
        );
      });

      it('should include error object', () => {
        const logger = loggingService.createLogger('Test');
        const error = new Error('Test error');
        logger.error('Operation failed', error);

        const output = consoleErrorSpy.mock.calls[0][0];
        expect(output).toContain('Test error');
      });

      it('should include stack trace for errors', () => {
        const logger = loggingService.createLogger('Test');
        const error = new Error('Test error');
        logger.error('Failed', error);

        const output = consoleErrorSpy.mock.calls[0][0];
        expect(output).toContain('Error');
      });

      it('should output to stderr', () => {
        const logger = loggingService.createLogger('Test');
        logger.error('Error');

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('metadata enrichment', () => {
    it('should include system metadata', () => {
      const logger = loggingService.createLogger('Test');
      logger.info('Test');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('backend');
      expect(output).toContain('pid');
      expect(output).toContain('hostname');
    });

    it('should merge user metadata with system metadata', () => {
      const logger = loggingService.createLogger('Test');
      logger.info('Test', { custom: 'value' });

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('custom');
      expect(output).toContain('backend');
    });
  });

  describe('formatters', () => {
    it('should register custom formatter', () => {
      const customFormatter: LogFormatter = {
        format: (entry: LogEntry) => `CUSTOM: ${entry.message}`,
      };

      loggingService.registerFormatter('test', customFormatter);

      // Note: Can't easily test without changing format at runtime
      // This test verifies the method exists and doesn't throw
      expect(() =>
        loggingService.registerFormatter('test2', customFormatter)
      ).not.toThrow();
    });
  });

  describe('transports', () => {
    it('should register custom transport', () => {
      const logs: string[] = [];
      const customTransport: LogTransport = {
        log: (formatted: string) => logs.push(formatted),
      };

      loggingService.registerTransport('memory', customTransport);

      const logger = loggingService.createLogger('Test');
      logger.info('Test message');

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain('Test message');
    });

    it('should continue if transport throws error', () => {
      const errorTransport: LogTransport = {
        log: () => {
          throw new Error('Transport error');
        },
      };

      loggingService.registerTransport('error', errorTransport);

      const logger = loggingService.createLogger('Test');

      // Should not throw
      expect(() => logger.info('Test')).not.toThrow();

      // Console transport should still work
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle null message', () => {
      const logger = loggingService.createLogger('Test');

      expect(() => logger.info(null as unknown as string)).not.toThrow();
    });

    it('should handle undefined metadata', () => {
      const logger = loggingService.createLogger('Test');

      expect(() => logger.info('Test', undefined)).not.toThrow();
    });

    it('should handle empty metadata', () => {
      const logger = loggingService.createLogger('Test');
      logger.info('Test', {});

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle circular references in metadata', () => {
      const logger = loggingService.createLogger('Test');
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw
      expect(() => logger.info('Test', circular)).not.toThrow();
    });
  });

  describe('environment variable configuration', () => {
    it('should use LOG_LEVEL from environment', () => {
      process.env.LOG_LEVEL = 'error';
      const service = new LoggingService();

      expect(service.getLogLevel()).toBe('error');
    });

    it('should default to debug in non-production', () => {
      delete process.env.LOG_LEVEL;
      delete process.env.NODE_ENV;
      const service = new LoggingService();

      expect(service.getLogLevel()).toBe('debug');
    });

    it('should default to info in production', () => {
      delete process.env.LOG_LEVEL;
      process.env.NODE_ENV = 'production';
      const service = new LoggingService();

      expect(service.getLogLevel()).toBe('info');
    });

    it('should ignore invalid LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'invalid';
      const service = new LoggingService();

      expect(['debug', 'info', 'warn', 'error']).toContain(
        service.getLogLevel()
      );
    });
  });

  describe('performance', () => {
    it('should filter logs quickly', () => {
      loggingService.setLogLevel('error');
      const logger = loggingService.createLogger('Test');

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        logger.debug('This should be filtered');
      }
      const duration = Date.now() - start;

      // 1000 filtered logs should take < 10ms
      expect(duration).toBeLessThan(10);
    });

    it('should log efficiently', () => {
      const logger = loggingService.createLogger('Test');

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        logger.info('Test message');
      }
      const duration = Date.now() - start;

      // 100 active logs should take < 100ms (< 1ms each)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('backwards compatibility', () => {
    it('should work with existing Logger interface', () => {
      const logger = loggingService.createLogger('Test');

      // All methods from Logger interface should exist
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });
});
