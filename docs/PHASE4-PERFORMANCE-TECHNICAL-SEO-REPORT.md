# BLACK BEAR Phase 4 — Performance & Technical SEO Report

- **Date:** 2026-08-15
- **Phase:** 4 (Performance & Technical SEO)
- **Runtime:** SQLite (dev), Next.js 16.1.3 (Turbopack), Node dev server on :3000
- **Final verdict:** ✅ **PHASE 4 PASS**

---

## 1. Baseline

### Component boundaries (landing page)
| Concern | Implementation | Status |
|---|---|---|
| MapLibre / Recharts on landing | Neither library imported by `landing-page.tsx` or any landing child component; verified by `curl /` → zero `MapLibre`/`Recharts` references in initial HTML | ✅ MapLibre/Recharts NOT in landing |
| Heavy dashboard deps | Code-split behind dynamic imports / dashboard-only routes | ✅ Excluded from landing bundle |

### Page-loader delay (before vs after)
| Metric | Before Phase 4 | After Phase 4 |
|---|---|---|
| Artificial min display delay | 800–1200 ms fixed `setTimeout` | **Removed** |
| Show threshold (only if still loading) | N/A — always shown | 250 ms |
| Dismiss triggers | timer only | `window.load` event **OR** 1500 ms hard ceiling |
| LCP impact | Loader blocked LCP for 0.8–1.2 s on every navigation | Loader never blocks LCP; only decorates genuinely slow loads |

### CSS line count
- `src/app/globals.css` = **2018 lines**
- Includes 2 `@media (prefers-reduced-motion: reduce)` blocks (line 1755 hero/decorative, line 2010 dashboard mesh).

### Bundle findings
- No new dependencies added.
- No new client-only libraries introduced on public routes.
- All landing-page images have explicit `width`/`height` attributes (CLS-safe).
- MapLibre & Recharts kept on authenticated dashboard routes only.

---

## 2. Changes (bulleted)

**Performance — page-loader & viewport**
- `src/components/shared/page-loader.tsx`: removed artificial 800–1200 ms min-display `setTimeout`; loader now shows only after a 250 ms threshold (skips fast/cached navigations), dismisses on `window.load` or 1500 ms hard ceiling. Added `width=80 height=80` to logo `<img>`.
- `src/app/layout.tsx`: viewport meta changed from `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` to `width=device-width, initial-scale=1` (no scaling restriction — accessibility win, no SEO penalty).

**Crawlability — robots & sitemap**
- `src/app/robots.ts`: rewritten. Rules for `*`, `Googlebot`, `Bingbot`. Disallow list: `/api/`, `/login`, `/register`, `/dashboard`, `/owner/`, `/partner/`, `/maintenance`. Allow `/`. Emits `Sitemap:` + `Host:` directives.
- `public/robots.txt`: **DELETED** (Next.js Metadata API now generates `/robots.txt` dynamically from `src/app/robots.ts`).
- `src/app/sitemap.ts`: rewritten. Static public pages (`/`, `/order`, `/track`, `/blog`, `/faq`, `/lokasi`) + dynamic published blog posts (`isPublished: true`) + active locations (`isActive: true`). Falls back to static pages if DB unavailable. No auth/api/dashboard paths.

**Indexability — auth/dashboard layouts**
- `src/app/login/layout.tsx`: `robots: { index: false, follow: false }`.
- `src/app/register/layout.tsx`: **created** with `noindex,nofollow`.
- `src/app/dashboard/layout.tsx`: **created** with `noindex,nofollow`.
- `src/app/maintenance/layout.tsx`: **created** with `noindex,nofollow`.
- `src/app/owner/dashboard/layout.tsx`: **created** with `noindex,nofollow`.
- `src/app/partner/dashboard/layout.tsx`: **created** with `noindex,nofollow`.

**Structured data — de-faking**
- `src/components/seo/json-ld.tsx`: removed fake `aggregateRating` (4.9/1250) from `FinancialService` schema. Removed fake "rating 4.9 dari 5" FAQ claim. Both `OrganizationJsonLd` and `LocalBusinessJsonLd` use `safeJsonLd()` for XSS-safe JSON serialization. Added code comment documenting the rationale (re-add only when backed by verified review data).
- `src/app/lokasi/[slug]/client.tsx`: removed fake `aggregateRating` (4.9/500), removed duplicate JSON-LD `<script>` (was double-emitting), removed unused `safeJsonLd` import.

**Landing-page SSR & trust signals**
- `src/components/landing/landing-page.tsx`: hero subtitle (`Gestun profesional untuk Kartu Kredit & Paylater. Proses instan, rate bersaing, aman & terpercaya.`) is now server-rendered in initial HTML (typewriter is client-only progressive enhancement on the same string). Stats labeled `*(ilustrasi)`. Removed unused `eslint-disable` directive. Image dimensions and `loading="lazy"` added on authored imgs.
- `src/components/landing/live-activity-feed.tsx`: "Live" badge → **"Ilustrasi"** (with `aria-label="Contoh ilustrasi transaksi"`).
- `src/components/landing/social-proof-toast.tsx`: toast title "Transaksi Baru" → **"Contoh Ilustrasi"**.
- `src/components/landing/testimonials-section.tsx`: removed hardcoded `4.9` / `2847` aggregate values; now computes the real aggregate from the testimonials array (falls back to "—"/0 when empty).

**Image optimization (CLS prevention)**
- Added explicit `width`/`height` to `<img>` tags across: `desktop-navbar.tsx`, `footer.tsx`, `page-loader.tsx`, `blog/page.tsx`, `blog/[slug]/client.tsx`, `lokasi/[slug]/client.tsx`, `lokasi/client.tsx`, `rate-calculator.tsx`.

**Cache-Control policy**
- `src/lib/observability/request-id.ts`: added `setNoStoreCacheHeaders()` helper (`private, no-store, max-age=0, must-revalidate`). `withObservability()` wrapper now applies it to ALL wrapped API responses by default — every authenticated/dashboard API response is non-cacheable.
- `src/app/api/health/route.ts`: `Cache-Control: public, max-age=10` (liveness, no DB, short public cache).
- `src/app/api/ready/route.ts`: `Cache-Control: private, no-store, max-age=0, must-revalidate` (DB-dependent, never cached).

**ISR (Incremental Static Regeneration)**
- `src/app/faq/page.tsx`: `export const revalidate = 300` (5 min).
- `src/app/lokasi/page.tsx`: `export const revalidate = 3600` (1 hour).
- `src/app/lokasi/[slug]/page.tsx`: `export const revalidate = 3600` (1 hour).

**Tests**
- `tests/seo/phase4-seo.test.ts`: **created** — 27 tests covering robots.txt rules, sitemap content, canonical URLs, JSON-LD structured data, hero SSR HTML, cache-control on auth/dashboard endpoints, image optimization, viewport accessibility, fake-signal removal, and reduced-motion support.

**Verification agent fixes (this run)**
- `src/components/landing/landing-page.tsx`: removed one unused `// eslint-disable-next-line react-hooks/exhaustive-deps` directive (line 222) that ESLint flagged as unnecessary.
- `.env`: restored `TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true` (Phase 3 dev-only flag, lost during env reset). Required for Phase 3 `/catatan` append test to pass; no production logic affected.

---

## 3. Route Rendering / Cache Matrix

| Route | Rendering | Cache-Control | Indexable |
|---|---|---|---|
| `/` | SSR (landing-page) | default (no-store via observability if API) | ✅ index,follow |
| `/order` | SSR | default | ✅ index,follow |
| `/track` | SSR | default | ✅ index,follow |
| `/faq` | ISR `revalidate=300` | `s-maxage=300, stale-while-revalidate` | ✅ index,follow |
| `/blog` | SSR | default | ✅ index,follow |
| `/blog/[slug]` | SSR | default | ✅ index,follow (only published) |
| `/lokasi` | ISR `revalidate=3600` | `s-maxage=3600, stale-while-revalidate` | ✅ index,follow |
| `/lokasi/[slug]` | ISR `revalidate=3600` | `s-maxage=3600, stale-while-revalidate` | ✅ index,follow (only active) |
| `/robots.txt` | Metadata route | default | n/a (robots policy itself) |
| `/sitemap.xml` | Metadata route | default | n/a |
| `/login` | SSR | default | ❌ noindex,nofollow |
| `/register` | SSR | default | ❌ noindex,nofollow |
| `/dashboard` | SSR (auth) | default | ❌ noindex,nofollow |
| `/owner/dashboard` | SSR (auth) | default | ❌ noindex,nofollow |
| `/partner/dashboard` | SSR (auth) | default | ❌ noindex,nofollow |
| `/maintenance` | SSR | default | ❌ noindex,nofollow |
| `/api/health` | dynamic | `public, max-age=10` | ❌ disallowed in robots |
| `/api/ready` | dynamic | `private, no-store, max-age=0, must-revalidate` | ❌ disallowed in robots |
| `/api/transactions` | dynamic (auth) | `private, no-store, max-age=0, must-revalidate` | ❌ disallowed in robots |
| `/api/auth/me` | dynamic (auth) | `private, no-store, max-age=0, must-revalidate` | ❌ disallowed in robots |
| `/api/customers` | dynamic (auth) | `private, no-store, max-age=0, must-revalidate` | ❌ disallowed in robots |
| `/api/admin/reconcile` | dynamic (auth) | `private, no-store, max-age=0, must-revalidate` | ❌ disallowed in robots |

---

## 4. Metadata / Indexability Matrix

| Route | `<title>` | `<meta description>` | canonical | OG | Twitter | `robots` meta |
|---|---|---|---|---|---|---|
| `/` | ✅ | ✅ | `https://blackbear.cc` | ✅ (og:title/description/url/site_name/locale/image+dimensions) | ✅ | index,follow (default) |
| `/login` | ✅ | ✅ | `https://blackbear.cc/login` | ✅ | ✅ | **noindex,nofollow** |
| `/register` | ✅ | ✅ | `https://blackbear.cc/register` | – | – | **noindex,nofollow** |
| `/dashboard` | – | – | – | – | – | **noindex,nofollow** |
| `/owner/dashboard` | – | – | – | – | – | **noindex,nofollow** |
| `/partner/dashboard` | – | – | – | – | – | **noindex,nofollow** |
| `/maintenance` | – | – | – | – | – | **noindex,nofollow** |
| `/robots.txt` | n/a | n/a | n/a | n/a | n/a | serves rules (disallow `/api/`, `/login`, `/register`, `/dashboard`, `/owner/`, `/partner/`, `/maintenance`) |
| `/sitemap.xml` | n/a | n/a | n/a | n/a | n/a | serves only public + published + active URLs |

---

## 5. Performance Result

| Check | Result |
|---|---|
| Page-loader delay removed | ✅ No artificial 800–1200 ms delay; dismisses on `window.load` or 1500 ms ceiling |
| Hero subtitle in SSR HTML | ✅ `curl / \| grep "Gestun profesional"` matches in initial HTML (not just post-hydration) |
| Hero CTA in SSR HTML | ✅ `Tarik Tunai` and `Order Sekarang` both present in initial HTML |
| Image dimensions | ✅ All `<img>` in SSR HTML have `width`+`height` (e.g. `width="24" height="24"` × 62 instances, `width="20" height="14"` × 7, etc.) |
| Lazy-loading | ✅ Authored non-critical imgs use `loading="lazy"` |
| MapLibre on landing | ✅ NOT imported by landing (zero matches in SSR HTML) |
| Recharts on landing | ✅ NOT imported by landing (zero matches in SSR HTML) |
| `prefers-reduced-motion` | ✅ Two `@media (prefers-reduced-motion: reduce)` blocks in `globals.css` (line 1755 + line 2010) — disables decorative animations (hero card, dashboard mesh) while preserving essential UI transitions |
| Viewport meta | ✅ `<meta name="viewport" content="width=device-width, initial-scale=1"/>` — no `maximum-scale` or `user-scalable=no` restriction (accessibility-compliant) |

---

## 6. Structured Data Result

| Check | Result |
|---|---|
| Fake `aggregateRating` on homepage | ✅ **Removed**. `curl / \| grep aggregateRating` returns empty. Source comment in `json-ld.tsx` documents rationale. |
| Fake `aggregateRating` on `/lokasi/[slug]` | ✅ **Removed**. Source no longer emits a rating for individual location pages. |
| Duplicate JSON-LD on `/lokasi/[slug]` | ✅ **Removed**. Single canonical JSON-LD emission per page. |
| Fake "rating 4.9 dari 5" in FAQ | ✅ **Removed**. |
| Hardcoded 4.9/2847 on testimonials | ✅ **Removed**. `testimonials-section.tsx` now computes real aggregate from the testimonials array. |
| `safeJsonLd()` usage | ✅ All JSON-LD `<script>` emissions route through `safeJsonLd()` (XSS-safe serializer). |
| JSON-LD types present (homepage) | ✅ `FinancialService`, `FAQPage`, `OfferCatalog`, `Offer`, `Service`, `PostalAddress`, `GeoCoordinates`, `OpeningHoursSpecification`, `Country`, `Question`, `Answer` — all legitimate, no `AggregateRating`/`Review`/`Rating`. |
| Unused `safeJsonLd` import (lokasi client) | ✅ Removed (was a leftover after the duplicate-JSON-LD cleanup). |

---

## 7. Tests

| Suite | Tests | Pass | Fail | Result |
|---|---|---|---|---|
| `tests/seo/phase4-seo.test.ts` (new) | 27 | 27 | 0 | ✅ PASS |
| `tests/security/*` (existing) | — | — | — | ✅ PASS |
| `tests/transaction/*` (existing) | — | — | — | ✅ PASS |
| `tests/observability/phase3-observability.test.ts` (existing) | 36 | 36 | 0 | ✅ PASS (after env restoration) |
| **Total (full `bun test tests/`)** | **172** | **172** | **0** | ✅ **PASS** |
| ESLint (`bun run lint`) | — | — | — | ✅ **0 errors, 0 warnings** |

Phase 3 had 145 tests; Phase 4 adds 27 SEO tests → **172 total**. 0 regressions.

---

## 8. Changed Files

**Modified (existing)**
- `.env` — restored `TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true` (dev-only Phase 3 flag)
- `src/app/api/health/route.ts` — `Cache-Control: public, max-age=10`
- `src/app/api/ready/route.ts` — `Cache-Control: private, no-store, max-age=0, must-revalidate`
- `src/app/blog/[slug]/client.tsx` — image dims
- `src/app/blog/page.tsx` — image dims
- `src/app/faq/page.tsx` — `revalidate = 300`
- `src/app/layout.tsx` — viewport meta (no scaling restriction)
- `src/app/login/layout.tsx` — `robots: noindex,nofollow`
- `src/app/lokasi/[slug]/client.tsx` — removed fake aggregateRating, removed duplicate JSON-LD, removed unused `safeJsonLd` import, image dims
- `src/app/lokasi/[slug]/page.tsx` — `revalidate = 3600`
- `src/app/lokasi/client.tsx` — image dims
- `src/app/lokasi/page.tsx` — `revalidate = 3600`
- `src/app/robots.ts` — rewritten rules
- `src/app/sitemap.ts` — rewritten (public + published blog + active locations only)
- `src/components/landing/landing-page.tsx` — hero subtitle in SSR, stats labeled `(ilustrasi)`, de-faked trust signals, image dims + lazy, removed unused eslint-disable directive
- `src/components/landing/live-activity-feed.tsx` — "Live" → "Ilustrasi"
- `src/components/landing/rate-calculator.tsx` — image dims
- `src/components/landing/social-proof-toast.tsx` — "Transaksi Baru" → "Contoh Ilustrasi"
- `src/components/landing/testimonials-section.tsx` — removed hardcoded 4.9/2847, computes real aggregate
- `src/components/seo/json-ld.tsx` — removed fake aggregateRating and FAQ rating claim; uses `safeJsonLd()`
- `src/components/shared/desktop-navbar.tsx` — image dims
- `src/components/shared/footer.tsx` — image dims
- `src/components/shared/page-loader.tsx` — removed artificial delay, dismiss on `window.load` or 1500 ms ceiling, image dims
- `src/lib/observability/request-id.ts` — added `setNoStoreCacheHeaders()` + applied in `withObservability()` wrapper

**Created (new)**
- `src/app/dashboard/layout.tsx` — `noindex,nofollow`
- `src/app/maintenance/layout.tsx` — `noindex,nofollow`
- `src/app/owner/dashboard/layout.tsx` — `noindex,nofollow`
- `src/app/partner/dashboard/layout.tsx` — `noindex,nofollow`
- `src/app/register/layout.tsx` — `noindex,nofollow`
- `tests/seo/phase4-seo.test.ts` — 27 SEO tests

**Deleted**
- `public/robots.txt` — replaced by Next.js Metadata API (`src/app/robots.ts`)

---

## 9. Backlog (non-blocking)

1. **Pre-existing Prisma `mode: "insensitive"` on SQLite** — `src/lib/customer-utils.ts:139` uses `mode: "insensitive"` in `db.customer.findFirst`, which is not supported by SQLite. Caught by try/catch and gracefully handled (creates a new customer instead of reusing), so no user-visible impact, but the error is logged on every order POST. Recommend switching to a manual case-insensitive comparison or guarding `mode` by provider. **Not a Phase 4 regression** — present since Phase 2.
2. **Next.js "middleware" deprecation** — dev server emits `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` Cosmetic, no functional impact.
3. **MapLibre / Recharts bundle on dashboard** — out of scope for Phase 4 (landing only). If dashboard LCP becomes a concern in a future phase, consider dynamic-importing the chart/map components.
4. **No Lighthouse scores in this report** — per task rules, no Lighthouse audit was run and no invented scores are reported. Recommend running Lighthouse in a separate dedicated pass with a production build (`next build`) before public launch.

---

## 10. Verification

### Dev server
- Started `next dev -p 3000` (Turbopack) — `✓ Ready in 901 ms`.
- Listening on `*:3000`.
- No unhandled promise rejections, no React render errors, no SyntaxErrors in `dev.log`.
- Only log entries are structured Phase 3 observability events (info/warn) and one pre-existing `PrismaClientValidationError` from `customer-utils.ts:139` (see Backlog #1).

### curl verifications (all passed)

| Check | Command | Result |
|---|---|---|
| robots.txt rules | `curl -s http://localhost:3000/robots.txt \| head -20` | ✅ Disallows `/api/`, `/login`, `/register`, `/dashboard`, `/owner/`, `/partner/`, `/maintenance` for `*`, `Googlebot`, `Bingbot` |
| sitemap content | `curl -s http://localhost:3000/sitemap.xml \| head -20` | ✅ Contains `https://blackbear.cc`, `/order`, `/track` (public pages only; no auth/api/dashboard) |
| `/api/transactions` cache | `curl -sI http://localhost:3000/api/transactions \| grep -i cache-control` | ✅ `cache-control: private, no-store, max-age=0, must-revalidate` |
| Homepage hero SSR | `curl -s http://localhost:3000/ \| grep -oE 'Tarik Tunai\|Gestun profesional\|Order Sekarang'` | ✅ All three phrases present in initial HTML |
| Homepage JSON-LD | `curl -s http://localhost:3000/ \| grep -oE 'aggregateRating\|ratingValue\|reviewCount'` | ✅ **Empty** (no fake rating keys) |
| Viewport meta | `curl -s http://localhost:3000/ \| grep -o '<meta name="viewport"[^>]*>'` | ✅ `<meta name="viewport" content="width=device-width, initial-scale=1"/>` (no scaling restriction) |
| Login robots meta | `curl -s http://localhost:3000/login \| grep -oE '<meta name="robots"[^>]*>'` | ✅ `<meta name="robots" content="noindex, nofollow"/>` |
| Homepage canonical + OG | `curl -s http://localhost:3000/ \| grep -oE 'canonical\|og:'` | ✅ canonical + full OG card (og:title/description/url/site_name/locale/image+dimensions) |
| MapLibre/Recharts on landing | `curl -s http://localhost:3000/ \| grep -oE 'MapLibre\|Recharts'` | ✅ Empty (neither library in landing HTML) |
| JSON-LD types on homepage | `curl -s http://localhost:3000/ \| grep -oE '"@type":"[A-Za-z]+"'` | ✅ `FinancialService`, `FAQPage`, `OfferCatalog`, `Offer`, `Service`, `PostalAddress`, `GeoCoordinates`, `OpeningHoursSpecification`, `Country`, `Question`, `Answer` (no `AggregateRating`/`Review`) |

### Test runs
- `bun test tests/seo/phase4-seo.test.ts` → 27/27 pass (170 expect() calls, 1.75 s)
- `bun test tests/` → 172/172 pass (635 expect() calls, 19.74 s, 7 files)
- `bun run lint` → 0 errors, 0 warnings

### Issues fixed during verification (minimal diff)
1. **Removed** one unused `// eslint-disable-next-line react-hooks/exhaustive-deps` directive at `src/components/landing/landing-page.tsx:222` (ESLint flagged it as no longer needed after Phase 4 hero-subtitle refactor).
2. **Restored** `TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true` in `.env` (Phase 3 dev-only flag was lost during an env reset; required for the Phase 3 `/catatan` append test to pass; no production logic affected).

---

**Final verdict: ✅ PHASE 4 PASS**

- 172/172 tests pass (0 regressions, 27 new SEO tests).
- ESLint clean (0 errors, 0 warnings).
- All curl verifications pass.
- No runtime errors in dev.log caused by Phase 4 changes.
- Zero Prisma schema changes, zero new dependencies, zero transaction/fee/database/auth/Telegram/partner logic changes.
