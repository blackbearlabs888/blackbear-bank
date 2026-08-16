# PHASE 3 — OBSERVABILITY & OPERATIONAL RELIABILITY REPORT

**Date:** 2026-08-14
**Phase:** 3 — Observability & Operational Reliability
**Runtime tested:** SQLite (development)
**PostgreSQL:** Static-compatible (schema validated, not runtime-tested)
**Final verdict:** **PHASE 3 SQLITE PASS**

---

## 1. Implemented Components

### 1.1 Structured Logger (`src/lib/observability/logger.ts`)
- Centralized JSON logger with three levels: `info`, `warn`, `error`.
- Every log line includes: `timestamp`, `level`, `event`, `requestId`, `route`, `actorRole`, `actorId`, `transactionId`, `orderId`, `durationMs`, `errorCode`, `message`, `data`.
- **Centralized redaction** via `redact()` — recursively scrubs sensitive keys (`password`, `token`, `secret`, `authorization`, `cookie`, `phone`, `bankAccount`, `bankHolder`, `bankName`, `body`, `payload`, `idempotencyHash`, `idempotencyPayload`, `apiKey`, `session`) to `[REDACTED]`.
- Phone-like patterns in free-form strings are replaced with `[PHONE]`.
- Bank-account-like numeric strings are replaced with `[ACCOUNT]`.
- Error objects are reduced to `{ name, code }` — message and stack are NEVER logged (may contain SQL, table names, constraint details).
- AsyncLocalStorage (ALS) propagates `requestId` / `route` / `actorRole` / `actorId` across the entire request lifecycle without explicit passing.
- `logTransactionEvent()` helper emits transaction-specific events with safe monetary summaries.

### 1.2 Request Correlation (`src/lib/observability/request-id.ts`)
- `getRequestId(request)`: extracts `X-Request-Id` header; validates UUID format; generates fresh UUID v4 if absent or invalid.
- `withObservability(handler)`: wraps API route handlers — sets ALS context, ensures `X-Request-Id` response header.
- `updateActor(role, id)`: enriches the request context after authentication succeeds.
- `describeRoute(request)`: builds `"METHOD /path"` descriptor for log lines.
- Request ID is NEVER used for authentication or authorization.

### 1.3 Standard Error Response (`src/lib/observability/errors.ts`)
- `apiError({ status, code, message, requestId })`: returns standard `{ success: false, error: { code, message, requestId } }` shape.
- `apiErrorFrom(error, fallbackCode, fallbackMessage)`: maps caught errors to safe responses — Prisma P2002 → 409 CONFLICT, P2025 → 404 NOT_FOUND, P2003 → 400 VALIDATION_ERROR, generic → 500 INTERNAL_ERROR.
- `safeErrorFrom(error)`: inspects error type and returns safe code+message+status — NEVER exposes stack, SQL, table names, or environment variables.
- Shortcut builders: `apiValidationError`, `apiUnauthenticated`, `apiForbidden`, `apiNotFound`, `apiConflict`, `apiRateLimited`, `apiInternalError`.
- **Success response shapes are preserved** — existing frontend compatibility is maintained.

### 1.4 Health Endpoints
- **`GET /api/health`** (liveness): returns `{ status: 'alive', timestamp, requestId }`. Does NOT query the database. Does NOT expose version, secrets, or environment info.
- **`GET /api/ready`** (readiness): runs `SELECT 1` with a 2-second timeout. Returns 200 `{ status: 'ready', timestamp, requestId }` on success, or 503 `{ status: 'unavailable', timestamp, requestId }` on failure. Does NOT expose DATABASE_URL, provider, table names, or error details.

### 1.5 Reconciliation Service (`src/lib/observability/reconcile.ts`)
- `reconcilePartners()`: **READ-ONLY** function that compares each Partner's stored denormalized counters (`totalProfit`, `totalVolume`, `totalTransactions`) against a fresh recomputation from `Transaction` rows where `status='success'`.
- Returns per-partner rows with: `partnerId`, `partnerName`, `stored`, `calculated`, `delta`, `status` (MATCH/DRIFT).
- **NEVER writes to the database.** **NEVER mutates data.** **NEVER creates cron jobs.**
- `maskId(id)`: masks CUIDs for log output (first 6 + last 4 chars).
- Exposed as owner-only API: `GET /api/admin/reconcile` (403 for partners, 401 for unauthenticated).
- Standalone script: `scripts/reconcile-partners.ts` (`bun run scripts/reconcile-partners.ts`).

### 1.6 Integration Reliability
- **Telegram** (`src/lib/telegram.ts`):
  - 5-second timeout via `AbortController` on all outbound HTTP calls.
  - `maskChatId(chatId)`: masks chat ID to last 4 digits in all log output.
  - Bot token is NEVER logged.
  - Success/failure logged with safe event names (`telegram.send_success`, `telegram.send_failed`).
  - **Fail-after-commit pattern**: DB `$transaction` commits BEFORE any Telegram HTTP call. Telegram failure is logged but does NOT roll back the committed transaction.
  - No retry queue or new schema introduced.
- **WhatsApp** (`src/app/api/orders/contact/route.ts`):
  - Failures logged with safe error codes (`whatsapp.contact_unavailable`, `whatsapp.contact_error`).
  - Target phone number is NEVER logged — only the contact target type (`partner`/`owner`) and orderId.

### 1.7 Telegram /catatan — APPEND Semantics
- `handleCatatan` now **APPENDS** a new note instead of overwriting.
- Each appended entry includes: `[timestamp] [Owner] <text>`.
- Previous notes are preserved verbatim — never deleted or truncated.
- Mutation is atomic (single `UPDATE` inside `db.$transaction`).
- Event `transaction.notes_appended` emitted after commit.

---

## 2. Event List

The following transaction observability events are emitted (safe monetary summary included; no PII):

| Event | Level | Trigger |
|-------|-------|---------|
| `order.created` | info | POST /api/orders — new transaction created |
| `transaction.created` | info | POST /api/transactions — new transaction created |
| `transaction.replayed` | warn | Idempotency replay — same key, same payload → returns existing |
| `transaction.idempotency_conflict` | error | Idempotency conflict — same key, different payload → 409 |
| `transaction.status_changed` | info | PATCH /api/transactions/[id] or Telegram /status — status changed |
| `transaction.status_noop` | info | Same-status request (no-op) |
| `transaction.amount_changed` | info | PATCH or Telegram /nominal — nominal changed |
| `transaction.marketplace_changed` | info | PATCH or Telegram /mp — marketplace changed |
| `transaction.deleted` | warn | DELETE /api/transactions/[id] |
| `transaction.atomic_conflict` | error | Conditional update affected 0 rows (concurrent modification) |
| `transaction.notes_appended` | info | Telegram /catatan — note appended |
| `transaction.preview` | info | POST /api/transactions/preview — preview calculated |
| `auth.login_success` | info | Successful login |
| `auth.login_failed` | warn | Failed login (no email logged — anti-enumeration) |
| `auth.register` | info | New user registered |
| `auth.logout` | info | User logged out |
| `customer.created` | info | Customer created |
| `customer.lookup` | info | Customer lookup performed (no phone logged) |
| `telegram.send_success` | info | Telegram message sent (masked chat ID) |
| `telegram.send_failed` | warn | Telegram send failed (timeout/API error/network) |
| `telegram.webhook_rejected` | warn | Webhook authenticity check failed |
| `telegram.webhook_error` | error | Webhook handler error |
| `whatsapp.contact_link_created` | info | WhatsApp contact link generated |
| `whatsapp.contact_unavailable` | warn | No WhatsApp contact available |
| `whatsapp.contact_error` | warn | Contact proxy error |
| `reconcile.completed` | info | Reconciliation run completed |
| `reconcile.forbidden` | warn | Non-owner attempted reconciliation |
| `reconcile.failed` | warn | Reconciliation query failed |
| `health.ready_failed` | warn | Readiness check failed (DB unavailable) |

---

## 3. Redaction Policy

**Centralized** in `src/lib/observability/logger.ts` `redact()` function. Individual call sites never need to remember to scrub fields.

### Redacted by key name (case-insensitive, non-alpha stripped):
- **Credentials:** `password`, `pwd`, `passwd`, `pass`, `token`, `accessToken`, `refreshToken`, `apiToken`, `bearerToken`, `authToken`, `csrfToken`, `secret`, `apiSecret`, `clientSecret`, `webhookSecret`, `telegramSecret`, `authorization`, `auth`, `apiKey`, `key`
- **Session:** `cookie`, `sessionId`, `session`, `sessionToken`
- **PII:** `phone`, `phoneNumber`, `mobile`, `whatsapp`, `wa`, `telephone`, `bankAccount`, `accountNumber`, `accountNo`, `account`, `bankHolder`, `holderName`, `holder`, `bankName`, `bank`
- **Request data:** `body`, `payload`, `requestBody`, `requestPayload`
- **Idempotency derived data:** `idempotencyPayload`, `idempotencyHash`

### Redacted by value pattern:
- Phone-like patterns in strings (`+62...`, `62...`, `08...`, 10-15 consecutive digits) → `[PHONE]`
- Bank-account-like numeric strings (8-18 digits) → `[ACCOUNT]`

### Error objects:
- Reduced to `{ name, code }` — `.message` and `.stack` are stripped (may contain SQL, table names, constraint details).

### What is SAFE to log:
- Monetary values (nominal, paymentFee, partnerProfit, ownerProfit, totalReceived, etc.)
- Database IDs (CUIDs — not PII)
- Order IDs (public identifiers)
- Status values, role names, route paths
- Timestamps, durations, safe error codes

---

## 4. Health Behavior

| Endpoint | Purpose | DB Query | Timeout | Exposes | Response |
|----------|---------|----------|---------|---------|----------|
| `GET /api/health` | Liveness | No | N/A | Nothing | `{ status: 'alive', timestamp, requestId }` (200) |
| `GET /api/ready` | Readiness | `SELECT 1` | 2s | Nothing | `{ status: 'ready', timestamp, requestId }` (200) or `{ status: 'unavailable', timestamp, requestId }` (503) |

Neither endpoint exposes: `DATABASE_URL`, database provider, table names, version, secrets, or error details.

---

## 5. Reconciliation Result

The reconciliation service was tested with two scenarios:

### MATCH scenario (test 11):
- Created a partner with 1 successful transaction (nominal=1,000,000, partnerProfit=2,400).
- Set stored counters to the CORRECT values (totalProfit=2,400, totalVolume=1,000,000, totalTransactions=1).
- Ran `reconcilePartners()`.
- **Result:** status = `MATCH`, delta = 0 for all three fields.

### DRIFT scenario (test 12):
- Created a partner with 1 successful transaction.
- DELIBERATELY set stored counters to WRONG values (totalProfit=99,999, totalVolume=555,555, totalTransactions=7).
- Ran `reconcilePartners()`.
- **Result:** status = `DRIFT`, delta.totalProfit = 95,199, delta.totalTransactions = 6.
- **CRITICAL:** Verified the stored data was NOT modified by reconciliation — the wrong values persisted after the read-only check.

**Production note:** No data was auto-fixed. No cron was created. The reconciliation is purely diagnostic — operators must manually investigate and correct drift.

---

## 6. Tests

### Phase 3 Test Suite (`tests/observability/phase3-observability.test.ts`)
**36 tests, 0 failures, 178 expect() calls**

| # | Test Case | Status |
|---|-----------|--------|
| 1 | Request ID created and returned (header + body) | PASS |
| 2 | Valid X-Request-Id forwarded | PASS |
| 3 | Invalid X-Request-Id replaced with UUID | PASS |
| 4 | isValidRequestId rejects non-UUID (unit) | PASS |
| 5 | getRequestIdFromHeaders generates UUID (unit) | PASS |
| 6 | Redaction: password field | PASS |
| 7 | Redaction: token field | PASS |
| 8 | Redaction: phone field | PASS |
| 9 | Redaction: bankAccount field | PASS |
| 10 | Redaction: bankHolder field | PASS |
| 11 | Redaction: authorization field | PASS |
| 12 | Redaction: cookie field | PASS |
| 13 | Redaction: secret field | PASS |
| 14 | Redaction: idempotencyHash field | PASS |
| 15 | Redaction: nested recursive | PASS |
| 16 | Redaction: phone patterns in strings | PASS |
| 17 | Redaction: case-insensitive keys | PASS |
| 18 | apiError returns standard shape (unit) | PASS |
| 19 | apiErrorFrom maps Prisma P2002 to CONFLICT (unit) | PASS |
| 20 | apiErrorFrom maps Prisma P2025 to NOT_FOUND (unit) | PASS |
| 21 | safeErrorFrom generic Error (no message leak) (unit) | PASS |
| 22 | HTTP — unauthenticated returns standard error | PASS |
| 23 | Liveness returns 200 alive, no DB info | PASS |
| 24 | Liveness source does not import db (static review) | PASS |
| 25 | Readiness returns 200 ready | PASS |
| 26 | safeErrorFrom maps Prisma P1001 to DATABASE_ERROR (unit) | PASS |
| 27 | Readiness catch block returns 503 (static review) | PASS |
| 28 | Transaction event emitted exactly once | PASS |
| 29 | Idempotency replay not logged as new (replayed event, not created) | PASS |
| 30 | Telegram failure does not rollback transaction | PASS |
| 31 | Reconciliation detects MATCH | PASS |
| 32 | Reconciliation detects DRIFT without changing data | PASS |
| 33 | /catatan append preserves previous notes | PASS |
| 34 | Owner can access /api/admin/reconcile | PASS |
| 35 | Partner is FORBIDDEN from reconciliation | PASS |
| 36 | Unauthenticated returns 401 for reconciliation | PASS |

### Full Test Suite Regression Check
**145 tests, 0 failures, 465 expect() calls, 23.49s**

| Suite | Tests | Status |
|-------|-------|--------|
| Phase 1 Security (`tests/security/phase1-security.test.ts`) | 35 | PASS |
| Phase 1.1 Rate Limit (`tests/security/phase1.1-ratelimit.test.ts`) | — | PASS |
| Phase 1.2 Security (`tests/security/phase1.2-security.test.ts`) | 44 | PASS |
| Phase 2 Fee Golden Master (`tests/transaction/fee-golden-master.test.ts`) | 16 | PASS |
| Phase 2 Integration (`tests/transaction/phase2-integration.test.ts`) | 14 | PASS |
| **Phase 3 Observability** (`tests/observability/phase3-observability.test.ts`) | **36** | **PASS** |
| **Total** | **145** | **0 failures** |

All 109 pre-existing tests continue to pass — zero regressions.

---

## 7. Changed Files

### New files (8):
1. `src/lib/observability/logger.ts` — Structured logger with centralized redaction + ALS
2. `src/lib/observability/request-id.ts` — X-Request-Id extraction, validation, `withObservability` wrapper
3. `src/lib/observability/errors.ts` — Standard error response (`apiError`, `apiErrorFrom`, `safeErrorFrom`, `ErrorCode`)
4. `src/lib/observability/reconcile.ts` — Read-only partner stats reconciliation
5. `src/app/api/health/route.ts` — Liveness endpoint (no DB)
6. `src/app/api/ready/route.ts` — Readiness endpoint (SELECT 1, 2s timeout)
7. `src/app/api/admin/reconcile/route.ts` — Owner-only reconciliation API
8. `scripts/reconcile-partners.ts` — Standalone read-only reconciliation script

### Modified files (14):
1. `src/lib/telegram.ts` — Added 5s timeout, `maskChatId()`, structured logging (send_success/send_failed)
2. `src/app/api/telegram/webhook/route.ts` — `/catatan` APPEND semantics, event logging (status_changed, status_noop, amount_changed, marketplace_changed, notes_appended), `withObservability` wrapper, structured error handling
3. `src/app/api/orders/route.ts` — `withObservability`, standard errors, event logging (order.created, transaction.replayed, transaction.idempotency_conflict), fail-after-commit for Telegram
4. `src/app/api/orders/contact/route.ts` — `withObservability`, safe logging (no phone number), standard errors
5. `src/app/api/transactions/route.ts` — `withObservability`, `updateActor`, standard errors, event logging (transaction.created, transaction.replayed, transaction.idempotency_conflict)
6. `src/app/api/transactions/[id]/route.ts` — `withObservability`, `updateActor`, standard errors, event logging (status_changed, status_noop, amount_changed, marketplace_changed, atomic_conflict, deleted)
7. `src/app/api/transactions/preview/route.ts` — `withObservability`, standard errors, event logging (transaction.preview)
8. `src/app/api/auth/login/route.ts` — `withObservability`, standard errors, event logging (auth.login_success, auth.login_failed)
9. `src/app/api/auth/register/route.ts` — `withObservability`, standard errors, event logging (auth.register)
10. `src/app/api/auth/logout/route.ts` — `withObservability`, standard errors, event logging (auth.logout)
11. `src/app/api/auth/me/route.ts` — `withObservability`, standard errors
12. `src/app/api/customers/route.ts` — `withObservability`, `updateActor`, standard errors, event logging (customer.created)
13. `src/app/api/customers/lookup/route.ts` — `withObservability`, standard errors, event logging (customer.lookup)
14. `src/app/api/customers/[id]/route.ts` — `withObservability`, `updateActor`, standard errors
15. `src/app/api/customers/stats/route.ts` — `withObservability`, `updateActor`, standard errors

### New test file (1):
1. `tests/observability/phase3-observability.test.ts` — 36 tests covering all 14 required test cases

### Configuration change (1):
1. `.env` — Added `TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true` (dev-only flag for webhook testing; production sets `NODE_ENV=production` which requires `TELEGRAM_WEBHOOK_SECRET`)

### No Prisma schema changes.
### No new dependencies.

---

## 8. Verification Results

| Check | Command | Result |
|-------|---------|--------|
| ESLint | `bun run lint` | **PASS** (0 errors, 0 warnings) |
| Prisma Validate (SQLite) | `npx prisma validate --schema prisma/schema.sqlite.prisma` | **PASS** (valid) |
| Prisma Validate (PostgreSQL) | `DATABASE_URL=postgresql://... npx prisma validate --schema prisma/schema.postgres.prisma` | **PASS** (valid) |
| Non-mutating production build | `DATABASE_URL=file:./db/custom.db bun run build` | **PASS** (exit 0) |
| Phase 3 tests | `bun test tests/observability/phase3-observability.test.ts` | **PASS** (36/36) |
| Full test suite (regression) | `bun test tests/` | **PASS** (145/145, 0 failures) |
| Browser verification (homepage) | Agent Browser | **PASS** (renders, no console errors) |

---

## 9. Backlog (Non-blocking)

| ID | Item | Priority |
|----|------|----------|
| B-1 | Formalize `ATOMIC_CONFLICT` as an explicit HTTP status code (currently maps to 500; could be 409 Conflict for retry semantics) | Low |
| B-2 | Add structured logging to remaining routes not covered in Phase 3 scope (testimonials, announcements, marketplaces, payment-types, seo/*, partners, notifications, dashboard, owner/profile, partner/profile, site-config, orders/track) | Medium |
| B-3 | Add a `/api/admin/reconcile` UI in the owner dashboard for at-a-glance drift monitoring | Low |
| B-4 | Consider a notification (Telegram) when reconciliation detects DRIFT, so operators are proactively alerted | Low |
| B-5 | PostgreSQL runtime validation of reconciliation (groupBy with Decimal sums may differ from SQLite Float sums in edge cases) | Medium (staging task) |
| B-6 | The `captureLogsFromServer` test helper reads dev.log by byte offset; if the dev.log is rotated or truncated mid-test, the helper may miss logs. Acceptable for test env; not a production concern. | Low |
| B-7 | Customer stats reconciliation (Phase 2 backlog item B-7) — same read-only pattern as partner reconciliation, deferred to a future phase | Low |
| B-8 | Consider adding a `transaction.rollback` event when `db.$transaction` throws and rolls back (currently only `transaction.atomic_conflict` is emitted for the conditional-update failure case) | Low |

---

## 10. Final Verdict

### **PHASE 3 SQLITE PASS**

**Justification:**
- All 14 required test cases pass (36 tests total in the Phase 3 suite).
- All 109 pre-existing tests continue to pass (145 total, 0 failures).
- ESLint clean (0 errors, 0 warnings).
- Prisma schema valid for both SQLite and PostgreSQL.
- Non-mutating production build succeeds (exit 0).
- No Prisma schema changes (Phase 3 is observability-only).
- No new dependencies.
- No business features added.
- No UI redesign.
- No production database accessed.
- Browser verification confirms the site renders correctly with no console errors.

**Scope labels:**
- **SQLITE TESTED** — all HTTP integration tests ran against real Prisma SQLite.
- **POSTGRESQL STATIC-COMPATIBLE** — schema validated; runtime validation deferred to staging (Decimal vs Float rounding in reconciliation groupBy sums is the primary item to verify).

**Production deployment notes:**
- Set `TELEGRAM_WEBHOOK_SECRET` (the `TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true` flag in `.env` is dev-only and ignored when `NODE_ENV=production`).
- The reconciliation endpoint (`/api/admin/reconcile`) is owner-only — verify your auth middleware covers it in production.
- The health endpoints (`/api/health`, `/api/ready`) are public — safe for load balancer probes.
- Structured logs are emitted to stdout — configure your log aggregator (CloudWatch, Datadog, etc.) to parse JSON lines with `event` field for alerting.
