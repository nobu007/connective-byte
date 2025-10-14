/**
 * Common Type Definitions
 * Shared types and interfaces across the application
 * Following DRY principle - define once, use everywhere
 */

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: ValidationError[];
  timestamp?: string;
}

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Service result wrapper
 * Encapsulates service operation results with metadata
 */
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Health status interface
 */
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  checks?: HealthCheck[];
}

/**
 * Individual health check result
 */
export interface HealthCheck {
  name: string;
  status: 'ok' | 'error';
  message?: string;
  responseTime?: number;
}

/**
 * Configuration interface
 */
export interface Config {
  port: number;
  environment: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

/**
 * Logger interface for dependency injection
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry structure
 * Internal representation of a log entry before formatting
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Log formatter interface
 * Transforms log entries into formatted strings
 */
export interface LogFormatter {
  format(entry: LogEntry): string;
}

/**
 * Log transport interface
 * Handles output of formatted logs to destinations
 */
export interface LogTransport {
  log(formatted: string, level: LogLevel): void;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: LogLevel;
  format: 'json' | 'pretty';
  transports: string[];
}
