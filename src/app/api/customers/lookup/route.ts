import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPhoneVariations, normalizePhone } from '@/lib/customer-utils';

// Lookup customer by phone number to prevent duplicates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Nomor telepon diperlukan' },
        { status: 400 }
      );
    }

    // Get all phone variations for comprehensive search
    const phoneVariations = getPhoneVariations(phone);
    const normalizedPhone = normalizePhone(phone);

    // Build OR conditions for all phone variations
    const orConditions = phoneVariations.map(p => ({ phone: p }));
    
    // Also search with contains for partial matches
    phoneVariations.forEach(p => {
      orConditions.push({ phone: { contains: p.replace(/^62/, '0') } });
      orConditions.push({ phone: { contains: p.replace(/^0/, '62') } });
    });

    // Find customer by phone variations
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

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        totalVolume: Number(customer.totalVolume),
      },
      message: `Ditemukan! ${customer.name} - ${customer.totalTransactions} transaksi sebelumnya`,
    });
  } catch (error) {
    console.error('Customer lookup error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
