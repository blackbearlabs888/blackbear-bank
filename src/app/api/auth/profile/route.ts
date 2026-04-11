import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'
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

interface ProfileUpdateBody {
  name?: string
  email?: string
  avatar?: string
  password?: string
  currentPassword?: string
}

// GET - Fetch current user profile
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
    console.error('Get profile error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    const body: ProfileUpdateBody = await request.json()
    const { name, email, avatar, password, currentPassword } = body

    // Build update data
    const updateData: {
      name?: string
      email?: string
      avatar?: string | null
      password?: string
    } = {}

    // Update name if provided
    if (name !== undefined && name.trim()) {
      updateData.name = name.trim()
    }

    // Update email if provided and different
    if (email !== undefined && email.trim()) {
      const normalizedEmail = email.toLowerCase().trim()
      
      // Check if email is already taken by another user
      if (normalizedEmail !== user.email.toLowerCase()) {
        const existingUser = await db.user.findUnique({
          where: { email: normalizedEmail }
        })
        
        if (existingUser) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Email is already taken'
          }, { status: 400 })
        }
      }
      
      updateData.email = normalizedEmail
    }

    // Update avatar if provided
    if (avatar !== undefined) {
      updateData.avatar = avatar || null
    }

    // Update password if provided
    if (password && password.trim()) {
      // Validate password length
      if (password.length < 6) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Password must be at least 6 characters'
        }, { status: 400 })
      }

      // Validate current password
      if (!currentPassword) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Current password is required to set a new password'
        }, { status: 400 })
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password)
      if (!isValidPassword) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Current password is incorrect'
        }, { status: 400 })
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No changes to update'
      }, { status: 400 })
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        partner: true
      }
    })

    // If name or email changed and user is owner, also update site config
    if (user.role === 'OWNER' && (updateData.name || updateData.email || updateData.avatar !== undefined)) {
      const siteConfigUpdateData: {
        ownerName?: string
        ownerEmail?: string
        ownerAvatar?: string | null
      } = {}
      
      if (updateData.name) siteConfigUpdateData.ownerName = updateData.name
      if (updateData.email) siteConfigUpdateData.ownerEmail = updateData.email
      if (updateData.avatar !== undefined) siteConfigUpdateData.ownerAvatar = updateData.avatar || null
      
      const siteConfig = await db.siteConfig.findFirst()
      if (siteConfig) {
        await db.siteConfig.update({
          where: { id: siteConfig.id },
          data: siteConfigUpdateData
        })
      }
    }

    // Prepare response data (exclude password)
    const userData: User = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role as 'OWNER' | 'PARTNER',
      avatar: updatedUser.avatar,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString()
    }

    let partnerData: Partner | null = null

    // Include partner data if user is a partner
    if (updatedUser.partner) {
      partnerData = {
        id: updatedUser.partner.id,
        userId: updatedUser.partner.userId,
        bankName: updatedUser.partner.bankName,
        accountNumber: updatedUser.partner.accountNumber,
        accountHolder: updatedUser.partner.accountHolder,
        city: updatedUser.partner.city,
        whatsapp: updatedUser.partner.whatsapp,
        tier: updatedUser.partner.tier as 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond',
        badge: updatedUser.partner.badge as 'Champion' | 'Top Performer' | 'Rising Star' | 'Veteran' | null,
        commissionRate: updatedUser.partner.commissionRate,
        targetAmount: updatedUser.partner.targetAmount,
        status: updatedUser.partner.status as 'ACTIVE' | 'SUSPENDED',
        totalProfit: updatedUser.partner.totalProfit,
        totalVolume: updatedUser.partner.totalVolume,
        totalTransactions: updatedUser.partner.totalTransactions,
        createdAt: updatedUser.partner.createdAt.toISOString(),
        updatedAt: updatedUser.partner.updatedAt.toISOString()
      }
    }

    return NextResponse.json<ApiResponse<{ user: User; partner: Partner | null }>>({
      success: true,
      data: {
        user: userData,
        partner: partnerData
      },
      message: 'Profile updated successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
