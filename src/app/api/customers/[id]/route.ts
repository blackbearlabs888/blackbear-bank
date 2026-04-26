import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sanitizeString } from '@/lib/sanitize';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, bankName, bankAccount, bankHolder, city, label, notes } = body;

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer tidak ditemukan' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) updateData.name = sanitizeString(name);
    if (phone !== undefined) updateData.phone = sanitizeString(phone);
    if (bankName !== undefined) updateData.bankName = sanitizeString(bankName);
    if (bankAccount !== undefined) updateData.bankAccount = sanitizeString(bankAccount);
    if (bankHolder !== undefined) updateData.bankHolder = sanitizeString(bankHolder);
    if (city !== undefined) updateData.city = sanitizeString(city);
    if (label !== undefined) updateData.label = sanitizeString(label);
    if (notes !== undefined) updateData.notes = sanitizeString(notes);

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
    console.error('Update customer error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if customer has transactions
    const transactionsCount = await db.transaction.count({
      where: { customerId: id },
    });

    if (transactionsCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Customer tidak dapat dihapus karena sudah memiliki transaksi' },
        { status: 400 }
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
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { id } = await params;

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
      return NextResponse.json(
        { success: false, error: 'Customer tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
