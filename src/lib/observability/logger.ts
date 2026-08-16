/**
 * Phase 3 — Structured Logger with Centralized Redaction
 *
 * Single entry point for all operational logging. Every log line is emitted as
 * a JSON object to stdout/stderr with a consistent schema. Sensitive data is
 * redacted centrally (by key name + value pattern) so that individual call
 * sites never need to remember to scrub fields.
 *
 * Log schema:
 *   {
 *     timestamp: ISO 8601,
 *     level: 'info' | 'warn' | 'error',
 *     event: string,
 *     requestId: string | null,
 *     route: string | null,
 *     actorRole: string | null,
 *     actorId: string | null,
 *     transactionId: string | null,
 *     orderId: string | null,
 *     durationMs: number | null,
 *     errorCode: string | null,
 *     message: string | null,
 *     data: object
 *   }
 *
 * Redaction policy (enforced in `redact()`):
 *   - Keys matching SENSITIVE_KEYS → '[REDACTED]'
 *   - Free-form string values → phone patterns → '[PHONE]', bank-account-like → '[ACCOUNT]'
 *   - Error objects → { name, code } (message/stack stripped)
 *
 * Server-only: this module MUST never be imported by client code.
 *
 * @module observability/logger
 */

import { AsyncLocalStorage } from 'async_hooks';

// ── Request context (mutable, stored in ALS) ──

export interface RequestContext {
  requestId: string;
  route: string;
  actorRole: string;
  actorId: string | null;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context from AsyncLocalStorage.
 * Returns null if called outside a request scope.
 */
export function getCurrentContext(): RequestContext | null {
  return requestContextStorage.getStore() ?? null;
}

/**
 * Run a function inside a request context. The context object is mutable —
 * call `updateActor()` later to enrich it after authentication completes.
 */
export function runWithContext<T>(
  context: RequestContext,
  fn: () => Promise<T> | T,
): Promise<T> | T {
  return requestContextStorage.run(context, fn);
}

/**
 * Update the actor fields on the current request context.
 *
 * Call this after `getCurrentUser()` succeeds, so that subsequent log lines
 * include the authenticated actor's role and ID. No-op outside a request scope.
 */
export function updateActor(role: string, actorId: string | null): void {
  const ctx = requestContextStorage.getStore();
  if (ctx) {
    ctx.actorRole = role;
    ctx.actorId = actorId;
  }
}

/**
 * Convenience: get just the current request ID, or null.
 */
export function getCurrentRequestId(): string | null {
  return requestContextStorage.getStore()?.requestId ?? null;
}

// ── Redaction ──

const SENSITIVE_KEYS = new Set([
  // Credentials / secrets
  'password', 'pwd', 'passwd', 'pass',
  'token', 'accesstoken', 'refreshtoken', 'apitoken', 'bearertoken',
  'authtoken', 'csrftoken',
  'secret', 'apisecret', 'clientsecret', 'webhooksecret', 'telegramsecret',
  'authorization', 'auth',
  'apikey', 'key',
  // Session
  'cookie', 'sessionid', 'session', 'sessiontoken',
  // PII
  'phone', 'phonenumber', 'mobile', 'whatsapp', 'wa', 'telephone',
  'bankaccount', 'accountnumber', 'accountno', 'account',
  'bankholder', 'holdername', 'holder',
  'bankname', 'bank',
  // Request body / payload (may contain any of the above)
  'body', 'payload', 'requestbody', 'requestpayload',
  // Idempotency derived data
  'idempotencypayload', 'idempotencyhash',
]);

const PHONE_PATTERN = /(\+?6[0-9]{8,14}|0[0-9]{9,13}|\b\d{10,15}\b)/g;
const BANK_ACCOUNT_PATTERN = /^\+?\d[\d\s\-]{6,16}\d$/;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
  return SENSITIVE_KEYS.has(normalized);
}

/**
 * Recursively redact sensitive data from an arbitrary value.
 */
export function redact(value: unknown, keyHint?: string): unknown {
  if (keyHint && isSensitiveKey(keyHint)) {
    return '[REDACTED]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    let redacted = value.replace(PHONE_PATTERN, '[PHONE]');
    if (BANK_ACCOUNT_PATTERN.test(redacted.trim())) {
      redacted = '[ACCOUNT]';
    }
    return redacted;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    const err = value as Error & { code?: string };
    return {
      name: value.name,
      ...(err.code ? { code: err.code } : {}),
    };
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((v) => redact(v));
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = redact(v, k);
    }
    return result;
  }

  return value;
}

// ── Log context type ──

export interface LogContext {
  event: string;
  route?: string;
  actorRole?: string;
  actorId?: string | null;
  transactionId?: string | null;
  orderId?: string | null;
  durationMs?: number | null;
  errorCode?: string | null;
  requestId?: string | null;
  data?: Record<string, unknown>;
  message?: string;
}

interface EmittedLogLine {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  requestId: string | null;
  route: string | null;
  actorRole: string | null;
  actorId: string | null;
  transactionId: string | null;
  orderId: string | null;
  durationMs: number | null;
  errorCode: string | null;
  message: string | null;
  data: unknown;
}

function buildLogLine(level: 'info' | 'warn' | 'error', ctx: LogContext): EmittedLogLine {
  const current = getCurrentContext();
  return {
    timestamp: new Date().toISOString(),
    level,
    event: ctx.event,
    requestId: ctx.requestId ?? current?.requestId ?? null,
    route: ctx.route ?? current?.route ?? null,
    actorRole: ctx.actorRole ?? current?.actorRole ?? null,
    actorId: ctx.actorId ?? current?.actorId ?? null,
    transactionId: ctx.transactionId ?? null,
    orderId: ctx.orderId ?? null,
    durationMs: ctx.durationMs ?? null,
    errorCode: ctx.errorCode ?? null,
    message: ctx.message ?? null,
    data: redact(ctx.data ?? {}),
  };
}

/**
 * Emit an info-level operational log.
 */
export function logInfo(ctx: LogContext): void {
  const line = buildLogLine('info', ctx);
  console.log(JSON.stringify(line));
}

/**
 * Emit a warn-level operational log.
 */
export function logWarn(ctx: LogContext): void {
  const line = buildLogLine('warn', ctx);
  console.warn(JSON.stringify(line));
}

/**
 * Emit an error-level operational log.
 */
export function logError(ctx: LogContext): void {
  const line = buildLogLine('error', ctx);
  console.error(JSON.stringify(line));
}

// ── Transaction event helper ──

export interface TransactionEventOpts {
  transactionId?: string | null;
  orderId?: string | null;
  actorRole?: string;
  actorId?: string | null;
  requestId?: string | null;
  durationMs?: number | null;
  errorCode?: string | null;
  message?: string;
  monetary?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

/**
 * Emit a transaction observability event with a safe monetary summary.
 *
 * Monetary fields are safe to log. Customer/bank PII is NEVER included.
 */
export function logTransactionEvent(event: string, opts: TransactionEventOpts = {}): void {
  const data: Record<string, unknown> = {};
  if (opts.monetary) {
    data.monetary = opts.monetary;
  }
  if (opts.extra) {
    Object.assign(data, opts.extra);
  }

  // Determine level based on event name
  const isError =
    event.includes('conflict') ||
    event.includes('failed') ||
    event.includes('rollback') ||
    event.includes('atomic_conflict');
  const isWarn = event.includes('deleted') || event.includes('replayed');

  const baseCtx: LogContext = {
    event,
    transactionId: opts.transactionId,
    orderId: opts.orderId,
    actorRole: opts.actorRole,
    actorId: opts.actorId,
    requestId: opts.requestId,
    durationMs: opts.durationMs,
    errorCode: opts.errorCode,
    message: opts.message,
    data,
  };

  if (isError) {
    logError(baseCtx);
  } else if (isWarn) {
    logWarn(baseCtx);
  } else {
    logInfo(baseCtx);
  }
}
