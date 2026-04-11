'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  Trophy,
  ArrowRight,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
  Crown,
  Medal,
  Award
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { LoadingSpinner } from '@/components/shared/loading'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell
} from 'recharts'
import { formatCurrency, formatRelativeTime, formatNumber } from '@/lib/calculations'
import { useAuthStore, useIsOwner } from '@/store/auth'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface OwnerStats {
  totalProfit: number
  totalTransactions: number
  activePartners: number
  totalVolume: number
  pendingOrders: number
  completedOrders: number
  lowMarginAlerts: Array<{
    orderId: string
    nominal: number
    netMargin: number
    marginPercent: number
    status: string
    createdAt: string
  }>
  highRiskTransactions: Array<{
    orderId: string
    nominal: number
    customerName: string
    paymentType: string
    createdAt: string
  }>
  topPartners: Array<{
    partnerId: string
    name: string
    profit: number
    volume: number
    transactions: number
    tier: string
  }>
  topPartnersByVolume30Days: Array<{
    partnerId: string
    name: string
    tier: string
    totalVolume: number
    transactions: number
  }>
  partnersNearTarget: Array<{
    partnerId: string
    name: string
    tier: string
    totalProfit: number
    targetAmount: number
    progress: number
    gap: number
    commissionRate: number
  }>
  marginHealth: {
    cc: {
      avgMarginPercent: number
      totalVolume: number
      totalProfit: number
      count: number
    }
    paylater: {
      avgMarginPercent: number
      totalVolume: number
      totalProfit: number
      count: number
    }
  }
  marginTrend: Array<{
    date: string
    ccMargin: number
    paylaterMargin: number
  }>
  forecast: {
    predicted30DaysVolume: number
    predicted30DaysProfit: number
    dailyData: Array<{
      date: string
      predictedVolume: number
      predictedProfit: number
    }>
    monthlyTrend: Array<{
      date: string
      volume: number
      profit: number
    }>
  }
  recentTransactions: Array<{
    orderId: string
    nominal: number
    status: string
    paymentType: string
    customerName: string
    createdAt: string
  }>
}

const chartConfig = {
  ccMargin: {
    label: 'CC Margin',
    color: 'hsl(var(--chart-1))'
  },
  paylaterMargin: {
    label: 'Paylater Margin',
    color: 'hsl(var(--chart-2))'
  },
  volume: {
    label: 'Volume',
    color: 'hsl(262 83% 58%)'
  },
  profit: {
    label: 'Profit',
    color: 'hsl(142 76% 36%)'
  }
} satisfies ChartConfig

const tierColors: Record<string, string> = {
  Bronze: 'bg-amber-600',
  Silver: 'bg-slate-400',
  Gold: 'bg-yellow-500',
  Platinum: 'bg-cyan-500',
  Diamond: 'bg-purple-500'
}

const tierBgColors: Record<string, string> = {
  Bronze: 'bg-amber-500/10 border-amber-500/30',
  Silver: 'bg-slate-400/10 border-slate-400/30',
  Gold: 'bg-yellow-500/10 border-yellow-500/30',
  Platinum: 'bg-cyan-500/10 border-cyan-500/30',
  Diamond: 'bg-purple-500/10 border-purple-500/30'
}

// Status badge configuration
const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  COMPLETED: { bg: 'bg-emerald-500', text: 'text-white', icon: CheckCircle2 },
  PENDING: { bg: 'bg-amber-500', text: 'text-white', icon: Clock },
  VERIFIED: { bg: 'bg-blue-500', text: 'text-white', icon: CheckCircle2 },
  PROCESSING: { bg: 'bg-purple-500', text: 'text-white', icon: Loader2 },
  CANCELLED: { bg: 'bg-red-500', text: 'text-white', icon: XCircle }
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  iconColor,
  defaultOpen = true,
  children,
  rightElement,
  className
}: {
  title: string
  icon: typeof TrendingUp
  iconColor: string
  defaultOpen?: boolean
  children: React.ReactNode
  rightElement?: React.ReactNode
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('rounded-xl border bg-card shadow-sm overflow-hidden', className)}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {rightElement}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>
      {isOpen && (
        <div className="border-t">
          {children}
        </div>
      )}
    </div>
  )
}

export default function OwnerDashboardPage() {
  const router = useRouter()
  const isOwner = useIsOwner()
  const isMobile = useIsMobile()
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pull to refresh state
  const [pullDistance, setPullDistance] = useState(0)
  const [startY, setStartY] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchStats = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true)
    }
    try {
      const token = useAuthStore.getState().token
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch('/api/stats/owner', { headers })
      if (response.status === 401) {
        // Session expired — logout
        useAuthStore.getState().logout()
        return
      }
      if (!response.ok) {
        setError('Failed to fetch stats')
        return
      }
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch stats')
      }
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error(err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isOwner) {
      router.push('/login')
      return
    }
    // Hydrate auth state on mount, then fetch data
    useAuthStore.getState().hydrate().then(() => {
      if (useAuthStore.getState().isAuthenticated) {
        fetchStats()
      }
    })
  }, [isOwner, router])

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return
    
    const currentY = e.touches[0].clientY
    const diff = currentY - startY
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(80, diff * 0.5))
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      await fetchStats(true)
    }
    setPullDistance(0)
    setStartY(0)
  }

  // Loading State
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </DashboardLayout>
    )
  }

  // Error State
  if (error || !stats) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Failed to Load Data</h3>
            <p className="text-muted-foreground">{error || 'Something went wrong'}</p>
          </div>
          <Button onClick={() => fetchStats()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  // Format dates for chart
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  // Filter margin trend data to show only days with data for cleaner chart
  const filteredMarginTrend = stats.marginTrend.filter(d => d.ccMargin > 0 || d.paylaterMargin > 0)

  // Calculate health score color
  const getHealthColor = (margin: number) => {
    if (margin >= 8) return 'text-emerald-500'
    if (margin >= 5) return 'text-amber-500'
    return 'text-red-500'
  }

  const getHealthBg = (margin: number) => {
    if (margin >= 8) return 'bg-emerald-500'
    if (margin >= 5) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getHealthLabel = (margin: number) => {
    if (margin >= 8) return 'Excellent'
    if (margin >= 5) return 'Good'
    return 'Needs Attention'
  }

  // MOBILE VIEW
  if (isMobile) {
    return (
      <DashboardLayout>
        <div 
          ref={containerRef}
          className="h-[calc(100vh-60px)] overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull to refresh indicator */}
          <div
            className="flex items-center justify-center transition-all duration-200"
            style={{
              height: pullDistance,
              opacity: pullDistance / 60,
            }}
          >
            <RefreshCw className={cn(
              'h-6 w-6 text-primary',
              (isRefreshing || pullDistance > 60) && 'animate-spin'
            )} />
          </div>

          {/* Mobile Header */}
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Command Center
                </h1>
                <p className="text-xs text-muted-foreground">Owner Dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
                  <Activity className="h-3 w-3 animate-pulse" />
                  Live
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchStats(true)}
                  disabled={isRefreshing}
                  className="h-9 w-9"
                >
                  <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 pb-safe">
            {/* Stats Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-sm">
                <p className="text-xs text-white/80">Total Profit</p>
                <p className="text-lg font-bold mt-1 truncate">{formatCurrency(stats.totalProfit)}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-white/70">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>Owner profit</span>
                </div>
              </div>
              
              <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white shadow-sm">
                <p className="text-xs text-white/80">Transaksi</p>
                <p className="text-lg font-bold mt-1">{formatNumber(stats.totalTransactions)}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-white/70">
                  <span>{stats.completedOrders} done</span>
                  <span>•</span>
                  <span>{stats.pendingOrders} pending</span>
                </div>
              </div>
              
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-4 text-white shadow-sm">
                <p className="text-xs text-white/80">Mitra Aktif</p>
                <p className="text-lg font-bold mt-1">{formatNumber(stats.activePartners)}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-white/70">
                  <Activity className="h-3 w-3" />
                  <span>Currently active</span>
                </div>
              </div>
              
              <div className="rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 p-4 text-white shadow-sm">
                <p className="text-xs text-white/80">Total Volume</p>
                <p className="text-lg font-bold mt-1 truncate">{formatCurrency(stats.totalVolume)}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-white/70">
                  <Target className="h-3 w-3" />
                  <span>Transaction vol</span>
                </div>
              </div>
            </div>

            {/* Smart Alerts - Collapsible */}
            <CollapsibleSection
              title="Smart Alerts"
              icon={Zap}
              iconColor="bg-amber-500/10 text-amber-500"
              defaultOpen={stats.lowMarginAlerts.length > 0 || stats.highRiskTransactions.length > 0}
            >
              <div className="p-4 space-y-3">
                {/* Low Margin Alert */}
                <div
                  className="p-3 rounded-xl border-2 border-amber-500/30 bg-amber-500/5"
                  onClick={() => router.push('/owner/transactions?alert=low-margin')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Low Margin</span>
                    </div>
                    {stats.lowMarginAlerts.length > 0 && (
                      <Badge className="bg-amber-500 text-white animate-pulse text-xs">
                        {stats.lowMarginAlerts.length}
                      </Badge>
                    )}
                  </div>
                  {stats.lowMarginAlerts.length > 0 ? (
                    <div className="space-y-1.5">
                      {stats.lowMarginAlerts.slice(0, 2).map((alert, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-500/10">
                          <span className="font-mono text-amber-700 dark:text-amber-300 truncate max-w-[100px]">{alert.orderId}</span>
                          <Badge variant="outline" className="bg-amber-500/20 border-amber-500/30 text-amber-600 text-[10px]">
                            {alert.marginPercent.toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      All margins healthy
                    </p>
                  )}
                </div>

                {/* High Risk */}
                <div
                  className="p-3 rounded-xl border-2 border-red-500/30 bg-red-500/5"
                  onClick={() => router.push('/owner/transactions?alert=high-risk')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">High Risk</span>
                    </div>
                    {stats.highRiskTransactions.length > 0 && (
                      <Badge className="bg-red-500 text-white animate-pulse text-xs">
                        {stats.highRiskTransactions.length}
                      </Badge>
                    )}
                  </div>
                  {stats.highRiskTransactions.length > 0 ? (
                    <div className="space-y-1.5">
                      {stats.highRiskTransactions.slice(0, 2).map((tx, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-red-500/10">
                          <span className="truncate max-w-[80px] text-red-700 dark:text-red-300">{tx.customerName}</span>
                          <span className="font-semibold text-red-600 text-xs">
                            {formatCurrency(tx.nominal).replace('Rp', '').trim()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      No high-risk transactions
                    </p>
                  )}
                </div>

                {/* Top Performers */}
                <div
                  className="p-3 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5"
                  onClick={() => router.push('/owner/partners')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Top Partners</span>
                    </div>
                  </div>
                  {stats.topPartners.length > 0 ? (
                    <div className="space-y-1.5">
                      {stats.topPartners.slice(0, 3).map((partner, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-500/10">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
                              i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : "bg-amber-600"
                            )}>
                              {i + 1}
                            </div>
                            <span className="truncate max-w-[70px] text-emerald-700 dark:text-emerald-300">{partner.name}</span>
                          </div>
                          <Badge className={cn("text-white text-[10px]", tierColors[partner.tier] || 'bg-slate-500')}>
                            {partner.tier}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No partners yet</p>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Partners Near Target - Close to achieving monthly target */}
            {stats.partnersNearTarget && stats.partnersNearTarget.length > 0 && (
              <CollapsibleSection
                title="Target Progress"
                icon={Target}
                iconColor="bg-blue-500/10 text-blue-500"
                defaultOpen={true}
              >
                <div className="p-4 space-y-3">
                  {stats.partnersNearTarget.map((partner) => (
                    <div
                      key={partner.partnerId}
                      className="p-3 rounded-xl border bg-gradient-to-r from-blue-500/5 to-cyan-500/5"
                      onClick={() => router.push(`/owner/partners?id=${partner.partnerId}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate max-w-[100px]">{partner.name}</span>
                          <Badge className={cn("text-white text-[10px]", tierColors[partner.tier] || 'bg-slate-500')}>
                            {partner.tier}
                          </Badge>
                        </div>
                        <Badge className={cn(
                          "text-white text-[10px]",
                          partner.progress >= 90 ? "bg-emerald-500" :
                          partner.progress >= 75 ? "bg-blue-500" :
                          "bg-amber-500"
                        )}>
                          {partner.progress.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <Progress 
                          value={partner.progress} 
                          className="h-1.5"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{formatCurrency(partner.totalProfit)}</span>
                          <span>Target: {formatCurrency(partner.targetAmount)}</span>
                        </div>
                        {partner.progress >= 90 && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                            <Sparkles className="h-3 w-3" />
                            <span>Gap: {formatCurrency(partner.gap)} lagi!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Top Volume 30 Days - Mobile */}
            {stats.topPartnersByVolume30Days && stats.topPartnersByVolume30Days.length > 0 && (
              <CollapsibleSection
                title="Top Volume 30 Hari"
                icon={BarChart3}
                iconColor="bg-violet-500/10 text-violet-500"
                defaultOpen={false}
              >
                <div className="p-4 space-y-3">
                  {stats.topPartnersByVolume30Days.map((partner, i) => (
                    <div
                      key={partner.partnerId}
                      className="p-3 rounded-xl border bg-gradient-to-r from-violet-500/5 to-purple-500/5"
                      onClick={() => router.push(`/owner/partners?id=${partner.partnerId}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
                            i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-600" : "bg-violet-500"
                          )}>
                            {i + 1}
                          </div>
                          <span className="text-sm font-medium truncate max-w-[100px]">{partner.name}</span>
                          <Badge className={cn("text-white text-[10px]", tierColors[partner.tier] || 'bg-slate-500')}>
                            {partner.tier}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-violet-600">{formatCurrency(partner.totalVolume)}</span>
                        <span className="text-muted-foreground">{partner.transactions} transaksi</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Margin Health */}
            <CollapsibleSection
              title="Margin Health"
              icon={Activity}
              iconColor="bg-violet-500/10 text-violet-500"
              defaultOpen={true}
            >
              <div className="p-4 space-y-3">
                {/* CC */}
                <div className="p-3 rounded-xl border bg-gradient-to-r from-violet-500/5 to-purple-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-violet-500" />
                      <span className="text-sm font-medium">Credit Card</span>
                    </div>
                    <Badge className={cn("text-white text-xs", getHealthBg(stats.marginHealth.cc.avgMarginPercent))}>
                      {getHealthLabel(stats.marginHealth.cc.avgMarginPercent)}
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: getHealthColor(stats.marginHealth.cc.avgMarginPercent).replace('text-', '').includes('emerald') ? '#10b981' : getHealthColor(stats.marginHealth.cc.avgMarginPercent).includes('amber') ? '#f59e0b' : '#ef4444' }}>
                        {stats.marginHealth.cc.avgMarginPercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Avg margin</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(stats.marginHealth.cc.totalProfit)}</p>
                      <p className="text-xs text-muted-foreground">{stats.marginHealth.cc.count} tx</p>
                    </div>
                  </div>
                </div>

                {/* Paylater */}
                <div className="p-3 rounded-xl border bg-gradient-to-r from-cyan-500/5 to-teal-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-cyan-500" />
                      <span className="text-sm font-medium">Paylater</span>
                    </div>
                    <Badge className={cn("text-white text-xs", getHealthBg(stats.marginHealth.paylater.avgMarginPercent))}>
                      {getHealthLabel(stats.marginHealth.paylater.avgMarginPercent)}
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: getHealthColor(stats.marginHealth.paylater.avgMarginPercent).replace('text-', '').includes('emerald') ? '#10b981' : getHealthColor(stats.marginHealth.paylater.avgMarginPercent).includes('amber') ? '#f59e0b' : '#ef4444' }}>
                        {stats.marginHealth.paylater.avgMarginPercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Avg margin</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(stats.marginHealth.paylater.totalProfit)}</p>
                      <p className="text-xs text-muted-foreground">{stats.marginHealth.paylater.count} tx</p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Forecast */}
            <CollapsibleSection
              title="30-Day Forecast"
              icon={TrendingUp}
              iconColor="bg-violet-500/10 text-violet-500"
              defaultOpen={false}
            >
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                    <p className="text-xs text-muted-foreground">Predicted Volume</p>
                    <p className="text-base font-bold text-violet-600 mt-1 truncate">
                      {formatCurrency(stats.forecast.predicted30DaysVolume)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <p className="text-xs text-muted-foreground">Predicted Profit</p>
                    <p className="text-base font-bold text-emerald-600 mt-1 truncate">
                      {formatCurrency(stats.forecast.predicted30DaysProfit)}
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Recent Transactions */}
            <CollapsibleSection
              title="Recent Transactions"
              icon={Clock}
              iconColor="bg-blue-500/10 text-blue-500"
              defaultOpen={true}
              rightElement={
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); router.push('/owner/transactions') }}
                >
                  View All
                </Button>
              }
            >
              <div className="divide-y">
                {stats.recentTransactions.length === 0 ? (
                  <div className="p-6 text-center">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No recent transactions</p>
                  </div>
                ) : (
                  stats.recentTransactions.slice(0, 5).map((tx) => {
                    const status = statusConfig[tx.status] || statusConfig.PENDING
                    const StatusIcon = status.icon

                    return (
                      <div
                        key={tx.orderId}
                        className="flex items-center justify-between p-3 active:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/track?orderId=${tx.orderId}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-violet-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[120px]">{tx.customerName}</p>
                            <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(tx.nominal)}</p>
                          <Badge className={cn("text-[10px] px-2 py-0.5", status.bg, status.text)}>
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // DESKTOP VIEW (original layout)
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Command Center
            </h1>
            <p className="text-muted-foreground">Owner Dashboard - Real-time Overview & Analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Activity className="h-3 w-3 animate-pulse" />
              Live
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStats(true)}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Smart Alerts Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold">Smart Alerts</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Low Margin Alerts */}
            <Card
              className={cn(
                "group relative overflow-hidden transition-all duration-300",
                "border-2 border-amber-500/20 hover:border-amber-500/40",
                "bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5",
                "hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer"
              )}
              onClick={() => router.push('/owner/transactions?alert=low-margin')}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <div className="p-1.5 rounded-md bg-amber-500/20">
                      <TrendingDown className="h-4 w-4" />
                    </div>
                    Low Margin Alert
                  </CardTitle>
                  {stats.lowMarginAlerts.length > 0 && (
                    <Badge className="bg-amber-500 text-white animate-pulse">
                      {stats.lowMarginAlerts.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-xs text-muted-foreground">
                  Transactions with margin below 5%
                </p>
                {stats.lowMarginAlerts.length > 0 ? (
                  <ScrollArea className="mt-3 h-24">
                    <div className="space-y-2 pr-2">
                      {stats.lowMarginAlerts.slice(0, 5).map((alert, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-amber-500/10">
                          <span className="font-mono text-amber-700 dark:text-amber-300 truncate max-w-[100px]">{alert.orderId}</span>
                          <Badge variant="outline" className="bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono">
                            {alert.marginPercent.toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    All margins are healthy
                  </div>
                )}
                <div className="mt-3 flex items-center text-xs text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  <span>View details</span>
                  <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            {/* High Risk Transactions */}
            <Card
              className={cn(
                "group relative overflow-hidden transition-all duration-300",
                "border-2 border-red-500/20 hover:border-red-500/40",
                "bg-gradient-to-br from-red-500/5 via-red-500/10 to-rose-500/5",
                "hover:shadow-lg hover:shadow-red-500/10 cursor-pointer"
              )}
              onClick={() => router.push('/owner/transactions?alert=high-risk')}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600 dark:text-red-400">
                    <div className="p-1.5 rounded-md bg-red-500/20">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    High Risk Pending
                  </CardTitle>
                  {stats.highRiskTransactions.length > 0 && (
                    <Badge className="bg-red-500 text-white animate-pulse">
                      {stats.highRiskTransactions.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-xs text-muted-foreground">
                  Large transactions (≥ 5jt) pending
                </p>
                {stats.highRiskTransactions.length > 0 ? (
                  <ScrollArea className="mt-3 h-24">
                    <div className="space-y-2 pr-2">
                      {stats.highRiskTransactions.slice(0, 5).map((tx, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-red-500/10">
                          <span className="truncate max-w-[80px] text-red-700 dark:text-red-300">{tx.customerName}</span>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(tx.nominal).replace('Rp', '').trim()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    No high-risk transactions
                  </div>
                )}
                <div className="mt-3 flex items-center text-xs text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  <span>View details</span>
                  <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            {/* Top Partners */}
            <Card
              className={cn(
                "group relative overflow-hidden transition-all duration-300",
                "border-2 border-emerald-500/20 hover:border-emerald-500/40",
                "bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-teal-500/5",
                "hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
              )}
              onClick={() => router.push('/owner/partners')}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <div className="p-1.5 rounded-md bg-emerald-500/20">
                      <Trophy className="h-4 w-4" />
                    </div>
                    Top Performers
                  </CardTitle>
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-xs text-muted-foreground">
                  Best performing partners
                </p>
                {stats.topPartners.length > 0 ? (
                  <ScrollArea className="mt-3 h-24">
                    <div className="space-y-2 pr-2">
                      {stats.topPartners.slice(0, 5).map((partner, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-emerald-500/10">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
                              i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-600" : "bg-emerald-500"
                            )}>
                              {i + 1}
                            </div>
                            <span className="truncate max-w-[70px] text-emerald-700 dark:text-emerald-300">{partner.name}</span>
                          </div>
                          <Badge className={cn("text-white text-[10px]", tierColors[partner.tier] || 'bg-slate-500')}>
                            {partner.tier}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-4 w-4" />
                    No partners yet
                  </div>
                )}
                <div className="mt-3 flex items-center text-xs text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  <span>View all partners</span>
                  <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Partners Near Target Section - Desktop */}
        {stats.partnersNearTarget && stats.partnersNearTarget.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Target className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold">Partner Target Progress</h2>
              <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-600">
                Mendekati Target
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.partnersNearTarget.map((partner) => (
                <Card
                  key={partner.partnerId}
                  className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer border-2 border-blue-500/20 hover:border-blue-500/40 bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-cyan-500/5"
                  onClick={() => router.push(`/owner/partners?id=${partner.partnerId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[120px]">{partner.name}</span>
                        <Badge className={cn("text-white text-xs", tierColors[partner.tier] || 'bg-slate-500')}>
                          {partner.tier}
                        </Badge>
                      </div>
                      <Badge className={cn(
                        "text-white text-xs",
                        partner.progress >= 90 ? "bg-emerald-500 animate-pulse" :
                        partner.progress >= 75 ? "bg-blue-500" :
                        "bg-amber-500"
                      )}>
                        {partner.progress.toFixed(0)}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress value={partner.progress} className="h-2" />
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Profit: {formatCurrency(partner.totalProfit)}</span>
                        <span>Target: {formatCurrency(partner.targetAmount)}</span>
                      </div>
                      
                      {partner.progress >= 90 && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">
                          <Sparkles className="h-3 w-3" />
                          <span>Gap: {formatCurrency(partner.gap)} lagi!</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Top Partners by Volume 30 Days - Desktop */}
        {stats.topPartnersByVolume30Days && stats.topPartnersByVolume30Days.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <BarChart3 className="h-4 w-4 text-violet-500" />
              </div>
              <h2 className="text-lg font-semibold">Top Volume 30 Hari</h2>
              <Badge variant="outline" className="text-xs bg-violet-500/10 border-violet-500/30 text-violet-600">
                Best Sellers
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {stats.topPartnersByVolume30Days.map((partner, i) => (
                <Card
                  key={partner.partnerId}
                  className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer border-2 border-violet-500/20 hover:border-violet-500/40 bg-gradient-to-br from-violet-500/5 via-violet-500/10 to-purple-500/5"
                  onClick={() => router.push(`/owner/partners?id=${partner.partnerId}`)}
                >
                  <CardContent className="p-4 text-center">
                    {/* Rank Badge */}
                    <div className="flex justify-center mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg",
                        i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-yellow-500/30" :
                        i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500 shadow-slate-400/30" :
                        i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 shadow-amber-600/30" :
                        "bg-gradient-to-br from-violet-500 to-purple-500 shadow-violet-500/30"
                      )}>
                        {i === 0 ? <Crown className="h-5 w-5" /> : i === 1 ? <Medal className="h-5 w-5" /> : i === 2 ? <Award className="h-5 w-5" /> : i + 1}
                      </div>
                    </div>
                    
                    <p className="font-medium truncate mb-1">{partner.name}</p>
                    <Badge className={cn("text-white text-xs mb-2", tierColors[partner.tier] || 'bg-slate-500')}>
                      {partner.tier}
                    </Badge>
                    
                    <div className="mt-2">
                      <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                        {formatCurrency(partner.totalVolume)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {partner.transactions} transaksi
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Profit */}
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Profit
              </CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats.totalProfit)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>Owner profit</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Transaksi */}
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-violet-500/5" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transaksi
              </CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">
                {formatNumber(stats.totalTransactions)}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="text-muted-foreground">{stats.completedOrders} done</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span className="text-muted-foreground">{stats.pendingOrders} pending</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mitra Aktif */}
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-500/5" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mitra Aktif
              </CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(stats.activePartners)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <Activity className="h-3 w-3" />
                  <span>Currently active</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Volume */}
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-fuchsia-500/5" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Volume
              </CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30">
                <BarChart3 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-fuchsia-600 dark:text-fuchsia-400">
                {formatCurrency(stats.totalVolume)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-fuchsia-600 dark:text-fuchsia-400">
                  <Target className="h-3 w-3" />
                  <span>Transaction volume</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Margin Health Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Activity className="h-4 w-4 text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold">Margin Health</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* CC Margin Health */}
            <Card className="overflow-hidden">
              <div className={cn(
                "h-1",
                getHealthBg(stats.marginHealth.cc.avgMarginPercent)
              )} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 text-white">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    CC Margin Health
                  </CardTitle>
                  <Badge className={cn(
                    "text-white",
                    getHealthBg(stats.marginHealth.cc.avgMarginPercent)
                  )}>
                    {getHealthLabel(stats.marginHealth.cc.avgMarginPercent)}
                  </Badge>
                </div>
                <CardDescription>
                  Credit Card transaction performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Margin Gauge */}
                <div className="relative pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Average Margin</span>
                    <span className={cn("text-2xl font-bold", getHealthColor(stats.marginHealth.cc.avgMarginPercent))}>
                      {stats.marginHealth.cc.avgMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="w-1/3 bg-red-500/20" />
                      <div className="w-1/3 bg-amber-500/20" />
                      <div className="w-1/3 bg-emerald-500/20" />
                    </div>
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        getHealthBg(stats.marginHealth.cc.avgMarginPercent)
                      )}
                      style={{ width: `${Math.min(100, stats.marginHealth.cc.avgMarginPercent * 10)}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground"
                      style={{ left: `${Math.min(100, stats.marginHealth.cc.avgMarginPercent * 10)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>0%</span>
                    <span>5%</span>
                    <span>10%+</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Transactions</p>
                    <p className="text-lg font-bold">{formatNumber(stats.marginHealth.cc.count)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Volume</p>
                    <p className="text-sm font-semibold">{formatCurrency(stats.marginHealth.cc.totalVolume)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                    <p className="text-xs text-muted-foreground">Profit</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.marginHealth.cc.totalProfit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paylater Margin Health */}
            <Card className="overflow-hidden">
              <div className={cn(
                "h-1",
                getHealthBg(stats.marginHealth.paylater.avgMarginPercent)
              )} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                      <Wallet className="h-4 w-4" />
                    </div>
                    Paylater Margin Health
                  </CardTitle>
                  <Badge className={cn(
                    "text-white",
                    getHealthBg(stats.marginHealth.paylater.avgMarginPercent)
                  )}>
                    {getHealthLabel(stats.marginHealth.paylater.avgMarginPercent)}
                  </Badge>
                </div>
                <CardDescription>
                  Paylater transaction performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Margin Gauge */}
                <div className="relative pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Average Margin</span>
                    <span className={cn("text-2xl font-bold", getHealthColor(stats.marginHealth.paylater.avgMarginPercent))}>
                      {stats.marginHealth.paylater.avgMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="w-1/3 bg-red-500/20" />
                      <div className="w-1/3 bg-amber-500/20" />
                      <div className="w-1/3 bg-emerald-500/20" />
                    </div>
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        getHealthBg(stats.marginHealth.paylater.avgMarginPercent)
                      )}
                      style={{ width: `${Math.min(100, stats.marginHealth.paylater.avgMarginPercent * 10)}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground"
                      style={{ left: `${Math.min(100, stats.marginHealth.paylater.avgMarginPercent * 10)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>0%</span>
                    <span>5%</span>
                    <span>10%+</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Transactions</p>
                    <p className="text-lg font-bold">{formatNumber(stats.marginHealth.paylater.count)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Volume</p>
                    <p className="text-sm font-semibold">{formatCurrency(stats.marginHealth.paylater.totalVolume)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                    <p className="text-xs text-muted-foreground">Profit</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.marginHealth.paylater.totalProfit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Margin Trend Chart */}
        {filteredMarginTrend.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle>Margin Trend</CardTitle>
                  <CardDescription>
                    Last 30 days daily margin by payment type
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                    <span className="text-muted-foreground">CC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500" />
                    <span className="text-muted-foreground">Paylater</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredMarginTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateLabel}
                      className="text-xs"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                      domain={[0, 'auto']}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      labelFormatter={formatDateLabel}
                    />
                    <Line
                      type="monotone"
                      dataKey="ccMargin"
                      stroke="hsl(262 83% 58%)"
                      strokeWidth={2.5}
                      dot={{ fill: 'hsl(262 83% 58%)', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(262 83% 58%)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="paylaterMargin"
                      stroke="hsl(187 92% 40%)"
                      strokeWidth={2.5}
                      dot={{ fill: 'hsl(187 92% 40%)', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(187 92% 40%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Forecast & Prediksi Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  30-Day Forecast
                </CardTitle>
                <CardDescription>
                  Predicted performance based on historical data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Forecast Summary */}
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-fuchsia-500/10 border border-violet-500/20">
                <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-start justify-between relative">
                  <div>
                    <p className="text-sm text-muted-foreground">Predicted Volume</p>
                    <p className="text-2xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400 mt-1">
                      {formatCurrency(stats.forecast.predicted30DaysVolume)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next 30 days projection
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <BarChart3 className="h-5 w-5 text-violet-500" />
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/20">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-start justify-between relative">
                  <div>
                    <p className="text-sm text-muted-foreground">Predicted Profit</p>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatCurrency(stats.forecast.predicted30DaysProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next 30 days projection
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Trend Chart */}
            {stats.forecast.monthlyTrend.some(d => d.volume > 0 || d.profit > 0) && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium">Volume vs Profit Trend</p>
                  <p className="text-xs text-muted-foreground">Last 14 days</p>
                </div>
                <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.forecast.monthlyTrend.slice(-14)} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDateLabel}
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        labelFormatter={formatDateLabel}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '12px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Bar dataKey="volume" fill="hsl(262 83% 58%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="profit" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}

            {/* Empty State for Chart */}
            {stats.forecast.monthlyTrend.every(d => d.volume === 0 && d.profit === 0) && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No historical data available yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start processing transactions to see trends</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Last 7 days activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/owner/transactions')} className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShoppingBag className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No recent transactions</p>
                <p className="text-xs text-muted-foreground mt-1">Transactions from the last 7 days will appear here</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => router.push('/owner/transactions')}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Create Transaction
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2 pr-2">
                  {stats.recentTransactions.map((tx) => {
                    const status = statusConfig[tx.status] || statusConfig.PENDING
                    const StatusIcon = status.icon

                    return (
                      <div
                        key={tx.orderId}
                        className={cn(
                          "group flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                          "hover:bg-muted/50 hover:shadow-sm cursor-pointer",
                          "active:scale-[0.99]"
                        )}
                        onClick={() => router.push(`/track?orderId=${tx.orderId}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center border border-violet-500/20">
                            <ShoppingBag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[120px] sm:max-w-[180px]">{tx.customerName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="font-mono text-xs">{tx.orderId.slice(-8)}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="hidden sm:inline text-xs">{tx.paymentType}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(tx.nominal)}</p>
                            <div className="flex items-center gap-2 justify-end">
                              <Badge
                                className={cn(
                                  "text-[10px] px-2 py-0.5 gap-1 font-medium",
                                  status.bg,
                                  status.text
                                )}
                              >
                                <StatusIcon className={cn("h-3 w-3", tx.status === 'PROCESSING' && "animate-spin")} />
                                {tx.status}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                {formatRelativeTime(tx.createdAt)}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
