/**
 * ConnectionStatus Component
 * Real-time connection status indicator with automatic updates
 */

'use client';

import { useHealthCheck, ConnectionStatus as Status } from '../hooks/useHealthCheck';
import { StatusIndicator } from './StatusIndicator';

export interface ConnectionStatusProps {
  /** Show detailed information */
  detailed?: boolean;
  /** Enable automatic polling */
  enablePolling?: boolean;
  /** Polling interval in milliseconds */
  pollingInterval?: number;
  /** Compact mode */
  compact?: boolean;
}

export function ConnectionStatus({
  detailed = false,
  enablePolling = true,
  pollingInterval = 10000,
  compact = false,
}: ConnectionStatusProps) {
  const { status, connectionStatus, retryCount, successRate, refresh } = useHealthCheck({
    enableRetry: true,
    maxRetries: 3,
    enablePolling,
    pollingInterval,
  });

  const getConnectionMessage = (connStatus: Status): string => {
    switch (connStatus) {
      case 'connected':
        return 'Connected to backend';
      case 'reconnecting':
        return `Reconnecting... (attempt ${retryCount + 1})`;
      case 'disconnected':
        return 'Disconnected from backend';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StatusIndicator status={status} size="sm" animate />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {connectionStatus === 'connected' ? 'Online' : 'Offline'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIndicator status={status} size="md" animate />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {getConnectionMessage(connectionStatus)}
            </div>
            {detailed && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Success rate: {successRate}%</div>
            )}
          </div>
        </div>

        {connectionStatus === 'disconnected' && (
          <button
            onClick={refresh}
            className="text-sm px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors duration-200"
          >
            Retry
          </button>
        )}
      </div>

      {/* Reconnecting Progress */}
      {connectionStatus === 'reconnecting' && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div className="bg-blue-500 h-1 rounded-full animate-pulse w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
