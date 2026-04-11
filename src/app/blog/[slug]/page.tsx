import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/seo/blog/${slug}`,
      { cache: 'no-store' }
    );
    const result = await response.json();

    if (!result.success || !result.data) {
      return {
        title: 'Artikel Tidak Ditemukan',
      };
    }

    const post: BlogPost = result.data;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.id';
    
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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/seo/blog?public=true&limit=100`
    );
    const result = await response.json();

    if (result.success && result.data) {
      return result.data.map((post: BlogPost) => ({
        slug: post.slug,
      }));
    }
  } catch {
    console.error('Failed to generate static params for blog');
  }
  
  return [];
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Fetch blog post server-side for initial render
  let post: BlogPost | null = null;
  
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/seo/blog/${slug}`,
      { cache: 'no-store' }
    );
    const result = await response.json();

    if (result.success && result.data) {
      post = result.data;
      
      // Track view count
      if (post.isPublished) {
        fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/seo/blog/${slug}?view=true`,
          { method: 'GET' }
        ).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
  }

  if (!post) {
    notFound();
  }

  return <BlogDetailClient post={post} />;
}
