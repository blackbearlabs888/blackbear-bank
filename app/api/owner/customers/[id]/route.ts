import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH - Update customer (change label, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { label, name, phone, bankName, bankAccount, bankHolder, city } = body;

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

    // Update customer
    const updatedCustomer = await db.customer.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(bankName !== undefined && { bankName }),
        ...(bankAccount !== undefined && { bankAccount }),
        ...(bankHolder !== undefined && { bankHolder }),
        ...(city !== undefined && { city }),
      },
      include: {
        partner: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: label === 'Blacklist' 
        ? 'Customer berhasil di-blacklist' 
        : 'Customer berhasil diupdate',
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE - Delete customer permanently
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if customer has transactions
    if (existingCustomer._count.transactions > 0) {
      // Don't delete, just blacklist instead
      const blacklistedCustomer = await db.customer.update({
        where: { id },
        data: { label: 'Blacklist' },
      });

      return NextResponse.json({
        success: true,
        data: blacklistedCustomer,
        message: 'Customer memiliki transaksi, status diubah ke Blacklist',
      });
    }

    // Delete customer if no transactions
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

// GET - Get single customer details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        partner: {
          select: { id: true, name: true, email: true, phone: true, city: true },
        },
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            partner: { select: { name: true } },
          },
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
