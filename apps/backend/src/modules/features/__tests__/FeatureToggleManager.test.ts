/**
 * FeatureToggleManager Unit Tests
 * Comprehensive test coverage for feature toggle system
 */

import { FeatureToggleManager } from '../FeatureToggleManager';
import { FeatureConfig, FeatureContext, FeatureCondition } from '../../../common/types/features';
import { Logger } from '../../../common/types';

describe('FeatureToggleManager', () => {
  let manager: FeatureToggleManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    manager = new FeatureToggleManager(mockLogger);
  });

  describe('register', () => {
    test('should register feature successfully', () => {
      const feature: FeatureConfig = {
        name: 'test-feature',
        state: 'enabled',
        description: 'Test feature',
      };

      manager.register(feature);

      const registered = manager.getFeature('test-feature');
      expect(registered).toEqual(feature);
    });

    test('should initialize statistics', () => {
      const feature: FeatureConfig = {
        name: 'test-feature',
        state: 'enabled',
      };

      manager.register(feature);

      const stats = manager.getStats('test-feature') as any;
      expect(stats).toMatchObject({
        featureName: 'test-feature',
        evaluationCount: 0,
        enabledCount: 0,
        disabledCount: 0,
      });
    });

    test('should log registration', () => {
      const feature: FeatureConfig = {
        name: 'test-feature',
        state: 'enabled',
      };

      manager.register(feature);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Feature registered'),
        expect.any(Object)
      );
    });
  });

  describe('unregister', () => {
    test('should unregister feature', () => {
      const feature: FeatureConfig = {
        name: 'test-feature',
        state: 'enabled',
      };

      manager.register(feature);
      manager.unregister('test-feature');

      const registered = manager.getFeature('test-feature');
      expect(registered).toBeUndefined();
    });

    test('should clear statistics', () => {
      const feature: FeatureConfig = {
        name: 'test-feature',
        state: 'enabled',
      };

      manager.register(feature);
      manager.unregister('test-feature');

      const stats = manager.getStats('test-feature') as any;
      expect(stats.evaluationCount).toBe(0);
    });

    test('should clear cache', async () => {
      const feature: FeatureConfig = {
        name: 'test-feature',
        state: 'enabled',
      };

      manager.register(feature);
      await manager.isEnabled('test-feature'); // Cache result

      manager.unregister('test-feature');

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache cleared'));
    });
  });

  describe('isEnabled', () => {
    test('should return true for enabled feature', async () => {
      manager.register({
        name: 'enabled-feature',
        state: 'enabled',
      });

      const enabled = await manager.isEnabled('enabled-feature');
      expect(enabled).toBe(true);
    });

    test('should return false for disabled feature', async () => {
      manager.register({
        name: 'disabled-feature',
        state: 'disabled',
      });

      const enabled = await manager.isEnabled('disabled-feature');
      expect(enabled).toBe(false);
    });

    test('should use default state for non-existent feature', async () => {
      const enabled = await manager.isEnabled('non-existent');
      expect(enabled).toBe(false); // Default is disabled
    });

    test('should use custom default state', async () => {
      manager = new FeatureToggleManager(mockLogger, { defaultState: 'enabled' });

      const enabled = await manager.isEnabled('non-existent');
      expect(enabled).toBe(true);
    });
  });

  describe('evaluate', () => {
    test('should evaluate enabled feature', async () => {
      manager.register({
        name: 'test-feature',
        state: 'enabled',
      });

      const result = await manager.evaluate('test-feature');

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('always_enabled');
      expect(result.featureName).toBe('test-feature');
      expect(result.evaluatedAt).toBeInstanceOf(Date);
    });

    test('should evaluate disabled feature', async () => {
      manager.register({
        name: 'test-feature',
        state: 'disabled',
      });

      const result = await manager.evaluate('test-feature');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('always_disabled');
    });

    test('should evaluate conditional feature', async () => {
      const condition: FeatureCondition = async (ctx) => {
        return ctx.environment === 'production';
      };

      manager.register({
        name: 'conditional-feature',
        state: 'conditional',
        condition,
      });

      const context: FeatureContext = { environment: 'production' };
      const result = await manager.evaluate('conditional-feature', context);

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('condition_met');
    });

    test('should handle missing condition', async () => {
      manager.register({
        name: 'conditional-feature',
        state: 'conditional',
        // No condition provided
      });

      const result = await manager.evaluate('conditional-feature');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('missing_condition');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should use default context when none provided', async () => {
      let capturedContext: FeatureContext | undefined;
      const condition: FeatureCondition = async (ctx) => {
        capturedContext = ctx;
        return ctx.environment === 'development';
      };

      manager.register({
        name: 'conditional-feature',
        state: 'conditional',
        condition,
      });

      await manager.evaluate('conditional-feature');

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.environment).toBeDefined();
    });
  });

  describe('caching', () => {
    test('should cache evaluation results', async () => {
      let callCount = 0;
      const condition: FeatureCondition = async () => {
        callCount++;
        return true;
      };

      manager.register({
        name: 'cached-feature',
        state: 'conditional',
        condition,
      });

      await manager.isEnabled('cached-feature');
      await manager.isEnabled('cached-feature');

      expect(callCount).toBe(1); // Condition called only once
    });

    test('should not cache when context provided', async () => {
      let callCount = 0;
      const condition: FeatureCondition = async () => {
        callCount++;
        return true;
      };

      manager.register({
        name: 'cached-feature',
        state: 'conditional',
        condition,
      });

      await manager.isEnabled('cached-feature', { userId: '1' });
      await manager.isEnabled('cached-feature', { userId: '2' });

      expect(callCount).toBe(2); // Condition called twice
    });

    test('should respect cache TTL', async () => {
      jest.useFakeTimers();

      manager = new FeatureToggleManager(mockLogger, { cacheTTL: 1000 });

      let callCount = 0;
      const condition: FeatureCondition = async () => {
        callCount++;
        return true;
      };

      manager.register({
        name: 'cached-feature',
        state: 'conditional',
        condition,
      });

      await manager.isEnabled('cached-feature');

      jest.advanceTimersByTime(1500); // Expire cache

      await manager.isEnabled('cached-feature');

      expect(callCount).toBe(2); // Condition called twice

      jest.useRealTimers();
    });

    test('should disable caching when configured', async () => {
      manager = new FeatureToggleManager(mockLogger, { enableCaching: false });

      let callCount = 0;
      const condition: FeatureCondition = async () => {
        callCount++;
        return true;
      };

      manager.register({
        name: 'uncached-feature',
        state: 'conditional',
        condition,
      });

      await manager.isEnabled('uncached-feature');
      await manager.isEnabled('uncached-feature');

      expect(callCount).toBe(2); // Condition called twice
    });
  });

  describe('statistics', () => {
    test('should track evaluation count', async () => {
      manager = new FeatureToggleManager(mockLogger, { enableCaching: false });

      manager.register({
        name: 'test-feature',
        state: 'enabled',
      });

      await manager.isEnabled('test-feature');
      await manager.isEnabled('test-feature');

      const stats = manager.getStats('test-feature') as any;
      expect(stats.evaluationCount).toBe(2);
    });

    test('should track enabled count', async () => {
      manager = new FeatureToggleManager(mockLogger, { enableCaching: false });

      manager.register({
        name: 'test-feature',
        state: 'enabled',
      });

      await manager.isEnabled('test-feature');
      await manager.isEnabled('test-feature');

      const stats = manager.getStats('test-feature') as any;
      expect(stats.enabledCount).toBe(2);
      expect(stats.disabledCount).toBe(0);
    });

    test('should track disabled count', async () => {
      manager = new FeatureToggleManager(mockLogger, { enableCaching: false });

      manager.register({
        name: 'test-feature',
        state: 'disabled',
      });

      await manager.isEnabled('test-feature');
      await manager.isEnabled('test-feature');

      const stats = manager.getStats('test-feature') as any;
      expect(stats.enabledCount).toBe(0);
      expect(stats.disabledCount).toBe(2);
    });

    test('should track last evaluated time', async () => {
      manager.register({
        name: 'test-feature',
        state: 'enabled',
      });

      await manager.isEnabled('test-feature');

      const stats = manager.getStats('test-feature') as any;
      expect(stats.lastEvaluated).toBeInstanceOf(Date);
    });

    test('should return all statistics', async () => {
      manager.register({ name: 'feature1', state: 'enabled' });
      manager.register({ name: 'feature2', state: 'disabled' });

      await manager.isEnabled('feature1');
      await manager.isEnabled('feature2');

      const allStats = manager.getStats();

      expect(Array.isArray(allStats)).toBe(true);
      expect(allStats).toHaveLength(2);
    });

    test('should disable analytics when configured', async () => {
      manager = new FeatureToggleManager(mockLogger, { enableAnalytics: false });

      manager.register({
        name: 'test-feature',
        state: 'enabled',
      });

      await manager.isEnabled('test-feature');

      const stats = manager.getStats('test-feature') as any;
      expect(stats.evaluationCount).toBe(0); // Not tracked
    });
  });

  describe('getFeature', () => {
    test('should return feature configuration', () => {
      const feature: FeatureConfig = {
        name: 'test-feature',
        state: 'enabled',
        description: 'Test',
      };

      manager.register(feature);

      const retrieved = manager.getFeature('test-feature');
      expect(retrieved).toEqual(feature);
    });

    test('should return undefined for non-existent feature', () => {
      const retrieved = manager.getFeature('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllFeatures', () => {
    test('should return all features', () => {
      manager.register({ name: 'feature1', state: 'enabled' });
      manager.register({ name: 'feature2', state: 'disabled' });

      const features = manager.getAllFeatures();

      expect(features).toHaveLength(2);
      expect(features.map((f) => f.name)).toContain('feature1');
      expect(features.map((f) => f.name)).toContain('feature2');
    });

    test('should return empty array when no features', () => {
      const features = manager.getAllFeatures();
      expect(features).toEqual([]);
    });
  });

  describe('updateState', () => {
    test('should update feature state', () => {
      manager.register({
        name: 'test-feature',
        state: 'disabled',
      });

      manager.updateState('test-feature', 'enabled');

      const feature = manager.getFeature('test-feature');
      expect(feature?.state).toBe('enabled');
    });

    test('should clear cache on state update', async () => {
      manager.register({
        name: 'test-feature',
        state: 'enabled',
      });

      await manager.isEnabled('test-feature'); // Cache result

      manager.updateState('test-feature', 'disabled');

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache cleared'));
    });

    test('should throw error for non-existent feature', () => {
      expect(() => {
        manager.updateState('non-existent', 'enabled');
      }).toThrow('Feature not found');
    });
  });

  describe('clearCache', () => {
    test('should clear cache for specific feature', async () => {
      manager.register({
        name: 'test-feature',
        state: 'enabled',
      });

      await manager.isEnabled('test-feature');
      manager.clearCache('test-feature');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache cleared for feature')
      );
    });

    test('should clear all cache', async () => {
      manager.register({ name: 'feature1', state: 'enabled' });
      manager.register({ name: 'feature2', state: 'enabled' });

      await manager.isEnabled('feature1');
      await manager.isEnabled('feature2');

      manager.clearCache();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('All feature cache cleared')
      );
    });
  });

  describe('loadFromConfig', () => {
    test('should load features from configuration', () => {
      const config = {
        'feature-1': {
          state: 'enabled' as const,
          description: 'Feature 1',
        },
        'feature-2': {
          state: 'disabled' as const,
          description: 'Feature 2',
        },
      };

      manager.loadFromConfig(config);

      expect(manager.getFeature('feature-1')).toBeDefined();
      expect(manager.getFeature('feature-2')).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Loaded 2 features'));
    });

    test('should use default state when not specified', () => {
      manager = new FeatureToggleManager(mockLogger, { defaultState: 'enabled' });

      const config = {
        'feature-1': {
          description: 'Feature 1',
        },
      };

      manager.loadFromConfig(config);

      const feature = manager.getFeature('feature-1');
      expect(feature?.state).toBe('enabled');
    });
  });

  describe('loadFromEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should load features from environment variables', () => {
      process.env.FEATURE_NEW_UI = 'enabled';
      process.env.FEATURE_BETA_FEATURE = 'disabled';

      manager.loadFromEnvironment();

      expect(manager.getFeature('new-ui')).toBeDefined();
      expect(manager.getFeature('beta-feature')).toBeDefined();
    });

    test('should convert underscores to hyphens', () => {
      process.env.FEATURE_MY_COOL_FEATURE = 'enabled';

      manager.loadFromEnvironment();

      expect(manager.getFeature('my-cool-feature')).toBeDefined();
    });

    test('should ignore invalid states', () => {
      process.env.FEATURE_INVALID = 'maybe';

      manager.loadFromEnvironment();

      expect(manager.getFeature('invalid')).toBeUndefined();
    });

    test('should log loaded count', () => {
      process.env.FEATURE_TEST1 = 'enabled';
      process.env.FEATURE_TEST2 = 'disabled';

      manager.loadFromEnvironment();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 2 features from environment')
      );
    });
  });

  describe('error handling', () => {
    test('should handle condition evaluation errors', async () => {
      const condition: FeatureCondition = async () => {
        throw new Error('Condition error');
      };

      manager.register({
        name: 'error-feature',
        state: 'conditional',
        condition,
      });

      const result = await manager.evaluate('error-feature');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('evaluation_error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
