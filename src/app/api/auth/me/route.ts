import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApiResponse, User, Partner } from '@/types'

// Helper function to extract user ID from token
function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [userId] = decoded.split(':')
    return userId || null
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
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid token'
      }, { status: 401 })
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

    return NextResponse.json<ApiResponse<{ user: User; partner: Partner | null }>>({
      success: true,
      data: {
        user: userData,
        partner: partnerData
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
