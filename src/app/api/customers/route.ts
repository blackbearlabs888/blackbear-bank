import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';

// GET customers with pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const label = searchParams.get('label');
    const all = searchParams.get('all'); // If 'true', search all customers regardless of partner
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let where: Record<string, unknown> = {};

    // For partners: show customers they have transactions with OR customers they created
    if (all !== 'true' && user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });
      
      if (partner) {
        // Get customer IDs from transactions where this partner is involved
        const partnerTransactions = await db.transaction.findMany({
          where: { partnerId: partner.id },
          select: { customerId: true },
          distinct: ['customerId'],
        });
        const customerIdsFromTransactions = partnerTransactions.map(t => t.customerId);
        
        // Show customers: created by partner OR have transactions with partner
        where.OR = [
          { partnerId: partner.id },
          { id: { in: customerIdsFromTransactions } },
        ];
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (label) {
      where.label = label;
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
            }
          },
          _count: {
            select: {
              transactions: true,
            }
          }
        }
      }),
      db.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST create customer
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone, bankName, bankAccount, bankHolder, city, label } = body;

    // Validation
    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Nama dan No. WA wajib diisi' },
        { status: 400 }
      );
    }

    // Check if customer exists
    let customer = await db.customer.findFirst({
      where: { phone },
    });

    if (customer) {
      return NextResponse.json({
        success: true,
        data: customer,
        message: 'Customer sudah ada',
      });
    }

    // Get partner ID if user is partner
    let partnerId = null;
    let addedBy = 'owner'; // default
    
    if (user.role === 'partner') {
      const partner = await db.partner.findUnique({
        where: { userId: user.id },
      });
      partnerId = partner?.id;
      addedBy = 'partner';
    }

    // Create customer
    customer = await db.customer.create({
      data: {
        name,
        phone,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        bankHolder: bankHolder || null,
        city: city || null,
        label: label || 'New',
        partnerId,
        addedBy,
      },
    });

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer berhasil dibuat',
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
