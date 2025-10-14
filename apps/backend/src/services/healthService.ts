/**
 * Health Service
 * Business logic for health check functionality
 * Following clean architecture - service layer handles business logic
 */

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
}

/**
 * Get current health status of the application
 * @returns Health status information
 */
export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

/**
 * Check if the application is healthy
 * Can be extended with database checks, external service checks, etc.
 * @returns Boolean indicating if the application is healthy
 */
export function isHealthy(): boolean {
  // Add more sophisticated health checks here
  // For example: database connectivity, external API availability, etc.
  return true;
}
