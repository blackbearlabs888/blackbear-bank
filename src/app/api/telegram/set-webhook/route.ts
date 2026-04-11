import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Set or remove Telegram webhook
 * POST: Set webhook to current domain
 * DELETE: Remove webhook
 * GET: Get current webhook info
 */

export async function POST(request: NextRequest) {
  try {
    const settings = await db.notificationSettings.findFirst();
    const botToken = settings?.telegramBotToken;

    if (!botToken || botToken.startsWith('••••')) {
      return NextResponse.json({
        success: false,
        error: 'Bot token belum diatur. Simpan pengaturan Telegram terlebih dahulu.',
      });
    }

    // Get the domain from the request or use default
    const headers = request.headers;
    const protocol = headers.get('x-forwarded-proto') || 'https';
    const host = headers.get('host') || 'localhost:3000';
    const domain = `${protocol}://${host}`;

    const webhookUrl = `${domain}/api/telegram/webhook`;

    // Set webhook on Telegram
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true,
        }),
      }
    );

    const result = await telegramRes.json();

    if (!result.ok) {
      return NextResponse.json({
        success: false,
        error: result.description || 'Gagal set webhook ke Telegram',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Webhook berhasil diset!`,
      data: {
        webhookUrl: result.result?.url,
        hasCustomCertificate: result.result?.has_custom_certificate,
        pendingUpdateCount: result.result?.pending_update_count,
        lastErrorDate: result.result?.last_error_date,
        lastErrorMessage: result.result?.last_error_message,
      },
    });
  } catch (error) {
    console.error('[Set Webhook] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Gagal menghubungi Telegram API',
    });
  }
}

export async function DELETE() {
  try {
    const settings = await db.notificationSettings.findFirst();
    const botToken = settings?.telegramBotToken;

    if (!botToken || botToken.startsWith('••••')) {
      return NextResponse.json({
        success: false,
        error: 'Bot token belum diatur.',
      });
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/deleteWebhook`,
      { method: 'POST' }
    );
    const result = await telegramRes.json();

    if (!result.ok) {
      return NextResponse.json({
        success: false,
        error: result.description || 'Gagal menghapus webhook',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook berhasil dihapus.',
    });
  } catch (error) {
    console.error('[Delete Webhook] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Gagal menghubungi Telegram API',
    });
  }
}

export async function GET() {
  try {
    const settings = await db.notificationSettings.findFirst();
    const botToken = settings?.telegramBotToken;

    if (!botToken || botToken.startsWith('••••')) {
      return NextResponse.json({
        success: false,
        error: 'Bot token belum diatur.',
      });
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );
    const result = await telegramRes.json();

    if (!result.ok) {
      return NextResponse.json({
        success: false,
        error: result.description || 'Gagal mendapatkan info webhook',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        url: result.result?.url || null,
        hasCustomCertificate: result.result?.has_custom_certificate,
        pendingUpdateCount: result.result?.pending_update_count || 0,
        lastErrorDate: result.result?.last_error_date,
        lastErrorMessage: result.result?.last_error_message,
        maxConnections: result.result?.max_connections,
        ipAddress: result.result?.ip_address,
      },
    });
  } catch (error) {
    console.error('[Get Webhook Info] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Gagal menghubungi Telegram API',
    });
  }
}
