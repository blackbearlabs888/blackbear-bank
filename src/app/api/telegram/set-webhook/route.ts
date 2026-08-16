import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Set or remove Telegram webhook
 * POST: Set webhook to current domain
 * DELETE: Remove webhook
 * GET: Get current webhook info
 *
 * SECURITY: All three verbs are OWNER ONLY.
 * The public Telegram webhook receiver at /api/telegram/webhook remains open
 * for Telegram-originated requests (verified by chatId allowlist inside).
 */

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

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

    // Read the webhook secret from env (NEVER from DB, NEVER logged).
    // When provided, Telegram will include it in the
    // X-Telegram-Bot-Api-Secret-Token header of every webhook request so the
    // receiver can verify authenticity (see /api/telegram/webhook/route.ts).
    //
    // FAIL-CLOSED: in production, refuse to register a webhook without a
    // secret — otherwise the webhook receiver would reject every Telegram
    // update (see verifyTelegramSecret). In non-production, allow it only if
    // the explicit dev-insecure flag is set (matches the receiver policy).
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';
    const allowInsecureDev = process.env.TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV === 'true';

    if (!secretToken) {
      if (isProduction) {
        return NextResponse.json({
          success: false,
          error: 'TELEGRAM_WEBHOOK_SECRET belum dikonfigurasi. Webhook tidak akan menerima update tanpa secret di production.',
        }, { status: 503 });
      }
      if (!allowInsecureDev) {
        return NextResponse.json({
          success: false,
          error: 'TELEGRAM_WEBHOOK_SECRET belum dikonfigurasi. Set secret, atau aktifkan TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true untuk development.',
        }, { status: 503 });
      }
    }

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
          ...(secretToken ? { secret_token: secretToken } : {}),
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
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

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
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

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
