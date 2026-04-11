import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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
 */

const CONTACT_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 requests per minute
  blockDurationMs: 5 * 60 * 1000, // 5 min block
  keyPrefix: 'contact',
};

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, CONTACT_RATE_LIMIT);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.',
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter) },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const contactType = searchParams.get('type'); // 'partner' or 'owner'

    // Validate orderId
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID diperlukan' },
        { status: 400 }
      );
    }

    // Validate contact type
    if (contactType && contactType !== 'partner' && contactType !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tipe kontak tidak valid' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: 'Order tidak ditemukan' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { success: false, error: 'Tidak ada kontak WhatsApp yang tersedia' },
        { status: 404 }
      );
    }

    // Build wa.me URL server-side — phone number never reaches the client
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

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
    console.error('Contact proxy error:', error instanceof Error ? { message: error.message, stack: error.stack } : error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
