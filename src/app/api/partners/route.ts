import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTierFromProfit, getTierProgress } from '@/lib/calculations'
import bcrypt from 'bcrypt'

// GET /api/partners - List all partners
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tier = searchParams.get('tier')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status && ['ACTIVE', 'SUSPENDED'].includes(status)) {
      where.status = status
    }

    if (tier && ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].includes(tier)) {
      where.tier = tier
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { whatsapp: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    const partners = await db.partner.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate target progress for each partner (based on PROFIT, not volume)
    const partnersWithProgress = partners.map((partner) => {
      const targetProgress = partner.targetAmount > 0
        ? Math.min(100, (partner.totalProfit / partner.targetAmount) * 100)
        : 0

      const tierProgress = getTierProgress(partner.totalProfit)
      const calculatedTier = getTierFromProfit(partner.totalProfit)

      return {
        ...partner,
        targetProgress,
        tierProgress,
        calculatedTier,
        commissionRate: partner.commissionRate * 100, // Convert to percentage
      }
    })

    return NextResponse.json({
      success: true,
      data: partnersWithProgress,
      total: partnersWithProgress.length,
    })
  } catch (error) {
    console.error('Error fetching partners:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data partner' },
      { status: 500 }
    )
  }
}

// POST /api/partners - Add new partner (by owner)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      whatsapp,
      password,
      bankName,
      accountNumber,
      accountHolder,
      city,
      tier = 'Bronze',
      status = 'ACTIVE',
      commissionRate = 30,
      targetAmount = 5000000,
    } = body

    // Validate required fields
    if (!name || !email || !whatsapp || !password || !bankName || !accountNumber || !accountHolder || !city) {
      return NextResponse.json(
        { success: false, error: 'Semua field wajib diisi' },
        { status: 400 }
      )
    }

    // Check if email already exists (case-insensitive)
    const normalizedEmail = email.toLowerCase()
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar' },
        { status: 400 }
      )
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with PARTNER role
    const user = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'PARTNER',
      },
    })

    // Create partner profile
    const partner = await db.partner.create({
      data: {
        userId: user.id,
        bankName,
        accountNumber,
        accountHolder,
        city,
        whatsapp,
        tier,
        status,
        commissionRate: commissionRate / 100, // Convert from percentage
        targetAmount,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
    })

    // TODO: Send welcome notification (placeholder)
    // In production, this would send an email or WhatsApp message

    return NextResponse.json({
      success: true,
      data: {
        ...partner,
        commissionRate: partner.commissionRate * 100,
        targetProgress: 0,
        tierProgress: 0,
        calculatedTier: tier,
      },
      message: 'Partner berhasil ditambahkan',
    })
  } catch (error) {
    console.error('Error creating partner:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan partner' },
      { status: 500 }
    )
  }
}
