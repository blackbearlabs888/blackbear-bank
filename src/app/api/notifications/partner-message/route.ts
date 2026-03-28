import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, toNumber } from '@/lib/db';
import { sendTelegramNotification, formatCurrency } from '@/lib/telegram';

// POST - Send message from partner to owner about a transaction
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Only partners can send messages
    if (user.role !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'Hanya partner yang dapat mengirim pesan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { transactionId, message } = body;

    if (!transactionId || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID dan pesan harus diisi' },
        { status: 400 }
      );
    }

    // Get partner info
    const partner = await db.partner.findUnique({
      where: { userId: user.id },
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get transaction and verify it belongs to this partner
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        partner: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    if (transaction.partnerId !== partner.id) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses ke transaksi ini' },
        { status: 403 }
      );
    }

    // Get owner profile
    const ownerProfile = await db.ownerProfile.findFirst();

    if (!ownerProfile) {
      return NextResponse.json(
        { success: false, error: 'Owner tidak ditemukan' },
        { status: 404 }
      );
    }

    // Create notification for owner
    await db.notification.create({
      data: {
        type: 'partner_message',
        title: `Pesan dari ${partner.name}`,
        message: `${transaction.orderId}: ${message.trim()}`,
        data: JSON.stringify({
          orderId: transaction.orderId,
          transactionId: transaction.id,
          partnerId: partner.id,
          partnerName: partner.name,
          message: message.trim(),
          customerName: transaction.customer?.name,
          nominal: toNumber(transaction.nominal),
        }),
        targetType: 'owner',
        transactionId: transaction.id,
        partnerId: partner.id,
      },
    });

    // Send Telegram notification if enabled
    const notifSettings = await db.notificationSettings.findUnique({
      where: { ownerProfileId: ownerProfile.id },
    });

    if (notifSettings?.telegramEnabled && notifSettings.telegramBotToken && notifSettings.telegramChatId && notifSettings.notifyTransactionStatus) {
      await sendTelegramNotification(
        notifSettings.telegramBotToken,
        notifSettings.telegramChatId,
        {
          type: 'partner_message',
          title: `💬 Pesan dari Partner`,
          message: `Order ID: ${transaction.orderId}`,
          additionalData: {
            'Partner': partner.name,
            'Pelanggan': transaction.customer?.name || '-',
            'Nominal': formatCurrency(toNumber(transaction.nominal)),
            'Pesan': message.trim(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pesan berhasil dikirim ke Owner',
    });
  } catch (error) {
    console.error('Send partner message error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
