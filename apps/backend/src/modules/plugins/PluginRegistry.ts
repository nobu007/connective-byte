/**
 * Plugin Registry
 * Central registry for managing plugin lifecycle and dependencies
 *
 * Features:
 * - Plugin registration and unregistration
 * - Dependency resolution and validation
 * - Lifecycle management (initialize, cleanup)
 * - Plugin state tracking
 * - Health monitoring
 */

import { BaseService } from '../../common/base/BaseService';
import {
  Plugin,
  PluginState,
  PluginConfig,
  PluginRegistryConfig,
  PluginRegistrationResult,
} from '../../common/types/plugin';
import { Logger } from '../../common/types';

export class PluginRegistry extends BaseService {
  private plugins: Map<string, Plugin>;
  private pluginConfigs: Map<string, PluginConfig>;
  private pluginStates: Map<string, PluginState>;
  private config: PluginRegistryConfig;

  constructor(logger?: Logger, config?: PluginRegistryConfig) {
    super('PluginRegistry', logger);
    this.plugins = new Map();
    this.pluginConfigs = new Map();
    this.pluginStates = new Map();
    this.config = {
      autoInitialize: config?.autoInitialize ?? true,
      initializationTimeout: config?.initializationTimeout ?? 30000,
      cleanupTimeout: config?.cleanupTimeout ?? 10000,
    };
  }

  /**
   * Register a plugin
   * @param plugin - Plugin instance to register
   * @param config - Plugin configuration
   * @returns Registration result
   */
  async register(plugin: Plugin, config?: PluginConfig): Promise<PluginRegistrationResult> {
    return this.executeOperation(async () => {
      const pluginName = plugin.metadata.name;

      // Check if plugin already registered
      if (this.plugins.has(pluginName)) {
        throw new Error(`Plugin '${pluginName}' is already registered`);
      }

      // Validate dependencies
      const missingDeps = this.validateDependencies(plugin);
      if (missingDeps.length > 0) {
        throw new Error(
          `Plugin '${pluginName}' has missing dependencies: ${missingDeps.join(', ')}`
        );
      }

      // Store plugin and config
      this.plugins.set(pluginName, plugin);
      this.pluginConfigs.set(pluginName, config || { enabled: true });
      this.pluginStates.set(pluginName, 'uninitialized');

      this.logger.info(`Plugin registered: ${pluginName}`, {
        version: plugin.metadata.version,
        enabled: config?.enabled ?? true,
      });

      // Auto-initialize if configured
      if (this.config.autoInitialize && (config?.enabled ?? true)) {
        await this.initializePlugin(pluginName);
      }

      return {
        success: true,
        plugin,
      };
    }, `register plugin '${plugin.metadata.name}'`).then((result) => {
      if (result.success && result.data) {
        return result.data;
      }
      return {
        success: false,
        error: result.error,
      };
    });
  }

  /**
   * Unregister a plugin
   * @param pluginName - Name of plugin to unregister
   */
  async unregister(pluginName: string): Promise<void> {
    const result = await this.executeOperation(async () => {
      const plugin = this.plugins.get(pluginName);

      if (!plugin) {
        throw new Error(`Plugin '${pluginName}' not found`);
      }

      // Cleanup plugin if initialized
      const state = this.pluginStates.get(pluginName);
      if (state === 'initialized') {
        await this.cleanupPlugin(pluginName);
      }

      // Remove from registry
      this.plugins.delete(pluginName);
      this.pluginConfigs.delete(pluginName);
      this.pluginStates.delete(pluginName);

      this.logger.info(`Plugin unregistered: ${pluginName}`);
    }, `unregister plugin '${pluginName}'`);

    if (!result.success) {
      throw result.error || new Error(`Failed to unregister plugin '${pluginName}'`);
    }
  }

  /**
   * Get a registered plugin
   * @param pluginName - Name of plugin to retrieve
   * @returns Plugin instance or undefined
   */
  getPlugin(pluginName: string): Plugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all registered plugins
   * @returns Array of all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin state
   * @param pluginName - Name of plugin
   * @returns Plugin state or undefined
   */
  getPluginState(pluginName: string): PluginState | undefined {
    return this.pluginStates.get(pluginName);
  }

  /**
   * Check if plugin is registered
   * @param pluginName - Name of plugin
   * @returns true if registered
   */
  hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Initialize a specific plugin
   * @param pluginName - Name of plugin to initialize
   */
  private async initializePlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    const currentState = this.pluginStates.get(pluginName);
    if (currentState === 'initialized') {
      this.logger.warn(`Plugin '${pluginName}' is already initialized`);
      return;
    }

    this.pluginStates.set(pluginName, 'initializing');

    try {
      // Initialize with timeout
      await this.withTimeout(
        plugin.initialize(),
        this.config.initializationTimeout!,
        `Plugin '${pluginName}' initialization timeout`
      );

      this.pluginStates.set(pluginName, 'initialized');
      this.logger.info(`Plugin initialized: ${pluginName}`);
    } catch (error) {
      this.pluginStates.set(pluginName, 'error');
      this.logger.error(`Plugin initialization failed: ${pluginName}`, error as Error);
      throw error;
    }
  }

  /**
   * Cleanup a specific plugin
   * @param pluginName - Name of plugin to cleanup
   */
  private async cleanupPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    this.pluginStates.set(pluginName, 'cleanup');

    try {
      // Cleanup with timeout
      await this.withTimeout(
        plugin.cleanup(),
        this.config.cleanupTimeout!,
        `Plugin '${pluginName}' cleanup timeout`
      );

      this.pluginStates.set(pluginName, 'uninitialized');
      this.logger.info(`Plugin cleaned up: ${pluginName}`);
    } catch (error) {
      this.pluginStates.set(pluginName, 'error');
      this.logger.error(`Plugin cleanup failed: ${pluginName}`, error as Error);
      throw error;
    }
  }

  /**
   * Initialize all registered plugins
   */
  async initializeAll(): Promise<void> {
    const result = await this.executeOperation(async () => {
      const pluginNames = Array.from(this.plugins.keys());

      for (const pluginName of pluginNames) {
        const config = this.pluginConfigs.get(pluginName);
        if (config?.enabled !== false) {
          await this.initializePlugin(pluginName);
        }
      }
    }, 'initialize all plugins');

    if (!result.success) {
      throw result.error || new Error('Failed to initialize all plugins');
    }
  }

  /**
   * Cleanup all registered plugins
   */
  async cleanupAll(): Promise<void> {
    const result = await this.executeOperation(async () => {
      const pluginNames = Array.from(this.plugins.keys());

      // Cleanup in reverse order
      for (const pluginName of pluginNames.reverse()) {
        const state = this.pluginStates.get(pluginName);
        if (state === 'initialized') {
          await this.cleanupPlugin(pluginName);
        }
      }
    }, 'cleanup all plugins');

    if (!result.success) {
      throw result.error || new Error('Failed to cleanup all plugins');
    }
  }

  /**
   * Run health checks on all plugins
   * @returns Map of plugin names to health status
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const healthResults = new Map<string, boolean>();

    for (const [pluginName, plugin] of this.plugins.entries()) {
      if (plugin.healthCheck && this.pluginStates.get(pluginName) === 'initialized') {
        try {
          const isHealthy = await plugin.healthCheck();
          healthResults.set(pluginName, isHealthy);
        } catch (error) {
          this.logger.error(`Plugin health check failed: ${pluginName}`, error as Error);
          healthResults.set(pluginName, false);
        }
      }
    }

    return healthResults;
  }

  /**
   * Validate plugin dependencies
   * @param plugin - Plugin to validate
   * @returns Array of missing dependency names
   */
  private validateDependencies(plugin: Plugin): string[] {
    const dependencies = plugin.metadata.dependencies || [];
    const missing: string[] = [];

    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        missing.push(dep);
      }
    }

    return missing;
  }

  /**
   * Execute operation with timeout
   * @param promise - Promise to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param errorMessage - Error message if timeout occurs
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
    ]);
  }
}
