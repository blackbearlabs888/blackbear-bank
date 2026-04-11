import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOrderId, validateWhatsApp, formatWhatsApp, calculateTransactionFees } from '@/lib/calculations'

// GET /api/transactions - List transactions with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const partnerId = searchParams.get('partnerId')
    const customerId = searchParams.get('customerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const days = searchParams.get('days') // For recent transactions

    // Build where clause
    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (partnerId) {
      where.partnerId = partnerId
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate)
      }
    }

    // For recent transactions (e.g., last 7 days)
    if (days) {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(days))
      where.createdAt = {
        gte: daysAgo
      }
    }

    // Get total count
    const total = await db.transaction.count({ where })

    // Get transactions
    const transactions = await db.transaction.findMany({
      where,
      include: {
        customer: true,
        partner: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        paymentType: true,
        marketplace: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    return NextResponse.json({
      success: true,
      data: transactions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Create new transaction (owner input)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.nominal || body.nominal <= 0) {
      return NextResponse.json(
        { success: false, error: 'Nominal harus lebih dari 0' },
        { status: 400 }
      )
    }

    if (!body.paymentTypeId) {
      return NextResponse.json(
        { success: false, error: 'Payment type harus dipilih' },
        { status: 400 }
      )
    }

    if (!body.method || !['ONLINE', 'COD'].includes(body.method)) {
      return NextResponse.json(
        { success: false, error: 'Method harus ONLINE atau COD' },
        { status: 400 }
      )
    }

    // Check if we have an existing customer or need to create new one
    let customer
    
    if (body.customerId) {
      // Use existing customer
      customer = await db.customer.findUnique({
        where: { id: body.customerId }
      })

      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Customer tidak ditemukan' },
          { status: 400 }
        )
      }
    } else if (body.newCustomer) {
      // Create new customer
      const { name, whatsapp, bank, accountNumber, accountHolder, city, label } = body.newCustomer

      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Nama customer harus diisi' },
          { status: 400 }
        )
      }

      if (!whatsapp || !validateWhatsApp(whatsapp)) {
        return NextResponse.json(
          { success: false, error: 'Format WhatsApp tidak valid' },
          { status: 400 }
        )
      }

      // Check if customer with this WhatsApp already exists
      const formattedWhatsapp = formatWhatsApp(whatsapp)
      const existingCustomer = await db.customer.findFirst({
        where: { whatsapp: formattedWhatsapp }
      })

      if (existingCustomer) {
        // Update existing customer
        customer = await db.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name: name.trim(),
            bank: bank?.trim() || existingCustomer.bank,
            accountNumber: accountNumber?.trim() || existingCustomer.accountNumber,
            accountHolder: accountHolder?.trim() || existingCustomer.accountHolder,
            city: city?.trim() || existingCustomer.city,
            label: label || existingCustomer.label
          }
        })
      } else {
        // Create new customer
        customer = await db.customer.create({
          data: {
            name: name.trim(),
            whatsapp: formattedWhatsapp,
            bank: bank?.trim() || null,
            accountNumber: accountNumber?.trim() || null,
            accountHolder: accountHolder?.trim() || null,
            city: city?.trim() || null,
            label: label || 'NEW',
            partnerId: body.partnerId || null
          }
        })
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Customer ID atau data customer baru harus disediakan' },
        { status: 400 }
      )
    }

    // Get payment type
    const paymentType = await db.paymentType.findUnique({
      where: { id: body.paymentTypeId }
    })

    if (!paymentType) {
      return NextResponse.json(
        { success: false, error: 'Payment type tidak ditemukan' },
        { status: 400 }
      )
    }

    // Get marketplace if provided
    let marketplace = null
    if (body.marketplaceId) {
      marketplace = await db.marketplace.findUnique({
        where: { id: body.marketplaceId }
      })
    }

    // Get partner if provided
    let partner = null
    if (body.partnerId) {
      partner = await db.partner.findUnique({
        where: { id: body.partnerId }
      })
    }

    // Generate unique order ID
    const orderId = generateOrderId()

    // Calculate fees
    // IMPORTANT: partnerRate should be 0 when there's no partner (owner gets all margin)
    // When there's a partner, use their commission rate
    const partnerRate = partner ? partner.commissionRate : 0
    
    const feeCalculation = calculateTransactionFees(
      body.nominal,
      {
        id: paymentType.id,
        name: paymentType.name,
        type: paymentType.type as 'CC' | 'PAYLATER',
        threshold: paymentType.threshold,
        onlineFeePercent: paymentType.onlineFeePercent,
        onlineFeeFixed: paymentType.onlineFeeFixed,
        codFeePercent: paymentType.codFeePercent,
        codFeeFixed: paymentType.codFeeFixed,
        status: paymentType.status as 'ACTIVE' | 'INACTIVE',
        createdAt: paymentType.createdAt.toISOString(),
        updatedAt: paymentType.updatedAt.toISOString()
      },
      marketplace ? {
        id: marketplace.id,
        name: marketplace.name,
        feePercent: marketplace.feePercent,
        logo: marketplace.logo,
        status: marketplace.status as 'ACTIVE' | 'INACTIVE',
        createdAt: marketplace.createdAt.toISOString(),
        updatedAt: marketplace.updatedAt.toISOString()
      } : null,
      body.method,
      partnerRate
    )

    // Determine status based on source
    // - Partner creates transaction -> status = 'PENDING' (needs owner verification)
    // - Owner creates transaction -> status = 'VERIFIED' (auto-verified)
    const createdByPartner = body.source === 'PARTNER'
    const defaultStatus = createdByPartner ? 'PENDING' : 'VERIFIED'

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        orderId,
        customerId: customer.id,
        partnerId: body.partnerId || null,
        nominal: body.nominal,
        paymentTypeId: body.paymentTypeId,
        marketplaceId: body.marketplaceId || null,
        method: body.method,
        paymentFee: feeCalculation.paymentFee,
        platformFee: feeCalculation.platformFee,
        netMargin: feeCalculation.netMargin,
        partnerProfit: feeCalculation.partnerProfit,
        ownerProfit: feeCalculation.ownerProfit,
        totalServiceFee: feeCalculation.totalServiceFee,
        receivedAmount: feeCalculation.receivedAmount,
        status: defaultStatus
      },
      include: {
        customer: true,
        partner: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        paymentType: true,
        marketplace: true
      }
    })

    return NextResponse.json({
      success: true,
      data: transaction
    })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat membuat transaksi' },
      { status: 500 }
    )
  }
}
