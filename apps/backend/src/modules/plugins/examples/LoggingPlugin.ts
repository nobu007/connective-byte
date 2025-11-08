/**
 * Example Logging Plugin
 * Demonstrates how to create a plugin that extends logging functionality
 */

import { BasePlugin } from '../BasePlugin';
import { PluginMetadata } from '../../../common/types/plugin';
import { Logger } from '../../../common/types';

export class LoggingPlugin extends BasePlugin {
  private logInterval?: NodeJS.Timeout;
  private logCount: number = 0;

  constructor(logger?: Logger) {
    const metadata: PluginMetadata = {
      name: 'logging-plugin',
      version: '1.0.0',
      description: 'Example plugin that demonstrates logging capabilities',
      author: 'ConnectiveByte',
    };

    super(metadata, logger);
  }

  /**
   * Initialize the logging plugin
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing logging plugin...');

    // Example: Start periodic logging
    this.logInterval = setInterval(() => {
      this.logCount++;
      this.logger.debug(`Logging plugin heartbeat #${this.logCount}`);
    }, 60000); // Log every minute

    this.logger.info('Logging plugin initialized');
  }

  /**
   * Cleanup the logging plugin
   */
  protected async onCleanup(): Promise<void> {
    this.logger.info('Cleaning up logging plugin...');

    // Clear interval
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = undefined;
    }

    this.logger.info(`Logging plugin cleaned up. Total logs: ${this.logCount}`);
    this.logCount = 0;
  }

  /**
   * Health check for logging plugin
   */
  async healthCheck(): Promise<boolean> {
    // Plugin is healthy if it's initialized and interval is running
    return this.state === 'initialized' && this.logInterval !== undefined;
  }

  /**
   * Get plugin statistics
   */
  getStats(): { logCount: number; isActive: boolean } {
    return {
      logCount: this.logCount,
      isActive: this.logInterval !== undefined,
    };
  }
}
