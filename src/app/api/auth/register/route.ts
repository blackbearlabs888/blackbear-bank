import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'
import { ApiResponse, User, Partner } from '@/types'

interface RegisterRequestBody {
  name: string
  email: string
  password: string
  confirmPassword: string
  whatsapp: string
  bankName: string
  accountNumber: string
  accountHolder: string
  city: string
}

// Validation functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePassword(password: string): boolean {
  return password.length >= 6
}

function validateWhatsApp(whatsapp: string): boolean {
  // Indonesian WhatsApp format: 08xxx
  const waRegex = /^08\d{8,12}$/
  return waRegex.test(whatsapp)
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequestBody = await request.json()
    
    const { name, email, password, confirmPassword, whatsapp, bankName, accountNumber, accountHolder, city } = body

    // Validate required fields
    if (!name || !email || !password || !confirmPassword || !whatsapp || !bankName || !accountNumber || !accountHolder || !city) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All fields are required'
      }, { status: 400 })
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // Validate password length
    if (!validatePassword(password)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Password must be at least 6 characters'
      }, { status: 400 })
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Passwords do not match'
      }, { status: 400 })
    }

    // Validate WhatsApp format
    if (!validateWhatsApp(whatsapp)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid WhatsApp number format. Use format: 08xxx (10-14 digits)'
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email already registered'
      }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with partner in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: 'PARTNER'
        }
      })

      // Create partner with default values
      const partner = await tx.partner.create({
        data: {
          userId: user.id,
          bankName,
          accountNumber,
          accountHolder,
          city,
          whatsapp,
          tier: 'Bronze',
          commissionRate: 0.30, // 30% default
          targetAmount: 5000000, // 5 million default
          status: 'ACTIVE',
          totalProfit: 0,
          totalVolume: 0,
          totalTransactions: 0
        }
      })

      return { user, partner }
    })

    // Generate simple token (user ID for now)
    const token = Buffer.from(`${result.user.id}:${Date.now()}`).toString('base64')

    // Prepare response data (exclude password)
    const userData: User = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role as 'OWNER' | 'PARTNER',
      avatar: result.user.avatar,
      createdAt: result.user.createdAt.toISOString(),
      updatedAt: result.user.updatedAt.toISOString()
    }

    const partnerData: Partner = {
      id: result.partner.id,
      userId: result.partner.userId,
      bankName: result.partner.bankName,
      accountNumber: result.partner.accountNumber,
      accountHolder: result.partner.accountHolder,
      city: result.partner.city,
      whatsapp: result.partner.whatsapp,
      tier: result.partner.tier as 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond',
      badge: result.partner.badge as 'Champion' | 'Top Performer' | 'Rising Star' | 'Veteran' | null,
      commissionRate: result.partner.commissionRate,
      targetAmount: result.partner.targetAmount,
      status: result.partner.status as 'ACTIVE' | 'SUSPENDED',
      totalProfit: result.partner.totalProfit,
      totalVolume: result.partner.totalVolume,
      totalTransactions: result.partner.totalTransactions,
      createdAt: result.partner.createdAt.toISOString(),
      updatedAt: result.partner.updatedAt.toISOString()
    }

    return NextResponse.json<ApiResponse<{ user: User; partner: Partner; token: string }>>({
      success: true,
      data: {
        user: userData,
        partner: partnerData,
        token
      },
      message: 'Registration successful'
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
