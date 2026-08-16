import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/sanitize-html';

// GET - List all blog posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get('public') === 'true';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    
    if (isPublic) {
      where.isPublished = true;
    }
    
    if (category) {
      where.category = category;
    }

    const [posts, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          excerpt: true,
          featuredImage: true,
          metaTitle: true,
          metaDescription: true,
          keywords: true,
          category: true,
          tags: true,
          author: true,
          viewCount: true,
          isPublished: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: posts.map(post => ({
        ...post,
        viewCount: Number(post.viewCount),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get blog posts error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST - Create new blog post (owner only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      metaTitle,
      metaDescription,
      keywords,
      category,
      tags,
      author,
      isPublished,
    } = body;

    // Validate required fields
    if (!title || !slug || !content) {
      return NextResponse.json(
        { success: false, error: 'Title, slug, dan content wajib diisi' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingPost = await db.blogPost.findUnique({
      where: { slug },
    });

    if (existingPost) {
      return NextResponse.json(
        { success: false, error: 'Slug sudah digunakan' },
        { status: 400 }
      );
    }

    const post = await db.blogPost.create({
      data: {
        title,
        slug,
        // Sanitize HTML at write-time to prevent stored XSS. Allowlist-based
        // via DOMPurify — strips <script>, on* handlers, javascript:/data:
        // URLs, and any tag/attr outside the TipTap-aligned allowlist.
        content: sanitizeHtml(content),
        excerpt,
        featuredImage,
        metaTitle,
        metaDescription,
        keywords,
        category: category || 'artikel',
        tags,
        author,
        isPublished: isPublished || false,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        viewCount: Number(post.viewCount),
      },
      message: 'Blog post berhasil dibuat',
    });
  } catch (error) {
    console.error('Create blog post error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
