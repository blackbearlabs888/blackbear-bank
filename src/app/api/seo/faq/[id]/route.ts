import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Get FAQ by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const faq = await db.fAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      return NextResponse.json(
        { success: false, error: 'FAQ tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error('Get FAQ error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PUT - Update FAQ (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const faq = await db.fAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      return NextResponse.json(
        { success: false, error: 'FAQ tidak ditemukan' },
        { status: 404 }
      );
    }

    const updatedFaq = await db.fAQ.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      data: updatedFaq,
      message: 'FAQ berhasil diupdate',
    });
  } catch (error) {
    console.error('Update FAQ error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE - Delete FAQ (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const faq = await db.fAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      return NextResponse.json(
        { success: false, error: 'FAQ tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.fAQ.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'FAQ berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
