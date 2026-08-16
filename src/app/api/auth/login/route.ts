import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  validateEmail,
} from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { withObservability, updateActor } from '@/lib/observability/request-id';
import { logInfo, logWarn, logError } from '@/lib/observability/logger';
import {
  apiValidationError,
  apiUnauthenticated,
  apiRateLimited,
  apiErrorFrom,
} from '@/lib/observability/errors';

export const POST = withObservability(async (request: NextRequest) => {
  try {
    // Rate limiting: 5 attempts per 15 minutes
    const { success } = await rateLimit(request, 'login', {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!success) {
      return apiRateLimited(15 * 60);
    }

    const body = await request.json();
    const { email, password, role } = body;

    // Validation
    if (!email || !password || !role) {
      return apiValidationError('Semua field harus diisi');
    }

    if (!validateEmail(email)) {
      return apiValidationError('Format email tidak valid');
    }

    // NOTE: validatePassword is intentionally NOT checked here.
    // Login only verifies against the stored hash — format validation is meaningless
    // because old users may have shorter passwords from the legacy SHA-256 system.
    // Password strength validation belongs in registration and password change only.

    if (!['owner', 'partner'].includes(role)) {
      return apiValidationError('Role tidak valid');
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { partner: true },
    });

    if (!user) {
      // Do NOT log which email failed — could enable user enumeration.
      logWarn({
        event: 'auth.login_failed',
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Login failed — invalid credentials',
      });
      return apiUnauthenticated();
    }

    // Verify password (with auto-migration from legacy SHA-256 to bcrypt)
    const isValid = await verifyPassword(password, user.password, user.id);
    if (!isValid) {
      logWarn({
        event: 'auth.login_failed',
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Login failed — invalid credentials',
      });
      return apiUnauthenticated();
    }

    // Verify role
    if (user.role !== role) {
      logWarn({
        event: 'auth.login_failed',
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Login failed — invalid credentials',
      });
      return apiUnauthenticated();
    }

    // Create session
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    // Enrich observability context with authenticated actor
    updateActor(user.role, user.id);

    // Log successful login — no PII (email/password never logged)
    logInfo({
      event: 'auth.login_success',
      actorRole: user.role,
      actorId: user.id,
      message: 'Login successful',
    });

    // Return user data
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      partner: user.partner,
      message: 'Login berhasil',
    });
  } catch (error) {
    logError({
      event: 'auth.login_error',
      message: 'Login handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});
