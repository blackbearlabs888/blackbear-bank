import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession, clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { withObservability } from '@/lib/observability/request-id';
import { logInfo, logError } from '@/lib/observability/logger';
import { apiErrorFrom } from '@/lib/observability/errors';

export const POST = withObservability(async (_request: NextRequest) => {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sessionId')?.value;

    // Best-effort: identify the user for observability before the session is
    // destroyed. If this throws (invalid/expired session), we still proceed
    // with logout so the client is never left in a half-logged-out state.
    let user: { id: string; role: string } | null = null;
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        user = { id: currentUser.id, role: currentUser.role };
      }
    } catch {
      // Ignore — proceed with logout regardless
    }

    if (sessionId) {
      await deleteSession(sessionId);
    }

    await clearSessionCookie();

    logInfo({
      event: 'auth.logout',
      actorId: user?.id ?? null,
      actorRole: user?.role ?? null,
      message: 'User logged out',
    });

    return NextResponse.json({
      success: true,
      message: 'Logout berhasil',
    });
  } catch (error) {
    logError({
      event: 'auth.logout_error',
      message: 'Logout handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});
