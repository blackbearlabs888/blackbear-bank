import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { withObservability } from '@/lib/observability/request-id';
import { apiErrorFrom, apiValidationError, apiNotFound, ErrorCode } from '@/lib/observability/errors';
import { logInfo, logWarn } from '@/lib/observability/logger';

/**
 * Normalize phone to 62xxx format (inline to avoid cross-module import issues)
 */
function safeNormalizePhone(raw: unknown): string {
  if (!raw) return '';
  const phone = String(raw).trim();
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * WhatsApp Contact Proxy API
 *
 * Instead of exposing partner phone numbers to the frontend,
 * this endpoint accepts an orderId and type (partner/owner),
 * looks up the phone number server-side, and returns a
 * pre-built wa.me redirect URL.
 *
 * Phone numbers NEVER leave the server.
 *
 * Phase 3 — Observability:
 *   - Failures are logged with a safe error code. The target phone number is
 *     NEVER logged (only whether the contact was 'partner' or 'owner').
 *   - Request ID is propagated via X-Request-Id.
 */

const CONTACT_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 requests per minute
  blockDurationMs: 5 * 60 * 1000, // 5 min block
  keyPrefix: 'contact',
};

export const GET = withObservability(async (request: NextRequest) => {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, CONTACT_RATE_LIMIT);
    if (!rateCheck.success) {
      return apiError({
        status: 429,
        code: ErrorCode.RATE_LIMITED,
        message: 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.',
        headers: { 'Retry-After': String(rateCheck.retryAfter) },
      });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const contactType = searchParams.get('type'); // 'partner' or 'owner'

    // Validate orderId
    if (!orderId) {
      return apiValidationError('Order ID diperlukan');
    }

    // Validate contact type
    if (contactType && contactType !== 'partner' && contactType !== 'owner') {
      return apiValidationError('Tipe kontak tidak valid');
    }

    // Fetch transaction with partner and owner profile
    const [transaction, ownerProfile] = await Promise.all([
      db.transaction.findUnique({
        where: { orderId },
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
            },
          },
        },
      }),
      db.ownerProfile.findFirst(),
    ]);

    if (!transaction) {
      return apiNotFound('Order tidak ditemukan');
    }

    // Build the default message
    const message = `Halo, saya ingin menanyakan status order saya dengan Order ID: ${orderId}`;

    // Determine target: partner (if exists and active) or owner (fallback)
    const target = contactType === 'owner' ? 'owner' :
      transaction.partner && transaction.partner.status === 'active' ? 'partner' : 'owner';

    let waPhone: string | null = null;
    let contactName: string | null = null;

    if (target === 'partner' && transaction.partner) {
      waPhone = safeNormalizePhone(transaction.partner.phone);
      contactName = transaction.partner.name || 'Partner';
    }

    // Fallback to owner WhatsApp
    if (!waPhone && ownerProfile?.footerWhatsapp) {
      waPhone = safeNormalizePhone(ownerProfile.footerWhatsapp);
      contactName = 'Owner';
    }

    if (!waPhone) {
      // Phase 3: Log the failure safely — NO phone number is logged.
      // Only the contact target type and orderId are recorded.
      logWarn({
        event: 'whatsapp.contact_unavailable',
        errorCode: 'CONTACT_NOT_FOUND',
        message: 'No WhatsApp contact available for this order',
        data: { orderId, contactTarget: target },
      });
      return apiNotFound('Tidak ada kontak WhatsApp yang tersedia');
    }

    // Build wa.me URL server-side — phone number never reaches the client
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

    logInfo({
      event: 'whatsapp.contact_link_created',
      message: 'WhatsApp contact link generated',
      data: { orderId, contactTarget: target, contactName },
    });

    // Return redirect URL (not the phone number)
    return NextResponse.json({
      success: true,
      data: {
        redirectUrl: waUrl,
        contactName,
        contactType: target,
        // Intentionally NOT including: phone number
      },
    });
  } catch (error) {
    // Phase 3: safe error — no phone, no stack, no Prisma detail in response.
    logWarn({
      event: 'whatsapp.contact_error',
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: 'Contact proxy error',
      data: { error },
    });
    return apiErrorFrom(error, ErrorCode.INTERNAL_ERROR, 'Terjadi kesalahan server');
  }
});
