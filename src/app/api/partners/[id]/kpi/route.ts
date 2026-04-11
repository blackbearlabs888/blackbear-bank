import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/partners/[id]/kpi - Get partner KPI data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // Check if partner exists
    const partner = await db.partner.findUnique({
      where: { id },
      select: {
        id: true,
        kpiTarget: true,
        tier: true,
        badge: true,
      },
    })

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner tidak ditemukan' },
        { status: 404 }
      )
    }

    const now = new Date()
    const currentYear = year ? parseInt(year) : now.getFullYear()
    const currentMonth = month ? parseInt(month) : now.getMonth() + 1

    // Get current month KPI
    const currentKPI = await db.partnerKPI.findUnique({
      where: {
        partnerId_year_month: {
          partnerId: id,
          year: currentYear,
          month: currentMonth,
        },
      },
    })

    // Get previous month KPI for trend calculation
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

    const previousKPI = await db.partnerKPI.findUnique({
      where: {
        partnerId_year_month: {
          partnerId: id,
          year: prevYear,
          month: prevMonth,
        },
      },
    })

    // Get last 12 months KPI data for chart
    const monthlyData = await db.partnerKPI.findMany({
      where: {
        partnerId: id,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12,
    })

    // Get achievement history
    const achievementHistory = await db.partnerKPI.findMany({
      where: {
        partnerId: id,
        targetAchieved: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 24,
      select: {
        year: true,
        month: true,
        targetAchieved: true,
        targetProgress: true,
      },
    })

    // Calculate trends
    const profitTrend = previousKPI
      ? previousKPI.totalProfit > 0
        ? ((currentKPI?.totalProfit || 0) - previousKPI.totalProfit) / previousKPI.totalProfit * 100
        : 0
      : 0
    const volumeTrend = previousKPI
      ? previousKPI.totalVolume > 0
        ? ((currentKPI?.totalVolume || 0) - previousKPI.totalVolume) / previousKPI.totalVolume * 100
        : 0
      : 0
    const transTrend = previousKPI
      ? previousKPI.totalTrans > 0
        ? ((currentKPI?.totalTrans || 0) - previousKPI.totalTrans) / previousKPI.totalTrans * 100
        : 0
      : 0

    // Build current month KPI with trend
    const currentMonthKPI = currentKPI || {
      id: '',
      partnerId: id,
      year: currentYear,
      month: currentMonth,
      totalProfit: 0,
      totalVolume: 0,
      totalTrans: 0,
      newCustomers: 0,
      avgTransaction: 0,
      targetProgress: 0,
      targetAchieved: false,
      createdAt: new Date().toISOString(),
    }

    const currentWithTrend = {
      ...currentMonthKPI,
      previousMonth: previousKPI,
      profitTrend: Math.round(profitTrend * 10) / 10,
      volumeTrend: Math.round(volumeTrend * 10) / 10,
      transTrend: Math.round(transTrend * 10) / 10,
    }

    // Calculate total achievements
    const totalAchievements = await db.partnerKPI.count({
      where: {
        partnerId: id,
        targetAchieved: true,
      },
    })

    // Calculate average progress
    const avgProgressResult = await db.partnerKPI.aggregate({
      where: {
        partnerId: id,
      },
      _avg: {
        targetProgress: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        currentMonth: currentWithTrend,
        monthlyData: monthlyData.reverse(), // Oldest first for chart
        achievementHistory,
        totalAchievements,
        avgProgress: avgProgressResult._avg.targetProgress || 0,
        kpiTarget: partner.kpiTarget,
      },
    })
  } catch (error) {
    console.error('Error fetching partner KPI:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data KPI partner' },
      { status: 500 }
    )
  }
}
