import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET public partner info (no auth required)
// Only returns non-sensitive data for display on the public order page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID format (basic check to prevent abuse)
    if (!id || id.length < 10 || id.length > 50) {
      return NextResponse.json(
        { success: false, error: 'ID partner tidak valid' },
        { status: 400 }
      );
    }

    const partner = await db.partner.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        tier: true,
        status: true,
      },
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      );
    }

    // If partner is not active, return status info so frontend can show warning
    if (partner.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: `Partner saat ini tidak aktif`,
        data: {
          name: partner.name,
          tier: partner.tier,
          status: partner.status,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: partner.id,
        name: partner.name,
        tier: partner.tier,
      },
    });
  } catch (error) {
    console.error('Get public partner info error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
