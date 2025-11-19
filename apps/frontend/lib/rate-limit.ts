/**
 * Rate limiting utility for API endpoints
 * Uses in-memory storage for simplicity (can be upgraded to Redis for production)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

// In-memory store for rate limit data
const store: RateLimitStore = {};

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Periodically clean up expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  }, CLEANUP_INTERVAL);
}

/**
 * Rate limit a request based on an identifier (e.g., IP address)
 *
 * @param identifier - Unique identifier for the requester (e.g., IP address)
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowSeconds - Time window in seconds
 * @returns Object with success status and remaining count
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ success: boolean; remaining: number; resetTime?: number }> {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  // Clean up expired entry
  if (store[key] && store[key].resetTime < now) {
    delete store[key];
  }

  // Initialize new entry
  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    };

    console.log(`Rate limit: ${identifier} - 1/${limit} requests`);

    return {
      success: true,
      remaining: limit - 1,
      resetTime: store[key].resetTime,
    };
  }

  // Check if limit exceeded
  if (store[key].count >= limit) {
    console.warn(`Rate limit exceeded: ${identifier} - ${store[key].count}/${limit} requests`);

    return {
      success: false,
      remaining: 0,
      resetTime: store[key].resetTime,
    };
  }

  // Increment count
  store[key].count++;

  console.log(`Rate limit: ${identifier} - ${store[key].count}/${limit} requests`);

  return {
    success: true,
    remaining: limit - store[key].count,
    resetTime: store[key].resetTime,
  };
}

/**
 * Reset rate limit for a specific identifier (useful for testing)
 */
export function resetRateLimit(identifier: string): void {
  const key = `ratelimit:${identifier}`;
  delete store[key];
}

/**
 * Get current rate limit status for an identifier
 */
export function getRateLimitStatus(identifier: string): {
  count: number;
  resetTime: number;
} | null {
  const key = `ratelimit:${identifier}`;
  return store[key] || null;
}
