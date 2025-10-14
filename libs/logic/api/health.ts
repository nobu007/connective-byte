/**
 * Health Check API Service
 * Provides centralized health check functionality for the application
 * Following single responsibility principle - handles only API communication
 */

export interface HealthCheckResponse {
  status: string;
}

export interface HealthCheckResult {
  success: boolean;
  status: string;
  error?: string;
}

/**
 * Fetches health status from the backend API
 * @returns Promise with health check result
 */
export async function fetchHealthStatus(): Promise<HealthCheckResult> {
  try {
    const response = await fetch('/api/health');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: HealthCheckResponse = await response.json();

    return {
      success: true,
      status: data.status,
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
