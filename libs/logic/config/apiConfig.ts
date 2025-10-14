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
 * Validate and get API base URL
 * Falls back to localhost if env var is missing or invalid
 * @returns Validated API base URL
 */
function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const defaultUrl = 'http://localhost:3001';

  if (!envUrl) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('NEXT_PUBLIC_API_URL not set, using default:', defaultUrl);
    }
    return defaultUrl;
  }

  try {
    // Validate URL format
    const url = new URL(envUrl);
    return url.origin; // Return normalized URL without trailing slash
  } catch (error) {
    console.error('Invalid NEXT_PUBLIC_API_URL:', envUrl);
    console.error('Falling back to default:', defaultUrl);
    return defaultUrl;
  }
}

/**
 * Get API configuration with validated environment variables
 * @returns Complete API configuration object
 */
export function getApiConfig(): ApiConfig {
  return {
    baseUrl: getApiBaseUrl(),
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
