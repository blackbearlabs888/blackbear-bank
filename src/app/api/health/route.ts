/**
 * Phase 3 — Liveness Endpoint
 *
 * GET /api/health
 *
 * Returns a minimal "I am alive" response. This endpoint:
 *   - Does NOT query the database
 *   - Does NOT expose version, secrets, or environment info
 *   - Returns only: status, timestamp, requestId
 *
 * Use this for Kubernetes liveness probes / load balancer health checks.
 * If the process can respond at all, it is "alive".
 *
 * @module api/health
 */

import { NextResponse } from 'next/server';
import { getRequestId, setRequestIdHeader } from '@/lib/observability/request-id';

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const response = NextResponse.json(
    {
      status: 'alive',
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status: 200 },
  );
  setRequestIdHeader(response, requestId);
  // Liveness probes can be cached briefly by intermediaries.
  response.headers.set('Cache-Control', 'public, max-age=10');
  return response;
}
