/**
 * Phase 3 — Readiness Endpoint
 *
 * GET /api/ready
 *
 * Checks whether the application is ready to serve traffic by running a
 * lightweight database query (`SELECT 1`) with a short timeout.
 *
 * This endpoint:
 *   - Queries the database (unlike /api/health)
 *   - Uses a short timeout (2s) to avoid hanging probes
 *   - Returns a GENERIC response — does NOT expose:
 *     - DATABASE_URL
 *     - Database provider (sqlite/postgres)
 *     - Table names
 *     - Error details / Prisma messages
 *   - Returns only: status, timestamp, requestId
 *
 * Response codes:
 *   200 → ready (DB query succeeded)
 *   503 → not ready (DB query failed or timed out)
 *
 * @module api/ready
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestId, setRequestIdHeader } from '@/lib/observability/request-id';
import { logWarn } from '@/lib/observability/logger';

const READY_TIMEOUT_MS = 2000;

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);

  let ready = false;
  try {
    // Race the DB query against a timeout. `db.$queryRaw\`SELECT 1\`` is the
    // lightest possible query — no table access, no permissions needed beyond
    // a live connection.
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('READY_TIMEOUT')), READY_TIMEOUT_MS),
      ),
    ]);
    ready = true;
  } catch (error) {
    // Log the failure internally with a safe error code. The response does NOT
    // include any error detail — just a generic 503.
    logWarn({
      event: 'health.ready_failed',
      requestId,
      route: 'GET /api/ready',
      errorCode: 'DB_UNAVAILABLE',
      message: 'Readiness check failed',
      data: { error },
    });
  }

  const response = NextResponse.json(
    {
      status: ready ? 'ready' : 'unavailable',
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status: ready ? 200 : 503 },
  );
  setRequestIdHeader(response, requestId);
  // Readiness probes depend on live DB state — never cache.
  response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  return response;
}
