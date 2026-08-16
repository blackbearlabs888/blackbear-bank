# BLACK BEAR — PHASE 2 TRANSACTION INTEGRITY

## Schema Proposal (STOP-AT-PROPOSAL per governance rules 13–14)

**Document type:** Phase 2 transaction-integrity audit + schema proposal
**Author:** Backend Architect (Z.ai Code)
**Date:** Phase 2 cycle
**Scope:** Transaction creation/mutation/snapshot/idempotency domain ONLY
**Verdict (final):** `SCHEMA APPROVAL REQUIRED`

---

## 0. Executive Summary

A complete trace of every transaction-creating and transaction-mutating code path was performed against actual source code (read-only, no edits). The trace confirms that **Phase 2 goals #3 (Snapshot) and #6 (Idempotency) cannot be satisfied with the existing Prisma schema**. Per Phase 2 governance rules 13 and 14, this document is a STOP-AT-PROPOSAL: no schema changes are implemented, no code changes are made, and approval is required before any Phase 2 implementation begins.

The proposal adds **6 nullable fields** to the existing `Transaction` model (no new models, no new relations, no breaking changes to existing columns). All existing rows remain valid. Backfill, rollback, and PostgreSQL compatibility are specified. A separate, optional, schema-independent workstream (atomicity, FSM, single fee source, Telegram parity, preview discount fix) is documented in §4.4 for the user to approve in parallel or after schema approval.

**No code was modified in the production of this proposal.** The dev server remains untouched. SQLite is the only runtime test target evaluated. PostgreSQL is reviewed statically only.

---

## 1. Current Flow Map

Sourced from actual source files in `/home/z/my-project/src/`. Line numbers are accurate as of the audit timestamp.

### 1.1 Transaction creation paths

| Flow | Entry Point | Calculation Function | DB Mutation | Stats Mutation |
|------|-------------|----------------------|-------------|----------------|
| Public order create | `POST /api/orders` (`src/app/api/orders/route.ts:21-354`) | Calls `calculatePaymentFee` (L181); **inlines** `partnerProfit = paymentFee * partnerRate/100` (L244-245); **does NOT apply** `paymentType.discountPercent/discountNominal/minTransaction` | `customer.update` (L201), `transaction.create` (L251), `notification.create` (L276) — sequential, NOT atomic | `customer.totalVolume/totalTransactions` incremented at L210-211 inside the same `customer.update` upsert; partner stats NOT incremented at create (deferred to status→success in PATCH) |
| Owner create transaction | `POST /api/transactions` (`src/app/api/transactions/route.ts:135-445`) | Calls `calculatePaymentFee` (L251) + inlines discount (L264-279) + calls `calculateMarginBreakdown` (L280); inlines marketplace fee (L218-225) | `customer.create` or `customer.update` (L307/L321), `transaction.create` (L340), `customer.update` for stats (L369), `notification.create` (L385) — sequential, NOT atomic | Customer stats incremented at creation regardless of status (L369-375); partner stats NOT incremented at creation (deferred) |
| Partner create transaction | Same `POST /api/transactions` (role=partner branch, status defaults to `'pending'`) | Same as owner path | Same as owner path | Same as owner path |
| Preview | `POST /api/transactions/preview` (`src/app/api/transactions/preview/route.ts:6-137`) | Calls `calculatePaymentFee` (L72) + `calculateMarginBreakdown` (L84); **does NOT apply discount** | None (read-only) | None |

### 1.2 Transaction mutation paths

| Flow | Entry Point | Calculation Function | DB Mutation | Stats Mutation |
|------|-------------|----------------------|-------------|----------------|
| Transaction PATCH | `PATCH /api/transactions/[id]` (`src/app/api/transactions/[id]/route.ts:110-663`) | Status block L186-222; partnerId block L233-275 (inlines `partnerProfit = currentNetMargin * partnerRate/100`); nominal block L278-366 (inlines `calculatePaymentFee` formula — DUP-1); marketplace-only block L371-406 (inlines margin breakdown); marketplace+nominal block L410-450 (inlines margin breakdown again); discount block L453-528 (inlines fee calc again — DUP-2, with double-discount flaw); final `transaction.update` L531 | Up to 4× `db.partner.update` (L204, L213, L242, L257, L265), 1× `db.customer.update` (L349), 1× `db.partner.update` volumeDiff (L358), 1× `transaction.update` (L531), 1× `notification.create` (L547) — ALL sequential, NOT atomic | Partner stats reversed/applied on status success↔non-success (L204-219), on partnerId change (L242-268), on nominal change while success (L358-363); customer stats adjusted on nominal change (L349-354) |
| Transaction DELETE | `DELETE /api/transactions/[id]` (`src/app/api/transactions/[id]/route.ts:666-737`) | None | `customer.update` decrement (L702), `partner.update` decrement if was success (L712), `transaction.delete` (L722) — sequential, NOT atomic | Customer stats decremented unconditionally; partner stats decremented only if was success |
| Partner-to-owner note append | `PATCH /api/notifications` (`src/app/api/notifications/route.ts:276-295`) | None | Read-modify-write of `transaction.notes` (L281 read, L291 update) | None |

### 1.3 Telegram-initiated mutations

| Flow | Entry Point | Calculation Function | DB Mutation | Stats Mutation |
|------|-------------|----------------------|-------------|----------------|
| Telegram `/status` | `src/app/api/telegram/webhook/route.ts:287-316` | None | `transaction.update` (status only) | **NONE — silently skips the partner-stats reverse/apply that PATCH performs** |
| Telegram `/nominal` | `src/app/api/telegram/webhook/route.ts:319-376` | Inlines fee calc (DUP-3): uses `amount > threshold` (strict) vs canonical `nominal >= threshold` (inclusive); uses ratio-preservation (`ownerProfit/oldNominal`) instead of `calculateMarginBreakdown`; **does NOT apply discount**; **no `feePercent > 100` normalization guard** | Single `transaction.update` (L357) | **NONE — does NOT update customer.totalVolume or partner.totalVolume that PATCH performs** |
| Telegram `/mp` | `src/app/api/telegram/webhook/route.ts:429-513` | Inlines margin breakdown (not calling `calculateMarginBreakdown`) | Single `transaction.update` (marketplaceId, platformFee, netMargin, partnerProfit, ownerProfit) | None (correct — marketplace change does not affect volume/profit stats) |
| Telegram `/catatan` | `src/app/api/telegram/webhook/route.ts:379-401` | None | `transaction.update` (notes) — **OVERWRITES notes, destroying appended partner-to-owner messages** | None |
| Telegram `/link` | `src/app/api/telegram/webhook/route.ts:404-427` | None | `transaction.update` (transactionLink) | None |

### 1.4 Statistics & analytics read paths

| Endpoint | Source | Status filter applied? |
|----------|--------|------------------------|
| `GET /api/dashboard` (owner totalTransactions) | `db.transaction.count()` LIVE | None — counts ALL statuses |
| `GET /api/dashboard` (owner totalVolume) | `db.transaction.aggregate({_sum: nominal})` LIVE | None — includes failed/pending |
| `GET /api/dashboard` (owner totalProfit) | `db.transaction.aggregate({_sum: ownerProfit})` LIVE | None — includes failed/pending |
| `GET /api/dashboard` (topPartners, partnersCloseToTarget) | `partner.totalProfit/totalVolume` DENORMALIZED | Implicit success-only (counter is only bumped on success) |
| `GET /api/dashboard` (partner view: totalVolume, totalProfit) | `partner.totalProfit/totalVolume` DENORMALIZED | Implicit success-only |
| `GET /api/transactions/analytics` | `db.transaction.findMany({status:'success'})` LIVE | success-only |
| `GET /api/partners/stats` | `sum(partner.totalProfit/totalVolume/totalTransactions)` DENORMALIZED | Implicit success-only |
| `GET /api/customers/stats` | `customer.totalVolume/totalTransactions` DENORMALIZED | None — counter is bumped at creation regardless of status |
| `GET /api/marketplaces/stats`, `GET /api/payment-types/stats` | LIVE from Transaction rows | success-only |
| Partner dashboard front-end (`src/app/partner/dashboard/transactions/page.tsx:157-209`) | `sum(tx.partnerProfit)` LIVE 30-day | None |

### 1.5 Existing atomicity, idempotency, FSM state

- **`prisma.$transaction(` usage across `/home/z/my-project/src`:** **zero matches.** Every multi-write operation is a sequence of independent `await` calls.
- **Idempotency-key handling:** **zero matches** for `idempotency|Idempotency-Key|clientToken|requestId` across the codebase. `orderId` is server-generated per request (`generateOrderId()` in `src/lib/auth/index.ts:179-183`), so retries always create new rows.
- **Status transition validator:** **none.** Each endpoint performs its own ad-hoc `validStatuses.includes(status)` membership check (e.g., `src/app/api/transactions/[id]/route.ts:186-194`, `src/app/api/telegram/webhook/route.ts:287-316`). No `canTransition(from, to)` function exists.

---

## 2. Confirmed Integrity Risks

Verified against actual source. Each risk is labeled with severity and the exact code location.

### R1 — CRITICAL: Zero `$transaction` usage → partial-failure drift
Every multi-write flow (public order create, owner/partner create, PATCH, DELETE, Telegram mutations) issues independent `await db.*.update(...)` calls. If any intermediate write fails (network blip, DB timeout, process restart), the database is left in a partially-applied state with no automatic rollback.

**Examples:**
- `POST /api/orders` (`src/app/api/orders/route.ts:201,251,276`): if `transaction.create` succeeds but `notification.create` throws, the customer has been stats-incremented and the transaction exists, but the owner is never notified.
- `PATCH /api/transactions/[id]` (`src/app/api/transactions/[id]/route.ts:204,531`): if the partner-stats `increment` succeeds but the subsequent `transaction.update` fails, the partner counter is bumped but the transaction row still shows the old status — double-count on next read.
- `DELETE /api/transactions/[id]` (`src/app/api/transactions/[id]/route.ts:702,712,722`): if stat decrements commit but `transaction.delete` fails, customer/partner stats are permanently understated.

### R2 — CRITICAL: Telegram bypasses partner/customer stats accounting
`/status` (`src/app/api/telegram/webhook/route.ts:287-316`) and `/nominal` (L319-376) directly mutate the Transaction row **without** performing the partner-stats reverse/apply or customer-stats adjustment that the PATCH endpoint performs. This means:
- Marking a transaction `success` via Telegram does NOT increment `partner.totalProfit`/`partner.totalVolume`, but marking it `success` via PATCH does. Partner leaderboards drift.
- Changing nominal via Telegram does NOT update `customer.totalVolume` or `partner.totalVolume` (for success-status transactions), but PATCH does. Customer volume drifts.

### R3 — CRITICAL: No idempotency on public order create
`POST /api/orders` (`src/app/api/orders/route.ts:21-354`) has rate-limit + honeypot but no replay protection. A mobile-network retry creates a second Transaction row with a new server-generated `orderId` and double-increments `customer.totalVolume`/`totalTransactions`. The schema's `orderId @unique` constraint does not help because `orderId` is server-generated per request.

### R4 — HIGH: Fee formula duplicated in 5+ places with divergences
Canonical: `src/lib/auth/index.ts:186-227` (`calculatePaymentFee` + `calculateMarginBreakdown`).
Inline copies:
- `src/app/api/transactions/[id]/route.ts:300-317` (nominal recompute) — DUP-1, identical logic
- `src/app/api/transactions/[id]/route.ts:467-490` (discount recompute) — DUP-2, with double-discount flaw when `updateData.paymentFee` is already set
- `src/app/api/telegram/webhook/route.ts:338-368` (handleNominal) — DUP-3, diverges: uses `amount > threshold` (strict) vs canonical `nominal >= threshold` (inclusive); uses ratio-preservation vs recomputation; skips discount; no `feePercent > 100` normalization
- `src/app/order/page.tsx:1210-1258` (client preview) — DUP-4, display-only
- `src/app/partner/dashboard/transactions/page.tsx:627-673` (partner dashboard preview) — DUP-5, hardcodes `platformFee = 0`

### R5 — HIGH: Preview endpoint omits discount
`POST /api/transactions/preview` (`src/app/api/transactions/preview/route.ts:6-137`) calls `calculatePaymentFee` and `calculateMarginBreakdown` but **does not apply** `paymentType.discountPercent`/`discountNominal`/`minTransaction`. The user sees a higher `paymentFee` and lower `totalReceived` than what `POST /api/transactions` will actually persist. Violates Phase 2 Step 2: "Preview result harus identik dengan persisted transaction result untuk input yang sama."

### R6 — HIGH: No status transition validation
No `canTransition(from, to)` function exists. Each endpoint performs membership-only validation. This allows semantically invalid transitions:
- `success → pending` (with no stat reversal unless status block runs)
- `failed → success` (allowed, but creates accounting asymmetry between PATCH and Telegram paths)
- `pending → success` (skips `verification`/`process` — business flow undocumented)
- Same-status retry: PATCH at L186-194 re-runs all stat logic if `status` is set to the current value (the `wasSuccess/willBeSuccess` check at L199-200 detects this case correctly and skips stats, but it is implicit, not enforced by a central validator).

### R7 — HIGH: `partner.totalTransactions` is an orphan field
Defined in `prisma/schema.prisma:65`, read by `/api/partners/stats/route.ts:46` and `/api/transactions/analytics/route.ts:236`, but **never written** anywhere in the codebase (grep across `/home/z/my-project/src` returns zero `totalTransactions` mutations on Partner). Always 0 in production. Either remove from API responses or wire up.

### R8 — MEDIUM: Mixed live + denormalized analytics produce inconsistent numbers
Three different definitions of "total profit":
- Owner dashboard (`/api/dashboard/route.ts:92-94`): LIVE sum of `ownerProfit` across ALL statuses (includes failed/pending)
- Partner dashboard (`/api/dashboard/route.ts:629`): DENORMALIZED `partner.totalProfit` (success-only)
- Analytics endpoint (`/api/transactions/analytics/route.ts:46-260`): LIVE sum filtered `status:'success'`

The owner's `totalProfit` will always be ≥ the sum of partner profits shown in leaderboards. There is no reconciliation job that recomputes `partner.totalProfit`/`partner.totalVolume` from Transaction rows.

### R9 — MEDIUM: PATCH discount block double-discount flaw
`src/app/api/transactions/[id]/route.ts:467-490`: when `updateData.paymentFee` is already set (from the prior nominal block at L300-317), the discount block reuses it as `originalFee`, then computes `discountAmount = originalFee * pct/100` and `paymentFee = originalFee - discountAmount`. The result is the discounted fee being discounted again. Reproduction: PATCH with `nominal=X` and `discountPercent=10` in the same request → paymentFee is discounted twice.

### R10 — MEDIUM: `/catatan` Telegram command overwrites notes
`src/app/api/telegram/webhook/route.ts:379-401` overwrites `transaction.notes` entirely, while `/api/notifications/route.ts:276-295` (partner-to-owner message) appends. If a partner sends a message and then the owner uses `/catatan` to set a note, the partner's message is destroyed. Read-modify-write race also exists in the append path.

### R11 — MEDIUM: No negative-counter guard
Customer `totalTransactions` and partner `totalProfit`/`totalVolume` use Prisma `{ decrement: N }` without any guard. If a transaction is deleted twice (race), or if a `decrement` runs without a prior `increment` (data drift from R2), counters can go negative. No `Math.max(0, ...)` reconciliation exists.

### R12 — LOW: Customer stats bumped at creation regardless of status
`POST /api/transactions` (`src/app/api/transactions/route.ts:369-375`) increments `customer.totalVolume`/`totalTransactions` at creation time, even for transactions that will end up `failed`. This is internally consistent with the owner dashboard (which sums all statuses), but inconsistent with the analytics endpoint and partner stats (which are success-only). Business rule is undocumented.

---

## 3. Formula Golden Master (proposed test cases, not yet implemented)

Before any consolidation of the fee function (R4), golden-master tests MUST be written against the **current** canonical function output to lock in the existing behavior. The proposal is to add a test file `tests/transaction/fee-golden-master.test.ts` with the cases below. These tests run against the existing `calculatePaymentFee` + `calculateMarginBreakdown` in `src/lib/auth/index.ts` and produce a baseline that any refactor must satisfy.

**Label: SQLITE TESTED (proposed)** — pure-function unit tests; no DB required.

| # | Case | Input | Expected (current behavior) | Notes |
|---|------|-------|------------------------------|-------|
| G1 | Percent fee, online, above threshold | nominal=2_000_000, onlineFeePercent=0.8, onlineFeeFlat=5000, threshold=1_000_000, method=Online | paymentFee = 16_000 | `2_000_000 * 0.8/100` |
| G2 | Flat fee, online, below threshold | nominal=500_000, onlineFeePercent=0.8, onlineFeeFlat=5000, threshold=1_000_000, method=Online | paymentFee = 5000 | flat branch |
| G3 | Threshold boundary (inclusive) | nominal=1_000_000, onlineFeePercent=0.8, onlineFeeFlat=5000, threshold=1_000_000, method=Online | paymentFee = 8000 | canonical uses `>=`, so percent branch |
| G4 | COD method | nominal=2_000_000, codFeePercent=1.0, codFeeFlat=10000, threshold=1_000_000, method=COD | paymentFee = 20_000 | uses codFeePercent |
| G5 | feePercent > 100 normalization | nominal=2_000_000, onlineFeePercent=8000, onlineFeeFlat=0, threshold=1_000_000, method=Online | paymentFee = 16_000 | `8000/1000=8%`; 2_000_000 * 8/100 |
| G6 | Discount percent (POST `/api/transactions` flow) | nominal=2_000_000, originalFee=16_000, discountPercent=10, minTransaction=500_000 | paymentFee = 14_400, discountAmount = 1_600 | `16_000 * 10/100 = 1_600`; `16_000 - 1_600 = 14_400` |
| G7 | Discount nominal | nominal=2_000_000, originalFee=16_000, discountNominal=2000, minTransaction=500_000 | paymentFee = 14_000, discountAmount = 2_000 | nominal discount |
| G8 | Discount skipped below minTransaction | nominal=400_000, originalFee=5000 (flat), discountPercent=10, minTransaction=500_000 | paymentFee = 5000, discountAmount = 0 | minTransaction gate |
| G9 | Marketplace fee | nominal=2_000_000, marketplace.feePercent=5, marketplace.feeFlat=0, paymentFee=14_400 | platformFee = 100_000, netMargin = -85_600 | `2_000_000 * 5/100 = 100_000` |
| G10 | Partner commission | netMargin=10_000, partnerRate=30 | partnerProfit = 3_000, ownerProfit = 7_000 | `calculateMarginBreakdown` |
| G11 | No partner | netMargin=10_000, partnerRate=0 | partnerProfit = 0, ownerProfit = 10_000 | |
| G12 | Marketplace feePercent > 100 normalization | nominal=2_000_000, marketplace.feePercent=5000, marketplace.feeFlat=0 | platformFee = 100_000 | `5000/1000=5%` |
| G13 | Preview vs persisted parity | Same inputs to `POST /api/transactions/preview` and `POST /api/transactions` | Identical `paymentFee`, `originalFee`, `discountAmount`, `platformFee`, `netMargin`, `partnerProfit`, `ownerProfit`, `totalReceived` | **Currently FAILS** due to R5 (preview omits discount) — this is the regression target |
| G14 | Rounding boundary | nominal=1_500_555, onlineFeePercent=0.825, threshold=1_000_000, method=Online | paymentFee = 12_380 (current: no explicit rounding — `1_500_555 * 0.825/100 = 12_379.578...` → JS keeps float) | Documents current rounding behavior: **no explicit rounding in canonical function**. Persists as float in SQLite, as Decimal in PostgreSQL. **Rounding rule documentation needed** (see §4.3). |

**Label: REQUIRES POSTGRES RUNTIME VALIDATION** — G14 specifically, because SQLite stores `Float` and PostgreSQL stores `Decimal`; the persisted value may differ by sub-cent rounding. Cannot be validated in this sandbox.

---

## 4. Proposed Architecture

### 4.1 Overview

The proposal splits Phase 2 implementation into two workstreams:

- **Workstream A — Schema-dependent** (BLOCKED on approval): Snapshot fields (Step 3) and idempotency fields (Step 6). Cannot proceed without new columns.
- **Workstream B — Schema-independent** (can proceed in parallel or before): Single fee source (Step 2), status FSM (Step 4), atomic stats mutation (Step 5), Telegram parity, preview discount fix, partner-stats-on-Telegram fix. None of these require schema changes.

Both workstreams are described below. The user may approve A only, B only, or both. The final verdict reflects that A is blocked pending approval.

### 4.2 Status transition rules (Step 4)

Documented from actual business flow observed in the codebase. No new transitions invented.

```
pending → verification   (owner action)
pending → process        (owner action, skips verification)
pending → failed         (owner action, rejection)
pending → success        (owner action, fast-track — currently allowed by code, retained)
verification → process   (owner action)
verification → failed    (owner action, rejection)
verification → success   (owner action, fast-track — currently allowed, retained)
process → success        (owner action, completion)
process → failed         (owner action, failure)
success → failed         (owner action, reversal — currently allowed, retained)
failed → success         (owner action, re-open — currently allowed, retained)
success → pending        (NOT documented in business flow, currently allowed by code — DISALLOW in FSM)
failed → pending         (NOT documented, currently allowed — DISALLOW in FSM)
any → same any           (no-op, idempotent — must not double-increment)
```

**Rationale for disallowing `success → pending` and `failed → pending`:** No business flow observed in the codebase resets a transaction back to `pending`. The PATCH endpoint's nominal-edit guard at L160-167 already restricts edits to `pending`/`verification` status, which implies that once a transaction moves past `verification`, it cannot be reset. The FSM codifies this implicit rule.

**Rationale for retaining `failed → success` and `success → failed`:** Both are currently allowed by the code (membership-only validation). The PATCH endpoint's stat-reversal logic at L211-219 handles `success → non-success` reversal. Disallowing these would change business behavior, violating governance rule 4 ("Jangan mengubah business policy tanpa bukti"). Retained as-is.

**Central validator** (proposed, schema-independent, Workstream B):
- New file: `src/lib/transaction/status-machine.ts`
- Export: `canTransition(from: TransactionStatus, to: TransactionStatus): boolean`
- Export: `assertTransition(from, to): void` (throws on invalid)
- Used by: `PATCH /api/transactions/[id]`, `POST /api/telegram/webhook` (handleStatus), and any future status-mutating endpoint
- Same-status retry: `canTransition(x, x)` returns `true` (no-op), but the stats-apply logic guards on `wasSuccess !== willBeSuccess` to avoid double-increment

### 4.3 Rounding rule documentation (Step 2)

The current canonical function (`src/lib/auth/index.ts:186-227`) does NOT apply explicit rounding. Intermediate calculations use JS `number` (IEEE 754 double). Persisted values are `Float` in SQLite (real) and `Decimal` in PostgreSQL.

**Documented current behavior (no change proposed):**
- `paymentFee`, `originalFee`, `discountAmount`, `platformFee`, `netMargin`, `partnerProfit`, `ownerProfit`, `totalReceived` are stored as `Float` in SQLite. Sub-cent precision is preserved.
- Display layer (`src/lib/utils.ts` `formatCurrency`) rounds to integer Rupiah for display only.
- The Telegram `/nominal` handler uses `Math.round(amount * profitRatio)` (L353-354) — this is a divergence, not the canonical behavior.

**Proposed rule for the consolidated fee function (Workstream B):**
- Keep JS `number` for intermediate calculation (do not introduce explicit rounding that would change persisted values for existing flows — governance rule 3, "Jangan mengubah nilai transaksi lama").
- Document in JSDoc that the function returns unrounded `number` and that persistence layer stores as-is.
- The Telegram `/nominal` `Math.round` divergence is REMOVED — the consolidated function recomputes via `calculateMarginBreakdown` and stores the unrounded value, matching PATCH behavior.

**Label: REQUIRES POSTGRES RUNTIME VALIDATION** — Sub-cent behavior under PostgreSQL `Decimal` cannot be validated in this SQLite-only sandbox. The static schema review (§10) confirms the field types match, but runtime parity is a staging-validation item.

### 4.4 Implementation plan

#### Workstream A — Schema-dependent (BLOCKED on approval; not implemented)

**A1. Snapshot fields on `Transaction`** (see §7 for exact field list)
- Add 5 fields: `partnerCommissionPercent`, `paymentTypeName`, `marketplaceName`, `feeConfigSnapshot`, `calculationVersion`
- Backfill existing rows per §7.4
- Update write paths (`POST /api/orders`, `POST /api/transactions`, `PATCH /api/transactions/[id]` nominal/marketplace/discount blocks, Telegram `/nominal`/`/mp`) to populate snapshot fields at creation/mutation time
- Update read paths (dashboard, transaction detail, analytics) to fall back to live relation when snapshot is NULL (legacy rows)
- `calculationVersion` gates the read-path fallback: `0` = legacy (use live relation), `1` = Phase 2 (use snapshot)

**A2. Idempotency fields on `Transaction`** (see §8 for exact field list)
- Add 2 fields: `idempotencyKey`, `idempotencyHash`
- Add `@unique` on `idempotencyKey`
- Update `POST /api/orders` and `POST /api/transactions` to accept `X-Idempotency-Key` header + payload hash; on conflict, return existing transaction (same hash) or 409 (different hash)
- Legacy rows: NULL idempotencyKey (no replay protection for pre-Phase 2 transactions)

#### Workstream B — Schema-independent (can proceed; not implemented in this STOP-AT-PROPOSAL)

**B1. Single fee calculation source** (Step 2)
- Create `src/lib/transaction/fee.ts` (new file)
- Export: `calculateTransaction(input) => TransactionCalculation` returning all 11 fields (nominal, originalFee, discountPercent, discountAmount, paymentFee, platformFee, netMargin, partnerCommissionPercent, partnerProfit, ownerProfit, totalReceived)
- Internally calls existing `calculatePaymentFee` + `calculateMarginBreakdown` + new discount logic + marketplace fee logic
- Replace all 5 inline copies (DUP-1 through DUP-5 server-side; DUP-4/DUP-5 client-side remain as display preview, but call the same function via a thin API route if needed)
- Golden-master tests (§3) lock in current behavior before refactor

**B2. Status state machine** (Step 4)
- Create `src/lib/transaction/status-machine.ts` (new file)
- Export `canTransition`, `assertTransition`, `ALLOWED_TRANSITIONS` map
- Wire into `PATCH /api/transactions/[id]` status block and Telegram `handleStatus`
- Same-status retry becomes explicit no-op (early return after `assertTransition`)

**B3. Atomic stats mutation** (Step 5)
- Wrap every multi-write flow in `prisma.$transaction(async (tx) => { ... })`
- Replace 4 independent `db.partner.update` calls in PATCH with a single aggregate delta applied inside the transaction
- Replace 3-step DELETE sequence with single `$transaction`
- Replace 4-step POST create sequence with single `$transaction`
- Add negative-counter guard: `Math.max(0, current + delta)` via raw SQL or read-then-write inside the transaction (SQLite does not support `GREATEST(0, ...)` natively in Prisma; use interactive transaction with `findUnique` first)
- Same-status retry: guard with `if (existingTransaction.status === newStatus) return existingTransaction;` BEFORE any stat logic
- Delete success transaction: reversal runs exactly once because the transaction row is deleted inside the same `$transaction` (a second delete attempt would 404)

**B4. Telegram parity** (Step 4/5)
- `handleStatus`: call the same `assertTransition` + same stats reverse/apply logic as PATCH (extracted to a shared `applyStatusTransition(tx, existingTransaction, newStatus)` helper)
- `handleNominal`: call the consolidated `calculateTransaction` function (B1); apply customer/partner stats adjustments inside `$transaction`
- `handleMarketplace`: call `calculateMarginBreakdown` (or the consolidated function)
- `handleCatatan`: change to APPEND (with timestamp prefix) to match `/api/notifications` partner-message flow; OR document that `/catatan` is owner-only and intentionally overwrites — needs business clarification (backlog item B-4 in §12)

**B5. Preview discount fix** (Step 2)
- `POST /api/transactions/preview`: apply `paymentType.discountPercent`/`discountNominal`/`minTransaction` to match `POST /api/transactions`
- Add regression test G13 (§3)

**B6. Orphan field cleanup** (R7)
- Either wire up `partner.totalTransactions` increment/decrement in the same `$transaction` as partner stats, OR remove the field from API responses in `/api/partners/stats` and `/api/transactions/analytics`
- Recommendation: wire it up (symmetric with `partner.totalProfit`/`totalVolume`), but flag as backlog because it does not affect Phase 2 transaction integrity directly

### 4.5 What is NOT in scope

Per governance rules 1, 2, 5, 6, 15:
- No UI redesign
- No fee formula changes (golden-master tests lock in current behavior)
- No microservices
- No large refactor (Workstream B is targeted patches, not a rewrite)
- No changes outside the transaction domain

---

## 5. Status Transition Rules (Step 4 detail)

See §4.2 for the full transition table. This section documents the implementation contract.

### 5.1 Central validator

```ts
// src/lib/transaction/status-machine.ts (PROPOSED, not implemented)

export type TransactionStatus = 'pending' | 'verification' | 'process' | 'success' | 'failed';

export const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  pending:     ['verification', 'process', 'success', 'failed'],
  verification:['process', 'success', 'failed', 'pending'], // pending allowed for owner correction
  process:     ['success', 'failed'],
  success:     ['failed'],                                   // reversal
  failed:      ['success', 'process'],                       // re-open
};

export function canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  if (from === to) return true; // idempotent no-op
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: TransactionStatus, to: TransactionStatus): void {
  if (!canTransition(from, to)) {
    throw new TransitionError(`Invalid status transition: ${from} → ${to}`);
  }
}
```

### 5.2 Stats-apply contract

For any status transition, the stats-apply logic MUST be:
1. `assertTransition(oldStatus, newStatus)` — throws if invalid
2. If `oldStatus === newStatus` → return existing transaction (no-op, no stats touch)
3. If `oldStatus === 'success' && newStatus !== 'success'` → reverse partner stats ONCE (decrement `totalProfit` by `tx.partnerProfit`, decrement `totalVolume` by `tx.nominal`)
4. If `oldStatus !== 'success' && newStatus === 'success'` → apply partner stats ONCE (increment by same amounts)
5. If neither was success nor will be success → no stats change
6. All of the above inside `prisma.$transaction` with the `transaction.update`

### 5.3 Telegram parity contract

`handleStatus` in `src/app/api/telegram/webhook/route.ts` MUST call the same shared `applyStatusTransition(existingTransaction, newStatus)` helper used by PATCH. This eliminates R2 for the status path.

---

## 6. Atomicity Design (Step 5 detail)

### 6.1 Pattern

Every multi-write flow is wrapped in `prisma.$transaction(async (tx) => { ... })` using the **interactive** form (not the array form), because the logic includes conditional reads.

```ts
// PROPOSED pattern (not implemented)
const result = await db.$transaction(async (tx) => {
  // 1. Read current state inside the transaction
  const existing = await tx.transaction.findUniqueOrThrow({ where: { id }, include: { partner: true } });

  // 2. Validate transition
  assertTransition(existing.status, newStatus);

  // 3. No-op short-circuit
  if (existing.status === newStatus) return existing;

  // 4. Compute stat deltas
  const partnerDelta = (existing.partnerId && newStatus === 'success' && existing.status !== 'success')
    ? { totalProfit: existing.partnerProfit, totalVolume: existing.nominal }
    : (existing.partnerId && existing.status === 'success' && newStatus !== 'success')
    ? { totalProfit: -existing.partnerProfit, totalVolume: -existing.nominal }
    : null;

  // 5. Apply all writes inside the transaction
  if (partnerDelta && existing.partnerId) {
    await tx.partner.update({
      where: { id: existing.partnerId },
      data: {
        totalProfit: { increment: partnerDelta.totalProfit },
        totalVolume: { increment: partnerDelta.totalVolume },
      },
    });
  }

  return tx.transaction.update({ where: { id }, data: { status: newStatus } });
});
```

### 6.2 Negative-counter guard

Prisma's `{ increment: N }` and `{ decrement: N }` do not support `GREATEST(0, current + N)` semantics directly. The guard is implemented inside the interactive transaction:

```ts
// PROPOSED guard (not implemented)
if (partnerDelta && existing.partnerId) {
  const partner = await tx.partner.findUniqueOrThrow({ where: { id: existing.partnerId } });
  const newProfit = Math.max(0, toNumber(partner.totalProfit) + partnerDelta.totalProfit);
  const newVolume = Math.max(0, toNumber(partner.totalVolume) + partnerDelta.totalVolume);
  await tx.partner.update({
    where: { id: existing.partnerId },
    data: { totalProfit: newProfit, totalVolume: newVolume },
  });
}
```

**Trade-off:** This is a read-then-write inside a transaction. SQLite uses database-level locks for writes, so the transaction is serialized. PostgreSQL uses MVCC — the read sees the snapshot at transaction start; concurrent transactions updating the same partner row would conflict at commit time and one would retry. **Label: REQUIRES POSTGRES RUNTIME VALIDATION** for the contention behavior under load.

### 6.3 Atomicity matrix

| Flow | Current writes | Proposed single `$transaction` | Stats-inside-tx? |
|------|----------------|--------------------------------|------------------|
| `POST /api/orders` | 3 sequential | Yes — customer upsert + transaction.create + notification.create | Yes (customer stats inside customer upsert) |
| `POST /api/transactions` | 4 sequential | Yes — customer upsert + transaction.create + customer stats + notification.create | Yes |
| `PATCH /api/transactions/[id]` | Up to 7 sequential | Yes — read existing, compute all deltas, apply partner/customer stats + transaction.update + notification.create in one tx | Yes |
| `DELETE /api/transactions/[id]` | 3 sequential | Yes — customer decrement + partner decrement (if was success) + transaction.delete | Yes |
| Telegram `/status` | 1 write (no stats) | Yes — same as PATCH status block (adds stats parity) | Yes |
| Telegram `/nominal` | 1 write (no stats, no discount) | Yes — recompute via consolidated fee function + customer/partner volume diff + transaction.update | Yes |
| Telegram `/mp` | 1 write | Yes — recompute + transaction.update (no stats needed) | N/A |
| Partner-to-owner note append (`/api/notifications`) | Read-modify-write | Yes — read notes + append + update inside tx (eliminates race) | N/A |

---

## 7. Snapshot Design (Step 3 detail)

### 7.1 Required snapshot fields (NEW)

Per Step 3, the snapshot must include payment type identity/name, fee configuration used, marketplace identity/name and fee used, partner commission percent used, discount used (already exists), calculated monetary breakdown (already exists), and calculation version.

**Existing fields that already satisfy the requirement:**
- `nominal` ✓
- `paymentFee` ✓
- `originalFee` ✓
- `discountPercent` ✓
- `discountAmount` ✓
- `platformFee` ✓
- `netMargin` ✓
- `partnerProfit` ✓
- `ownerProfit` ✓
- `totalReceived` ✓

**Existing fields that are FK references but NOT snapshots:**
- `paymentTypeId` — references live PaymentType row (can be renamed/edited)
- `marketplaceId` — references live Marketplace row (can be renamed/edited)
- `partnerId` — references live Partner row (commission can be edited)

### 7.2 Proposed new fields on `Transaction`

```prisma
// Add to model Transaction in BOTH schema.prisma (SQLite) and schema.postgres.prisma

partnerCommissionPercent  Float?   // snapshot of Partner.commission at creation/mutation time
paymentTypeName           String?  // snapshot of PaymentType.name at creation time
marketplaceName           String?  // snapshot of Marketplace.name at creation time (null when no marketplace)
feeConfigSnapshot         String?  // JSON string of fee-input config used at calculation time
calculationVersion        Int      @default(1)  // 0 = legacy pre-Phase 2, 1 = Phase 2 snapshot
```

### 7.3 `feeConfigSnapshot` JSON shape

```json
{
  "paymentType": {
    "onlineFeePercent": 0.8,
    "onlineFeeFlat": 0,
    "codFeePercent": 0,
    "codFeeFlat": 0,
    "threshold": 1000000,
    "discountPercent": 10,
    "discountNominal": 0,
    "minTransaction": 500000
  },
  "marketplace": {
    "feePercent": 5,
    "feeFlat": 0
  }
}
```

Stored as a JSON string (`String?`) for SQLite compatibility (SQLite has no native JSON column type; Prisma treats it as TEXT). PostgreSQL could use `Json` type, but for schema parity between dev and prod, `String?` is used in both, with the value being a JSON-serialized string. Parsing is done in the application layer.

### 7.4 Backfill strategy

Backfill is run on the dev SQLite database (and the production PostgreSQL database at deploy time, AFTER `prisma migrate deploy`). All backfill SQL is idempotent and safe to re-run.

```sql
-- 1. partnerCommissionPercent: snapshot from current partner.commission
UPDATE transactions
SET partnerCommissionPercent = (SELECT commission FROM partners WHERE id = transactions.partnerId)
WHERE partnerId IS NOT NULL AND partnerCommissionPercent IS NULL;

-- 2. paymentTypeName: snapshot from current payment_type.name
UPDATE transactions
SET paymentTypeName = (SELECT name FROM payment_types WHERE id = transactions.paymentTypeId)
WHERE paymentTypeName IS NULL;

-- 3. marketplaceName: snapshot from current marketplace.name (null where no marketplace)
UPDATE transactions
SET marketplaceName = (SELECT name FROM marketplaces WHERE id = transactions.marketplaceId)
WHERE marketplaceId IS NOT NULL AND marketplaceName IS NULL;

-- 4. feeConfigSnapshot: cannot be perfectly reconstructed — leave NULL for legacy rows.
--    Application read-path falls back to live relation when this field is NULL.

-- 5. calculationVersion: mark all existing rows as legacy (0). New rows default to 1.
UPDATE transactions SET calculationVersion = 0 WHERE calculationVersion = 1;
-- Note: this must run BEFORE any Phase 2 write path goes live, so that legacy rows are
-- correctly identified. After Phase 2 deployment, new inserts always set calculationVersion = 1.
```

### 7.5 Nullability for legacy rows

All new fields are nullable (or have a non-null default for `calculationVersion`). Legacy rows have:
- `partnerCommissionPercent = NULL` (or backfilled per §7.4)
- `paymentTypeName = NULL` (or backfilled)
- `marketplaceName = NULL` (or backfilled)
- `feeConfigSnapshot = NULL` (cannot be backfilled)
- `calculationVersion = 0` (legacy marker)

Read-path fallback contract:
- If `paymentTypeName IS NULL` → fall back to `paymentType.name` (live relation)
- If `marketplaceName IS NULL` → fall back to `marketplace.name` (live relation, or "N/A" if `marketplaceId IS NULL`)
- If `partnerCommissionPercent IS NULL` → fall back to `partner.commission` (live relation, or 0 if no partner)
- If `feeConfigSnapshot IS NULL` → no input audit trail; rely on stored monetary breakdown (existing behavior)
- If `calculationVersion = 0` → legacy row; all read paths use Phase 1 behavior (live relations)
- If `calculationVersion >= 1` → Phase 2 row; read paths prefer snapshot fields

### 7.6 Distinguishing legacy vs new snapshot

`calculationVersion` is the discriminator:
- `0` = legacy (pre-Phase 2). May have backfilled name snapshots but no `feeConfigSnapshot`. Behavior unchanged from Phase 1.
- `1` = Phase 2. Full input + output snapshot. Read paths use snapshot fields directly.

Future versions (2, 3, ...) would be introduced only if the calculation logic changes in a backward-incompatible way. The version is set at write time by the consolidated fee function (Workstream B1).

### 7.7 Index requirement

No additional indexes required for snapshot fields. They are write-once-read-many display fields, never queried in WHERE clauses. The existing indexes on `customerId`, `partnerId`, `status` are unchanged.

---

## 8. Idempotency Design (Step 6 detail)

### 8.1 Required idempotency fields (NEW)

Per Step 6, retry requests with the same identity must not create duplicate transactions, and `nominal+phone` is explicitly rejected as identity.

### 8.2 Proposed new fields on `Transaction`

```prisma
// Add to model Transaction in BOTH schema.prisma (SQLite) and schema.postgres.prisma

idempotencyKey   String?  @unique  // client-supplied UUID; NULL for legacy rows and for flows that don't supply a key
idempotencyHash  String?            // SHA-256 hex of canonicalized request payload; NULL when idempotencyKey is NULL
```

### 8.3 Key generation and scope

- **Public order create (`POST /api/orders`)**: client (browser) generates a UUID v4 on form mount, holds it in memory only (NOT localStorage/sessionStorage — governance rule from Phase 1.2 prohibits leaking PII to client storage; an idempotency key is not PII but the same hygiene applies). Sent as `X-Idempotency-Key` header. Scope: globally unique across all transactions (one key = one transaction, regardless of customer).
- **Owner create transaction (`POST /api/transactions`)**: same pattern. The owner's browser generates a UUID per form mount.
- **Partner create transaction (same endpoint)**: same pattern.
- **Telegram mutations**: idempotency NOT applied (Telegram updates existing transactions by `orderId`; the no-op same-status guard in §5 handles status retries).

### 8.4 Flow

```
Client POST /api/orders (or /api/transactions)
  Headers: X-Idempotency-Key: <uuid>
  Body: { ...payload... }

Server:
  1. If X-Idempotency-Key header is missing:
     - For POST /api/orders: REJECT with 400 (public flow must supply a key)
     - For POST /api/transactions: ALLOW (owner/partner may not always supply; backward compat). No replay protection for this request.
  2. If header present:
     a. Compute hash = SHA-256(canonicalize(payload))
     b. Look up transaction by idempotencyKey
     c. If found:
        - If stored.idempotencyHash === hash: return stored transaction (200, idempotent replay)
        - If stored.idempotencyHash !== hash: return 409 Conflict (same key, different payload)
     d. If not found:
        - Proceed with create. Persist idempotencyKey + idempotencyHash on the new row.
        - On unique-constraint violation (race: another request inserted same key first):
          re-read by idempotencyKey and apply step (c).
```

### 8.5 Canonicalization

Payload is canonicalized before hashing to ensure semantically-equivalent requests produce the same hash:
- JSON keys sorted alphabetically (recursive)
- Whitespace normalized
- Numbers normalized (e.g., `nominal` cast to number, `1e6` and `1000000` produce same hash)
- Phone numbers normalized (strip spaces, dashes; `+62` → `0`)
- Strings trimmed

Implementation: a `canonicalizePayload(payload: unknown): string` helper in `src/lib/transaction/idempotency.ts` (PROPOSED, not implemented). Hash via Node `crypto.createHash('sha256').update(canonical).digest('hex')`.

### 8.6 Concurrent-like duplicate handling on SQLite

SQLite uses database-level write locks. Two concurrent `INSERT` requests with the same `idempotencyKey` will serialize: the first acquires the lock, inserts, commits; the second acquires the lock, hits the `@unique` constraint, fails with `P2002`. The handler catches `P2002`, re-reads by `idempotencyKey`, and applies the §8.4(c) logic.

**Limitation:** SQLite's serialization is process-wide. Under PostgreSQL with multiple connections, the same pattern works but the second request may wait on a row lock until the first commits — this is the expected behavior. **Label: REQUIRES POSTGRES RUNTIME VALIDATION** for the contention/timeout behavior.

### 8.7 Backward compatibility

- Existing transactions: `idempotencyKey = NULL`, `idempotencyHash = NULL`. No replay protection. Acceptable: legacy rows are already created.
- Existing API consumers that do not send `X-Idempotency-Key`:
  - `POST /api/orders`: must be updated to send the header. If the existing public order page does not send the header, it will receive 400. **This is a breaking change for the public flow** — mitigation: ship the header-addition to the client in the same deployment as the server enforcement.
  - `POST /api/transactions`: backward compatible (no header → no replay protection, but request still succeeds).

### 8.8 Alternatives considered

- **Server-generated `requestId` from a pre-flight endpoint**: rejected — adds an extra round-trip and a stateful token store, more complex than client-generated UUID.
- **Idempotency via `orderId` client-supplied**: rejected — `orderId` is the public-facing order identifier shown to customers; client-supplied IDs risk collision and predictability.
- **Idempotency via payload hash only (no key)**: rejected — two legitimate same-value transactions (e.g., customer pays the same nominal twice in a day) would be incorrectly deduplicated.

---

## 9. SQLite Tests (Step 7 — planned, not yet run)

Per Output directive, tests are only run if no schema change is needed. Since schema change IS needed, tests are SPECIFIED but NOT RUN. They will be implemented in Workstream A+B after approval.

**File locations (planned):**
- `tests/transaction/fee-golden-master.test.ts` — §3 cases G1–G14
- `tests/transaction/status-stats.test.ts` — §9.B cases
- `tests/transaction/snapshot.test.ts` — §9.C cases
- `tests/transaction/idempotency.test.ts` — §9.D cases

**Label legend:**
- `SQLITE TESTED` — test runs against real SQLite via `bun:test` + PrismaClient
- `POSTGRES STATICALLY REVIEWED` — schema compatibility verified by diff (§10)
- `REQUIRES POSTGRES RUNTIME VALIDATION` — behavior cannot be verified in SQLite sandbox

### 9.A Fee Golden Master

| Test | Case | Label |
|------|------|-------|
| G1 | Percent fee, online, above threshold | SQLITE TESTED |
| G2 | Flat fee, online, below threshold | SQLITE TESTED |
| G3 | Threshold boundary (inclusive `>=`) | SQLITE TESTED |
| G4 | COD method | SQLITE TESTED |
| G5 | `feePercent > 100` normalization | SQLITE TESTED |
| G6 | Discount percent | SQLITE TESTED |
| G7 | Discount nominal | SQLITE TESTED |
| G8 | Discount skipped below `minTransaction` | SQLITE TESTED |
| G9 | Marketplace fee | SQLITE TESTED |
| G10 | Partner commission | SQLITE TESTED |
| G11 | No partner | SQLITE TESTED |
| G12 | Marketplace `feePercent > 100` normalization | SQLITE TESTED |
| G13 | Preview = persisted result (regression target for B5) | SQLITE TESTED |
| G14 | Rounding boundary (sub-cent) | SQLITE TESTED; REQUIRES POSTGRES RUNTIME VALIDATION (Decimal vs Float) |

### 9.B Status and Stats

| Test | Case | Label |
|------|------|-------|
| S1 | `pending → success` increments partner stats once | SQLITE TESTED |
| S2 | `success → success` no-op (same-status retry) | SQLITE TESTED |
| S3 | `success → failed` reverses partner stats once | SQLITE TESTED |
| S4 | `failed → success` increments partner stats once | SQLITE TESTED |
| S5 | Duplicate status PATCH does not double-increment | SQLITE TESTED |
| S6 | Delete success transaction reverses partner+customer stats once | SQLITE TESTED |
| S7 | Delete non-success transaction does NOT reverse partner stats | SQLITE TESTED |
| S8 | Delete non-success transaction DOES reverse customer stats (per current behavior — documented) | SQLITE TESTED |
| S9 | Simulated failure (mock `tx.partner.update` to throw) rolls back ALL writes in `$transaction` | SQLITE TESTED |
| S10 | Counter never negative (attempt to decrement below 0 clamps to 0) | SQLITE TESTED |
| S11 | `success → pending` rejected by FSM | SQLITE TESTED |
| S12 | Telegram `/status success` produces same partner-stats effect as PATCH | SQLITE TESTED |
| S13 | Telegram `/nominal` updates customer+partner volume consistently with PATCH | SQLITE TESTED |

### 9.C Snapshot

| Test | Case | Label |
|------|------|-------|
| P1 | Change `PaymentType.onlineFeePercent` after transaction created → historical `paymentFee`/`originalFee` unchanged | SQLITE TESTED |
| P2 | Change `PaymentType.name` after transaction created → historical `paymentTypeName` snapshot unchanged | SQLITE TESTED |
| P3 | Change `Marketplace.feePercent` after transaction created → historical `platformFee`/`netMargin` unchanged | SQLITE TESTED |
| P4 | Change `Partner.commission` after transaction created → historical `partnerProfit`/`ownerProfit` unchanged; `partnerCommissionPercent` snapshot unchanged | SQLITE TESTED |
| P5 | Legacy row (`calculationVersion = 0`) with NULL snapshot fields → read path falls back to live relation without error | SQLITE TESTED |
| P6 | Phase 2 row (`calculationVersion = 1`) → read path uses snapshot fields, ignores live relation changes | SQLITE TESTED |
| P7 | `feeConfigSnapshot` JSON round-trips correctly through SQLite TEXT storage | SQLITE TESTED |

### 9.D Idempotency

| Test | Case | Label |
|------|------|-------|
| I1 | Same `X-Idempotency-Key` + same payload → returns same transaction (200) | SQLITE TESTED |
| I2 | Same key + different payload → 409 Conflict | SQLITE TESTED |
| I3 | Different key + same payload → creates new transaction (201) | SQLITE TESTED |
| I4 | Concurrent-like duplicate (two simultaneous requests with same key) → only one transaction created; second returns 200 with same row | SQLITE TESTED (serialized by SQLite write lock) |
| I5 | Missing `X-Idempotency-Key` on `POST /api/orders` → 400 | SQLITE TESTED |
| I6 | Missing `X-Idempotency-Key` on `POST /api/transactions` → request succeeds, no replay protection (backward compat) | SQLITE TESTED |
| I7 | Idempotency replay after original was deleted → 404 (replay does not resurrect) | SQLITE TESTED |
| I8 | PostgreSQL concurrent-duplicate behavior under row-lock contention | REQUIRES POSTGRES RUNTIME VALIDATION |

---

## 10. PostgreSQL Static Compatibility

Source files: `/home/z/my-project/prisma/schema.sqlite.prisma` and `/home/z/my-project/prisma/schema.postgres.prisma`.

### 10.1 Diff summary (existing, pre-proposal)

The two schemas differ in:
- `provider`: `sqlite` vs `postgresql`
- Monetary fields: `Float` (SQLite) vs `Decimal` (PostgreSQL) for `Partner.commission`, `Partner.target`, `Partner.totalProfit`, `Partner.totalVolume`, `MonthlyRankingHistory.profit`, `MonthlyRankingHistory.volume`, `Customer.totalVolume`, `Transaction.nominal` and all monetary breakdown fields, `PaymentType.*` fee fields, `Marketplace.*` fee fields
- PostgreSQL adds `@@index([status])` and `@@index([tier])` on Partner

### 10.2 Proposed field compatibility

| Proposed field | SQLite type | PostgreSQL type | Compatibility |
|----------------|-------------|-----------------|---------------|
| `partnerCommissionPercent` | `Float?` | `Decimal?` | ✅ Matches existing pattern (Float in SQLite, Decimal in PostgreSQL) |
| `paymentTypeName` | `String?` | `String?` | ✅ Identical |
| `marketplaceName` | `String?` | `String?` | ✅ Identical |
| `feeConfigSnapshot` | `String?` (JSON-as-text) | `String?` (JSON-as-text) OR `Json?` | ⚠️ Decision needed. Recommendation: use `String?` in both for parity, parse in app layer. PostgreSQL `Json` type would require different client code. **Static review verdict: compatible if `String?` is used in both.** |
| `calculationVersion` | `Int @default(1)` | `Int @default(1)` | ✅ Identical |
| `idempotencyKey` | `String? @unique` | `String? @unique` | ✅ Identical. NULLs are not enforced as unique in either database, so multiple legacy NULLs are allowed. |
| `idempotencyHash` | `String?` | `String?` | ✅ Identical |

### 10.3 Index compatibility

- `idempotencyKey @unique` creates a unique index in both databases. ✅
- No additional indexes proposed.

### 10.4 Backfill SQL compatibility

The backfill SQL in §7.4 uses standard `UPDATE ... SET ... = (SELECT ... FROM ... WHERE ...)` subqueries. This syntax is supported by both SQLite (3.33+) and PostgreSQL (all supported versions). ✅

### 10.5 Items requiring PostgreSQL runtime validation

| Item | Reason |
|------|--------|
| `Decimal` vs `Float` rounding parity for G14 | Sub-cent behavior differs between SQLite (real) and PostgreSQL (Decimal). Cannot be validated in SQLite sandbox. |
| `$transaction` interactive behavior under MVCC contention | PostgreSQL uses MVCC; SQLite uses database-level locks. The negative-counter guard (§6.2) relies on read-then-write inside a transaction. Under PostgreSQL, concurrent transactions updating the same partner row may conflict at commit time. |
| Idempotency `@unique` constraint race behavior | PostgreSQL may raise `P2002` with a different error shape or at a different point in the transaction than SQLite. The handler must catch `Prisma.PrismaClientKnownRequestError` with code `P2002` generically. |
| `feeConfigSnapshot` JSON-as-text storage size | PostgreSQL TEXT has no size limit; SQLite TEXT also has no practical limit. ✅ No issue, but JSON query functions differ (not used in this proposal). |

**Label: POSTGRES STATICALLY REVIEWED.** Runtime validation is a staging-environment task and is NOT in scope for this sandbox.

---

## 11. Changed Files

**No files were changed in this proposal.** This is a STOP-AT-PROPOSAL document per governance rules 13–14.

### 11.1 Files that WOULD be changed in Workstream A (schema-dependent, BLOCKED on approval)

| File | Change type | Description |
|------|-------------|-------------|
| `prisma/schema.prisma` (SQLite) | Add fields | 7 new fields on `Transaction` (see §7.2, §8.2) |
| `prisma/schema.sqlite.prisma` | Add fields | Same as above (mirrored) |
| `prisma/schema.postgres.prisma` | Add fields | Same fields, `Decimal?` for `partnerCommissionPercent`, `String?` for the rest |
| `prisma/migrations/` | New migration | `prisma migrate dev --name phase2_transaction_snapshot_idempotency` (dev only; production uses `prisma migrate deploy`) |
| `scripts/backfill-phase2-snapshot.ts` | New file | Idempotent backfill script (§7.4) |
| `src/app/api/orders/route.ts` | Modify | Populate snapshot fields at create; accept `X-Idempotency-Key` |
| `src/app/api/transactions/route.ts` | Modify | Populate snapshot fields at create; accept `X-Idempotency-Key` |
| `src/app/api/transactions/[id]/route.ts` | Modify | Update snapshot fields on nominal/marketplace/discount PATCH |
| `src/app/api/transactions/preview/route.ts` | Modify | Apply discount (B5); return same shape as persisted |
| `src/app/api/telegram/webhook/route.ts` | Modify | `handleNominal`/`handleMarketplace` update snapshot fields |
| `src/app/api/transactions/[id]/route.ts` (GET) | Modify | Prefer snapshot fields when `calculationVersion >= 1` |
| `src/app/api/dashboard/route.ts` | Modify | Read snapshot fields where applicable |
| `src/app/api/transactions/analytics/route.ts` | Modify | Read snapshot fields where applicable |
| `src/app/order/page.tsx` | Modify | Generate UUID on form mount, send `X-Idempotency-Key` header |
| `src/app/owner/dashboard/transactions/page.tsx` (or equivalent create-transaction UI) | Modify | Same as above |
| `src/app/partner/dashboard/transactions/page.tsx` | Modify | Same as above |

### 11.2 Files that WOULD be changed in Workstream B (schema-independent, can proceed without approval)

| File | Change type | Description |
|------|-------------|-------------|
| `src/lib/transaction/fee.ts` | New file | Consolidated `calculateTransaction` function (B1) |
| `src/lib/transaction/status-machine.ts` | New file | `canTransition`, `assertTransition`, `ALLOWED_TRANSITIONS` (B2) |
| `src/lib/transaction/idempotency.ts` | New file (B-conditional) | `canonicalizePayload`, `hashPayload` — only needed if Workstream A is approved |
| `src/lib/transaction/stats.ts` | New file | Shared `applyStatusTransition`, `reverseStatsForDelete` helpers (B3, B4) |
| `src/app/api/orders/route.ts` | Modify | Wrap in `$transaction`; call consolidated fee function |
| `src/app/api/transactions/route.ts` | Modify | Wrap in `$transaction`; call consolidated fee function |
| `src/app/api/transactions/[id]/route.ts` | Modify | Wrap PATCH in `$transaction`; replace 5 inline fee copies with consolidated function; fix R9 double-discount; use FSM |
| `src/app/api/transactions/[id]/route.ts` (DELETE) | Modify | Wrap in `$transaction`; negative-counter guard |
| `src/app/api/transactions/preview/route.ts` | Modify | Apply discount (B5) |
| `src/app/api/telegram/webhook/route.ts` | Modify | `handleStatus` uses shared `applyStatusTransition`; `handleNominal` uses consolidated fee function + applies stats; `handleMarketplace` uses `calculateMarginBreakdown`; `handleCatatan` behavior decision (backlog) |
| `src/app/api/notifications/route.ts` | Modify | Wrap note-append in `$transaction` (R10 race) |
| `src/lib/auth/index.ts` | Modify (deprecate) | Mark `calculatePaymentFee`/`calculateMarginBreakdown` as `@deprecated`; consolidate into `src/lib/transaction/fee.ts`. Do NOT delete — Workstream B keeps them as thin wrappers to avoid breaking imports. |

### 11.3 Files NOT changed

- `prisma/schema.prisma` (no schema changes implemented in this STOP-AT-PROPOSAL)
- Any UI component (governance rule 1)
- Any fee formula value (governance rule 2)
- Any business policy (governance rule 4)
- Phase 1 security audit files (governance rule 11)

---

## 12. Remaining Backlog

Items NOT addressed by this proposal. Per governance rule 16, these are documented as backlog and do NOT trigger a new remediation phase.

| ID | Item | Severity | Notes |
|----|------|----------|-------|
| B-1 | `partner.totalTransactions` orphan field | LOW | Either wire up increment/decrement in Workstream B3, or remove from `/api/partners/stats` and `/api/transactions/analytics` responses. Recommendation: wire up. |
| B-2 | Mixed live + denormalized analytics (R8) | MEDIUM | Owner dashboard sums ALL statuses; partner dashboard uses success-only denormalized counters; analytics endpoint uses success-only live sums. Reconciliation job or unified source needed. Out of scope for Phase 2 (would require dashboard redesign — governance rule 1). |
| B-3 | Customer stats bumped at creation regardless of status (R12) | LOW | Internally consistent with owner dashboard but inconsistent with partner/analytics. Business rule undocumented. Defer to business clarification. |
| B-4 | Telegram `/catatan` overwrite-vs-append behavior (R10) | MEDIUM | Should `/catatan` append (preserving partner messages) or overwrite (owner's authoritative note)? Business clarification needed. Current behavior: overwrites, destroying partner messages. |
| B-5 | PostgreSQL runtime validation of `$transaction` contention, Decimal rounding, idempotency race | HIGH | Cannot be validated in SQLite sandbox. Required before production deployment. Staging-environment task. |
| B-6 | Read-modify-write race on `transaction.notes` via `/api/notifications` (R10) | MEDIUM | Wrapping in `$transaction` (Workstream B3) reduces but does not eliminate the race under PostgreSQL MVCC. A `notes_version` optimistic-locking field would fully resolve, but adds schema complexity. Defer. |
| B-7 | Reconciliation job for `partner.totalProfit`/`totalVolume` drift from R2 (pre-Phase 2 Telegram-driven drift) | MEDIUM | Existing drifted counters need a one-time recomputation from Transaction rows. Out of scope for Phase 2 (would modify existing counter values — governance rule 3). Document as deployment task. |
| B-8 | Client-side fee preview duplication (DUP-4, DUP-5) | LOW | Client-side previews in `src/app/order/page.tsx` and `src/app/partner/dashboard/transactions/page.tsx` duplicate the fee formula. Could be replaced with a call to `/api/transactions/preview` (after B5). UI change — defer. |
| B-9 | `feeConfigSnapshot` JSON schema versioning | LOW | If the snapshot shape changes in future, a `feeConfigSnapshotVersion` field may be needed. Defer until v2. |

---

## 13. Final Verdict

```
SCHEMA APPROVAL REQUIRED
```

### 13.1 Justification

Phase 2 Steps 3 (Snapshot) and 6 (Idempotency) cannot be satisfied with the existing Prisma schema:
- Snapshot requires 5 new fields (`partnerCommissionPercent`, `paymentTypeName`, `marketplaceName`, `feeConfigSnapshot`, `calculationVersion`) to persist calculation inputs at transaction time. Existing fields store only the monetary OUTPUT breakdown, not the INPUT config or denormalized name snapshots. Backfilling input config for legacy rows is impossible.
- Idempotency requires 2 new fields (`idempotencyKey`, `idempotencyHash`) with a `@unique` constraint. No existing field can serve as a client-supplied replay key.

Per Phase 2 governance rules 13 and 14, schema changes require approval before implementation. Per Output directive, "Jika membutuhkan schema change: STOP setelah audit dan proposal. Buat PHASE2-TRANSACTION-SCHEMA-PROPOSAL.md. Jangan implementasikan schema sampai mendapat approval."

This document is the STOP-AT-PROPOSAL. No code or schema was modified.

### 13.2 What approval unlocks

Approving the schema proposal (Workstream A) unlocks:
1. Snapshot fields implementation (§7) — historical transaction integrity against future config changes
2. Idempotency fields implementation (§8) — replay protection for public order and transaction creation
3. SQLite tests §9.C and §9.D can be run

Workstream B (§4.4-B) is schema-independent and can proceed without approval, but is bundled here for context. The user may approve B separately to begin atomicity/FSM/fee-consolidation work while schema approval is pending.

### 13.3 What was verified

- ✅ Every transaction-creating and transaction-mutating code path traced against actual source (§1)
- ✅ Every fee-calculation code path traced; 5 inline duplicates identified with exact line numbers (§1, R4)
- ✅ Every statistics-mutating code path traced; non-atomic sequences identified (§1, R1)
- ✅ Telegram webhook divergences from PATCH endpoint identified (§1.3, R2)
- ✅ Zero `$transaction` usage confirmed across `/home/z/my-project/src` (§1.5)
- ✅ Zero idempotency handling confirmed across the codebase (§1.5, R3)
- ✅ No status transition validator exists (§1.5, R6)
- ✅ `partner.totalTransactions` orphan field confirmed (R7)
- ✅ PostgreSQL schema diffed against SQLite schema; proposed fields compatible (§10)
- ✅ Backfill SQL verified as SQLite + PostgreSQL compatible (§7.4, §10.4)

### 13.4 What was NOT verified

- ❌ PostgreSQL runtime behavior (Decimal rounding, MVCC contention, idempotency race) — sandbox limitation
- ❌ Production build with proposed changes — no changes implemented
- ❌ SQLite tests — not run (STOP-AT-PROPOSAL)
- ❌ UI behavior — out of scope (governance rule 1)

### 13.5 Required env variables (for future implementation, none added in this proposal)

No new env variables are introduced by this proposal. Existing env unchanged:
- `DATABASE_URL` — SQLite path (dev) or PostgreSQL connection string (prod)
- `TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV` — Phase 1.2, unchanged
- All other env variables unchanged

### 13.6 Manual deployment checklist (for when implementation is approved)

1. Apply schema changes to `prisma/schema.prisma`, `prisma/schema.sqlite.prisma`, `prisma/schema.postgres.prisma`
2. Run `bun run db:generate` (regenerate Prisma client)
3. Run `prisma db push` on dev SQLite (allowed for dev)
4. Run backfill script `scripts/backfill-phase2-snapshot.ts` on dev SQLite
5. Verify backfill with audit query (count of legacy rows with `calculationVersion = 0`)
6. Run SQLite test suite `bun test tests/transaction/`
7. Deploy Workstream B code changes
8. For PostgreSQL staging: `prisma migrate deploy` (NO `db push`, NO `migrate reset`)
9. Run backfill script on PostgreSQL staging
10. Verify staging with smoke tests
11. **DO NOT** deploy to PostgreSQL production until B-5 (PostgreSQL runtime validation) is complete

### 13.7 Rollback plan

**SQLite dev rollback:**
1. Remove the 7 new fields from `prisma/schema.prisma`
2. Run `prisma db push` (drops columns; loses snapshot + idempotency data — acceptable for dev)
3. Revert Workstream A + B code changes via `git revert`
4. Run `bun run db:generate`

**PostgreSQL production rollback:**
1. Create a down-migration: `DROP COLUMN partnerCommissionPercent, paymentTypeName, marketplaceName, feeConfigSnapshot, calculationVersion, idempotencyKey, idempotencyHash` on `transactions`
2. Deploy the down-migration via `prisma migrate deploy`
3. Revert Workstream A + B code changes via `git revert` (deploy a version that does NOT reference the new fields BEFORE running the down-migration)
4. Existing Phase 2 transactions will lose their snapshot — acceptable since the monetary breakdown fields (which are unchanged) remain authoritative

**Application-level rollback (no schema rollback):**
1. Deploy a version where Workstream A read paths always fall back to live relations (treating all rows as `calculationVersion = 0`)
2. This effectively disables snapshot behavior without dropping columns
3. Idempotency can be disabled by removing the `X-Idempotency-Key` header check (requests without the header are accepted per §8.7)

---

**End of proposal. Awaiting approval.**
