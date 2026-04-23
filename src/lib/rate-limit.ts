/**
 * Rate Limiting Utility - In-memory IP-based rate limiter
 * Prevents spam, brute force, and abuse on sensitive endpoints
 */

interface RateLimitEntry {
  count: number;
  lastReset: number;
  blockedUntil: number | null;
}

// In-memory store (resets on server restart - acceptable for this use case)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries that haven't been used recently and aren't blocked
    if (now - entry.lastReset > 3600000 && !entry.blockedUntil) {
      rateLimitStore.delete(key);
    }
    // Remove expired blocks
    if (entry.blockedUntil && now > entry.blockedUntil) {
      rateLimitStore.delete(key);
    }
  }
  lastCleanup = Date.now();
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowMs: number;
  /** Block duration in seconds after exceeding limit (0 = no block, just reject) */
  blockDurationMs?: number;
  /** Custom key prefix for namespacing */
  keyPrefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  blocked: boolean;
  retryAfter?: number;
}

/**
 * Check rate limit for a given identifier (usually IP)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const {
    maxRequests,
    windowMs,
    blockDurationMs = 60000, // default 1 min block
    keyPrefix = 'global',
  } = config;

  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist
  if (!entry) {
    entry = { count: 0, lastReset: now, blockedUntil: null };
    rateLimitStore.set(key, entry);
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      blocked: true,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Clear expired block
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    entry.count = 0;
    entry.lastReset = now;
    entry.blockedUntil = null;
  }

  // Reset window if expired
  if (now - entry.lastReset >= windowMs) {
    entry.count = 0;
    entry.lastReset = now;
  }

  // Increment count
  entry.count++;

  // Check if exceeded
  if (entry.count > maxRequests) {
    // Apply block
    if (blockDurationMs > 0) {
      entry.blockedUntil = now + blockDurationMs;
    }
    return {
      success: false,
      remaining: 0,
      resetAt: entry.blockedUntil || now + windowMs,
      blocked: true,
      retryAfter: Math.ceil((blockDurationMs || windowMs) / 1000),
    };
  }

  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.lastReset + windowMs,
    blocked: false,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Try various headers used by proxies/load balancers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  // Fallback - in development this might be "::1"
  return 'unknown';
}

/**
 * Convenience wrapper: rate limit by request (extracts IP automatically)
 */
export async function rateLimit(
  request: Request,
  keyPrefix: string,
  config?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  return checkRateLimit(ip, {
    keyPrefix,
    ...config,
  });
}

// Preset configurations for common use cases
export const RATE_LIMITS = {
  /** Order creation: 5 orders per 5 minutes */
  ORDER_CREATE: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000, // 15 min block
    keyPrefix: 'order',
  },
  /** Partner registration: 3 attempts per 10 minutes */
  PARTNER_REGISTER: {
    maxRequests: 3,
    windowMs: 10 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000, // 30 min block
    keyPrefix: 'register',
  },
  /** Login: 5 attempts per 5 minutes */
  LOGIN: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
    keyPrefix: 'login',
  },
  /** Customer lookup: 10 per minute */
  CUSTOMER_LOOKUP: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
    keyPrefix: 'lookup',
  },
  /** General API: 30 per minute */
  GENERAL_API: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000,
    keyPrefix: 'api',
  },
} as const;
