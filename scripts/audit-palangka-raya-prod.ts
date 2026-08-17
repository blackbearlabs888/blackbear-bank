/**
 * READ-ONLY production audit for the Palangka Raya slug conflict.
 *
 * Purpose: gather the evidence the owner needs to decide the merge +
 * 301 direction BEFORE any DB mutation. The owner's directive is:
 *   - Canonical slug: /lokasi/palangka-raya  (official spelling "Palangka Raya")
 *   - Legacy alias:   /lokasi/palangkaraya   (301 candidate)
 *
 * This script checks BOTH slugs in the production (or dev) database and
 * reports:
 *   1. Location row (id, name, slug, isActive, SEO fields, timestamps)
 *   2. Active partner count for each city spelling
 *   3. Internal-link footprint (homepage cities-section derives from
 *      /api/seo/location?public=true, so any active location row is
 *      linked from the homepage)
 *
 * GSC / indexing signals CANNOT be queried from a DB script. The owner
 * must manually check Google Search Console for impressions/clicks on
 * both URLs before choosing the redirect direction. See
 * docs/SITEMAP-LOCATION-AUDIT.md section 5 for the manual GSC checklist.
 *
 * This script is strictly READ-ONLY: it runs only SELECT-equivalent
 * Prisma findMany / findUnique calls and prints a JSON report. It does
 * NOT write, update, or delete any row.
 *
 * Usage:
 *   bun run scripts/audit-palangka-raya-prod.ts
 *
 * Against production Neon: set DATABASE_URL to the production connection
 * string before running. Against dev (default): uses the dev SQLite DB.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const SLUGS = ['palangka-raya', 'palangkaraya'] as const;
const CITY_SPELLINGS = [
  'Palangka Raya',
  'Palangkaraya',
  'palangka raya',
  'palangkaraya',
  'PALANGKA RAYA',
  'PALANGKARAYA',
] as const;

interface LocationReport {
  slug: string;
  found: boolean;
  id?: string;
  name?: string;
  isActive?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  description?: string | null;
  contentLength?: number;
  featuredImage?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface PartnerReport {
  citySpelling: string;
  total: number;
  active: number;
  inactive: number;
}

async function auditLocation(slug: string): Promise<LocationReport> {
  const loc = await db.location.findUnique({ where: { slug } });
  if (!loc) {
    return { slug, found: false };
  }
  return {
    slug,
    found: true,
    id: loc.id,
    name: loc.name,
    isActive: loc.isActive,
    metaTitle: loc.metaTitle,
    metaDescription: loc.metaDescription,
    keywords: loc.keywords,
    description: loc.description,
    contentLength: loc.content ? loc.content.length : 0,
    featuredImage: loc.featuredImage,
    latitude: loc.latitude,
    longitude: loc.longitude,
    createdAt: loc.createdAt.toISOString(),
    updatedAt: loc.updatedAt.toISOString(),
  };
}

async function auditPartners(citySpelling: string): Promise<PartnerReport> {
  // Provider-agnostic: fetch all partners and filter in JS with toLowerCase().
  // (SQLite does not support mode:'insensitive'; PostgreSQL does, but the
  // fetch-all approach is clearly read-only and works on both providers.
  // The Palangka Raya partner set is small, so this is not a perf concern.)
  const allPartners = await db.partner.findMany({
    select: { city: true, status: true },
  });
  const target = citySpelling.toLowerCase();
  let total = 0;
  let active = 0;
  for (const p of allPartners) {
    if ((p.city ?? '').trim().toLowerCase() === target) {
      total++;
      if (p.status === 'active') active++;
    }
  }
  return {
    citySpelling,
    total,
    active,
    inactive: total - active,
  };
}

async function main() {
  console.log('=== Palangka Raya slug conflict — READ-ONLY audit ===');
  console.log(`Database URL: ${process.env.DATABASE_URL ? '(set)' : '(default dev)'}`);
  console.log('');

  // 1. Location rows for both slugs
  console.log('--- 1. Location rows ---');
  const locationReports: LocationReport[] = [];
  for (const slug of SLUGS) {
    const report = await auditLocation(slug);
    locationReports.push(report);
    console.log(JSON.stringify(report, null, 2));
  }

  // 2. Partner counts per city spelling (both spellings, both cases)
  console.log('');
  console.log('--- 2. Active partner counts per city spelling ---');
  const partnerReports: PartnerReport[] = [];
  for (const spelling of CITY_SPELLINGS) {
    const report = await auditPartners(spelling);
    partnerReports.push(report);
    console.log(JSON.stringify(report));
  }

  // 3. Internal-link footprint (structural)
  console.log('');
  console.log('--- 3. Internal-link footprint (structural) ---');
  console.log('Homepage cities-section.tsx fetches /api/seo/location?public=true');
  console.log('and links to /lokasi/<slug> for each ACTIVE location row.');
  console.log('=> Any active location row IS linked from the homepage.');
  const activeLocations = locationReports.filter((r) => r.found && r.isActive);
  console.log(
    `Active location rows linked from homepage: ${activeLocations.length} of ${SLUGS.length}`,
  );
  for (const r of activeLocations) {
    console.log(`  - /lokasi/${r.slug}  (id=${r.id}, name="${r.name}")`);
  }

  // 4. Decision summary
  console.log('');
  console.log('--- 4. Decision summary (auto, GSC must be checked manually) ---');
  const canonicalRow = locationReports.find((r) => r.slug === 'palangka-raya');
  const aliasRow = locationReports.find((r) => r.slug === 'palangkaraya');
  if (!canonicalRow?.found && !aliasRow?.found) {
    console.log('NEITHER slug exists in this DB. (Dev DB is typically empty.)');
    console.log('If running against production and this is the result,');
    console.log('no merge is needed — just create /lokasi/palangka-raya.');
  } else if (canonicalRow?.found && !aliasRow?.found) {
    console.log('Only canonical /lokasi/palangka-raya exists. No merge needed.');
    console.log('No 301 required (no legacy alias row to redirect).');
  } else if (!canonicalRow?.found && aliasRow?.found) {
    console.log('Only legacy /lokasi/palangkaraya exists.');
    console.log('RECOMMEND: rename the row slug palangkaraya -> palangka-raya');
    console.log('(or create canonical + 301 from alias), AFTER confirming');
    console.log('GSC has no significant impressions on /lokasi/palangkaraya.');
  } else if (canonicalRow?.found && aliasRow?.found) {
    console.log('BOTH slugs exist — merge required.');
    console.log('  canonical target: /lokasi/palangka-raya');
    console.log('  legacy alias:    /lokasi/palangkaraya');
    const canonicalSeoLen = canonicalRow.contentLength ?? 0;
    const aliasSeoLen = aliasRow.contentLength ?? 0;
    console.log(
      `  canonical content length: ${canonicalSeoLen}, alias content length: ${aliasSeoLen}`,
    );
    if (canonicalSeoLen >= aliasSeoLen) {
      console.log('  canonical row has >= SEO content; merge alias -> canonical.');
    } else {
      console.log('  alias row has MORE SEO content;');
      console.log('  copy alias content INTO canonical row BEFORE deactivating alias.');
    }
    console.log('  GSC check (MANUAL): compare impressions/clicks on both URLs.');
    console.log('  If alias has stronger GSC signal, REPORT before redirecting.');
  }

  console.log('');
  console.log('=== END READ-ONLY audit ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
