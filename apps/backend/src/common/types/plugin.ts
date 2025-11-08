/**
 * Plugin System Type Definitions
 * Defines interfaces for the extensible plugin architecture
 */

/**
 * Plugin lifecycle states
 */
export type PluginState = 'uninitialized' | 'initializing' | 'initialized' | 'error' | 'cleanup';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
}

/**
 * Plugin interface
 * All plugins must implement this interface
 */
export interface Plugin {
  /** Plugin metadata */
  readonly metadata: PluginMetadata;

  /** Current plugin state */
  readonly state: PluginState;

  /**
   * Initialize the plugin
   * Called when plugin is registered and ready to start
   */
  initialize(): Promise<void>;

  /**
   * Cleanup plugin resources
   * Called when plugin is being unregistered or application is shutting down
   */
  cleanup(): Promise<void>;

  /**
   * Optional health check for the plugin
   * Returns true if plugin is healthy, false otherwise
   */
  healthCheck?(): Promise<boolean>;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Plugin registry configuration
 */
export interface PluginRegistryConfig {
  autoInitialize?: boolean;
  initializationTimeout?: number;
  cleanupTimeout?: number;
}

/**
 * Plugin registration result
 */
export interface PluginRegistrationResult {
  success: boolean;
  plugin?: Plugin;
  error?: Error;
}
