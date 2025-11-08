/**
 * Base Plugin Class
 * Abstract base class for creating plugins
 * Provides common functionality and lifecycle management
 */

import { Plugin, PluginMetadata, PluginState } from '../../common/types/plugin';
import { Logger } from '../../common/types';

export abstract class BasePlugin implements Plugin {
  public readonly metadata: PluginMetadata;
  private _state: PluginState = 'uninitialized';
  protected logger: Logger;

  constructor(metadata: PluginMetadata, logger?: Logger) {
    this.metadata = metadata;
    this.logger = logger || this.createDefaultLogger();
  }

  /**
   * Get current plugin state
   */
  get state(): PluginState {
    return this._state;
  }

  /**
   * Set plugin state (protected for internal use)
   */
  protected setState(state: PluginState): void {
    this._state = state;
    this.logger.debug(`Plugin '${this.metadata.name}' state changed to: ${state}`);
  }

  /**
   * Initialize the plugin
   * Subclasses should override onInitialize() for custom initialization
   */
  async initialize(): Promise<void> {
    if (this._state === 'initialized') {
      this.logger.warn(`Plugin '${this.metadata.name}' is already initialized`);
      return;
    }

    this.setState('initializing');

    try {
      await this.onInitialize();
      this.setState('initialized');
      this.logger.info(`Plugin '${this.metadata.name}' initialized successfully`);
    } catch (error) {
      this.setState('error');
      this.logger.error(`Plugin '${this.metadata.name}' initialization failed`, error as Error);
      throw error;
    }
  }

  /**
   * Cleanup plugin resources
   * Subclasses should override onCleanup() for custom cleanup
   */
  async cleanup(): Promise<void> {
    if (this._state === 'uninitialized') {
      this.logger.warn(`Plugin '${this.metadata.name}' is already cleaned up`);
      return;
    }

    this.setState('cleanup');

    try {
      await this.onCleanup();
      this.setState('uninitialized');
      this.logger.info(`Plugin '${this.metadata.name}' cleaned up successfully`);
    } catch (error) {
      this.setState('error');
      this.logger.error(`Plugin '${this.metadata.name}' cleanup failed`, error as Error);
      throw error;
    }
  }

  /**
   * Health check for the plugin
   * Subclasses can override for custom health checks
   */
  async healthCheck(): Promise<boolean> {
    return this._state === 'initialized';
  }

  /**
   * Custom initialization logic
   * Override this method in subclasses
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Custom cleanup logic
   * Override this method in subclasses
   */
  protected abstract onCleanup(): Promise<void>;

  /**
   * Create default console logger
   */
  private createDefaultLogger(): Logger {
    const pluginName = this.metadata.name;
    return {
      info: (message: string, meta?: Record<string, unknown>) => {
        console.log(`[INFO][${pluginName}] ${message}`, meta || '');
      },
      error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
        console.error(`[ERROR][${pluginName}] ${message}`, error?.message || '', meta || '');
      },
      warn: (message: string, meta?: Record<string, unknown>) => {
        console.warn(`[WARN][${pluginName}] ${message}`, meta || '');
      },
      debug: (message: string, meta?: Record<string, unknown>) => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[DEBUG][${pluginName}] ${message}`, meta || '');
        }
      },
    };
  }
}
