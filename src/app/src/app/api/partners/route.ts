import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// Helper to serialize partner data
function serializePartner(partner: Record<string, unknown>) {
  return {
    ...partner,
    commission: toNumber(partner.commission),
    target: toNumber(partner.target),
    totalProfit: toNumber(partner.totalProfit),
    totalVolume: toNumber(partner.totalVolume),
  };
}

// GET partners
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const partners = await db.partner.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: partners.map(p => serializePartner(p as unknown as Record<string, unknown>)),
    });
  } catch (error) {
    console.error('Get partners error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST create partner
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      bankName,
      bankAccount,
      bankHolder,
      city,
      tier,
      badge,
      status,
      commission,
      target,
    } = body;

    // Validation
    if (!name || !email || !phone || !bankName || !bankAccount || !bankHolder || !city) {
      return NextResponse.json(
        { success: false, error: 'Semua field wajib harus diisi' },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }

    // Create user with random password
    const hashedPassword = await hashPassword('partner123');

    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role: 'partner',
        partner: {
          create: {
            name,
            email: email.toLowerCase(),
            phone,
            bankName,
            bankAccount,
            bankHolder,
            city,
            tier: tier || 'Bronze',
            badge: badge || 'Newbie',
            status: status || 'active',
            commission: commission || 30,
            target: target || 5000000,
          },
        },
      },
      include: { partner: true },
    });

    return NextResponse.json({
      success: true,
      data: newUser.partner ? serializePartner(newUser.partner as unknown as Record<string, unknown>) : null,
      message: 'Partner berhasil dibuat',
    });
  } catch (error) {
    console.error('Create partner error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
