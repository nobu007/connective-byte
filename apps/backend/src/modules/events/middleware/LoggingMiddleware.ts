/**
 * Logging Middleware
 * Logs all events passing through the event system
 */

import { EventMiddleware } from '../../../common/types/events';
import { loggingService } from '../../../services/loggingService';

const logger = loggingService.createLogger('EventMiddleware');

/**
 * Create logging middleware
 * @param logLevel - Log level to use (default: 'debug')
 * @returns Event middleware function
 */
export function createLoggingMiddleware(logLevel: 'debug' | 'info' = 'debug'): EventMiddleware {
  return async (data: unknown, eventName: string) => {
    const logMessage = `Event: ${eventName}`;

    if (logLevel === 'info') {
      logger.info(logMessage, { eventName });
    } else {
      logger.debug(logMessage, { eventName, data });
    }

    // Pass through unchanged
    return data;
  };
}

/**
 * Create validation middleware
 * Validates event data against a schema
 * @param validator - Validation function
 * @returns Event middleware function
 */
export function createValidationMiddleware<T = unknown>(
  validator: (data: T) => boolean
): EventMiddleware<T> {
  return async (data: T, eventName: string): Promise<T | null> => {
    const isValid = validator(data);

    if (!isValid) {
      logger.warn(`Event validation failed: ${eventName}`, { data });
      return null; // Block event
    }

    return data;
  };
}

/**
 * Create transformation middleware
 * Transforms event data
 * @param transformer - Transformation function
 * @returns Event middleware function
 */
export function createTransformationMiddleware<T = unknown, R = unknown>(
  transformer: (data: T) => R | Promise<R>
): EventMiddleware<T> {
  return async (data: T, eventName: string) => {
    try {
      const transformed = await transformer(data);
      return transformed as any;
    } catch (error) {
      logger.error(`Event transformation failed: ${eventName}`, error as Error);
      return null; // Block event on transformation error
    }
  };
}

/**
 * Create rate limiting middleware
 * Limits event emission rate
 * @param maxEventsPerSecond - Maximum events per second
 * @returns Event middleware function
 */
export function createRateLimitMiddleware(maxEventsPerSecond: number): EventMiddleware {
  const eventCounts = new Map<string, { count: number; resetTime: number }>();

  return async (data: unknown, eventName: string) => {
    const now = Date.now();
    const eventData = eventCounts.get(eventName);

    if (!eventData || now >= eventData.resetTime) {
      // Reset counter
      eventCounts.set(eventName, {
        count: 1,
        resetTime: now + 1000,
      });
      return data;
    }

    if (eventData.count >= maxEventsPerSecond) {
      logger.warn(`Rate limit exceeded for event: ${eventName}`);
      return null; // Block event
    }

    eventData.count++;
    return data;
  };
}
