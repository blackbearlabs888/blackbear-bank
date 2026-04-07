import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPhoneVariations, normalizePhone } from '@/lib/customer-utils';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { sanitizePhone, validateLength, FIELD_LIMITS } from '@/lib/sanitize';

// Lookup customer by phone number to prevent duplicates
export async function GET(request: NextRequest) {
  try {
    // ── Rate Limiting (anti enumeration) ──
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.CUSTOMER_LOOKUP);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Terlalu banyak pencarian. Coba lagi dalam ${rateLimitResult.retryAfter} detik.` 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone');

    if (!rawPhone) {
      return NextResponse.json(
        { success: false, error: 'Nomor telepon diperlukan' },
        { status: 400 }
      );
    }

    // ── Input Sanitization ──
    const phone = sanitizePhone(rawPhone);

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Format nomor telepon tidak valid' },
        { status: 400 }
      );
    }

    // ── Length Validation ──
    const phoneCheck = validateLength(phone, FIELD_LIMITS.PHONE_MIN, FIELD_LIMITS.PHONE_MAX);
    if (!phoneCheck.valid) {
      return NextResponse.json(
        { success: false, error: `Nomor telepon: ${phoneCheck.error}` },
        { status: 400 }
      );
    }

    // ── Get all phone variations for comprehensive search ──
    const phoneVariations = getPhoneVariations(phone);
    const normalizedPhone = normalizePhone(phone);

    // ── Build OR conditions ──
    const orConditions = phoneVariations.map(p => ({ phone: p }));
    
    // Also search with contains for partial matches
    phoneVariations.forEach(p => {
      orConditions.push({ phone: { contains: p.replace(/^62/, '0') } });
      orConditions.push({ phone: { contains: p.replace(/^0/, '62') } });
    });

    // ── Find customer ──
    const customer = await db.customer.findFirst({
      where: {
        OR: orConditions,
      },
      select: {
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
      },
    });

    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer tidak ditemukan',
        data: null,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...customer,
          totalVolume: Number(customer.totalVolume),
        },
        message: `Ditemukan! ${customer.name} - ${customer.totalTransactions} transaksi sebelumnya`,
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error) {
    console.error('Customer lookup error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
