import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { checkCustomerDuplicate, normalizePhone } from '@/lib/customer-utils';
import { withObservability, updateActor } from '@/lib/observability/request-id';
import { logInfo, logError } from '@/lib/observability/logger';
import {
  apiValidationError,
  apiUnauthenticated,
  apiErrorFrom,
} from '@/lib/observability/errors';

// GET customers with pagination
export const GET = withObservability(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }

    updateActor(user.role, user.id);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const label = searchParams.get('label');
    const all = searchParams.get('all'); // If 'true', search all customers regardless of partner
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let where: Record<string, unknown> = {};

    // For partners: show customers they have transactions with OR customers they created
    if (all !== 'true' && user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });

      if (partner) {
        // Get customer IDs from transactions where this partner is involved
        const partnerTransactions = await db.transaction.findMany({
          where: { partnerId: partner.id },
          select: { customerId: true },
          distinct: ['customerId'],
        });
        const customerIdsFromTransactions = partnerTransactions.map(
          (t) => t.customerId,
        );

        // Show customers: created by partner OR have transactions with partner
        where.OR = [
          { partnerId: partner.id },
          { id: { in: customerIdsFromTransactions } },
        ];
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (label) {
      where.label = label;
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              transactions: true,
            },
          },
        },
      }),
      db.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: customers,
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
    logError({
      event: 'customer.list_error',
      message: 'List customers handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});

// POST create customer
export const POST = withObservability(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }

    updateActor(user.role, user.id);

    const body = await request.json();
    const {
      name,
      phone,
      bankName,
      bankAccount,
      bankHolder,
      city,
      label,
      updateExisting,
    } = body;

    // Validation
    if (!name || !phone) {
      return apiValidationError('Nama dan No. WA wajib diisi');
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phone);

    // Check for duplicate customer (by phone OR name)
    const duplicateCheck = await checkCustomerDuplicate(
      normalizedPhone,
      name,
    );

    // If duplicate found, return existing customer (for auto-fill)
    // Don't create duplicate - just return the existing one
    if (duplicateCheck.isDuplicate && duplicateCheck.existingCustomer) {
      // Optionally update existing customer with new data if updateExisting is true
      if (updateExisting) {
        const updatedCustomer = await db.customer.update({
          where: { id: duplicateCheck.existingCustomer.id },
          data: {
            name,
            phone: normalizedPhone,
            bankName: bankName || duplicateCheck.existingCustomer.bankName,
            bankAccount:
              bankAccount || duplicateCheck.existingCustomer.bankAccount,
            bankHolder:
              bankHolder || duplicateCheck.existingCustomer.bankHolder,
            city: city || duplicateCheck.existingCustomer.city,
            label: label || duplicateCheck.existingCustomer.label,
          },
        });

        return NextResponse.json({
          success: true,
          isExisting: true,
          duplicateType: duplicateCheck.duplicateType,
          data: updatedCustomer,
          message: `Customer ditemukan dan diupdate: ${duplicateCheck.message}`,
        });
      }

      // Just return existing customer without update
      return NextResponse.json({
        success: true,
        isExisting: true,
        duplicateType: duplicateCheck.duplicateType,
        data: duplicateCheck.existingCustomer,
        message: `Customer sudah ada: ${duplicateCheck.message}`,
      });
    }

    // Get partner ID if user is partner
    let partnerId = null;
    let addedBy = 'owner'; // default

    if (user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });
      partnerId = partner?.id;
      addedBy = 'partner';
    }

    // Create new customer (no duplicate found)
    const customer = await db.customer.create({
      data: {
        name,
        phone: normalizedPhone,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        bankHolder: bankHolder || null,
        city: city || null,
        label: label || 'New',
        partnerId,
        addedBy,
      },
    });

    // Log creation event — no PII (phone/bankAccount/bankHolder never logged)
    logInfo({
      event: 'customer.created',
      actorRole: user.role,
      actorId: user.id,
      message: 'Customer created',
    });

    return NextResponse.json({
      success: true,
      isExisting: false,
      data: customer,
      message: 'Customer baru berhasil dibuat',
    });
  } catch (error) {
    logError({
      event: 'customer.create_error',
      message: 'Create customer handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});
