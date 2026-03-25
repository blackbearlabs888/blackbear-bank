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

export async function POST(request: NextRequest) {
  try {
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
      city 
    } = body;

    // Validation
    if (!name || !email || !phone || !password || !confirmPassword || !bankName || !bankAccount || !bankHolder || !city) {
      return NextResponse.json(
        { success: false, error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Konfirmasi password tidak cocok' },
        { status: 400 }
      );
    }

    if (!validatePhone(phone)) {
      return NextResponse.json(
        { success: false, error: 'Format nomor WhatsApp tidak valid (contoh: 08xxx)' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }

    // Check if partner with phone exists
    const existingPartner = await db.partner.findFirst({
      where: { phone },
    });

    if (existingPartner) {
      return NextResponse.json(
        { success: false, error: 'Nomor WhatsApp sudah terdaftar' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

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
            phone,
            bankName,
            bankAccount,
            bankHolder,
            city,
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

    // Create session
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    // Create notification for owner about new partner registration
    try {
      await db.notification.create({
        data: {
          type: 'new_partner',
          title: 'Partner Baru Mendaftar',
          message: `${name} (${email}) baru saja mendaftar sebagai partner dari ${city}`,
          data: JSON.stringify({
            partnerId: user.partner?.id,
            partnerName: name,
            partnerEmail: email,
            partnerPhone: phone,
            partnerCity: city,
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

        if (notifSettings?.telegramEnabled && notifSettings.telegramBotToken && notifSettings.telegramChatId && notifSettings.notifyNewPartner) {
          await sendTelegramNotification(
            notifSettings.telegramBotToken,
            notifSettings.telegramChatId,
            {
              type: 'new_partner',
              title: '🤝 Partner Baru Bergabung',
              message: `${name} baru saja mendaftar sebagai partner`,
              additionalData: {
                'Nama': name,
                'Email': email,
                'Telepon': phone,
                'Kota': city,
              },
            }
          );
        }
      }
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
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
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
