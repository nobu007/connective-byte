/**
 * Components Library Index
 * Centralized exports for shared components
 * Makes imports cleaner: import { StatusIndicator } from '@libs/components'
 */

export { default as StatusIndicator } from './StatusIndicator';
export type { StatusIndicatorProps, StatusType } from './StatusIndicator';

// Status configuration
export { STATUS_CONFIG, getStatusConfig } from './config/statusConfig';
export type { StatusType as StatusConfigType } from './config/statusConfig';
