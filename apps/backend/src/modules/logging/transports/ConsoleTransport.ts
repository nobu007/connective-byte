/**
 * Console Transport
 * Outputs formatted log entries to console (stdout/stderr)
 * Routes warn/error to stderr, info/debug to stdout
 */

import { LogLevel, LogTransport } from '../../../common/types';

export class ConsoleTransport implements LogTransport {
  /**
   * Output formatted log to console
   * Error and warn levels go to stderr
   * Info and debug levels go to stdout
   *
   * @param formatted - Formatted log string
   * @param level - Log level
   */
  log(formatted: string, level: LogLevel): void {
    if (level === 'error' || level === 'warn') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}
