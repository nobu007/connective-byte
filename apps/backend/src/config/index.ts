/**
 * Configuration Management
 * Centralized configuration for the backend application
 * Following single responsibility principle - manages only configuration
 */

export interface AppConfig {
  port: number;
  environment: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

/**
 * Get application configuration from environment variables
 * @returns Application configuration object
 */
export function getConfig(): AppConfig {
  const environment = process.env.NODE_ENV || 'development';

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    environment,
    isProduction: environment === 'production',
    isDevelopment: environment === 'development',
    isTest: environment === 'test',
  };
}

export const config = getConfig();
