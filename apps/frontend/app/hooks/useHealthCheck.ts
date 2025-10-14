/**
 * useHealthCheck Hook
 * Reusable hook for health check functionality
 * Separates state management from API logic
 */

'use client';

import { useState, useEffect } from 'react';
import { fetchHealthStatus } from '../../../../libs/logic/api/health';

export type HealthStatus = 'loading' | 'success' | 'error';

export interface UseHealthCheckReturn {
  status: HealthStatus;
  message: string;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Custom hook for health check with automatic fetching on mount
 * @returns Health check state and status helpers
 */
export function useHealthCheck(): UseHealthCheckReturn {
  const [status, setStatus] = useState<HealthStatus>('loading');
  const [message, setMessage] = useState('Connecting to backend...');

  useEffect(() => {
    const checkHealth = async () => {
      console.log('--- FETCHING API STATUS ---');
      const result = await fetchHealthStatus();

      if (result.success) {
        setStatus('success');
        setMessage(`Backend status: ${result.status}`);
      } else {
        setStatus('error');
        setMessage('Failed to connect to the backend.');
      }
    };

    checkHealth();
  }, []);

  return {
    status,
    message,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}
