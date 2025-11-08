/**
 * Feature Toggle Examples
 * Demonstrates how to define and use feature toggles
 */

import { featureFlags } from '../FeatureFlags';
import {
  EnvironmentConditions,
  UserConditions,
  TimeConditions,
  LogicalConditions,
} from '../conditions/CommonConditions';

/**
 * Feature names
 */
export const Features = {
  NEW_DASHBOARD: 'new-dashboard',
  ADVANCED_ANALYTICS: 'advanced-analytics',
  BETA_FEATURES: 'beta-features',
  MAINTENANCE_MODE: 'maintenance-mode',
  DARK_MODE: 'dark-mode',
} as const;

/**
 * Initialize application features
 */
export function initializeFeatures(): void {
  // Simple enabled/disabled features
  featureFlags.register({
    name: Features.DARK_MODE,
    description: 'Enable dark mode UI',
    state: 'enabled',
  });

  // Environment-based feature
  featureFlags.register({
    name: Features.BETA_FEATURES,
    description: 'Enable beta features in development',
    state: 'conditional',
    condition: EnvironmentConditions.isDevelopment(),
  });

  // User role-based feature
  featureFlags.register({
    name: Features.ADVANCED_ANALYTICS,
    description: 'Advanced analytics for admin users',
    state: 'conditional',
    condition: UserConditions.forAdmins(),
  });

  // Time-based feature (launch date)
  featureFlags.register({
    name: Features.NEW_DASHBOARD,
    description: 'New dashboard UI launching on specific date',
    state: 'conditional',
    condition: TimeConditions.after(new Date('2025-12-01')),
  });

  // Complex condition (multiple criteria)
  featureFlags.register({
    name: Features.MAINTENANCE_MODE,
    description: 'Maintenance mode during off-peak hours in production',
    state: 'conditional',
    condition: LogicalConditions.and(
      EnvironmentConditions.isProduction(),
      TimeConditions.duringHours(2, 6) // 2 AM to 6 AM
    ),
  });
}

/**
 * Example usage in application code
 */
export class FeatureService {
  /**
   * Check if new dashboard should be shown
   */
  async shouldShowNewDashboard(userId?: string): Promise<boolean> {
    return featureFlags.isEnabled(Features.NEW_DASHBOARD, { userId });
  }

  /**
   * Check if advanced analytics is available
   */
  async hasAdvancedAnalytics(userRole?: string): Promise<boolean> {
    return featureFlags.isEnabled(Features.ADVANCED_ANALYTICS, { userRole });
  }

  /**
   * Check if in maintenance mode
   */
  async isMaintenanceMode(): Promise<boolean> {
    return featureFlags.isEnabled(Features.MAINTENANCE_MODE);
  }

  /**
   * Get all feature states for a user
   */
  async getUserFeatures(userId: string, userRole: string): Promise<Record<string, boolean>> {
    const context = { userId, userRole };

    const features = await Promise.all([
      featureFlags.isEnabled(Features.NEW_DASHBOARD, context),
      featureFlags.isEnabled(Features.ADVANCED_ANALYTICS, context),
      featureFlags.isEnabled(Features.BETA_FEATURES, context),
      featureFlags.isEnabled(Features.DARK_MODE, context),
    ]);

    return {
      [Features.NEW_DASHBOARD]: features[0],
      [Features.ADVANCED_ANALYTICS]: features[1],
      [Features.BETA_FEATURES]: features[2],
      [Features.DARK_MODE]: features[3],
    };
  }
}

/**
 * Example: A/B Testing
 */
export function setupABTest(): void {
  // 50% of users see new feature
  featureFlags.register({
    name: 'ab-test-new-checkout',
    description: 'A/B test for new checkout flow',
    state: 'conditional',
    condition: UserConditions.forPercentage(50),
  });
}

/**
 * Example: Gradual Rollout
 */
export function setupGradualRollout(): void {
  // Start with 10% of users
  featureFlags.register({
    name: 'gradual-rollout-feature',
    description: 'Gradually rolling out to 10% of users',
    state: 'conditional',
    condition: UserConditions.forPercentage(10),
  });

  // Later, update to 50%
  // featureFlags.updateState('gradual-rollout-feature', 'conditional');
  // Or update the condition dynamically
}

/**
 * Example: Feature with metadata
 */
export function setupFeatureWithMetadata(): void {
  featureFlags.register({
    name: 'premium-feature',
    description: 'Premium feature for paid users',
    state: 'conditional',
    condition: (context) => {
      return context.customAttributes?.isPremium === true;
    },
    metadata: {
      tier: 'premium',
      pricing: '$9.99/month',
      launchDate: '2025-11-01',
    },
  });
}
