import { describe, it, expect, vi } from 'vitest';

// ───────────────────────────────────────────────────────────────────────────
// Sitemap delivery regression tests.
//
// Targeted at the verified failure modes of Stream A:
//   - SITEMAP_CONTENT_FAILURE: the `images` field was emitted as an array of
//     { loc, title } objects. Next.js 16's MetadataRoute.Sitemap type expects
//     `images: string[]`, and the framework serializer interpolates each
//     entry directly into `<image:loc>${image}</image:loc>`. An object entry
//     is stringified to the literal text `[object Object]`, which Google
//     Search Console rejects as an invalid image URL.
//   - Structural invariants: /track never in sitemap, static URL set,
//     published-only blog, active-partner-gated locations, slug dedup,
//     canonical hostname consistency, error rethrow (no silent degradation).
//
// `@/lib/db` is mocked so the sitemap generator is exercised in isolation
// without hitting a real database. The Next.js XML serializer is simulated
// inline (mirroring resolve-route-data.js) so that object-shaped image entries
// would be caught — exactly the regression that escaped previously.
// ───────────────────────────────────────────────────────────────────────────

const SITE_URL = 'https://www.blackbear.cc';

// Set the canonical hostname env BEFORE the sitemap module is imported — the
// generator reads `process.env.NEXT_PUBLIC_SITE_URL` once at module load.
process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;

const mockBlogPosts = [
  {
    slug: 'clean-url-post',
    updatedAt: new Date('2026-08-19T09:23:56.725Z'),
    featuredImage: 'https://www.blackbear.cc/images/clean.jpg',
    title: 'Clean URL Post',
  },
  {
    slug: 'dirty-object-post',
    updatedAt: new Date('2026-08-10T03:30:40.535Z'),
    // Mimics production dirty data: featuredImage was stored as the literal
    // string "[object Object]" because the create API did not validate the
    // incoming shape before persisting to the String? column.
    featuredImage: '[object Object]',
    title: 'Dirty Object Post',
  },
  {
    slug: 'non-url-post',
    updatedAt: new Date('2026-08-10T02:57:39.221Z'),
    featuredImage: 'not-a-url',
    title: 'Non URL Post',
  },
  {
    slug: 'empty-image-post',
    updatedAt: new Date('2026-08-10T02:24:24.311Z'),
    featuredImage: '',
    title: 'Empty Image Post',
  },
  {
    slug: 'null-image-post',
    updatedAt: new Date('2026-08-10T01:50:31.160Z'),
    featuredImage: null,
    title: 'Null Image Post',
  },
];

const mockLocations = [
  { slug: 'jakarta', name: 'Jakarta', updatedAt: new Date('2026-04-23T10:17:21.774Z') },
  { slug: 'jakarta', name: 'Jakarta', updatedAt: new Date('2026-04-22T10:17:21.774Z') }, // duplicate slug → dedup
  { slug: 'palangka-raya', name: 'Palangka Raya', updatedAt: new Date('2026-04-23T10:17:21.774Z') },
  { slug: 'inactive-city', name: 'Inactive City', updatedAt: new Date('2026-04-23T10:17:21.774Z') },
];

// Active partners serve: Jakarta, Palangka Raya. Inactive City has NO active partner.
const mockActivePartners = [{ city: 'Jakarta' }, { city: 'palangka raya' }, { city: '  Jakarta  ' }];

vi.mock('@/lib/db', () => ({
  db: {
    blogPost: {
      findMany: vi.fn(async () => mockBlogPosts),
    },
    location: {
      findMany: vi.fn(async () => mockLocations),
    },
    partner: {
      findMany: vi.fn(async () => mockActivePartners),
    },
  },
}));

// Re-import AFTER mock is registered so the sitemap module picks up the mock.
const { default: sitemap } = await import('@/app/sitemap');

// Mirror of Next.js 16 resolveSitemap image serialization
// (resolve-route-data.js: `for (const image of item.images) content += <image:loc>${image}`).
// Any non-string entry would render as [object Object] here.
function serializeImages(entries: Awaited<ReturnType<typeof sitemap>>): string {
  let out = '';
  for (const item of entries) {
    if (item.images?.length) {
      for (const image of item.images) {
        out += `<image:loc>${image}</image:loc>`;
      }
    }
  }
  return out;
}

describe('sitemap() — SITEMAP DELIVERY regression suite', () => {
  it('returns a non-empty sitemap array', async () => {
    const result = await sitemap();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the expected static URLs', async () => {
    const result = await sitemap();
    const urls = result.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}`);
    expect(urls).toContain(`${SITE_URL}/order`);
    expect(urls).toContain(`${SITE_URL}/blog`);
    expect(urls).toContain(`${SITE_URL}/faq`);
    expect(urls).toContain(`${SITE_URL}/lokasi`);
    expect(urls).toContain(`${SITE_URL}/pencairan-kartu-kredit`);
    expect(urls).toContain(`${SITE_URL}/pencairan-paylater`);
  });

  it('never includes /track (personalized tool, robots.noindex)', async () => {
    const result = await sitemap();
    const urls = result.map((e) => e.url);
    expect(urls.some((u) => u.includes('/track'))).toBe(false);
  });

  it('includes every published blog post URL', async () => {
    const result = await sitemap();
    const urls = result.map((e) => e.url);
    for (const post of mockBlogPosts) {
      expect(urls).toContain(`${SITE_URL}/blog/${post.slug}`);
    }
  });

  it('only includes locations that have an active partner serving that city', async () => {
    const result = await sitemap();
    const urls = result.map((e) => e.url);
    // Jakarta + Palangka Raya have active partners → included
    expect(urls).toContain(`${SITE_URL}/lokasi/jakarta`);
    expect(urls).toContain(`${SITE_URL}/lokasi/palangka-raya`);
    // Inactive City has no active partner → excluded
    expect(urls).not.toContain(`${SITE_URL}/lokasi/inactive-city`);
  });

  it('deduplicates location URLs by normalized slug', async () => {
    const result = await sitemap();
    const jakartaCount = result.filter((e) => e.url === `${SITE_URL}/lokasi/jakarta`).length;
    expect(jakartaCount).toBe(1);
  });

  it('preserves the canonical Palangka Raya slug (palangka-raya)', async () => {
    const result = await sitemap();
    const urls = result.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/lokasi/palangka-raya`);
  });

  it('uses a single consistent canonical hostname for every URL', async () => {
    const result = await sitemap();
    for (const e of result) {
      expect(e.url.startsWith(SITE_URL)).toBe(true);
    }
  });

  // ── KEY REGRESSION: [object Object] must NEVER appear in the sitemap ──────
  it('serializes image entries as URL strings — never [object Object]', async () => {
    const result = await sitemap();
    // Every image entry must be a primitive string (Next.js 16 string[] API).
    for (const e of result) {
      if (e.images) {
        for (const img of e.images) {
          expect(typeof img).toBe('string');
          expect(img).not.toBe('[object Object]');
        }
      }
    }
    // Simulate the Next.js serializer: object entries would become [object Object].
    const serialized = serializeImages(result);
    expect(serialized).not.toContain('[object Object]');
  });

  it('emits a valid <image:loc> for clean http(s) URLs only', async () => {
    const result = await sitemap();
    const clean = result.find((e) => e.url.endsWith('/blog/clean-url-post'));
    expect(clean?.images).toEqual(['https://www.blackbear.cc/images/clean.jpg']);
  });

  it('skips the image block for [object Object] dirty data (blog URL stays)', async () => {
    const result = await sitemap();
    const dirty = result.find((e) => e.url.endsWith('/blog/dirty-object-post'));
    // The blog <url> entry is preserved …
    expect(dirty).toBeDefined();
    // … but no image block is emitted for invalid data.
    expect(dirty?.images ?? []).toEqual([]);
  });

  it('skips the image block for non-URL / empty / null featuredImage', async () => {
    const result = await sitemap();
    const nonUrl = result.find((e) => e.url.endsWith('/blog/non-url-post'));
    const empty = result.find((e) => e.url.endsWith('/blog/empty-image-post'));
    const nul = result.find((e) => e.url.endsWith('/blog/null-image-post'));
    expect(nonUrl?.images ?? []).toEqual([]);
    expect(empty?.images ?? []).toEqual([]);
    expect(nul?.images ?? []).toEqual([]);
  });

  it('does not contain HTML or JSON in the serialized output', async () => {
    const result = await sitemap();
    const urls = result.map((e) => e.url).join(' ');
    const serialized = serializeImages(result);
    const all = urls + ' ' + serialized;
    expect(all).not.toMatch(/<!DOCTYPE/i);
    expect(all).not.toMatch(/<html/i);
  });

  it('rethrows DB errors (no silent degradation to a 5-URL sitemap)', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.blogPost.findMany).mockRejectedValueOnce(new Error('db down'));
    await expect(sitemap()).rejects.toThrow('db down');
    // Restore default mock implementation for subsequent tests
    vi.mocked(db.blogPost.findMany).mockResolvedValue(mockBlogPosts);
  });
});
