/**
 * StatusIndicator Component
 * Visual status indicator with loading animations and transitions
 */

'use client';

import { HealthStatus } from '../hooks/useHealthCheck';

export interface StatusIndicatorProps {
  status: HealthStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-6 h-6',
};

const statusConfig = {
  loading: {
    color: 'bg-gray-400',
    label: 'Loading',
    pulseColor: 'bg-gray-300',
  },
  success: {
    color: 'bg-green-500',
    label: 'Healthy',
    pulseColor: 'bg-green-400',
  },
  degraded: {
    color: 'bg-yellow-500',
    label: 'Degraded',
    pulseColor: 'bg-yellow-400',
  },
  error: {
    color: 'bg-red-500',
    label: 'Error',
    pulseColor: 'bg-red-400',
  },
};

export function StatusIndicator({ status, size = 'md', showLabel = false, animate = true }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizeClass = sizeClasses[size];

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        {/* Main indicator */}
        <div className={`${sizeClass} ${config.color} rounded-full transition-colors duration-300`} />

        {/* Pulse animation */}
        {animate && (status === 'loading' || status === 'success') && (
          <div className={`absolute inset-0 ${sizeClass} ${config.pulseColor} rounded-full animate-ping opacity-75`} />
        )}
      </div>

      {/* Label */}
      {showLabel && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{config.label}</span>}
    </div>
  );
}
