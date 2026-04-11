import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that are always allowed during maintenance
const ALWAYS_ALLOWED_PATHS = [
  '/api',
  '/maintenance',
  '/login',
  '/_next',
  '/favicon.ico',
  '/images',
]

// Paths that should be blocked during maintenance
const BLOCKED_PATHS = [
  '/order',
  '/track',
  '/register',
  '/partner',
]

// Owner paths that need owner verification during maintenance
const OWNER_PATHS = [
  '/owner',
]

// Token max age: 7 days
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Check if a path matches any of the patterns
 */
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => pathname.startsWith(pattern))
}

/**
 * Check if the request is for a static file
 */
function isStaticFile(pathname: string): boolean {
  const staticExtensions = ['.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot']
  return staticExtensions.some(ext => pathname.endsWith(ext))
}

/**
 * Get user ID from token with expiry validation
 */
function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parts = decoded.split(':')
    const userId = parts[0]
    const timestamp = parts[1]

    if (!userId) return null

    // Validate token timestamp — reject if expired
    if (timestamp) {
      const tokenAge = Date.now() - parseInt(timestamp, 10)
      if (tokenAge > TOKEN_MAX_AGE_MS) {
        return null // Token expired
      }
    }

    return userId
  } catch {
    return null
  }
}

/**
 * Get token from request
 */
function getTokenFromRequest(request: NextRequest): string | null {
  // Check cookie
  const tokenCookie = request.cookies.get('token')
  if (tokenCookie) {
    return tokenCookie.value
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check custom header
  const customToken = request.headers.get('x-auth-token')
  if (customToken) {
    return customToken
  }

  // Check Zustand persist cookie (blackbear-auth)
  const zustandCookie = request.cookies.get('blackbear-auth')
  if (zustandCookie) {
    try {
      const parsed = JSON.parse(zustandCookie.value)
      if (parsed.state?.token) {
        return parsed.state.token
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null
}

/**
 * Check if user is owner by making an internal API call
 */
async function checkIsOwner(userId: string): Promise<boolean> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/auth/check-role?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) return false

    const result = await response.json()
    return result.success && result.data?.role === 'OWNER'
  } catch (error) {
    console.error('Error checking owner status:', error)
    // FIX: On error, DON'T block — let the request through
    // Previously returned false which would redirect to login/maintenance
    // Now we allow access to avoid false-positive logouts
    return true
  }
}

/**
 * Fetch maintenance status
 */
async function getMaintenanceStatus(): Promise<{ maintenanceMode: boolean }> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/maintenance/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 5 seconds to reduce database load
      next: { revalidate: 5 },
    })

    if (!response.ok) {
      return { maintenanceMode: false }
    }

    const result = await response.json()
    return {
      maintenanceMode: result.data?.maintenanceMode ?? false,
    }
  } catch (error) {
    console.error('Error fetching maintenance status:', error)
    // FIX: Default to false on error to avoid blocking all traffic
    return { maintenanceMode: false }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip for static files
  if (isStaticFile(pathname)) {
    return NextResponse.next()
  }

  // Check maintenance status
  const { maintenanceMode } = await getMaintenanceStatus()

  // If maintenance mode is OFF, continue normally
  if (!maintenanceMode) {
    return NextResponse.next()
  }

  // Maintenance mode is ON

  // Always allow certain paths
  if (matchesPath(pathname, ALWAYS_ALLOWED_PATHS)) {
    return NextResponse.next()
  }

  // Block blocked paths
  if (matchesPath(pathname, BLOCKED_PATHS)) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  // For owner paths, verify the user is an owner
  if (matchesPath(pathname, OWNER_PATHS)) {
    const token = getTokenFromRequest(request)

    if (!token) {
      // No token, redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const userId = getUserIdFromToken(token)

    if (!userId) {
      // Invalid/expired token, redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check if user is owner
    const isOwner = await checkIsOwner(userId)

    if (!isOwner) {
      // Not an owner, redirect to maintenance page
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }

    // User is owner, allow access
    return NextResponse.next()
  }

  // For all other paths during maintenance, redirect to maintenance page
  return NextResponse.redirect(new URL('/maintenance', request.url))
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|public).*)',
  ],
}
