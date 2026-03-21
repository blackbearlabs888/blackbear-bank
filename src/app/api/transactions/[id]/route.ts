import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET single transaction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        paymentType: true,
        marketplace: true,
        partner: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Authorization check for partners
    if (user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });
      if (transaction.partnerId !== partner?.id) {
        return NextResponse.json(
          { success: false, error: 'Tidak memiliki akses' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PATCH update transaction
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Only owner can update transaction status
    if (user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, notes, marketplaceId } = body;

    // Get existing transaction
    const existingTransaction = await db.transaction.findUnique({
      where: { id },
      include: {
        paymentType: true,
        partner: true,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (status !== undefined) {
      const validStatuses = ['pending', 'verification', 'process', 'success', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Status tidak valid' },
          { status: 400 }
        );
      }
      updateData.status = status;
      
      // Handle partner stats update when status changes to/from success
      // Partner's totalProfit and totalVolume should only count successful transactions
      if (existingTransaction.partnerId) {
        const wasSuccess = existingTransaction.status === 'success';
        const willBeSuccess = status === 'success';
        
        if (!wasSuccess && willBeSuccess) {
          // Transaction is now successful - increment partner stats
          await db.partner.update({
            where: { id: existingTransaction.partnerId },
            data: {
              totalProfit: { increment: existingTransaction.partnerProfit },
              totalVolume: { increment: existingTransaction.nominal },
            },
          });
        } else if (wasSuccess && !willBeSuccess) {
          // Transaction is no longer successful - decrement partner stats
          await db.partner.update({
            where: { id: existingTransaction.partnerId },
            data: {
              totalProfit: { decrement: existingTransaction.partnerProfit },
              totalVolume: { decrement: existingTransaction.nominal },
            },
          });
        }
      }
    }
    
    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    // Handle marketplace selection during verification
    if (marketplaceId !== undefined) {
      let platformFee = 0;
      
      if (marketplaceId) {
        const marketplace = await db.marketplace.findUnique({
          where: { id: marketplaceId },
        });
        
        if (marketplace) {
          platformFee = existingTransaction.nominal * (marketplace.feePercent / 100) + (marketplace.feeFlat || 0);
          updateData.marketplaceId = marketplaceId;
        }
      } else {
        updateData.marketplaceId = null;
      }
      
      updateData.platformFee = platformFee;
      
      // Recalculate margins with new platform fee
      const netMargin = existingTransaction.paymentFee - platformFee;
      const partnerRate = existingTransaction.partner?.commission || 0;
      const partnerProfit = netMargin * (partnerRate / 100);
      const ownerProfit = netMargin - partnerProfit;
      
      updateData.netMargin = netMargin;
      updateData.partnerProfit = partnerProfit;
      updateData.ownerProfit = ownerProfit;
    }

    // Update transaction
    const transaction = await db.transaction.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        paymentType: true,
        marketplace: true,
        partner: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaksi berhasil diupdate',
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Only owner can delete transactions
    if (user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    // Get existing transaction
    const existingTransaction = await db.transaction.findUnique({
      where: { id },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Reverse customer stats
    await db.customer.update({
      where: { id: existingTransaction.customerId },
      data: {
        totalVolume: { decrement: existingTransaction.nominal },
        totalTransactions: { decrement: 1 },
      },
    });

    // Reverse partner stats if exists and was successful
    if (existingTransaction.partnerId && existingTransaction.status === 'success') {
      await db.partner.update({
        where: { id: existingTransaction.partnerId },
        data: {
          totalVolume: { decrement: existingTransaction.nominal },
          totalProfit: { decrement: existingTransaction.partnerProfit },
        },
      });
    }

    // Delete transaction
    await db.transaction.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
