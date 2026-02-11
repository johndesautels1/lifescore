/**
 * LIFE SCORE - Shared Rate Limiting
 * In-memory rate limiter for API endpoint protection
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 */

import type { VercelResponse } from '@vercel/node';

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window per IP
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

// ============================================================================
// PRESETS - Different limits for different endpoint types
// ============================================================================

export const RATE_LIMIT_PRESETS = {
  // Heavy LLM endpoints (evaluate, judge) - expensive operations
  heavy: {
    windowMs: 60000,     // 1 minute
    maxRequests: 10,     // 10 requests per minute
  },

  // Standard endpoints (chat, tts, avatar, context)
  standard: {
    windowMs: 60000,     // 1 minute
    maxRequests: 30,     // 30 requests per minute
  },

  // Light endpoints (gamma, test-llm)
  light: {
    windowMs: 60000,     // 1 minute
    maxRequests: 20,     // 20 requests per minute
  },

  // Health checks - very lenient
  health: {
    windowMs: 60000,     // 1 minute
    maxRequests: 120,    // 120 requests per minute (2/sec)
  },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

/**
 * Simple in-memory rate limiter
 * Note: Resets on cold start, but that's OK for burst protection
 * For production, consider using Vercel KV or Upstash Redis
 */
class RateLimiter {
  private stores: Map<string, Map<string, { count: number; resetTime: number }>> = new Map();
  private readonly MAX_ENTRIES = 10000; // Max entries per store before cleanup

  /**
   * Check if a request is allowed under rate limits
   */
  check(ip: string, endpoint: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const key = ip || 'unknown';

    // Get or create store for this endpoint
    if (!this.stores.has(endpoint)) {
      this.stores.set(endpoint, new Map());
    }
    const store = this.stores.get(endpoint)!;

    // Cleanup if store is too large
    if (store.size > this.MAX_ENTRIES) {
      // First pass: remove expired entries
      for (const [k, v] of store.entries()) {
        if (v.resetTime < now) store.delete(k);
      }
      // FIX: If still over limit after removing expired, evict oldest 20%
      // Under continuous traffic from many IPs, active entries accumulate
      if (store.size > this.MAX_ENTRIES) {
        const entries = [...store.entries()]
          .sort((a, b) => a[1].resetTime - b[1].resetTime);
        const toRemove = entries.slice(0, Math.floor(entries.length * 0.2));
        for (const [k] of toRemove) {
          store.delete(k);
        }
      }
    }

    const record = store.get(key);

    // New window or expired window
    if (!record || record.resetTime < now) {
      store.set(key, { count: 1, resetTime: now + config.windowMs });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetIn: config.windowMs,
      };
    }

    // Check if over limit
    if (record.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: record.resetTime - now,
      };
    }

    // Increment and allow
    record.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetIn: record.resetTime - now,
    };
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { endpoints: number; totalEntries: number } {
    let totalEntries = 0;
    for (const store of this.stores.values()) {
      totalEntries += store.size;
    }
    return {
      endpoints: this.stores.size,
      totalEntries,
    };
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract client IP from Vercel request headers
 */
export function getClientIP(headers: Headers | { [key: string]: string | string[] | undefined }): string {
  // Handle both Headers object and plain object
  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    const value = headers[name];
    if (Array.isArray(value)) return value[0] || null;
    return value || null;
  };

  // Try various headers in order of preference
  return (
    getHeader('x-real-ip') ||
    getHeader('x-forwarded-for')?.split(',')[0]?.trim() ||
    getHeader('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Check rate limit and return 429 response if exceeded
 * Returns true if request should proceed, false if rate limited
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  preset: RateLimitPreset | RateLimitConfig,
  res: VercelResponse
): boolean {
  const config = typeof preset === 'string' ? RATE_LIMIT_PRESETS[preset] : preset;
  const result = rateLimiter.check(ip, endpoint, config);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetIn / 1000));

  if (!result.allowed) {
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)} seconds.`,
      retryAfter: Math.ceil(result.resetIn / 1000),
    });
    return false;
  }

  return true;
}

/**
 * Quick helper that combines IP extraction and rate limit check
 */
export function applyRateLimit(
  headers: Headers | { [key: string]: string | string[] | undefined },
  endpoint: string,
  preset: RateLimitPreset,
  res: VercelResponse
): boolean {
  const ip = getClientIP(headers);
  return checkRateLimit(ip, endpoint, preset, res);
}

// Export the raw check function for custom usage
export { rateLimiter };
