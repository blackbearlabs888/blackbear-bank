import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';

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

// GET partner profile
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    // Get partner data
    const partner = await db.partner.findUnique({
      where: { userId: user.id },
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        partner: serializePartner(partner as unknown as Record<string, unknown>),
      },
    });
  } catch (error) {
    console.error('Get partner profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PATCH update partner profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      // User fields
      avatar,
      // Password change
      currentPassword,
      newPassword,
      // Partner fields
      city,
      bankName,
      bankAccount,
      bankHolder,
    } = body;

    // Handle password change
    if (currentPassword && newPassword) {
      const userWithPassword = await db.user.findUnique({
        where: { id: user.id },
        select: { password: true },
      });

      if (!userWithPassword) {
        return NextResponse.json(
          { success: false, error: 'User tidak ditemukan' },
          { status: 404 }
        );
      }

      const isValidPassword = await verifyPassword(currentPassword, userWithPassword.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Password saat ini tidak valid' },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(newPassword);
      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      // Revoke all sessions after password change
      await db.session.deleteMany({ where: { userId: user.id } });

      return NextResponse.json({
        success: true,
        message: 'Password berhasil diubah',
      });
    }

    // Build user update data
    const userUpdateData: Record<string, unknown> = {};
    if (avatar !== undefined) userUpdateData.avatar = avatar || null;

    // Build partner update data
    const partnerUpdateData: Record<string, unknown> = {};
    if (city !== undefined) partnerUpdateData.city = city;
    if (bankName !== undefined) partnerUpdateData.bankName = bankName;
    if (bankAccount !== undefined) partnerUpdateData.bankAccount = bankAccount;
    if (bankHolder !== undefined) partnerUpdateData.bankHolder = bankHolder;

    // Update user if needed
    if (Object.keys(userUpdateData).length > 0) {
      await db.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });
    }

    // Update partner if needed
    if (Object.keys(partnerUpdateData).length > 0) {
      await db.partner.update({
        where: { userId: user.id },
        data: partnerUpdateData,
      });
    }

    // Get updated data
    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, avatar: true },
    });

    const updatedPartner = await db.partner.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: {
        user: updatedUser,
        partner: updatedPartner ? serializePartner(updatedPartner as unknown as Record<string, unknown>) : null,
      },
    });
  } catch (error) {
    console.error('Update partner profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
