/**
 * Plugin Configuration Loader
 * Loads and validates plugin configurations from various sources
 */

import { PluginConfig } from '../../common/types/plugin';
import * as fs from 'fs';
import * as path from 'path';

export interface PluginConfigFile {
  plugins: Record<string, PluginConfig>;
}

export class PluginConfigLoader {
  private configCache: Map<string, PluginConfig>;

  constructor() {
    this.configCache = new Map();
  }

  /**
   * Load plugin configurations from a JSON file
   * @param configPath - Path to configuration file
   * @returns Map of plugin names to configurations
   */
  loadFromFile(configPath: string): Map<string, PluginConfig> {
    try {
      const absolutePath = path.resolve(configPath);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Configuration file not found: ${absolutePath}`);
      }

      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      const configFile: PluginConfigFile = JSON.parse(fileContent);

      // Validate configuration structure
      if (!configFile.plugins || typeof configFile.plugins !== 'object') {
        throw new Error('Invalid configuration file: missing or invalid "plugins" field');
      }

      // Convert to Map and cache
      const configs = new Map<string, PluginConfig>();
      for (const [pluginName, config] of Object.entries(configFile.plugins)) {
        this.validateConfig(pluginName, config);
        configs.set(pluginName, config);
        this.configCache.set(pluginName, config);
      }

      return configs;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load plugin configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load plugin configurations from environment variables
   * Format: PLUGIN_<NAME>_ENABLED=true, PLUGIN_<NAME>_OPTIONS={"key":"value"}
   * @returns Map of plugin names to configurations
   */
  loadFromEnvironment(): Map<string, PluginConfig> {
    const configs = new Map<string, PluginConfig>();
    const pluginPrefix = 'PLUGIN_';

    // Find all plugin-related environment variables
    const pluginEnvVars = Object.keys(process.env).filter((key) => key.startsWith(pluginPrefix));

    // Group by plugin name
    const pluginGroups = new Map<string, Record<string, string>>();
    for (const envVar of pluginEnvVars) {
      const parts = envVar.split('_');
      if (parts.length < 3) continue;

      const pluginName = parts[1].toLowerCase();
      const configKey = parts.slice(2).join('_').toLowerCase();
      const value = process.env[envVar];

      if (!value) continue;

      if (!pluginGroups.has(pluginName)) {
        pluginGroups.set(pluginName, {});
      }

      pluginGroups.get(pluginName)![configKey] = value;
    }

    // Convert to PluginConfig
    for (const [pluginName, envConfig] of pluginGroups.entries()) {
      const config: PluginConfig = {
        enabled: envConfig.enabled === 'true',
        options: {},
      };

      // Parse options if present
      if (envConfig.options) {
        try {
          config.options = JSON.parse(envConfig.options);
        } catch (error) {
          console.warn(`Failed to parse options for plugin '${pluginName}':`, error);
        }
      }

      configs.set(pluginName, config);
      this.configCache.set(pluginName, config);
    }

    return configs;
  }

  /**
   * Get cached configuration for a plugin
   * @param pluginName - Name of the plugin
   * @returns Plugin configuration or undefined
   */
  getConfig(pluginName: string): PluginConfig | undefined {
    return this.configCache.get(pluginName);
  }

  /**
   * Set configuration for a plugin
   * @param pluginName - Name of the plugin
   * @param config - Plugin configuration
   */
  setConfig(pluginName: string, config: PluginConfig): void {
    this.validateConfig(pluginName, config);
    this.configCache.set(pluginName, config);
  }

  /**
   * Clear all cached configurations
   */
  clearCache(): void {
    this.configCache.clear();
  }

  /**
   * Validate plugin configuration
   * @param pluginName - Name of the plugin
   * @param config - Configuration to validate
   */
  private validateConfig(pluginName: string, config: PluginConfig): void {
    if (typeof config !== 'object' || config === null) {
      throw new Error(`Invalid configuration for plugin '${pluginName}': must be an object`);
    }

    if (typeof config.enabled !== 'boolean') {
      throw new Error(
        `Invalid configuration for plugin '${pluginName}': 'enabled' must be a boolean`
      );
    }

    if (config.options !== undefined && typeof config.options !== 'object') {
      throw new Error(
        `Invalid configuration for plugin '${pluginName}': 'options' must be an object`
      );
    }
  }

  /**
   * Save configurations to a JSON file
   * @param configPath - Path to save configuration file
   */
  saveToFile(configPath: string): void {
    try {
      const configFile: PluginConfigFile = {
        plugins: Object.fromEntries(this.configCache),
      };

      const absolutePath = path.resolve(configPath);
      const dirPath = path.dirname(absolutePath);

      // Ensure directory exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(absolutePath, JSON.stringify(configFile, null, 2), 'utf-8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to save plugin configuration: ${error.message}`);
      }
      throw error;
    }
  }
}
