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
    const existingPartner = await db.partner.findUnique({
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
