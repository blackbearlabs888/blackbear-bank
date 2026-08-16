import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { withObservability } from '@/lib/observability/request-id';
import { logError } from '@/lib/observability/logger';
import { apiUnauthenticated, apiErrorFrom } from '@/lib/observability/errors';

export const GET = withObservability(async (_request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthenticated();
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      partner: user.partner || null,
    });
  } catch (error) {
    logError({
      event: 'auth.me_error',
      message: 'Get current user handler threw',
      data: { error },
    });
    return apiErrorFrom(error);
  }
});
