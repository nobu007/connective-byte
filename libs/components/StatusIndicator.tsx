/**
 * Status Indicator Component
 * Reusable status display component with color coding
 * Following single responsibility - displays status with visual feedback
 */

'use client';

export type StatusType = 'loading' | 'success' | 'error' | 'warning' | 'info';

export interface StatusIndicatorProps {
  status: StatusType;
  message?: string;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<StatusType, { bgColor: string; textColor: string; label: string }> = {
  loading: {
    bgColor: 'bg-yellow-200',
    textColor: 'text-yellow-900',
    label: 'LOADING',
  },
  success: {
    bgColor: 'bg-green-200',
    textColor: 'text-green-900',
    label: 'SUCCESS',
  },
  error: {
    bgColor: 'bg-red-200',
    textColor: 'text-red-900',
    label: 'ERROR',
  },
  warning: {
    bgColor: 'bg-orange-200',
    textColor: 'text-orange-900',
    label: 'WARNING',
  },
  info: {
    bgColor: 'bg-blue-200',
    textColor: 'text-blue-900',
    label: 'INFO',
  },
};

/**
 * StatusIndicator Component
 * Displays a status with color-coded background and optional message
 *
 * @param status - The status type to display
 * @param message - Optional custom message to display
 * @param className - Optional additional CSS classes
 * @param showLabel - Whether to show the status label (default: true)
 */
export default function StatusIndicator({
  status,
  message,
  className = '',
  showLabel = true,
}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div
      className={`p-4 rounded-lg ${config.bgColor} ${config.textColor} ${className}`}
      data-testid='status-indicator'
      role='status'
      aria-live='polite'
    >
      {showLabel && <p className='font-semibold'>Current Status: {config.label}</p>}
      {message && <p className='mt-1'>{message}</p>}
    </div>
  );
}
