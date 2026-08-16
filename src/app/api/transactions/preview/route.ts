import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { calculateTransaction } from '@/lib/transaction/fee';
import { withObservability, updateActor } from '@/lib/observability/request-id';
import { logInfo, logError } from '@/lib/observability/logger';
import {
  apiErrorFrom,
  apiValidationError,
  apiUnauthenticated,
  ErrorCode,
} from '@/lib/observability/errors';

export const POST = withObservability(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }
    updateActor(user.role, user.id);

    const body = await request.json();
    const { nominal, paymentTypeId, methodTransaction, marketplaceId, partnerId, discountPercent, discountNominal } = body;

    if (!nominal || !paymentTypeId || !methodTransaction) {
      return apiValidationError('Field wajib harus diisi');
    }

    // Get payment type
    const paymentType = await db.paymentType.findUnique({
      where: { id: paymentTypeId },
    });

    if (!paymentType) {
      return apiValidationError('Tipe pembayaran tidak valid');
    }

    // Get marketplace if provided
    let marketplace = null;
    if (marketplaceId && marketplaceId !== '__none') {
      marketplace = await db.marketplace.findUnique({
        where: { id: marketplaceId },
      });
    }

    // Get partner
    let partner = null;
    if (partnerId && partnerId !== '__none') {
      partner = await db.partner.findUnique({
        where: { id: partnerId },
      });
    }

    // ── Consolidated fee calculation (Phase 2 single source) ──
    // Preview now applies discount, producing identical results to the
    // persisted transaction (Phase 2 Step 2 parity requirement).
    const calc = calculateTransaction({
      nominal: toNumber(nominal),
      paymentType: paymentType as unknown as Parameters<typeof calculateTransaction>[0]['paymentType'],
      marketplace: marketplace ? { name: marketplace.name, feePercent: marketplace.feePercent, feeFlat: marketplace.feeFlat } : null,
      partner: partner ? { commission: partner.commission } : null,
      methodTransaction,
      discountPercentOverride: discountPercent !== undefined ? Number(discountPercent) : undefined,
      discountNominalOverride: discountNominal !== undefined ? Number(discountNominal) : undefined,
    });

    logInfo({
      event: 'transaction.preview',
      message: 'Preview calculated',
      data: {
        paymentTypeId,
        methodTransaction,
        hasMarketplace: !!marketplace,
        hasPartner: !!partner,
        hasDiscount: discountPercent !== undefined || discountNominal !== undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        nominal: calc.nominal,
        originalFee: calc.originalFee,
        discountPercent: calc.discountPercent,
        discountAmount: calc.discountAmount,
        paymentFee: calc.paymentFee,
        platformFee: calc.platformFee,
        netMargin: calc.netMargin,
        partnerProfit: calc.partnerProfit,
        ownerProfit: calc.ownerProfit,
        totalReceived: calc.totalReceived,
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
          fromNominal: calc.nominal,
          paymentFeeDeduction: calc.paymentFee,
          customerReceives: calc.totalReceived,
          fromPaymentFee: calc.paymentFee,
          platformFeeDeduction: calc.platformFee,
          netMarginResult: calc.netMargin,
          partnerShare: calc.partnerProfit,
          ownerShare: calc.ownerProfit,
        },
      },
    });
  } catch (error) {
    logError({
      event: 'transaction.preview_failed',
      errorCode: ErrorCode.INTERNAL_ERROR,
      data: { error },
    });
    return apiErrorFrom(error, ErrorCode.INTERNAL_ERROR, 'Terjadi kesalahan server');
  }
});
