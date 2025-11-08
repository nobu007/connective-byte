/**
 * Plugin System Module
 * Exports all plugin-related classes and interfaces
 */

export { PluginRegistry } from './PluginRegistry';
export { BasePlugin } from './BasePlugin';
export { PluginConfigLoader } from './PluginConfigLoader';
export type { PluginConfigFile } from './PluginConfigLoader';

// Export types
export type {
  Plugin,
  PluginState,
  PluginMetadata,
  PluginConfig,
  PluginRegistryConfig,
  PluginRegistrationResult,
} from '../../common/types/plugin';

// Export example plugins
export { LoggingPlugin } from './examples/LoggingPlugin';
