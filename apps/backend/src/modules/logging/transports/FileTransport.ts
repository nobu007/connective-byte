/**
 * File Transport
 * Writes log entries to files with automatic rotation support
 * Implements async file I/O for non-blocking operation
 */

import { LogLevel, LogTransport } from '../../../common/types';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

export interface FileTransportOptions {
  /**
   * Directory path for log files
   * Default: './logs'
   */
  logDirectory?: string;

  /**
   * Base filename for log files
   * Actual filename will be: {filename}.log or {filename}-{level}.log
   * Default: 'application'
   */
  filename?: string;

  /**
   * Maximum size in bytes before rotation
   * Default: 10MB
   */
  maxSize?: number;

  /**
   * Maximum number of rotated files to keep
   * Default: 5
   */
  maxFiles?: number;

  /**
   * Separate log files by level (error.log, warn.log, etc.)
   * Default: false (all logs in one file)
   */
  separateByLevel?: boolean;

  /**
   * Log levels to capture (empty array = all levels)
   * Default: [] (all levels)
   */
  levels?: LogLevel[];
}

/**
 * FileTransport - Writes logs to files with rotation
 *
 * Features:
 * - Automatic log rotation based on file size
 * - Configurable retention (number of rotated files)
 * - Optional separation by log level
 * - Async file I/O for performance
 * - Automatic directory creation
 *
 * Example:
 * ```typescript
 * const fileTransport = new FileTransport({
 *   logDirectory: './logs',
 *   filename: 'app',
 *   maxSize: 10 * 1024 * 1024, // 10MB
 *   maxFiles: 5,
 *   separateByLevel: true
 * });
 * ```
 */
export class FileTransport implements LogTransport {
  private readonly logDirectory: string;
  private readonly filename: string;
  private readonly maxSize: number;
  private readonly maxFiles: number;
  private readonly separateByLevel: boolean;
  private readonly levels: LogLevel[];
  private readonly writeQueue: Map<string, Promise<void>>;

  constructor(options: FileTransportOptions = {}) {
    this.logDirectory = options.logDirectory || './logs';
    this.filename = options.filename || 'application';
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    this.maxFiles = options.maxFiles || 5;
    this.separateByLevel = options.separateByLevel || false;
    this.levels = options.levels || [];
    this.writeQueue = new Map();

    // Ensure log directory exists synchronously on initialization
    this.ensureLogDirectorySync();
  }

  /**
   * Write log entry to file
   * @param formatted - Formatted log string
   * @param level - Log level
   */
  async log(formatted: string, level: LogLevel): Promise<void> {
    // Filter by level if levels array is specified
    if (this.levels.length > 0 && !this.levels.includes(level)) {
      return;
    }

    const filename = this.getFilename(level);
    const filepath = path.join(this.logDirectory, filename);

    // Queue write to prevent race conditions
    const writePromise = this.queueWrite(filepath, formatted + '\n');

    // Don't await in log() to avoid blocking - fire and forget
    // Errors are handled internally
    writePromise.catch((error) => {
      console.error('[FileTransport] Write error:', error);
    });
  }

  /**
   * Queue write operation to prevent concurrent writes to same file
   * @param filepath - File path
   * @param content - Content to write
   * @returns Promise that resolves when write completes
   */
  private async queueWrite(filepath: string, content: string): Promise<void> {
    // Get existing queue for this file, or create new resolved promise
    const existingQueue = this.writeQueue.get(filepath) || Promise.resolve();

    // Chain new write after existing writes
    const newQueue = existingQueue
      .then(() => this.writeToFile(filepath, content))
      .catch((error) => {
        console.error(`[FileTransport] Failed to write to ${filepath}:`, error);
      });

    this.writeQueue.set(filepath, newQueue);

    return newQueue;
  }

  /**
   * Write content to file with rotation check
   * @param filepath - File path
   * @param content - Content to write
   */
  private async writeToFile(filepath: string, content: string): Promise<void> {
    try {
      // Check if rotation is needed before writing
      await this.rotateIfNeeded(filepath);

      // Append to file
      await fs.appendFile(filepath, content, 'utf8');
    } catch (error) {
      // Re-throw to be caught by queueWrite error handler
      throw error;
    }
  }

  /**
   * Check file size and rotate if necessary
   * @param filepath - File path to check
   */
  private async rotateIfNeeded(filepath: string): Promise<void> {
    try {
      const stats = await fs.stat(filepath);

      if (stats.size >= this.maxSize) {
        await this.rotateFile(filepath);
      }
    } catch (error: any) {
      // File doesn't exist yet - this is fine
      if (error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  /**
   * Rotate log file
   * Renames current file to .1, .1 to .2, etc.
   * Deletes oldest file if max files exceeded
   *
   * @param filepath - Current log file path
   */
  private async rotateFile(filepath: string): Promise<void> {
    // Delete oldest file if we're at max
    const oldestFile = `${filepath}.${this.maxFiles}`;
    try {
      await fs.unlink(oldestFile);
    } catch {
      // Ignore if file doesn't exist
    }

    // Rotate existing files: .4 -> .5, .3 -> .4, etc.
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const from = `${filepath}.${i}`;
      const to = `${filepath}.${i + 1}`;

      try {
        await fs.rename(from, to);
      } catch {
        // Ignore if file doesn't exist
      }
    }

    // Rename current file to .1
    try {
      await fs.rename(filepath, `${filepath}.1`);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Get filename for log level
   * @param level - Log level
   * @returns Filename
   */
  private getFilename(level: LogLevel): string {
    if (this.separateByLevel) {
      return `${this.filename}-${level}.log`;
    }
    return `${this.filename}.log`;
  }

  /**
   * Ensure log directory exists (synchronous - for initialization)
   */
  private ensureLogDirectorySync(): void {
    try {
      if (!fsSync.existsSync(this.logDirectory)) {
        fsSync.mkdirSync(this.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('[FileTransport] Failed to create log directory:', error);
      throw error;
    }
  }

  /**
   * Flush all pending writes
   * Useful for graceful shutdown
   * @returns Promise that resolves when all writes complete
   */
  async flush(): Promise<void> {
    const pendingWrites = Array.from(this.writeQueue.values());
    await Promise.allSettled(pendingWrites);
    this.writeQueue.clear();
  }
}
