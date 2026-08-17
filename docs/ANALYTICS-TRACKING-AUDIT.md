# Analytics & Conversion Tracking Audit — Blackbear.cc

**Status:** PROPOSAL — NO CODE CHANGED. Awaiting approval before implementation.
**Date:** Audit performed against current `main` (post BLOG-ISR-HOTFIX, 235/235 tests PASS).
**Scope lock respected:** transaction engine, fraud engine, auth, Prisma schema, API contracts, SEO page content, and homepage UI were NOT modified. This document is read-only analysis + a forward implementation plan.

---

## 0. VERDICT

> **`TRACKING IMPLEMENTATION REQUIRED`**

No marketing analytics provider is installed, no event layer exists, and none of the four required conversion events (`click_wa`, `use_calculator`, `generate_lead`, `partner_registration_success`) are emitted anywhere in the codebase. The cookie-consent banner exists but gates nothing and lacks Google Consent Mode v2.

**One configuration prerequisite (owner action, not an engineering blocker):** before go-live the owner must (a) choose a provider — GA4, GTM, or Vercel Analytics — and (b) supply its identifier via environment variable (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GTM_ID`, or enable `@vercel/analytics`). Engineering can proceed in parallel against an env placeholder with a graceful no-op when the variable is absent, so implementation is **not** blocked.

This is not `BLOCKED BY CONFIGURATION` because the consent-aware event layer, dedup guards, PII allowlist, and call-site wiring can all be built and unit-tested today without the final measurement ID. It is not `TRACKING READY` because nothing is wired.

---

## 1. CURRENT-STATE MAP

### 1.1 Analytics provider detection

| Surface | GA4 | GTM | Vercel Analytics | Result |
|---|---|---|---|---|
| `package.json` deps | — | — | — | None installed |
| `src/app/layout.tsx` | No `<Script src=googletagmanager>` | No GTM container `<Script>` | No `<Analytics>` | None injected |
| `next.config.ts` | No `env` analytics var | — | — | None |
| Env / `.env*` | No `NEXT_PUBLIC_GA_*` | No `NEXT_PUBLIC_GTM_*` | — | None |
| Source `gtag\|dataLayer\|trackEvent` grep | 0 hits | 0 hits | 0 hits | No event layer |

The only Google-related env reference in the app is `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (Search Console ownership, **not** analytics). The string "analytics" appears only in the **owner dashboard business analytics** (`/api/transactions/analytics` — internal volume/profit stats), which is unrelated to marketing tracking.

**Conclusion:** the site currently sends **zero** marketing/conversion events. There is no measurement, no tag, no dataLayer.

### 1.2 Consent infrastructure (existing)

`src/components/landing/cookie-consent.tsx` is present and functional but minimal:

- Stores `{ accepted: boolean, date }` in `localStorage['cookie-consent']`.
- Two buttons only: "Terima Semua" (accept) / "Tolak" (reject). No granular categories.
- Surfaces only on public pages (`/`, `/faq`, `/blog/*`, `/lokasi/*`).
- Broadcasts visibility to other FAB components via `useCookieBannerVisible`.
- **Gates nothing** (because no scripts exist to gate).
- **No Google Consent Mode v2** (`ad_storage` / `analytics_storage` signals are not set). This must be added before GA4 go-live to avoid recording users who rejected cookies, and to preserve GA4 data quality in regions that enforce consent.

### 1.3 Runtime config note

`next.config.ts` has `reactStrictMode: false`. This eliminates one deduplication vector (React 18 dev double-invoke of effects) but does **not** eliminate: rapid double-clicks, hydration re-render, or dual-handler wiring. Dedup guards are still required at the conversion call sites.

---

## 2. CTA & CONVERSION SURFACE INVENTORY

Legend: ✅ = trackable marketing conversion surface (in scope). ⛔ = internal operator surface (exclude from marketing tracking — owner/partner dashboard actions are not conversions).

### 2.1 WhatsApp CTAs → `click_wa`

| # | File | Line | Surface | Nav method | Notes |
|---|---|---|---|---|---|
| 1 | `src/components/landing/whatsapp-fab.tsx` | 280–305 | FAB button (desktop) | `<a href target=_blank>` + `onClick` | Desktop navigates directly; mobile `preventDefault` opens popover. Global, all public pages. |
| 1b | `src/components/landing/whatsapp-fab.tsx` | 177–186 / 235–245 | Popover CTA (mobile) | `<a href target=_blank>` + `onClick` | Mobile-only actual nav. Two DOM nodes (mobile/desktop popover). |
| 2 | `src/components/shared/footer.tsx` | 167 | Footer social icon | `<a href target=_blank>` | Global footer. |
| 3 | `src/components/shared/footer.tsx` | 207 | Footer "Hubungi Kami" | `<a href target=_blank>` | Global footer. |
| 4 | `src/components/landing/exit-intent-banner.tsx` | 69 | Exit-intent "Chat WA" | `<a href target=_blank>` | Homepage, exit-intent trigger. |
| 5 | `src/components/landing/landing-page.tsx` | 1108 | Hero CTA "Tanyakan via WhatsApp" | `<a href target=_blank>` | Homepage. |
| 6 | `src/app/faq/client.tsx` | 116 (`handleContactWhatsApp`) | FAQ contact WA | `window.open()` programmatic | `/faq`. |
| 7 | `src/app/lokasi/[slug]/client.tsx` | 63 (`handleOrderWhatsApp`) | Location order WA | `window.open()` programmatic | `/lokasi/[slug]`. |
| 8 | `src/app/blog/[slug]/client.tsx` | 252 | Blog share-to-WA | `window.open()` | Share action (`wa.me/?text=...`). Recommend separate `share` event OR `click_wa` with `page_type=blog_detail`. |
| 9 | `src/app/maintenance/page.tsx` | 54 | Maintenance WA | `window.open()` | Maintenance mode only. |
| 10 | `src/app/track/page.tsx` | 937–946 | Contact partner/owner WA via proxy | `fetch /api/orders/contact` → `window.open(redirectUrl)` | Server-resolved URL; phone never reaches client. `click_wa` fires **after** `data.success && redirectUrl` confirmed (line 942), before `window.open` (943). |
| ⛔ | `src/app/owner/dashboard/*` | various | Owner → customer WA | `<a href>` | Internal operator. Exclude. |
| ⛔ | `src/app/partner/dashboard/*` | various | Partner → customer WA | `<a href>` | Internal operator. Exclude. |
| ⛔ | `src/app/owner/dashboard/settings/page.tsx` | 963, 1003 | Settings preview | `<a href>` | Internal. Exclude. |

**Server-side WA proxy** (`src/app/api/orders/contact/route.ts`): builds `wa.me/{phone}` server-side, returns only `redirectUrl` + `contactName` + `contactType`. Phone is never logged and never sent to the client (good). The `click_wa` event is a **client-side** concern (fired in the track page handler), not in this API route — gtag/dataLayer must never run server-side.

### 2.2 Calculator → `use_calculator`

| # | File | Function / Line | Fire point | Dedup-safe? |
|---|---|---|---|---|
| 1 | `src/components/landing/rate-calculator.tsx` | `calculate()` L57–63 | Inside `calculate()`, after `setIsCalculated(true)` | Yes — event handler (not effect); fires once per "Hitung Estimasi" click. Input changes (`handleAmountChange`, preset buttons) only update state and explicitly set `isCalculated=false` — they must NOT fire the event. |

The order page (`src/app/order/page.tsx`) also computes fee previews, but continuously on input — it is **not** a `use_calculator` candidate. Only `rate-calculator.tsx`'s explicit "Hitung Estimasi" click qualifies.

### 2.3 Order form → `generate_lead`

| # | File | Handler | API | Server-confirm gate | Fire point |
|---|---|---|---|---|---|
| 1 | `src/app/order/page.tsx` | `handleSubmit` L1264 | `POST /api/orders` L1319 (with `X-Idempotency-Key`) | L1344 `if (!response.ok \|\| !data.success) { setError; return; }` | After L1351 `setSuccess(true)` — recommended via `useEffect([success])` so it fires exactly once on the success transition and is idempotent across re-renders. **Must not** fire on button click or fetch start. |

**Allowed-param mapping for `generate_lead`:**
- `page_path` = `/order`
- `page_type` = `order_form`
- `service_type` = `online` | `cod` (from form's service selection)
- `provider` = payment-type name (e.g. "BCA", "GoPay Paylater") — **not** the customer's bank account
- `city` = `formData.city` (allowed)
- `amount_bucket` = bucketed `nominal` (e.g. `10k-100k`, `100k-500k`, `500k-1M`, `1M-5M`, `5M-10M`, `10M+`) — **never** the exact nominal

### 2.4 Partner registration → `partner_registration_success`

| # | File | Handler | API | Server-confirm gate | Fire point |
|---|---|---|---|---|---|
| 1 | `src/app/register/page.tsx` | `handleSubmit` L170 | `POST /api/auth/register` L224 | L245 `if (!response.ok \|\| !data.success) { setError; return; }` | After L251–253 (`setUser`, `setPartner`, `router.replace`) — recommended via `useEffect([partner])` so it fires once on the confirmed-success transition. |

**Allowed-param mapping for `partner_registration_success`:**
- `page_path` = `/register`
- `page_type` = `partner_registration`
- `city` = `formData.city` (allowed)
- `service_type` / `provider` / `amount_bucket` = N/A (omit)

**Homepage entry CTA:** `src/components/landing/landing-page.tsx` L1168 `<Link href="/register">Daftar Menjadi Mitra</Link>` is a navigation entry, not a conversion. It is **not** one of the four required events; tracking it is optional (could be a `click_partner_register_cta` micro-conversion) and is out of scope unless requested.

---

## 3. MISSING EVENTS

All four required events are entirely absent:

| Event | Required fire point | Current state |
|---|---|---|
| `click_wa` | On actual WA link click (or programmatic `window.open` / post-proxy redirect) | 0 of 10 public surfaces emit it |
| `use_calculator` | After a valid calculation completes (not per input change) | 0 of 1 calculator emits it |
| `generate_lead` | Only after server confirms order/form success | 0 of 1 order form emits it |
| `partner_registration_success` | Only after server confirms partner registration | 0 of 1 register form emits it |

**Missing infrastructure (prerequisite to any event):**
1. Provider loader (GA4 gtag OR GTM dataLayer, env-driven, graceful no-op when ID absent).
2. `trackEvent(name, params)` abstraction — client-only, consent-aware, PII-allowlisted.
3. Consent-aware script injection in `layout.tsx` + Google Consent Mode v2 default-denied.
4. `cookie-consent.tsx` upgrade to call `gtag('consent', 'update', …)` on accept/reject.
5. `amount_bucket` helper + param allowlist/strip utility.
6. `sendBeacon` / synchronous `dataLayer.push` for any nav that unloads the page (none of the WA links unload because `target=_blank`, but the programmatic `window.open` ones should still fire before open in case of popup blockers).

---

## 4. FILES THAT WILL NEED CHANGES (when approved)

All edits below are **additive** (one `trackEvent` call or one prop) — no logic, contract, schema, or UI change. Listed for planning; **nothing is changed in this audit pass.**

### 4.1 New files (analytics layer)

| File | Purpose |
|---|---|
| `src/lib/analytics/track.ts` | `trackEvent(name, params)` — client-only, consent-gated, PII-stripped, provider-agnostic. |
| `src/lib/analytics/provider.ts` | Loads GA4 gtag.js OR initializes GTM dataLayer based on env; no-op when no ID. |
| `src/lib/analytics/consent.ts` | Reads `localStorage['cookie-consent']`, exposes `hasAnalyticsConsent()`, Consent Mode v2 default + update helpers. |
| `src/lib/analytics/buckets.ts` | `amountBucket(nominal)` + `sanitizeParams(allowed, input)` allowlist (strips PII). |
| `src/components/analytics/analytics-provider.tsx` | Client component: injects `<Script>` for gtag/GTM, sets Consent Mode v2 default-denied, initializes dataLayer. Mounted once in `layout.tsx`. |
| `tests/analytics/tracking.test.ts` | Unit + component regression tests (see §7). |

### 4.2 Edited files (single call-site wiring)

| File | Change |
|---|---|
| `src/app/layout.tsx` | Mount `<AnalyticsProvider />` once. |
| `src/components/landing/cookie-consent.tsx` | On accept/reject, call Consent Mode v2 update (no UI change). |
| `src/components/landing/rate-calculator.tsx` | `trackEvent('use_calculator', {page_path:'/', page_type:'landing', service_type, provider, amount_bucket})` inside `calculate()`. |
| `src/app/order/page.tsx` | `useEffect([success])` → `trackEvent('generate_lead', {page_path:'/order', page_type:'order_form', service_type, provider, city, amount_bucket})`. Guarded by a `hasFiredRef`. |
| `src/app/register/page.tsx` | `useEffect([partner])` → `trackEvent('partner_registration_success', {page_path:'/register', page_type:'partner_registration', city})`. Guarded by a `hasFiredRef`. |
| `src/components/landing/whatsapp-fab.tsx` | `click_wa` on FAB desktop click **and** popover CTA mobile click — dedup so only the actual navigation fires (see §6). |
| `src/components/shared/footer.tsx` | `click_wa` on both WA anchors (L167, L207) via shared `onClick`. |
| `src/components/landing/exit-intent-banner.tsx` | `click_wa` on the WA `<a>` (L69). |
| `src/components/landing/landing-page.tsx` | `click_wa` on hero WA `<a>` (L1108). |
| `src/app/faq/client.tsx` | `click_wa` inside `handleContactWhatsApp` before `window.open`. |
| `src/app/lokasi/[slug]/client.tsx` | `click_wa` inside `handleOrderWhatsApp` before `window.open` (param `city` = location name). |
| `src/app/blog/[slug]/client.tsx` | `click_wa` (or `share`) on share-to-WA (L252) — recommend `page_type=blog_detail`. |
| `src/app/maintenance/page.tsx` | `click_wa` on maintenance WA (L54). |
| `src/app/track/page.tsx` | `click_wa` after `data.success && redirectUrl` (L942), before `window.open` (L943). |

### 4.3 Explicitly NOT touched (scope lock)

- `/api/orders`, `/api/orders/contact`, `/api/auth/register` route handlers (API contracts unchanged — tracking is client-side only).
- Transaction engine, fraud engine, auth, Prisma schema.
- SEO page content (blog/location/faq server pages).
- Homepage visual UI (the only `landing-page.tsx` change is an `onClick` attribute on an existing `<a>`; no layout/style/wording change).

---

## 5. PRIVACY RISK ASSESSMENT

**Current risk: ZERO** — no events are sent, so no PII can leak today.

**Future-implementation risks (must be mitigated in the build):**

| Risk | Source | Mitigation |
|---|---|---|
| Customer PII in `generate_lead` | `order/page.tsx` `formData`: `name`, `phone`, `bank`, `bankAccount`, `bankHolder`, exact `nominal` | Allowlist strip in `trackEvent`; only `city` + bucketed `amount_bucket` pass. `bank`/`bankAccount`/`bankHolder`/`name`/`phone`/exact `nominal` never sent. |
| Partner PII in `partner_registration_success` | `register/page.tsx` `formData`: `name`, `email`, `phone`, `password`, `bankName`, `bankAccount`, `bankHolder` | Only `city` passes; everything else stripped. |
| WhatsApp message text as param | `lokasi`/`faq`/`maintenance` build messages like "Halo, saya ingin transaksi di {city}" | Never pass `text`/message body. Only allowed params. |
| `orderId` / internal transaction ID | `track/page.tsx` has `order.orderId` in scope | `orderId` is an internal transaction ID — **forbidden** per spec. Do not include in `click_wa` params. |
| `wa.me/{phone}` URL leaking phone | Phone is embedded in the `href`/`window.open` URL | Never pass the WA URL as an event param. `click_wa` carries only `page_path`/`page_type`/`city` etc. |
| `transactionLink` (payment URL) | `track/page.tsx` L1354–1358 opens `order.transactionLink` | This is a **payment link**, not a WA link. Out of scope for `click_wa`. If tracked at all, must not carry the URL or any PII. Recommend leaving untracked in this phase. |
| Consent bypass | Current banner doesn't gate scripts | Consent Mode v2 default-denied before GA4 loads; `trackEvent` no-ops when consent absent. |
| Server-side gtag (misuse) | — | gtag/dataLayer are browser-only. Never import into API routes / server components. `trackEvent` is `'use client'`. |
| Internal operator WA (owner/partner dashboards) | `wa.me/{customerPhone}` in dashboards | Excluded from `click_wa` entirely (operator action, not marketing conversion). Avoids logging customer phones. |

**Allowlist enforcement:** `sanitizeParams(allowed, input)` will be the single chokepoint — any key not in `{page_path, page_type, service_type, provider, city, amount_bucket}` is dropped before `dataLayer.push`. This makes PII leakage structurally impossible even if a developer mistakenly passes extra fields.

---

## 6. DEDUPLICATION STRATEGY

No events exist today, so there is **no current duplication**. The strategy below prevents duplication when events are added:

| Vector | Where | Mitigation |
|---|---|---|
| WA FAB dual surface | `whatsapp-fab.tsx` FAB `onClick` + popover CTA `onClick` | On desktop, FAB click navigates directly (popover never opens — `togglePopover` only fires when `innerWidth < 768`). On mobile, FAB `preventDefault` opens popover; actual nav is the popover CTA. Track **only** at the navigation point: FAB `onClick` tracks when `innerWidth >= 768` (else skip); popover CTA `onClick` tracks unconditionally. Net: exactly one `click_wa` per real navigation. |
| `<a target=_blank>` + `onClick` | All anchor WA CTAs | `target=_blank` does not unload the page, so a synchronous `trackEvent` (or `dataLayer.push`) completes before navigation. No `sendBeacon` needed for these. |
| Programmatic `window.open` | `faq`, `lokasi`, `maintenance`, `track` | Call `trackEvent` immediately before `window.open` (so it fires even if the popup is blocked or the returned handle is null). |
| WA proxy double-fetch | `track/page.tsx` L937 | `contactLoading` guard already prevents re-entry. Track only inside the `data.success && redirectUrl` branch — fires once per resolved contact. |
| `generate_lead` re-render / double-submit | `order/page.tsx` | Fire in `useEffect([success])` guarded by a `useRef` flag (`hasFiredRef.current`). Idempotent across re-renders; cooldown (30s) + idempotency key already prevent duplicate server orders, so the event aligns 1:1 with a confirmed order. |
| `partner_registration_success` re-render | `register/page.tsx` | Same `useEffect([partner])` + `useRef` guard. `router.replace` happens after; the effect fires once on the `partner` state transition. |
| `use_calculator` rapid double-click | `rate-calculator.tsx` | `calculate()` is an event handler (StrictMode is off, and handlers aren't double-invoked anyway). Two real clicks = two real calculations = two events — acceptable. No guard needed. |
| React hydration mismatch | All client components | `trackEvent` checks `typeof window !== 'undefined'` and only runs post-hydration; `AnalyticsProvider` is `'use client'`. |
| StrictMode double-effect | — | `reactStrictMode: false` in `next.config.ts`; effect-based events (`generate_lead`, `partner_registration_success`) additionally use the `useRef` guard for defence-in-depth. |
| Provider double-init | `layout.tsx` | `AnalyticsProvider` guards initialization with a module-level `initialized` flag so HMR / re-mounts don't double-inject gtag. |

---

## 7. TEST PLAN (for the implementation phase — not executed now)

1. **Param allowlist unit:** `sanitizeParams(['page_path','page_type','service_type','provider','city','amount_bucket'], {name:'x', phone:'0812', email:'a@b', bankAccount:'123', orderId:'ORD-1', amount:500000, page_type:'order_form'})` → output contains only `page_type:'order_form'`; all PII keys dropped.
2. **Amount bucketing unit:** `amountBucket(50000)→'10k-100k'`, `(750000)→'500k-1M'`, `(2500000)→'1M-5M'`, `(0)→'0'`, `(null)→'unknown'`.
3. **Consent gating unit:** with `localStorage['cookie-consent'] = {accepted:false}`, `trackEvent('click_wa', …)` is a no-op (no `dataLayer.push`, no `gtag` call). With `accepted:true`, it pushes exactly once.
4. **`use_calculator` component:** render `rate-calculator`, click "Hitung Estimasi" → one `use_calculator` event with `service_type` + `provider` + `amount_bucket`. Type in the amount input / click presets → zero events.
5. **`generate_lead` component:** mock `fetch('/api/orders')` → success → one `generate_lead` event. Mock failure → zero events. Re-render the success state 3× → still exactly one event (`useRef` guard).
6. **`partner_registration_success` component:** mock `fetch('/api/auth/register')` → success → one event. Mock failure → zero. `router.replace` mocked → event fires before navigation.
7. **`click_wa` FAB dedup:** desktop (innerWidth ≥ 768) click FAB → one event from FAB `onClick`, zero from popover. Mobile (innerWidth < 768) click FAB → zero (popover opens); click popover CTA → one event.
8. **`click_wa` proxy (track page):** mock `/api/orders/contact` → success with `redirectUrl` → one `click_wa` before `window.open`. Mock failure → zero events, error toast shown.
9. **PII regression (E2E / agent-browser, GA4 debug_mode):** drive full order flow → snapshot `window.dataLayer` → assert no value matches PII patterns (phone `/^62|08\d{6,}/`, email regex, `ORD-*`, `name`/`bankAccount` keys absent).
10. **Consent regression (E2E):** reject cookies → load homepage → click WA → assert `dataLayer` is empty and `gtag` config was never called (Consent Mode v2 `analytics_storage='denied'`).
11. **Dedup regression:** rapid double-click "Hitung Estimasi" → two events (acceptable); rapid double-click order submit (within cooldown) → still one `generate_lead` (cooldown blocks second submit).

---

## 8. IMPLEMENTATION SCOPE LOCK (re-affirmed)

**Allowed when approved:** the analytics layer files listed in §4.1, the additive single-call-site wiring in §4.2, the cookie-consent Consent Mode v2 upgrade, and the test file in §4.1.

**Forbidden (unchanged):** `force-dynamic`, transaction engine, fraud engine, auth, Prisma schema, API contract changes, SEO page content edits, homepage UI redesign, and any change to `/api/orders`, `/api/orders/contact`, or `/api/auth/register` route handlers. All tracking is client-side and additive.

---

## 9. APPROVAL GATE

No code will be changed until the owner approves this proposal and supplies:

1. **Provider choice** (single selection): GA4 ⬜ / GTM ⬜ / Vercel Analytics ⬜.
2. **Identifier** (if GA4/GTM): `NEXT_PUBLIC_GA_MEASUREMENT_ID` (e.g. `G-XXXXXXXXXX`) or `NEXT_PUBLIC_GTM_ID` (e.g. `GTM-XXXXXXX`).
3. **Confirmation** that Consent Mode v2 default-denied behavior is acceptable (users who reject cookies will not be counted in GA4, preserving privacy compliance).

Upon approval, implementation proceeds against §4 + §7, returning a `TRACKING READY` verdict after the full test suite (current 235 + new analytics tests) passes and an agent-browser E2E confirms all four events fire with only allowlisted params.
