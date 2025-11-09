/**
 * Health Check API Service
 * Provides centralized health check functionality for the application
 * Following single responsibility principle - handles only API communication
 */

import { fetchWithRetry } from '../utils/fetchWithRetry';
import { API_ENDPOINTS } from '../config/apiConfig';

export interface HealthCheckResponse {
  status: 'success' | 'error';
  data: {
    status: string;
    timestamp?: string;
    uptime?: number;
  };
  timestamp?: string;
}

export interface HealthCheckResult {
  success: boolean;
  status: string;
  timestamp?: string;
  uptime?: number;
  error?: string;
}

/**
 * Fetches health status from the backend API with automatic retry
 * @returns Promise with health check result
 */
export async function fetchHealthStatus(): Promise<HealthCheckResult> {
  try {
    const response = await fetchWithRetry(API_ENDPOINTS.health, {
      retryAttempts: 2, // Fewer retries for health checks
      retryDelay: 500,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: HealthCheckResponse = await response.json();

    return {
      success: true,
      status: apiResponse.data.status,
      timestamp: apiResponse.data.timestamp,
      uptime: apiResponse.data.uptime,
    };
  } catch (error) {
    console.error('Error fetching health:', error);
    return {
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
