import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTierFromProfit, getTierProgress } from '@/lib/calculations'

// GET /api/partners/[id] - Get partner detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const partner = await db.partner.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            customers: true,
          },
        },
      },
    })

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      )
    }

    // Calculate progress (based on PROFIT, not volume)
    const targetProgress = partner.targetAmount > 0
      ? Math.min(100, (partner.totalProfit / partner.targetAmount) * 100)
      : 0
    const tierProgress = getTierProgress(partner.totalProfit)
    const calculatedTier = getTierFromProfit(partner.totalProfit)

    // Get recent transactions (last 5)
    const recentTransactions = await db.transaction.findMany({
      where: { partnerId: partner.id },
      include: {
        customer: {
          select: {
            name: true,
            whatsapp: true,
          },
        },
        paymentType: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...partner,
        commissionRate: partner.commissionRate * 100,
        targetProgress,
        tierProgress,
        calculatedTier,
        recentTransactions,
      },
    })
  } catch (error) {
    console.error('Error fetching partner:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data partner' },
      { status: 500 }
    )
  }
}

// PATCH /api/partners/[id] - Update partner
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if partner exists
    const existingPartner = await db.partner.findUnique({
      where: { id },
    })

    if (!existingPartner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      )
    }

    // Validate commission rate if provided
    if (body.commissionRate !== undefined) {
      if (body.commissionRate < 0 || body.commissionRate > 100) {
        return NextResponse.json(
          { success: false, error: 'Komisi harus antara 0-100%' },
          { status: 400 }
        )
      }
    }

    // Validate tier if provided
    if (body.tier && !['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].includes(body.tier)) {
      return NextResponse.json(
        { success: false, error: 'Tier tidak valid' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (body.status && !['ACTIVE', 'SUSPENDED'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Status tidak valid' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.status !== undefined) updateData.status = body.status
    if (body.tier !== undefined) updateData.tier = body.tier
    if (body.commissionRate !== undefined) updateData.commissionRate = body.commissionRate / 100
    if (body.targetAmount !== undefined) updateData.targetAmount = body.targetAmount
    if (body.badge !== undefined) updateData.badge = body.badge
    if (body.bankName !== undefined) updateData.bankName = body.bankName
    if (body.accountNumber !== undefined) updateData.accountNumber = body.accountNumber
    if (body.accountHolder !== undefined) updateData.accountHolder = body.accountHolder
    if (body.city !== undefined) updateData.city = body.city
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp

    // Update partner
    const partner = await db.partner.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
    })

    // Calculate progress for response (based on PROFIT, not volume)
    const targetProgress = partner.targetAmount > 0
      ? Math.min(100, (partner.totalProfit / partner.targetAmount) * 100)
      : 0
    const tierProgress = getTierProgress(partner.totalProfit)
    const calculatedTier = getTierFromProfit(partner.totalProfit)

    return NextResponse.json({
      success: true,
      data: {
        ...partner,
        commissionRate: partner.commissionRate * 100,
        targetProgress,
        tierProgress,
        calculatedTier,
      },
      message: 'Partner berhasil diperbarui',
    })
  } catch (error) {
    console.error('Error updating partner:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui partner' },
      { status: 500 }
    )
  }
}

// DELETE /api/partners/[id] - Delete partner (soft delete by suspending)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if partner exists
    const existingPartner = await db.partner.findUnique({
      where: { id },
    })

    if (!existingPartner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      )
    }

    // Suspend instead of delete
    const partner = await db.partner.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    })

    return NextResponse.json({
      success: true,
      data: partner,
      message: 'Partner berhasil di-suspend',
    })
  } catch (error) {
    console.error('Error deleting partner:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus partner' },
      { status: 500 }
    )
  }
}
