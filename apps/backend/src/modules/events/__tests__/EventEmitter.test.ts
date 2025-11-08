/**
 * EventEmitter Unit Tests
 * Comprehensive test coverage for event system
 */

import { EventEmitter } from '../EventEmitter';
import { EventListener, EventMiddleware, EventFilter } from '../../../common/types/events';
import { Logger } from '../../../common/types';

describe('EventEmitter', () => {
  let emitter: EventEmitter;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    emitter = new EventEmitter(mockLogger);
  });

  describe('on', () => {
    test('should subscribe to event', async () => {
      const listener = jest.fn();

      emitter.on('test-event', listener);
      await emitter.emit('test-event', { message: 'hello' });

      expect(listener).toHaveBeenCalledWith({ message: 'hello' });
    });

    test('should return subscription object', () => {
      const listener = jest.fn();
      const subscription = emitter.on('test-event', listener);

      expect(subscription).toHaveProperty('unsubscribe');
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    test('should support multiple listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on('test-event', listener1);
      emitter.on('test-event', listener2);

      await emitter.emit('test-event', 'data');

      expect(listener1).toHaveBeenCalledWith('data');
      expect(listener2).toHaveBeenCalledWith('data');
    });

    test('should warn when max listeners reached', () => {
      emitter = new EventEmitter(mockLogger, { maxListeners: 2 });

      emitter.on('test-event', jest.fn());
      emitter.on('test-event', jest.fn());
      emitter.on('test-event', jest.fn()); // Third listener

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Max listeners'));
    });
  });

  describe('once', () => {
    test('should subscribe to event once', async () => {
      const listener = jest.fn();

      emitter.once('test-event', listener);

      await emitter.emit('test-event', 'first');
      await emitter.emit('test-event', 'second');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('first');
    });

    test('should auto-unsubscribe after first emission', async () => {
      const listener = jest.fn();

      emitter.once('test-event', listener);
      await emitter.emit('test-event', 'data');

      expect(emitter.listenerCount('test-event')).toBe(0);
    });
  });

  describe('off', () => {
    test('should unsubscribe from event', async () => {
      const listener = jest.fn();

      emitter.on('test-event', listener);
      emitter.off('test-event', listener);

      await emitter.emit('test-event', 'data');

      expect(listener).not.toHaveBeenCalled();
    });

    test('should not affect other listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on('test-event', listener1);
      emitter.on('test-event', listener2);

      emitter.off('test-event', listener1);
      await emitter.emit('test-event', 'data');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith('data');
    });

    test('should handle unsubscribing non-existent listener', () => {
      const listener = jest.fn();

      expect(() => {
        emitter.off('test-event', listener);
      }).not.toThrow();
    });
  });

  describe('emit', () => {
    test('should emit event to all listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on('test-event', listener1);
      emitter.on('test-event', listener2);

      await emitter.emit('test-event', { value: 42 });

      expect(listener1).toHaveBeenCalledWith({ value: 42 });
      expect(listener2).toHaveBeenCalledWith({ value: 42 });
    });

    test('should handle async listeners', async () => {
      const results: number[] = [];

      const listener1: EventListener<number> = async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(data * 2);
      };

      const listener2: EventListener<number> = async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push(data * 3);
      };

      emitter.on('test-event', listener1);
      emitter.on('test-event', listener2);

      await emitter.emit('test-event', 5);

      expect(results).toContain(10);
      expect(results).toContain(15);
    });

    test('should handle listener errors gracefully', async () => {
      const errorListener: EventListener = async () => {
        throw new Error('Listener error');
      };

      const successListener = jest.fn();

      emitter.on('test-event', errorListener);
      emitter.on('test-event', successListener);

      await emitter.emit('test-event', 'data');

      expect(successListener).toHaveBeenCalledWith('data');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should include source in metadata', async () => {
      const listener = jest.fn();

      emitter.on('test-event', listener);
      await emitter.emit('test-event', 'data', 'test-source');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Event emitted'),
        expect.objectContaining({ source: 'test-source' })
      );
    });
  });

  describe('middleware', () => {
    test('should apply middleware to event data', async () => {
      const middleware: EventMiddleware = async (data) => (data as number) * 2;
      const listener = jest.fn();

      emitter.use(middleware);
      emitter.on('test-event', listener);

      await emitter.emit('test-event', 5);

      expect(listener).toHaveBeenCalledWith(10);
    });

    test('should apply multiple middlewares in order', async () => {
      const middleware1: EventMiddleware = async (data) => (data as number) + 1;
      const middleware2: EventMiddleware = async (data) => (data as number) * 2;
      const listener = jest.fn();

      emitter.use(middleware1);
      emitter.use(middleware2);
      emitter.on('test-event', listener);

      await emitter.emit('test-event', 5);

      expect(listener).toHaveBeenCalledWith(12); // (5 + 1) * 2
    });

    test('should block event when middleware returns null', async () => {
      const middleware: EventMiddleware = async () => null;
      const listener = jest.fn();

      emitter.use(middleware);
      emitter.on('test-event', listener);

      await emitter.emit('test-event', 'data');

      expect(listener).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('blocked by middleware')
      );
    });
  });

  describe('filters', () => {
    test('should filter events based on data', async () => {
      const filter: EventFilter<number> = (data) => data > 10;
      const listener = jest.fn();

      emitter.filter('test-event', filter);
      emitter.on('test-event', listener);

      await emitter.emit('test-event', 5);
      await emitter.emit('test-event', 15);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(15);
    });

    test('should apply multiple filters', async () => {
      const filter1: EventFilter<number> = (data) => data > 5;
      const filter2: EventFilter<number> = (data) => data < 15;
      const listener = jest.fn();

      emitter.filter('test-event', filter1);
      emitter.filter('test-event', filter2);
      emitter.on('test-event', listener);

      await emitter.emit('test-event', 3);
      await emitter.emit('test-event', 10);
      await emitter.emit('test-event', 20);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(10);
    });

    test('should filter based on metadata', async () => {
      const filter: EventFilter = (data, metadata) => {
        return metadata.source === 'allowed-source';
      };
      const listener = jest.fn();

      emitter.filter('test-event', filter);
      emitter.on('test-event', listener);

      await emitter.emit('test-event', 'data', 'blocked-source');
      await emitter.emit('test-event', 'data', 'allowed-source');

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('wildcard listeners', () => {
    test('should match wildcard patterns', async () => {
      const listener = jest.fn();

      emitter.on('user.*', listener);

      await emitter.emit('user.created', { id: 1 });
      await emitter.emit('user.updated', { id: 2 });
      await emitter.emit('post.created', { id: 3 });

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith({ id: 1 });
      expect(listener).toHaveBeenCalledWith({ id: 2 });
    });

    test('should support multiple wildcard patterns', async () => {
      const listener = jest.fn();

      emitter.on('*.created', listener);

      await emitter.emit('user.created', 'user');
      await emitter.emit('post.created', 'post');
      await emitter.emit('user.updated', 'update');

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('persistence', () => {
    test('should persist events when enabled', async () => {
      emitter = new EventEmitter(mockLogger, { enablePersistence: true });

      await emitter.emit('test-event', 'data1');
      await emitter.emit('test-event', 'data2');

      const history = emitter.getHistory('test-event');

      expect(history).toHaveLength(2);
      expect(history[0].data).toBe('data1');
      expect(history[1].data).toBe('data2');
    });

    test('should not persist events when disabled', async () => {
      emitter = new EventEmitter(mockLogger, { enablePersistence: false });

      await emitter.emit('test-event', 'data');

      const history = emitter.getHistory('test-event');
      expect(history).toHaveLength(0);
    });

    test('should limit history size', async () => {
      emitter = new EventEmitter(mockLogger, {
        enablePersistence: true,
        persistenceLimit: 3,
      });

      for (let i = 0; i < 5; i++) {
        await emitter.emit('test-event', i);
      }

      const history = emitter.getHistory('test-event');
      expect(history).toHaveLength(3);
      expect(history[0].data).toBe(2); // Oldest kept
      expect(history[2].data).toBe(4); // Newest
    });
  });

  describe('replay', () => {
    test('should replay past events', async () => {
      emitter = new EventEmitter(mockLogger, {
        enablePersistence: true,
        enableReplay: true,
      });

      await emitter.emit('test-event', 'data1');
      await emitter.emit('test-event', 'data2');

      const listener = jest.fn();
      await emitter.replay('test-event', listener);

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, 'data1');
      expect(listener).toHaveBeenNthCalledWith(2, 'data2');
    });

    test('should limit replay count', async () => {
      emitter = new EventEmitter(mockLogger, {
        enablePersistence: true,
        enableReplay: true,
      });

      await emitter.emit('test-event', 'data1');
      await emitter.emit('test-event', 'data2');
      await emitter.emit('test-event', 'data3');

      const listener = jest.fn();
      await emitter.replay('test-event', listener, 2);

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, 'data2');
      expect(listener).toHaveBeenNthCalledWith(2, 'data3');
    });

    test('should warn when replay is disabled', async () => {
      emitter = new EventEmitter(mockLogger, { enableReplay: false });

      const listener = jest.fn();
      await emitter.replay('test-event', listener);

      expect(listener).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('replay is disabled'));
    });
  });

  describe('statistics', () => {
    test('should track event statistics', async () => {
      const listener = jest.fn();

      emitter.on('test-event', listener);
      await emitter.emit('test-event', 'data1');
      await emitter.emit('test-event', 'data2');

      const stats = emitter.getStats('test-event') as any;

      expect(stats).toMatchObject({
        eventName: 'test-event',
        listenerCount: 1,
        emitCount: 2,
      });
      expect(stats.lastEmitted).toBeDefined();
    });

    test('should return all statistics', async () => {
      emitter.on('event1', jest.fn());
      emitter.on('event2', jest.fn());

      await emitter.emit('event1', 'data');
      await emitter.emit('event2', 'data');

      const allStats = emitter.getStats();

      expect(Array.isArray(allStats)).toBe(true);
      expect(allStats).toHaveLength(2);
    });

    test('should update listener count', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on('test-event', listener1);
      emitter.on('test-event', listener2);

      let stats = emitter.getStats('test-event') as any;
      expect(stats.listenerCount).toBe(2);

      emitter.off('test-event', listener1);

      stats = emitter.getStats('test-event') as any;
      expect(stats.listenerCount).toBe(1);
    });
  });

  describe('clear', () => {
    test('should clear listeners for specific event', async () => {
      const listener = jest.fn();

      emitter.on('test-event', listener);
      emitter.clear('test-event');

      await emitter.emit('test-event', 'data');

      expect(listener).not.toHaveBeenCalled();
    });

    test('should clear all listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on('event1', listener1);
      emitter.on('event2', listener2);

      emitter.clear();

      await emitter.emit('event1', 'data');
      await emitter.emit('event2', 'data');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    test('should clear event history', async () => {
      emitter = new EventEmitter(mockLogger, { enablePersistence: true });

      await emitter.emit('test-event', 'data');
      emitter.clear('test-event');

      const history = emitter.getHistory('test-event');
      expect(history).toHaveLength(0);
    });
  });

  describe('listenerCount', () => {
    test('should return listener count', () => {
      emitter.on('test-event', jest.fn());
      emitter.on('test-event', jest.fn());

      expect(emitter.listenerCount('test-event')).toBe(2);
    });

    test('should return 0 for non-existent event', () => {
      expect(emitter.listenerCount('non-existent')).toBe(0);
    });
  });

  describe('eventNames', () => {
    test('should return all event names', () => {
      emitter.on('event1', jest.fn());
      emitter.on('event2', jest.fn());
      emitter.on('event3', jest.fn());

      const names = emitter.eventNames();

      expect(names).toContain('event1');
      expect(names).toContain('event2');
      expect(names).toContain('event3');
      expect(names).toHaveLength(3);
    });

    test('should return empty array when no events', () => {
      const names = emitter.eventNames();
      expect(names).toEqual([]);
    });
  });

  describe('subscription unsubscribe', () => {
    test('should unsubscribe via subscription object', async () => {
      const listener = jest.fn();

      const subscription = emitter.on('test-event', listener);
      subscription.unsubscribe();

      await emitter.emit('test-event', 'data');

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
