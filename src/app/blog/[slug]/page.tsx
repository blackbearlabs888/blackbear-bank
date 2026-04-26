import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import BlogDetailClient from './client';

interface BlogPost {
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
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const post = await db.blogPost.findUnique({
      where: { slug },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        featuredImage: true,
        category: true,
        tags: true,
        author: true,
        metaTitle: true,
        metaDescription: true,
        keywords: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    if (!post) {
      return {
        title: 'Artikel Tidak Ditemukan',
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
    
    return {
      title: post.metaTitle || `${post.title} | Blog`,
      description: post.metaDescription || post.excerpt || post.content.substring(0, 160),
      keywords: post.keywords || undefined,
      authors: post.author ? [{ name: post.author }] : undefined,
      openGraph: {
        type: 'article',
        title: post.metaTitle || post.title,
        description: post.metaDescription || post.excerpt || post.content.substring(0, 160),
        url: `${siteUrl}/blog/${post.slug}`,
        images: post.featuredImage ? [{ url: post.featuredImage }] : undefined,
        publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
        modifiedTime: new Date(post.updatedAt).toISOString(),
        authors: post.author ? [post.author] : undefined,
        section: post.category,
        tags: post.tags ? post.tags.split(',').map(t => t.trim()) : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: post.metaTitle || post.title,
        description: post.metaDescription || post.excerpt || post.content.substring(0, 160),
        images: post.featuredImage ? [post.featuredImage] : undefined,
      },
      alternates: {
        canonical: `${siteUrl}/blog/${post.slug}`,
      },
    };
  } catch {
    return {
      title: 'Blog',
    };
  }
}

// Generate static params for build
export async function generateStaticParams() {
  try {
    const posts = await db.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true },
      take: 100,
    });
    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch {
    console.error('Failed to generate static params for blog');
  }
  
  return [];
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Fetch blog post server-side for initial render using direct DB call
  let post: {
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
  } | null = null;
  
  try {
    post = await db.blogPost.findUnique({
      where: { slug },
    });

    if (post) {
      // Track view count with direct DB update
      if (post.isPublished) {
        db.blogPost.update({
          where: { id: post.id },
          data: { viewCount: { increment: 1 } },
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
  }

  if (!post) {
    notFound();
  }

  return <BlogDetailClient post={post as BlogPost} />;
}
