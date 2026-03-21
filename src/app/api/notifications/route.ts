import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET notifications for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    if (user.role === 'owner') {
      // Owner notifications - pending transactions, partner requests
      if (type === 'pending') {
        const pendingTransactions = await db.transaction.count({
          where: { status: 'pending' },
        });

        const verificationTransactions = await db.transaction.count({
          where: { status: 'verification' },
        });

        return NextResponse.json({
          success: true,
          data: {
            pendingTransactions,
            verificationTransactions,
            total: pendingTransactions + verificationTransactions,
          },
        });
      }

      // Get all partner notifications with pagination
      const whereClause: Record<string, unknown> = {
        notes: { not: null },
        partnerId: { not: null },
      };

      if (search) {
        whereClause.OR = [
          { orderId: { contains: search } },
          { partner: { name: { contains: search } } },
          { customer: { name: { contains: search } } },
        ];
      }

      const [notifications, total] = await Promise.all([
        db.transaction.findMany({
          where: whereClause,
          include: {
            partner: { select: { name: true } },
            customer: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.transaction.count({ where: whereClause }),
      ]);

      // Filter only those with timestamp pattern (actual notifications)
      const filteredNotifications = notifications.filter(tx => 
        tx.notes && tx.notes.includes('[') && tx.notes.includes(']')
      );

      return NextResponse.json({
        success: true,
        data: {
          notifications: filteredNotifications.map(tx => ({
            id: tx.id,
            orderId: tx.orderId,
            partnerName: tx.partner?.name,
            customerName: tx.customer?.name || 'Unknown',
            notes: tx.notes,
            nominal: tx.nominal,
            status: tx.status,
            updatedAt: tx.updatedAt,
            createdAt: tx.createdAt,
          })),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit,
          },
        },
      });
    } else {
      // Partner notifications - their transaction updates
      const partner = await db.partner.findFirst({
        where: { userId: user.id },
      });

      if (!partner) {
        return NextResponse.json(
          { success: false, error: 'Partner tidak ditemukan' },
          { status: 404 }
        );
      }

      const pendingCount = await db.transaction.count({
        where: {
          partnerId: partner.id,
          status: 'pending',
        },
      });

      const processingCount = await db.transaction.count({
        where: {
          partnerId: partner.id,
          status: 'process',
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          pending: pendingCount,
          processing: processingCount,
        },
      });
    }
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST - Create notification (for partner to notify owner)
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
    const { transactionId, message, type } = body;

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID diperlukan' },
        { status: 400 }
      );
    }

    // Verify the transaction belongs to this partner
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: { partner: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check authorization
    if (user.role === 'partner') {
      const partner = await db.partner.findFirst({
        where: { userId: user.id },
      });

      if (!partner || transaction.partnerId !== partner.id) {
        return NextResponse.json(
          { success: false, error: 'Tidak memiliki akses' },
          { status: 403 }
        );
      }
    }

    // In a real app, we would store this notification in a database
    // and push it to the owner via WebSocket or similar
    // For now, we'll just update the transaction notes

    const updatedTransaction = await db.transaction.update({
      where: { id: transactionId },
      data: {
        notes: transaction.notes 
          ? `${transaction.notes}\n[${new Date().toISOString()}] ${message}`
          : `[${new Date().toISOString()}] ${message}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Notifikasi berhasil dikirim ke Owner',
      data: updatedTransaction,
    });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
