import { NextRequest, NextResponse } from 'next/server';
import { db, toNumber } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Rate limit: 30 track requests per minute (prevents order ID enumeration)
const TRACK_RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60 * 1000,
  blockDurationMs: 5 * 60 * 1000,
  keyPrefix: 'track',
};

/**
 * Filter out partner-to-owner private messages from notes
 * Partner messages have format: [timestamp] Partner: message
 * These should only be visible to owner, not to customers on public track page
 */
function filterPublicNotes(notes: string | null): string | null {
  if (!notes) return null;

  // Split by newlines and filter out lines that match partner message pattern
  const lines = notes.split('\n');
  const publicLines = lines.filter(line => {
    // Pattern: [DD/MM/YYYY, HH:MM:SS] PartnerName: message
    // This pattern indicates private partner-to-owner communication
    const isPartnerMessage = /^\[.*?\]\s*.+:\s*.+$/.test(line.trim());
    return !isPartnerMessage;
  });

  const filtered = publicLines.join('\n').trim();
  return filtered || null;
}

/**
 * Mask phone number - show only last 4 digits
 * e.g. 081234567890 -> 0812-XXXX-7890
 */
function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  const prefix = digits.slice(0, 4);
  const last4 = digits.slice(-4);
  return `${prefix}-XXXX-${last4}`;
}

/**
 * Mask bank account - show only last 4 digits
 * e.g. 1234567890 -> XXXXXX7890
 */
function maskBankAccount(account: string | null): string | null {
  if (!account) return null;
  const digits = account.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  const last4 = digits.slice(-4);
  return 'XXXXXX' + last4;
}

/**
 * Mask bank holder - show first name only
 * e.g. "John Doe" -> "John"
 */
function maskBankHolder(holder: string | null): string | null {
  if (!holder) return null;
  const parts = holder.trim().split(/\s+/);
  return parts[0];
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, TRACK_RATE_LIMIT);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.',
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter || 0) },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID diperlukan' },
        { status: 400 }
      );
    }

    const [transaction, ownerProfile] = await Promise.all([
      db.transaction.findUnique({
        where: { orderId },
        include: {
          customer: true,
          paymentType: true,
          partner: true,
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

    return NextResponse.json({
      success: true,
      data: {
        orderId: transaction.orderId,
        nominal: toNumber(transaction.nominal),
        paymentFee: toNumber(transaction.paymentFee),
        totalReceived: toNumber(transaction.totalReceived),
        status: transaction.status,
        // Filter out private partner-to-owner messages for public view
        notes: filterPublicNotes(transaction.notes),
        customer: {
          name: transaction.customer.name,
          phone: maskPhone(transaction.customer.phone),
          bankName: transaction.customer.bankName,
          bankAccount: maskBankAccount(transaction.customer.bankAccount),
          bankHolder: maskBankHolder(transaction.customer.bankHolder),
          city: transaction.customer.city,
        },
        paymentType: transaction.paymentType.name,
        methodTransaction: transaction.methodTransaction,
        partner: transaction.partner?.name || null,
        canContact: !!(transaction.partner?.phone && transaction.partner?.status === 'active') || !!ownerProfile?.footerWhatsapp,
        transactionLink: transaction.transactionLink || null,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    console.error('Track order error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
