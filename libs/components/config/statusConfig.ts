/**
 * Status Configuration
 * Centralized styling configuration for status indicators
 * Defines Tailwind CSS classes for different status states
 */

export const STATUS_CONFIG = {
  loading: { bg: 'bg-yellow-200', text: 'text-yellow-900' },
  success: { bg: 'bg-green-200', text: 'text-green-900' },
  error: { bg: 'bg-red-200', text: 'text-red-900' },
} as const;

export type StatusType = keyof typeof STATUS_CONFIG;

/**
 * Get status configuration for a given status
 * @param status - Status type ('loading' | 'success' | 'error')
 * @returns Configuration object with bg and text classes, defaults to error styling if status is invalid
 */
export function getStatusConfig(status: StatusType | string) {
  return STATUS_CONFIG[status as StatusType] || STATUS_CONFIG.error;
}
