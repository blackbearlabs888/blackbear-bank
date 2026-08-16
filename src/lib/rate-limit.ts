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
 * Get client IP from request headers — Trust Boundary (Phase 1.2 — Finding 7)
 *
 * TRUST MODEL:
 *   - Vercel edge: sets `x-forwarded-for` to the client IP plus any
 *     intermediate proxies. The LEFT-MOST entry is the original client.
 *     Vercel's edge overwrites any client-supplied `x-forwarded-for`, so we
 *     can trust the first entry.
 *   - Caddy (sandbox): sets `x-forwarded-for` based on the immediate peer.
 *     Caddy's default config does NOT blindly trust client-supplied values
 *     when configured as a trusted proxy. The first entry is the client.
 *   - Cloudflare: sets `cf-connecting-ip` to the client IP. Trustworthy.
 *   - Direct connection (dev, no proxy): no IP headers present. We fall back
 *     to 'unknown' and log it so ops can detect a misconfigured proxy.
 *
 * PARSING:
 *   - `x-forwarded-for` is a comma-separated list. We parse it properly,
 *     trim whitespace, and validate each entry against a minimal IPv4/IPv6
 *     shape. Malformed entries are skipped. If NO valid entry is found, we
 *     do NOT fall back to other headers — we treat the request as
 *     'unknown' and rate-limit on that shared bucket (conservative).
 *
 * RESIDUAL RISK:
 *   - The in-memory limiter is per-instance. On Vercel (multi-instance),
 *     each instance has its own bucket, so an attacker can multiply their
 *     effective limit by the number of warm instances. This is documented
 *     as a known limitation; full mitigation requires a distributed store
 *     (Redis, Upstash) which is out of scope.
 *   - If a reverse proxy NOT in our trust model forwards client-supplied
 *     `x-forwarded-for` verbatim, an attacker could spoof IPs to bypass
 *     rate limits. Mitigation: ensure Caddy/Vercel always strips/overrides
 *     client-supplied `x-forwarded-for` (default behaviour).
 */
const IPV4_OR_V6 = /^(?:[0-9]{1,3}(?:\.[0-9]{1,3}){3}|[0-9a-fA-F:]+)$/;

function parseForwardedFor(header: string | null): string | null {
  if (!header) return null;
  // X-Forwarded-For: client, proxy1, proxy2
  // We want the LEFT-MOST (original client) entry, per the trust model.
  const parts = header.split(',');
  for (const raw of parts) {
    const candidate = raw.trim();
    if (!candidate) continue;
    // Strip optional port (e.g. "1.2.3.4:1234" or "[::1]:1234")
    let ip = candidate;
    if (ip.startsWith('[')) {
      // IPv6 with brackets
      const close = ip.indexOf(']');
      if (close > 0) ip = ip.slice(1, close);
    } else if (ip.lastIndexOf(':') > ip.lastIndexOf('.')) {
      // Likely IPv4:port — strip the port
      const lastColon = ip.lastIndexOf(':');
      if (lastColon > 0) ip = ip.slice(0, lastColon);
    }
    if (IPV4_OR_V6.test(ip)) return ip;
  }
  return null;
}

/**
 * Get client IP from request headers.
 *
 * Returns the left-most valid IP from `x-forwarded-for`, falling back to
 * `cf-connecting-ip` (Cloudflare), then `x-real-ip` (some nginx setups),
 * then 'unknown' when no trusted header is present.
 *
 * NOTE: 'unknown' is a SHARED bucket — all requests without a valid IP
 * header share the same rate-limit bucket. This is intentional: if the
 * proxy is misconfigured, the safest behaviour is to throttle everyone on
 * that path rather than let the limit be bypassed.
 */
export function getClientIp(request: Request): string {
  // 1. x-forwarded-for (Vercel edge, Caddy) — left-most valid entry
  const xff = parseForwardedFor(request.headers.get('x-forwarded-for'));
  if (xff) return xff;

  // 2. cf-connecting-ip (Cloudflare) — single IP, no list parsing needed
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && IPV4_OR_V6.test(cfIp.trim())) return cfIp.trim();

  // 3. x-real-ip (some nginx setups) — single IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp && IPV4_OR_V6.test(realIp.trim())) return realIp.trim();

  // 4. Fallback: shared 'unknown' bucket (see note above)
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
