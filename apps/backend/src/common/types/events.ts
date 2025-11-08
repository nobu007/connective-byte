/**
 * Event System Type Definitions
 * Defines interfaces for the type-safe event system
 */

/**
 * Event listener function type
 */
export type EventListener<T = unknown> = (data: T) => void | Promise<void>;

/**
 * Event middleware function type
 * Can modify event data or prevent propagation
 */
export type EventMiddleware<T = unknown> = (
  data: T,
  eventName: string
) => T | Promise<T> | Promise<T | null> | null;

/**
 * Event subscription
 */
export interface EventSubscription {
  unsubscribe(): void;
}

/**
 * Event metadata
 */
export interface EventMetadata {
  timestamp: Date;
  eventName: string;
  source?: string;
}

/**
 * Event with metadata
 */
export interface Event<T = unknown> {
  data: T;
  metadata: EventMetadata;
}

/**
 * Event filter function
 */
export type EventFilter<T = unknown> = (data: T, metadata: EventMetadata) => boolean;

/**
 * Event emitter configuration
 */
export interface EventEmitterConfig {
  maxListeners?: number;
  enablePersistence?: boolean;
  persistenceLimit?: number;
  enableReplay?: boolean;
}

/**
 * Event statistics
 */
export interface EventStats {
  eventName: string;
  listenerCount: number;
  emitCount: number;
  lastEmitted?: Date;
}
