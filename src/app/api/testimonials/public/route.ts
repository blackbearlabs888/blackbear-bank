import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function maskName(name: string): string {
  if (!name || name.length <= 2) return name;
  const words = name.split(' ');
  return words
    .map((word) => {
      if (word.length <= 2) return word[0] + '*';
      return word[0] + '*'.repeat(word.length - 1);
    })
    .join(' ');
}

// GET /api/testimonials/public - Fetch approved testimonials (public, masked names)
export async function GET() {
  try {
    const testimonials = await db.testimonial.findMany({
      where: { isApproved: true },
      include: {
        transaction: {
          select: {
            nominal: true,
            paymentType: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Mask customer names for public display
    const publicTestimonials = testimonials.map((t) => ({
      rating: t.rating,
      review: t.review,
      customerName: maskName(t.customerName),
      createdAt: t.createdAt,
      nominal: t.transaction?.nominal ?? 0,
      paymentType: t.transaction?.paymentType?.name ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: publicTestimonials,
    });
  } catch (error) {
    console.error('Get public testimonials error:', error);
    return NextResponse.json(
      { success: true, data: [] },
      { status: 200 }
    );
  }
}
