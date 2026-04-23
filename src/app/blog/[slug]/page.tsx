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
      `http://localhost:3000/api/seo/blog/${slug}`,
      { cache: 'no-store' }
    );
    const result = await response.json();

    if (!result.success || !result.data) {
      return {
        title: 'Artikel Tidak Ditemukan',
      };
    }

    const post: BlogPost = result.data;
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
    const response = await fetch(
      `http://localhost:3000/api/seo/blog?public=true&limit=100`
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
      `http://localhost:3000/api/seo/blog/${slug}`,
      { cache: 'no-store' }
    );
    const result = await response.json();

    if (result.success && result.data) {
      post = result.data;
      
      // Track view count
      if (post.isPublished) {
        fetch(
          `http://localhost:3000/api/seo/blog/${slug}?view=true`,
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

  // Article JSON-LD structured data
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.content.substring(0, 160),
    image: post.featuredImage || `${siteUrl}/og-blog.png`,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date(post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    author: {
      '@type': 'Organization',
      name: post.author || 'Black Bear',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Black Bear',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
    keywords: post.keywords || 'gestun, tarik tunai, kartu kredit, paylater',
    articleSection: post.category,
    wordCount: post.content.split(/\s+/).length,
  };

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${siteUrl}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${siteUrl}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <BlogDetailClient post={post} />
    </>
  );
}
