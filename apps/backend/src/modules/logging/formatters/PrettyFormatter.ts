/**
 * Pretty Formatter
 * Formats log entries as human-readable strings for development use
 * Provides colored output and aligned columns
 */

import { LogEntry, LogFormatter } from '../../../common/types';

export class PrettyFormatter implements LogFormatter {
  /**
   * Format log entry as human-readable string
   * Aligns columns and indents metadata for readability
   *
   * @param entry - Log entry to format
   * @returns Pretty-printed string representation
   */
  format(entry: LogEntry): string {
    // Format timestamp: 2025-10-15 12:34:56
    const timestamp = entry.timestamp
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);

    // Align log level (pad to 5 characters)
    const level = entry.level.toUpperCase().padEnd(5);

    // Align context (pad to 15 characters, truncate if longer)
    const context = this.truncateOrPad(entry.context, 15);

    // Build base message
    let output = `[${timestamp}] ${level} ${context}: ${entry.message}`;

    // Add metadata if present
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += '\n' + this.formatMetadata(entry.metadata);
    }

    return output;
  }

  /**
   * Format metadata object as indented key-value pairs
   * @param metadata - Metadata to format
   * @returns Formatted metadata string
   */
  private formatMetadata(metadata: Record<string, unknown>): string {
    return Object.entries(metadata)
      .map(([key, value]) => {
        if (value instanceof Error) {
          return `  ${key}: ${value.message}\n${this.formatStackTrace(value.stack)}`;
        }
        return `  ${key}: ${this.stringifyValue(value)}`;
      })
      .join('\n');
  }

  /**
   * Format error stack trace with indentation
   * @param stack - Stack trace string
   * @returns Formatted stack trace
   */
  private formatStackTrace(stack?: string): string {
    if (!stack) return '';

    return stack
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n');
  }

  /**
   * Stringify value handling special cases
   * @param value - Value to stringify
   * @returns String representation
   */
  private stringifyValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value);

    try {
      return JSON.stringify(value);
    } catch {
      return '[Circular]';
    }
  }

  /**
   * Truncate or pad string to fixed length
   * @param str - String to process
   * @param length - Target length
   * @returns Processed string
   */
  private truncateOrPad(str: string, length: number): string {
    if (str.length > length) {
      return str.substring(0, length - 3) + '...';
    }
    return str.padEnd(length);
  }
}
