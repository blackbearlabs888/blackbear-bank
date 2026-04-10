import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  hashPassword, 
  createSession, 
  setSessionCookie,
  validateEmail,
  validatePassword,
  validatePhone
} from '@/lib/auth';
import { sendTelegramNotification } from '@/lib/telegram';
import { normalizePhone, getPhoneVariations } from '@/lib/customer-utils';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { 
  sanitizeName, 
  sanitizeEmail, 
  sanitizePhone as sanitizePhoneInput, 
  sanitizeBankAccount, 
  sanitizeCity,
  sanitizeString,
  validateLength, 
  isHoneypotTriggered,
  isValidEmail,
  FIELD_LIMITS
} from '@/lib/sanitize';

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ──
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.PARTNER_REGISTER);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Terlalu banyak percobaan registrasi. Coba lagi dalam ${rateLimitResult.retryAfter} detik.` 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    // ── Request Body Validation ──
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Format request tidak valid' },
        { status: 400 }
      );
    }

    // ── Honeypot Check (anti-bot) ──
    if (isHoneypotTriggered(body.website, body.honeypot, body.company_url, body.contact_preference)) {
      // Silently reject bots with a failure response
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { 
      name, 
      email, 
      phone, 
      password, 
      confirmPassword,
      bankName,
      bankAccount,
      bankHolder,
      city 
    } = body;

    // ── Input Sanitization ──
    const sanitizedName = sanitizeName(name);
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedPhone = sanitizePhoneInput(phone);
    const sanitizedPassword = typeof password === 'string' ? password : '';
    const sanitizedConfirmPassword = typeof confirmPassword === 'string' ? confirmPassword : '';
    const sanitizedBankName = typeof bankName === 'string' ? sanitizeString(bankName) : '';
    const sanitizedBankAccount = sanitizeBankAccount(bankAccount);
    const sanitizedBankHolder = sanitizeName(bankHolder);
    const sanitizedCity = sanitizeCity(city);

    // ── Required Field Validation ──
    const missingFields: string[] = [];
    if (!sanitizedName) missingFields.push('nama');
    if (!sanitizedEmail) missingFields.push('email');
    if (!sanitizedPhone) missingFields.push('phone');
    if (!sanitizedPassword) missingFields.push('password');
    if (!sanitizedConfirmPassword) missingFields.push('confirmPassword');
    if (!sanitizedBankName) missingFields.push('bankName');
    if (!sanitizedBankAccount) missingFields.push('bankAccount');
    if (!sanitizedBankHolder) missingFields.push('bankHolder');
    if (!sanitizedCity) missingFields.push('city');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Field berikut harus diisi: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // ── Field Length Validation ──
    const nameCheck = validateLength(sanitizedName, FIELD_LIMITS.NAME_MIN, FIELD_LIMITS.NAME_MAX);
    if (!nameCheck.valid) {
      return NextResponse.json({ success: false, error: `Nama: ${nameCheck.error}` }, { status: 400 });
    }

    const emailCheck = validateLength(sanitizedEmail, 5, FIELD_LIMITS.EMAIL_MAX);
    if (!emailCheck.valid) {
      return NextResponse.json({ success: false, error: `Email: ${emailCheck.error}` }, { status: 400 });
    }

    const phoneCheck = validateLength(sanitizedPhone, FIELD_LIMITS.PHONE_MIN, FIELD_LIMITS.PHONE_MAX);
    if (!phoneCheck.valid) {
      return NextResponse.json({ success: false, error: `No WhatsApp: ${phoneCheck.error}` }, { status: 400 });
    }

    const bankNameCheck = validateLength(sanitizedBankName, 2, FIELD_LIMITS.BANK_NAME_MAX);
    if (!bankNameCheck.valid) {
      return NextResponse.json({ success: false, error: `Nama Bank: ${bankNameCheck.error}` }, { status: 400 });
    }

    const bankAcctCheck = validateLength(sanitizedBankAccount, FIELD_LIMITS.BANK_ACCOUNT_MIN, FIELD_LIMITS.BANK_ACCOUNT_MAX);
    if (!bankAcctCheck.valid) {
      return NextResponse.json({ success: false, error: `No Rekening: ${bankAcctCheck.error}` }, { status: 400 });
    }

    const bankHolderCheck = validateLength(sanitizedBankHolder, FIELD_LIMITS.NAME_MIN, FIELD_LIMITS.BANK_HOLDER_MAX);
    if (!bankHolderCheck.valid) {
      return NextResponse.json({ success: false, error: `Nama Pemilik Rekening: ${bankHolderCheck.error}` }, { status: 400 });
    }

    const cityCheck = validateLength(sanitizedCity, 2, FIELD_LIMITS.CITY_MAX);
    if (!cityCheck.valid) {
      return NextResponse.json({ success: false, error: `Kota: ${cityCheck.error}` }, { status: 400 });
    }

    const passwordCheck = validateLength(sanitizedPassword, FIELD_LIMITS.PASSWORD_MIN, FIELD_LIMITS.PASSWORD_MAX);
    if (!passwordCheck.valid) {
      return NextResponse.json({ success: false, error: `Password: ${passwordCheck.error}` }, { status: 400 });
    }

    // ── Format Validation ──
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    if (!validatePassword(sanitizedPassword)) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 8 karakter, harus mengandung huruf besar, huruf kecil, dan angka' },
        { status: 400 }
      );
    }

    if (sanitizedPassword !== sanitizedConfirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Konfirmasi password tidak cocok' },
        { status: 400 }
      );
    }

    if (!validatePhone(sanitizedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Format nomor WhatsApp tidak valid (contoh: 08xxx)' },
        { status: 400 }
      );
    }

    // ── Normalize phone number ──
    const normalizedPhone = normalizePhone(sanitizedPhone);
    const phoneVariations = getPhoneVariations(sanitizedPhone);

    // ── Check if user exists ──
    const existingUser = await db.user.findUnique({
      where: { email: sanitizedEmail.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }

    // ── Check if partner with phone exists ──
    const existingPartner = await db.partner.findFirst({
      where: {
        OR: phoneVariations.map(p => ({ phone: p })),
      },
    });

    if (existingPartner) {
      return NextResponse.json(
        { success: false, error: 'Nomor WhatsApp sudah terdaftar' },
        { status: 400 }
      );
    }

    // ── Hash password ──
    const hashedPassword = await hashPassword(sanitizedPassword);

    // ── Create user and partner ──
    const user = await db.user.create({
      data: {
        email: sanitizedEmail.toLowerCase(),
        name: sanitizedName,
        password: hashedPassword,
        role: 'partner',
        partner: {
          create: {
            name: sanitizedName,
            email: sanitizedEmail.toLowerCase(),
            phone: normalizedPhone,
            bankName: sanitizedBankName,
            bankAccount: sanitizedBankAccount,
            bankHolder: sanitizedBankHolder,
            city: sanitizedCity,
            commission: 30,
            target: 5000000,
            tier: 'Bronze',
            badge: 'Newbie',
            status: 'active',
          },
        },
      },
      include: { partner: true },
    });

    // ── Create session ──
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    // ── Notification ──
    try {
      await db.notification.create({
        data: {
          type: 'new_partner',
          title: 'Partner Baru Mendaftar',
          message: `${sanitizedName} (${sanitizedEmail}) baru saja mendaftar sebagai partner dari ${sanitizedCity}`,
          data: JSON.stringify({
            partnerId: user.partner?.id,
            partnerName: sanitizedName,
            partnerEmail: sanitizedEmail,
            partnerPhone: sanitizedPhone,
            partnerCity: sanitizedCity,
          }),
          targetType: 'owner',
          partnerId: user.partner?.id,
        },
      });

      const ownerProfile = await db.ownerProfile.findFirst();
      if (ownerProfile) {
        const notifSettings = await db.notificationSettings.findUnique({
          where: { ownerProfileId: ownerProfile.id },
        });

        if (notifSettings?.telegramEnabled && notifSettings.telegramBotToken && notifSettings.telegramChatId && notifSettings.notifyNewPartner) {
          await sendTelegramNotification(
            notifSettings.telegramBotToken,
            notifSettings.telegramChatId,
            {
              type: 'new_partner',
              title: '🤝 Partner Baru Bergabung',
              message: `${sanitizedName} baru saja mendaftar sebagai partner`,
              additionalData: {
                'Nama': sanitizedName,
                'Email': sanitizedEmail,
                'Telepon': sanitizedPhone,
                'Kota': sanitizedCity,
              },
            }
          );
        }
      }
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // ── Return user data ──
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        partner: user.partner,
        message: 'Registrasi berhasil',
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
