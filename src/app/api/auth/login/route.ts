import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  verifyPassword, 
  createSession, 
  setSessionCookie,
  validateEmail,
} from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes
    const { success } = await rateLimit(request, 'login', { maxRequests: 5, windowMs: 15 * 60 * 1000 });
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, role } = body;

    // Validation
    if (!email || !password || !role) {
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

    // NOTE: validatePassword is intentionally NOT checked here.
    // Login only verifies against the stored hash — format validation is meaningless
    // because old users may have shorter passwords from the legacy SHA-256 system.
    // Password strength validation belongs in registration and password change only.

    if (!['owner', 'partner'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role tidak valid' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { partner: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Verify password (with auto-migration from legacy SHA-256 to bcrypt)
    const isValid = await verifyPassword(password, user.password, user.id);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Verify role
    if (user.role !== role) {
      return NextResponse.json(
        { success: false, error: 'Role tidak sesuai dengan akun' },
        { status: 401 }
      );
    }

    // Create session
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    // Return user data
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      partner: user.partner,
      message: 'Login berhasil',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
