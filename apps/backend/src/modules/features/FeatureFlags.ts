/**
 * Feature Flags
 * Global feature flag manager instance
 * Singleton pattern for application-wide feature toggle management
 */

import { FeatureToggleManager } from './FeatureToggleManager';
import { FeatureToggleConfig } from '../../common/types/features';
import { loggingService } from '../../services/loggingService';

/**
 * Global feature flags instance
 */
class FeatureFlags extends FeatureToggleManager {
  private static instance: FeatureFlags;

  private constructor() {
    const logger = loggingService.createLogger('FeatureFlags');
    const config: FeatureToggleConfig = {
      enableAnalytics: true,
      enableCaching: true,
      cacheTTL: 60000, // 1 minute
      defaultState: 'disabled',
    };

    super(logger, config);

    // Load features from environment on initialization
    this.loadFromEnvironment();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }

    return FeatureFlags.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    if (FeatureFlags.instance) {
      FeatureFlags.instance.clearCache();
      FeatureFlags.instance = null as any;
    }
  }
}

// Export singleton instance
export const featureFlags = FeatureFlags.getInstance();
export { FeatureFlags };
