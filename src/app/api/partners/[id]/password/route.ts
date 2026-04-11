import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'

// PATCH /api/partners/[id]/password - Change partner password
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { password } = body

    // Validate password
    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    // Check if partner exists
    const existingPartner = await db.partner.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!existingPartner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user password
    await db.user.update({
      where: { id: existingPartner.userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diperbarui',
    })
  } catch (error) {
    console.error('Error changing partner password:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengubah password' },
      { status: 500 }
    )
  }
}
