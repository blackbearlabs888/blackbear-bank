import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH change partner password
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { newPassword } = body;

    // Trim and validate password
    const trimmedPassword = typeof newPassword === 'string' ? newPassword.trim() : '';

    if (!trimmedPassword || trimmedPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Get partner with user
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

    if (!partner.userId || !partner.user) {
      return NextResponse.json(
        { success: false, error: 'User partner tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(trimmedPassword);

    // Update user password
    await db.user.update({
      where: { id: partner.userId },
      data: { password: hashedPassword },
    });

    // Delete all existing sessions for this partner to force re-login
    await db.session.deleteMany({
      where: { userId: partner.userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah. Partner perlu login ulang dengan password baru.',
    });
  } catch (error) {
    console.error('Change partner password error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
