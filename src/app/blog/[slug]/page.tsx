import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogDetailClient from './client';
import {
  getPublishedBlogPostBySlug,
  getRelatedPublishedPosts,
  getPublishedBlogSlugs,
  type PublishedBlogPost,
  type RelatedBlogPost,
} from '@/lib/blog/queries';

// ── ISR ───────────────────────────────────────────────────────────────
// Blog detail pages change infrequently (only on owner edit/publish).
// Revalidate hourly. dynamicParams stays enabled (default) so newly
// published articles render on first request without a full deployment.
//
// NOTE: This page must NOT use `cache: 'no-store'`, `force-dynamic`,
// cookies(), headers(), or call its own HTTP API. All data comes from
// the server-only data service (`@/lib/blog/queries`) via direct Prisma
// access — fully ISR-compatible.
export const revalidate = 3600;

// ── generateStaticParams ──────────────────────────────────────────────
// Pre-render all currently-published posts at build time. Newly published
// posts (created after build) are handled by dynamicParams at runtime.
export async function generateStaticParams() {
  try {
    return await getPublishedBlogSlugs();
  } catch (error) {
    console.error('Failed to generate static params for blog:', error);
    return [];
  }
}

// ── generateMetadata ──────────────────────────────────────────────────
// Uses the SAME cached server query as the page body — React cache()
// deduplicates so only ONE Prisma query runs per request for the post.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    // Missing or unpublished slug — minimal metadata; the page itself
    // will call notFound() and return a real 404.
    return {
      title: 'Artikel Tidak Ditemukan',
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
  const canonical = `${siteUrl}/blog/${post.slug}`;
  const description =
    post.metaDescription || post.excerpt || post.content.substring(0, 160);
  const title = post.metaTitle || `${post.title} | Blog`;

  return {
    title,
    description,
    keywords: post.keywords || undefined,
    authors: post.author ? [{ name: post.author }] : undefined,
    openGraph: {
      type: 'article',
      title: post.metaTitle || post.title,
      description,
      url: canonical,
      images: post.featuredImage ? [{ url: post.featuredImage }] : undefined,
      publishedTime: post.publishedAt
        ? new Date(post.publishedAt).toISOString()
        : undefined,
      modifiedTime: new Date(post.updatedAt).toISOString(),
      authors: post.author ? [post.author] : undefined,
      section: post.category,
      tags: post.tags
        ? post.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.metaTitle || post.title,
      description,
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
    alternates: {
      canonical,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────
export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Single Prisma query (deduped with generateMetadata via React cache()).
  const post: PublishedBlogPost | null = await getPublishedBlogPostBySlug(slug);

  // Missing or unpublished slug → real 404 (not a soft 200 with error UI).
  if (!post) {
    notFound();
  }

  // Related posts fetched server-side (same category, excluding this post).
  // Passed to the client as props so they appear in initial HTML (better
  // SEO, no client-side waterfall, no self-fetch to /api/seo/blog).
  const relatedPosts: RelatedBlogPost[] = await getRelatedPublishedPosts(
    post.id,
    post.category,
    3
  );

  return <BlogDetailClient post={post} relatedPosts={relatedPosts} />;
}
