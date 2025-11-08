# Plugin System

The ConnectiveByte plugin system provides an extensible architecture for adding functionality without modifying core code.

## Features

- **Plugin Lifecycle Management**: Initialize and cleanup plugins automatically
- **Dependency Resolution**: Validate plugin dependencies before initialization
- **Configuration System**: Load plugin configurations from files or environment variables
- **Health Monitoring**: Built-in health checks for all plugins
- **State Tracking**: Monitor plugin states (uninitialized, initializing, initialized, error, cleanup)
- **Timeout Protection**: Configurable timeouts for initialization and cleanup

## Quick Start

### Creating a Plugin

```typescript
import { BasePlugin, PluginMetadata } from './modules/plugins';
import { Logger } from './common/types';

export class MyPlugin extends BasePlugin {
  constructor(logger?: Logger) {
    const metadata: PluginMetadata = {
      name: 'my-plugin',
      version: '1.0.0',
      description: 'My custom plugin',
      dependencies: [], // Optional: list of required plugins
    };

    super(metadata, logger);
  }

  protected async onInitialize(): Promise<void> {
    // Your initialization logic here
    this.logger.info('MyPlugin initialized');
  }

  protected async onCleanup(): Promise<void> {
    // Your cleanup logic here
    this.logger.info('MyPlugin cleaned up');
  }

  // Optional: Custom health check
  async healthCheck(): Promise<boolean> {
    return this.state === 'initialized';
  }
}
```

### Registering Plugins

```typescript
import { PluginRegistry } from './modules/plugins';
import { loggingService } from './services/loggingService';
import { MyPlugin } from './plugins/MyPlugin';

// Create registry
const logger = loggingService.createLogger('PluginRegistry');
const registry = new PluginRegistry(logger);

// Register plugin
const plugin = new MyPlugin(logger);
await registry.register(plugin, {
  enabled: true,
  options: {
    // Plugin-specific options
  },
});

// Get plugin
const myPlugin = registry.getPlugin('my-plugin');

// Unregister plugin
await registry.unregister('my-plugin');
```

### Loading Configuration

```typescript
import { PluginConfigLoader } from './modules/plugins';

const configLoader = new PluginConfigLoader();

// Load from file
const configs = configLoader.loadFromFile('./config/plugins.json');

// Load from environment variables
// PLUGIN_MYPLUGIN_ENABLED=true
// PLUGIN_MYPLUGIN_OPTIONS={"key":"value"}
const envConfigs = configLoader.loadFromEnvironment();

// Get specific config
const myPluginConfig = configLoader.getConfig('my-plugin');
```

### Configuration File Format

```json
{
  "plugins": {
    "my-plugin": {
      "enabled": true,
      "options": {
        "customOption": "value"
      }
    },
    "another-plugin": {
      "enabled": false,
      "options": {}
    }
  }
}
```

### Environment Variables

```bash
# Enable/disable plugin
PLUGIN_MYPLUGIN_ENABLED=true

# Plugin options (JSON string)
PLUGIN_MYPLUGIN_OPTIONS='{"key":"value"}'
```

## Plugin Lifecycle

1. **Uninitialized**: Plugin is registered but not initialized
2. **Initializing**: Plugin is currently initializing
3. **Initialized**: Plugin is ready and operational
4. **Cleanup**: Plugin is being cleaned up
5. **Error**: Plugin encountered an error

## Advanced Usage

### Plugin Dependencies

```typescript
const metadata: PluginMetadata = {
  name: 'dependent-plugin',
  version: '1.0.0',
  dependencies: ['logging-plugin', 'another-plugin'],
};
```

The registry will validate that all dependencies are registered before allowing plugin registration.

### Health Monitoring

```typescript
// Check all plugin health
const healthResults = await registry.healthCheckAll();

for (const [pluginName, isHealthy] of healthResults) {
  console.log(`${pluginName}: ${isHealthy ? 'healthy' : 'unhealthy'}`);
}
```

### Batch Operations

```typescript
// Initialize all plugins
await registry.initializeAll();

// Cleanup all plugins (in reverse order)
await registry.cleanupAll();
```

## Example Plugin

See `examples/LoggingPlugin.ts` for a complete example implementation.

## Best Practices

1. **Always implement cleanup**: Release resources in `onCleanup()` to prevent memory leaks
2. **Use dependency injection**: Accept logger and other dependencies in constructor
3. **Handle errors gracefully**: Wrap operations in try-catch blocks
4. **Implement health checks**: Provide meaningful health status
5. **Document configuration options**: Clearly document what options your plugin accepts
6. **Version your plugins**: Use semantic versioning for plugin metadata
7. **Test thoroughly**: Write unit tests for plugin initialization, operation, and cleanup

## Testing

```typescript
import { PluginRegistry } from './modules/plugins';
import { MyPlugin } from './plugins/MyPlugin';

describe('MyPlugin', () => {
  let registry: PluginRegistry;
  let plugin: MyPlugin;

  beforeEach(() => {
    registry = new PluginRegistry();
    plugin = new MyPlugin();
  });

  afterEach(async () => {
    await registry.cleanupAll();
  });

  it('should initialize successfully', async () => {
    const result = await registry.register(plugin);
    expect(result.success).toBe(true);
    expect(registry.getPluginState('my-plugin')).toBe('initialized');
  });

  it('should cleanup successfully', async () => {
    await registry.register(plugin);
    await registry.unregister('my-plugin');
    expect(registry.hasPlugin('my-plugin')).toBe(false);
  });
});
```

## Integration with Application

```typescript
// In app.ts or index.ts
import { PluginRegistry, PluginConfigLoader } from './modules/plugins';
import { loggingService } from './services/loggingService';

// Create registry
const logger = loggingService.createLogger('PluginRegistry');
const pluginRegistry = new PluginRegistry(logger, {
  autoInitialize: true,
  initializationTimeout: 30000,
  cleanupTimeout: 10000,
});

// Load configurations
const configLoader = new PluginConfigLoader();
const configs = configLoader.loadFromFile('./config/plugins.json');

// Register plugins with configurations
for (const [pluginName, config] of configs) {
  const PluginClass = getPluginClass(pluginName); // Your plugin loading logic
  const plugin = new PluginClass(logger);
  await pluginRegistry.register(plugin, config);
}

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await pluginRegistry.cleanupAll();
  process.exit(0);
});
```
