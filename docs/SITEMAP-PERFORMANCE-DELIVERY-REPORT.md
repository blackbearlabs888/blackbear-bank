# Sitemap Delivery + Homepage Mobile Performance — Delivery Report

Task ID: `SITEMAP-PERFORMANCE-DELIVERY`

---

## 1. Baseline SHA

- **Baseline SHA:** `c8f55b387ab44c144356c21647c170b689b1cfb8` (`revisi`)
- **Working-tree state at baseline:** clean (blackbear-bank repo HEAD); sandbox-only files untracked (`.zscripts/`, `Caddyfile`, `db/`, `examples/`, `mini-services/`)
- **Repo:** `https://github.com/blackbearlabs888/blackbear-bank`

## 2. Final SHA / working-tree state

- **Final working-tree state:** modified `src/app/sitemap.ts`, `src/components/landing/landing-page.tsx`, `src/components/landing/animated-counter.tsx`, `src/components/landing/social-proof-toast.tsx`, `src/app/globals.css`, `package.json`, `bun.lock`; new files `src/__tests__/sitemap.test.ts`, `src/__tests__/animated-counter.test.tsx`, `vitest.config.ts`, `docs/SITEMAP-PERFORMANCE-DELIVERY-REPORT.md`, `worklog.md`. (No destructive git operations were used; `git reset --hard` / `git checkout --` were not run.)

## 3. Exact root cause — Sitemap

**Classification:** `SITEMAP_CONTENT_FAILURE`

**Exact evidence:**

Production `https://www.blackbear.cc/sitemap.xml` returns HTTP 200, `Content-Type: application/xml`, 4990 bytes, 23 `<loc>` entries, XML well-formed, no redirect (for the www canonical). Googlebot (smartphone + desktop) receives the identical body. **However**, every blog-post `<url>` entry contains an invalid image entry:

```xml
<image:image>
<image:loc>[object Object]</image:loc>
</image:image>
```

This appears for all 9 published blog posts. The validation checklist (§2.4) explicitly requires "Tidak ada `[object Object]`" and the test requirements (§2.9 #12) require "Body tidak mengandung HTML atau `[object Object]`."

**Root cause:** Next.js 16's `MetadataRoute.Sitemap` type defines `images?: string[]` (an array of URL **strings**). The framework's sitemap serializer (`node_modules/next/dist/build/webpack/loaders/metadata/resolve-route-data.js`, `resolveSitemap`) interpolates each array entry directly:

```js
for (const image of item.images) {
  content += `<image:image>\n<image:loc>${image}</image:loc>\n</image:image>\n`;
}
```

The source `src/app/sitemap.ts` passed an array of **objects** (`{ loc: post.featuredImage, title: post.title }`) instead of strings. When the serializer interpolates an object via the template literal `${image}`, JavaScript coerces it via `Object.prototype.toString()` → `"[object Object]"`. This was reproduced locally: even a clean URL string produced `[object Object]` because the *entire* `{loc,title}` object was being stringified, not the URL field.

**Source change required:** YES — minimal generator/serialization fix (emit `images: [urlString]` per the Next.js 16 API, with a guard against non-URL / `[object Object]` / empty / null values so dirty data can never reach the serializer).

## 4. Sitemap classification

`SITEMAP_CONTENT_FAILURE`

- HTTP 200 ✓ (not `SITEMAP_HTTP_FAILURE`)
- Body is valid XML (not HTML/malformed/empty) ✓ (not `SITEMAP_CONTENT_FAILURE` by structure)
- BUT body contains semantically-invalid `[object Object]` image:loc values → content failure by value (matches the explicit `[object Object]` checklist item)
- No redirect chain on canonical www ✓ (not `SITEMAP_REDIRECT_OR_HOST_FAILURE`)
- Middleware bypasses `/sitemap.xml` ✓; Googlebot receives the same body as browser ✓ (not `SITEMAP_MIDDLEWARE_OR_FIREWALL_FAILURE`)
- DB queries are stable (5/5 consecutive requests identical, ~8ms) ✓ (not `SITEMAP_DATA_DEPENDENCY_FAILURE`)
- Source change required → not `GSC_STALE_SUBMISSION`

## 5. Files changed

| File | Reason |
|---|---|
| `src/app/sitemap.ts` | Fix `[object Object]` in `<image:loc>`: emit `images: [urlString]` (Next.js 16 `string[]` API) with a guard that skips non-string / `[object Object]` / non-http(s) / empty values. Blog `<url>` entry preserved regardless. Existing hardening (revalidate=3600, 3-query approach, slug dedup, active-partner filter, `/track` exclusion, structured error log + rethrow) untouched. |
| `src/__tests__/sitemap.test.ts` | NEW — 14 targeted sitemap regression tests (structure, static URLs, `/track` absent, published-only blog, active-partner filter, slug dedup, Palangka Raya canonical, hostname consistency, `[object Object]` regression, clean-URL emission, dirty-data skip, no HTML, error rethrow). |
| `src/components/landing/landing-page.tsx` | Hero subtitle: removed typewriter `useState`/`useEffect`/18ms `setInterval`/cursor span → static text (no full→empty flash). Added `decoding="async"` to the 2 payment-type logo `<img>` tags. |
| `src/components/landing/animated-counter.tsx` | Rewrote to render `formatter(target)` statically — no `useState`, no rAF loop, no IntersectionObserver, no direct textContent mutation. Memoised pure component. Props interface preserved. |
| `src/components/landing/social-proof-toast.tsx` | Removed 50ms `setInterval`/`setProgress` React state. Progress bar now driven by a CSS transform (`scaleX`) animation. Item switching retains state at item-switch cadence. "Contoh Ilustrasi" disclosure preserved. |
| `src/app/globals.css` | Added `@keyframes social-proof-progress` + `.social-proof-progress` class (GPU-accelerated transform). Added `.social-proof-progress` to the `prefers-reduced-motion` disable list. |
| `src/__tests__/animated-counter.test.tsx` | NEW — 6 counter static-SSR regression tests. |
| `vitest.config.ts` | NEW — minimal vitest config resolving the `@/*` path alias (pre-existing tests were non-functional: vitest was not installed, no alias config). |
| `package.json`, `bun.lock` | Added devDependencies `vitest`, `vite-tsconfig-paths`, `lighthouse`, `puppeteer` (lighthouse/puppeteer installed for measurement attempt; puppeteer chromium binary cached at `~/.cache/puppeteer`). |

## 6. Before/after HTTP matrix (production + local)

### Production — `https://www.blackbear.cc/sitemap.xml`

| URL | User-agent | Status | Redirect | Content-Type | Time | `<loc>` count | Result |
|---|---|---|---|---|---|---|---|
| `https://www.blackbear.cc/sitemap.xml` | Chrome (browser) | 200 | 0 | application/xml | 0.43s | 23 | XML valid; **contains `[object Object]`** (pre-deploy) |
| `https://blackbear.cc/sitemap.xml` | Chrome (browser) | 200 | 1 (→ www) | application/xml | 0.97s | 23 | single 301 to canonical www, identical body |
| `https://www.blackbear.cc/sitemap.xml` | Googlebot smartphone | 200 | 0 | application/xml | 0.42s | 23 | identical body to browser |
| `https://www.blackbear.cc/sitemap.xml` | Googlebot desktop | 200 | 0 | application/xml | 0.29s | 23 | identical body to browser |

### Production — `robots.txt`

| URL | User-agent | Status | Redirect | Content-Type | `Sitemap:` directive | Result |
|---|---|---|---|---|---|---|
| `https://www.blackbear.cc/robots.txt` | browser | 200 | 0 | text/plain | `https://www.blackbear.cc/sitemap.xml` | canonical www ✓ |
| `https://blackbear.cc/robots.txt` | browser | 200 | 1 (→ www) | text/plain | (same) | single 301 to canonical www |

### Local — `http://localhost:3000/sitemap.xml` (after fix)

| Run | Status | Content-Type | Time | Size | `<loc>` | `[object Object]` |
|---|---|---|---|---|---|---|
| 1 | 200 | application/xml | 11.8ms | 1193b | 7 (no blog/partner data locally) | ABSENT ✓ |
| 2 | 200 | application/xml | 8.2ms | 1193b | 7 | ABSENT ✓ |
| 3 | 200 | application/xml | 8.5ms | 1193b | 7 | ABSENT ✓ |
| 4 | 200 | application/xml | 9.2ms | 1193b | 7 | ABSENT ✓ |
| 5 | 200 | application/xml | 7.2ms | 1193b | 7 | ABSENT ✓ |

**Note:** Production will be corrected on the next Vercel redeploy (the source fix is in the deploy ZIP). After deploy, the production sitemap will no longer contain `[object Object]`; clean `featuredImage` URLs will emit valid `<image:loc>` entries, and dirty/non-URL `featuredImage` values will be skipped (blog `<url>` preserved).

## 7. XML validation (production, pre-deploy)

- XML declaration present ✓ (`<?xml version="1.0" encoding="UTF-8"?>`)
- Single root `<urlset>` ✓
- Namespace correct ✓ (`http://www.sitemaps.org/schemas/sitemap/0.9` + `http://www.google.com/schemas/sitemap-image/1.1`)
- 23 `<loc>` entries; opening/closing `<url>` balanced ✓
- All `<loc>` are absolute HTTPS `https://www.blackbear.cc/...` ✓ (canonical www consistent)
- `/track` absent ✓
- No duplicate exact URLs ✓
- No unescaped XML characters ✓
- **`[object Object]` PRESENT ✗** (the failure being fixed)
- No HTML / JSON / login / challenge in body ✓

## 8. GSC owner action (after deployment)

1. Open GSC property `blackbear.cc`.
2. Remove the previously-failed sitemap submission if still recorded.
3. Submit **only** `sitemap.xml` (i.e. `https://www.blackbear.cc/sitemap.xml`).
4. Do **not** use "Minta Pengindeksan" for the sitemap.
5. Wait for GSC processing.
6. Verify "Halaman yang ditemukan" > 0 and that no image-error is reported for the sitemap.

## 9. Performance baseline (from production PageSpeed, pre-task)

### Mobile
- Performance: 48 · FCP: 1.9s · LCP: 7.8s · TBT: 670ms · Speed Index: 11.3s · CLS: 0.063
- SEO: 100 · Accessibility: 90 · Best Practices: 100
- Diagnostics: JS execution ~5.4s; main-thread work ~10.3s; unused JS ~292 KiB; render-blocking ~600ms; image delivery ~480 KiB

### Desktop
- Performance: 77 · FCP: 0.3s · LCP: 1.2s · TBT: 280ms · Speed Index: 2.9s · CLS: 0.091
- SEO: 100 · Accessibility: 96 · Best Practices: 100

## 10. Architecture experiment — control / variant

**Status:** BLOCKED — not executed.

The contract §3.6 requires measurement against a **local production build** ("Gunakan local production build, bukan dev mode") and §3.2 explicitly rejects dev-mode comparison ("Jangan membandingkan dev mode dengan production build"). The sandbox environment policy forbids the production build command (`bun run build`). Without a production build, the architecture gate (TBT −30%/−500ms or ≤500ms; React DOM evaluation −25%; no LCP regression >10%; no Speed Index regression >10%; CLS ≤0.10) cannot be validly measured.

Per §3.6 ("Jika tidak memenuhi gate: Restore experiment. Jangan commit. Stop dan report") and §3.2 ("Jangan menggunakan angka estimasi sebagai PASS"), an unmeasured refactor of the 71 KB single-client `LandingPage` component into a Server-Component shell + client islands must **not** be committed. The Lighthouse + puppeteer toolchain was installed (chromium cached at `~/.cache/puppeteer`), but a valid measurement requires a production build which the sandbox disallows.

**Decision:** The server-shell experiment is deferred. The correctness cleanup (§3.3) is the delivered performance improvement — it removes concrete, verifiable high-frequency JavaScript (the 18 ms typewriter interval + ~150 re-renders, the 3×2000 ms counter rAF loops + ~360 re-renders, and the 50 ms social-proof progress interval + ~100 re-renders per cycle).

## 11. Final mobile/desktop results

A production-grade Lighthouse measurement could not be produced in the sandbox (production build forbidden; dev-mode rejected by contract). The following evidence is available:

### Correctness (behaviourally verified via agent-browser)
| Check | Mobile (390×844) | Desktop (1440×900) |
|---|---|---|
| Homepage HTTP 200, no compile error | ✓ | ✓ |
| Hero subtitle static (no full→empty flash) | ✓ | ✓ |
| Counter values static (`10K+`, `99%`, `24/7`) | ✓ | ✓ |
| Typewriter cursor absent | ✓ (0 elements) | ✓ |
| Social-proof toast appears after 5 s, opacity 1, `social-proof-progress` class applied | ✓ | ✓ |
| Calculator dynamic import loads + interactive | ✓ | ✓ |
| WhatsApp FAB links unchanged (`wa.me/628551110023`) | ✓ | ✓ |
| Cookie consent present | ✓ | ✓ |
| Footer present, content flows naturally (7940 px body) | ✓ | ✓ |
| Page errors / hydration errors / console errors | 0 | 0 |

### JS execution removed (deterministic, from source)
- Hero typewriter: 18 ms `setInterval` over ~2.7 s + ~150 `setState` re-renders → **removed**
- Counter rAF: 3 counters × 2000 ms × 60 fps ≈ 360 `setState` re-renders → **removed**
- Social-proof progress: 50 ms `setInterval` × 100 ticks per 5 s cycle → **removed** (replaced by GPU CSS transform)

### Tests / lint
- Full vitest suite: **86 / 86 pass**
- ESLint: **clean** (`eslint .` exits 0 with no warnings)

## 12. Tests / lint / build

- **Targeted sitemap tests:** 14 pass (`src/__tests__/sitemap.test.ts`)
- **Targeted counter tests:** 6 pass (`src/__tests__/animated-counter.test.tsx`)
- **Existing analytics / fee / auth / toast tests:** 66 pass (`get-error-message.test.ts` 47 + `get-login-error-message.test.ts` 19)
- **Full suite:** 86 / 86 pass
- **ESLint:** clean
- **Production build:** not executed — sandbox policy forbids `bun run build`. The dev server (Turbopack) compiles the homepage + sitemap + robots cleanly (HTTP 200). Vercel will execute the production build on deploy from the source ZIP.
- **Browser smoke:** zero page errors, zero console errors, zero hydration errors (verified on mobile + desktop viewports via agent-browser).

## 13. Scope locks (systems that remained unchanged)

- Lighthouse SEO score 100 (no SEO metadata, title, meta description, schema markup, canonical, copy, internal-link mapping, keyword targeting, or indexability rules were touched)
- `robots.ts` rules + canonical sitemap directive (production already correct: `https://www.blackbear.cc/sitemap.xml`)
- `src/middleware.ts` matcher (already bypasses `/sitemap.xml` + `/robots.txt`)
- Canonical `/lokasi/palangka-raya`
- Prisma schema + production database (local dev db seeded for verification only)
- API contracts
- GA4, Consent Mode v2, analytics events
- WhatsApp URL + `click_wa` event
- Fee / transaction / discount / fraud / commission / auth / status / snapshot engines
- Homepage copy + pilar-page copy
- Prefetch configuration + hashed framework chunks
- Mass provider/location pages
- FAQ / blog / location content
- Calculator formula

## 14. Remaining limitations

1. **Server-shell experiment deferred.** The 71 KB single-client `LandingPage` was not refactored into a Server-Component shell + client islands because the architecture gate (§3.6) cannot be validly measured without a production build, which the sandbox forbids. This is the largest remaining TBT opportunity and should be revisited in an environment where a production build + Lighthouse measurement is possible.
2. **Lighthouse measurement not produced.** No mobile/desktop Lighthouse JSON is available from this run (production build forbidden; dev-mode rejected by contract). The PageSpeed baseline (Mobile 48 / Desktop 77) is unchanged as a measured number; the correctness cleanup is a verifiable JS-execution reduction but its Lighthouse delta is not measured here.
3. **Image delivery limited.** ~20 third-party images on the homepage (Google Play icons, gstatic thumbnails, Wikipedia, Imgur, Twitter avatars, etc.) were not re-hosted locally because their usage rights are unclear (§3.7 forbids this). Only `decoding="async"` was added to the 2 payment-type logo `<img>` tags. Converting these to a self-hosted WebP/AVIF asset library requires legal/clearance work outside this task's scope.
4. **Render-blocking not addressed.** §3.8 requires a production trace after architecture/image optimisation to confirm material saving; no production trace is available, so no render-blocking change was made (§3.8 stop condition met).
5. **Production build verification pending.** Vercel must execute the production build on deploy. The dev-server compile + 86 tests + clean ESLint are the pre-deploy evidence.

## 15. Deployment status

- Source changes are **final and committed to the working tree** (not yet pushed).
- The deploy ZIP (`blackbear-vercel-deploy.zip`) contains all source/config files required by Vercel.
- After Vercel redeploy: re-probe `https://www.blackbear.cc/sitemap.xml` — confirm HTTP 200, `application/xml`, no `[object Object]`, clean `<image:loc>` URLs. Then perform the GSC owner action (§8).
- **Do not auto-deploy.** Owner must deploy + resubmit GSC.
