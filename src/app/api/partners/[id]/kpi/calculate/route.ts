import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/partners/[id]/kpi/calculate - Calculate and update KPIs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    
    // Get year and month from request or use current
    const now = new Date()
    const year = body.year || now.getFullYear()
    const month = body.month || now.getMonth() + 1

    // Check if partner exists
    const partner = await db.partner.findUnique({
      where: { id },
      select: {
        id: true,
        kpiTarget: true,
      },
    })

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      )
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    // Get completed transactions for the month
    const transactions = await db.transaction.findMany({
      where: {
        partnerId: id,
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    })

    // Calculate metrics
    const totalProfit = transactions.reduce((sum, t) => sum + t.partnerProfit, 0)
    const totalVolume = transactions.reduce((sum, t) => sum + t.nominal, 0)
    const totalTrans = transactions.length
    const avgTransaction = totalTrans > 0 ? totalVolume / totalTrans : 0

    // Calculate new customers (customers whose first transaction with this partner is in this month)
    const customerFirstTransMap = new Map<string, Date>()
    const allPartnerTransactions = await db.transaction.findMany({
      where: {
        partnerId: id,
        status: 'COMPLETED',
      },
      include: {
        customer: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    allPartnerTransactions.forEach((t) => {
      const customerId = t.customerId
      if (!customerFirstTransMap.has(customerId)) {
        customerFirstTransMap.set(customerId, t.createdAt)
      }
    })

    // Count new customers this month
    let newCustomers = 0
    const uniqueCustomersThisMonth = new Set(
      transactions.map((t) => t.customerId)
    )
    uniqueCustomersThisMonth.forEach((customerId) => {
      const firstTransDate = customerFirstTransMap.get(customerId)
      if (firstTransDate && firstTransDate >= startDate && firstTransDate <= endDate) {
        newCustomers++
      }
    })

    // Calculate target progress
    const targetProgress = partner.kpiTarget > 0
      ? Math.min(100, (totalVolume / partner.kpiTarget) * 100)
      : 0
    const targetAchieved = targetProgress >= 100

    // Upsert KPI record
    const kpi = await db.partnerKPI.upsert({
      where: {
        partnerId_year_month: {
          partnerId: id,
          year,
          month,
        },
      },
      update: {
        totalProfit,
        totalVolume,
        totalTrans,
        newCustomers,
        avgTransaction,
        targetProgress,
        targetAchieved,
      },
      create: {
        partnerId: id,
        year,
        month,
        totalProfit,
        totalVolume,
        totalTrans,
        newCustomers,
        avgTransaction,
        targetProgress,
        targetAchieved,
      },
    })

    return NextResponse.json({
      success: true,
      data: kpi,
      message: `KPI untuk ${getMonthName(month)} ${year} berhasil dihitung`,
    })
  } catch (error) {
    console.error('Error calculating partner KPI:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal menghitung KPI partner' },
      { status: 500 }
    )
  }
}

// Helper function to get month name in Indonesian
function getMonthName(month: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  return months[month - 1] || ''
}
