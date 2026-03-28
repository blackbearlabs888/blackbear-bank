import { NextRequest, NextResponse } from 'next/server';
import { db, toNumber } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

// ==================== TYPES ====================

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
  reply_to_message?: TelegramMessage;
  date: number;
}

interface TelegramCallbackQuery {
  id: string;
  from: { id: number; first_name?: string };
  message: TelegramMessage;
  data: string;
}

// ==================== HELPERS ====================

/** Get notification settings from DB */
async function getSettings() {
  return db.notificationSettings.findFirst();
}

/** Get bot token (unmasked) */
async function getBotToken(): Promise<string | null> {
  const settings = await getSettings();
  return settings?.telegramBotToken || null;
}

/** Get chat ID */
async function getChatId(): Promise<string | null> {
  const settings = await getSettings();
  return settings?.telegramChatId || null;
}

/** Check if the message is from the authorized chat */
function isAuthorized(chatId: number | undefined, allowedChatId: string): boolean {
  if (!chatId) return false;
  return String(chatId) === allowedChatId;
}

/** Send reply to a chat */
async function reply(chatId: number, text: string, replyToMessageId?: number, parseMode: string = 'HTML') {
  const token = await getBotToken();
  if (!token) return;
  await sendTelegramMessage(token, String(chatId), { text, parse_mode: parseMode as 'HTML' });
}

/** Send reply with keyboard buttons */
async function replyWithKeyboard(
  chatId: number,
  text: string,
  keyboard: Array<Array<{ text: string; callback_data: string }>>,
  replyToMessageId?: number,
) {
  const token = await getBotToken();
  if (!token) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }),
  });
}

/** Format currency for Telegram */
function fmtCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_LIST = ['pending', 'verification', 'process', 'success', 'failed'];
const STATUS_EMOJI: Record<string, string> = {
  pending: '⏳', verification: '🔍', process: '⚙️', success: '✅', failed: '❌',
};

// ==================== COMMAND HANDLERS ====================

/** Extract order ID from a message (supports /command ORDER_ID format and <code>ORDER_ID</code> in forwarded messages) */
function extractOrderId(text: string): string | null {
  if (!text) return null;

  // Match /command <ORDER_ID>
  const cmdMatch = text.match(/^\/\w+\s+([A-Z0-9\-]+)/i);
  if (cmdMatch) return cmdMatch[1];

  // Match <code>ORDER_ID</code> from forwarded messages
  const codeMatch = text.match(/<code>([A-Z0-9\-]+)<\/code>/i);
  if (codeMatch) return codeMatch[1];

  // Match plain ORDER_ID (uppercase with dashes)
  const plainMatch = text.match(/\b([A-Z]{2,5}-\d{4,}[A-Z0-9\-]*)\b/);
  if (plainMatch) return plainMatch[1];

  return null;
}

/** Handle /start command */
async function handleStart(chatId: number) {
  await reply(chatId,
    `🐻 <b>Black Bear Bot</b>\n\n` +
    `Bot ini terhubung ke sistem Black Bear untuk mengelola transaksi gestun.\n\n` +
    `<b>📋 Commands:</b>\n` +
    `/info &lt;order_id&gt; — Lihat detail transaksi\n` +
    `/status &lt;order_id&gt; &lt;status&gt; — Ubah status transaksi\n` +
    `/nominal &lt;order_id&gt; &lt;amount&gt; — Ubah nominal\n` +
    `/mp &lt;order_id&gt; &lt;marketplace&gt; — Ubah marketplace\n` +
    `/catatan &lt;order_id&gt; &lt;text&gt; — Tambah catatan\n` +
    `/link &lt;order_id&gt; &lt;url&gt; — Set link order\n` +
    `/help — Tampilkan panduan\n\n` +
    `<b>💡 Tips:</b> Reply pesan notifikasi dari bot ini dengan command untuk langsung update transaksi tersebut.`
  );
}

/** Handle /help command */
async function handleHelp(chatId: number) {
  await reply(chatId,
    `📖 <b>Panduan Black Bear Bot</b>\n\n` +
    `<b>/info ORDER_ID</b>\nDetail lengkap transaksi\n\n` +
    `<b>/status ORDER_ID STATUS</b>\nUbah status (pending/verification/process/success/failed)\n\n` +
    `<b>/nominal ORDER_ID 2500000</b>\nUbah nominal transaksi\n\n` +
    `<b>/mp ORDER_ID marketplace</b>\nUbah marketplace (ketik "clear" untuk hapus)\n\n` +
    `<b>/catatan ORDER_ID text catatan</b>\nTambah/update catatan\n\n` +
    `<b>/link ORDER_ID https://...</b>\nSet link transaksi\n\n` +
    `<b>💡 Reply notifikasi:</b>\nBalas pesan notifikasi dari bot dengan:\n` +
    `• <code>status success</code>\n` +
    `• <code>nominal 3000000</code>\n` +
    `• <code>catatan sudah dibayar lunas</code>\n` +
    `• <code>link https://shopee.co.id/...</code>`
  );
}

/** Handle /info command - show transaction details */
async function handleInfo(chatId: number, orderId: string) {
  const tx = await db.transaction.findUnique({
    where: { orderId },
    include: {
      customer: true,
      partner: true,
      paymentType: true,
      marketplace: true,
    },
  });

  if (!tx) {
    await reply(chatId, `❌ Transaksi <code>${orderId}</code> tidak ditemukan.`);
    return;
  }

  const statusEmoji = STATUS_EMOJI[tx.status] || '📋';
  const message =
    `${statusEmoji} <b>Detail Transaksi</b>\n\n` +
    `📦 Order: <code>${tx.orderId}</code>\n` +
    `👤 Pelanggan: ${tx.customer.name}\n` +
    `💰 Nominal: <b>${fmtCurrency(toNumber(tx.nominal))}</b>\n` +
    `💸 Fee: ${fmtCurrency(toNumber(tx.paymentFee))}\n` +
    `📊 Status: <b>${tx.status.toUpperCase()}</b>\n` +
    `💳 Tipe: ${tx.paymentType.name}\n` +
    `📋 Metode: ${tx.methodTransaction}\n` +
    (tx.marketplace ? `🏪 Marketplace: ${tx.marketplace.name}\n` : '') +
    (tx.partner ? `🤝 Partner: ${tx.partner.name}\n` : '') +
    (tx.transactionLink ? `🔗 Link: ${tx.transactionLink}\n` : '') +
    (tx.notes ? `📝 Catatan: ${tx.notes}\n` : '') +
    `\n💵 Owner Profit: ${fmtCurrency(toNumber(tx.ownerProfit))}\n` +
    `📅 Dibuat: ${tx.createdAt.toLocaleString('id-ID')}`;

  const keyboard = [
    [
      { text: '⏳ Pending', callback_data: `status:${tx.orderId}:pending` },
      { text: '🔍 Verifikasi', callback_data: `status:${tx.orderId}:verification` },
    ],
    [
      { text: '⚙️ Proses', callback_data: `status:${tx.orderId}:process` },
      { text: '✅ Success', callback_data: `status:${tx.orderId}:success` },
    ],
    [{ text: '❌ Failed', callback_data: `status:${tx.orderId}:failed` }],
  ];

  await replyWithKeyboard(chatId, message, keyboard);
}

/** Handle /status command */
async function handleStatus(chatId: number, orderId: string, newStatus: string) {
  const status = newStatus.toLowerCase();
  if (!STATUS_LIST.includes(status)) {
    await reply(chatId, `❌ Status tidak valid. Gunakan: <code>pending</code>, <code>verification</code>, <code>process</code>, <code>success</code>, <code>failed</code>`);
    return;
  }

  const tx = await db.transaction.findUnique({ where: { orderId } });
  if (!tx) {
    await reply(chatId, `❌ Transaksi <code>${orderId}</code> tidak ditemukan.`);
    return;
  }

  const oldStatus = tx.status;
  if (oldStatus === status) {
    await reply(chatId, `ℹ️ Transaksi <code>${orderId}</code> sudah dalam status <b>${status.toUpperCase()}</b>.`);
    return;
  }

  await db.transaction.update({
    where: { orderId },
    data: { status },
  });

  await reply(chatId,
    `✅ Status transaksi diupdate!\n\n` +
    `📦 <code>${orderId}</code>\n` +
    `${STATUS_EMOJI[oldStatus]} ${oldStatus.toUpperCase()} → ${STATUS_EMOJI[status]} <b>${status.toUpperCase()}</b>`
  );
}

/** Handle /nominal command */
async function handleNominal(chatId: number, orderId: string, amountStr: string) {
  const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
  if (isNaN(amount) || amount <= 0) {
    await reply(chatId, `❌ Nominal tidak valid. Contoh: <code>/nominal ${orderId} 2500000</code>`);
    return;
  }

  const tx = await db.transaction.findUnique({
    where: { orderId },
    include: { paymentType: true, marketplace: true },
  });

  if (!tx) {
    await reply(chatId, `❌ Transaksi <code>${orderId}</code> tidak ditemukan.`);
    return;
  }

  const oldNominal = toNumber(tx.nominal);

  // Recalculate fees based on new nominal
  const pt = tx.paymentType;
  const method = tx.methodTransaction || 'Online';
  const isOnline = method === 'Online';

  const feePercent = isOnline ? toNumber(pt.onlineFeePercent) : toNumber(pt.codFeePercent);
  const feeFlat = isOnline ? toNumber(pt.onlineFeeFlat) : toNumber(pt.codFeeFlat);
  const threshold = toNumber(pt.threshold);

  const fee = amount > threshold ? amount * (feePercent / 100) : feeFlat;
  const mpFee = tx.marketplaceId ? amount * (toNumber(tx.marketplace?.feePercent || 0) / 100) + toNumber(tx.marketplace?.feeFlat || 0) : 0;
  const netMargin = fee - mpFee;

  // Keep existing profit ratios
  const profitRatio = oldNominal > 0 ? toNumber(tx.ownerProfit) / oldNominal : 0;
  const partnerRatio = oldNominal > 0 ? toNumber(tx.partnerProfit) / oldNominal : 0;
  const newOwnerProfit = Math.round(amount * profitRatio);
  const newPartnerProfit = Math.round(amount * partnerRatio);

  await db.transaction.update({
    where: { orderId },
    data: {
      nominal: amount,
      paymentFee: fee,
      platformFee: mpFee,
      netMargin,
      totalReceived: amount - fee,
      ownerProfit: newOwnerProfit,
      partnerProfit: newPartnerProfit,
    },
  });

  await reply(chatId,
    `✅ Nominal transaksi diupdate!\n\n` +
    `📦 <code>${orderId}</code>\n` +
    `💰 ${fmtCurrency(oldNominal)} → <b>${fmtCurrency(amount)}</b>\n` +
    `💸 Fee: ${fmtCurrency(fee)}`
  );
}

/** Handle /catatan command */
async function handleCatatan(chatId: number, orderId: string, notesText: string) {
  if (!notesText.trim()) {
    await reply(chatId, `❌ Catatan tidak boleh kosong. Contoh: <code>/catatan ${orderId} sudah dibayar</code>`);
    return;
  }

  const tx = await db.transaction.findUnique({ where: { orderId } });
  if (!tx) {
    await reply(chatId, `❌ Transaksi <code>${orderId}</code> tidak ditemukan.`);
    return;
  }

  await db.transaction.update({
    where: { orderId },
    data: { notes: notesText.trim() },
  });

  await reply(chatId,
    `✅ Catatan transaksi diupdate!\n\n` +
    `📦 <code>${orderId}</code>\n` +
    `📝 ${notesText.trim()}`
  );
}

/** Handle /link command */
async function handleLink(chatId: number, orderId: string, link: string) {
  if (!link.trim() || !link.trim().startsWith('http')) {
    await reply(chatId, `❌ Link tidak valid. Contoh: <code>/link ${orderId} https://shopee.co.id/...</code>`);
    return;
  }

  const tx = await db.transaction.findUnique({ where: { orderId } });
  if (!tx) {
    await reply(chatId, `❌ Transaksi <code>${orderId}</code> tidak ditemukan.`);
    return;
  }

  await db.transaction.update({
    where: { orderId },
    data: { transactionLink: link.trim() },
  });

  await reply(chatId,
    `✅ Link transaksi diupdate!\n\n` +
    `📦 <code>${orderId}</code>\n` +
    `🔗 <a href="${link.trim()}">Buka Link</a>`
  );
}

/** Handle /mp command - set or clear marketplace */
async function handleMarketplace(chatId: number, orderId: string, mpName: string) {
  const trimmed = mpName.trim().toLowerCase();

  // Clear marketplace
  if (trimmed === 'clear' || trimmed === 'hapus' || trimmed === 'none' || trimmed === 'null') {
    const tx = await db.transaction.findUnique({
      where: { orderId },
      include: { paymentType: true, partner: true, marketplace: true },
    });
    if (!tx) {
      await reply(chatId, `❌ Transaksi <code>${orderId}</code> tidak ditemukan.`);
      return;
    }
    if (!tx.marketplaceId) {
      await reply(chatId, `ℹ️ Transaksi ini sudah tanpa marketplace.`);
      return;
    }

    const netMargin = toNumber(tx.paymentFee);
    const partnerRate = tx.partner ? toNumber(tx.partner.commission) : 0;
    const partnerProfit = netMargin * (partnerRate / 100);
    const ownerProfit = netMargin - partnerProfit;

    await db.transaction.update({
      where: { orderId },
      data: { marketplaceId: null, platformFee: 0, netMargin, partnerProfit, ownerProfit },
    });

    await reply(chatId,
      `🗑️ Marketplace dihapus!\n\n` +
      `📦 <code>${orderId}</code>\n` +
      `🏪 ${tx.marketplace.name} → <b>Tanpa Marketplace</b>\n` +
      `💵 Diterima: ${fmtCurrency(toNumber(tx.totalReceived))}`
    );
    return;
  }

  // Find marketplace by name
  const mp = await db.marketplace.findFirst({
    where: { name: { contains: mpName, mode: 'insensitive' }, isActive: true },
  });

  if (!mp) {
    const allMp = await db.marketplace.findMany({ where: { isActive: true }, select: { name: true } });
    const mpList = allMp.map(m => `• ${m.name}`).join('\n');
    await reply(chatId,
      `❌ Marketplace "${mpName}" tidak ditemukan.\n\nMarketplace tersedia:\n${mpList || '(belum ada)'}`
    );
    return;
  }

  const tx = await db.transaction.findUnique({
    where: { orderId },
    include: { paymentType: true, partner: true, marketplace: true },
  });
  if (!tx) {
    await reply(chatId, `❌ Transaksi <code>${orderId}</code> tidak ditemukan.`);
    return;
  }

  // Calculate new platform fee
  const nominal = toNumber(tx.nominal);
  let mpFeePercent = toNumber(mp.feePercent);
  const mpFeeFlat = toNumber(mp.feeFlat);
  if (mpFeePercent > 100) mpFeePercent = mpFeePercent / 1000;
  const newPlatformFee = nominal * (mpFeePercent / 100) + mpFeeFlat;
  const netMargin = toNumber(tx.paymentFee) - newPlatformFee;
  const partnerRate = tx.partner ? toNumber(tx.partner.commission) : 0;
  const partnerProfit = netMargin * (partnerRate / 100);
  const ownerProfit = netMargin - partnerProfit;

  await db.transaction.update({
    where: { orderId },
    data: { marketplaceId: mp.id, platformFee: newPlatformFee, netMargin, partnerProfit, ownerProfit },
  });

  const oldMpName = tx.marketplace?.name || 'Tanpa Marketplace';
  await reply(chatId,
    `🏪 Marketplace diupdate!\n\n` +
    `📦 <code>${orderId}</code>\n` +
    `🏪 ${oldMpName} → <b>${mp.name}</b>\n` +
    `💸 Fee MP: ${fmtCurrency(newPlatformFee)}\n` +
    `💵 Diterima: ${fmtCurrency(nominal - toNumber(tx.paymentFee))}`
  );
}

// ==================== MESSAGE ROUTER ====================

/** Parse and route incoming message */
async function processMessage(message: TelegramMessage) {
  const allowedChatId = await getChatId();
  if (!allowedChatId) {
    console.warn('[Telegram Webhook] No chat ID configured in settings');
    return;
  }

  if (!isAuthorized(message.chat?.id, allowedChatId)) {
    console.warn(`[Telegram Webhook] Unauthorized chat: ${message.chat?.id}`);
    return;
  }

  const text = message.text?.trim() || '';
  const chatId = message.chat.id;

  // Handle /commands
  if (text.startsWith('/')) {
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase().replace('@blackbearbot', '');

    switch (command) {
      case '/start':
        await handleStart(chatId);
        break;
      case '/help':
        await handleHelp(chatId);
        break;
      case '/info': {
        const orderId = parts[1];
        if (!orderId) {
          await reply(chatId, '❌ Format: <code>/info ORDER_ID</code>');
        } else {
          await handleInfo(chatId, orderId);
        }
        break;
      }
      case '/status': {
        const orderId = parts[1];
        const status = parts[2];
        if (!orderId || !status) {
          await reply(chatId, '❌ Format: <code>/status ORDER_ID STATUS</code>\nStatus: pending, verification, process, success, failed');
        } else {
          await handleStatus(chatId, orderId, status);
        }
        break;
      }
      case '/nominal': {
        const orderId = parts[1];
        const amount = parts[2];
        if (!orderId || !amount) {
          await reply(chatId, '❌ Format: <code>/nominal ORDER_ID NOMINAL</code>\nContoh: <code>/nominal BB-001 2500000</code>');
        } else {
          await handleNominal(chatId, orderId, amount);
        }
        break;
      }
      case '/catatan': {
        const orderId = parts[1];
        const notesText = parts.slice(2).join(' ');
        if (!orderId || !notesText) {
          await reply(chatId, '❌ Format: <code>/catatan ORDER_ID TEXT</code>');
        } else {
          await handleCatatan(chatId, orderId, notesText);
        }
        break;
      }
      case '/link': {
        const orderId = parts[1];
        const link = parts[2];
        if (!orderId || !link) {
          await reply(chatId, '❌ Format: <code>/link ORDER_ID URL</code>');
        } else {
          await handleLink(chatId, orderId, link);
        }
        break;
      }
      case '/mp': {
        const orderId = parts[1];
        const mpName = parts.slice(2).join(' ');
        if (!orderId || !mpName) {
          await reply(chatId, '❌ Format: <code>/mp ORDER_ID MARKETPLACE</code>\nContoh: <code>/mp BB-001 Shopee</code>\nKetik <code>/mp BB-001 clear</code> untuk hapus marketplace');
        } else {
          await handleMarketplace(chatId, orderId, mpName);
        }
        break;
      }
      default:
        await reply(chatId, `❓ Command tidak dikenali. Ketik <code>/help</code> untuk daftar command.`);
    }
    return;
  }

  // Handle reply to bot notification (shortcut commands)
  if (message.reply_to_message) {
    const replyText = message.reply_to_message.text || '';
    const replyFromBot = !message.reply_to_message.from?.username; // bot messages don't have username in some cases

    // Try to extract order ID from the replied message
    const orderId = extractOrderId(replyText);

    if (orderId) {
      const lowerText = text.toLowerCase();

      // Status shortcut
      if (STATUS_LIST.includes(lowerText)) {
        await handleStatus(chatId, orderId, lowerText);
        return;
      }

      // Nominal shortcut
      if (text.match(/^\d[\d,. ]*$/)) {
        const amount = text.replace(/[^0-9]/g, '');
        await handleNominal(chatId, orderId, amount);
        return;
      }

      // Link shortcut
      if (text.startsWith('http')) {
        await handleLink(chatId, orderId, text);
        return;
      }
    }
  }

  // Forwarded message? Try to extract order ID and show info
  if (message.reply_to_message === undefined && text.includes('<code>')) {
    const orderId = extractOrderId(text);
    if (orderId) {
      await handleInfo(chatId, orderId);
      return;
    }
  }
}

/** Handle callback query (inline keyboard buttons) */
async function processCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const allowedChatId = await getChatId();
  if (!allowedChatId) return;

  const token = await getBotToken();
  if (!token) return;

  const { id: queryId, data, message: msg } = callbackQuery;
  const chatId = msg.chat.id;

  // Always acknowledge the callback
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: queryId, text: '✅' }),
  });

  // Parse callback data: "status:ORDER_ID:newStatus"
  const [action, orderId, value] = data.split(':');

  if (action === 'status' && orderId && value) {
    await handleStatus(chatId, orderId, value);
  }
}

// ==================== MAIN HANDLER ====================

export async function POST(request: NextRequest) {
  try {
    const body: TelegramUpdate = await request.json();

    // Process callback queries first
    if (body.callback_query) {
      await processCallbackQuery(body.callback_query);
      return NextResponse.json({ ok: true });
    }

    // Process messages
    if (body.message) {
      await processMessage(body.message);
      return NextResponse.json({ ok: true });
    }

    // Acknowledge other updates
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Allow GET for webhook verification (some platforms need this)
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Black Bear Telegram Webhook is active' });
}
