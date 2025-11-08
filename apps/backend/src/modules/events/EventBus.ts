/**
 * Event Bus
 * Global event bus for application-wide event communication
 * Singleton pattern for centralized event management
 */

import { EventEmitter } from './EventEmitter';
import { EventEmitterConfig } from '../../common/types/events';
import { loggingService } from '../../services/loggingService';

/**
 * Global event bus instance
 */
class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    const logger = loggingService.createLogger('EventBus');
    const config: EventEmitterConfig = {
      maxListeners: 200,
      enablePersistence: true,
      persistenceLimit: 50,
      enableReplay: true,
    };

    super(logger, config);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }

    return EventBus.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    if (EventBus.instance) {
      EventBus.instance.clear();
      EventBus.instance = null as any;
    }
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();
export { EventBus };
