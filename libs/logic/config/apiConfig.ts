/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 * Following single responsibility - manages API configuration
 */

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Get API configuration
 * Can be extended to read from environment variables
 */
export function getApiConfig(): ApiConfig {
  return {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
    timeout: 5000, // 5 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  };
}

export const apiConfig = getApiConfig();

/**
 * API Endpoints
 * Centralized endpoint definitions
 */
export const API_ENDPOINTS = {
  health: '/api/health',
  // Add more endpoints here as the application grows
} as const;
