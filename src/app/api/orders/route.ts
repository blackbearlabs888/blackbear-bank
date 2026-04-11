import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOrderId, validateWhatsApp, formatWhatsApp, calculateTransactionFees } from '@/lib/calculations'

interface CreateOrderRequest {
  name: string
  whatsapp: string
  bank?: string
  accountNumber?: string
  accountHolder?: string
  nominal: number
  paymentTypeId: string
  method: 'ONLINE' | 'COD'
  city: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json()
    
    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama harus diisi' },
        { status: 400 }
      )
    }

    if (!body.whatsapp || !validateWhatsApp(body.whatsapp)) {
      return NextResponse.json(
        { success: false, error: 'Format WhatsApp tidak valid (contoh: 08xxxxxxxxxx)' },
        { status: 400 }
      )
    }

    if (!body.nominal || body.nominal <= 0) {
      return NextResponse.json(
        { success: false, error: 'Nominal gestun harus lebih dari 0' },
        { status: 400 }
      )
    }

    if (!body.paymentTypeId) {
      return NextResponse.json(
        { success: false, error: 'Payment type harus dipilih' },
        { status: 400 }
      )
    }

    // If bank is filled, account number and holder are required
    if (body.bank && body.bank.trim()) {
      if (!body.accountNumber || !body.accountNumber.trim()) {
        return NextResponse.json(
          { success: false, error: 'No Rekening harus diisi jika bank diisi' },
          { status: 400 }
        )
      }
      if (!body.accountHolder || !body.accountHolder.trim()) {
        return NextResponse.json(
          { success: false, error: 'Pemilik Rekening harus diisi jika bank diisi' },
          { status: 400 }
        )
      }
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

    // Format WhatsApp
    const formattedWhatsapp = formatWhatsApp(body.whatsapp)

    // Find or create customer
    let customer = await db.customer.findFirst({
      where: { whatsapp: formattedWhatsapp }
    })

    if (!customer) {
      customer = await db.customer.create({
        data: {
          name: body.name.trim(),
          whatsapp: formattedWhatsapp,
          bank: body.bank?.trim() || null,
          accountNumber: body.accountNumber?.trim() || null,
          accountHolder: body.accountHolder?.trim() || null,
          city: body.city?.trim() || null,
          label: 'NEW',
          partnerId: null
        }
      })
    } else {
      // Update customer info if provided
      await db.customer.update({
        where: { id: customer.id },
        data: {
          name: body.name.trim(),
          bank: body.bank?.trim() || customer.bank,
          accountNumber: body.accountNumber?.trim() || customer.accountNumber,
          accountHolder: body.accountHolder?.trim() || customer.accountHolder,
          city: body.city?.trim() || customer.city
        }
      })
    }

    // Generate unique order ID
    const orderId = generateOrderId()

    // Calculate fees
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
      null, // No marketplace for manual orders
      body.method
    )

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        orderId,
        customerId: customer.id,
        partnerId: null, // No partner for manual orders
        nominal: body.nominal,
        paymentTypeId: body.paymentTypeId,
        marketplaceId: null,
        method: body.method,
        paymentFee: feeCalculation.paymentFee,
        platformFee: feeCalculation.platformFee,
        netMargin: feeCalculation.netMargin,
        partnerProfit: feeCalculation.partnerProfit,
        ownerProfit: feeCalculation.ownerProfit,
        totalServiceFee: feeCalculation.totalServiceFee,
        receivedAmount: feeCalculation.receivedAmount,
        status: 'PENDING'
      },
      include: {
        customer: true,
        paymentType: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: transaction.orderId,
        customerName: transaction.customer.name,
        nominal: transaction.nominal,
        totalServiceFee: transaction.totalServiceFee,
        receivedAmount: transaction.receivedAmount,
        status: transaction.status,
        createdAt: transaction.createdAt
      }
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat membuat order' },
      { status: 500 }
    )
  }
}
