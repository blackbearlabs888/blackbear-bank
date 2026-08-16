/**
 * Phase 3 — Standard Error Response
 *
 * Standardizes API error responses so that the frontend receives a consistent
 * shape, and so that internal details (stack traces, Prisma error messages,
 * SQL, table names, environment variables) are NEVER leaked to the client.
 *
 * Standard error shape (ALL error responses):
 *   {
 *     "success": false,
 *     "error": {
 *       "code": "TRANSACTION_UPDATE_FAILED",      // safe machine code
 *       "message": "Pesan aman untuk client",      // safe human message
 *       "requestId": "550e8400-e29b-41d4-..."      // for correlation
 *     }
 *   }
 *
 * Success responses are NOT changed — existing `{ success: true, data: ... }`
 * shapes are preserved so the frontend does not break.
 *
 * @module observability/errors
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentRequestId } from './logger';

// ── Error codes ──

/**
 * Safe, stable error codes that the frontend can switch on.
 * These are intentionally generic — they describe the CATEGORY of failure,
 * never the internal cause.
 */
export const ErrorCode = {
  // 400
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  // 401
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  // 403
  FORBIDDEN: 'FORBIDDEN',
  // 404
  NOT_FOUND: 'NOT_FOUND',
  // 409
  CONFLICT: 'CONFLICT',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  // 429
  RATE_LIMITED: 'RATE_LIMITED',
  // 500
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  TRANSACTION_CREATE_FAILED: 'TRANSACTION_CREATE_FAILED',
  TRANSACTION_UPDATE_FAILED: 'TRANSACTION_UPDATE_FAILED',
  TRANSACTION_DELETE_FAILED: 'TRANSACTION_DELETE_FAILED',
  ATOMIC_CONFLICT: 'ATOMIC_CONFLICT',
  TELEGRAM_SEND_FAILED: 'TELEGRAM_SEND_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  // 503
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

// ── Safe error response builder ──

export interface ApiErrorOpts {
  /** HTTP status code */
  status: number;
  /** Stable machine-readable error code */
  code: string;
  /** Safe human-readable message (Indonesian, client-facing) */
  message: string;
  /** Optional request ID (defaults to current ALS requestId) */
  requestId?: string | null;
  /** Optional additional headers (e.g. Retry-After) */
  headers?: Record<string, string>;
  /** Optional safe error code for logging (not sent to client beyond `code`) */
  logErrorCode?: string;
}

/**
 * Build a standard error NextResponse.
 *
 * The response shape is:
 *   { success: false, error: { code, message, requestId } }
 *
 * No stack trace, Prisma message, SQL, table name, or environment variable is
 * ever included. The raw error is logged server-side via `logError()` if
 * passed, but only its `name` + `code` survive redaction.
 */
export function apiError(opts: ApiErrorOpts): NextResponse {
  const requestId = opts.requestId ?? getCurrentRequestId();
  const body = {
    success: false as const,
    error: {
      code: opts.code,
      message: opts.message,
      ...(requestId ? { requestId } : {}),
    },
  };
  return NextResponse.json(body, {
    status: opts.status,
    headers: opts.headers,
  });
}

// ── Safe error message extraction ──

/**
 * Map an unknown caught error to a safe error code + message + HTTP status.
 *
 * This NEVER exposes:
 *   - The raw error message (may contain SQL, table names, constraint names)
 *   - The stack trace
 *   - Environment variables
 *   - Prisma error details
 *
 * Instead, it inspects the error TYPE (Prisma known error code, etc.) and
 * returns a generic safe message. The raw error is logged separately by the
 * call site via `logError()`.
 */
export function safeErrorFrom(
  error: unknown,
  fallbackCode: string = ErrorCode.INTERNAL_ERROR,
  fallbackMessage: string = 'Terjadi kesalahan server',
): { status: number; code: string; message: string } {
  // Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return {
          status: 409,
          code: ErrorCode.CONFLICT,
          message: 'Data sudah ada (konflik).',
        };
      case 'P2025':
        // Record not found
        return {
          status: 404,
          code: ErrorCode.NOT_FOUND,
          message: 'Data tidak ditemukan.',
        };
      case 'P2003':
        // Foreign key constraint violation
        return {
          status: 400,
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Referensi data tidak valid.',
        };
      default:
        return {
          status: 500,
          code: ErrorCode.DATABASE_ERROR,
          message: 'Terjadi kesalahan pada database.',
        };
    }
  }

  // Prisma unknown / validation errors
  if (
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    return {
      status: 500,
      code: ErrorCode.DATABASE_ERROR,
      message: 'Terjadi kesalahan pada database.',
    };
  }

  // Generic Error — never expose message
  if (error instanceof Error) {
    return {
      status: 500,
      code: fallbackCode,
      message: fallbackMessage,
    };
  }

  return {
    status: 500,
    code: fallbackCode,
    message: fallbackMessage,
  };
}

/**
 * Convenience: build an apiError response directly from a caught error.
 *
 * Usage:
 *   } catch (error) {
 *     logError({ event: 'transaction.update_failed', data: { error } });
 *     return apiErrorFrom(error, 'TRANSACTION_UPDATE_FAILED');
 *   }
 */
export function apiErrorFrom(
  error: unknown,
  fallbackCode: string = ErrorCode.INTERNAL_ERROR,
  fallbackMessage: string = 'Terjadi kesalahan server',
  opts?: { requestId?: string | null; headers?: Record<string, string> },
): NextResponse {
  const { status, code, message } = safeErrorFrom(error, fallbackCode, fallbackMessage);
  return apiError({
    status,
    code,
    message,
    requestId: opts?.requestId,
    headers: opts?.headers,
  });
}

// ── Common shortcut builders ──

export function apiValidationError(
  message: string,
  requestId?: string | null,
): NextResponse {
  return apiError({
    status: 400,
    code: ErrorCode.VALIDATION_ERROR,
    message,
    requestId,
  });
}

export function apiUnauthenticated(requestId?: string | null): NextResponse {
  return apiError({
    status: 401,
    code: ErrorCode.UNAUTHENTICATED,
    message: 'Tidak terautentikasi',
    requestId,
  });
}

export function apiForbidden(requestId?: string | null): NextResponse {
  return apiError({
    status: 403,
    code: ErrorCode.FORBIDDEN,
    message: 'Tidak memiliki akses',
    requestId,
  });
}

export function apiNotFound(
  message: string = 'Data tidak ditemukan',
  requestId?: string | null,
): NextResponse {
  return apiError({
    status: 404,
    code: ErrorCode.NOT_FOUND,
    message,
    requestId,
  });
}

export function apiConflict(
  message: string = 'Data sudah ada (konflik)',
  requestId?: string | null,
): NextResponse {
  return apiError({
    status: 409,
    code: ErrorCode.CONFLICT,
    message,
    requestId,
  });
}

export function apiRateLimited(
  retryAfterSeconds: number,
  requestId?: string | null,
): NextResponse {
  return apiError({
    status: 429,
    code: ErrorCode.RATE_LIMITED,
    message: 'Terlalu banyak permintaan. Coba lagi nanti.',
    requestId,
    headers: { 'Retry-After': String(retryAfterSeconds) },
  });
}

export function apiInternalError(
  requestId?: string | null,
  message: string = 'Terjadi kesalahan server',
): NextResponse {
  return apiError({
    status: 500,
    code: ErrorCode.INTERNAL_ERROR,
    message,
    requestId,
  });
}
