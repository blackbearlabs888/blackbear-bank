import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getPhoneVariations, normalizePhone } from '@/lib/customer-utils';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { withObservability } from '@/lib/observability/request-id';
import { logInfo, logError } from '@/lib/observability/logger';
import {
  apiValidationError,
  apiRateLimited,
  apiErrorFrom,
} from '@/lib/observability/errors';

// Rate limit: 10 lookups per minute, 5 min block on exceed
const LOOKUP_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000,
  blockDurationMs: 5 * 60 * 1000,
  keyPrefix: 'customer_lookup',
};

// Full fields for authenticated owner/partner (NEVER returned to public callers)
const FULL_FIELDS = {
  id: true,
  name: true,
  phone: true,
  bankName: true,
  bankAccount: true,
  bankHolder: true,
  city: true,
  totalTransactions: true,
  totalVolume: true,
  label: true,
  addedBy: true,
  createdAt: true,
} as const;

/**
 * PUBLIC CUSTOMER LOOKUP — FULL CLOSURE (Phase 1.2)
 *
 * Product decision: privacy > prefill convenience. Public callers receive
 * ONLY `{ recognized: boolean }`. No name, no phone, no bank info, no city,
 * no ID, no stats. Returning customers type their data again.
 *
 * Authenticated callers (owner, partner) still receive FULL_FIELDS, with
 * partner lookup ownership-scoped (own customers or customers with whom they
 * have a transaction). A partner requesting a customer they do not own
 * receives the SAME generic response as a not-found customer — no enumeration
 * signal beyond the inherent phone-existence signal that is rate-limited.
 *
 * NOTE: The endpoint is still callable publicly so the order page can show a
 * "returning customer" indicator without leaking PII. The response does NOT
 * differ structurally between found and not-found beyond the `recognized`
 * boolean, which is the entire point of the endpoint. Rate limiting remains
 * the primary defence against phone enumeration.
 */
export const GET = withObservability(async (request: NextRequest) => {
  try {
    // Rate limiting (applies to all callers)
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, LOOKUP_RATE_LIMIT);
    if (!rateCheck.success) {
      return apiRateLimited(rateCheck.retryAfter || 5 * 60);
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return apiValidationError('Nomor telepon diperlukan');
    }

    // Normalize phone before query
    const phoneVariations = getPhoneVariations(phone);
    const _normalizedPhone = normalizePhone(phone);

    // Build OR conditions for all phone variations
    const orConditions: { phone: string | { contains: string } }[] =
      phoneVariations.map((p) => ({ phone: p }));

    // Also search with contains for partial matches
    phoneVariations.forEach((p) => {
      orConditions.push({ phone: { contains: p.replace(/^62/, '0') } });
      orConditions.push({ phone: { contains: p.replace(/^0/, '62') } });
    });

    // Determine auth status and apply ownership scoping for partners
    const user = await getCurrentUser();
    const isOwner = user?.role === 'owner';
    const isPartner = user?.role === 'partner' && !!user.partner;

    // Partner scope: customers they created OR have transactions with
    let partnerScope: unknown = undefined;
    if (isPartner) {
      partnerScope = {
        OR: [
          { partnerId: user.partner!.id },
          { transactions: { some: { partnerId: user.partner!.id } } },
        ],
      };
    }

    // Find customer by phone variations.
    //
    // Public callers only need an existence signal; authenticated callers
    // need full fields. We run two distinct findFirst calls so TypeScript
    // narrows the select type correctly and the public path never has
    // access to PII fields in code (defence-in-depth at the type level).
    if (!isOwner && !isPartner) {
      // --- PUBLIC PATH: existence check only, then return { recognized: boolean } ---
      const publicCustomer = await db.customer.findFirst({
        where: { OR: orConditions },
        select: { id: true },
      });

      // Log lookup event — do NOT log the phone number being looked up.
      logInfo({
        event: 'customer.lookup',
        message: 'Customer lookup performed',
      });

      // No structural difference between found/not-found beyond the boolean.
      // No PII, no count, no ID, no stats. The response is intentionally
      // identical in shape regardless of outcome (both return `recognized`).
      return NextResponse.json({
        success: true,
        data: { recognized: !!publicCustomer },
      });
    }

    // --- AUTHENTICATED PATH: full fields, ownership-scoped for partners ---
    const customer = await db.customer.findFirst({
      where: {
        AND: [
          { OR: orConditions },
          ...(partnerScope ? [partnerScope] : []),
        ],
      },
      select: FULL_FIELDS,
    });

    // Log lookup event — do NOT log the phone number being looked up.
    logInfo({
      event: 'customer.lookup',
      message: 'Customer lookup performed',
    });

    // Generic not-found response (does not reveal whether phone exists
    // beyond the inherent lookup-by-phone existence signal, which is
    // rate-limited at 10/min/IP — see LOOKUP_RATE_LIMIT above).
    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer tidak ditemukan',
        data: null,
      });
    }

    const message = `Ditemukan! ${customer.name} - ${customer.totalTransactions} transaksi sebelumnya`;

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        totalVolume: Number(customer.totalVolume),
      },
      message,
    });
  } catch (error) {
    logError({
      event: 'customer.lookup_error',
      message: 'Customer lookup handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});
