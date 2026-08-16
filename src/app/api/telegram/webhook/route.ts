import { NextRequest, NextResponse } from 'next/server';
import { db, toNumber } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import { timingSafeEqual } from 'crypto';
import { calculateTransaction, CALCULATION_VERSION_PHASE2 } from '@/lib/transaction/fee';
import { applyStatusTransition, adjustVolumeForNominalChange } from '@/lib/transaction/stats';
import { isValidStatus } from '@/lib/transaction/status-machine';
import {
  getRequestId,
  withObservability,
  setRequestIdHeader,
} from '@/lib/observability/request-id';
import {
  logWarn,
  logError,
  logTransactionEvent,
} from '@/lib/observability/logger';
import { apiError, ErrorCode } from '@/lib/observability/errors';

// ==================== WEBHOOK AUTHENTICITY ====================

/**
 * Verify the X-Telegram-Bot-Api-Secret-Token header sent by Telegram.
 *
 * Telegram supports an optional `secret_token` parameter when registering a
 * webhook (see setWebhook API). When set, Telegram includes the same value in
 * the `X-Telegram-Bot-Api-Secret-Token` header of every webhook request,
 * allowing the receiver to reject forged requests that did not originate from
 * Telegram.
 *
 * The expected secret is read from the TELEGRAM_WEBHOOK_SECRET environment
 * variable (NEVER from the database, NEVER logged).
 *
 * FAIL-CLOSED POLICY (Phase 1.2):
 *  - Production (NODE_ENV === 'production'): the secret MUST be set. If it is
 *    missing, the webhook is REJECTED with 503 and a safe configuration-error
 *    log message (the secret value is never logged). No update is processed.
 *  - Non-production: the secret MUST be set UNLESS the explicit development
 *    flag `TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true` is present. Without the
 *    flag, the webhook is REJECTED. This prevents accidental bypass when an
 *    env file is missing or incomplete.
 *  - If the secret is set, the request header must be present AND
 *    constant-time equal to the expected value, otherwise the request is
 *    rejected with 401.
 *
 * Constant-time comparison prevents timing side-channels. The length check is
 * unavoidable with Node's timingSafeEqual (requires equal-length buffers);
 * secret length is not considered highly sensitive.
 *
 * The `reason` field is for INTERNAL LOGGING ONLY — the HTTP response body
 * never includes the reason (see POST handler) to avoid information
 * disclosure.
 */
function verifyTelegramSecret(request: NextRequest): { ok: boolean; reason?: string; status?: number } {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  const allowInsecureDev = process.env.TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV === 'true';

  if (!expected) {
    if (isProduction) {
      // FAIL-CLOSED in production. Safe log: no secret, no env value echoed.
      console.error(
        '[Telegram Webhook] REJECTED: TELEGRAM_WEBHOOK_SECRET is not set and NODE_ENV=production. Configure the secret before enabling the webhook.'
      );
      return { ok: false, reason: 'secret_not_configured', status: 503 };
    }
    if (!allowInsecureDev) {
      // FAIL-CLOSED in non-production without explicit opt-in flag.
      console.error(
        '[Telegram Webhook] REJECTED: TELEGRAM_WEBHOOK_SECRET is not set. Set the secret, or set TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true for local development only.'
      );
      return { ok: false, reason: 'secret_not_configured', status: 503 };
    }
    // Explicit dev bypass — only when not production AND flag is true.
    console.warn(
      '[Telegram Webhook] INSECURE DEV MODE: TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true and no secret set. Webhook authenticity verification is DISABLED. NEVER use this in production.'
    );
    return { ok: true };
  }

  const provided = request.headers.get('x-telegram-bot-api-secret-token');
  if (!provided) {
    return { ok: false, reason: 'missing_secret_header', status: 401 };
  }

  const aBuf = Buffer.from(provided);
  const bBuf = Buffer.from(expected);
  if (aBuf.length !== bBuf.length) {
    return { ok: false, reason: 'invalid_secret', status: 401 };
  }
  if (!timingSafeEqual(aBuf, bBuf)) {
    return { ok: false, reason: 'invalid_secret', status: 401 };
  }
  return { ok: true };
}

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
    `/catatan &lt;order_id&gt; &lt;text&gt; — Tambah catatan\n` +
    `/link &lt;order_id&gt; &lt;url&gt; — Set link order\n` +
    `/mp &lt;order_id&gt; &lt;marketplace&gt; — Ubah marketplace\n\n` +
    `<b>📊 Laporan:</b>\n` +
    `/today — Ringkasan transaksi & pendapatan hari ini\n` +
    `/weekly — Customer & partner baru minggu ini\n\n` +
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
    `<b>📊 Laporan:</b>\n\n` +
    `<b>/today</b>\nTransaksi hari ini + pendapatan owner\n\n` +
    `<b>/weekly</b>\nCustomer baru & partner baru minggu ini\n\n` +
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
  if (!isValidStatus(status)) {
    await reply(chatId, `❌ Status tidak valid. Gunakan: <code>pending</code>, <code>verification</code>, <code>process</code>, <code>success</code>, <code>failed</code>`);
    return;
  }

  const tx = await db.transaction.findUnique({
    where: { orderId },
    include: { partner: true, customer: true, paymentType: true, marketplace: true },
  });
  if (!tx) {
    await reply(chatId, `❌ Transaksi <code>${orderId}</code> tidak ditemukan.`);
    return;
  }

  const oldStatus = tx.status;
  if (oldStatus === status) {
    await reply(chatId, `ℹ️ Transaksi <code>${orderId}</code> sudah dalam status <b>${status.toUpperCase()}</b>.`);
    return;
  }

  // ── Phase 2: Use shared applyStatusTransition (atomic stats mutation) ──
  // This ensures Telegram /status produces the same partner-stats accounting
  // as PATCH /api/transactions/[id].
  const { statusChanged } = await db.$transaction(async (txClient) => {
    return applyStatusTransition(
      txClient,
      {
        id: tx.id,
        status: tx.status,
        partnerId: tx.partnerId,
        customerId: tx.customerId,
        nominal: tx.nominal,
        partnerProfit: tx.partnerProfit,
      },
      status,
    );
  });

  // ── Phase 3: Transaction observability ──
  // DB transaction has committed at this point. The Telegram reply below is
  // a best-effort notification — its failure does NOT roll back the DB.
  if (statusChanged) {
    logTransactionEvent('transaction.status_changed', {
      transactionId: tx.id,
      orderId,
      actorRole: 'owner',
      actorId: null,
      message: `Status changed via Telegram /status: ${oldStatus} → ${status}`,
      monetary: {
        nominal: toNumber(tx.nominal),
        partnerProfit: toNumber(tx.partnerProfit),
      },
      extra: { oldStatus, newStatus: status, source: 'telegram' },
    });
    await reply(chatId,
      `✅ Status transaksi diupdate!\n\n` +
      `📦 <code>${orderId}</code>\n` +
      `${STATUS_EMOJI[oldStatus]} ${oldStatus.toUpperCase()} → ${STATUS_EMOJI[status]} <b>${status.toUpperCase()}</b>`
    );
  } else {
    logTransactionEvent('transaction.status_noop', {
      transactionId: tx.id,
      orderId,
      actorRole: 'owner',
      actorId: null,
      message: `Status unchanged (same-status request): ${status}`,
      extra: { status, source: 'telegram' },
    });
    await reply(chatId, `ℹ️ Transaksi <code>${orderId}</code> sudah dalam status <b>${status.toUpperCase()}</b>.`);
  }
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
    include: { paymentType: true, marketplace: true, partner: true },
  });

  if (!tx) {
    await reply(chatId, `❌ Transaksi <code>${orderId}</code> tidak ditemukan.`);
    return;
  }

  if (!tx.paymentType) {
    await reply(chatId, `❌ Payment type tidak ditemukan untuk transaksi ini.`);
    return;
  }

  const oldNominal = toNumber(tx.nominal);

  // ── Phase 2: Use consolidated fee calculation (single source of truth) ──
  // This replaces the inline ratio-preservation logic that diverged from PATCH.
  const calc = calculateTransaction({
    nominal: amount,
    paymentType: tx.paymentType as unknown as Parameters<typeof calculateTransaction>[0]['paymentType'],
    marketplace: tx.marketplace ? { name: tx.marketplace.name, feePercent: tx.marketplace.feePercent, feeFlat: tx.marketplace.feeFlat } : null,
    partner: tx.partner ? { commission: tx.partner.commission } : null,
    methodTransaction: tx.methodTransaction || 'Online',
  });

  // ── Atomic: update transaction + adjust volume stats ──
  await db.$transaction(async (txClient) => {
    await txClient.transaction.update({
      where: { id: tx.id },
      data: {
        nominal: calc.nominal,
        paymentFee: calc.paymentFee,
        originalFee: calc.originalFee,
        discountPercent: calc.discountPercent,
        discountAmount: calc.discountAmount,
        platformFee: calc.platformFee,
        netMargin: calc.netMargin,
        partnerProfit: calc.partnerProfit,
        ownerProfit: calc.ownerProfit,
        totalReceived: calc.totalReceived,
        // Update snapshot fields
        partnerCommissionPercent: calc.partnerCommissionPercent,
        paymentTypeName: calc.paymentTypeName,
        marketplaceName: calc.marketplaceName,
        feeConfigSnapshot: calc.feeConfigSnapshot,
        calculationVersion: CALCULATION_VERSION_PHASE2,
      },
    });

    // Adjust customer + partner volume for the nominal change
    if (amount !== oldNominal) {
      await adjustVolumeForNominalChange(
        txClient,
        {
          id: tx.id,
          status: tx.status,
          partnerId: tx.partnerId,
          customerId: tx.customerId,
          nominal: tx.nominal,
          partnerProfit: tx.partnerProfit,
        },
        oldNominal,
        amount,
      );
    }
  });

  // ── Phase 3: Transaction observability (DB committed, reply is best-effort) ──
  logTransactionEvent('transaction.amount_changed', {
    transactionId: tx.id,
    orderId,
    actorRole: 'owner',
    actorId: null,
    message: `Nominal changed via Telegram /nominal: ${oldNominal} → ${amount}`,
    monetary: {
      oldNominal,
      newNominal: amount,
      paymentFee: calc.paymentFee,
      partnerProfit: calc.partnerProfit,
      ownerProfit: calc.ownerProfit,
    },
    extra: { source: 'telegram' },
  });

  await reply(chatId,
    `✅ Nominal transaksi diupdate!\n\n` +
    `📦 <code>${orderId}</code>\n` +
    `💰 ${fmtCurrency(oldNominal)} → <b>${fmtCurrency(amount)}</b>\n` +
    `💸 Fee: ${fmtCurrency(calc.paymentFee)}`
  );
}

/** Handle /catatan command
 *
 * Phase 3 — APPEND semantics (business decision):
 *   - `/catatan` APPENDS a new note to the existing notes, it does NOT overwrite.
 *   - Each appended note includes an ISO timestamp and an [Owner] marker so
 *     the audit trail shows who added what and when.
 *   - Previous notes are NEVER deleted or truncated.
 *   - The mutation is atomic (single UPDATE inside a $transaction).
 */
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

  // Build the appended entry: timestamp + [Owner] marker + the new text.
  // Existing notes (if any) are preserved verbatim and the new entry is
  // appended on a new line.
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const newEntry = `[${timestamp}] [Owner] ${notesText.trim()}`;
  const existingNotes = tx.notes?.trim() ?? '';
  const updatedNotes = existingNotes
    ? `${existingNotes}\n${newEntry}`
    : newEntry;

  // Atomic mutation — single UPDATE. No read-modify-write race.
  await db.$transaction(async (txClient) => {
    await txClient.transaction.update({
      where: { orderId },
      data: { notes: updatedNotes },
    });
  });

  logTransactionEvent('transaction.notes_appended', {
    transactionId: tx.id,
    orderId,
    actorRole: 'owner',
    actorId: null,
    message: 'Note appended via Telegram /catatan',
    extra: { source: 'telegram', entryLength: newEntry.length },
  });

  await reply(chatId,
    `✅ Catatan ditambahkan!\n\n` +
    `📦 <code>${orderId}</code>\n` +
    `📝 ${newEntry}`
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

    // ── Phase 2: Use consolidated fee calculation (single source) ──
    const calc = calculateTransaction({
      nominal: toNumber(tx.nominal),
      paymentType: tx.paymentType as unknown as Parameters<typeof calculateTransaction>[0]['paymentType'],
      marketplace: null,
      partner: tx.partner ? { commission: tx.partner.commission } : null,
      methodTransaction: tx.methodTransaction || 'Online',
    });

    await db.transaction.update({
      where: { id: tx.id },
      data: {
        marketplaceId: null,
        platformFee: calc.platformFee,
        netMargin: calc.netMargin,
        partnerProfit: calc.partnerProfit,
        ownerProfit: calc.ownerProfit,
        // Update snapshot fields
        partnerCommissionPercent: calc.partnerCommissionPercent,
        marketplaceName: calc.marketplaceName,
        feeConfigSnapshot: calc.feeConfigSnapshot,
        calculationVersion: CALCULATION_VERSION_PHASE2,
      },
    });

    // ── Phase 3: Transaction observability ──
    logTransactionEvent('transaction.marketplace_changed', {
      transactionId: tx.id,
      orderId,
      actorRole: 'owner',
      actorId: null,
      message: `Marketplace cleared via Telegram /mp: ${tx.marketplace?.name} → (none)`,
      monetary: {
        platformFee: calc.platformFee,
        partnerProfit: calc.partnerProfit,
        ownerProfit: calc.ownerProfit,
      },
      extra: { oldMarketplace: tx.marketplace?.name, newMarketplace: null, source: 'telegram' },
    });

    await reply(chatId,
      `🗑️ Marketplace dihapus!\n\n` +
      `📦 <code>${orderId}</code>\n` +
      `🏪 ${tx.marketplace?.name} → <b>Tanpa Marketplace</b>\n` +
      `💵 Diterima: ${fmtCurrency(calc.totalReceived)}`
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

  // ── Phase 2: Use consolidated fee calculation (single source) ──
  const calc = calculateTransaction({
    nominal: toNumber(tx.nominal),
    paymentType: tx.paymentType as unknown as Parameters<typeof calculateTransaction>[0]['paymentType'],
    marketplace: { name: mp.name, feePercent: mp.feePercent, feeFlat: mp.feeFlat },
    partner: tx.partner ? { commission: tx.partner.commission } : null,
    methodTransaction: tx.methodTransaction || 'Online',
  });

  await db.transaction.update({
    where: { id: tx.id },
    data: {
      marketplaceId: mp.id,
      platformFee: calc.platformFee,
      netMargin: calc.netMargin,
      partnerProfit: calc.partnerProfit,
      ownerProfit: calc.ownerProfit,
      // Update snapshot fields
      partnerCommissionPercent: calc.partnerCommissionPercent,
      marketplaceName: calc.marketplaceName,
      feeConfigSnapshot: calc.feeConfigSnapshot,
      calculationVersion: CALCULATION_VERSION_PHASE2,
    },
  });

  const oldMpName = tx.marketplace?.name || 'Tanpa Marketplace';

  // ── Phase 3: Transaction observability ──
  logTransactionEvent('transaction.marketplace_changed', {
    transactionId: tx.id,
    orderId,
    actorRole: 'owner',
    actorId: null,
    message: `Marketplace changed via Telegram /mp: ${oldMpName} → ${mp.name}`,
    monetary: {
      platformFee: calc.platformFee,
      partnerProfit: calc.partnerProfit,
      ownerProfit: calc.ownerProfit,
    },
    extra: { oldMarketplace: tx.marketplace?.name, newMarketplace: mp.name, source: 'telegram' },
  });

  await reply(chatId,
    `🏪 Marketplace diupdate!\n\n` +
    `📦 <code>${orderId}</code>\n` +
    `🏪 ${oldMpName} → <b>${mp.name}</b>\n` +
    `💸 Fee MP: ${fmtCurrency(calc.platformFee)}\n` +
    `💵 Diterima: ${fmtCurrency(calc.totalReceived)}`
  );
}

/** Handle /today - transaksi hari ini + pendapatan owner */
async function handleToday(chatId: number) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [transactions, aggregations] = await Promise.all([
    db.transaction.findMany({
      where: { createdAt: { gte: todayStart } },
      include: { customer: true, partner: true, paymentType: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.transaction.aggregate({
      where: { createdAt: { gte: todayStart } },
      _count: true,
      _sum: { nominal: true, ownerProfit: true, paymentFee: true },
    }),
  ]);

  const count = aggregations._count || 0;
  const volume = toNumber(aggregations._sum.nominal) || 0;
  const profit = toNumber(aggregations._sum.ownerProfit) || 0;
  const totalFee = toNumber(aggregations._sum.paymentFee) || 0;

  const successCount = transactions.filter(t => t.status === 'success').length;
  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  let message =
    `📊 <b>Ringkasan Hari Ini</b> — ${now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n` +
    `💰 Volume: <b>${fmtCurrency(volume)}</b>\n` +
    `💵 Owner Profit: <b>${fmtCurrency(profit)}</b>\n` +
    `💸 Total Fee: ${fmtCurrency(totalFee)}\n` +
    `📦 Total Trx: ${count} (✅${successCount} ⏳${pendingCount})`;

  if (transactions.length > 0) {
    message += `\n\n<b>📋 Daftar Transaksi:</b>\n`;
    transactions.forEach((tx, i) => {
      const emoji = STATUS_EMOJI[tx.status] || '📋';
      message += `\n${i + 1}. ${emoji} <code>${tx.orderId}</code>`;
      message += `\n   ${tx.customer.name} • ${fmtCurrency(toNumber(tx.nominal))}`;
      if (tx.partner) message += ` • ${tx.partner.name}`;
      message += `\n   ${tx.paymentType.name} • ${tx.status.toUpperCase()}`;
    });
    if (count > 20) {
      message += `\n\n<i>...dan ${count - 20} transaksi lainnya</i>`;
    }
  } else {
    message += `\n\n<i>Belum ada transaksi hari ini</i>`;
  }

  // Chunk if too long (Telegram limit 4096 chars)
  if (message.length > 4000) {
    const firstChunk = message.substring(0, 3900);
    const rest = message.substring(3900);
    await reply(chatId, firstChunk);
    await reply(chatId, rest);
  } else {
    await reply(chatId, message);
  }
}

/** Handle /weekly - customer baru & partner baru minggu ini */
async function handleWeekly(chatId: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday

  const [newCustomers, newPartners, txAgg] = await Promise.all([
    db.customer.findMany({
      where: { createdAt: { gte: startOfWeek } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.partner.findMany({
      where: { joinedAt: { gte: startOfWeek } },
      orderBy: { joinedAt: 'desc' },
      take: 10,
    }),
    db.transaction.aggregate({
      where: { createdAt: { gte: startOfWeek }, status: 'success' },
      _count: true,
      _sum: { nominal: true, ownerProfit: true },
    }),
  ]);

  const weekLabel = `${startOfWeek.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const message =
    `📅 <b>Ringkasan Minggu Ini</b>\n${weekLabel}\n\n` +
    `<b>👥 Customer Baru (${newCustomers.length})</b>\n` +
    (newCustomers.length > 0
      ? newCustomers.map((c, i) => `${i + 1}. ${c.name}${c.phone ? ` • ${c.phone}` : ''}${c.label ? ` [${c.label}]` : ''}`).join('\n')
      : '<i>Belum ada customer baru</i>') +
    `\n\n` +
    `<b>🤝 Partner Baru (${newPartners.length})</b>\n` +
    (newPartners.length > 0
      ? newPartners.map((p, i) => `${i + 1}. ${p.name} — ${p.tier}${p.city ? ` • ${p.city}` : ''}`).join('\n')
      : '<i>Belum ada partner baru</i>') +
    `\n\n` +
    `<b>📊 Trx Sukses Minggu Ini</b>\n` +
    `📦 ${txAgg._count} transaksi\n` +
    `💰 Volume: <b>${fmtCurrency(toNumber(txAgg._sum.nominal))}</b>\n` +
    `💵 Profit: <b>${fmtCurrency(toNumber(txAgg._sum.ownerProfit))}</b>`;

  await reply(chatId, message);
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
      case '/today':
        await handleToday(chatId);
        break;
      case '/weekly':
        await handleWeekly(chatId);
        break;
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

export const POST = withObservability(async (request: NextRequest) => {
  try {
    // --- Webhook authenticity: verify X-Telegram-Bot-Api-Secret-Token ---
    // FAIL-CLOSED: in production the secret MUST be set; in non-production the
    // secret MUST be set unless TELEGRAM_WEBHOOK_ALLOW_INSECURE_DEV=true.
    // See verifyTelegramSecret above for the full policy. The `reason` is
    // logged internally but never echoed to the caller.
    const secretCheck = verifyTelegramSecret(request);
    if (!secretCheck.ok) {
      // Structured log with safe reason code (no secret value ever logged).
      if (secretCheck.reason) {
        logWarn({
          event: 'telegram.webhook_rejected',
          route: 'POST /api/telegram/webhook',
          errorCode: 'WEBHOOK_AUTH_FAILED',
          message: 'Webhook authenticity check failed',
          data: { reason: secretCheck.reason },
        });
      }
      return NextResponse.json({ ok: false }, { status: secretCheck.status ?? 401 });
    }

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
    logError({
      event: 'telegram.webhook_error',
      route: 'POST /api/telegram/webhook',
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: 'Telegram webhook handler error',
      data: { error },
    });
    return apiError({
      status: 500,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    });
  }
});

// Allow GET for webhook verification (some platforms need this)
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const response = NextResponse.json({ ok: true, message: 'Black Bear Telegram Webhook is active' });
  setRequestIdHeader(response, requestId);
  return response;
}
