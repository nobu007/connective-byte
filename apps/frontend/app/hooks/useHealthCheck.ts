/**
 * useHealthCheck Hook
 * Enhanced reusable hook for health check functionality with retry logic
 * Separates state management from API logic
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchHealthStatus } from '@libs/logic';

export type HealthStatus = 'loading' | 'success' | 'error' | 'degraded';
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface HealthCheckHistory {
  timestamp: Date;
  status: HealthStatus;
  responseTime?: number;
}

export interface UseHealthCheckOptions {
  /** Enable automatic retry on failure */
  enableRetry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial retry delay in milliseconds */
  initialRetryDelay?: number;
  /** Enable automatic polling */
  enablePolling?: boolean;
  /** Polling interval in milliseconds */
  pollingInterval?: number;
  /** Maximum history entries to keep */
  maxHistorySize?: number;
}

export interface UseHealthCheckReturn {
  status: HealthStatus;
  message: string;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isDegraded: boolean;
  connectionStatus: ConnectionStatus;
  retryCount: number;
  history: HealthCheckHistory[];
  successRate: number;
  averageResponseTime: number;
  refresh: () => Promise<void>;
}

const DEFAULT_OPTIONS: Required<UseHealthCheckOptions> = {
  enableRetry: true,
  maxRetries: 3,
  initialRetryDelay: 1000,
  enablePolling: false,
  pollingInterval: 30000,
  maxHistorySize: 20,
};

/**
 * Enhanced custom hook for health check with retry logic and history tracking
 * @param options - Configuration options
 * @returns Health check state and status helpers
 */
export function useHealthCheck(options: UseHealthCheckOptions = {}): UseHealthCheckReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [status, setStatus] = useState<HealthStatus>('loading');
  const [message, setMessage] = useState('Connecting to backend...');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [retryCount, setRetryCount] = useState(0);
  const [history, setHistory] = useState<HealthCheckHistory[]>([]);

  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pollingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMountedRef = useRef(true);

  /**
   * Calculate exponential backoff delay
   */
  const getRetryDelay = useCallback(
    (attempt: number): number => {
      return opts.initialRetryDelay * Math.pow(2, attempt);
    },
    [opts.initialRetryDelay],
  );

  /**
   * Add entry to history
   */
  const addToHistory = useCallback(
    (newStatus: HealthStatus, responseTime?: number) => {
      setHistory((prev) => {
        const newEntry: HealthCheckHistory = {
          timestamp: new Date(),
          status: newStatus,
          responseTime,
        };
        const updated = [newEntry, ...prev];
        return updated.slice(0, opts.maxHistorySize);
      });
    },
    [opts.maxHistorySize],
  );

  /**
   * Calculate success rate from history
   */
  const successRate = useCallback(() => {
    if (history.length === 0) return 100;
    const successCount = history.filter((h) => h.status === 'success' || h.status === 'degraded').length;
    return Math.round((successCount / history.length) * 100);
  }, [history]);

  /**
   * Calculate average response time from history
   */
  const averageResponseTime = useCallback(() => {
    const timings = history.filter((h) => h.responseTime !== undefined);
    if (timings.length === 0) return 0;
    const sum = timings.reduce((acc, h) => acc + (h.responseTime || 0), 0);
    return Math.round(sum / timings.length);
  }, [history]);

  /**
   * Perform health check
   */
  const checkHealth = useCallback(
    async (isRetry: boolean = false): Promise<void> => {
      if (!isMountedRef.current) return;

      if (isRetry) {
        setConnectionStatus('reconnecting');
      } else {
        setStatus('loading');
        setConnectionStatus('disconnected');
      }

      const startTime = Date.now();

      try {
        console.log(`--- FETCHING API STATUS ${isRetry ? `(Retry ${retryCount + 1})` : ''} ---`);
        const result = await fetchHealthStatus();
        const responseTime = Date.now() - startTime;

        if (!isMountedRef.current) return;

        if (result.success) {
          const newStatus: HealthStatus = result.status === 'degraded' ? 'degraded' : 'success';
          setStatus(newStatus);
          setMessage(`Backend status: ${result.status}`);
          setConnectionStatus('connected');
          setRetryCount(0);
          addToHistory(newStatus, responseTime);
        } else {
          throw new Error('Health check failed');
        }
      } catch (error) {
        if (!isMountedRef.current) return;

        const responseTime = Date.now() - startTime;
        addToHistory('error', responseTime);

        // Retry logic
        if (opts.enableRetry && retryCount < opts.maxRetries) {
          const delay = getRetryDelay(retryCount);
          setRetryCount((prev) => prev + 1);
          setStatus('error');
          setMessage(`Connection failed. Retrying in ${Math.round(delay / 1000)}s...`);
          setConnectionStatus('reconnecting');

          retryTimeoutRef.current = setTimeout(() => {
            checkHealth(true);
          }, delay);
        } else {
          setStatus('error');
          setMessage('Failed to connect to the backend.');
          setConnectionStatus('disconnected');
          setRetryCount(0);
        }
      }
    },
    [retryCount, opts.enableRetry, opts.maxRetries, getRetryDelay, addToHistory],
  );

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    setRetryCount(0);
    await checkHealth(false);
  }, [checkHealth]);

  // Initial health check on mount
  useEffect(() => {
    isMountedRef.current = true;
    checkHealth();

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Polling effect
  useEffect(() => {
    if (opts.enablePolling && connectionStatus === 'connected') {
      pollingIntervalRef.current = setInterval(() => {
        checkHealth();
      }, opts.pollingInterval);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enablePolling, opts.pollingInterval, connectionStatus]);

  return {
    status,
    message,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    isDegraded: status === 'degraded',
    connectionStatus,
    retryCount,
    history,
    successRate: successRate(),
    averageResponseTime: averageResponseTime(),
    refresh,
  };
}
