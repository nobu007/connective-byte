/**
 * JSON Formatter
 * Formats log entries as JSON strings for production use
 * Supports machine-readable structured logging
 */

import { LogEntry, LogFormatter } from '../../../common/types';

export class JsonFormatter implements LogFormatter {
  /**
   * Format log entry as JSON string
   * Handles circular references and errors gracefully
   *
   * @param entry - Log entry to format
   * @returns JSON string representation
   */
  format(entry: LogEntry): string {
    const output: Record<string, unknown> = {
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      context: entry.context,
    };

    // Merge metadata into output
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      // Handle errors specially to include stack trace
      if (entry.metadata.error instanceof Error) {
        const error = entry.metadata.error;
        output.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };

        // Add other metadata
        const otherMeta = { ...entry.metadata };
        delete otherMeta.error;
        Object.assign(output, otherMeta);
      } else {
        Object.assign(output, entry.metadata);
      }
    }

    try {
      return JSON.stringify(output);
    } catch (error) {
      // Handle circular references - create a safe minimal output
      return JSON.stringify({
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp.toISOString(),
        context: entry.context,
        error: 'Failed to serialize metadata (possible circular reference)',
      });
    }
  }
}
