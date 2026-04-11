import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats/customer-contribution - Get customer profit contribution
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly' // weekly, monthly, yearly
    const partnerId = searchParams.get('partnerId')
    const limit = parseInt(searchParams.get('limit') || '5')

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate = new Date(now)

    switch (period) {
      case 'weekly':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'monthly':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {
      status: 'COMPLETED',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (partnerId) {
      whereClause.partnerId = partnerId
    }

    // Get all transactions in the period
    const transactions = await db.transaction.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            city: true,
            label: true,
          },
        },
        partner: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Calculate total owner profit for percentage calculation
    const totalOwnerProfit = transactions.reduce((sum, t) => sum + t.ownerProfit, 0)

    // Group by customer
    const customerMap = new Map<string, {
      id: string
      name: string
      whatsapp: string
      city: string | null
      label: string
      totalContribution: number
      totalTransactions: number
      totalVolume: number
      partnerBreakdown: Map<string, {
        partnerId: string
        partnerName: string
        contribution: number
        transactions: number
      }>
    }>()

    transactions.forEach((t) => {
      const customerId = t.customerId
      const existing = customerMap.get(customerId)

      if (existing) {
        existing.totalContribution += t.ownerProfit
        existing.totalTransactions += 1
        existing.totalVolume += t.nominal

        // Track partner breakdown
        if (t.partnerId && t.partner) {
          const partnerBreakdown = existing.partnerBreakdown
          const partnerExisting = partnerBreakdown.get(t.partnerId)
          if (partnerExisting) {
            partnerExisting.contribution += t.ownerProfit
            partnerExisting.transactions += 1
          } else {
            partnerBreakdown.set(t.partnerId, {
              partnerId: t.partnerId,
              partnerName: t.partner.user.name,
              contribution: t.ownerProfit,
              transactions: 1,
            })
          }
        }
      } else {
        const partnerBreakdown = new Map<string, {
          partnerId: string
          partnerName: string
          contribution: number
          transactions: number
        }>()

        if (t.partnerId && t.partner) {
          partnerBreakdown.set(t.partnerId, {
            partnerId: t.partnerId,
            partnerName: t.partner.user.name,
            contribution: t.ownerProfit,
            transactions: 1,
          })
        }

        customerMap.set(customerId, {
          id: customerId,
          name: t.customer.name,
          whatsapp: t.customer.whatsapp,
          city: t.customer.city,
          label: t.customer.label,
          totalContribution: t.ownerProfit,
          totalTransactions: 1,
          totalVolume: t.nominal,
          partnerBreakdown,
        })
      }
    })

    // Convert to array and sort by contribution
    const sortedCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalContribution - a.totalContribution)
      .slice(0, limit)
      .map((customer, index) => ({
        id: customer.id,
        name: customer.name,
        whatsapp: customer.whatsapp,
        city: customer.city,
        label: customer.label as 'VIP' | 'REGULAR' | 'NEW' | 'BLACKLIST',
        totalContribution: customer.totalContribution,
        totalTransactions: customer.totalTransactions,
        totalVolume: customer.totalVolume,
        contributionPercent: totalOwnerProfit > 0
          ? (customer.totalContribution / totalOwnerProfit) * 100
          : 0,
        rank: index + 1,
        partnerBreakdown: Array.from(customer.partnerBreakdown.values()),
      }))

    return NextResponse.json({
      success: true,
      data: {
        topCustomers: sortedCustomers,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalOwnerProfit,
        totalCustomers: customerMap.size,
      },
    })
  } catch (error) {
    console.error('Error fetching customer contribution:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data kontribusi customer' },
      { status: 500 }
    )
  }
}
