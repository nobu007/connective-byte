/**
 * Type-Safe Event Emitter
 * Provides a robust event system with middleware, filtering, and persistence
 *
 * Features:
 * - Type-safe event handling
 * - Event middleware for data transformation
 * - Event filtering
 * - Event persistence and replay
 * - Wildcard event listeners
 * - Event statistics and monitoring
 */

import { BaseService } from '../../common/base/BaseService';
import {
  EventListener,
  EventMiddleware,
  EventSubscription,
  EventMetadata,
  Event,
  EventFilter,
  EventEmitterConfig,
  EventStats,
} from '../../common/types/events';
import { Logger } from '../../common/types';

export class EventEmitter extends BaseService {
  private listeners: Map<string, Set<EventListener>>;
  private middlewares: EventMiddleware[];
  private filters: Map<string, EventFilter[]>;
  private eventHistory: Map<string, Event[]>;
  private eventStats: Map<string, EventStats>;
  private config: Required<EventEmitterConfig>;

  constructor(logger?: Logger, config?: EventEmitterConfig) {
    super('EventEmitter', logger);
    this.listeners = new Map();
    this.middlewares = [];
    this.filters = new Map();
    this.eventHistory = new Map();
    this.eventStats = new Map();
    this.config = {
      maxListeners: config?.maxListeners ?? 100,
      enablePersistence: config?.enablePersistence ?? false,
      persistenceLimit: config?.persistenceLimit ?? 100,
      enableReplay: config?.enableReplay ?? false,
    };
  }

  /**
   * Subscribe to an event
   * @param eventName - Name of the event (supports wildcards with *)
   * @param listener - Event listener function
   * @returns Subscription object with unsubscribe method
   */
  on<T = unknown>(eventName: string, listener: EventListener<T>): EventSubscription {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
      this.eventStats.set(eventName, {
        eventName,
        listenerCount: 0,
        emitCount: 0,
      });
    }

    const listeners = this.listeners.get(eventName)!;

    // Check max listeners
    if (listeners.size >= this.config.maxListeners) {
      this.logger.warn(
        `Max listeners (${this.config.maxListeners}) reached for event: ${eventName}`
      );
    }

    listeners.add(listener as EventListener);

    // Update stats
    const stats = this.eventStats.get(eventName)!;
    stats.listenerCount = listeners.size;

    this.logger.debug(`Listener added for event: ${eventName}`, {
      listenerCount: listeners.size,
    });

    // Return subscription
    return {
      unsubscribe: () => this.off(eventName, listener),
    };
  }

  /**
   * Subscribe to an event (one-time)
   * Automatically unsubscribes after first emission
   * @param eventName - Name of the event
   * @param listener - Event listener function
   * @returns Subscription object
   */
  once<T = unknown>(eventName: string, listener: EventListener<T>): EventSubscription {
    const wrappedListener: EventListener<T> = async (data: T) => {
      await listener(data);
      this.off(eventName, wrappedListener);
    };

    return this.on(eventName, wrappedListener);
  }

  /**
   * Unsubscribe from an event
   * @param eventName - Name of the event
   * @param listener - Event listener function to remove
   */
  off<T = unknown>(eventName: string, listener: EventListener<T>): void {
    const listeners = this.listeners.get(eventName);

    if (!listeners) {
      return;
    }

    listeners.delete(listener as EventListener);

    // Update stats
    const stats = this.eventStats.get(eventName);
    if (stats) {
      stats.listenerCount = listeners.size;
    }

    // Clean up if no listeners remain
    if (listeners.size === 0) {
      this.listeners.delete(eventName);
    }

    this.logger.debug(`Listener removed for event: ${eventName}`, {
      remainingListeners: listeners.size,
    });
  }

  /**
   * Emit an event
   * @param eventName - Name of the event
   * @param data - Event data
   * @param source - Optional source identifier
   */
  async emit<T = unknown>(eventName: string, data: T, source?: string): Promise<void> {
    const result = await this.executeOperation(async () => {
      const metadata: EventMetadata = {
        timestamp: new Date(),
        eventName,
        source,
      };

      const event: Event<T> = { data, metadata };

      // Apply middlewares
      let processedData = data;
      for (const middleware of this.middlewares) {
        const result = await middleware(processedData, eventName);
        if (result === null) {
          this.logger.debug(`Event blocked by middleware: ${eventName}`);
          return;
        }
        processedData = result as T;
      }

      // Update event with processed data
      event.data = processedData;

      // Persist event if enabled
      if (this.config.enablePersistence) {
        this.persistEvent(eventName, event);
      }

      // Update stats
      const stats = this.eventStats.get(eventName);
      if (stats) {
        stats.emitCount++;
        stats.lastEmitted = metadata.timestamp;
      }

      // Get matching listeners (including wildcards)
      const matchingListeners = this.getMatchingListeners(eventName);

      // Apply filters
      const filteredListeners = this.applyFilters(
        eventName,
        processedData,
        metadata,
        matchingListeners
      );

      // Notify listeners
      const promises = Array.from(filteredListeners).map(async (listener) => {
        try {
          await listener(processedData);
        } catch (error) {
          this.logger.error(`Error in event listener for '${eventName}'`, error as Error);
        }
      });

      await Promise.all(promises);

      this.logger.debug(`Event emitted: ${eventName}`, {
        listenerCount: filteredListeners.size,
        source,
      });
    }, `emit event '${eventName}'`);

    if (!result.success) {
      throw result.error || new Error(`Failed to emit event '${eventName}'`);
    }
  }

  /**
   * Add event middleware
   * Middleware can transform event data or block events
   * @param middleware - Middleware function
   */
  use(middleware: EventMiddleware): void {
    this.middlewares.push(middleware);
    this.logger.debug('Event middleware added', {
      middlewareCount: this.middlewares.length,
    });
  }

  /**
   * Add event filter for specific event
   * @param eventName - Name of the event
   * @param filter - Filter function
   */
  filter<T = unknown>(eventName: string, filter: EventFilter<T>): void {
    if (!this.filters.has(eventName)) {
      this.filters.set(eventName, []);
    }

    this.filters.get(eventName)!.push(filter as EventFilter);
    this.logger.debug(`Filter added for event: ${eventName}`);
  }

  /**
   * Get event history
   * @param eventName - Name of the event
   * @param limit - Maximum number of events to return
   * @returns Array of past events
   */
  getHistory<T = unknown>(eventName: string, limit?: number): Event<T>[] {
    const history = this.eventHistory.get(eventName) || [];
    const events = history as Event<T>[];

    if (limit) {
      return events.slice(-limit);
    }

    return events;
  }

  /**
   * Replay past events to a listener
   * @param eventName - Name of the event
   * @param listener - Event listener function
   * @param limit - Maximum number of events to replay
   */
  async replay<T = unknown>(
    eventName: string,
    listener: EventListener<T>,
    limit?: number
  ): Promise<void> {
    if (!this.config.enableReplay) {
      this.logger.warn('Event replay is disabled');
      return;
    }

    const history = this.getHistory<T>(eventName, limit);

    for (const event of history) {
      try {
        await listener(event.data);
      } catch (error) {
        this.logger.error(`Error replaying event '${eventName}'`, error as Error);
      }
    }

    this.logger.debug(`Replayed ${history.length} events for: ${eventName}`);
  }

  /**
   * Get event statistics
   * @param eventName - Optional event name (returns all if omitted)
   * @returns Event statistics
   */
  getStats(eventName?: string): EventStats | EventStats[] {
    if (eventName) {
      return (
        this.eventStats.get(eventName) || {
          eventName,
          listenerCount: 0,
          emitCount: 0,
        }
      );
    }

    return Array.from(this.eventStats.values());
  }

  /**
   * Clear all listeners for an event
   * @param eventName - Name of the event (clears all if omitted)
   */
  clear(eventName?: string): void {
    if (eventName) {
      this.listeners.delete(eventName);
      this.filters.delete(eventName);
      this.eventHistory.delete(eventName);
      this.logger.debug(`Cleared listeners for event: ${eventName}`);
    } else {
      this.listeners.clear();
      this.filters.clear();
      this.eventHistory.clear();
      this.eventStats.clear();
      this.logger.debug('Cleared all event listeners');
    }
  }

  /**
   * Get listener count for an event
   * @param eventName - Name of the event
   * @returns Number of listeners
   */
  listenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.size || 0;
  }

  /**
   * Get all event names
   * @returns Array of event names
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Persist event to history
   * @param eventName - Name of the event
   * @param event - Event to persist
   */
  private persistEvent<T>(eventName: string, event: Event<T>): void {
    if (!this.eventHistory.has(eventName)) {
      this.eventHistory.set(eventName, []);
    }

    const history = this.eventHistory.get(eventName)!;
    history.push(event as Event);

    // Limit history size
    if (history.length > this.config.persistenceLimit) {
      history.shift();
    }
  }

  /**
   * Get listeners matching event name (including wildcards)
   * @param eventName - Name of the event
   * @returns Set of matching listeners
   */
  private getMatchingListeners(eventName: string): Set<EventListener> {
    const matching = new Set<EventListener>();

    // Exact match
    const exactListeners = this.listeners.get(eventName);
    if (exactListeners) {
      exactListeners.forEach((listener) => matching.add(listener));
    }

    // Wildcard matches
    for (const [pattern, listeners] of this.listeners.entries()) {
      if (pattern.includes('*') && this.matchesPattern(eventName, pattern)) {
        listeners.forEach((listener) => matching.add(listener));
      }
    }

    return matching;
  }

  /**
   * Check if event name matches pattern
   * @param eventName - Event name to check
   * @param pattern - Pattern with wildcards
   * @returns true if matches
   */
  private matchesPattern(eventName: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(eventName);
  }

  /**
   * Apply filters to listeners
   * @param eventName - Name of the event
   * @param data - Event data
   * @param metadata - Event metadata
   * @param listeners - Set of listeners
   * @returns Filtered set of listeners
   */
  private applyFilters<T>(
    eventName: string,
    data: T,
    metadata: EventMetadata,
    listeners: Set<EventListener>
  ): Set<EventListener> {
    const filters = this.filters.get(eventName);

    if (!filters || filters.length === 0) {
      return listeners;
    }

    // Check if event passes all filters
    for (const filter of filters) {
      if (!filter(data, metadata)) {
        this.logger.debug(`Event filtered out: ${eventName}`);
        return new Set();
      }
    }

    return listeners;
  }
}
