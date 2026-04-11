import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Low margin threshold (percentage)
const LOW_MARGIN_THRESHOLD = 0.05 // 5%
// High risk transaction amount threshold
const HIGH_RISK_THRESHOLD = 5000000 // 5 million IDR

export async function GET() {
  try {
    // Get all completed transactions
    const completedTransactions = await db.transaction.findMany({
      where: { status: 'COMPLETED' },
      include: {
        paymentType: true,
        partner: {
          include: { user: true }
        }
      }
    })

    // Get all transactions
    const allTransactions = await db.transaction.findMany({
      include: {
        paymentType: true,
        partner: {
          include: { user: true }
        },
        customer: true
      }
    })

    // Get pending transactions
    const pendingTransactions = await db.transaction.findMany({
      where: { status: 'PENDING' },
      include: {
        customer: true,
        paymentType: true
      }
    })

    // Get active partners count
    const activePartners = await db.partner.count({
      where: { status: 'ACTIVE' }
    })

    // Calculate total profit (sum of ownerProfit from completed transactions)
    const totalProfit = completedTransactions.reduce((sum, t) => sum + t.ownerProfit, 0)

    // Calculate total volume (sum of nominal from all transactions)
    const totalVolume = allTransactions.reduce((sum, t) => sum + t.nominal, 0)

    // Get recent transactions (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentTransactions = allTransactions.filter(
      t => new Date(t.createdAt) >= sevenDaysAgo
    )

    // Calculate top 5 partners by volume in last 30 days
    const thirtyDaysAgoForVolume = new Date()
    thirtyDaysAgoForVolume.setDate(thirtyDaysAgoForVolume.getDate() - 30)

    const last30DaysTransactions = allTransactions.filter(
      t => new Date(t.createdAt) >= thirtyDaysAgoForVolume && t.status !== 'CANCELLED'
    )

    const partnerVolumeStats = new Map<string, {
      partnerId: string
      name: string
      tier: string
      totalVolume: number
      transactions: number
    }>()

    last30DaysTransactions.forEach(t => {
      if (t.partner) {
        const existing = partnerVolumeStats.get(t.partnerId!) || {
          partnerId: t.partnerId!,
          name: t.partner.user.name,
          tier: t.partner.tier,
          totalVolume: 0,
          transactions: 0
        }
        existing.totalVolume += t.nominal
        existing.transactions += 1
        partnerVolumeStats.set(t.partnerId!, existing)
      }
    })

    const topPartnersByVolume30Days = Array.from(partnerVolumeStats.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 5)

    // Get top 5 partners by profit
    const partnerProfits = new Map<string, {
      partnerId: string
      name: string
      profit: number
      volume: number
      transactions: number
      tier: string
    }>()

    completedTransactions.forEach(t => {
      if (t.partner) {
        const existing = partnerProfits.get(t.partnerId!) || {
          partnerId: t.partnerId!,
          name: t.partner.user.name,
          profit: 0,
          volume: 0,
          transactions: 0,
          tier: t.partner.tier
        }
        existing.profit += t.partnerProfit
        existing.volume += t.nominal
        existing.transactions += 1
        partnerProfits.set(t.partnerId!, existing)
      }
    })

    const topPartners = Array.from(partnerProfits.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)

    // Get partners close to achieving their target (within 80-100%)
    const allPartners = await db.partner.findMany({
      where: { status: 'ACTIVE' },
      include: { user: true }
    })

    const partnersNearTarget = allPartners
      .map(partner => {
        const progress = partner.targetAmount > 0 
          ? (partner.totalProfit / partner.targetAmount) * 100 
          : 0
        return {
          partnerId: partner.id,
          name: partner.user.name,
          tier: partner.tier,
          totalProfit: partner.totalProfit,
          targetAmount: partner.targetAmount,
          progress: Math.min(progress, 100),
          gap: Math.max(0, partner.targetAmount - partner.totalProfit),
          commissionRate: partner.commissionRate
        }
      })
      .filter(p => p.progress >= 50) // Only show partners above 50% progress
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5)

    // Low margin alerts (net margin below threshold)
    const lowMarginAlerts = allTransactions
      .filter(t => t.status !== 'CANCELLED' && t.nominal > 0)
      .filter(t => {
        const marginPercent = t.netMargin / t.nominal
        return marginPercent < LOW_MARGIN_THRESHOLD
      })
      .map(t => ({
        orderId: t.orderId,
        nominal: t.nominal,
        netMargin: t.netMargin,
        marginPercent: t.nominal > 0 ? (t.netMargin / t.nominal) * 100 : 0,
        status: t.status,
        createdAt: t.createdAt
      }))
      .sort((a, b) => a.marginPercent - b.marginPercent)
      .slice(0, 5)

    // High risk transactions (large amounts pending)
    const highRiskTransactions = pendingTransactions
      .filter(t => t.nominal >= HIGH_RISK_THRESHOLD)
      .map(t => ({
        orderId: t.orderId,
        nominal: t.nominal,
        customerName: t.customer.name,
        paymentType: t.paymentType.name,
        createdAt: t.createdAt
      }))
      .sort((a, b) => b.nominal - a.nominal)

    // Margin health by payment type
    const ccTransactions = completedTransactions.filter(t => t.paymentType.type === 'CC')
    const paylaterTransactions = completedTransactions.filter(t => t.paymentType.type === 'PAYLATER')

    const calculateMarginStats = (transactions: typeof completedTransactions) => {
      if (transactions.length === 0) {
        return { avgMarginPercent: 0, totalVolume: 0, totalProfit: 0, count: 0 }
      }
      const totalVolume = transactions.reduce((sum, t) => sum + t.nominal, 0)
      const totalMargin = transactions.reduce((sum, t) => sum + t.netMargin, 0)
      const totalProfit = transactions.reduce((sum, t) => sum + t.ownerProfit, 0)
      const avgMarginPercent = totalVolume > 0 ? (totalMargin / totalVolume) * 100 : 0
      return { avgMarginPercent, totalVolume, totalProfit, count: transactions.length }
    }

    const ccMarginStats = calculateMarginStats(ccTransactions)
    const paylaterMarginStats = calculateMarginStats(paylaterTransactions)

    // Calculate daily margin trends (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyMarginData: { date: string; ccMargin: number; paylaterMargin: number }[] = []
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayTransactions = completedTransactions.filter(t => {
        const tDate = new Date(t.createdAt).toISOString().split('T')[0]
        return tDate === dateStr
      })

      const dayCC = dayTransactions.filter(t => t.paymentType.type === 'CC')
      const dayPaylater = dayTransactions.filter(t => t.paymentType.type === 'PAYLATER')

      const ccMargin = dayCC.reduce((sum, t) => sum + t.netMargin, 0)
      const paylaterMargin = dayPaylater.reduce((sum, t) => sum + t.netMargin, 0)

      dailyMarginData.push({
        date: dateStr,
        ccMargin: ccMargin,
        paylaterMargin: paylaterMargin
      })
    }

    // Forecast calculation (simple linear extrapolation based on last 30 days)
    const last30DaysVolume = allTransactions
      .filter(t => new Date(t.createdAt) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.nominal, 0)
    
    const last30DaysProfit = completedTransactions
      .filter(t => new Date(t.createdAt) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.ownerProfit, 0)

    const avgDailyVolume = last30DaysVolume / 30
    const avgDailyProfit = last30DaysProfit / 30

    // 30-day forecast
    const forecastData = []
    for (let i = 1; i <= 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      forecastData.push({
        date: date.toISOString().split('T')[0],
        predictedVolume: Math.round(avgDailyVolume * i),
        predictedProfit: Math.round(avgDailyProfit * i)
      })
    }

    // Monthly trend data for forecast chart
    const monthlyTrendData: { date: string; volume: number; profit: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayTransactions = completedTransactions.filter(t => {
        const tDate = new Date(t.createdAt).toISOString().split('T')[0]
        return tDate === dateStr
      })

      monthlyTrendData.push({
        date: dateStr,
        volume: dayTransactions.reduce((sum, t) => sum + t.nominal, 0),
        profit: dayTransactions.reduce((sum, t) => sum + t.ownerProfit, 0)
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        // Stats
        totalProfit,
        totalTransactions: allTransactions.length,
        activePartners,
        totalVolume,
        pendingOrders: pendingTransactions.length,
        completedOrders: completedTransactions.length,
        
        // Alerts
        lowMarginAlerts,
        highRiskTransactions,
        topPartners,
        topPartnersByVolume30Days,
        partnersNearTarget,
        
        // Margin Health
        marginHealth: {
          cc: ccMarginStats,
          paylater: paylaterMarginStats
        },
        marginTrend: dailyMarginData,
        
        // Forecast
        forecast: {
          predicted30DaysVolume: Math.round(avgDailyVolume * 30),
          predicted30DaysProfit: Math.round(avgDailyProfit * 30),
          dailyData: forecastData.slice(0, 7), // Next 7 days
          monthlyTrend: monthlyTrendData
        },
        
        // Recent transactions
        recentTransactions: recentTransactions.slice(0, 10).map(t => ({
          orderId: t.orderId,
          nominal: t.nominal,
          status: t.status,
          paymentType: t.paymentType.name,
          customerName: t.customer.name,
          createdAt: t.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching owner stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch owner stats' },
      { status: 500 }
    )
  }
}
