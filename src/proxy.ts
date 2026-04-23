import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/owner/dashboard', '/partner/dashboard'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes - they handle auth internally
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if the path is a protected route
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for sessionId cookie
  const sessionId = request.cookies.get('sessionId')?.value;

  if (!sessionId) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/owner/dashboard/:path*', '/partner/dashboard/:path*'],
};
