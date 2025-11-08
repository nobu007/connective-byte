/**
 * Feature Toggle System Module
 * Exports all feature toggle related classes and utilities
 */

export { FeatureToggleManager } from './FeatureToggleManager';
export { FeatureFlags, featureFlags } from './FeatureFlags';

// Export types
export type {
  FeatureState,
  FeatureContext,
  FeatureCondition,
  FeatureConfig,
  FeatureEvaluationResult,
  FeatureStats,
  FeatureToggleConfig,
} from '../../common/types/features';

// Export conditions
export {
  EnvironmentConditions,
  UserConditions,
  TimeConditions,
  AttributeConditions,
  LogicalConditions,
} from './conditions/CommonConditions';

// Export examples
export { Features, initializeFeatures, FeatureService } from './examples/FeatureExamples';
