import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  hashPassword,
  createSession,
  setSessionCookie,
  validateEmail,
  validatePassword,
  validatePhone,
} from '@/lib/auth';
import { sendTelegramNotification } from '@/lib/telegram';
import { normalizePhone, getPhoneVariations } from '@/lib/customer-utils';
import { normalizeBankAccount } from '@/lib/fraud/identity';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { withObservability, updateActor } from '@/lib/observability/request-id';
import { logInfo, logWarn, logError } from '@/lib/observability/logger';
import {
  apiValidationError,
  apiConflict,
  apiRateLimited,
  apiErrorFrom,
} from '@/lib/observability/errors';

export const POST = withObservability(async (request: NextRequest) => {
  try {
    // Rate limiting: 3 registrations per 10 minutes per IP, 30 min block
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, {
      maxRequests: 3,
      windowMs: 10 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
      keyPrefix: 'register',
    });
    if (!rateCheck.success) {
      return apiRateLimited(rateCheck.retryAfter || 30 * 60);
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      bankName,
      bankAccount,
      bankHolder,
      city,
      // Honeypot fields — if any value present, silently reject as bot
      website,
      honeypot,
      url,
    } = body;

    // Honeypot check — bots tend to fill hidden fields
    if (website || honeypot || url) {
      // Pretend success to avoid revealing detection
      return NextResponse.json({
        success: true,
        message: 'Registrasi berhasil',
      });
    }

    // Validation
    const missingFields = [];
    if (!name) missingFields.push('nama');
    if (!email) missingFields.push('email');
    if (!phone) missingFields.push('phone');
    if (!password) missingFields.push('password');
    if (!confirmPassword) missingFields.push('confirmPassword');
    if (!bankName) missingFields.push('bankName');
    if (!bankAccount) missingFields.push('bankAccount');
    if (!bankHolder) missingFields.push('bankHolder');
    if (!city) missingFields.push('city');

    if (missingFields.length > 0) {
      return apiValidationError(
        `Field berikut harus diisi: ${missingFields.join(', ')}`,
      );
    }

    if (!validateEmail(email)) {
      return apiValidationError('Format email tidak valid');
    }

    if (!validatePassword(password)) {
      return apiValidationError('Password minimal 8 karakter');
    }

    if (password !== confirmPassword) {
      return apiValidationError('Konfirmasi password tidak cocok');
    }

    if (!validatePhone(phone)) {
      return apiValidationError(
        'Format nomor WhatsApp tidak valid (contoh: 08xxx)',
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phone);
    const phoneVariations = getPhoneVariations(phone);

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return apiConflict('Email sudah terdaftar');
    }

    // Check if partner with phone exists (check all variations)
    const existingPartner = await db.partner.findFirst({
      where: {
        OR: phoneVariations.map((p) => ({ phone: p })),
      },
    });

    if (existingPartner) {
      return apiConflict('Nomor WhatsApp sudah terdaftar');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // ── Phase 5: Partner Registration Identity Check ──
    // Check if any existing Customer matches the new partner's normalized
    // phone AND bank account. Per directive:
    //   - Don't block registration just because they were a customer before.
    //   - If phone + bank account BOTH match an existing customer → create the
    //     partner but set status='suspended' and notify owner for verification.
    //   - Phone-only or bank-only match → emit a safe risk signal via structured
    //     log (no PII). Partner is created as 'active'.
    //   - No match → partner is created as 'active' (existing behavior).
    const normalizedBankAccount = normalizeBankAccount(bankAccount);
    const existingCustomersWithPhone = await db.customer.findMany({
      where: {
        OR: phoneVariations.map((p) => ({ phone: p })),
      },
      select: {
        id: true,
        phone: true,
        bankAccount: true,
        name: true,
        createdAt: true,
      },
    });

    // Check for phone + bank account exact match (strong identity overlap)
    const phoneAndBankMatch = existingCustomersWithPhone.some(
      (c) =>
        c.bankAccount &&
        normalizeBankAccount(c.bankAccount) === normalizedBankAccount,
    );
    const phoneOnlyMatch = existingCustomersWithPhone.length > 0 && !phoneAndBankMatch;

    const initialPartnerStatus = phoneAndBankMatch ? 'suspended' : 'active';

    if (phoneOnlyMatch) {
      // Safe log — NO PII (no phone, no bank account, no customer name)
      logInfo({
        event: 'fraud.registration_phone_only_match',
        message: 'New partner phone matches an existing customer (phone only). Partner created as active; signal saved for first transaction assessment.',
        data: {
          matchCount: existingCustomersWithPhone.length,
          hasBankMatch: false,
        },
      });
    }

    if (phoneAndBankMatch) {
      // Safe log — NO PII
      logWarn({
        event: 'fraud.registration_critical_match',
        message: 'New partner phone + bank account match an existing customer. Partner created as suspended; owner verification required.',
        data: {
          matchCount: existingCustomersWithPhone.length,
          hasBankMatch: true,
        },
      });
    }

    // Create user and partner
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role: 'partner',
        partner: {
          create: {
            name,
            email: email.toLowerCase(),
            phone: normalizedPhone,
            bankName,
            bankAccount,
            bankHolder,
            city,
            commission: 30,
            target: 5000000,
            tier: 'Bronze',
            badge: 'Newbie',
            status: initialPartnerStatus,
          },
        },
      },
      include: { partner: true },
    });

    // Create session
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    // Enrich observability context with authenticated actor
    updateActor(user.role, user.id);

    // Log successful registration — no PII (email/password never logged)
    logInfo({
      event: 'auth.register',
      actorRole: user.role,
      actorId: user.id,
      message: 'New user registered',
    });

    // Create notification for owner about new partner registration
    try {
      await db.notification.create({
        data: {
          type: 'new_partner',
          title: phoneAndBankMatch
            ? 'Partner Baru Membutuhkan Verifikasi Identitas'
            : 'Partner Baru Mendaftar',
          message: phoneAndBankMatch
            ? `${name} (${email}) baru saja mendaftar sebagai partner dari ${city}. Status: SUSPENDED — identitas terdeteksi tumpang tindih dengan customer existing. Verifikasi identitas diperlukan.`
            : `${name} (${email}) baru saja mendaftar sebagai partner dari ${city}`,
          data: JSON.stringify({
            partnerId: user.partner?.id,
            partnerName: name,
            partnerEmail: email,
            partnerPhone: phone,
            partnerCity: city,
            requiresIdentityVerification: phoneAndBankMatch,
          }),
          targetType: 'owner',
          partnerId: user.partner?.id,
        },
      });

      // Send Telegram notification to owner
      const ownerProfile = await db.ownerProfile.findFirst();
      if (ownerProfile) {
        const notifSettings = await db.notificationSettings.findUnique({
          where: { ownerProfileId: ownerProfile.id },
        });

        if (
          notifSettings?.telegramEnabled &&
          notifSettings.telegramBotToken &&
          notifSettings.telegramChatId &&
          notifSettings.notifyNewPartner
        ) {
          await sendTelegramNotification(
            notifSettings.telegramBotToken,
            notifSettings.telegramChatId,
            {
              type: 'new_partner',
              title: '🤝 Partner Baru Bergabung',
              message: `${name} baru saja mendaftar sebagai partner`,
              additionalData: {
                Nama: name,
                Email: email,
                Telepon: phone,
                Kota: city,
              },
            },
          );
        }
      }
    } catch (notifError) {
      logError({
        event: 'auth.register_notification_failed',
        message: 'Failed to create registration notification',
        data: { error: notifError },
      });
      // Don't throw - notification failure shouldn't break registration
    }

    // Return user data
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      partner: user.partner,
      message: 'Registrasi berhasil',
    });
  } catch (error) {
    logError({
      event: 'auth.register_error',
      message: 'Register handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});
