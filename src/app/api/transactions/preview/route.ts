import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculatePaymentFee, calculateMarginBreakdown } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nominal, paymentTypeId, methodTransaction, marketplaceId, partnerId } = body;

    if (!nominal || !paymentTypeId || !methodTransaction) {
      return NextResponse.json(
        { success: false, error: 'Field wajib harus diisi' },
        { status: 400 }
      );
    }

    // Get payment type
    const paymentType = await db.paymentType.findUnique({
      where: { id: paymentTypeId },
    });

    if (!paymentType) {
      return NextResponse.json(
        { success: false, error: 'Tipe pembayaran tidak valid' },
        { status: 400 }
      );
    }

    // Get marketplace if provided
    let platformFee = 0;
    let marketplace = null;
    if (marketplaceId && marketplaceId !== '__none') {
      marketplace = await db.marketplace.findUnique({
        where: { id: marketplaceId },
      });
      if (marketplace) {
        platformFee = nominal * (marketplace.feePercent / 100) + marketplace.feeFlat;
      }
    }

    // Get partner rate
    let partnerRate = 0;
    let partner = null;
    if (partnerId && partnerId !== '__none') {
      partner = await db.partner.findUnique({
        where: { id: partnerId },
      });
      if (partner) {
        partnerRate = partner.commission;
      }
    }

    // Calculate fees
    const paymentFee = calculatePaymentFee(
      nominal,
      {
        onlineFeePercent: paymentType.onlineFeePercent,
        onlineFeeFlat: paymentType.onlineFeeFlat,
        codFeePercent: paymentType.codFeePercent,
        codFeeFlat: paymentType.codFeeFlat,
        threshold: paymentType.threshold,
      },
      methodTransaction
    );

    const { netMargin, partnerProfit, ownerProfit } = calculateMarginBreakdown(
      paymentFee,
      platformFee,
      partnerRate
    );

    const totalReceived = nominal - paymentFee;

    return NextResponse.json({
      success: true,
      data: {
        nominal,
        paymentFee,
        platformFee,
        netMargin,
        partnerProfit,
        ownerProfit,
        totalReceived,
        paymentType: {
          id: paymentType.id,
          name: paymentType.name,
        },
        marketplace: marketplace ? {
          id: marketplace.id,
          name: marketplace.name,
          feePercent: marketplace.feePercent,
          feeFlat: marketplace.feeFlat,
        } : null,
        partner: partner ? {
          id: partner.id,
          name: partner.name,
          commission: partner.commission,
        } : null,
        methodTransaction,
        breakdown: {
          fromNominal: nominal,
          paymentFeeDeduction: paymentFee,
          customerReceives: totalReceived,
          fromPaymentFee: paymentFee,
          platformFeeDeduction: platformFee,
          netMarginResult: netMargin,
          partnerShare: partnerProfit,
          ownerShare: ownerProfit,
        },
      },
    });
  } catch (error) {
    console.error('Preview calculation error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
