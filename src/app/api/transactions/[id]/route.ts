import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateTransactionFees } from '@/lib/calculations'

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['VERIFIED', 'CANCELLED'],
  VERIFIED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // No transitions from completed
  CANCELLED: [] // No transitions from cancelled
}

// GET /api/transactions/[id] - Get transaction detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        partner: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        paymentType: true,
        marketplace: true
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: transaction
    })
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data transaksi' },
      { status: 500 }
    )
  }
}

// PATCH /api/transactions/[id] - Update transaction status or marketplace
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, marketplaceId } = body

    // Validate status
    const validStatuses = ['PENDING', 'VERIFIED', 'PROCESSING', 'COMPLETED', 'CANCELLED']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status tidak valid' },
        { status: 400 }
      )
    }

    // Get current transaction with all relations needed for fee calculation
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        partner: true,
        customer: true,
        paymentType: true,
        marketplace: true
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if status transition is valid
    const allowedTransitions = STATUS_TRANSITIONS[transaction.status]
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak dapat mengubah status dari ${transaction.status} ke ${status}`
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { status }

    // If status is changing from PENDING to VERIFIED and marketplaceId is provided, update marketplace and recalculate fees
    if (transaction.status === 'PENDING' && status === 'VERIFIED' && marketplaceId !== undefined) {
      // Get the new marketplace if provided
      let newMarketplace = null
      if (marketplaceId && marketplaceId !== 'none') {
        newMarketplace = await db.marketplace.findUnique({
          where: { id: marketplaceId }
        })
        if (!newMarketplace) {
          return NextResponse.json(
            { success: false, error: 'Platform tidak ditemukan' },
            { status: 400 }
          )
        }
        updateData.marketplaceId = marketplaceId
      } else if (marketplaceId === 'none' || marketplaceId === null) {
        // Allow removing marketplace
        updateData.marketplaceId = null
      }

      // Recalculate fees with the new marketplace
      const partnerRate = transaction.partner ? transaction.partner.commissionRate : 0
      const feeCalculation = calculateTransactionFees(
        transaction.nominal,
        transaction.paymentType,
        newMarketplace,
        transaction.method as 'ONLINE' | 'COD',
        partnerRate
      )

      // Update fee calculations
      updateData.paymentFee = feeCalculation.paymentFee
      updateData.platformFee = feeCalculation.platformFee
      updateData.netMargin = feeCalculation.netMargin
      updateData.partnerProfit = feeCalculation.partnerProfit
      updateData.ownerProfit = feeCalculation.ownerProfit
      updateData.receivedAmount = feeCalculation.receivedAmount
    }

    // Update transaction
    const updatedTransaction = await db.transaction.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        partner: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        paymentType: true,
        marketplace: true
      }
    })

    // If status is COMPLETED, update partner stats
    if (status === 'COMPLETED' && transaction.partnerId) {
      await db.partner.update({
        where: { id: transaction.partnerId },
        data: {
          totalProfit: { increment: updatedTransaction.partnerProfit },
          totalVolume: { increment: transaction.nominal },
          totalTransactions: { increment: 1 }
        }
      })
    }

    // If status is COMPLETED, update customer stats
    if (status === 'COMPLETED') {
      await db.customer.update({
        where: { id: transaction.customerId },
        data: {
          totalContribution: { increment: updatedTransaction.ownerProfit },
          totalVolume: { increment: transaction.nominal },
          totalTransactions: { increment: 1 }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedTransaction,
      message: 'Status transaksi berhasil diperbarui'
    })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui status transaksi' },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id] - Cancel transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const transaction = await db.transaction.findUnique({
      where: { id }
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Only allow cancelling PENDING transactions
    if (transaction.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Hanya transaksi dengan status PENDING yang dapat dibatalkan' },
        { status: 400 }
      )
    }

    // Update status to CANCELLED
    const updatedTransaction = await db.transaction.update({
      where: { id },
      data: { status: 'CANCELLED' }
    })

    return NextResponse.json({
      success: true,
      data: updatedTransaction,
      message: 'Transaksi berhasil dibatalkan'
    })
  } catch (error) {
    console.error('Error cancelling transaction:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal membatalkan transaksi' },
      { status: 500 }
    )
  }
}
