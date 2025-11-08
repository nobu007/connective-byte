# Event System

A robust, type-safe event system for building decoupled, event-driven applications.

## Features

- **Type-Safe Events**: Full TypeScript support with typed event data
- **Event Middleware**: Transform, validate, or block events before delivery
- **Event Filtering**: Filter events based on custom criteria
- **Event Persistence**: Store event history for replay and debugging
- **Event Replay**: Replay past events to new listeners
- **Wildcard Listeners**: Subscribe to multiple events with pattern matching
- **Event Statistics**: Monitor event emission and listener counts
- **Rate Limiting**: Built-in rate limiting middleware
- **Global Event Bus**: Singleton event bus for application-wide communication

## Quick Start

### Basic Usage

```typescript
import { eventBus } from './modules/events';

// Subscribe to an event
const subscription = eventBus.on('user:created', (data) => {
  console.log('User created:', data);
});

// Emit an event
await eventBus.emit('user:created', {
  userId: '123',
  username: 'john',
});

// Unsubscribe
subscription.unsubscribe();
```

### Type-Safe Events

```typescript
// Define event types
interface UserCreatedEvent {
  userId: string;
  username: string;
  email: string;
}

// Subscribe with type safety
eventBus.on<UserCreatedEvent>('user:created', (data) => {
  // data is typed as UserCreatedEvent
  console.log(data.username);
});

// Emit with type safety
await eventBus.emit<UserCreatedEvent>('user:created', {
  userId: '123',
  username: 'john',
  email: 'john@example.com',
});
```

### One-Time Listeners

```typescript
// Subscribe once (auto-unsubscribes after first emission)
eventBus.once('app:ready', () => {
  console.log('App is ready!');
});
```

### Wildcard Listeners

```typescript
// Listen to all user events
eventBus.on('user:*', (data) => {
  console.log('User event:', data);
});

// This will trigger the wildcard listener
await eventBus.emit('user:created', { userId: '123' });
await eventBus.emit('user:updated', { userId: '123' });
await eventBus.emit('user:deleted', { userId: '123' });
```

## Event Middleware

Middleware can transform event data, validate it, or block events entirely.

### Logging Middleware

```typescript
import { createLoggingMiddleware } from './modules/events';

// Log all events
eventBus.use(createLoggingMiddleware('info'));
```

### Validation Middleware

```typescript
import { createValidationMiddleware } from './modules/events';

// Validate event data
eventBus.use(
  createValidationMiddleware((data: any) => {
    return data && typeof data === 'object';
  })
);
```

### Transformation Middleware

```typescript
import { createTransformationMiddleware } from './modules/events';

// Transform event data
eventBus.use(
  createTransformationMiddleware((data: any) => {
    return {
      ...data,
      timestamp: new Date(),
    };
  })
);
```

### Rate Limiting Middleware

```typescript
import { createRateLimitMiddleware } from './modules/events';

// Limit to 10 events per second
eventBus.use(createRateLimitMiddleware(10));
```

### Custom Middleware

```typescript
import { EventMiddleware } from './modules/events';

const customMiddleware: EventMiddleware = async (data, eventName) => {
  // Transform data
  const transformed = { ...data, processed: true };

  // Block event by returning null
  if (shouldBlock(data)) {
    return null;
  }

  // Pass through
  return transformed;
};

eventBus.use(customMiddleware);
```

## Event Filtering

Filters allow you to selectively deliver events to listeners.

```typescript
// Add filter for specific event
eventBus.filter('user:created', (data, metadata) => {
  // Only deliver events from specific source
  return metadata.source === 'UserService';
});

// Add filter with data validation
eventBus.filter<UserCreatedEvent>('user:created', (data) => {
  // Only deliver if user has email
  return !!data.email;
});
```

## Event Persistence and Replay

### Enable Persistence

```typescript
import { EventEmitter } from './modules/events';

const emitter = new EventEmitter(logger, {
  enablePersistence: true,
  persistenceLimit: 100, // Keep last 100 events
  enableReplay: true,
});
```

### Get Event History

```typescript
// Get all past events
const history = eventBus.getHistory('user:created');

// Get last 10 events
const recent = eventBus.getHistory('user:created', 10);
```

### Replay Events

```typescript
// Replay past events to a new listener
await eventBus.replay(
  'user:created',
  (data) => {
    console.log('Replaying:', data);
  },
  10
); // Replay last 10 events
```

## Event Statistics

```typescript
// Get stats for specific event
const stats = eventBus.getStats('user:created');
console.log(stats);
// {
//   eventName: 'user:created',
//   listenerCount: 5,
//   emitCount: 42,
//   lastEmitted: Date
// }

// Get stats for all events
const allStats = eventBus.getStats();
```

## Organized Event Definitions

### Define Event Types

```typescript
// events/UserEvents.ts
export interface UserCreatedEvent {
  userId: string;
  username: string;
  email: string;
}

export const UserEvents = {
  CREATED: 'user:created',
  UPDATED: 'user:updated',
  DELETED: 'user:deleted',
} as const;
```

### Create Event Emitters

```typescript
// events/UserEventEmitter.ts
import { eventBus } from './modules/events';
import { UserEvents, UserCreatedEvent } from './UserEvents';

export class UserEventEmitter {
  static async created(data: UserCreatedEvent): Promise<void> {
    await eventBus.emit(UserEvents.CREATED, data, 'UserService');
  }
}
```

### Create Event Listeners

```typescript
// events/UserEventListener.ts
import { eventBus } from './modules/events';
import { UserEvents, UserCreatedEvent } from './UserEvents';

export class UserEventListener {
  static onCreated(callback: (data: UserCreatedEvent) => void | Promise<void>) {
    return eventBus.on<UserCreatedEvent>(UserEvents.CREATED, callback);
  }
}
```

### Usage

```typescript
// Emit events
await UserEventEmitter.created({
  userId: '123',
  username: 'john',
  email: 'john@example.com',
});

// Listen to events
const subscription = UserEventListener.onCreated(async (data) => {
  console.log('User created:', data.username);
  // Send welcome email, create profile, etc.
});
```

## Integration with Services

```typescript
// services/UserService.ts
import { UserEventEmitter } from '../events/UserEventEmitter';

export class UserService {
  async createUser(userData: CreateUserDto) {
    // Create user in database
    const user = await this.userRepository.create(userData);

    // Emit event
    await UserEventEmitter.created({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    return user;
  }
}
```

```typescript
// listeners/EmailListener.ts
import { UserEventListener } from '../events/UserEventListener';
import { EmailService } from '../services/EmailService';

export class EmailListener {
  constructor(private emailService: EmailService) {
    this.setupListeners();
  }

  private setupListeners() {
    // Send welcome email when user is created
    UserEventListener.onCreated(async (data) => {
      await this.emailService.sendWelcomeEmail(data.email, data.username);
    });
  }
}
```

## Advanced Usage

### Multiple Event Emitters

```typescript
import { EventEmitter } from './modules/events';

// Create separate emitters for different domains
const userEmitter = new EventEmitter(logger);
const orderEmitter = new EventEmitter(logger);

// Use domain-specific emitters
await userEmitter.emit('created', userData);
await orderEmitter.emit('created', orderData);
```

### Event Namespacing

```typescript
// Use namespaces to organize events
const events = {
  user: {
    created: 'user:created',
    updated: 'user:updated',
    deleted: 'user:deleted',
  },
  order: {
    created: 'order:created',
    shipped: 'order:shipped',
    delivered: 'order:delivered',
  },
};

await eventBus.emit(events.user.created, userData);
```

### Async Event Handlers

```typescript
// All event handlers support async operations
eventBus.on('user:created', async (data) => {
  await sendEmail(data.email);
  await createProfile(data.userId);
  await logActivity(data.userId, 'user_created');
});
```

## Testing

```typescript
import { EventEmitter } from './modules/events';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  it('should emit and receive events', async () => {
    const callback = jest.fn();
    emitter.on('test', callback);

    await emitter.emit('test', { data: 'value' });

    expect(callback).toHaveBeenCalledWith({ data: 'value' });
  });

  it('should unsubscribe correctly', async () => {
    const callback = jest.fn();
    const subscription = emitter.on('test', callback);

    subscription.unsubscribe();
    await emitter.emit('test', { data: 'value' });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should support wildcard listeners', async () => {
    const callback = jest.fn();
    emitter.on('user:*', callback);

    await emitter.emit('user:created', { id: 1 });
    await emitter.emit('user:updated', { id: 1 });

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
```

## Best Practices

1. **Use Type-Safe Events**: Always define TypeScript interfaces for event data
2. **Organize Events**: Group related events in separate files
3. **Use Event Emitters**: Create dedicated emitter classes for each domain
4. **Handle Errors**: Always wrap async event handlers in try-catch
5. **Unsubscribe**: Always unsubscribe when listeners are no longer needed
6. **Use Middleware**: Add logging and validation middleware for debugging
7. **Namespace Events**: Use namespaces (e.g., 'user:created') to avoid conflicts
8. **Document Events**: Document what events are emitted and their data structure
9. **Test Events**: Write tests for event emission and handling
10. **Monitor Stats**: Use event statistics to monitor system behavior

## Performance Considerations

- Event handlers run in parallel (Promise.all)
- Middleware runs sequentially
- Event history is limited by `persistenceLimit` config
- Use rate limiting middleware to prevent event flooding
- Wildcard listeners have slight performance overhead
- Consider using separate emitters for high-frequency events

## Common Patterns

### Request-Response Pattern

```typescript
// Emit request
await eventBus.emit('user:fetch:request', { userId: '123' });

// Listen for response
eventBus.once('user:fetch:response', (data) => {
  console.log('User data:', data);
});
```

### Saga Pattern

```typescript
// Orchestrate multiple operations
UserEventListener.onCreated(async (data) => {
  await ProfileEventEmitter.create({ userId: data.userId });
  await EmailEventEmitter.sendWelcome({ email: data.email });
  await AnalyticsEventEmitter.track({ event: 'user_created' });
});
```

### Event Sourcing

```typescript
// Store all events for replay
const emitter = new EventEmitter(logger, {
  enablePersistence: true,
  persistenceLimit: 10000,
  enableReplay: true,
});

// Rebuild state from events
const history = emitter.getHistory('user:*');
const currentState = history.reduce((state, event) => {
  return applyEvent(state, event);
}, initialState);
```
