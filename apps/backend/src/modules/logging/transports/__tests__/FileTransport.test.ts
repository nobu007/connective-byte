import { FileTransport, FileTransportOptions } from '../FileTransport';
import { LogLevel } from '../../../../common/types';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

// Mock fs/promises to control file system operations during tests
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'), // Import and retain default behavior
  appendFile: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
  rename: jest.fn(),
  rm: jest.fn(),
}));

// Mock fs (synchronous) for existsSync and mkdirSync
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Test directory for logs
const TEST_LOG_DIR = path.join(__dirname, '.test-logs');

describe('FileTransport', () => {
  // Cast mocked fs to JestMocked<typeof fs> for better typing
  const mockedFs = fs as jest.Mocked<typeof fs>;
  const mockedFsSync = fsSync as jest.Mocked<typeof fsSync>;

  // Clean up test logs before and after each test
  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Ensure log directory is clean before each test using the actual fs.rm
    await jest
      .requireActual('fs/promises')
      .rm(TEST_LOG_DIR, { recursive: true, force: true })
      .catch(() => {});

    // Set default mock implementations for fs/promises functions
    mockedFs.appendFile.mockResolvedValue(undefined);
    mockedFs.stat.mockResolvedValue({ size: 0 } as any); // Cast to any to resolve type issue
    mockedFs.unlink.mockResolvedValue(undefined);
    mockedFs.rename.mockResolvedValue(undefined);
    mockedFs.rm.mockResolvedValue(undefined); // Mock rm as well

    // Set default mock implementations for fs (synchronous) functions
    mockedFsSync.existsSync.mockReturnValue(true); // Assume directory exists by default
    mockedFsSync.mkdirSync.mockImplementation(() => undefined);

    // Spy on console.error for error logging tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Restore all mocks and spies after each test
    jest.restoreAllMocks();
    // Ensure log directory is clean after each test using the actual fs.rm
    await jest
      .requireActual('fs/promises')
      .rm(TEST_LOG_DIR, { recursive: true, force: true })
      .catch(() => {});
  });

  describe('Initialization', () => {
    it('should create log directory if it does not exist', () => {
      mockedFsSync.existsSync.mockReturnValue(false);

      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
      });

      expect(mockedFsSync.existsSync).toHaveBeenCalledWith(TEST_LOG_DIR);
      expect(mockedFsSync.mkdirSync).toHaveBeenCalledWith(TEST_LOG_DIR, { recursive: true });
    });

    it('should use default options when not specified', () => {
      mockedFsSync.existsSync.mockReturnValue(false);

      const transport = new FileTransport();

      expect(mockedFsSync.existsSync).toHaveBeenCalledWith('./logs');
      expect(mockedFsSync.mkdirSync).toHaveBeenCalledWith('./logs', { recursive: true });

      // Clean up default directory if it was created by the test
      // This part is handled by afterEach now, but keeping the logic for clarity if needed elsewhere
      // if (fsSync.existsSync('./logs')) {
      //   fsSync.rmSync('./logs', { recursive: true, force: true });
      // }
    });

    it('should accept custom options', () => {
      mockedFsSync.existsSync.mockReturnValue(false);

      const options: FileTransportOptions = {
        logDirectory: TEST_LOG_DIR,
        filename: 'custom',
        maxSize: 1024,
        maxFiles: 3,
        separateByLevel: true,
        levels: ['error', 'warn'],
      };

      const transport = new FileTransport(options);
      expect(mockedFsSync.existsSync).toHaveBeenCalledWith(TEST_LOG_DIR);
      expect(mockedFsSync.mkdirSync).toHaveBeenCalledWith(TEST_LOG_DIR, { recursive: true });
    });

    it('should log error if directory creation fails', () => {
      mockedFsSync.existsSync.mockReturnValue(false);
      mockedFsSync.mkdirSync.mockImplementation(() => {
        throw new Error('Failed to create directory');
      });

      expect(() => new FileTransport({ logDirectory: TEST_LOG_DIR })).toThrow(
        'Failed to create directory'
      );
      expect(console.error).toHaveBeenCalledWith(
        '[FileTransport] Failed to create log directory:',
        expect.any(Error)
      );
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

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Test log message\n',
        'utf8'
      );
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

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'First message\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Second message\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Third message\n',
        'utf8'
      );
    });

    it('should handle newlines correctly', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
      });

      await transport.log('Line 1', 'info');
      await transport.log('Line 2', 'info');
      await transport.flush();

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'application.log'),
        'Line 1\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'application.log'),
        'Line 2\n',
        'utf8'
      );
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

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app-info.log'),
        'Info message\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app-error.log'),
        'Error message\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app-warn.log'),
        'Warn message\n',
        'utf8'
      );
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

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Info message\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Error message\n',
        'utf8'
      );
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

      expect(mockedFs.appendFile).not.toHaveBeenCalledWith(
        expect.any(String),
        'Debug message\n',
        'utf8'
      );
      expect(mockedFs.appendFile).not.toHaveBeenCalledWith(
        expect.any(String),
        'Info message\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Warn message\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Error message\n',
        'utf8'
      );
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

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Debug message\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Info message\n',
        'utf8'
      );
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

      // Mock fs.stat to return a size that triggers rotation
      mockedFs.stat.mockResolvedValueOnce({ size: 150 } as any); // First stat call for app.log
      mockedFs.stat.mockResolvedValue({ size: 0 } as any); // Subsequent stat calls

      await transport.log('X'.repeat(50), 'info'); // app.log
      await transport.flush();

      expect(mockedFs.stat).toHaveBeenCalledWith(path.join(TEST_LOG_DIR, 'app.log'));
      expect(mockedFs.rename).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        path.join(TEST_LOG_DIR, 'app.log.1')
      );
    });

    it('should keep only maxFiles rotated files', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
        maxSize: 50,
        maxFiles: 2,
      });

      // Mock fs.stat to always trigger rotation
      mockedFs.stat.mockResolvedValue({ size: 100 } as any);

      // Generate multiple rotations
      for (let i = 0; i < 5; i++) {
        await transport.log('X'.repeat(30), 'info');
        await transport.flush();
      }

      // After 5 writes, we should have app.log, app.log.1, app.log.2
      // The oldest (app.log.2) should have been unlinked
      expect(mockedFs.unlink).toHaveBeenCalledWith(path.join(TEST_LOG_DIR, 'app.log.2'));
      expect(mockedFs.rename).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log.1'),
        path.join(TEST_LOG_DIR, 'app.log.2')
      );
      expect(mockedFs.rename).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        path.join(TEST_LOG_DIR, 'app.log.1')
      );
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle errors when unlinking oldest file during rotation', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
        maxSize: 100, // Small size to trigger rotation
        maxFiles: 2,
      });

      // Mock fs.stat to always trigger rotation
      mockedFs.stat.mockResolvedValue({ size: 150 } as any);
      // Mock fs.unlink to throw an error when trying to delete the oldest file
      mockedFs.unlink.mockRejectedValueOnce(new Error('Mock unlink error'));

      // Write enough data to trigger rotation and attempt to delete oldest file
      await transport.log('X'.repeat(100), 'info'); // app.log
      await transport.log('X'.repeat(100), 'info'); // app.log.1
      await transport.log('X'.repeat(100), 'info'); // app.log.2 (oldest should be deleted)
      await transport.flush();

      // Expect no unhandled errors and no console.error from queueWrite for this specific error
      // The error is intentionally ignored in rotateFile's catch block
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should gracefully handle errors when renaming files during rotation', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
        maxSize: 100, // Small size to trigger rotation
        maxFiles: 2,
      });

      // Mock fs.stat to always trigger rotation
      mockedFs.stat.mockResolvedValue({ size: 150 } as any);
      // Mock fs.rename to throw an error when trying to rename files
      mockedFs.rename.mockRejectedValueOnce(new Error('Mock rename error'));

      // Write enough data to trigger rotation and attempt to rename files
      await transport.log('X'.repeat(100), 'info'); // app.log
      await transport.log('X'.repeat(100), 'info'); // app.log.1
      await transport.log('X'.repeat(100), 'info'); // app.log.2 (rename should fail)
      await transport.flush();

      // Expect no unhandled errors and no console.error from queueWrite for this specific error
      // The error is intentionally ignored in rotateFile's catch block
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should re-throw errors from writeToFile to queueWrite', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      mockedFs.stat.mockRejectedValueOnce(new Error('Mock stat error'));

      await transport.log('This write should fail due to stat error', 'info');
      await transport.flush();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[FileTransport] Failed to write to'),
        expect.any(Error)
      );
    });

    it('should log write errors from the log method', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      mockedFs.appendFile.mockRejectedValueOnce(new Error('Mock appendFile error'));

      await transport.log('This write should fail', 'info');
      await transport.flush();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[FileTransport] Failed to write to'),
        expect.any(Error)
      );
    });

    it('should continue logging after errors', async () => {
      const transport = new FileTransport({
        logDirectory: TEST_LOG_DIR,
        filename: 'app',
      });

      // Mock appendFile to fail once, then succeed
      mockedFs.appendFile.mockRejectedValueOnce(new Error('Temporary write error'));
      mockedFs.appendFile.mockResolvedValue(undefined);

      // Try to log (will fail)
      await transport.log('This should fail', 'info');
      await transport.flush();

      // Should be able to log again
      await transport.log('This should succeed', 'info');
      await transport.flush();

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        'This should succeed\n',
        'utf8'
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[FileTransport] Failed to write to'),
        expect.any(Error)
      );
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

      expect(mockedFs.appendFile).toHaveBeenCalledTimes(100);
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

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Message 1\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Message 2\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Message 3\n',
        'utf8'
      );
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

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Message 1\n',
        'utf8'
      );
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        path.join(TEST_LOG_DIR, 'app.log'),
        'Message 2\n',
        'utf8'
      );
    });
  });
});

// Helper function to clean up test logs
async function cleanupTestLogs(): Promise<void> {
  try {
    // Use the actual fs.rm for cleanup
    await jest.requireActual('fs/promises').rm(TEST_LOG_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors if directory doesn't exist
  }
}
