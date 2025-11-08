/**
 * BasePlugin Unit Tests
 * Comprehensive test coverage for plugin base class
 */

import { BasePlugin } from '../BasePlugin';
import { PluginMetadata, PluginState } from '../../../common/types/plugin';
import { Logger } from '../../../common/types';

// Test plugin implementation
class TestPlugin extends BasePlugin {
  public initializeCalled = false;
  public cleanupCalled = false;
  public shouldFailInitialize = false;
  public shouldFailCleanup = false;

  protected async onInitialize(): Promise<void> {
    if (this.shouldFailInitialize) {
      throw new Error('Initialization failed');
    }
    this.initializeCalled = true;
  }

  protected async onCleanup(): Promise<void> {
    if (this.shouldFailCleanup) {
      throw new Error('Cleanup failed');
    }
    this.cleanupCalled = true;
  }
}

describe('BasePlugin', () => {
  let mockLogger: Logger;
  let metadata: PluginMetadata;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    metadata = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
    };
  });

  describe('constructor', () => {
    test('should create plugin with metadata', () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      expect(plugin.metadata).toEqual(metadata);
      expect(plugin.state).toBe('uninitialized');
    });

    test('should create plugin without logger', () => {
      const plugin = new TestPlugin(metadata);

      expect(plugin.metadata).toEqual(metadata);
      expect(plugin.state).toBe('uninitialized');
    });

    test('should initialize with uninitialized state', () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      expect(plugin.state).toBe('uninitialized');
    });
  });

  describe('initialize', () => {
    test('should initialize plugin successfully', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      await plugin.initialize();

      expect(plugin.state).toBe('initialized');
      expect(plugin.initializeCalled).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('initialized successfully')
      );
    });

    test('should change state during initialization', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);
      const states: PluginState[] = [];

      // Override setState to track state changes
      const originalSetState = (plugin as any).setState.bind(plugin);
      (plugin as any).setState = (state: PluginState) => {
        states.push(state);
        originalSetState(state);
      };

      await plugin.initialize();

      expect(states).toEqual(['initializing', 'initialized']);
    });

    test('should not initialize if already initialized', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      await plugin.initialize();
      plugin.initializeCalled = false; // Reset flag

      await plugin.initialize();

      expect(plugin.initializeCalled).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already initialized'));
    });

    test('should handle initialization errors', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);
      plugin.shouldFailInitialize = true;

      await expect(plugin.initialize()).rejects.toThrow('Initialization failed');
      expect(plugin.state).toBe('error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    test('should cleanup plugin successfully', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      await plugin.initialize();
      await plugin.cleanup();

      expect(plugin.state).toBe('uninitialized');
      expect(plugin.cleanupCalled).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('cleaned up successfully')
      );
    });

    test('should change state during cleanup', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);
      await plugin.initialize();

      const states: PluginState[] = [];
      const originalSetState = (plugin as any).setState.bind(plugin);
      (plugin as any).setState = (state: PluginState) => {
        states.push(state);
        originalSetState(state);
      };

      await plugin.cleanup();

      expect(states).toEqual(['cleanup', 'uninitialized']);
    });

    test('should not cleanup if already uninitialized', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      await plugin.cleanup();

      expect(plugin.cleanupCalled).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already cleaned up'));
    });

    test('should handle cleanup errors', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);
      plugin.shouldFailCleanup = true;

      await plugin.initialize();
      await expect(plugin.cleanup()).rejects.toThrow('Cleanup failed');
      expect(plugin.state).toBe('error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    test('should return true when initialized', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      await plugin.initialize();
      const healthy = await plugin.healthCheck();

      expect(healthy).toBe(true);
    });

    test('should return false when not initialized', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      const healthy = await plugin.healthCheck();

      expect(healthy).toBe(false);
    });

    test('should return false when in error state', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);
      plugin.shouldFailInitialize = true;

      try {
        await plugin.initialize();
      } catch (error) {
        // Expected error
      }

      const healthy = await plugin.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  describe('state management', () => {
    test('should track state transitions', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      expect(plugin.state).toBe('uninitialized');

      await plugin.initialize();
      expect(plugin.state).toBe('initialized');

      await plugin.cleanup();
      expect(plugin.state).toBe('uninitialized');
    });

    test('should log state changes', async () => {
      const plugin = new TestPlugin(metadata, mockLogger);

      await plugin.initialize();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('state changed to: initializing')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('state changed to: initialized')
      );
    });
  });

  describe('default logger', () => {
    test('should use default logger when none provided', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const plugin = new TestPlugin(metadata);
      (plugin as any).logger.info('test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO][test-plugin] test message'),
        ''
      );

      consoleSpy.mockRestore();
    });

    test('should include plugin name in default logger', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const plugin = new TestPlugin(metadata);
      (plugin as any).logger.error('error message', new Error('test error'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR][test-plugin] error message'),
        'test error',
        ''
      );

      consoleSpy.mockRestore();
    });
  });
});
