import { NextRequest, NextResponse } from 'next/server';
import { db, toNumber } from '@/lib/db';

// GET /api/testimonials - Fetch testimonials (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const approved = searchParams.get('approved'); // 'true' or 'false'
    const featured = searchParams.get('featured'); // 'true' or 'false'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Check testimonial for specific order
    if (orderId) {
      const testimonial = await db.testimonial.findUnique({
        where: { transactionId: orderId },
        include: {
          transaction: {
            select: {
              orderId: true,
              nominal: true,
              paymentType: { select: { name: true } },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: testimonial,
      });
    }

    // List testimonials for owner dashboard
    const where: Record<string, unknown> = {};
    if (approved !== null) where.isApproved = approved === 'true';
    if (featured !== null) where.isFeatured = featured === 'true';

    const [testimonials, total] = await Promise.all([
      db.testimonial.findMany({
        where,
        include: {
          transaction: {
            select: {
              orderId: true,
              nominal: true,
              paymentType: { select: { name: true } },
            },
          },
          customer: {
            select: {
              name: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.testimonial.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: testimonials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get testimonials error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST /api/testimonials - Submit a new testimonial
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, rating, review, customerName } = body;

    // Validate required fields
    if (!transactionId || !rating || !customerName) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID, rating, dan nama wajib diisi' },
        { status: 400 }
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating harus antara 1-5' },
        { status: 400 }
      );
    }

    // Check transaction exists and is SUCCESS
    const transaction = await db.transaction.findUnique({
      where: { orderId: transactionId },
      include: { customer: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    if (transaction.status !== 'success') {
      return NextResponse.json(
        { success: false, error: 'Testimoni hanya bisa diberikan untuk transaksi yang berhasil' },
        { status: 400 }
      );
    }

    // Check if testimonial already exists for this transaction
    const existingTestimonial = await db.testimonial.findUnique({
      where: { transactionId: transaction.id },
    });

    if (existingTestimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimoni sudah pernah diberikan untuk transaksi ini' },
        { status: 409 }
      );
    }

    // Create testimonial
    const testimonial = await db.testimonial.create({
      data: {
        transactionId: transaction.id,
        customerId: transaction.customerId,
        customerName: customerName,
        rating: Math.round(rating),
        review: review || '',
      },
      include: {
        transaction: {
          select: {
            orderId: true,
            nominal: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: testimonial,
      message: 'Testimoni berhasil dikirim! Terima kasih atas ulasan Anda.',
    });
  } catch (error) {
    console.error('Create testimonial error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
