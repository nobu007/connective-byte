/**
 * PluginRegistry Unit Tests
 * Comprehensive test coverage for plugin registry
 */

import { PluginRegistry } from '../PluginRegistry';
import { BasePlugin } from '../BasePlugin';
import { PluginMetadata, Plugin } from '../../../common/types/plugin';
import { Logger } from '../../../common/types';

// Test plugin implementations
class SimplePlugin extends BasePlugin {
  protected async onInitialize(): Promise<void> {
    // Simple initialization
  }

  protected async onCleanup(): Promise<void> {
    // Simple cleanup
  }
}

class SlowPlugin extends BasePlugin {
  constructor(
    metadata: PluginMetadata,
    logger?: Logger,
    private delay: number = 100
  ) {
    super(metadata, logger);
  }

  protected async onInitialize(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.delay));
  }

  protected async onCleanup(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.delay));
  }
}

class FailingPlugin extends BasePlugin {
  protected async onInitialize(): Promise<void> {
    throw new Error('Plugin initialization failed');
  }

  protected async onCleanup(): Promise<void> {
    throw new Error('Plugin cleanup failed');
  }
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    registry = new PluginRegistry(mockLogger);
  });

  describe('register', () => {
    test('should register plugin successfully', async () => {
      const plugin = new SimplePlugin({ name: 'test-plugin', version: '1.0.0' }, mockLogger);

      const result = await registry.register(plugin);

      expect(result.success).toBe(true);
      expect(result.plugin).toBe(plugin);
      expect(registry.hasPlugin('test-plugin')).toBe(true);
    });

    test('should auto-initialize plugin by default', async () => {
      const plugin = new SimplePlugin({ name: 'test-plugin', version: '1.0.0' }, mockLogger);

      await registry.register(plugin);

      expect(plugin.state).toBe('initialized');
    });

    test('should not auto-initialize when disabled', async () => {
      registry = new PluginRegistry(mockLogger, { autoInitialize: false });

      const plugin = new SimplePlugin({ name: 'test-plugin', version: '1.0.0' }, mockLogger);

      await registry.register(plugin);

      expect(plugin.state).toBe('uninitialized');
    });

    test('should not initialize disabled plugins', async () => {
      const plugin = new SimplePlugin({ name: 'test-plugin', version: '1.0.0' }, mockLogger);

      await registry.register(plugin, { enabled: false });

      expect(plugin.state).toBe('uninitialized');
    });

    test('should reject duplicate plugin names', async () => {
      const plugin1 = new SimplePlugin({ name: 'duplicate', version: '1.0.0' }, mockLogger);
      const plugin2 = new SimplePlugin({ name: 'duplicate', version: '2.0.0' }, mockLogger);

      await registry.register(plugin1);
      const result = await registry.register(plugin2);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should validate dependencies', async () => {
      const plugin = new SimplePlugin(
        {
          name: 'dependent-plugin',
          version: '1.0.0',
          dependencies: ['missing-plugin'],
        },
        mockLogger
      );

      const result = await registry.register(plugin);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('missing dependencies');
    });

    test('should allow plugins with satisfied dependencies', async () => {
      const dependency = new SimplePlugin({ name: 'dependency', version: '1.0.0' }, mockLogger);

      const dependent = new SimplePlugin(
        {
          name: 'dependent',
          version: '1.0.0',
          dependencies: ['dependency'],
        },
        mockLogger
      );

      await registry.register(dependency);
      const result = await registry.register(dependent);

      expect(result.success).toBe(true);
    });
  });

  describe('unregister', () => {
    test('should unregister plugin successfully', async () => {
      const plugin = new SimplePlugin({ name: 'test-plugin', version: '1.0.0' }, mockLogger);

      await registry.register(plugin);
      await registry.unregister('test-plugin');

      expect(registry.hasPlugin('test-plugin')).toBe(false);
    });

    test('should cleanup plugin before unregistering', async () => {
      const plugin = new SimplePlugin({ name: 'test-plugin', version: '1.0.0' }, mockLogger);

      await registry.register(plugin);
      expect(plugin.state).toBe('initialized');

      await registry.unregister('test-plugin');
      expect(plugin.state).toBe('uninitialized');
    });

    test('should throw error for non-existent plugin', async () => {
      await expect(registry.unregister('non-existent')).rejects.toThrow(
        "Plugin 'non-existent' not found"
      );
    });
  });

  describe('getPlugin', () => {
    test('should retrieve registered plugin', async () => {
      const plugin = new SimplePlugin({ name: 'test-plugin', version: '1.0.0' }, mockLogger);

      await registry.register(plugin);
      const retrieved = registry.getPlugin('test-plugin');

      expect(retrieved).toBe(plugin);
    });

    test('should return undefined for non-existent plugin', () => {
      const retrieved = registry.getPlugin('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllPlugins', () => {
    test('should return all registered plugins', async () => {
      const plugin1 = new SimplePlugin({ name: 'plugin-1', version: '1.0.0' }, mockLogger);
      const plugin2 = new SimplePlugin({ name: 'plugin-2', version: '1.0.0' }, mockLogger);

      await registry.register(plugin1);
      await registry.register(plugin2);

      const plugins = registry.getAllPlugins();

      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
    });

    test('should return empty array when no plugins registered', () => {
      const plugins = registry.getAllPlugins();
      expect(plugins).toEqual([]);
    });
  });

  describe('getPluginState', () => {
    test('should return plugin state', async () => {
      const plugin = new SimplePlugin({ name: 'test-plugin', version: '1.0.0' }, mockLogger);

      await registry.register(plugin);
      const state = registry.getPluginState('test-plugin');

      expect(state).toBe('initialized');
    });

    test('should return undefined for non-existent plugin', () => {
      const state = registry.getPluginState('non-existent');
      expect(state).toBeUndefined();
    });
  });

  describe('hasPlugin', () => {
    test('should return true for registered plugin', async () => {
      const plugin = new SimplePlugin({ name: 'test-plugin', version: '1.0.0' }, mockLogger);

      await registry.register(plugin);

      expect(registry.hasPlugin('test-plugin')).toBe(true);
    });

    test('should return false for non-existent plugin', () => {
      expect(registry.hasPlugin('non-existent')).toBe(false);
    });
  });

  describe('initializeAll', () => {
    test('should initialize all plugins', async () => {
      registry = new PluginRegistry(mockLogger, { autoInitialize: false });

      const plugin1 = new SimplePlugin({ name: 'plugin-1', version: '1.0.0' }, mockLogger);
      const plugin2 = new SimplePlugin({ name: 'plugin-2', version: '1.0.0' }, mockLogger);

      await registry.register(plugin1);
      await registry.register(plugin2);

      await registry.initializeAll();

      expect(plugin1.state).toBe('initialized');
      expect(plugin2.state).toBe('initialized');
    });

    test('should skip disabled plugins', async () => {
      registry = new PluginRegistry(mockLogger, { autoInitialize: false });

      const plugin1 = new SimplePlugin({ name: 'plugin-1', version: '1.0.0' }, mockLogger);
      const plugin2 = new SimplePlugin({ name: 'plugin-2', version: '1.0.0' }, mockLogger);

      await registry.register(plugin1, { enabled: true });
      await registry.register(plugin2, { enabled: false });

      await registry.initializeAll();

      expect(plugin1.state).toBe('initialized');
      expect(plugin2.state).toBe('uninitialized');
    });
  });

  describe('cleanupAll', () => {
    test('should cleanup all plugins', async () => {
      const plugin1 = new SimplePlugin({ name: 'plugin-1', version: '1.0.0' }, mockLogger);
      const plugin2 = new SimplePlugin({ name: 'plugin-2', version: '1.0.0' }, mockLogger);

      await registry.register(plugin1);
      await registry.register(plugin2);

      await registry.cleanupAll();

      expect(plugin1.state).toBe('uninitialized');
      expect(plugin2.state).toBe('uninitialized');
    });

    test('should cleanup in reverse order', async () => {
      const cleanupOrder: string[] = [];

      class TrackingPlugin extends BasePlugin {
        protected async onInitialize(): Promise<void> {}
        protected async onCleanup(): Promise<void> {
          cleanupOrder.push(this.metadata.name);
        }
      }

      const plugin1 = new TrackingPlugin({ name: 'plugin-1', version: '1.0.0' }, mockLogger);
      const plugin2 = new TrackingPlugin({ name: 'plugin-2', version: '1.0.0' }, mockLogger);

      await registry.register(plugin1);
      await registry.register(plugin2);

      await registry.cleanupAll();

      expect(cleanupOrder).toEqual(['plugin-2', 'plugin-1']);
    });
  });

  describe('healthCheckAll', () => {
    test('should check health of all plugins', async () => {
      const plugin1 = new SimplePlugin({ name: 'plugin-1', version: '1.0.0' }, mockLogger);
      const plugin2 = new SimplePlugin({ name: 'plugin-2', version: '1.0.0' }, mockLogger);

      await registry.register(plugin1);
      await registry.register(plugin2);

      const healthResults = await registry.healthCheckAll();

      expect(healthResults.get('plugin-1')).toBe(true);
      expect(healthResults.get('plugin-2')).toBe(true);
    });

    test('should handle plugin health check failures', async () => {
      class UnhealthyPlugin extends BasePlugin {
        protected async onInitialize(): Promise<void> {}
        protected async onCleanup(): Promise<void> {}
        async healthCheck(): Promise<boolean> {
          throw new Error('Health check failed');
        }
      }

      const plugin = new UnhealthyPlugin({ name: 'unhealthy', version: '1.0.0' }, mockLogger);

      await registry.register(plugin);
      const healthResults = await registry.healthCheckAll();

      expect(healthResults.get('unhealthy')).toBe(false);
    });
  });

  describe('timeout handling', () => {
    test('should timeout slow initialization', async () => {
      registry = new PluginRegistry(mockLogger, { initializationTimeout: 20 });

      const plugin = new SlowPlugin({ name: 'slow-plugin', version: '1.0.0' }, mockLogger, 100);

      const result = await registry.register(plugin);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });

    test('should timeout slow cleanup', async () => {
      registry = new PluginRegistry(mockLogger, { cleanupTimeout: 20 });

      const plugin = new SlowPlugin({ name: 'slow-plugin', version: '1.0.0' }, mockLogger, 100);

      await registry.register(plugin);

      await expect(registry.unregister('slow-plugin')).rejects.toThrow('timeout');
    });
  });

  describe('error handling', () => {
    test('should handle plugin initialization errors', async () => {
      const plugin = new FailingPlugin({ name: 'failing-plugin', version: '1.0.0' }, mockLogger);

      const result = await registry.register(plugin);

      expect(result.success).toBe(false);
      expect(plugin.state).toBe('error');
    });

    test('should handle plugin cleanup errors', async () => {
      // Create a plugin that fails only on cleanup
      class CleanupFailingPlugin extends BasePlugin {
        protected async onInitialize(): Promise<void> {
          // Success
        }
        protected async onCleanup(): Promise<void> {
          throw new Error('Plugin cleanup failed');
        }
      }

      const plugin = new CleanupFailingPlugin(
        { name: 'failing-plugin', version: '1.0.0' },
        mockLogger
      );

      await registry.register(plugin);

      await expect(registry.unregister('failing-plugin')).rejects.toThrow();
    });
  });
});
