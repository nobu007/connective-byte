/**
 * Example User Events
 * Demonstrates how to define and use typed events
 */

import { eventBus } from '../EventBus';

/**
 * User event data types
 */
export interface UserCreatedEvent {
  userId: string;
  username: string;
  email: string;
  timestamp: Date;
}

export interface UserUpdatedEvent {
  userId: string;
  changes: Record<string, unknown>;
  timestamp: Date;
}

export interface UserDeletedEvent {
  userId: string;
  timestamp: Date;
}

/**
 * User event names
 */
export const UserEvents = {
  CREATED: 'user:created',
  UPDATED: 'user:updated',
  DELETED: 'user:deleted',
  ALL: 'user:*', // Wildcard for all user events
} as const;

/**
 * User event emitters
 */
export class UserEventEmitter {
  /**
   * Emit user created event
   */
  static async created(data: UserCreatedEvent): Promise<void> {
    await eventBus.emit(UserEvents.CREATED, data, 'UserService');
  }

  /**
   * Emit user updated event
   */
  static async updated(data: UserUpdatedEvent): Promise<void> {
    await eventBus.emit(UserEvents.UPDATED, data, 'UserService');
  }

  /**
   * Emit user deleted event
   */
  static async deleted(data: UserDeletedEvent): Promise<void> {
    await eventBus.emit(UserEvents.DELETED, data, 'UserService');
  }
}

/**
 * User event listeners
 */
export class UserEventListener {
  /**
   * Listen to user created events
   */
  static onCreated(callback: (data: UserCreatedEvent) => void | Promise<void>) {
    return eventBus.on<UserCreatedEvent>(UserEvents.CREATED, callback);
  }

  /**
   * Listen to user updated events
   */
  static onUpdated(callback: (data: UserUpdatedEvent) => void | Promise<void>) {
    return eventBus.on<UserUpdatedEvent>(UserEvents.UPDATED, callback);
  }

  /**
   * Listen to user deleted events
   */
  static onDeleted(callback: (data: UserDeletedEvent) => void | Promise<void>) {
    return eventBus.on<UserDeletedEvent>(UserEvents.DELETED, callback);
  }

  /**
   * Listen to all user events
   */
  static onAll(callback: (data: unknown) => void | Promise<void>) {
    return eventBus.on(UserEvents.ALL, callback);
  }
}

/**
 * Example usage:
 *
 * // Emit events
 * await UserEventEmitter.created({
 *   userId: '123',
 *   username: 'john',
 *   email: 'john@example.com',
 *   timestamp: new Date(),
 * });
 *
 * // Listen to events
 * const subscription = UserEventListener.onCreated(async (data) => {
 *   console.log('User created:', data.username);
 *   // Send welcome email, create profile, etc.
 * });
 *
 * // Unsubscribe
 * subscription.unsubscribe();
 */
