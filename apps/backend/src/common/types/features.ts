/**
 * Feature Toggle System Type Definitions
 * Defines interfaces for configuration-driven feature flags
 */

/**
 * Feature toggle state
 */
export type FeatureState = 'enabled' | 'disabled' | 'conditional';

/**
 * Feature toggle context
 * Used for conditional feature evaluation
 */
export interface FeatureContext {
  userId?: string;
  userRole?: string;
  environment?: string;
  timestamp?: Date;
  customAttributes?: Record<string, unknown>;
}

/**
 * Feature toggle condition
 * Evaluates whether a feature should be enabled based on context
 */
export type FeatureCondition = (context: FeatureContext) => boolean | Promise<boolean>;

/**
 * Feature toggle configuration
 */
export interface FeatureConfig {
  name: string;
  description?: string;
  state: FeatureState;
  condition?: FeatureCondition;
  metadata?: Record<string, unknown>;
}

/**
 * Feature toggle evaluation result
 */
export interface FeatureEvaluationResult {
  featureName: string;
  enabled: boolean;
  reason?: string;
  evaluatedAt: Date;
  context?: FeatureContext;
}

/**
 * Feature toggle statistics
 */
export interface FeatureStats {
  featureName: string;
  evaluationCount: number;
  enabledCount: number;
  disabledCount: number;
  lastEvaluated?: Date;
}

/**
 * Feature toggle manager configuration
 */
export interface FeatureToggleConfig {
  enableAnalytics?: boolean;
  enableCaching?: boolean;
  cacheTTL?: number;
  defaultState?: FeatureState;
}
