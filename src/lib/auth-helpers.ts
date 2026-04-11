import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

// Token expiry: 7 days (longer than session-based, but still validates)
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Helper function to extract user ID from token
 * Token format: base64("userId:timestamp")
 * Validates that token is not expired
 */
export function getUserIdFromToken(token: string): string | null {
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
 * Check if token is expired (for client-side pre-check)
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parts = decoded.split(':')
    const timestamp = parts[1]
    if (!timestamp) return true
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    return tokenAge > TOKEN_MAX_AGE_MS
  } catch {
    return true
  }
}

/**
 * Helper function to get token from request
 * Checks multiple sources: Authorization header, cookie, zustand cookie, custom header
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7)
  }

  // Check cookie
  const tokenCookie = request.cookies.get('token')
  if (tokenCookie) {
    return tokenCookie.value
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

  // Check custom header
  const customToken = request.headers.get('x-auth-token')
  if (customToken) {
    return customToken
  }

  return null
}

/**
 * Interface for authenticated user data
 */
export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'PARTNER'
  partnerId: string | null // The partner's ID if user is a PARTNER
}

/**
 * Get the authenticated user from request
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const token = getTokenFromRequest(request)
  
  if (!token) {
    return null
  }
  
  const userId = getUserIdFromToken(token)
  
  if (!userId) {
    return null
  }
  
  // Find user with partner data
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      partner: {
        select: { id: true }
      }
    }
  })
  
  if (!user) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'OWNER' | 'PARTNER',
    partnerId: user.partner?.id || null
  }
}

/**
 * Check if user is owner
 */
export function isOwner(user: AuthenticatedUser | null): boolean {
  return user?.role === 'OWNER'
}

/**
 * Check if user is partner
 */
export function isPartner(user: AuthenticatedUser | null): boolean {
  return user?.role === 'PARTNER'
}
