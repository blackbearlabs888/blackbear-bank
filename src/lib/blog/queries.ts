/**
 * Blog Server Data Service (Production Hotfix — Blog Static→Dynamic Error)
 *
 * Replaces the previous self-fetch pattern where `/blog/[slug]` Server
 * Components called their own HTTP API (`/api/seo/blog/[slug]`) with
 * `cache: 'no-store'`. That pattern forced the ISR page to switch from
 * static to dynamic at runtime, producing:
 *   "Page changed from static to dynamic at runtime."
 *
 * This module provides direct Prisma access for the blog DETAIL page only.
 * The admin/client CRUD API (`/api/seo/blog*`) remains unchanged and is
 * still used by the owner dashboard and the client-side blog LISTING.
 *
 * Contract:
 *   - `import 'server-only'` — guarantees this module is never bundled
 *     into client code. Importing it from a Client Component throws at
 *     build time.
 *   - Public queries filter on `isPublished: true`. Drafts are never
 *     returned to the public detail page.
 *   - Content is sanitized on read via synchronous `sanitizeHtml()` —
 *     defence-in-depth so legacy rows written before write-time
 *     sanitization are also safe to render via `dangerouslySetInnerHTML`.
 *   - `getPublishedBlogPostBySlug` is wrapped in React `cache()` so the
 *     same slug fetched by `generateMetadata` AND the page body within a
 *     single request is deduplicated to ONE Prisma query.
 *   - No `fetch()`, no `cache: 'no-store'`, no cookies/headers — fully
 *     ISR-compatible.
 */

import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { sanitizeHtml } from '@/lib/sanitize-html';

// ── Types ──────────────────────────────────────────────────────────────
// Shape matches the `BlogPost` interface consumed by BlogDetailClient.
// Dates are kept as Date here; Next.js serializes them to ISO strings
// when passing from Server Component to Client Component as props.

export interface PublishedBlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: string;
  tags: string | null;
  author: string | null;
  viewCount: number;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelatedBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: string;
  author: string | null;
  viewCount: number;
  publishedAt: Date | null;
  createdAt: Date;
}

// ── Queries ───────────────────────────────────────────────────────────

/**
 * Get a single published blog post by exact slug.
 *
 * Wrapped in React `cache()` so that `generateMetadata` and the page
 * body — which both need the same post within one request — share a
 * single Prisma round-trip.
 *
 * Returns `null` for:
 *   - slug not found
 *   - slug found but `isPublished === false` (draft)
 *
 * Content is sanitized on read (defence-in-depth).
 */
export const getPublishedBlogPostBySlug = cache(
  async (slug: string): Promise<PublishedBlogPost | null> => {
    if (!slug || typeof slug !== 'string') return null;

    const post = await db.blogPost.findUnique({
      where: { slug },
    });

    // Public page must never serve a draft, even if the slug matches.
    if (!post || !post.isPublished) return null;

    return {
      ...post,
      // Defence-in-depth: re-sanitize on read so legacy rows written
      // before write-time sanitization are also safe. No-op for
      // already-clean rows.
      content: sanitizeHtml(post.content || ''),
      viewCount: Number(post.viewCount),
    };
  }
);

/**
 * Get related published posts (same category, excluding the current post).
 *
 * Returns minimal fields needed for the related-posts card grid. Limited
 * to `limit` results (default 3). Never returns drafts.
 */
export async function getRelatedPublishedPosts(
  postId: string,
  category: string,
  limit: number = 3
): Promise<RelatedBlogPost[]> {
  if (!postId || !category) return [];

  const posts = await db.blogPost.findMany({
    where: {
      isPublished: true,
      category,
      id: { not: postId },
    },
    orderBy: { publishedAt: 'desc' },
    take: Math.max(1, Math.min(limit, 12)),
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      category: true,
      author: true,
      viewCount: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return posts.map((p) => ({
    ...p,
    viewCount: Number(p.viewCount),
  }));
}

/**
 * Get all published blog slugs. Used by `generateStaticParams` to
 * pre-render published posts at build time.
 */
export async function getPublishedBlogSlugs(): Promise<{ slug: string }[]> {
  const posts = await db.blogPost.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });
  return posts.map((p) => ({ slug: p.slug }));
}
