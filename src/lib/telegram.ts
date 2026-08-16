/**
 * Telegram Notification Service
 * Helper functions for sending Telegram notifications
 *
 * Phase 3 — Integration Reliability:
 *   - All outbound Telegram HTTP calls use a timeout (default 5s) via
 *     AbortController. A hung Telegram API can never block the request thread
 *     indefinitely.
 *   - The bot token is NEVER logged. The chat ID is masked (last 4 digits)
 *     in any log output.
 *   - Telegram send failures are logged but NEVER roll back an already-
 *     committed database transaction. The caller is responsible for committing
 *     the DB transaction BEFORE calling these functions, and for recording a
 *     Notification row (status='failed') if the send fails, so that the
 *     message can be retried manually later.
 *   - No retry queue or new schema is introduced in Phase 3.
 */

import { logInfo, logWarn } from '@/lib/observability/logger';

interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  /** Optional caller-provided request ID for log correlation */
  requestId?: string | null;
}

interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    text: string;
  };
  description?: string;
  error_code?: number;
}

/** Default timeout for outbound Telegram API calls (5 seconds). */
const TELEGRAM_TIMEOUT_MS = 5000;

/**
 * Mask a chat ID for log output, keeping only the last 4 digits.
 * Example: '123456789' → '…6789'
 *
 * The full chat ID is NEVER written to logs.
 */
export function maskChatId(chatId: string | number): string {
  const s = String(chatId);
  if (s.length <= 4) return '…' + s;
  return '…' + s.slice(-4);
}

/**
 * Send a message to Telegram via Bot API.
 *
 * Phase 3 guarantees:
 *   - 5s timeout via AbortController (never hangs).
 *   - Success/failure logged with masked chat ID (token NEVER logged).
 *   - Returns a structured response; the caller decides what to do on failure.
 *     A failed Telegram send does NOT throw — it returns { ok: false } so the
 *     caller can continue without a try/catch around every call.
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: TelegramMessage
): Promise<TelegramResponse> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const maskedChat = maskChatId(chatId);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.text,
        parse_mode: message.parse_mode || 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    const data = (await response.json()) as TelegramResponse;
    const durationMs = Date.now() - startedAt;

    if (data.ok) {
      logInfo({
        event: 'telegram.send_success',
        requestId: message.requestId ?? null,
        route: 'telegram.sendMessage',
        durationMs,
        message: 'Telegram message sent',
        data: { chatId: maskedChat, messageId: data.result?.message_id },
      });
    } else {
      logWarn({
        event: 'telegram.send_failed',
        requestId: message.requestId ?? null,
        route: 'telegram.sendMessage',
        durationMs,
        errorCode: 'TELEGRAM_API_ERROR',
        message: 'Telegram API returned an error',
        data: {
          chatId: maskedChat,
          errorCode: data.error_code,
          description: data.description,
        },
      });
    }
    return data;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const isTimeout =
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('aborted'));
    logWarn({
      event: 'telegram.send_failed',
      requestId: message.requestId ?? null,
      route: 'telegram.sendMessage',
      durationMs,
      errorCode: isTimeout ? 'TELEGRAM_TIMEOUT' : 'TELEGRAM_NETWORK_ERROR',
      message: isTimeout
        ? 'Telegram send timed out'
        : 'Telegram network error',
      data: {
        chatId: maskedChat,
        error,
      },
    });
    return {
      ok: false,
      description: isTimeout
        ? 'Telegram request timed out'
        : error instanceof Error
          ? error.message
          : 'Failed to send message',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Test Telegram bot connection
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // First, get bot info
    const meUrl = `https://api.telegram.org/bot${botToken}/getMe`;
    const meResponse = await fetch(meUrl);
    const meData = await meResponse.json() as TelegramResponse & { result?: { username?: string; first_name?: string } };
    
    if (!meData.ok) {
      return {
        success: false,
        message: meData.description || 'Bot token tidak valid',
      };
    }

    // Try to send a test message
    const testMessage = `<b>🔔 Test Notifikasi</b>

✅ Koneksi Telegram berhasil!
📱 Bot: @${meData.result?.username || 'Unknown'}
⏰ Waktu: ${new Date().toLocaleString('id-ID')}

Notifikasi dari Black Bear akan dikirim ke chat ini.`;

    const sendResult = await sendTelegramMessage(botToken, chatId, {
      text: testMessage,
      parse_mode: 'HTML',
    });

    if (!sendResult.ok) {
      return {
        success: false,
        message: sendResult.description || 'Gagal mengirim pesan. Pastikan Chat ID benar dan bot sudah ditambahkan ke chat.',
      };
    }

    return {
      success: true,
      message: `Berhasil terhubung ke @${meData.result?.username || 'bot'}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menghubungi Telegram API',
    };
  }
}

/**
 * Format currency for Telegram message
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Send notification for new transaction
 */
export async function notifyNewTransaction(
  botToken: string,
  chatId: string,
  data: {
    orderId: string;
    customerName: string;
    nominal: number;
    paymentFee: number;
    paymentType: string;
    partnerName?: string;
  }
): Promise<boolean> {
  const message = `<b>💳 Transaksi Baru</b>

📦 Order ID: <code>${data.orderId}</code>
👤 Pelanggan: ${data.customerName}
💰 Nominal: ${formatCurrency(data.nominal)}
💸 Fee: ${formatCurrency(data.paymentFee)}
📋 Tipe: ${data.paymentType}
${data.partnerName ? `🤝 Partner: ${data.partnerName}` : ''}

⏰ ${new Date().toLocaleString('id-ID')}`;

  const result = await sendTelegramMessage(botToken, chatId, { text: message });
  return result.ok;
}

/**
 * Send notification for transaction status update
 */
export async function notifyTransactionStatus(
  botToken: string,
  chatId: string,
  data: {
    orderId: string;
    customerName: string;
    nominal: number;
    status: string;
    notes?: string;
  }
): Promise<boolean> {
  const statusEmoji: Record<string, string> = {
    pending: '⏳',
    verification: '🔍',
    process: '⚙️',
    success: '✅',
    failed: '❌',
  };

  const message = `<b>${statusEmoji[data.status] || '📝'} Update Transaksi</b>

📦 Order ID: <code>${data.orderId}</code>
👤 Pelanggan: ${data.customerName}
💰 Nominal: ${formatCurrency(data.nominal)}
📊 Status: <b>${data.status.toUpperCase()}</b>
${data.notes ? `📝 Catatan: ${data.notes}` : ''}

⏰ ${new Date().toLocaleString('id-ID')}`;

  const result = await sendTelegramMessage(botToken, chatId, { text: message });
  return result.ok;
}

/**
 * Send notification for new partner
 */
export async function notifyNewPartner(
  botToken: string,
  chatId: string,
  data: {
    name: string;
    email: string;
    phone: string;
    city: string;
    commission: number;
  }
): Promise<boolean> {
  const message = `<b>🤝 Partner Baru Bergabung</b>

👤 Nama: ${data.name}
📧 Email: ${data.email}
📱 Telepon: ${data.phone}
🏙️ Kota: ${data.city}
📊 Komisi: ${data.commission}%

⏰ ${new Date().toLocaleString('id-ID')}`;

  const result = await sendTelegramMessage(botToken, chatId, { text: message });
  return result.ok;
}

/**
 * Send notification for new customer
 */
export async function notifyNewCustomer(
  botToken: string,
  chatId: string,
  data: {
    name: string;
    phone: string;
    city?: string;
    label: string;
  }
): Promise<boolean> {
  const message = `<b>👤 Pelanggan Baru</b>

📝 Nama: ${data.name}
📱 Telepon: ${data.phone}
${data.city ? `🏙️ Kota: ${data.city}` : ''}
🏷️ Label: ${data.label}

⏰ ${new Date().toLocaleString('id-ID')}`;

  const result = await sendTelegramMessage(botToken, chatId, { text: message });
  return result.ok;
}

/**
 * Send daily report
 */
export async function sendDailyReport(
  botToken: string,
  chatId: string,
  data: {
    totalTransactions: number;
    totalVolume: number;
    totalProfit: number;
    newCustomers: number;
    pendingTransactions: number;
  }
): Promise<boolean> {
  const message = `<b>📊 Laporan Harian</b>

📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}

<ins>Ringkasan Transaksi:</ins>
📈 Total Transaksi: ${data.totalTransactions}
💰 Total Volume: ${formatCurrency(data.totalVolume)}
💵 Profit: ${formatCurrency(data.totalProfit)}

<ins>Info Lainnya:</uns>
👤 Pelanggan Baru: ${data.newCustomers}
⏳ Pending: ${data.pendingTransactions}

⏰ ${new Date().toLocaleString('id-ID')}`;

  const result = await sendTelegramMessage(botToken, chatId, { text: message });
  return result.ok;
}

/**
 * Send generic notification to Telegram
 */
export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  data: {
    type: string;
    title: string;
    message: string;
    additionalData?: Record<string, unknown>;
  }
): Promise<boolean> {
  const typeEmojis: Record<string, string> = {
    new_partner: '🤝',
    new_order: '💳',
    transaction_update: '📝',
    partner_notification: '💬',
    broadcast: '📢',
    new_customer: '👤',
    daily_report: '📊',
  };

  const emoji = typeEmojis[data.type] || '🔔';
  
  let telegramMessage = `<b>${emoji} ${data.title}</b>\n\n${data.message}`;
  
  if (data.additionalData) {
    telegramMessage += '\n\n<ins>Detail:</ins>';
    for (const [key, value] of Object.entries(data.additionalData)) {
      if (value !== undefined && value !== null) {
        telegramMessage += `\n${key}: ${value}`;
      }
    }
  }
  
  telegramMessage += `\n\n⏰ ${new Date().toLocaleString('id-ID')}`;

  const result = await sendTelegramMessage(botToken, chatId, { text: telegramMessage });
  return result.ok;
}


