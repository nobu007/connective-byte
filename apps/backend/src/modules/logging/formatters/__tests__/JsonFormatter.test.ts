/**
 * JsonFormatter Unit Tests
 * Tests for JSON log formatting
 */

import { JsonFormatter } from '../JsonFormatter';
import { LogEntry } from '../../../../common/types';

describe('JsonFormatter', () => {
  let formatter: JsonFormatter;

  beforeEach(() => {
    formatter = new JsonFormatter();
  });

  describe('format', () => {
    it('should format entry as valid JSON', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'Test message',
        context: 'TestContext',
        timestamp: new Date('2025-10-15T12:34:56.789Z'),
      };

      const result = formatter.format(entry);
      const parsed = JSON.parse(result);

      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.context).toBe('TestContext');
      expect(parsed.timestamp).toBe('2025-10-15T12:34:56.789Z');
    });

    it('should include all required fields', () => {
      const entry: LogEntry = {
        level: 'warn',
        message: 'Warning message',
        context: 'WarningContext',
        timestamp: new Date('2025-10-15T10:00:00.000Z'),
      };

      const result = formatter.format(entry);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('level');
      expect(parsed).toHaveProperty('message');
      expect(parsed).toHaveProperty('context');
      expect(parsed).toHaveProperty('timestamp');
    });

    it('should include metadata when present', () => {
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
      const parsed = JSON.parse(result);

      expect(parsed.userId).toBe(123);
      expect(parsed.action).toBe('login');
    });

    it('should format error object separately', () => {
      const error = new Error('Test error');
      const entry: LogEntry = {
        level: 'error',
        message: 'Operation failed',
        context: 'Service',
        timestamp: new Date(),
        metadata: {
          error,
          retries: 3,
        },
      };

      const result = formatter.format(entry);
      const parsed = JSON.parse(result);

      expect(parsed.error).toHaveProperty('name', 'Error');
      expect(parsed.error).toHaveProperty('message', 'Test error');
      expect(parsed.error).toHaveProperty('stack');
      expect(parsed.retries).toBe(3);
    });

    it('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const entry: LogEntry = {
        level: 'info',
        message: 'Test',
        context: 'Test',
        timestamp: new Date(),
        metadata: circular,
      };

      const result = formatter.format(entry);
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain('circular reference');
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
      const parsed = JSON.parse(result);

      expect(parsed.message).toBe('Test');
    });

    it('should handle undefined metadata', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'Test',
        context: 'Test',
        timestamp: new Date(),
      };

      const result = formatter.format(entry);
      const parsed = JSON.parse(result);

      expect(parsed.message).toBe('Test');
    });

    it('should format timestamp as ISO string', () => {
      const timestamp = new Date('2025-10-15T15:30:45.123Z');
      const entry: LogEntry = {
        level: 'info',
        message: 'Test',
        context: 'Test',
        timestamp,
      };

      const result = formatter.format(entry);
      const parsed = JSON.parse(result);

      expect(parsed.timestamp).toBe('2025-10-15T15:30:45.123Z');
    });

    it('should merge metadata into output', () => {
      const entry: LogEntry = {
        level: 'debug',
        message: 'Debug message',
        context: 'DebugContext',
        timestamp: new Date(),
        metadata: {
          key1: 'value1',
          key2: 123,
          key3: true,
        },
      };

      const result = formatter.format(entry);
      const parsed = JSON.parse(result);

      expect(parsed.key1).toBe('value1');
      expect(parsed.key2).toBe(123);
      expect(parsed.key3).toBe(true);
    });
  });
});
