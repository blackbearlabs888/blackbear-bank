import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/sanitize-html';

// GET - Get blog post by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const incrementView = searchParams.get('view') === 'true';

    const post = await db.blogPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Blog post tidak ditemukan' },
        { status: 404 }
      );
    }

    // Increment view count for public views
    if (incrementView && post.isPublished) {
      await db.blogPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        // Defense-in-depth: re-sanitize on read so legacy rows written before
        // write-time sanitization are also safe. No-op for already-clean rows.
        content: sanitizeHtml(post.content || ''),
        viewCount: Number(post.viewCount),
      },
    });
  } catch (error) {
    console.error('Get blog post error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PUT - Update blog post (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const body = await request.json();

    const existingPost = await db.blogPost.findUnique({
      where: { slug },
    });

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: 'Blog post tidak ditemukan' },
        { status: 404 }
      );
    }

    // If changing slug, check if new slug exists
    if (body.slug && body.slug !== slug) {
      const slugExists = await db.blogPost.findUnique({
        where: { slug: body.slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Slug sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Handle publish status change
    const updateData: Record<string, unknown> = { ...body };
    if (body.isPublished === true && !existingPost.isPublished) {
      updateData.publishedAt = new Date();
    }
    // Sanitize HTML content at write-time to prevent stored XSS.
    if (typeof updateData.content === 'string') {
      updateData.content = sanitizeHtml(updateData.content);
    }

    const post = await db.blogPost.update({
      where: { id: existingPost.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        viewCount: Number(post.viewCount),
      },
      message: 'Blog post berhasil diupdate',
    });
  } catch (error) {
    console.error('Update blog post error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE - Delete blog post (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { slug } = await params;

    const post = await db.blogPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Blog post tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.blogPost.delete({
      where: { id: post.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Blog post berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete blog post error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
