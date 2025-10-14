/**
 * PrettyFormatter Unit Tests
 * Tests for human-readable log formatting
 */

import { PrettyFormatter } from '../PrettyFormatter';
import { LogEntry } from '../../../../common/types';

describe('PrettyFormatter', () => {
  let formatter: PrettyFormatter;

  beforeEach(() => {
    formatter = new PrettyFormatter();
  });

  describe('format', () => {
    it('should format entry as human-readable text', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'Test message',
        context: 'TestContext',
        timestamp: new Date('2025-10-15T12:34:56.789Z'),
      };

      const result = formatter.format(entry);

      expect(result).toContain('INFO');
      expect(result).toContain('TestContext');
      expect(result).toContain('Test message');
      expect(result).toContain('2025-10-15 12:34:56');
    });

    it('should align columns correctly', () => {
      const entry: LogEntry = {
        level: 'error',
        message: 'Error message',
        context: 'Ctx',
        timestamp: new Date('2025-10-15T10:00:00.000Z'),
      };

      const result = formatter.format(entry);

      // Level should be padded to 5 characters
      expect(result).toContain('ERROR');
      // Context should be padded
      expect(result).toContain('Ctx');
    });

    it('should include metadata with indentation', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'User action',
        context: 'UserService',
        timestamp: new Date(),
        metadata: {
          userId: 123,
          action: 'login',
        },
      };

      const result = formatter.format(entry);

      expect(result).toContain('userId');
      expect(result).toContain('123');
      expect(result).toContain('action');
      expect(result).toContain('login');
    });

    it('should format error stack trace', () => {
      const error = new Error('Test error');
      const entry: LogEntry = {
        level: 'error',
        message: 'Operation failed',
        context: 'Service',
        timestamp: new Date(),
        metadata: {
          error,
        },
      };

      const result = formatter.format(entry);

      expect(result).toContain('Test error');
      expect(result).toContain('error:');
    });

    it('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const entry: LogEntry = {
        level: 'info',
        message: 'Test',
        context: 'Test',
        timestamp: new Date(),
        metadata: { circular },
      };

      const result = formatter.format(entry);

      expect(result).toContain('[Circular]');
    });

    it('should handle long context names', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'Test',
        context: 'VeryLongContextNameThatExceedsTheLimit',
        timestamp: new Date(),
      };

      const result = formatter.format(entry);

      // Context should be truncated with ellipsis
      expect(result).toContain('...');
    });

    it('should handle null values', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'Test',
        context: 'Test',
        timestamp: new Date(),
        metadata: {
          value: null,
        },
      };

      const result = formatter.format(entry);

      expect(result).toContain('null');
    });

    it('should handle undefined values', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'Test',
        context: 'Test',
        timestamp: new Date(),
        metadata: {
          value: undefined,
        },
      };

      const result = formatter.format(entry);

      expect(result).toContain('undefined');
    });

    it('should format different log levels', () => {
      const levels: Array<'debug' | 'info' | 'warn' | 'error'> = [
        'debug',
        'info',
        'warn',
        'error',
      ];

      levels.forEach((level) => {
        const entry: LogEntry = {
          level,
          message: 'Test',
          context: 'Test',
          timestamp: new Date(),
        };

        const result = formatter.format(entry);

        expect(result).toContain(level.toUpperCase());
      });
    });

    it('should handle empty metadata', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'Test',
        context: 'Test',
        timestamp: new Date(),
        metadata: {},
      };

      const result = formatter.format(entry);

      expect(result).toContain('Test');
    });
  });
});
