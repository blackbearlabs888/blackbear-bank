import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { sendTelegramNotification, formatCurrency } from '@/lib/telegram';
// Force recompile for transactionLink field

// Helper to serialize transaction with Decimal fields
function serializeTransaction(tx: Record<string, unknown>) {
  return {
    ...tx,
    nominal: toNumber(tx.nominal),
    paymentFee: toNumber(tx.paymentFee),
    originalFee: toNumber(tx.originalFee),
    discountPercent: toNumber(tx.discountPercent),
    discountAmount: toNumber(tx.discountAmount),
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
      discountPercent: toNumber((tx.paymentType as Record<string, unknown>).discountPercent),
      discountNominal: toNumber((tx.paymentType as Record<string, unknown>).discountNominal),
      minTransaction: toNumber((tx.paymentType as Record<string, unknown>).minTransaction),
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

    const body = await request.json();
    const { status, notes, marketplaceId, transactionLink, nominal, recalculate, sendNotification, partnerId, discountPercent, discountNominal } = body;

    // Get existing transaction
    const existingTransaction = await db.transaction.findUnique({
      where: { id },
      include: {
        paymentType: true,
        partner: true,
        marketplace: true,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Authorization: Owner can update anything, Partner can only update nominal on their own transactions
    // and only when status is pending or verification
    if (user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });

      if (!partner || existingTransaction.partnerId !== partner.id) {
        return NextResponse.json(
          { success: false, error: 'Tidak memiliki akses' },
          { status: 403 }
        );
      }

      // Partner can only update nominal and only on pending/verification status
      const allowedStatuses = ['pending', 'verification'];
      if (!allowedStatuses.includes(existingTransaction.status)) {
        return NextResponse.json(
          { success: false, error: 'Hanya bisa mengubah nominal saat status pending atau verifikasi' },
          { status: 403 }
        );
      }

      // Partner can only change nominal, not status, notes, or other fields
      if (status !== undefined || notes !== undefined || marketplaceId !== undefined || transactionLink !== undefined) {
        return NextResponse.json(
          { success: false, error: 'Partner hanya dapat mengubah nominal' },
          { status: 403 }
        );
      }
    } else if (user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
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
    
    if (transactionLink !== undefined) {
      updateData.transactionLink = transactionLink || null;
    }

    // Handle partner change
    if (partnerId !== undefined) {
      const effectivePartnerId = partnerId === 'none' || partnerId === '' ? null : partnerId;
      if (effectivePartnerId) {
        const partner = await db.partner.findUnique({ where: { id: effectivePartnerId } });
        if (!partner || partner.status !== 'active') {
          return NextResponse.json({ success: false, error: 'Partner tidak valid atau tidak aktif' }, { status: 400 });
        }
        // Reverse old partner stats if different and was successful
        if (existingTransaction.partnerId && existingTransaction.partnerId !== effectivePartnerId && existingTransaction.status === 'success') {
          await db.partner.update({
            where: { id: existingTransaction.partnerId },
            data: { totalProfit: { decrement: existingTransaction.partnerProfit }, totalVolume: { decrement: existingTransaction.nominal } },
          });
        }
        // Calculate new partner profit
        const partnerRate = toNumber(partner.commission) || 0;
        const currentNetMargin = toNumber(existingTransaction.netMargin);
        const newPartnerProfit = currentNetMargin * (partnerRate / 100);
        const newOwnerProfit = currentNetMargin - newPartnerProfit;
        updateData.partnerId = effectivePartnerId;
        updateData.partnerProfit = newPartnerProfit;
        updateData.ownerProfit = newOwnerProfit;
        // Apply new partner stats if was successful
        if (existingTransaction.status === 'success') {
          await db.partner.update({
            where: { id: effectivePartnerId },
            data: { totalProfit: { increment: newPartnerProfit }, totalVolume: { increment: existingTransaction.nominal } },
          });
        }
      } else {
        // Remove partner - reverse old partner stats if was successful
        if (existingTransaction.partnerId && existingTransaction.status === 'success') {
          await db.partner.update({
            where: { id: existingTransaction.partnerId },
            data: { totalProfit: { decrement: existingTransaction.partnerProfit }, totalVolume: { decrement: existingTransaction.nominal } },
          });
        }
        const currentNetMargin = toNumber(existingTransaction.netMargin);
        updateData.partnerId = null;
        updateData.partnerProfit = 0;
        updateData.ownerProfit = currentNetMargin;
      }
    }

    // Handle nominal change with recalculation
    if (nominal !== undefined || recalculate) {
      const newNominal = nominal !== undefined ? Number(nominal) : toNumber(existingTransaction.nominal);

      if (isNaN(newNominal) || newNominal <= 0) {
        return NextResponse.json(
          { success: false, error: 'Nominal tidak valid' },
          { status: 400 }
        );
      }

      const oldNominal = toNumber(existingTransaction.nominal);
      const paymentType = existingTransaction.paymentType;
      const partner = existingTransaction.partner;
      const marketplace = existingTransaction.marketplace;

      if (!paymentType) {
        return NextResponse.json(
          { success: false, error: 'Payment type tidak ditemukan' },
          { status: 400 }
        );
      }

      // Calculate payment fee based on method (Online/COD)
      const isOnline = existingTransaction.methodTransaction === 'Online';
      let feePercent = isOnline ? toNumber(paymentType.onlineFeePercent) : toNumber(paymentType.codFeePercent);
      const feeFlat = isOnline ? toNumber(paymentType.onlineFeeFlat) : toNumber(paymentType.codFeeFlat);
      const threshold = toNumber(paymentType.threshold);

      // Safety: normalize fee percent if > 100
      if (feePercent > 100) {
        feePercent = feePercent / 1000;
      }

      // Calculate payment fee using threshold logic
      let paymentFee: number;
      if (newNominal >= threshold) {
        paymentFee = newNominal * (feePercent / 100);
      } else {
        paymentFee = feeFlat;
      }

      // Calculate platform fee if marketplace exists
      let platformFee = 0;
      if (marketplace) {
        let mpFeePercent = toNumber(marketplace.feePercent);
        const mpFeeFlat = toNumber(marketplace.feeFlat);
        if (mpFeePercent > 100) {
          mpFeePercent = mpFeePercent / 1000;
        }
        platformFee = newNominal * (mpFeePercent / 100) + mpFeeFlat;
      }

      // Calculate margins and profits
      const netMargin = paymentFee - platformFee;
      const partnerRate = partner ? toNumber(partner.commission) : 0;
      const partnerProfit = netMargin * (partnerRate / 100);
      const ownerProfit = netMargin - partnerProfit;
      const totalReceived = newNominal - paymentFee;

      // Update all calculated fields
      updateData.nominal = newNominal;
      updateData.paymentFee = paymentFee;
      updateData.platformFee = platformFee;
      updateData.netMargin = netMargin;
      updateData.partnerProfit = partnerProfit;
      updateData.ownerProfit = ownerProfit;
      updateData.totalReceived = totalReceived;

      // Update customer total volume if nominal changed
      if (nominal !== undefined && newNominal !== oldNominal) {
        const volumeDiff = newNominal - oldNominal;
        await db.customer.update({
          where: { id: existingTransaction.customerId },
          data: {
            totalVolume: { increment: volumeDiff },
          },
        });

        // Update partner total volume if transaction was successful
        if (existingTransaction.partnerId && existingTransaction.status === 'success') {
          await db.partner.update({
            where: { id: existingTransaction.partnerId },
            data: {
              totalVolume: { increment: volumeDiff },
            },
          });
        }
      }
    }

    // Handle marketplace selection during verification
    // This block only runs when we're NOT recalculating due to nominal change
    // (the nominal/recalculate block above already handles marketplace fee with new nominal)
    if ((marketplaceId !== undefined || body.clearMarketplace) && !recalculate && nominal === undefined) {
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

    // Handle marketplace change when nominal is also changing
    // This ensures the new marketplace fee is calculated with the new nominal
    if ((marketplaceId !== undefined || body.clearMarketplace) && (nominal !== undefined || recalculate)) {
      const effectiveMarketplaceId = marketplaceId === 'none' || marketplaceId === '' ? null : marketplaceId;

      if (effectiveMarketplaceId) {
        // Just update the marketplace ID, the fee calculation is already done above
        updateData.marketplaceId = effectiveMarketplaceId;

        // Re-fetch the marketplace and recalculate platform fee with the new nominal
        const marketplace = await db.marketplace.findUnique({
          where: { id: effectiveMarketplaceId },
        });

        if (marketplace) {
          let mpFeePercent = toNumber(marketplace.feePercent);
          const mpFeeFlat = toNumber(marketplace.feeFlat);
          if (mpFeePercent > 100) {
            mpFeePercent = mpFeePercent / 1000;
          }
          // Use the new nominal that was already set in updateData
          const nominalToUse = updateData.nominal || toNumber(existingTransaction.nominal);
          const newPlatformFee = nominalToUse * (mpFeePercent / 100) + mpFeeFlat;

          // Update platform fee and recalculate margins
          updateData.platformFee = newPlatformFee;
          const newNetMargin = (updateData.paymentFee || toNumber(existingTransaction.paymentFee)) - newPlatformFee;
          const partnerRate = existingTransaction.partner ? toNumber(existingTransaction.partner.commission) : 0;
          updateData.netMargin = newNetMargin;
          updateData.partnerProfit = newNetMargin * (partnerRate / 100);
          updateData.ownerProfit = newNetMargin - (updateData.partnerProfit as number);
        }
      } else {
        updateData.marketplaceId = null;
        // Clear platform fee and recalculate margins
        updateData.platformFee = 0;
        const newNetMargin = (updateData.paymentFee || toNumber(existingTransaction.paymentFee)) - 0;
        const partnerRate = existingTransaction.partner ? toNumber(existingTransaction.partner.commission) : 0;
        updateData.netMargin = newNetMargin;
        updateData.partnerProfit = newNetMargin * (partnerRate / 100);
        updateData.ownerProfit = newNetMargin - (updateData.partnerProfit as number);
      }
    }

    // Handle discount (percentage or nominal)
    if (discountPercent !== undefined || discountNominal !== undefined) {
      // Only allow discount when status is pending or verification
      const allowedDiscountStatuses = ['pending', 'verification'];
      if (!allowedDiscountStatuses.includes(existingTransaction.status)) {
        return NextResponse.json(
          { success: false, error: 'Diskon hanya dapat diterapkan saat status pending atau verifikasi' },
          { status: 400 }
        );
      }

      // Get the effective nominal (might have been updated by nominal block)
      const nominalForCalc = updateData.nominal !== undefined ? Number(updateData.nominal) : toNumber(existingTransaction.nominal);

      // Calculate the base payment fee (original fee before discount)
      let originalFee: number;
      if (updateData.paymentFee !== undefined) {
        // Payment fee was already recalculated (from nominal/marketplace change) — this is the base fee
        originalFee = Number(updateData.paymentFee);
      } else {
        // Calculate base fee from scratch using current nominal and payment type rates
        const paymentType = existingTransaction.paymentType;
        if (!paymentType) {
          return NextResponse.json(
            { success: false, error: 'Payment type tidak ditemukan' },
            { status: 400 }
          );
        }
        const isOnline = existingTransaction.methodTransaction === 'Online';
        let feePercent = isOnline ? toNumber(paymentType.onlineFeePercent) : toNumber(paymentType.codFeePercent);
        const feeFlat = isOnline ? toNumber(paymentType.onlineFeeFlat) : toNumber(paymentType.codFeeFlat);
        const threshold = toNumber(paymentType.threshold);
        if (feePercent > 100) {
          feePercent = feePercent / 1000;
        }
        originalFee = nominalForCalc >= threshold
          ? nominalForCalc * (feePercent / 100)
          : feeFlat;
      }

      // Calculate discount amount
      let discountAmount = 0;
      let effectivePercent = 0;
      const effectiveNominal = discountNominal !== undefined ? Math.max(0, Number(discountNominal)) : 0;

      if (discountPercent !== undefined && Number(discountPercent) > 0) {
        // Percentage discount
        effectivePercent = Math.max(0, Math.min(Number(discountPercent), 100));
        discountAmount = originalFee * (effectivePercent / 100);
      } else if (effectiveNominal > 0) {
        // Nominal discount (capped at original fee)
        discountAmount = Math.min(effectiveNominal, originalFee);
      }

      const discountedPaymentFee = originalFee - discountAmount;

      // Get platform fee (might have been updated by marketplace block)
      const currentPlatformFee = updateData.platformFee !== undefined
        ? Number(updateData.platformFee)
        : toNumber(existingTransaction.platformFee);

      // Recalculate all margin fields with discounted payment fee
      const netMargin = discountedPaymentFee - currentPlatformFee;
      const partnerRate = existingTransaction.partner ? toNumber(existingTransaction.partner.commission) : 0;
      const partnerProfit = netMargin * (partnerRate / 100);
      const ownerProfit = netMargin - partnerProfit;
      const totalReceived = nominalForCalc - discountedPaymentFee;

      updateData.originalFee = originalFee;
      updateData.discountPercent = effectivePercent;
      updateData.discountAmount = discountAmount;
      updateData.paymentFee = discountedPaymentFee;
      updateData.netMargin = netMargin;
      updateData.partnerProfit = partnerProfit;
      updateData.ownerProfit = ownerProfit;
      updateData.totalReceived = totalReceived;
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

    // Create notification for status update
    if (status && status !== existingTransaction.status) {
      try {
        const ownerProfile = await db.ownerProfile.findFirst();
        if (ownerProfile) {
          await db.notification.create({
            data: {
              type: 'transaction_update',
              title: 'Update Status Transaksi',
              message: `${transaction.orderId} - ${transaction.customer?.name || 'Customer'} - Status: ${status.toUpperCase()}`,
              data: JSON.stringify({
                orderId: transaction.orderId,
                customerName: transaction.customer?.name,
                nominal: toNumber(transaction.nominal),
                oldStatus: existingTransaction.status,
                newStatus: status,
              }),
              targetType: 'owner',
              transactionId: transaction.id,
              partnerId: transaction.partnerId,
            },
          });

          // Send Telegram notification if enabled
          const notifSettings = await db.notificationSettings.findUnique({
            where: { ownerProfileId: ownerProfile.id },
          });

          if (notifSettings?.telegramEnabled && notifSettings.telegramBotToken && notifSettings.telegramChatId && notifSettings.notifyTransactionStatus) {
            const statusEmoji: Record<string, string> = {
              pending: '⏳',
              verification: '🔍',
              process: '⚙️',
              success: '✅',
              failed: '❌',
            };
            await sendTelegramNotification(
              notifSettings.telegramBotToken,
              notifSettings.telegramChatId,
              {
                type: 'transaction_update',
                title: `${statusEmoji[status] || '📝'} Update Transaksi`,
                message: `Order ID: ${transaction.orderId}`,
                additionalData: {
                  'Pelanggan': transaction.customer?.name,
                  'Nominal': formatCurrency(toNumber(transaction.nominal)),
                  'Status': status.toUpperCase(),
                  'Catatan': notes || '-',
                },
              }
            );
          }
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    }

    // Create notification for nominal update (by partner)
    if (sendNotification && nominal !== undefined && nominal !== toNumber(existingTransaction.nominal)) {
      try {
        const ownerProfile = await db.ownerProfile.findFirst();
        if (ownerProfile) {
          await db.notification.create({
            data: {
              type: 'transaction_update',
              title: 'Update Nominal Transaksi',
              message: `${transaction.orderId} - ${transaction.customer?.name || 'Customer'} - Nominal diubah oleh Partner`,
              data: JSON.stringify({
                orderId: transaction.orderId,
                customerName: transaction.customer?.name,
                oldNominal: toNumber(existingTransaction.nominal),
                newNominal: toNumber(transaction.nominal),
                partnerName: transaction.partner?.name,
              }),
              targetType: 'owner',
              transactionId: transaction.id,
              partnerId: transaction.partnerId,
            },
          });

          // Send Telegram notification if enabled
          const notifSettings = await db.notificationSettings.findUnique({
            where: { ownerProfileId: ownerProfile.id },
          });

          if (notifSettings?.telegramEnabled && notifSettings.telegramBotToken && notifSettings.telegramChatId && notifSettings.notifyTransactionStatus) {
            await sendTelegramNotification(
              notifSettings.telegramBotToken,
              notifSettings.telegramChatId,
              {
                type: 'transaction_update',
                title: '📝 Update Nominal',
                message: `Order ID: ${transaction.orderId}`,
                additionalData: {
                  'Pelanggan': transaction.customer?.name,
                  'Nominal Lama': formatCurrency(toNumber(existingTransaction.nominal)),
                  'Nominal Baru': formatCurrency(toNumber(transaction.nominal)),
                  'Partner': transaction.partner?.name || '-',
                },
              }
            );
          }
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    }

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
