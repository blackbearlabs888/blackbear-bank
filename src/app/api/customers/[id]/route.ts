import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  sanitizeName,
  sanitizePhone,
  sanitizeBankAccount,
  sanitizeCity,
  sanitizeString,
  validateLength,
  FIELD_LIMITS,
} from '@/lib/sanitize';
import { withObservability, updateActor } from '@/lib/observability/request-id';
import { logError } from '@/lib/observability/logger';
import {
  apiValidationError,
  apiUnauthenticated,
  apiNotFound,
  apiErrorFrom,
} from '@/lib/observability/errors';

// Helper: verify that a partner has access to a customer.
// Partner can access if:
//   1. Customer was created by this partner (partnerId matches), OR
//   2. Customer has at least one transaction with this partner
async function partnerCanAccessCustomer(
  partnerId: string,
  customerId: string,
): Promise<boolean> {
  const count = await db.customer.count({
    where: {
      id: customerId,
      OR: [
        { partnerId },
        { transactions: { some: { partnerId } } },
      ],
    },
  });
  return count > 0;
}

export const PATCH = withObservability<{
  params: Promise<{ id: string }>;
}>(async (request: NextRequest, ctx) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }

    updateActor(user.role, user.id);

    const { id } = await ctx.params;
    const body = await request.json();

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return apiNotFound('Customer tidak ditemukan');
    }

    // Ownership check: partner can only modify customers in their scope
    if (user.role === 'partner' && user.partner) {
      const canAccess = await partnerCanAccessCustomer(user.partner.id, id);
      if (!canAccess) {
        // Return 404 (not 403) to prevent enumeration
        return apiNotFound('Customer tidak ditemukan');
      }
    }

    // Build update data with explicit field allowlist + sanitization.
    // Partner CANNOT change: partnerId, addedBy, totalVolume, totalTransactions (ownership/stats fields).
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = sanitizeName(body.name);
      const check = validateLength(name, FIELD_LIMITS.NAME_MIN, FIELD_LIMITS.NAME_MAX);
      if (!check.valid) return apiValidationError(check.error);
      updateData.name = name;
    }
    if (body.phone !== undefined) {
      updateData.phone = sanitizePhone(body.phone);
    }
    if (body.bankName !== undefined) {
      updateData.bankName = sanitizeString(body.bankName).slice(0, FIELD_LIMITS.BANK_NAME_MAX);
    }
    if (body.bankAccount !== undefined) {
      updateData.bankAccount = sanitizeBankAccount(body.bankAccount);
    }
    if (body.bankHolder !== undefined) {
      updateData.bankHolder = sanitizeName(body.bankHolder).slice(0, FIELD_LIMITS.BANK_HOLDER_MAX);
    }
    if (body.city !== undefined) {
      updateData.city = sanitizeCity(body.city);
    }
    if (body.label !== undefined) {
      updateData.label = sanitizeString(body.label);
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes ? sanitizeString(body.notes).slice(0, 2000) : null;
    }

    const customer = await db.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer berhasil diperbarui',
    });
  } catch (error) {
    logError({
      event: 'customer.update_error',
      message: 'Update customer handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});

export const DELETE = withObservability<{
  params: Promise<{ id: string }>;
}>(async (request: NextRequest, ctx) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }

    updateActor(user.role, user.id);

    const { id } = await ctx.params;

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return apiNotFound('Customer tidak ditemukan');
    }

    // Ownership check: partner can only delete customers in their scope
    if (user.role === 'partner' && user.partner) {
      const canAccess = await partnerCanAccessCustomer(user.partner.id, id);
      if (!canAccess) {
        return apiNotFound('Customer tidak ditemukan');
      }
    }

    // Check if customer has transactions (protect historical data)
    const transactionsCount = await db.transaction.count({
      where: { customerId: id },
    });

    if (transactionsCount > 0) {
      return apiValidationError(
        'Customer tidak dapat dihapus karena sudah memiliki transaksi',
      );
    }

    await db.customer.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Customer berhasil dihapus',
    });
  } catch (error) {
    logError({
      event: 'customer.delete_error',
      message: 'Delete customer handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});

export const GET = withObservability<{
  params: Promise<{ id: string }>;
}>(async (request: NextRequest, ctx) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }

    updateActor(user.role, user.id);

    const { id } = await ctx.params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        partner: true,
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return apiNotFound('Customer tidak ditemukan');
    }

    // Ownership check: partner can only read customers in their scope
    if (user.role === 'partner' && user.partner) {
      const canAccess = await partnerCanAccessCustomer(user.partner.id, id);
      if (!canAccess) {
        // Return 404 to prevent enumeration
        return apiNotFound('Customer tidak ditemukan');
      }
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    logError({
      event: 'customer.get_error',
      message: 'Get customer handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});
