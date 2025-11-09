/**
 * Logging Service
 * Centralized logging service for the application
 * Provides structured logging with configurable formatters and transports
 *
 * Features:
 * - Configurable log levels (debug, info, warn, error)
 * - Multiple formatters (JSON for production, Pretty for development)
 * - Pluggable transports (console, file, etc.)
 * - Metadata enrichment with system information
 * - Context-aware logger instances
 */

import { BaseService } from '../common/base/BaseService';
import {
  Logger,
  LogLevel,
  LogEntry,
  LogFormatter,
  LogTransport,
  LoggingConfig,
} from '../common/types';
import { JsonFormatter, PrettyFormatter } from '../modules/logging/formatters';
import { ConsoleTransport } from '../modules/logging/transports';
import * as os from 'os';

export class LoggingService extends BaseService {
  private logLevel: LogLevel;
  private format: 'json' | 'pretty';
  private formatters: Map<string, LogFormatter>;
  private transports: Map<string, LogTransport>;

  // Cache system metadata for performance
  private static readonly systemMetadata = {
    hostname: os.hostname(),
    pid: process.pid,
  };

  constructor() {
    // Don't pass logger to avoid circular dependency
    // LoggingService creates its own simple logger
    super('LoggingService', undefined);

    // Initialize configuration from environment
    this.logLevel = this.getLogLevelFromEnv();
    this.format = process.env.LOG_FORMAT === 'json' ? 'json' : 'pretty';

    // Initialize formatters
    this.formatters = new Map<string, LogFormatter>();
    this.registerFormatter('json', new JsonFormatter());
    this.registerFormatter('pretty', new PrettyFormatter());

    // Initialize transports
    this.transports = new Map<string, LogTransport>();
    this.registerTransport('console', new ConsoleTransport());
  }

  /**
   * Create a context-aware logger instance
   * Returns a Logger that automatically includes the context in all log entries
   *
   * @param context - Context identifier (e.g., class name, module name)
   * @returns Logger instance with context
   */
  createLogger(context: string): Logger {
    return {
      debug: (message: string, meta?: Record<string, unknown>) =>
        this.log('debug', message, context, meta),
      info: (message: string, meta?: Record<string, unknown>) =>
        this.log('info', message, context, meta),
      warn: (message: string, meta?: Record<string, unknown>) =>
        this.log('warn', message, context, meta),
      error: (message: string, error?: Error, meta?: Record<string, unknown>) =>
        this.log('error', message, context, { ...meta, error }),
    };
  }

  /**
   * Core logging method
   * Filters, enriches, formats, and outputs log entries
   *
   * @param level - Log level
   * @param message - Log message
   * @param context - Log context
   * @param metadata - Additional metadata
   */
  private log(
    level: LogLevel,
    message: string,
    context: string,
    metadata?: Record<string, unknown>
  ): void {
    // Fast path: skip if below configured log level
    if (!this.shouldLog(level)) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      metadata: this.enrichMetadata(metadata),
    };

    // Format and output
    const formatted = this.formatEntry(entry);
    this.outputToTransports(formatted, level);
  }

  /**
   * Check if log level should be processed
   * @param level - Log level to check
   * @returns true if log should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Enrich metadata with system information
   * @param metadata - User-provided metadata
   * @returns Enriched metadata
   */
  private enrichMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
    return {
      ...metadata,
      service: 'backend',
      ...LoggingService.systemMetadata,
    };
  }

  /**
   * Format log entry using configured formatter
   * @param entry - Log entry to format
   * @returns Formatted string
   */
  private formatEntry(entry: LogEntry): string {
    const formatter = this.formatters.get(this.format);

    if (!formatter) {
      // Fallback to JSON if formatter not found
      return JSON.stringify(entry);
    }

    try {
      return formatter.format(entry);
    } catch (error) {
      // Formatter error - use fallback
      return JSON.stringify({
        level: entry.level,
        message: entry.message,
        error: 'Formatter error',
      });
    }
  }

  /**
   * Output formatted log to all registered transports
   * @param formatted - Formatted log string
   * @param level - Log level
   */
  private outputToTransports(formatted: string, level: LogLevel): void {
    this.transports.forEach((transport) => {
      try {
        transport.log(formatted, level);
      } catch (error) {
        // Prevent transport errors from crashing the application
        console.error('[LoggingService] Transport error:', error);
      }
    });
  }

  /**
   * Get log level from environment variables
   * Falls back to 'info' for production, 'debug' for development
   *
   * @returns LogLevel from environment or default
   */
  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

    if (level && validLevels.includes(level as LogLevel)) {
      return level as LogLevel;
    }

    // Default: info for production, debug otherwise
    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }

  /**
   * Set log level at runtime
   * @param level - New log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   * @returns Current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Register a custom formatter
   * @param name - Formatter name
   * @param formatter - Formatter instance
   */
  registerFormatter(name: string, formatter: LogFormatter): void {
    this.formatters.set(name, formatter);
  }

  /**
   * Register a custom transport
   * @param name - Transport name
   * @param transport - Transport instance
   */
  registerTransport(name: string, transport: LogTransport): void {
    this.transports.set(name, transport);
  }

  /**
   * Get current logging configuration
   * @returns Logging configuration
   */
  getConfig(): LoggingConfig {
    return {
      level: this.logLevel,
      format: this.format,
      transports: Array.from(this.transports.keys()),
    };
  }
}

// Export singleton instance
export const loggingService = new LoggingService();
