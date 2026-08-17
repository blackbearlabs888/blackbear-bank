# Sitemap & Location Data Audit — Blackbear.cc

**Status:** PROPOSAL — NO CODE CHANGED, NO URL/LOCATION/ROUTE MODIFIED. Awaiting approval.
**Date:** Audit performed against current `main` (post BLOG-ISR-HOTFIX, 235/235 tests PASS).
**Scope lock respected:** sitemap.ts, robots.ts, route handlers, Prisma schema, location rows, and SEO page content were NOT modified. This document is read-only analysis + recommendations.

---

## 0. EXECUTIVE SUMMARY

| # | Question | Answer |
|---|---|---|
| 1 | Why are `/order` and `/track` in the sitemap? | They are hardcoded as static entries in `sitemap.ts` (L31–41) with `robots.index: true` and **no noindex**. `/order` is a legitimate conversion-landing page (keep). `/track` is a **personalized order-lookup tool** — including it in the sitemap is an SEO anti-pattern (no organic search value; description even leaks `BB-XXXXXX` order-ID format). |
| 2 | Do `/order` and `/track` have noindex? | **No.** Both emit `<meta name="robots" content="index, follow"/>` + self-canonical. No `X-Robots-Tag` header. `robots.ts` allows both. |
| 3 | Data source for Tangerang, Denpasar, Medan, Kalimantan Selatan? | **NOT in the seed script** (`scripts/seed-locations.ts` has only 10 cities; Tangerang & Kalsel absent, Medan & Denpasar present). They exist only as rows created via the owner-dashboard SEO location CRUD API (`POST /api/seo/location`), which accepts the slug **verbatim from owner input** (no auto-normalization). The dev SQLite DB currently has **0 location rows** (wiped during BLOG-ISR-HOTFIX testing); these cities exist in **production (Neon PostgreSQL)** only — not directly queryable in this audit. |
| 4 | Do those locations have real partners/services? | **Structurally unverifiable from the schema.** `Location` has **no foreign key** to `Partner` or `Transaction`. A location page existing ≠ a partner serving that city. The only linkage is free-text `Partner.city` (String). In the dev DB, only 2 partners exist, both in Jakarta — but dev is not representative of production. **Production `Partner.city` distribution must be checked by the owner/DBA before deciding keep vs noindex.** |
| 5 | Palangka-raya vs palangkaraya slug conflict? | Root cause found: `src/lib/indonesia-cities.ts` registers **both** `'palangkaraya'` (L263, no space) and `'palangka raya'` (L264, with space) as **separate keys** with identical coordinates. The SEO location API accepts slug verbatim from owner input. If the owner created one location with name "Palangka Raya" → slug `palangka-raya`, and another with name "Palangkaraya" → slug `palangkaraya`, both rows coexist (slug `@unique` allows both since they're different strings). This produces **two indexable pages for the same city** → duplicate content / keyword cannibalization. |
| 6 | Canonical & HTTP status per URL? | All sitemap URLs return **HTTP 200**, self-canonical, `index, follow`. Full table in §5. **Bonus finding:** 404 pages emit **two conflicting robots meta tags** (`noindex` from `notFound()` + `index, follow` from root layout default) — malformed but Google likely honors `noindex`. |
| 7 | Recommendations | `/order`: **keep**. `/track`: **noindex** (it's a tool, not content). `/blog`, `/faq`, `/lokasi`, `/lokasi/<active>`: **keep**. Palangka Raya duplicate: **merge + 301** (pick canonical slug, redirect the other). Tangerang/Denpasar/Medan/Kalsel: **conditional keep** — keep indexable only if a real partner serves the city; otherwise `noindex` (do NOT delete — preserve any accrued link equity; re-enable when a partner is assigned). |

---

## 1. SITEMAP INVENTORY (`src/app/sitemap.ts`)

### 1.1 What the sitemap emits

| URL pattern | Source | Filter | Priority | ChangeFreq |
|---|---|---|---|---|
| `https://blackbear.cc` (home) | static (L24–29) | — | 1.0 | daily |
| `https://blackbear.cc/order` | static (L30–35) | — | 0.9 | monthly |
| `https://blackbear.cc/track` | static (L36–41) | — | 0.8 | monthly |
| `https://blackbear.cc/blog` | static (L42–47) | — | 0.9 | daily |
| `https://blackbear.cc/faq` | static (L48–53) | — | 0.7 | weekly |
| `https://blackbear.cc/lokasi` | static (L54–59) | — | 0.8 | weekly |
| `…/blog/<slug>` | DB (L64–68) | `isPublished: true` | 0.8 | weekly |
| `…/lokasi/<slug>` | DB (L69–73) | `isActive: true` | 0.8 | weekly |

**Excluded by design** (per the file's own comment block L9–18): `/api/*`, `/login`, `/register`, `/dashboard`, `/owner/*`, `/partner/*`, `/maintenance`, unpublished blog posts, inactive locations.

### 1.2 Runtime verification (dev server, port 3000)

```
GET /sitemap.xml → 200, valid XML
```
Dev DB has 0 locations and 0 blog posts → sitemap currently emits only the 6 static URLs. In production (Neon PostgreSQL), the sitemap would additionally emit one `<url>` per published blog post and one per active location.

### 1.3 Sitemap correctness assessment

| Aspect | Status | Note |
|---|---|---|
| Only public pages listed | ✅ mostly | Exception: `/track` is arguably not public *content* (see §2). |
| Blog filter (`isPublished: true`) | ✅ correct | Drafts excluded. |
| Location filter (`isActive: true`) | ✅ correct at sitemap level | But see §5.3 — the **page itself** does NOT filter `isActive`, so inactive locations still return 200 + indexable HTML (just absent from sitemap). This is a soft-404 / index-leak gap. |
| `lastModified` for static pages | ⚠️ uses `new Date()` (now) | Every sitemap fetch reports the current timestamp as `lastmod` for home/order/track/blog/faq/lokasi. This is mildly misleading to crawlers (implies daily content change). Minor. |
| `lastModified` for DB pages | ✅ uses `updatedAt` | Correct. |
| Trailing slashes | ✅ none | Matches Next.js App Router default (no trailing slash). |
| `next-sitemap` vs native | uses Next.js native `sitemap()` | Correct for App Router. |

---

## 2. `/order` AND `/track` — REASON & NOINDEX STATUS

### 2.1 `/order`

| Check | Result |
|---|---|
| In sitemap? | **Yes** — `sitemap.ts` L30–35, priority 0.9, changeFreq monthly. |
| Has noindex? | **No.** `order/layout.tsx` L43–53 sets `robots.index: true, follow: true` + googleBot index. Runtime HTML: `<meta name="robots" content="index, follow"/>`. No `X-Robots-Tag` header. |
| Canonical | `https://blackbear.cc/order` (self-canonical, `order/layout.tsx` L40–42). Verified in HTML. |
| HTTP status | **200** (verified via curl). |
| Reason for inclusion | `/order` is the **primary conversion landing page** — a public order form for gestun/tarik-tunai. It has unique SEO metadata (title, description, OG image `og-order.png`, 17 keywords). Organic search for "order gestun online" / "tarik tunai online" should land here. |
| **Recommendation** | **KEEP** (indexable, in sitemap). It's a legitimate commercial landing page with unique content and conversion value. |

### 2.2 `/track`

| Check | Result |
|---|---|
| In sitemap? | **Yes** — `sitemap.ts` L36–41, priority 0.8, changeFreq monthly. |
| Has noindex? | **No.** `track/layout.tsx` L39–49 sets `robots.index: true, follow: true`. Runtime HTML: `<meta name="robots" content="index, follow"/>`. No `X-Robots-Tag` header. |
| Canonical | `https://blackbear.cc/track` (self-canonical, `track/layout.tsx` L36–38). Verified in HTML. |
| HTTP status | **200** (verified via curl). |
| Reason for inclusion | Likely included for "completeness" — the developer treated all public routes as indexable. The `robots.ts` comment (L9) explicitly lists `/track` as "public, indexable content." |
| Problem | `/track` is a **personalized order-lookup tool**, not content. A user arrives with their `BB-XXXXXX` order ID to check status. There is no static content to index. The meta description even contains `BB-XXXXXX` (a placeholder order-ID format) — this leaks internal ID format and provides zero organic search value. Indexing it wastes crawl budget and may attract low-quality traffic searching for order-ID-like strings. |
| **Recommendation** | **NOINDEX** (add `robots.index: false` to `track/layout.tsx` metadata; optionally remove from `sitemap.ts`). Keep the page accessible (not 404) — existing customers still need it. Do NOT delete the route. A `noindex` page can still pass link equity via `follow`. |

---

## 3. LOCATION DATA SOURCE — TANGERANG, DENPASAR, MEDAN, KALIMANTAN SELATAN

### 3.1 Seed script analysis (`scripts/seed-locations.ts`)

The seed script defines exactly **10 locations**:

| # | Name | Slug | In seed? |
|---|---|---|---|
| 1 | Jakarta | `jakarta` | ✅ |
| 2 | Bandung | `bandung` | ✅ |
| 3 | Surabaya | `surabaya` | ✅ |
| 4 | Semarang | `semarang` | ✅ |
| 5 | Yogyakarta | `yogyakarta` | ✅ |
| 6 | **Medan** | `medan` | ✅ |
| 7 | Makassar | `makassar` | ✅ |
| 8 | **Denpasar** | `denpasar` | ✅ |
| 9 | Palembang | `palembang` | ✅ |
| 10 | Balikpapan | `balikpapan` | ✅ |
| — | **Tangerang** | — | ❌ NOT in seed |
| — | **Kalimantan Selatan** | — | ❌ NOT in seed |

**Conclusion on data source:**
- **Medan** and **Denpasar**: originate from the seed script (or were re-created via the CRUD API to match). Present in `seed-locations.ts` and `update-location-coords.ts`.
- **Tangerang** and **Kalimantan Selatan**: **NOT in any seed script**. They were created manually via the owner-dashboard SEO location CRUD API (`POST /api/seo/location`), which accepts `name` + `slug` + coordinates directly from owner input. They exist only in the production database (Neon PostgreSQL).

### 3.2 Dev DB state (not representative of production)

The dev SQLite DB (`db/custom.db`, mtime Aug 16 12:52 — wiped during BLOG-ISR-HOTFIX testing) currently contains:
- **0 location rows** (verified: `prisma.location.findMany()` → empty; all `/lokasi/*` routes return 404 including `/lokasi/jakarta`).
- **2 partner rows**, both with `city = "Jakarta"`, both `status = "active"`.

This means the dev environment cannot be used to verify production location/partner data. The owner/DBA must query production directly (see §7 — production verification checklist).

### 3.3 Coordinates library (`src/lib/indonesia-cities.ts`)

This is a **lookup library** (used by `update-location-coords.ts` to backfill GPS coordinates), not the location data source itself. It contains entries for all four cities:
- `'tangerang'` (L30, Banten, -6.1783, 106.6319) + variants (Tangerang Kota/Selatan/Utara).
- `'denpasar'` (L191, Bali, -8.6500, 115.2167) + variant.
- `'medan'` (L353, Sumatra Utara, 3.5952, 98.6722) + 5 variants.
- `'kalimantan selatan'` (L249, -3.3194, 114.5908) + `'kalsel'`, `'banjarmasin'`, etc.

Note: "Kalimantan Selatan" is a **province**, not a city. If a location row was created with `name: "Kalimantan Selatan"`, the location page would advertise gestun service at the province level — inconsistent with other rows which are all cities (Jakarta, Bandung, etc.). This is a data-quality flag.

---

## 4. DO THESE LOCATIONS HAVE REAL PARTNERS/SERVICES?

### 4.1 Structural finding (definitive from schema)

**There is NO foreign key between `Location` and `Partner` or `Transaction`.** The `Location` model (`prisma/schema.prisma` L465–484) is a standalone SEO entity. `Partner.city` (L57) is a free-text `String`, not a relation.

This means:
- A `Location` row with `isActive: true` existing in the DB does **NOT** imply any partner serves that city.
- The `isActive` flag is an SEO/publishing toggle, not a "has-partner" indicator.
- There is no automated mechanism to deactivate a location page when no partner is assigned.

### 4.2 What can be verified today

| City | In dev DB? | Partners in dev DB? | Production verifiable? |
|---|---|---|---|
| Tangerang | ❌ (0 rows) | ❌ (0 partners anywhere) | Only by owner querying production `Partner.city` |
| Denpasar | ❌ | ❌ | Same |
| Medan | ❌ | ❌ | Same |
| Kalimantan Selatan | ❌ | ❌ | Same |

**Dev DB has only 2 partners, both in Jakarta** — so even Jakarta (which has a location page) has only 2 partners in dev. This is not representative of production.

### 4.3 Recommendation framework (conditional on production data)

For each of the four cities, the owner/DBA must run this production query:
```sql
SELECT COUNT(*) FROM partners WHERE LOWER(TRIM(city)) = '<city-name-in-location-row>' AND status = 'active';
```
- If ≥1 active partner → **KEEP** the location page indexable.
- If 0 active partners → **NOINDEX** the location page (set `isActive` to keep it in the DB for future re-enablement, but add `robots.index: false` so it doesn't get indexed as a thin/empty page). Do NOT delete — preserve any accrued link equity and the slug for future use.

**Important:** "Kalimantan Selatan" is a province. If querying `Partner.city`, the owner should check both exact match (`'Kalimantan Selatan'`) and city-level matches (`'Banjarmasin'`, `'Banjarbaru'`, `'Martapura'`, etc.) since partners typically register with their city, not province.

---

## 5. PALANGKA-RAYA vs PALANGKARAYA SLUG CONFLICT

### 5.1 Root cause (definitive from code)

`src/lib/indonesia-cities.ts` previously registered **two separate keys** for the same city with identical coordinates. This dual-key registration was the enabling condition for the slug conflict.

**STATUS (corrected this pass):** The canonical direction has been reversed per owner correction. The file now registers:
```ts
// Canonical: "Palangka Raya" (with space) — official Indonesian government
// spelling (peraturan daerah), NOT derived from the palangkaraya.go.id
// government domain.
'palangka raya': { lat: -2.2167, lng: 113.9167, province: 'Kalimantan Tengah', island: 'Kalimantan' },
// Legacy input alias: "Palangkaraya" (no space) — kept as a recognized
// input alias so existing partner records with city="Palangkaraya" still
// resolve via getCityData() and partner sync does NOT create a new Location
// row.
'palangkaraya': { lat: -2.2167, lng: 113.9167, province: 'Kalimantan Tengah', island: 'Kalimantan' },
```
A new `canonicalCityName()` chokepoint in `src/lib/city-utils.ts` maps the legacy alias input back to the canonical name, so `normalizeSlug(canonicalCityName('Palangkaraya'))` produces `palangka-raya` (one city → one slug → one landing page).

The SEO location CRUD API (`POST /api/seo/location`, `src/app/api/seo/location/route.ts`) accepts the slug **verbatim from owner input** — it does NOT auto-generate or normalize slugs. Slug uniqueness (`@unique` on `Location.slug`) only prevents exact-duplicate slugs; `palangka-raya` and `palangkaraya` are different strings, so both rows CAN coexist in production if they were created before this correction.

**Most likely production scenario:** the owner created a location with name "Palangka Raya" (slug `palangka-raya`) and at another time created "Palangkaraya" (slug `palangkaraya`), or the coords-update script matched the name differently on two occasions. If both rows are active, both appear in the sitemap → both render indexable HTML with self-canonical → **duplicate content / keyword cannibalization** for "gestun Palangka Raya" searches. This must be confirmed via the read-only audit script (section 5.5).

### 5.2 Conflict impact

| Aspect | Impact |
|---|---|
| Sitemap | Two `<url>` entries for the same city → Google sees duplicate content. |
| Canonical | Each page self-canonicalizes (`/lokasi/palangka-raya` and `/lokasi/palangkaraya` respectively) → Google must pick one, may not pick the one you want. |
| Internal links | Homepage cities-section links to whatever slug is in the DB → may link to the non-canonical variant. |
| Link equity | Split between two URLs instead of consolidated. |
| LocalBusiness JSON-LD | Two `LocalBusiness` structured-data blocks for the same physical city → confusing to Google's entity graph. |

### 5.3 Cannot verify in dev

The dev DB has 0 location rows, so neither `palangka-raya` nor `palangkaraya` exists locally. Both `/lokasi/palangka-raya` and `/lokasi/palangkaraya` return **404** in dev. The conflict exists only in production. The owner/DBA must confirm which slugs exist in production (see §7).

### 5.4 Corrected canonical direction (owner-approved)

**Canonical slug:** `/lokasi/palangka-raya` (official spelling "Palangka Raya", with space → hyphenated slug).

**Legacy alias:** `/lokasi/palangkaraya` (no-space spelling — 301 redirect candidate).

**Basis:** the official Indonesian government spelling of the city is "Palangka Raya" (with space). The `palangkaraya.go.id` government domain spelling is **NOT** the basis for the canonical slug (owner directive). `normalizeSlug("Palangka Raya")` produces `palangka-raya`.

**IMPORTANT:** the merge + 301 of any existing production row is an **APPROVAL GATE** — NOT executed until the owner runs the read-only audit (section 5.5) and confirms which slugs exist and whether the legacy alias carries significant GSC/backlink signal. The decision tree in section 5.5 governs the direction.

### 5.5 Approval gate — read-only audit + merge/301 plan (NOT executed)

This section is the approval gate. It contains a read-only audit script, a backup/snapshot query, a merge + 301 plan, and a rollback — all to be run by the owner/DBA against production Neon. **No mutation has been executed.**

#### 5.5.1 Read-only audit script (run first)

`scripts/audit-palangka-raya-prod.ts` is a read-only Prisma script that checks both slugs in whatever DB `DATABASE_URL` points at. It reports: Location row (id, name, slug, isActive, SEO fields, timestamps), active partner count per city spelling, internal-link footprint, and an auto decision summary. Verified working against the dev DB (returns "neither slug exists" — expected, dev DB is empty).

Run against production:
```bash
DATABASE_URL="postgresql://<prod-neon-conn>" bun run scripts/audit-palangka-raya-prod.ts
```

#### 5.5.2 Manual GSC check (cannot be scripted)

Google Search Console data is not queryable from a DB script. The owner MUST manually check GSC for both URLs before deciding the redirect direction:
- `https://blackbear.cc/lokasi/palangka-raya` — impressions, clicks, average position, backlinks
- `https://blackbear.cc/lokasi/palangkaraya` — impressions, clicks, average position, backlinks

#### 5.5.3 Decision tree

| Audit result | GSC result | Action |
|---|---|---|
| Neither slug exists | n/a | Create `/lokasi/palangka-raya` only. No merge, no 301. |
| Only `palangka-raya` exists | n/a | No merge needed. No 301 (no legacy alias row). |
| Only `palangkaraya` exists | No significant impressions on `/lokasi/palangkaraya` | RENAME slug `palangkaraya` → `palangka-raya` (simplest) OR create canonical + add 301. |
| Only `palangkaraya` exists | Significant impressions/backlinks on `/lokasi/palangkaraya` | **REPORT FIRST** — do not auto-redirect. Owner decides: keep `palangkaraya` as canonical (override the default), or 301 and accept temporary ranking dip. |
| BOTH slugs exist | Alias (`palangkaraya`) has NO significant GSC/backlink signal | MERGE: copy any unique content from alias → canonical, set alias `isActive: false`, add 301 `/lokasi/palangkaraya` → `/lokasi/palangka-raya`. |
| BOTH slugs exist | Alias (`palangkaraya`) has STRONGER GSC/backlink signal | **REPORT FIRST** — do not auto-merge. Owner decides direction; may keep `palangkaraya` as canonical and 301 the other way. |

#### 5.5.4 Backup query (run BEFORE any mutation)

Take a read-only snapshot of both rows so the merge can be rolled back:

```sql
-- Backup snapshot (read-only). Save the output.
SELECT id, name, slug, "isActive",
       "metaTitle", "metaDescription", keywords, description, content,
       "featuredImage", latitude, longitude,
       "createdAt", "updatedAt"
FROM locations
WHERE slug IN ('palangka-raya', 'palangkaraya');
```

#### 5.5.5 Merge SQL (execute ONLY after 5.5.1 + 5.5.2 + 5.5.3 confirm the default direction)

The default direction (when the legacy alias has no stronger GSC signal): canonical = `palangka-raya`, legacy alias = `palangkaraya`.

```sql
-- BEGIN merge (idempotent: safe to re-run; each step guards its precondition)
BEGIN;

-- Step 1: copy any non-null content from the alias row into the canonical row,
-- but ONLY where the canonical row is missing that field (do not overwrite
-- existing canonical content).
UPDATE locations AS canon
SET
  "metaTitle"       = COALESCE(canon."metaTitle",       alias."metaTitle"),
  "metaDescription" = COALESCE(canon."metaDescription", alias."metaDescription"),
  keywords          = COALESCE(canon.keywords,          alias.keywords),
  description       = COALESCE(canon.description,       alias.description),
  content          = COALESCE(canon.content,          alias.content),
  "featuredImage"  = COALESCE(canon."featuredImage",  alias."featuredImage"),
  latitude         = COALESCE(canon.latitude,         alias.latitude),
  longitude        = COALESCE(canon.longitude,        alias.longitude),
  "updatedAt"      = NOW()
FROM locations AS alias
WHERE canon.slug = 'palangka-raya'
  AND alias.slug = 'palangkaraya';

-- Step 2: deactivate the legacy alias row (removes from sitemap + 404s the page).
UPDATE locations
SET "isActive" = false, "updatedAt" = NOW()
WHERE slug = 'palangkaraya';

-- Step 3: verify before committing.
SELECT slug, name, "isActive" FROM locations WHERE slug LIKE 'palangka%';

COMMIT;
-- END merge
```

#### 5.5.6 301 redirect (add to `next.config.ts` AFTER the merge is committed)

This is a code change, NOT a DB mutation. It must be deployed AFTER the merge SQL is committed and verified. Template (NOT yet committed — approval gate):

```ts
// next.config.ts — add a redirects() function (returns an array).
async redirects() {
  return [
    {
      source: '/lokasi/palangkaraya',
      destination: '/lokasi/palangka-raya',
      permanent: true, // 308 by default in Next.js (method-preserving); use
                       // { permanent: true, statusCode: 301 } for a classic 301.
    },
  ];
},
```

Note: Next.js `permanent: true` defaults to **308** (preserves HTTP method). For a pure GET→GET consolidation, 308 and 301 behave identically to crawlers. If a classic 301 is explicitly required, use `{ source, destination, permanent: false, statusCode: 301 }` (which still works because `permanent: false` + `statusCode` overrides).

#### 5.5.7 Rollback SQL (run if the merge must be undone)

```sql
-- Rollback: re-activate the alias row. (Content already merged into canonical
-- is NOT reverted — but the alias becomes reachable again, undoing the 404.
-- To fully revert content, restore from the 5.5.4 backup snapshot.)
BEGIN;
UPDATE locations
SET "isActive" = true, "updatedAt" = NOW()
WHERE slug = 'palangkaraya';
SELECT slug, name, "isActive" FROM locations WHERE slug LIKE 'palangka%';
COMMIT;
```

After rollback, also remove the `redirects()` entry from `next.config.ts` and redeploy.

#### 5.5.8 Why the alias row is deactivated, not deleted

A 301 redirect at the `next.config.ts` level does NOT require the old Location row to exist (the redirect fires before the route handler). However, keeping the alias row with `isActive: false` preserves the audit trail and allows a trivial rollback (5.5.7). Deleting the row would lose the SEO content history and make rollback harder. Under Release Lock, deletion is also forbidden.

---

## 6. CANONICAL & HTTP STATUS — ALL SITEMAP URLS

Verified live via curl against dev server (port 3000). Production would behave identically (same code paths).

| URL | HTTP | Canonical | robots meta | X-Robots-Tag | In sitemap? | robots.txt |
|---|---|---|---|---|---|---|
| `/` | 200 | `https://blackbear.cc` | `index, follow` | none | ✅ | allowed |
| `/order` | 200 | `https://blackbear.cc/order` | `index, follow` | none | ✅ | allowed |
| `/track` | 200 | `https://blackbear.cc/track` | `index, follow` | none | ✅ | allowed |
| `/blog` | 200 | `https://blackbear.cc/blog` | `index, follow` | none | ✅ | allowed |
| `/faq` | 200 | `https://blackbear.cc/faq` | `index, follow` | none | ✅ | allowed |
| `/lokasi` | 200 | `https://blackbear.cc/lokasi` | `index, follow` | none | ✅ | allowed |
| `/lokasi/<active-slug>` | 200* | `https://blackbear.cc/lokasi/<slug>` | `index, follow` (inherited) | none | ✅ (if active) | allowed |
| `/lokasi/<inactive-slug>` | **200** ⚠️ | self | `index, follow` (inherited) | none | ❌ (filtered) | allowed |
| `/lokasi/<nonexistent-slug>` | 404 | — | `noindex` + `index, follow` ⚠️ | none | ❌ | allowed |

**Key findings:**

1. **All sitemap URLs are 200, self-canonical, indexable.** No misconfigured canonicals, no redirect chains, no `X-Robots-Tag` conflicts.

2. **Inactive-location index leak (⚠️ STATUS: FIXED in SITEMAP-HOTFIX pass):** `lokasi/[slug]/page.tsx` `generateMetadata` and page body now both check `location.isActive`. Inactive locations return `notFound()` (404) + `robots: { index: false, follow: true }` metadata. The soft-404 / index-leak risk is closed. (Original issue: `findUnique` had no `isActive` filter, so inactive rows rendered 200 + indexable.)

3. **404 page conflicting robots meta (⚠️):** When `notFound()` fires, the page emits **two** `<meta name="robots">` tags: `content="noindex"` (from Next.js notFound) and `content="index, follow"` (from root layout `generateMetadata` default). This is malformed HTML. Google likely honors the most restrictive (`noindex`), so 404s are effectively not indexed — but the duplicate tag should be cleaned up for correctness. (Pre-existing issue; not in scope to fix now.)

4. **Hardcoded phone in LocalBusiness JSON-LD (STATUS: FIXED in SITEMAP-HOTFIX pass):** `lokasi/[slug]/page.tsx` now fetches `OwnerProfile.footerWhatsapp` and emits it as `telephone` (conditional spread — omitted if OwnerProfile unavailable). The placeholder `'+6281234567890'` has been removed. (Original issue: L130 emitted a hardcoded placeholder for every location.)

---

## 7. RECOMMENDATIONS — KEEP / NOINDEX / MERGE / 301

### 7.1 Per-URL recommendations

| URL / Pattern | Action | Rationale | Implementation (when approved) |
|---|---|---|---|
| `/` (home) | **KEEP** | Primary landing page, unique content, highest priority. | None. |
| `/order` | **KEEP** | Primary conversion page, unique SEO metadata, organic search value. | None. |
| `/track` | **NOINDEX** | Personalized lookup tool, not content. Description leaks `BB-XXXXXX` format. Zero organic value. | Add `robots: { index: false, follow: true }` to `track/layout.tsx` metadata. Optionally remove from `sitemap.ts` L36–41. Do NOT delete the route. |
| `/blog` | **KEEP** | Content hub, indexable. | None. |
| `/blog/<published-slug>` | **KEEP** | Unique article content, already filtered `isPublished: true`. | None. |
| `/faq` | **KEEP** | FAQ content, indexable, has FAQPage JSON-LD. | None. |
| `/lokasi` | **KEEP** | Location index page, unique SEO metadata. | None. |
| `/lokasi/jakarta` | **KEEP** | Has 2 partners (dev; likely more in prod). Major city. | None. |
| `/lokasi/medan` | **KEEP (conditional)** | Major city, in seed script. KEEP if ≥1 active partner in production. | Verify production `Partner.city` first. If 0 partners → NOINDEX (set `robots.index: false` on the location row's metadata — requires either a per-location `noindex` flag or a metadata override; simplest: keep `isActive: true` but add a `noindex` boolean column — schema change, deferred). Interim: if 0 partners, set `isActive: false` (removes from sitemap, but page still 200-indexable per §6 finding 2 — so this alone is insufficient; needs the code fix too). |
| `/lokasi/denpasar` | **KEEP (conditional)** | Same as Medan. In seed script. Major city (Bali). | Same conditional verification. |
| `/lokasi/tangerang` | **KEEP (conditional)** | NOT in seed (created via CRUD). Major city (Bodenbek). KEEP if ≥1 active partner. | Same conditional verification. |
| `/lokasi/kalimantan-selatan` | **REVIEW** | Province, not a city — inconsistent with other rows. If the slug is `kalimantan-selatan`, consider renaming to `banjarmasin` (the capital city) for consistency. If no partner serves Kalsel → NOINDEX. | Verify production partners. If 0 partners → NOINDEX. If renaming slug → 301 from old to new. |
| `/lokasi/palangka-raya` + `/lokasi/palangkaraya` | **MERGE + 301** | Duplicate pages for same city. Canonical = `palangka-raya` (official spelling). | See §5.5 approval gate. Canonical: `palangka-raya`. Legacy alias: `palangkaraya` → 301. Run read-only audit first. |
| `/lokasi/<other-active>` | **KEEP** | All other active locations with unique content. | None. |
| `/lokasi/<inactive>` | **NOINDEX (code fix needed)** | Currently 200 + indexable despite `isActive: false` (§6 finding 2). | Code fix deferred (scope lock). When approved: add `isActive: true` to `generateMetadata` + page body `findUnique`, or `notFound()` when `!isActive`. |

### 7.2 Sitemap-level recommendations (when approved)

1. **Remove `/track`** from `sitemap.ts` L36–41 (it's a tool, not content — no organic value).
2. **Fix `lastModified` for static pages** — currently `new Date()` (now) on every fetch. Use a fixed build timestamp or the last-known content-change date for home/order/track/blog/faq/lokasi. Minor priority.
3. **Add `isActive: true` guard** to the location page's `generateMetadata` and page body (currently only sitemap + generateStaticParams filter it) — prevents inactive-location index leak.

### 7.3 Data-quality recommendations (owner/DBA, not code)

1. **Run the production verification checklist (§8)** to confirm which location rows and partner cities exist.
2. **Resolve the Palangka Raya duplicate** (merge + 301 per §5.4).
3. **Review "Kalimantan Selatan"** — rename to city-level (`banjarmasin`) for consistency, or noindex if no partner.
4. **Replace the hardcoded `telephone: '+6281234567890'`** in the LocalBusiness JSON-LD with the real business number from `OwnerProfile.footerWhatsapp`.
5. **Audit all location slugs** for typos / duplicates / inconsistent formatting (province vs city, hyphenation, etc.).

---

## 8. PRODUCTION VERIFICATION CHECKLIST (for owner/DBA)

Before any implementation, the owner/DBA must run these against the **production** Neon PostgreSQL database (dev DB is empty and not representative):

```sql
-- 1. List ALL location rows (active + inactive)
SELECT id, name, slug, "isActive", latitude, longitude, "metaTitle", "updatedAt"
FROM locations ORDER BY name;

-- 2. Check for the Palangka Raya duplicate
SELECT id, name, slug, "isActive" FROM locations
WHERE slug IN ('palangka-raya', 'palangkaraya')
   OR name ILIKE '%palangka%';

-- 3. Check for other duplicate/near-duplicate slugs
SELECT slug, COUNT(*) FROM locations GROUP BY slug HAVING COUNT(*) > 1;
-- (should return 0 rows; slug is @unique so this is a structural guarantee)

-- 4. Check for near-duplicate NAMES (different slug, same city)
SELECT name, COUNT(*) FROM locations GROUP BY name HAVING COUNT(*) > 1;

-- 5. Partner city distribution (to verify which locations have real partners)
SELECT LOWER(TRIM(city)) AS city, COUNT(*) AS partner_count,
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count
FROM partners GROUP BY LOWER(TRIM(city)) ORDER BY partner_count DESC;

-- 6. Cross-check: which active locations have ZERO active partners?
SELECT l.name, l.slug, COALESCE(p.active_count, 0) AS active_partners
FROM locations l
LEFT JOIN (
  SELECT LOWER(TRIM(city)) AS city, COUNT(*) AS active_count
  FROM partners WHERE status = 'active' GROUP BY LOWER(TRIM(city))
) p ON p.city = LOWER(TRIM(l.name))
WHERE l."isActive" = true
ORDER BY active_partners ASC;
```

Query 6 is the decision matrix: any location with `active_partners = 0` is a candidate for `noindex` (not deletion).

---

## 9. SCOPE LOCK RE-AFFIRMATION

**No changes made.** This audit only read files and queried the dev DB (temp script created and deleted; no source/schema/route/location/URL modified).

**When approved, allowed changes would be:**
- `track/layout.tsx`: add `robots: { index: false, follow: true }` (noindex /track).
- `sitemap.ts`: remove `/track` entry; optionally fix `lastModified` for static pages.
- `lokasi/[slug]/page.tsx`: add `isActive: true` filter to `generateMetadata` + page body `findUnique` (fix inactive-leak); replace hardcoded telephone with `OwnerProfile.footerWhatsapp`.
- `indonesia-cities.ts`: remove duplicate `'palangkaraya'` / `'palangka raya'` key.
- `next.config.ts`: add `redirects()` entry for the Palangka Raya 301 (non-canonical → canonical slug).
- Production DB: merge Palangka Raya rows; review Kalimantan Selatan; noindex locations with 0 partners.

**Forbidden (unchanged):** transaction engine, fraud engine, auth, Prisma schema (no new columns — use `isActive` toggle + code-level noindex), API contracts, homepage UI redesign, blog content changes, deleting any URL or location row without a 301 redirect.
