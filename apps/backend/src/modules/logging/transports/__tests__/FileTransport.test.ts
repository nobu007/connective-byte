/**
 * FileTransport Tests
 * Comprehensive tests for file-based log transport
 */

import { FileTransport, FileTransportOptions } from '../FileTransport';
import { LogLevel } from '../../../../common/types';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

// Test directory for logs
const TEST_LOG_DIR = path.join(__dirname, '.test-logs');

describe('FileTransport', () => {
  // Clean up test logs before and after each test
  beforeEach(async () => {
    await cleanupTestLogs();
  });

  afterEach(async () => {
    await cleanupTestLogs();
  });

  describe('Initialization', () => {
    it('should create log directory if it does not exist', () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
      });

      expect(fsSync.existsSync(TEST_LOG_DIR)).toBe(true);
    });

    it('should use default options when not specified', () => {
      const transport = new FileTransport();

      // Should create ./logs directory
      expect(fsSync.existsSync('./logs')).toBe(true);

      // Clean up default directory
      fsSync.rmSync('./logs', { recursive: true, force: true });
    });

    it('should accept custom options', () => {
      const options: FileTransportOptions = {
        logDirectory: TEST_LOG_DIR,
        filename: 'custom',
        maxSize: 1024,
        maxFiles: 3,
        separateByLevel: true,
        levels: ['error', 'warn'],
      };

      const transport = new FileTransport(options);
      expect(fsSync.existsSync(TEST_LOG_DIR)).toBe(true);
    });
  });

  describe('Basic Logging', () => {
    it('should write log to file', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      await transport.log('Test log message', 'info');
      await transport.flush(); // Wait for write to complete

      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).toContain('Test log message');
    });

    it('should append multiple logs to same file', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      await transport.log('First message', 'info');
      await transport.log('Second message', 'warn');
      await transport.log('Third message', 'error');
      await transport.flush();

      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).toContain('First message');
      expect(content).toContain('Second message');
      expect(content).toContain('Third message');
    });

    it('should handle newlines correctly', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
      });

      await transport.log('Line 1', 'info');
      await transport.log('Line 2', 'info');
      await transport.flush();

      const logFile = path.join(TEST_LOG_DIR, 'application.log');
      const content = await fs.readFile(logFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('Line 1');
      expect(lines[1]).toContain('Line 2');
    });
  });

  describe('Level Separation', () => {
    it('should write to separate files when separateByLevel is true', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
        separateByLevel: true,
      });

      await transport.log('Info message', 'info');
      await transport.log('Error message', 'error');
      await transport.log('Warn message', 'warn');
      await transport.flush();

      const infoLog = await fs.readFile(path.join(TEST_LOG_DIR, 'app-info.log'), 'utf8');
      const errorLog = await fs.readFile(path.join(TEST_LOG_DIR, 'app-error.log'), 'utf8');
      const warnLog = await fs.readFile(path.join(TEST_LOG_DIR, 'app-warn.log'), 'utf8');

      expect(infoLog).toContain('Info message');
      expect(errorLog).toContain('Error message');
      expect(warnLog).toContain('Warn message');
    });

    it('should write to single file when separateByLevel is false', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
        separateByLevel: false,
      });

      await transport.log('Info message', 'info');
      await transport.log('Error message', 'error');
      await transport.flush();

      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).toContain('Info message');
      expect(content).toContain('Error message');
    });
  });

  describe('Level Filtering', () => {
    it('should only log specified levels when levels array is provided', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
        levels: ['error', 'warn'],
      });

      await transport.log('Debug message', 'debug');
      await transport.log('Info message', 'info');
      await transport.log('Warn message', 'warn');
      await transport.log('Error message', 'error');
      await transport.flush();

      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).not.toContain('Debug message');
      expect(content).not.toContain('Info message');
      expect(content).toContain('Warn message');
      expect(content).toContain('Error message');
    });

    it('should log all levels when levels array is empty', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
        levels: [],
      });

      await transport.log('Debug message', 'debug');
      await transport.log('Info message', 'info');
      await transport.flush();

      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).toContain('Debug message');
      expect(content).toContain('Info message');
    });
  });

  describe('File Rotation', () => {
    it('should rotate file when max size is exceeded', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
        maxSize: 100, // Very small size to trigger rotation
        maxFiles: 3,
      });

      // Write enough data to exceed maxSize multiple times
      const largeMessage = 'X'.repeat(50); // 50 bytes
      await transport.log(largeMessage, 'info');
      await transport.flush();

      await transport.log(largeMessage, 'info');
      await transport.flush();

      // Write more to trigger rotation
      await transport.log(largeMessage, 'info');
      await transport.flush();

      // Check that either rotated file exists OR current file is small (was rotated)
      const currentFile = path.join(TEST_LOG_DIR, 'app.log');
      const rotatedFile = path.join(TEST_LOG_DIR, 'app.log.1');

      const rotatedExists = fsSync.existsSync(rotatedFile);
      const currentStats = fsSync.statSync(currentFile);

      // Either rotation happened or current file is under max size
      expect(rotatedExists || currentStats.size < 100).toBe(true);
    });

    it('should keep only maxFiles rotated files', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
        maxSize: 50,
        maxFiles: 2,
      });

      // Generate multiple rotations
      for (let i = 0; i < 10; i++) {
        await transport.log('X'.repeat(30), 'info');
        await transport.flush();
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      await transport.flush();

      // Should have current file + maxFiles (2) rotated files
      const currentFile = path.join(TEST_LOG_DIR, 'app.log');
      const rotatedFile1 = path.join(TEST_LOG_DIR, 'app.log.1');
      const rotatedFile2 = path.join(TEST_LOG_DIR, 'app.log.2');
      const rotatedFile3 = path.join(TEST_LOG_DIR, 'app.log.3');

      expect(fsSync.existsSync(currentFile)).toBe(true);
      expect(fsSync.existsSync(rotatedFile1) || fsSync.existsSync(rotatedFile2)).toBe(true);

      // Should not have more than maxFiles
      expect(fsSync.existsSync(rotatedFile3)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle write errors gracefully', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      // Spy on console.error to verify error logging
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Make directory read-only to cause write error
      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      fsSync.writeFileSync(logFile, '');
      fsSync.chmodSync(logFile, 0o444); // Read-only

      await transport.log('This should fail', 'info');
      await transport.flush();

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have logged error
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore permissions and spy
      fsSync.chmodSync(logFile, 0o644);
      consoleErrorSpy.mockRestore();
    });

    it('should continue logging after errors', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create read-only file
      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      fsSync.writeFileSync(logFile, '');
      fsSync.chmodSync(logFile, 0o444);

      // Try to log (will fail)
      await transport.log('This should fail', 'info');
      await transport.flush();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Restore permissions
      fsSync.chmodSync(logFile, 0o644);

      // Should be able to log again
      await transport.log('This should succeed', 'info');
      await transport.flush();

      const content = await fs.readFile(logFile, 'utf8');
      expect(content).toContain('This should succeed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should handle concurrent writes without data loss', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      // Write many logs concurrently
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(transport.log(`Message ${i}`, 'info'));
      }

      await Promise.all(promises);
      await transport.flush();

      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      const content = await fs.readFile(logFile, 'utf8');
      const lines = content.trim().split('\n');

      // Should have all 100 messages
      expect(lines.length).toBe(100);
    });

    it('should not block on log calls', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      const startTime = Date.now();

      // Log without awaiting
      transport.log('Message 1', 'info');
      transport.log('Message 2', 'info');
      transport.log('Message 3', 'info');

      const duration = Date.now() - startTime;

      // Should complete very quickly (< 10ms) since we're not awaiting
      expect(duration).toBeLessThan(10);

      // Flush to ensure writes complete
      await transport.flush();
    });
  });

  describe('Flush', () => {
    it('should wait for all pending writes to complete', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      // Queue multiple writes
      transport.log('Message 1', 'info');
      transport.log('Message 2', 'info');
      transport.log('Message 3', 'info');

      // Flush should wait for all writes
      await transport.flush();

      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).toContain('Message 1');
      expect(content).toContain('Message 2');
      expect(content).toContain('Message 3');
    });

    it('should clear write queue after flushing', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      await transport.log('Message 1', 'info');
      await transport.flush();

      // After flush, queue should be clear
      // Writing new message should work
      await transport.log('Message 2', 'info');
      await transport.flush();

      const logFile = path.join(TEST_LOG_DIR, 'app.log');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).toContain('Message 1');
      expect(content).toContain('Message 2');
    });
  });
});

// Helper function to clean up test logs
async function cleanupTestLogs(): Promise<void> {
  try {
    await fs.rm(TEST_LOG_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors if directory doesn't exist
  }
}
