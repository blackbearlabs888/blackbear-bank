import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/testimonials/partner - Fetch testimonials from partner's transactions
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    if (user.role !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'Hanya untuk partner' },
        { status: 403 }
      );
    }

    const partner = await db.partner.findUnique({
      where: { userId: user.id },
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      );
    }

    const testimonials = await db.testimonial.findMany({
      where: {
        transaction: { partnerId: partner.id },
      },
      select: {
        id: true,
        rating: true,
        review: true,
        customerName: true,
        isApproved: true,
        isFeatured: true,
        createdAt: true,
        transaction: {
          select: {
            orderId: true,
            nominal: true,
            paymentType: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: testimonials,
    });
  } catch (error) {
    console.error('Get partner testimonials error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
