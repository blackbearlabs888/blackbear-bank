// Notification Helper
// Centralized helper for sending notifications (Telegram, push, etc.)

import { db } from '@/lib/db';
import {
  sendTelegramNotification,
  formatTransactionNotification,
  formatPartnerNotification,
} from '@/lib/telegram';

interface NotificationSettingsType {
  telegramEnabled: boolean;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  notifyNewTransaction: boolean;
  notifyStatusChange: boolean;
  notifyPartnerRegister: boolean;
}

/**
 * Get notification settings for the owner
 */
async function getNotificationSettings(): Promise<NotificationSettingsType | null> {
  try {
    // Get notification settings directly (there's only one owner)
    const settings = await db.notificationSettings.findFirst();
    return settings;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return null;
  }
}

/**
 * Send notification for new transaction
 */
export async function notifyNewTransaction(data: {
  orderId: string;
  customerName: string;
  nominal: number;
  paymentType?: string;
  methodTransaction?: string;
  partnerName?: string;
  ownerProfit?: number;
}): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings || !settings.notifyNewTransaction) return;

    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const message = formatTransactionNotification({
        type: 'new',
        ...data,
        status: 'pending',
      });

      await sendTelegramNotification(settings, message);
    }
  } catch (error) {
    console.error('Error sending new transaction notification:', error);
  }
}

/**
 * Send notification for transaction status change
 */
export async function notifyTransactionStatusChange(data: {
  orderId: string;
  customerName: string;
  nominal: number;
  status: string;
  partnerName?: string;
}): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings || !settings.notifyStatusChange) return;

    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const message = formatTransactionNotification({
        type: 'status_change',
        ...data,
      });

      await sendTelegramNotification(settings, message);
    }
  } catch (error) {
    console.error('Error sending status change notification:', error);
  }
}

/**
 * Send notification for new partner registration
 */
export async function notifyNewPartner(data: {
  partnerName: string;
  partnerEmail: string;
  partnerPhone: string;
  partnerCity?: string;
}): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings || !settings.notifyPartnerRegister) return;

    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const message = formatPartnerNotification(data);
      await sendTelegramNotification(settings, message);
    }
  } catch (error) {
    console.error('Error sending new partner notification:', error);
  }
}
