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

// 期限切れエントリの掃除間隔（5分）
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanupAt = 0;

/**
 * 期限切れエントリの一括掃除。
 * モジュール読み込み時の setInterval は Cloudflare Workers で
 * 「global scope での禁止操作」エラーになるため、rateLimit() 呼び出し時に
 * 遅延実行する（Node環境でも unref 済み timer と実質同等）。
 */
function cleanupExpired(now: number): void {
  if (now - lastCleanupAt < CLEANUP_INTERVAL) return;
  lastCleanupAt = now;
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
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
