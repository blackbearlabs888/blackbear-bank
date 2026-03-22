import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { generateOrderId, calculatePaymentFee, calculateMarginBreakdown } from '@/lib/auth';

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

// GET transactions with pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const days = searchParams.get('days');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });
      where.partnerId = partner?.id;
    }

    if (status) {
      where.status = status;
    }

    // Filter by days (e.g., last 30 days)
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      where.createdAt = { gte: daysAgo };
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          customer: true,
          paymentType: true,
          marketplace: true,
          partner: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Serialize transactions to convert Decimal fields to numbers
    const serializedTransactions = transactions.map(serializeTransaction);

    return NextResponse.json({
      success: true,
      data: serializedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST create transaction
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
    const {
      customerId,
      customerName,
      customerPhone,
      customerCity,
      customerBankName,
      customerBankAccount,
      customerBankHolder,
      isNewCustomer,
      nominal,
      paymentTypeId,
      methodTransaction,
      marketplaceId,
      partnerId,
    } = body;

    // Validation
    if (!nominal || !paymentTypeId || !methodTransaction) {
      return NextResponse.json(
        { success: false, error: 'Field wajib harus diisi' },
        { status: 400 }
      );
    }

    // For existing customer, customerId is required
    if (!isNewCustomer && !customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer harus dipilih' },
        { status: 400 }
      );
    }

    // For new customer, name and phone are required
    if (isNewCustomer && (!customerName || !customerPhone)) {
      return NextResponse.json(
        { success: false, error: 'Nama dan nomor customer harus diisi' },
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
    // Accept 'none' or '' as signals to not use marketplace
    let platformFee = 0;
    const effectiveMarketplaceId = (marketplaceId && marketplaceId !== 'none') ? marketplaceId : null;

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
        platformFee = toNumber(nominal) * (mpFeePercent / 100) + mpFeeFlat;
      }
    }

    // Get partner
    let actualPartnerId = partnerId || null;
    let partnerRate = 0;

    if (user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });
      actualPartnerId = partner?.id;
      partnerRate = partner?.commission || 0;
    } else if (partnerId) {
      const partner = await db.partner.findUnique({
        where: { id: partnerId },
      });
      partnerRate = partner?.commission || 0;
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
      toNumber(partnerRate)
    );

    // Generate order ID
    const orderId = generateOrderId();

    // Default status: "process" for owner, "pending" for partner/public
    const defaultStatus = user.role === 'owner' ? 'process' : 'pending';

    // Handle customer - create new or use existing
    let finalCustomerId = customerId;

    if (isNewCustomer && user.role === 'owner') {
      // Check if customer with same phone exists
      const existingCustomer = await db.customer.findFirst({
        where: { phone: customerPhone },
      });

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;
      } else {
        // Create new customer with bank details
        const newCustomer = await db.customer.create({
          data: {
            name: customerName,
            phone: customerPhone,
            city: customerCity || null,
            bankName: customerBankName || null,
            bankAccount: customerBankAccount || null,
            bankHolder: customerBankHolder || null,
            totalVolume: 0,
            totalTransactions: 0,
          },
        });
        finalCustomerId = newCustomer.id;
      }
    }

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        orderId,
        customerId: finalCustomerId,
        partnerId: actualPartnerId,
        nominal,
        paymentFee,
        platformFee,
        netMargin,
        partnerProfit,
        ownerProfit,
        totalReceived: nominal - paymentFee,
        paymentTypeId,
        methodTransaction,
        marketplaceId: effectiveMarketplaceId,
        status: defaultStatus,
      },
      include: {
        customer: true,
        paymentType: true,
        partner: true,
        marketplace: true,
      },
    });

    // Update customer stats (always track customer activity)
    await db.customer.update({
      where: { id: finalCustomerId },
      data: {
        totalVolume: { increment: nominal },
        totalTransactions: { increment: 1 },
      },
    });

    // Note: Partner stats (totalProfit, totalVolume) are only updated when transaction status changes to 'success'
    // This ensures partner targets are based on actual successful transactions
    // See PATCH handler in /api/transactions/[id]/route.ts for the stats update logic

    return NextResponse.json({
      success: true,
      data: serializeTransaction(transaction as unknown as Record<string, unknown>),
      message: `Transaksi berhasil dibuat dengan status ${defaultStatus}`,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
