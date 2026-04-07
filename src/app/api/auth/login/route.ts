import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  verifyPassword, 
  createSession, 
  setSessionCookie,
  validateEmail,
  validatePassword
} from '@/lib/auth';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { sanitizeEmail, sanitizeString, validateLength, FIELD_LIMITS } from '@/lib/sanitize';

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting (anti brute force) ──
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.LOGIN);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Terlalu banyak percobaan login. Coba lagi dalam ${rateLimitResult.retryAfter} detik.` 
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

    const { email, password, role } = body;

    // ── Input Sanitization ──
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedPassword = typeof password === 'string' ? password : '';
    const sanitizedRole = typeof role === 'string' ? sanitizeString(role).trim() : '';

    // ── Required Field Validation ──
    if (!sanitizedEmail || !sanitizedPassword || !sanitizedRole) {
      return NextResponse.json(
        { success: false, error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // ── Field Length Validation ──
    const emailCheck = validateLength(sanitizedEmail, 5, FIELD_LIMITS.EMAIL_MAX);
    if (!emailCheck.valid) {
      return NextResponse.json({ success: false, error: `Email: ${emailCheck.error}` }, { status: 400 });
    }

    const passwordCheck = validateLength(sanitizedPassword, FIELD_LIMITS.PASSWORD_MIN, FIELD_LIMITS.PASSWORD_MAX);
    if (!passwordCheck.valid) {
      return NextResponse.json({ success: false, error: `Password: ${passwordCheck.error}` }, { status: 400 });
    }

    // ── Format Validation ──
    if (!validateEmail(sanitizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    if (!validatePassword(sanitizedPassword)) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    if (!['owner', 'partner'].includes(sanitizedRole)) {
      return NextResponse.json(
        { success: false, error: 'Role tidak valid' },
        { status: 400 }
      );
    }

    // ── Find user ──
    const user = await db.user.findUnique({
      where: { email: sanitizedEmail.toLowerCase() },
      include: { partner: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // ── Verify password ──
    const isValid = await verifyPassword(sanitizedPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // ── Verify role ──
    if (user.role !== sanitizedRole) {
      return NextResponse.json(
        { success: false, error: 'Role tidak sesuai dengan akun' },
        { status: 401 }
      );
    }

    // ── Create session ──
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    // ── Return user data ──
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        partner: user.partner,
        message: 'Login berhasil',
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
