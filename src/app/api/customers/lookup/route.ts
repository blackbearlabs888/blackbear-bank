import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Find customer by phone (try with and without country code)
    const customer = await db.customer.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: cleanPhone.replace(/^0/, '62') },
          { phone: cleanPhone.replace(/^62/, '0') },
          { phone: `0${cleanPhone.replace(/^62/, '')}` },
          { phone: `62${cleanPhone.replace(/^0/, '')}` },
        ],
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
      data: customer,
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
