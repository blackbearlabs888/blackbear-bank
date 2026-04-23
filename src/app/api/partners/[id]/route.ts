import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { randomBytes } from 'crypto';
import { sanitizeString } from '@/lib/sanitize';

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

// Generate random password
function generateRandomPassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// GET single partner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const partner = await db.partner.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
        rankingHistory: {
          orderBy: { month: 'desc' },
          take: 12,
        },
        _count: {
          select: { transactions: true, customers: true },
        },
      },
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get monthly stats for the current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthlyStats = await db.transaction.aggregate({
      where: {
        partnerId: id,
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
        status: 'success',
      },
      _sum: {
        nominal: true,
        partnerProfit: true,
      },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...serializePartner(partner as unknown as Record<string, unknown>),
        monthlyStats: {
          volume: toNumber(monthlyStats._sum.nominal),
          profit: toNumber(monthlyStats._sum.partnerProfit),
          transactions: monthlyStats._count,
        },
      },
    });
  } catch (error) {
    console.error('Get partner error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PATCH update partner
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      password,
      generatePassword,
      target,
      tier,
      status,
      notes,
      commission,
      name,
      phone,
      bankName,
      bankAccount,
      bankHolder,
      city,
      badge,
    } = body;

    // Find partner
    const partner = await db.partner.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const userData: Record<string, unknown> = {};
    let newPassword: string | null = null;

    // Handle password update
    if (generatePassword) {
      newPassword = generateRandomPassword(10);
      userData.password = await hashPassword(newPassword);
    } else if (password) {
      userData.password = await hashPassword(password);
    }

    // Handle other fields
    if (target !== undefined) updateData.target = parseFloat(target);
    if (tier !== undefined) updateData.tier = tier;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = sanitizeString(notes);
    if (commission !== undefined) updateData.commission = parseFloat(commission);
    if (badge !== undefined) updateData.badge = badge;

    // Handle partner info updates
    if (name !== undefined) {
      const sanitizedName = sanitizeString(name);
      updateData.name = sanitizedName;
      userData.name = sanitizedName;
    }
    if (phone !== undefined) updateData.phone = sanitizeString(phone);
    if (bankName !== undefined) updateData.bankName = sanitizeString(bankName);
    if (bankAccount !== undefined) updateData.bankAccount = sanitizeString(bankAccount);
    if (bankHolder !== undefined) updateData.bankHolder = sanitizeString(bankHolder);
    if (city !== undefined) updateData.city = sanitizeString(city);

    // Update user if needed
    if (Object.keys(userData).length > 0) {
      await db.user.update({
        where: { id: partner.userId },
        data: userData,
      });
    }

    // Update partner
    const updatedPartner = await db.partner.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: serializePartner(updatedPartner as unknown as Record<string, unknown>),
      message: 'Partner berhasil diperbarui',
      newPassword: newPassword, // Only returned when generating new password
    });
  } catch (error) {
    console.error('Update partner error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE partner
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if partner exists
    const partner = await db.partner.findUnique({
      where: { id },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if partner has transactions
    if (partner._count.transactions > 0) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak dapat dihapus karena sudah memiliki transaksi' },
        { status: 400 }
      );
    }

    // Delete partner (cascade will delete user too)
    await db.partner.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Partner berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete partner error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
