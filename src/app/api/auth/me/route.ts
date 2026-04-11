import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApiResponse, User, Partner } from '@/types'

// Token max age: 7 days
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Helper function to extract user ID from token with expiry validation
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
        return null
      }
    }

    return userId
  } catch {
    return null
  }
}

// Helper function to get token from request
function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
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
      // Ignore
    }
  }

  // Check custom header
  const customToken = request.headers.get('x-auth-token')
  if (customToken) {
    return customToken
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No authentication token provided'
      }, { status: 401 })
    }

    const userId = getUserIdFromToken(token)

    if (!userId) {
      // Token expired or invalid — clear cookies
      const response = NextResponse.json<ApiResponse>({
        success: false,
        error: 'Token expired'
      }, { status: 401 })
      response.cookies.set('token', '', { maxAge: 0, path: '/' })
      response.cookies.set('blackbear-auth', '', { maxAge: 0, path: '/' })
      return response
    }

    // Find user
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        partner: true
      }
    })

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // Prepare response data (exclude password)
    const userData: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'OWNER' | 'PARTNER',
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }

    let partnerData: Partner | null = null

    // Include partner data if user is a partner
    if (user.partner) {
      partnerData = {
        id: user.partner.id,
        userId: user.partner.userId,
        bankName: user.partner.bankName,
        accountNumber: user.partner.accountNumber,
        accountHolder: user.partner.accountHolder,
        city: user.partner.city,
        whatsapp: user.partner.whatsapp,
        tier: user.partner.tier as 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond',
        badge: user.partner.badge as 'Champion' | 'Top Performer' | 'Rising Star' | 'Veteran' | null,
        commissionRate: user.partner.commissionRate,
        targetAmount: user.partner.targetAmount,
        status: user.partner.status as 'ACTIVE' | 'SUSPENDED',
        totalProfit: user.partner.totalProfit,
        totalVolume: user.partner.totalVolume,
        totalTransactions: user.partner.totalTransactions,
        createdAt: user.partner.createdAt.toISOString(),
        updatedAt: user.partner.updatedAt.toISOString()
      }
    }

    return NextResponse.json<ApiResponse<{ user: User; partner: Partner | null; token: string }>>({
      success: true,
      data: {
        user: userData,
        partner: partnerData,
        token, // Return token so client can re-sync
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
