import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID harus diisi' },
        { status: 400 }
      )
    }

    const transaction = await db.transaction.findUnique({
      where: { orderId },
      include: {
        customer: true,
        paymentType: true,
        partner: true
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Order tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: transaction.orderId,
        customer: {
          name: transaction.customer.name,
          whatsapp: transaction.customer.whatsapp,
          bank: transaction.customer.bank,
          accountNumber: transaction.customer.accountNumber,
          accountHolder: transaction.customer.accountHolder,
          city: transaction.customer.city
        },
        nominal: transaction.nominal,
        paymentType: {
          name: transaction.paymentType.name,
          type: transaction.paymentType.type
        },
        method: transaction.method,
        paymentFee: transaction.paymentFee,
        totalServiceFee: transaction.totalServiceFee,
        receivedAmount: transaction.receivedAmount,
        status: transaction.status,
        partner: transaction.partner ? {
          name: transaction.partner.user ? (await db.user.findUnique({ where: { id: transaction.partner.userId } }))?.name : null
        } : null,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data order' },
      { status: 500 }
    )
  }
}
