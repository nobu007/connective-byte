/**
 * Event System Module
 * Exports all event-related classes and utilities
 */

export { EventEmitter } from './EventEmitter';
export { EventBus, eventBus } from './EventBus';

// Export types
export type {
  EventListener,
  EventMiddleware,
  EventSubscription,
  EventMetadata,
  Event,
  EventFilter,
  EventEmitterConfig,
  EventStats,
} from '../../common/types/events';

// Export middleware
export {
  createLoggingMiddleware,
  createValidationMiddleware,
  createTransformationMiddleware,
  createRateLimitMiddleware,
} from './middleware/LoggingMiddleware';

// Export examples
export { UserEvents, UserEventEmitter, UserEventListener } from './examples/UserEvents';
export type { UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent } from './examples/UserEvents';
