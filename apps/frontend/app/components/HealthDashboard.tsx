/**
 * HealthDashboard Component
 * Comprehensive health monitoring dashboard with detailed system information
 */

'use client';

import { useHealthCheck } from '../hooks/useHealthCheck';
import { StatusIndicator } from './StatusIndicator';

export interface HealthDashboardProps {
  enablePolling?: boolean;
  pollingInterval?: number;
}

export function HealthDashboard({ enablePolling = false, pollingInterval = 30000 }: HealthDashboardProps) {
  const { status, message, connectionStatus, retryCount, history, successRate, averageResponseTime, refresh } =
    useHealthCheck({
      enableRetry: true,
      maxRetries: 3,
      enablePolling,
      pollingInterval,
    });

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusIndicator status={status} size="lg" animate />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">System Health</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={status === 'loading'}
          >
            Refresh
          </button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Connection:</span>
          <span
            className={`font-medium ${
              connectionStatus === 'connected'
                ? 'text-green-600'
                : connectionStatus === 'reconnecting'
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </span>
          {retryCount > 0 && <span className="text-gray-500">({retryCount} retries)</span>}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Success Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Success Rate</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{successRate}%</div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>

        {/* Average Response Time */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Response Time</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {averageResponseTime}
            <span className="text-lg text-gray-500">ms</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Based on {history.length} checks</div>
        </div>

        {/* Total Checks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Checks</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{history.length}</div>
          <div className="text-xs text-gray-500 mt-1">{history.filter((h) => h.status === 'error').length} failed</div>
        </div>
      </div>

      {/* History Timeline */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent History</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.slice(0, 10).map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div className="flex items-center gap-3">
                  <StatusIndicator status={entry.status} size="sm" animate={false} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{formatTimestamp(entry.timestamp)}</span>
                </div>
                {entry.responseTime && <span className="text-sm text-gray-500">{entry.responseTime}ms</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
