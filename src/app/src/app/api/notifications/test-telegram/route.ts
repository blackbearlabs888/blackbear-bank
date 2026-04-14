import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { testTelegramConnection } from '@/lib/telegram';

// POST - Test Telegram connection
export async function POST(request: NextRequest) {
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

    // Get notification settings
    const settings = await db.notificationSettings.findUnique({
      where: { ownerProfileId: ownerProfile.id },
    });

    if (!settings || !settings.telegramBotToken || !settings.telegramChatId) {
      return NextResponse.json(
        { success: false, error: 'Bot Token dan Chat ID harus diisi terlebih dahulu' },
        { status: 400 }
      );
    }

    // Test connection
    const result = await testTelegramConnection(
      settings.telegramBotToken,
      settings.telegramChatId
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Test Telegram error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
