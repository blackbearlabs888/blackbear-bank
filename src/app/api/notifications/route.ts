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
      // Handle different request types
      if (type === 'pending') {
        // Get pending and verification transaction counts
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

      if (type === 'messages') {
        // Get partner messages (transactions with notes from partners)
        const messages = await db.transaction.findMany({
          where: {
            notes: { not: null },
            partnerId: { not: null },
          },
          include: {
            partner: { select: { name: true } },
            customer: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        });

        // Filter only those with timestamp pattern (actual notifications)
        const filteredMessages = messages.filter(tx => 
          tx.notes && tx.notes.includes('[') && tx.notes.includes(']')
        );

        return NextResponse.json({
          success: true,
          data: {
            messages: filteredMessages.map(tx => ({
              id: tx.id,
              orderId: tx.orderId,
              partnerName: tx.partner?.name,
              customerName: tx.customer?.name || 'Unknown',
              notes: tx.notes,
              nominal: tx.nominal,
              status: tx.status,
              updatedAt: tx.updatedAt,
            })),
          },
        });
      }

      // Get new style notifications from Notification table
      const whereClause: Record<string, unknown> = {
        targetType: 'owner',
      };

      if (search) {
        whereClause.OR = [
          { title: { contains: search } },
          { message: { contains: search } },
        ];
      }

      const [notifications, total] = await Promise.all([
        db.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.notification.count({ where: whereClause }),
      ]);

      // Get unread count
      const unreadCount = await db.notification.count({
        where: {
          targetType: 'owner',
          isRead: false,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          notifications: notifications.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            data: n.data ? JSON.parse(n.data) : null,
            isRead: n.isRead,
            partnerId: n.partnerId,
            transactionId: n.transactionId,
            createdAt: n.createdAt,
            readAt: n.readAt,
          })),
          unreadCount,
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

      // Get partner-specific notifications
      const whereClause: Record<string, unknown> = {
        OR: [
          { targetType: 'all' },
          { targetType: 'partner', targetUserId: user.id },
          { partnerId: partner.id },
        ],
      };

      const [notifications, total] = await Promise.all([
        db.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.notification.count({ where: whereClause }),
      ]);

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
          notifications: notifications.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            data: n.data ? JSON.parse(n.data) : null,
            isRead: n.isRead,
            createdAt: n.createdAt,
          })),
          pending: pendingCount,
          processing: processingCount,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit,
          },
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

// POST - Create notification
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
    const { type, title, message, data, targetType, targetUserId, partnerId, transactionId } = body;

    if (!type || !message) {
      return NextResponse.json(
        { success: false, error: 'Type dan message diperlukan' },
        { status: 400 }
      );
    }

    // Get partner info if user is a partner
    let partnerData = null;
    if (user.role === 'partner') {
      partnerData = await db.partner.findFirst({
        where: { userId: user.id },
        select: { id: true, name: true },
      });
    }

    // Auto-generate title for partner_notification type
    let finalTitle = title;
    let finalPartnerId = partnerId;
    let transactionData = null;

    if (type === 'partner_notification') {
      // Get transaction info
      if (transactionId) {
        transactionData = await db.transaction.findUnique({
          where: { id: transactionId },
          select: { 
            orderId: true, 
            nominal: true,
            customer: { select: { name: true } },
          },
        });
      }

      if (!title) {
        finalTitle = `Pesan dari ${partnerData?.name || 'Partner'}`;
      }

      // Set partnerId from current user if partner
      if (partnerData && !partnerId) {
        finalPartnerId = partnerData.id;
      }
    }

    // For partner notifications, also update the transaction notes
    if (type === 'partner_notification' && transactionId && message) {
      const timestamp = new Date().toLocaleString('id-ID');
      const noteWithTimestamp = `[${timestamp}] ${partnerData?.name || 'Partner'}: ${message}`;
      
      // Get current transaction notes
      const currentTx = await db.transaction.findUnique({
        where: { id: transactionId },
        select: { notes: true },
      });

      // Append new note to existing notes
      const updatedNotes = currentTx?.notes 
        ? `${currentTx.notes}\n${noteWithTimestamp}`
        : noteWithTimestamp;

      await db.transaction.update({
        where: { id: transactionId },
        data: { notes: updatedNotes },
      });
    }

    const notification = await db.notification.create({
      data: {
        type,
        title: finalTitle || `${type}`,
        message,
        data: data ? JSON.stringify(data) : transactionData ? JSON.stringify({
          orderId: transactionData.orderId,
          customerName: transactionData.customer?.name,
          nominal: transactionData.nominal,
        }) : null,
        targetType: targetType || 'owner',
        targetUserId,
        partnerId: finalPartnerId,
        transactionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Notifikasi berhasil dibuat',
      data: notification,
    });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PATCH - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      // Mark all notifications as read for this user
      if (user.role === 'owner') {
        await db.notification.updateMany({
          where: {
            targetType: 'owner',
            isRead: false,
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
      } else {
        const partner = await db.partner.findFirst({
          where: { userId: user.id },
        });

        if (partner) {
          await db.notification.updateMany({
            where: {
              OR: [
                { targetType: 'all' },
                { targetType: 'partner', targetUserId: user.id },
                { partnerId: partner.id },
              ],
              isRead: false,
            },
            data: {
              isRead: true,
              readAt: new Date(),
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Semua notifikasi ditandai sudah dibaca',
      });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID notifikasi diperlukan' },
        { status: 400 }
      );
    }

    const notification = await db.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Notifikasi ditandai sudah dibaca',
      data: notification,
    });
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
