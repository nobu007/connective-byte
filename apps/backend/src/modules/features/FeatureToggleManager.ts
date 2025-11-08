/**
 * Feature Toggle Manager
 * Manages feature flags with runtime evaluation and analytics
 *
 * Features:
 * - Configuration-driven feature flags
 * - Conditional feature evaluation based on context
 * - Feature analytics and monitoring
 * - Caching for performance optimization
 * - Environment-based feature control
 */

import { BaseService } from '../../common/base/BaseService';
import {
  FeatureConfig,
  FeatureContext,
  FeatureState,
  FeatureEvaluationResult,
  FeatureStats,
  FeatureToggleConfig,
} from '../../common/types/features';
import { Logger } from '../../common/types';

export class FeatureToggleManager extends BaseService {
  private features: Map<string, FeatureConfig>;
  private stats: Map<string, FeatureStats>;
  private cache: Map<string, { result: boolean; expiresAt: number }>;
  private config: Required<FeatureToggleConfig>;

  constructor(logger?: Logger, config?: FeatureToggleConfig) {
    super('FeatureToggleManager', logger);
    this.features = new Map();
    this.stats = new Map();
    this.cache = new Map();
    this.config = {
      enableAnalytics: config?.enableAnalytics ?? true,
      enableCaching: config?.enableCaching ?? true,
      cacheTTL: config?.cacheTTL ?? 60000, // 1 minute default
      defaultState: config?.defaultState ?? 'disabled',
    };
  }

  /**
   * Register a feature toggle
   * @param feature - Feature configuration
   */
  register(feature: FeatureConfig): void {
    this.features.set(feature.name, feature);

    // Initialize stats
    if (this.config.enableAnalytics) {
      this.stats.set(feature.name, {
        featureName: feature.name,
        evaluationCount: 0,
        enabledCount: 0,
        disabledCount: 0,
      });
    }

    this.logger.info(`Feature registered: ${feature.name}`, {
      state: feature.state,
      hasCondition: !!feature.condition,
    });
  }

  /**
   * Unregister a feature toggle
   * @param featureName - Name of the feature
   */
  unregister(featureName: string): void {
    this.features.delete(featureName);
    this.stats.delete(featureName);
    this.clearCache(featureName);

    this.logger.info(`Feature unregistered: ${featureName}`);
  }

  /**
   * Check if a feature is enabled
   * @param featureName - Name of the feature
   * @param context - Optional context for conditional evaluation
   * @returns true if feature is enabled
   */
  async isEnabled(featureName: string, context?: FeatureContext): Promise<boolean> {
    const result = await this.evaluate(featureName, context);
    return result.enabled;
  }

  /**
   * Evaluate a feature toggle
   * @param featureName - Name of the feature
   * @param context - Optional context for conditional evaluation
   * @returns Evaluation result with details
   */
  async evaluate(featureName: string, context?: FeatureContext): Promise<FeatureEvaluationResult> {
    const result = await this.executeOperation(async () => {
      // Check cache first
      if (this.config.enableCaching && !context) {
        const cached = this.getFromCache(featureName);
        if (cached !== null) {
          return this.createResult(featureName, cached, 'cached', context);
        }
      }

      const feature = this.features.get(featureName);

      // Feature not found - use default state
      if (!feature) {
        this.logger.warn(`Feature not found: ${featureName}, using default state`);
        const enabled = this.config.defaultState === 'enabled';
        return this.createResult(featureName, enabled, 'default', context);
      }

      // Evaluate based on state
      let enabled: boolean;
      let reason: string;

      switch (feature.state) {
        case 'enabled':
          enabled = true;
          reason = 'always_enabled';
          break;

        case 'disabled':
          enabled = false;
          reason = 'always_disabled';
          break;

        case 'conditional':
          if (!feature.condition) {
            this.logger.warn(`Feature ${featureName} is conditional but has no condition function`);
            enabled = false;
            reason = 'missing_condition';
          } else {
            const ctx = context || this.getDefaultContext();
            enabled = await feature.condition(ctx);
            reason = enabled ? 'condition_met' : 'condition_not_met';
          }
          break;

        default:
          enabled = false;
          reason = 'unknown_state';
      }

      // Update cache
      if (this.config.enableCaching && !context) {
        this.setCache(featureName, enabled);
      }

      // Update stats
      if (this.config.enableAnalytics) {
        this.updateStats(featureName, enabled);
      }

      return this.createResult(featureName, enabled, reason, context);
    }, `evaluate feature '${featureName}'`);

    if (!result.success) {
      this.logger.error(`Feature evaluation failed: ${featureName}`, result.error);
      return this.createResult(featureName, false, 'evaluation_error', context);
    }

    return result.data!;
  }

  /**
   * Get feature configuration
   * @param featureName - Name of the feature
   * @returns Feature configuration or undefined
   */
  getFeature(featureName: string): FeatureConfig | undefined {
    return this.features.get(featureName);
  }

  /**
   * Get all registered features
   * @returns Array of feature configurations
   */
  getAllFeatures(): FeatureConfig[] {
    return Array.from(this.features.values());
  }

  /**
   * Update feature state
   * @param featureName - Name of the feature
   * @param state - New feature state
   */
  updateState(featureName: string, state: FeatureState): void {
    const feature = this.features.get(featureName);

    if (!feature) {
      throw new Error(`Feature not found: ${featureName}`);
    }

    feature.state = state;
    this.clearCache(featureName);

    this.logger.info(`Feature state updated: ${featureName}`, { state });
  }

  /**
   * Get feature statistics
   * @param featureName - Optional feature name (returns all if omitted)
   * @returns Feature statistics
   */
  getStats(featureName?: string): FeatureStats | FeatureStats[] {
    if (featureName) {
      return (
        this.stats.get(featureName) || {
          featureName,
          evaluationCount: 0,
          enabledCount: 0,
          disabledCount: 0,
        }
      );
    }

    return Array.from(this.stats.values());
  }

  /**
   * Clear cache for a feature
   * @param featureName - Optional feature name (clears all if omitted)
   */
  clearCache(featureName?: string): void {
    if (featureName) {
      this.cache.delete(featureName);
      this.logger.debug(`Cache cleared for feature: ${featureName}`);
    } else {
      this.cache.clear();
      this.logger.debug('All feature cache cleared');
    }
  }

  /**
   * Load features from configuration object
   * @param config - Configuration object with feature definitions
   */
  loadFromConfig(config: Record<string, Partial<FeatureConfig>>): void {
    for (const [name, featureConfig] of Object.entries(config)) {
      const feature: FeatureConfig = {
        name,
        state: featureConfig.state || this.config.defaultState,
        description: featureConfig.description,
        condition: featureConfig.condition,
        metadata: featureConfig.metadata,
      };

      this.register(feature);
    }

    this.logger.info(`Loaded ${Object.keys(config).length} features from configuration`);
  }

  /**
   * Load features from environment variables
   * Format: FEATURE_<NAME>=enabled|disabled
   */
  loadFromEnvironment(): void {
    const featurePrefix = 'FEATURE_';
    let loadedCount = 0;

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(featurePrefix) && value) {
        const featureName = key.substring(featurePrefix.length).toLowerCase().replace(/_/g, '-');

        const state = value.toLowerCase() as FeatureState;

        if (state === 'enabled' || state === 'disabled' || state === 'conditional') {
          this.register({
            name: featureName,
            state,
            description: `Loaded from environment variable ${key}`,
          });
          loadedCount++;
        }
      }
    }

    this.logger.info(`Loaded ${loadedCount} features from environment variables`);
  }

  /**
   * Create evaluation result
   */
  private createResult(
    featureName: string,
    enabled: boolean,
    reason: string,
    context?: FeatureContext
  ): FeatureEvaluationResult {
    return {
      featureName,
      enabled,
      reason,
      evaluatedAt: new Date(),
      context,
    };
  }

  /**
   * Get from cache
   */
  private getFromCache(featureName: string): boolean | null {
    const cached = this.cache.get(featureName);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(featureName);
      return null;
    }

    return cached.result;
  }

  /**
   * Set cache
   */
  private setCache(featureName: string, result: boolean): void {
    this.cache.set(featureName, {
      result,
      expiresAt: Date.now() + this.config.cacheTTL,
    });
  }

  /**
   * Update statistics
   */
  private updateStats(featureName: string, enabled: boolean): void {
    const stats = this.stats.get(featureName);

    if (!stats) {
      return;
    }

    stats.evaluationCount++;
    if (enabled) {
      stats.enabledCount++;
    } else {
      stats.disabledCount++;
    }
    stats.lastEvaluated = new Date();
  }

  /**
   * Get default context
   */
  private getDefaultContext(): FeatureContext {
    return {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date(),
    };
  }
}
