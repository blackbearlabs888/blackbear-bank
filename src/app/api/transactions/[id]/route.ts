import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';

// Helper to serialize transaction with Decimal fields
function serializeTransaction(tx: Record<string, unknown>) {
  return {
    ...tx,
    nominal: toNumber(tx.nominal),
    paymentFee: toNumber(tx.paymentFee),
    platformFee: toNumber(tx.platformFee),
    netMargin: toNumber(tx.netMargin),
    partnerProfit: toNumber(tx.partnerProfit),
    ownerProfit: toNumber(tx.ownerProfit),
    totalReceived: toNumber(tx.totalReceived),
    customer: tx.customer ? {
      ...tx.customer as object,
      totalVolume: toNumber((tx.customer as Record<string, unknown>).totalVolume),
    } : null,
    paymentType: tx.paymentType ? {
      ...tx.paymentType as object,
      onlineFeePercent: toNumber((tx.paymentType as Record<string, unknown>).onlineFeePercent),
      onlineFeeFlat: toNumber((tx.paymentType as Record<string, unknown>).onlineFeeFlat),
      codFeePercent: toNumber((tx.paymentType as Record<string, unknown>).codFeePercent),
      codFeeFlat: toNumber((tx.paymentType as Record<string, unknown>).codFeeFlat),
      threshold: toNumber((tx.paymentType as Record<string, unknown>).threshold),
    } : null,
    marketplace: tx.marketplace ? {
      ...tx.marketplace as object,
      feePercent: toNumber((tx.marketplace as Record<string, unknown>).feePercent),
      feeFlat: toNumber((tx.marketplace as Record<string, unknown>).feeFlat),
    } : null,
    partner: tx.partner ? {
      ...tx.partner as object,
      commission: toNumber((tx.partner as Record<string, unknown>).commission),
      target: toNumber((tx.partner as Record<string, unknown>).target),
      totalProfit: toNumber((tx.partner as Record<string, unknown>).totalProfit),
      totalVolume: toNumber((tx.partner as Record<string, unknown>).totalVolume),
    } : null,
  };
}

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
      data: serializeTransaction(transaction as unknown as Record<string, unknown>),
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
    // Accept 'none', '', or null as signals to clear marketplace
    if (marketplaceId !== undefined || body.clearMarketplace) {
      let platformFee = 0;
      const effectiveMarketplaceId = marketplaceId === 'none' || marketplaceId === '' ? null : marketplaceId;

      if (effectiveMarketplaceId) {
        const marketplace = await db.marketplace.findUnique({
          where: { id: effectiveMarketplaceId },
        });

        if (marketplace) {
          // Convert Decimal to number safely (handles Neon PostgreSQL Decimal type)
          let mpFeePercent = toNumber(marketplace.feePercent);
          const mpFeeFlat = toNumber(marketplace.feeFlat);
          // Safety: normalize fee percent if > 100 (database precision issue fix)
          if (mpFeePercent > 100) {
            mpFeePercent = mpFeePercent / 1000;
          }
          platformFee = toNumber(existingTransaction.nominal) * (mpFeePercent / 100) + mpFeeFlat;
          updateData.marketplaceId = effectiveMarketplaceId;
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
      data: serializeTransaction(transaction as unknown as Record<string, unknown>),
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
