/**
 * Phase 3 — Request Correlation (X-Request-Id)
 *
 * Generates / validates / propagates a request ID across the entire request
 * lifecycle so that every log line for a single request shares the same
 * identifier.
 *
 * Trust model:
 *   - If the incoming `X-Request-Id` header is a valid UUID (v4 format), it is
 *     accepted and forwarded. This allows a trusted proxy or frontend to set
 *     its own correlation ID.
 *   - If the header is absent OR invalid (not a UUID, wrong length, contains
 *     unexpected characters), a fresh UUID v4 is generated server-side. This
 *     prevents log injection via crafted header values.
 *   - The request ID is NEVER used for authentication or authorization.
 *
 * Propagation:
 *   - `getRequestId(request)` extracts or generates the ID (pure function).
 *   - `withObservability(handler)` wraps a route handler, storing the ID in
 *     AsyncLocalStorage so downstream logger calls pick it up automatically.
 *   - `updateActor(role, id)` enriches the context after authentication.
 *   - The response always includes `X-Request-Id` so the client can correlate.
 *
 * @module observability/request-id
 */

import { randomUUID } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import {
  runWithContext,
  updateActor as updateActorInLogger,
  type RequestContext,
} from './logger';

// ── Validation ──

/**
 * Regex for a valid UUID (any version, case-insensitive, with dashes).
 * Used to validate incoming X-Request-Id headers.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_REQUEST_ID_LENGTH = 64;

/**
 * Check whether a string is a valid request ID (UUID format).
 *
 * Anything else is considered invalid and will be replaced with a
 * server-generated UUID. This prevents log injection.
 */
export function isValidRequestId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > MAX_REQUEST_ID_LENGTH) return false;
  return UUID_PATTERN.test(value);
}

// ── Extraction ──

/**
 * Extract the request ID from an incoming request.
 *
 * - If `X-Request-Id` header is present and valid → use it.
 * - Otherwise → generate a fresh UUID v4.
 */
export function getRequestId(request: NextRequest | Request): string {
  const header = request.headers.get('x-request-id');
  if (isValidRequestId(header)) {
    return header;
  }
  return randomUUID();
}

/**
 * Extract the request ID from a plain Headers object.
 */
export function getRequestIdFromHeaders(headers: Headers): string {
  const header = headers.get('x-request-id');
  if (isValidRequestId(header)) {
    return header;
  }
  return randomUUID();
}

// ── Response helper ──

/**
 * Attach the X-Request-Id header to a NextResponse.
 */
export function setRequestIdHeader(
  response: NextResponse,
  requestId: string,
): NextResponse {
  response.headers.set('X-Request-Id', requestId);
  return response;
}

/**
 * Phase 4 — Prevent authenticated / personalized API responses from being
 * stored in shared caches (CDN, proxy, browser disk cache).
 *
 * `private`  → only the end-user's browser may keep a copy (not shared caches)
 * `no-store` → no cache storage at all (strongest guarantee)
 * `max-age=0`+`must-revalidate` → if anything is cached, it must revalidate
 *
 * This is set on every response that goes through `withObservability` because
 * those routes return transaction/customer/auth/session data that must never
 * leak between users or appear in a shared cache.
 */
export function setNoStoreCacheHeaders(response: NextResponse): NextResponse {
  // Only set if the handler hasn't already chosen a caching strategy
  // (e.g. a public read-only endpoint that explicitly wants caching).
  if (!response.headers.get('Cache-Control')) {
    response.headers.set(
      'Cache-Control',
      'private, no-store, max-age=0, must-revalidate',
    );
  }
  return response;
}

// ── Route descriptor ──

/**
 * Build a human-readable route descriptor, e.g. "POST /api/orders".
 */
export function describeRoute(request: NextRequest | Request): string {
  const method = request.method.toUpperCase();
  let path: string;
  try {
    path = new URL(request.url).pathname;
  } catch {
    path = '/unknown';
  }
  return `${method} ${path}`;
}

// ── Handler wrapper (ALS context) ──

/**
 * Wrap an API route handler with observability context.
 *
 * 1. Extracts (or generates) the X-Request-Id.
 * 2. Stores it in AsyncLocalStorage so logger calls pick it up automatically.
 * 3. Ensures the response includes the X-Request-Id header.
 *
 * Usage (no params):
 *   export const POST = withObservability(async (request) => {
 *     return NextResponse.json({ success: true });
 *   });
 *
 * Usage (dynamic params):
 *   export const PATCH = withObservability(async (request, ctx) => {
 *     const { id } = await ctx.params;
 *     ...
 *   });
 *
 * After authentication succeeds, call `updateActor(role, userId)` to enrich
 * subsequent log lines.
 */
export function withObservability<
  TArgs extends { params: Promise<Record<string, string>> } | undefined = undefined,
>(
  handler: (
    request: NextRequest,
    ctx: TArgs,
  ) => Promise<NextResponse> | NextResponse,
): (request: NextRequest, ctx: TArgs) => Promise<NextResponse> {
  return async (request: NextRequest, ctx: TArgs) => {
    const requestId = getRequestId(request);
    const route = describeRoute(request);
    const context: RequestContext = {
      requestId,
      route,
      actorRole: 'public',
      actorId: null,
    };

    return runWithContext(context, async () => {
      const response = await handler(request, ctx);
      setRequestIdHeader(response, requestId);
      setNoStoreCacheHeaders(response);
      return response;
    });
  };
}

/**
 * Update the actor on the current request context (after authentication).
 * No-op if called outside a request scope.
 */
export function updateActor(role: string, actorId: string | null): void {
  updateActorInLogger(role, actorId);
}
