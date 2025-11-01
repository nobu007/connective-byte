/**
 * Fetch with Retry Utility
 * Provides robust fetch functionality with automatic retries
 * Following single responsibility - handles HTTP requests with retry logic
 */

import { apiConfig } from '../config/apiConfig';

export interface FetchOptions extends RequestInit {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch with automatic retry on failure
 * @param url - The URL to fetch
 * @param options - Fetch options including retry configuration
 * @returns Response object
 */
export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const {
    retryAttempts = apiConfig.retryAttempts,
    retryDelay = apiConfig.retryDelay,
    timeout = apiConfig.timeout,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, timeout);

      // Only retry on server errors (5xx) or network errors
      if (response.ok || response.status < 500) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }

    // Don't sleep after the last attempt
    if (attempt < retryAttempts) {
      await sleep(retryDelay * (attempt + 1)); // Exponential backoff
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}
