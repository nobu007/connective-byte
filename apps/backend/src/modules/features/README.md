# Feature Toggle System

A powerful, configuration-driven feature flag system for runtime feature control, A/B testing, and gradual rollouts.

## Features

- **Configuration-Driven**: Define features in code or load from environment variables
- **Conditional Evaluation**: Enable features based on user, environment, time, or custom criteria
- **Analytics & Monitoring**: Track feature usage and evaluation statistics
- **Caching**: Performance optimization with configurable TTL
- **Type-Safe**: Full TypeScript support with typed contexts
- **Flexible Conditions**: Reusable condition functions with logical combinators
- **A/B Testing**: Built-in support for percentage-based rollouts
- **Gradual Rollouts**: Incrementally enable features for user segments

## Quick Start

### Basic Usage

```typescript
import { featureFlags } from './modules/features';

// Register a feature
featureFlags.register({
  name: 'dark-mode',
  description: 'Enable dark mode UI',
  state: 'enabled',
});

// Check if feature is enabled
const isDarkModeEnabled = await featureFlags.isEnabled('dark-mode');

if (isDarkModeEnabled) {
  // Show dark mode UI
}
```

### Environment Variables

```bash
# Enable/disable features via environment variables
FEATURE_DARK_MODE=enabled
FEATURE_BETA_FEATURES=disabled
FEATURE_NEW_DASHBOARD=conditional
```

Features are automatically loaded from environment variables on initialization.

## Feature States

### Always Enabled

```typescript
featureFlags.register({
  name: 'stable-feature',
  state: 'enabled',
});
```

### Always Disabled

```typescript
featureFlags.register({
  name: 'deprecated-feature',
  state: 'disabled',
});
```

### Conditional

```typescript
import { EnvironmentConditions } from './modules/features';

featureFlags.register({
  name: 'dev-tools',
  state: 'conditional',
  condition: EnvironmentConditions.isDevelopment(),
});
```

## Conditional Features

### Environment-Based

```typescript
import { EnvironmentConditions } from './modules/features';

// Enable only in development
featureFlags.register({
  name: 'debug-mode',
  state: 'conditional',
  condition: EnvironmentConditions.isDevelopment(),
});

// Enable only in production
featureFlags.register({
  name: 'analytics',
  state: 'conditional',
  condition: EnvironmentConditions.isProduction(),
});

// Enable in specific environments
featureFlags.register({
  name: 'staging-features',
  state: 'conditional',
  condition: EnvironmentConditions.inEnvironments(['staging', 'development']),
});
```

### User-Based

```typescript
import { UserConditions } from './modules/features';

// Enable for specific users
featureFlags.register({
  name: 'beta-tester-feature',
  state: 'conditional',
  condition: UserConditions.forUsers(['user-123', 'user-456']),
});

// Enable for specific roles
featureFlags.register({
  name: 'admin-panel',
  state: 'conditional',
  condition: UserConditions.forRoles(['admin', 'moderator']),
});

// Enable for admins only
featureFlags.register({
  name: 'advanced-settings',
  state: 'conditional',
  condition: UserConditions.forAdmins(),
});

// Enable for percentage of users (A/B testing)
featureFlags.register({
  name: 'new-ui',
  state: 'conditional',
  condition: UserConditions.forPercentage(50), // 50% of users
});
```

### Time-Based

```typescript
import { TimeConditions } from './modules/features';

// Enable after launch date
featureFlags.register({
  name: 'new-feature',
  state: 'conditional',
  condition: TimeConditions.after(new Date('2025-12-01')),
});

// Enable before deadline
featureFlags.register({
  name: 'early-bird-offer',
  state: 'conditional',
  condition: TimeConditions.before(new Date('2025-11-30')),
});

// Enable during specific period
featureFlags.register({
  name: 'holiday-theme',
  state: 'conditional',
  condition: TimeConditions.between(new Date('2025-12-20'), new Date('2026-01-05')),
});

// Enable during business hours
featureFlags.register({
  name: 'live-support',
  state: 'conditional',
  condition: TimeConditions.duringHours(9, 17), // 9 AM to 5 PM
});

// Enable on weekends
featureFlags.register({
  name: 'weekend-special',
  state: 'conditional',
  condition: TimeConditions.onDays([0, 6]), // Sunday and Saturday
});
```

### Custom Attributes

```typescript
import { AttributeConditions } from './modules/features';

// Enable if attribute matches value
featureFlags.register({
  name: 'premium-feature',
  state: 'conditional',
  condition: AttributeConditions.hasAttribute('tier', 'premium'),
});

// Enable if attribute exists
featureFlags.register({
  name: 'beta-access',
  state: 'conditional',
  condition: AttributeConditions.hasAttributeKey('betaAccess'),
});

// Enable if attribute matches predicate
featureFlags.register({
  name: 'high-usage-feature',
  state: 'conditional',
  condition: AttributeConditions.attributeMatches('usageCount', (value) => {
    return typeof value === 'number' && value > 100;
  }),
});
```

### Complex Conditions

```typescript
import { LogicalConditions, EnvironmentConditions, UserConditions } from './modules/features';

// AND: All conditions must be true
featureFlags.register({
  name: 'admin-beta-feature',
  state: 'conditional',
  condition: LogicalConditions.and(
    EnvironmentConditions.isProduction(),
    UserConditions.forAdmins()
  ),
});

// OR: Any condition can be true
featureFlags.register({
  name: 'special-access',
  state: 'conditional',
  condition: LogicalConditions.or(
    UserConditions.forAdmins(),
    UserConditions.forUsers(['vip-user-1', 'vip-user-2'])
  ),
});

// NOT: Negate a condition
featureFlags.register({
  name: 'non-production-feature',
  state: 'conditional',
  condition: LogicalConditions.not(EnvironmentConditions.isProduction()),
});
```

## Feature Context

Provide context when evaluating features:

```typescript
import { FeatureContext } from './modules/features';

const context: FeatureContext = {
  userId: 'user-123',
  userRole: 'admin',
  environment: 'production',
  timestamp: new Date(),
  customAttributes: {
    tier: 'premium',
    betaAccess: true,
    usageCount: 150,
  },
};

const isEnabled = await featureFlags.isEnabled('premium-feature', context);
```

## Evaluation Results

Get detailed evaluation results:

```typescript
const result = await featureFlags.evaluate('new-feature', context);

console.log(result);
// {
//   featureName: 'new-feature',
//   enabled: true,
//   reason: 'condition_met',
//   evaluatedAt: Date,
//   context: { ... }
// }
```

## Feature Management

### Update Feature State

```typescript
// Change feature state at runtime
featureFlags.updateState('dark-mode', 'disabled');
```

### Get Feature Configuration

```typescript
const feature = featureFlags.getFeature('dark-mode');
console.log(feature);
// {
//   name: 'dark-mode',
//   state: 'enabled',
//   description: 'Enable dark mode UI'
// }
```

### Get All Features

```typescript
const allFeatures = featureFlags.getAllFeatures();
```

### Unregister Feature

```typescript
featureFlags.unregister('old-feature');
```

## Analytics & Monitoring

### Get Feature Statistics

```typescript
// Get stats for specific feature
const stats = featureFlags.getStats('new-feature');
console.log(stats);
// {
//   featureName: 'new-feature',
//   evaluationCount: 1000,
//   enabledCount: 750,
//   disabledCount: 250,
//   lastEvaluated: Date
// }

// Get stats for all features
const allStats = featureFlags.getStats();
```

### Clear Cache

```typescript
// Clear cache for specific feature
featureFlags.clearCache('new-feature');

// Clear all cache
featureFlags.clearCache();
```

## Loading Features

### From Configuration Object

```typescript
featureFlags.loadFromConfig({
  'dark-mode': {
    state: 'enabled',
    description: 'Dark mode UI',
  },
  'beta-features': {
    state: 'conditional',
    condition: EnvironmentConditions.isDevelopment(),
  },
});
```

### From Environment Variables

```bash
FEATURE_DARK_MODE=enabled
FEATURE_BETA_FEATURES=disabled
FEATURE_NEW_DASHBOARD=conditional
```

```typescript
// Automatically loaded on initialization
// Or manually load:
featureFlags.loadFromEnvironment();
```

## Common Patterns

### A/B Testing

```typescript
import { UserConditions } from './modules/features';

// 50% of users see variant A, 50% see variant B
featureFlags.register({
  name: 'ab-test-new-checkout',
  state: 'conditional',
  condition: UserConditions.forPercentage(50),
});

// In your code
const showNewCheckout = await featureFlags.isEnabled('ab-test-new-checkout', {
  userId: currentUser.id,
});

if (showNewCheckout) {
  // Show new checkout flow
} else {
  // Show old checkout flow
}
```

### Gradual Rollout

```typescript
// Week 1: 10% of users
featureFlags.register({
  name: 'new-feature',
  state: 'conditional',
  condition: UserConditions.forPercentage(10),
});

// Week 2: Update to 25%
// Update the condition or re-register with new percentage

// Week 3: Update to 50%
// Week 4: Enable for everyone
featureFlags.updateState('new-feature', 'enabled');
```

### Feature with Launch Date

```typescript
import { TimeConditions } from './modules/features';

featureFlags.register({
  name: 'holiday-sale',
  state: 'conditional',
  condition: TimeConditions.between(new Date('2025-12-20'), new Date('2025-12-26')),
});
```

### Beta Program

```typescript
import { AttributeConditions } from './modules/features';

featureFlags.register({
  name: 'beta-feature',
  state: 'conditional',
  condition: AttributeConditions.hasAttribute('betaProgram', true),
});

// Check with context
const hasBetaAccess = await featureFlags.isEnabled('beta-feature', {
  userId: user.id,
  customAttributes: {
    betaProgram: user.isBetaTester,
  },
});
```

### Maintenance Mode

```typescript
import { LogicalConditions, EnvironmentConditions, TimeConditions } from './modules/features';

featureFlags.register({
  name: 'maintenance-mode',
  state: 'conditional',
  condition: LogicalConditions.and(
    EnvironmentConditions.isProduction(),
    TimeConditions.duringHours(2, 6) // 2 AM to 6 AM
  ),
});
```

## Integration with Application

### Service Layer

```typescript
// services/FeatureService.ts
import { featureFlags } from './modules/features';

export class FeatureService {
  async getUserFeatures(userId: string, userRole: string) {
    const context = { userId, userRole };

    return {
      darkMode: await featureFlags.isEnabled('dark-mode', context),
      betaFeatures: await featureFlags.isEnabled('beta-features', context),
      advancedAnalytics: await featureFlags.isEnabled('advanced-analytics', context),
    };
  }
}
```

### API Endpoint

```typescript
// controllers/FeaturesController.ts
import { Request, Response } from 'express';
import { featureFlags } from './modules/features';

export class FeaturesController {
  async getUserFeatures(req: Request, res: Response) {
    const { userId, userRole } = req.user;

    const features = await Promise.all([
      featureFlags.evaluate('dark-mode', { userId, userRole }),
      featureFlags.evaluate('beta-features', { userId, userRole }),
    ]);

    res.json({
      features: features.map((f) => ({
        name: f.featureName,
        enabled: f.enabled,
        reason: f.reason,
      })),
    });
  }
}
```

### Middleware

```typescript
// middleware/featureCheck.ts
import { Request, Response, NextFunction } from 'express';
import { featureFlags } from './modules/features';

export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId, userRole } = req.user;

    const isEnabled = await featureFlags.isEnabled(featureName, {
      userId,
      userRole,
    });

    if (!isEnabled) {
      return res.status(403).json({
        error: 'Feature not available',
        feature: featureName,
      });
    }

    next();
  };
}

// Usage
app.get('/api/beta-endpoint', requireFeature('beta-features'), betaHandler);
```

## Testing

```typescript
import { FeatureToggleManager } from './modules/features';

describe('FeatureToggleManager', () => {
  let manager: FeatureToggleManager;

  beforeEach(() => {
    manager = new FeatureToggleManager();
  });

  it('should enable feature when state is enabled', async () => {
    manager.register({
      name: 'test-feature',
      state: 'enabled',
    });

    const isEnabled = await manager.isEnabled('test-feature');
    expect(isEnabled).toBe(true);
  });

  it('should evaluate conditional features', async () => {
    manager.register({
      name: 'admin-feature',
      state: 'conditional',
      condition: (context) => context.userRole === 'admin',
    });

    const isEnabledForAdmin = await manager.isEnabled('admin-feature', {
      userRole: 'admin',
    });
    expect(isEnabledForAdmin).toBe(true);

    const isEnabledForUser = await manager.isEnabled('admin-feature', {
      userRole: 'user',
    });
    expect(isEnabledForUser).toBe(false);
  });
});
```

## Best Practices

1. **Use Descriptive Names**: Use clear, descriptive feature names (e.g., 'new-dashboard' not 'feature1')
2. **Document Features**: Always add descriptions to feature configurations
3. **Start Conservative**: Begin with small rollout percentages and gradually increase
4. **Monitor Usage**: Use analytics to track feature adoption and issues
5. **Clean Up**: Remove old feature flags after full rollout
6. **Test Conditions**: Write tests for custom condition functions
7. **Use Metadata**: Add metadata for documentation and tracking
8. **Cache Wisely**: Use caching for frequently checked features
9. **Provide Context**: Always provide relevant context when evaluating features
10. **Handle Defaults**: Define sensible default states for missing features

## Performance Considerations

- Feature evaluations are cached by default (1 minute TTL)
- Conditional features with context bypass cache
- Use simple conditions for frequently evaluated features
- Consider caching evaluation results in your application layer
- Monitor feature evaluation performance with analytics

## Configuration

```typescript
import { FeatureToggleManager } from './modules/features';

const manager = new FeatureToggleManager(logger, {
  enableAnalytics: true, // Track feature usage
  enableCaching: true, // Cache evaluation results
  cacheTTL: 60000, // Cache for 1 minute
  defaultState: 'disabled', // Default for unknown features
});
```
