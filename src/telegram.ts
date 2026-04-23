/**
 * Telegram Notification Service
 * Helper functions for sending Telegram notifications
 */

interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
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

/**
 * Send a message to Telegram via Bot API
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: TelegramMessage
): Promise<TelegramResponse> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
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
    });

    const data = await response.json() as TelegramResponse;
    return data;
  } catch (error) {
    console.error('Telegram API error:', error);
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Failed to send message',
    };
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


