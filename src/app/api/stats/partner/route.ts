import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTierProgress, getGapToNextTier, getTierFromProfit } from '@/lib/calculations'

// Tier thresholds configuration
const TIER_THRESHOLDS = [
  { name: 'Bronze', min: 0, max: 5000000 },
  { name: 'Silver', min: 5000000, max: 10000000 },
  { name: 'Gold', min: 10000000, max: 25000000 },
  { name: 'Platinum', min: 25000000, max: 50000000 },
  { name: 'Diamond', min: 50000000, max: Infinity }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partnerId')

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Get partner data
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
      include: { user: true }
    })

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Get current month's date range
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Get partner's transactions for current month
    const monthlyTransactions = await db.transaction.findMany({
      where: {
        partnerId: partnerId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        paymentType: true,
        customer: true
      }
    })

    // Calculate current month stats
    const completedMonthly = monthlyTransactions.filter(t => t.status === 'COMPLETED')
    const pendingMonthly = monthlyTransactions.filter(t => t.status === 'PENDING')

    const monthlyProfit = completedMonthly.reduce((sum, t) => sum + t.partnerProfit, 0)
    const monthlyVolume = completedMonthly.reduce((sum, t) => sum + t.nominal, 0)
    const monthlyTransactionsCount = completedMonthly.length
    const pendingOrdersCount = pendingMonthly.length

    // Get total profit for tier calculation
    const allPartnerTransactions = await db.transaction.findMany({
      where: {
        partnerId: partnerId,
        status: 'COMPLETED'
      }
    })
    const totalProfit = allPartnerTransactions.reduce((sum, t) => sum + t.partnerProfit, 0)

    // Calculate tier progress
    const tierProgress = getTierProgress(totalProfit)
    const gapToNextTier = getGapToNextTier(totalProfit)
    const calculatedTier = getTierFromProfit(totalProfit)

    // Get current tier info
    const currentTierIndex = TIER_THRESHOLDS.findIndex(
      tier => totalProfit >= tier.min && totalProfit < tier.max
    )
    const nextTier = currentTierIndex < TIER_THRESHOLDS.length - 1 
      ? TIER_THRESHOLDS[currentTierIndex + 1] 
      : null

    // Get active announcements for running text
    const now_date = new Date()
    const activeAnnouncements = await db.announcement.findMany({
      where: {
        status: 'ACTIVE',
        type: 'INFO',
        startDate: { lte: now_date },
        endDate: { gte: now_date }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Get leaderboard (top 5 partners) based on current month
    const allPartners = await db.partner.findMany({
      where: { status: 'ACTIVE' },
      include: { user: true }
    })

    // Get all completed transactions for current month with partner info
    const allMonthlyCompleted = await db.transaction.findMany({
      where: {
        status: 'COMPLETED',
        partnerId: { not: null },
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })

    // Calculate partner rankings for current month
    const partnerMonthlyStats = new Map<string, {
      partnerId: string
      name: string
      profit: number
      volume: number
      transactions: number
      tier: string
      badge: string | null
    }>()

    allMonthlyCompleted.forEach(t => {
      if (t.partnerId) {
        const existing = partnerMonthlyStats.get(t.partnerId) || {
          partnerId: t.partnerId,
          name: '',
          profit: 0,
          volume: 0,
          transactions: 0,
          tier: 'Bronze',
          badge: null
        }
        existing.profit += t.partnerProfit
        existing.volume += t.nominal
        existing.transactions += 1
        partnerMonthlyStats.set(t.partnerId, existing)
      }
    })

    // Add partner names and tier info
    allPartners.forEach(p => {
      const stats = partnerMonthlyStats.get(p.id)
      if (stats) {
        stats.name = p.user.name
        stats.tier = p.tier
        stats.badge = p.badge
      } else {
        // Partner with no transactions this month
        partnerMonthlyStats.set(p.id, {
          partnerId: p.id,
          name: p.user.name,
          profit: 0,
          volume: 0,
          transactions: 0,
          tier: p.tier,
          badge: p.badge
        })
      }
    })

    // Sort by profit and get top 5
    const leaderboard = Array.from(partnerMonthlyStats.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }))

    // Find partner's rank position
    const allRankings = Array.from(partnerMonthlyStats.values())
      .sort((a, b) => b.profit - a.profit)
    
    const partnerRankIndex = allRankings.findIndex(p => p.partnerId === partnerId)
    const partnerRank = partnerRankIndex >= 0 ? partnerRankIndex + 1 : allRankings.length

    // Calculate gap to next rank (if not in top 5)
    let gapToNextRank = 0
    if (partnerRank > 1 && partnerRankIndex > 0) {
      const nextRankPartner = allRankings[partnerRankIndex - 1]
      const currentPartnerStats = allRankings[partnerRankIndex]
      gapToNextRank = nextRankPartner.profit - currentPartnerStats.profit
    }

    // Calculate top 5 partners by volume in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const last30DaysTransactions = await db.transaction.findMany({
      where: {
        partnerId: { not: null },
        createdAt: {
          gte: thirtyDaysAgo
        },
        status: { not: 'CANCELLED' }
      },
      include: {
        partner: {
          include: { user: true }
        }
      }
    })

    const partnerVolumeStats = new Map<string, {
      partnerId: string
      name: string
      tier: string
      totalVolume: number
      transactions: number
      avatar?: string | null
    }>()

    last30DaysTransactions.forEach(t => {
      if (t.partnerId && t.partner) {
        const existing = partnerVolumeStats.get(t.partnerId) || {
          partnerId: t.partnerId,
          name: t.partner.user.name,
          tier: t.partner.tier,
          totalVolume: 0,
          transactions: 0,
          avatar: t.partner.user.avatar
        }
        existing.totalVolume += t.nominal
        existing.transactions += 1
        partnerVolumeStats.set(t.partnerId, existing)
      }
    })

    const topPartnersByVolume30Days = Array.from(partnerVolumeStats.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 5)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }))

    // Find partner's volume rank
    const allVolumeRankings = Array.from(partnerVolumeStats.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
    
    const partnerVolumeRankIndex = allVolumeRankings.findIndex(p => p.partnerId === partnerId)
    const partnerVolumeRank = partnerVolumeRankIndex >= 0 ? partnerVolumeRankIndex + 1 : allVolumeRankings.length + 1

    // Calculate gap to next volume rank
    let gapToNextVolumeRank = 0
    if (partnerVolumeRank > 1 && partnerVolumeRankIndex > 0) {
      const nextRankPartner = allVolumeRankings[partnerVolumeRankIndex - 1]
      const currentPartnerStats = allVolumeRankings[partnerVolumeRankIndex]
      if (currentPartnerStats) {
        gapToNextVolumeRank = nextRankPartner.totalVolume - currentPartnerStats.totalVolume
      }
    }

    // Get monthly champion badge history
    const monthlyBadgeHistory = await db.monthlyRanking.findMany({
      where: {
        partnerId: partnerId,
        badge: { not: null }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ],
      take: 12
    })

    // Calculate target progress
    const targetProgress = partner.targetAmount > 0 
      ? Math.min(100, (monthlyVolume / partner.targetAmount) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        // Personal stats
        stats: {
          profit: monthlyProfit,
          transactions: monthlyTransactionsCount,
          volume: monthlyVolume,
          pending: pendingOrdersCount
        },
        
        // Tier info
        tier: {
          current: partner.tier,
          calculated: calculatedTier,
          progress: tierProgress,
          gapToNext: gapToNextTier,
          nextTier: nextTier?.name || null,
          commissionRate: partner.commissionRate,
          badge: partner.badge
        },
        
        // Target
        target: {
          amount: partner.targetAmount,
          progress: targetProgress,
          currentAmount: monthlyVolume
        },
        
        // Leaderboard
        leaderboard,
        partnerRank,
        gapToNextRank,
        
        // Volume leaderboard (30 days)
        topPartnersByVolume30Days,
        partnerVolumeRank,
        gapToNextVolumeRank,
        
        // Badge history
        badgeHistory: monthlyBadgeHistory.map(b => ({
          id: b.id,
          year: b.year,
          month: b.month,
          badge: b.badge,
          profit: b.profit,
          volume: b.volume,
          transactions: b.transactions,
          rank: b.rank
        })),
        
        // Announcements
        announcements: activeAnnouncements.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description
        })),
        
        // Partner info
        partner: {
          id: partner.id,
          name: partner.user.name,
          email: partner.user.email,
          avatar: partner.user.avatar,
          tier: partner.tier,
          badge: partner.badge,
          totalProfit: partner.totalProfit,
          totalVolume: partner.totalVolume,
          totalTransactions: partner.totalTransactions
        }
      }
    })
  } catch (error) {
    console.error('Error fetching partner stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner stats' },
      { status: 500 }
    )
  }
}
