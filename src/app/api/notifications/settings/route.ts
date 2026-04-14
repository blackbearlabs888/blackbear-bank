import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET notification settings
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    // Get owner profile
    const ownerProfile = await db.ownerProfile.findFirst();

    if (!ownerProfile) {
      return NextResponse.json(
        { success: false, error: 'Profil owner tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get or create notification settings
    let settings = await db.notificationSettings.findUnique({
      where: { ownerProfileId: ownerProfile.id },
    });

    if (!settings) {
      // Create default settings
      settings = await db.notificationSettings.create({
        data: {
          ownerProfileId: ownerProfile.id,
          telegramEnabled: false,
          notifyNewTransaction: true,
          notifyTransactionStatus: true,
          notifyNewPartner: true,
          notifyNewCustomer: false,
          notifyDailyReport: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: settings.id,
        telegramBotToken: settings.telegramBotToken ? '••••••••' + settings.telegramBotToken.slice(-4) : '',
        telegramChatId: settings.telegramChatId,
        telegramEnabled: settings.telegramEnabled,
        notifyNewTransaction: settings.notifyNewTransaction,
        notifyTransactionStatus: settings.notifyTransactionStatus,
        notifyNewPartner: settings.notifyNewPartner,
        notifyNewCustomer: settings.notifyNewCustomer,
        notifyDailyReport: settings.notifyDailyReport,
        hasBotToken: !!settings.telegramBotToken,
      },
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PATCH - Update notification settings
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    // Get owner profile
    const ownerProfile = await db.ownerProfile.findFirst();

    if (!ownerProfile) {
      return NextResponse.json(
        { success: false, error: 'Profil owner tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      telegramBotToken,
      telegramChatId,
      telegramEnabled,
      notifyNewTransaction,
      notifyTransactionStatus,
      notifyNewPartner,
      notifyNewCustomer,
      notifyDailyReport,
    } = body;

    // Prepare update data
    const updateData: {
      telegramBotToken?: string | null;
      telegramChatId?: string | null;
      telegramEnabled?: boolean;
      notifyNewTransaction?: boolean;
      notifyTransactionStatus?: boolean;
      notifyNewPartner?: boolean;
      notifyNewCustomer?: boolean;
      notifyDailyReport?: boolean;
    } = {};

    // Only update token if it's a new value (not masked)
    if (telegramBotToken !== undefined && !telegramBotToken.startsWith('••••••••')) {
      updateData.telegramBotToken = telegramBotToken || null;
    }

    if (telegramChatId !== undefined) {
      updateData.telegramChatId = telegramChatId || null;
    }

    if (telegramEnabled !== undefined) {
      updateData.telegramEnabled = telegramEnabled;
    }

    if (notifyNewTransaction !== undefined) {
      updateData.notifyNewTransaction = notifyNewTransaction;
    }

    if (notifyTransactionStatus !== undefined) {
      updateData.notifyTransactionStatus = notifyTransactionStatus;
    }

    if (notifyNewPartner !== undefined) {
      updateData.notifyNewPartner = notifyNewPartner;
    }

    if (notifyNewCustomer !== undefined) {
      updateData.notifyNewCustomer = notifyNewCustomer;
    }

    if (notifyDailyReport !== undefined) {
      updateData.notifyDailyReport = notifyDailyReport;
    }

    // Use upsert to handle both create and update
    const settings = await db.notificationSettings.upsert({
      where: { ownerProfileId: ownerProfile.id },
      update: updateData,
      create: {
        ownerProfileId: ownerProfile.id,
        telegramBotToken: updateData.telegramBotToken || null,
        telegramChatId: updateData.telegramChatId || null,
        telegramEnabled: updateData.telegramEnabled ?? false,
        notifyNewTransaction: updateData.notifyNewTransaction ?? true,
        notifyTransactionStatus: updateData.notifyTransactionStatus ?? true,
        notifyNewPartner: updateData.notifyNewPartner ?? true,
        notifyNewCustomer: updateData.notifyNewCustomer ?? false,
        notifyDailyReport: updateData.notifyDailyReport ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan notifikasi berhasil disimpan',
      data: {
        id: settings.id,
        telegramBotToken: settings.telegramBotToken ? '••••••••' + settings.telegramBotToken.slice(-4) : '',
        telegramChatId: settings.telegramChatId,
        telegramEnabled: settings.telegramEnabled,
        notifyNewTransaction: settings.notifyNewTransaction,
        notifyTransactionStatus: settings.notifyTransactionStatus,
        notifyNewPartner: settings.notifyNewPartner,
        notifyNewCustomer: settings.notifyNewCustomer,
        notifyDailyReport: settings.notifyDailyReport,
        hasBotToken: !!settings.telegramBotToken,
      },
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
