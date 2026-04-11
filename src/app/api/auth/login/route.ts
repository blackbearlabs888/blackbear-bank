import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'
import { ApiResponse, User, Partner } from '@/types'

interface LoginRequestBody {
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequestBody = await request.json()
    
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 })
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        partner: true
      }
    })

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // Generate simple token (user ID for now)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')

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
        token
      },
      message: 'Login successful'
    }, { status: 200 })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
