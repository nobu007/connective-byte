/**
 * Common Feature Conditions
 * Reusable condition functions for feature toggles
 */

import { FeatureCondition, FeatureContext } from '../../../common/types/features';

/**
 * Environment-based conditions
 */
export const EnvironmentConditions = {
  /**
   * Enable feature only in development
   */
  isDevelopment: (): FeatureCondition => {
    return (context: FeatureContext) => {
      return context.environment === 'development' || process.env.NODE_ENV === 'development';
    };
  },

  /**
   * Enable feature only in production
   */
  isProduction: (): FeatureCondition => {
    return (context: FeatureContext) => {
      return context.environment === 'production' || process.env.NODE_ENV === 'production';
    };
  },

  /**
   * Enable feature only in test
   */
  isTest: (): FeatureCondition => {
    return (context: FeatureContext) => {
      return context.environment === 'test' || process.env.NODE_ENV === 'test';
    };
  },

  /**
   * Enable feature in specific environments
   */
  inEnvironments: (environments: string[]): FeatureCondition => {
    return (context: FeatureContext) => {
      const env = context.environment || process.env.NODE_ENV || 'development';
      return environments.includes(env);
    };
  },
};

/**
 * User-based conditions
 */
export const UserConditions = {
  /**
   * Enable feature for specific user IDs
   */
  forUsers: (userIds: string[]): FeatureCondition => {
    return (context: FeatureContext) => {
      return !!context.userId && userIds.includes(context.userId);
    };
  },

  /**
   * Enable feature for specific user roles
   */
  forRoles: (roles: string[]): FeatureCondition => {
    return (context: FeatureContext) => {
      return !!context.userRole && roles.includes(context.userRole);
    };
  },

  /**
   * Enable feature for admin users
   */
  forAdmins: (): FeatureCondition => {
    return (context: FeatureContext) => {
      return context.userRole === 'admin' || context.userRole === 'administrator';
    };
  },

  /**
   * Enable feature for percentage of users (A/B testing)
   */
  forPercentage: (percentage: number): FeatureCondition => {
    return (context: FeatureContext) => {
      if (!context.userId) {
        return false;
      }

      // Simple hash function for consistent user assignment
      const hash = context.userId.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0);

      return hash % 100 < percentage;
    };
  },
};

/**
 * Time-based conditions
 */
export const TimeConditions = {
  /**
   * Enable feature after a specific date
   */
  after: (date: Date): FeatureCondition => {
    return (context: FeatureContext) => {
      const now = context.timestamp || new Date();
      return now >= date;
    };
  },

  /**
   * Enable feature before a specific date
   */
  before: (date: Date): FeatureCondition => {
    return (context: FeatureContext) => {
      const now = context.timestamp || new Date();
      return now < date;
    };
  },

  /**
   * Enable feature between two dates
   */
  between: (startDate: Date, endDate: Date): FeatureCondition => {
    return (context: FeatureContext) => {
      const now = context.timestamp || new Date();
      return now >= startDate && now < endDate;
    };
  },

  /**
   * Enable feature during specific hours (24-hour format)
   */
  duringHours: (startHour: number, endHour: number): FeatureCondition => {
    return (context: FeatureContext) => {
      const now = context.timestamp || new Date();
      const hour = now.getHours();
      return hour >= startHour && hour < endHour;
    };
  },

  /**
   * Enable feature on specific days of week (0 = Sunday, 6 = Saturday)
   */
  onDays: (days: number[]): FeatureCondition => {
    return (context: FeatureContext) => {
      const now = context.timestamp || new Date();
      const day = now.getDay();
      return days.includes(day);
    };
  },
};

/**
 * Custom attribute conditions
 */
export const AttributeConditions = {
  /**
   * Enable feature if custom attribute matches value
   */
  hasAttribute: (key: string, value: unknown): FeatureCondition => {
    return (context: FeatureContext) => {
      return context.customAttributes?.[key] === value;
    };
  },

  /**
   * Enable feature if custom attribute exists
   */
  hasAttributeKey: (key: string): FeatureCondition => {
    return (context: FeatureContext) => {
      return !!context.customAttributes && key in context.customAttributes;
    };
  },

  /**
   * Enable feature if custom attribute matches predicate
   */
  attributeMatches: (key: string, predicate: (value: unknown) => boolean): FeatureCondition => {
    return (context: FeatureContext) => {
      const value = context.customAttributes?.[key];
      return value !== undefined && predicate(value);
    };
  },
};

/**
 * Logical combinators
 */
export const LogicalConditions = {
  /**
   * Combine conditions with AND logic
   */
  and: (...conditions: FeatureCondition[]): FeatureCondition => {
    return async (context: FeatureContext) => {
      for (const condition of conditions) {
        const result = await condition(context);
        if (!result) {
          return false;
        }
      }
      return true;
    };
  },

  /**
   * Combine conditions with OR logic
   */
  or: (...conditions: FeatureCondition[]): FeatureCondition => {
    return async (context: FeatureContext) => {
      for (const condition of conditions) {
        const result = await condition(context);
        if (result) {
          return true;
        }
      }
      return false;
    };
  },

  /**
   * Negate a condition
   */
  not: (condition: FeatureCondition): FeatureCondition => {
    return async (context: FeatureContext) => {
      const result = await condition(context);
      return !result;
    };
  },
};
