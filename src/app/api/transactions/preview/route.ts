import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
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
        // Convert Decimal to number safely (handles Neon PostgreSQL Decimal type)
        let mpFeePercent = toNumber(marketplace.feePercent);
        const mpFeeFlat = toNumber(marketplace.feeFlat);
        // Safety: normalize fee percent if > 100 (database precision issue fix)
        if (mpFeePercent > 100) {
          mpFeePercent = mpFeePercent / 1000;
        }
        platformFee = toNumber(nominal) * (mpFeePercent / 100) + mpFeeFlat;
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
    // Convert Decimal values to numbers for PostgreSQL compatibility
    const paymentFee = calculatePaymentFee(
      toNumber(nominal),
      {
        onlineFeePercent: toNumber(paymentType.onlineFeePercent),
        onlineFeeFlat: toNumber(paymentType.onlineFeeFlat),
        codFeePercent: toNumber(paymentType.codFeePercent),
        codFeeFlat: toNumber(paymentType.codFeeFlat),
        threshold: toNumber(paymentType.threshold),
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
          feePercent: toNumber(marketplace.feePercent),
          feeFlat: toNumber(marketplace.feeFlat),
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
