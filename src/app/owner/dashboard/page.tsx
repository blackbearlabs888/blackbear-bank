'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  Award,
  Sun,
  Moon as MoonIcon,
  CloudSun,
  Flame,
  Eye,
  PieChart as PieChartIcon,
  CalendarDays,
  HandCoins,
  ShieldCheck,
  CircleDot,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
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
  BarChart,
  Bar,
  Legend,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatRelativeTime, formatNumber } from '@/lib/calculations'
import { useIsOwner, useAuthStore } from '@/store/auth'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

// ===================== TYPES =====================
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

// ===================== CHART CONFIG =====================
const chartConfig = {
  ccMargin: { label: 'CC Margin', color: 'hsl(262 83% 58%)' },
  paylaterMargin: { label: 'Paylater Margin', color: 'hsl(330 80% 55%)' },
  volume: { label: 'Volume', color: 'hsl(262 83% 58%)' },
  profit: { label: 'Profit', color: 'hsl(142 76% 36%)' },
  cc: { label: 'Credit Card', color: 'hsl(262 83% 58%)' },
  paylater: { label: 'Paylater', color: 'hsl(330 80% 55%)' },
} satisfies ChartConfig

// ===================== CONSTANTS =====================
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

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  COMPLETED: { bg: 'bg-emerald-500', text: 'text-white', icon: CheckCircle2 },
  PENDING: { bg: 'bg-amber-500', text: 'text-white', icon: Clock },
  VERIFIED: { bg: 'bg-blue-500', text: 'text-white', icon: CheckCircle2 },
  PROCESSING: { bg: 'bg-purple-500', text: 'text-white', icon: Loader2 },
  CANCELLED: { bg: 'bg-red-500', text: 'text-white', icon: XCircle }
}

const motivationalQuotes = [
  "Konsistensi adalah kunci menuju kesuksesan.",
  "Setiap transaksi adalah langkah menuju pertumbuhan.",
  "Data hari ini, keputusan tepat besok.",
  "Mitra terbaik tumbuh bersama platform terbaik.",
  "Inovasi tanpa batas, profit tanpa henti.",
]

// ===================== HELPER FUNCTIONS =====================
function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return { text: 'Selamat Pagi', icon: Sun }
  if (hour >= 12 && hour < 15) return { text: 'Selamat Siang', icon: CloudSun }
  if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', icon: CloudSun }
  return { text: 'Selamat Malam', icon: MoonIcon }
}

function getHealthColor(margin: number): string {
  if (margin >= 8) return 'text-emerald-500'
  if (margin >= 5) return 'text-amber-500'
  return 'text-red-500'
}

function getHealthBg(margin: number): string {
  if (margin >= 8) return 'bg-emerald-500'
  if (margin >= 5) return 'bg-amber-500'
  return 'bg-red-500'
}

function getHealthLabel(margin: number): string {
  if (margin >= 8) return 'Excellent'
  if (margin >= 5) return 'Good'
  return 'Needs Attention'
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getTodayFormatted(): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date())
}

// ===================== ANIMATION VARIANTS =====================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}

// ===================== MAIN COMPONENT =====================
export default function OwnerDashboardPage() {
  const router = useRouter()
  const isOwner = useIsOwner()
  const { user } = useAuthStore()
  const isMobile = useIsMobile()
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({
    alerts: true,
    margin: true,
    forecast: false,
    partners: true,
    transactions: true,
  })

  // Pull to refresh state
  const [pullDistance, setPullDistance] = useState(0)
  const [startY, setStartY] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchStats = async (showRefreshLoader = false) => {
    if (showRefreshLoader) setIsRefreshing(true)
    try {
      const response = await fetch('/api/stats/owner')
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
    fetchStats()
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

  const toggleSection = (key: string) => {
    setExpandedSection(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ===================== LOADING STATE =====================
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-4">
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ===================== ERROR STATE =====================
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

  // ===================== COMPUTED DATA =====================
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon
  const todayQuote = motivationalQuotes[new Date().getDate() % motivationalQuotes.length]

  // Filter margin trend data
  const filteredMarginTrend = stats.marginTrend.filter(d => d.ccMargin > 0 || d.paylaterMargin > 0)

  // Pie chart data for payment type distribution
  const paymentTypeData = [
    { name: 'Credit Card', value: stats.marginHealth.cc.totalVolume, count: stats.marginHealth.cc.count, color: 'hsl(262 83% 58%)' },
    { name: 'Paylater', value: stats.marginHealth.paylater.totalVolume, count: stats.marginHealth.paylater.count, color: 'hsl(330 80% 55%)' },
  ].filter(d => d.value > 0)

  // Top partners bar chart data
  const topPartnersChartData = stats.topPartners.slice(0, 5).map(p => ({
    name: p.name.length > 8 ? p.name.substring(0, 8) + '...' : p.name,
    profit: p.profit,
    volume: p.volume,
  }))

  // Forecast chart data
  const forecastChartData = stats.forecast.monthlyTrend.filter(d => d.volume > 0 || d.profit > 0)

  // Completion rate
  const completionRate = stats.totalTransactions > 0
    ? ((stats.completedOrders / stats.totalTransactions) * 100).toFixed(1)
    : '0'

  // ===================== RENDER =====================
  return (
    <DashboardLayout>
      <div
        ref={containerRef}
        className={cn("overflow-y-auto", isMobile && "h-[calc(100vh-120px)]")}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        {/* Pull to refresh indicator */}
        {isMobile && (
          <div
            className="flex items-center justify-center transition-all duration-200"
            style={{ height: pullDistance, opacity: pullDistance / 60 }}
          >
            <RefreshCw className={cn('h-6 w-6 text-primary', (isRefreshing || pullDistance > 60) && 'animate-spin')} />
          </div>
        )}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5 p-3 sm:p-4 md:p-6"
        >
          {/* ==================== GREETINGS CARD ==================== */}
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden border-0 shadow-lg">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />
              {/* Decorative shapes */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
              <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              {/* Shimmer effect */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
              </div>

              <CardContent className="relative p-5 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <GreetingIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">
                          {greeting.text}, {user?.name || 'Owner'}! 👋
                        </h1>
                        <p className="text-white/70 text-sm">{getTodayFormatted()}</p>
                      </div>
                    </div>
                    <p className="text-white/80 text-sm italic flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-300" />
                      &ldquo;{todayQuote}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm gap-1.5">
                      <Activity className="h-3 w-3 animate-pulse" />
                      Live
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fetchStats(true)}
                      disabled={isRefreshing}
                      className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-white/20"
                    >
                      <RefreshCw className={cn('h-4 w-4 mr-1.5', isRefreshing && 'animate-spin')} />
                      Refresh
                    </Button>
                  </div>
                </div>

                {/* Quick stats row inside greeting card */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Profit', value: formatCurrency(stats.totalProfit), icon: HandCoins, color: 'from-emerald-400/20 to-teal-400/20' },
                    { label: 'Transaksi', value: formatNumber(stats.totalTransactions), icon: ShoppingBag, color: 'from-blue-400/20 to-cyan-400/20' },
                    { label: 'Mitra Aktif', value: formatNumber(stats.activePartners), icon: Users, color: 'from-amber-400/20 to-orange-400/20' },
                    { label: 'Volume', value: formatCurrency(stats.totalVolume), icon: BarChart3, color: 'from-pink-400/20 to-rose-400/20' },
                  ].map((item) => (
                    <div key={item.label} className={cn("rounded-xl bg-gradient-to-br backdrop-blur-sm p-3 border border-white/10", item.color)}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon className="h-3.5 w-3.5 text-white/70" />
                        <span className="text-[11px] text-white/70 font-medium">{item.label}</span>
                      </div>
                      <p className="text-white font-bold text-sm sm:text-base truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ==================== KPI CARDS ==================== */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                title: 'Total Profit',
                value: formatCurrency(stats.totalProfit),
                icon: DollarSign,
                gradient: 'from-emerald-500 to-teal-600',
                shadowColor: 'shadow-emerald-500/20',
                subtitle: 'Owner earnings',
                trend: null as string | null,
              },
              {
                title: 'Transaksi',
                value: formatNumber(stats.totalTransactions),
                icon: ShoppingBag,
                gradient: 'from-violet-500 to-purple-600',
                shadowColor: 'shadow-violet-500/20',
                subtitle: `${stats.completedOrders} done · ${stats.pendingOrders} pending`,
                trend: `${completionRate}% completion`,
              },
              {
                title: 'Mitra Aktif',
                value: formatNumber(stats.activePartners),
                icon: Users,
                gradient: 'from-amber-500 to-orange-600',
                shadowColor: 'shadow-amber-500/20',
                subtitle: 'Active partners',
                trend: null as string | null,
              },
              {
                title: 'Total Volume',
                value: formatCurrency(stats.totalVolume),
                icon: BarChart3,
                gradient: 'from-fuchsia-500 to-pink-600',
                shadowColor: 'shadow-fuchsia-500/20',
                subtitle: 'Transaction volume',
                trend: null as string | null,
              },
            ].map((card) => (
              <Card key={card.title} className={cn("relative overflow-hidden border-0 shadow-lg group", card.shadowColor)}>
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", card.gradient)} />
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="relative p-4 sm:p-5 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <card.icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <p className="text-xs text-white/80 font-medium">{card.title}</p>
                  <p className="text-lg sm:text-xl font-bold mt-0.5 truncate">{card.value}</p>
                  <p className="text-[11px] text-white/70 mt-1">{card.subtitle}</p>
                  {card.trend && (
                    <Badge className="mt-1.5 bg-white/20 text-white text-[10px] border-white/20">
                      {card.trend}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* ==================== SMART ALERTS ==================== */}
          {(stats.lowMarginAlerts.length > 0 || stats.highRiskTransactions.length > 0) && (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-md overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection('alerts')}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Zap className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">Smart Alerts</h2>
                      <p className="text-xs text-muted-foreground">Requires your attention</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(stats.lowMarginAlerts.length + stats.highRiskTransactions.length) > 0 && (
                      <Badge className="bg-red-500 text-white animate-pulse text-xs">
                        {stats.lowMarginAlerts.length + stats.highRiskTransactions.length}
                      </Badge>
                    )}
                    {expandedSection.alerts ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                <AnimatePresence>
                  {expandedSection.alerts && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t p-4 space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          {/* Low Margin Alert */}
                          <div
                            className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors"
                            onClick={() => router.push('/owner/transactions?alert=low-margin')}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Low Margin</span>
                              </div>
                              {stats.lowMarginAlerts.length > 0 && (
                                <Badge className="bg-amber-500 text-white text-xs">{stats.lowMarginAlerts.length}</Badge>
                              )}
                            </div>
                            {stats.lowMarginAlerts.length > 0 ? (
                              <div className="space-y-1.5 mt-2">
                                {stats.lowMarginAlerts.slice(0, 3).map((alert, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-500/10">
                                    <span className="font-mono text-amber-700 dark:text-amber-300 truncate max-w-[120px]">{alert.orderId}</span>
                                    <Badge variant="outline" className="bg-amber-500/20 border-amber-500/30 text-amber-600 text-[10px]">
                                      {alert.marginPercent.toFixed(1)}%
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-2">
                                <CheckCircle2 className="h-3 w-3" /> All margins healthy
                              </p>
                            )}
                          </div>

                          {/* High Risk */}
                          <div
                            className="p-4 rounded-xl border-2 border-red-500/30 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors"
                            onClick={() => router.push('/owner/transactions?alert=high-risk')}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-sm font-semibold text-red-700 dark:text-red-400">High Risk</span>
                              </div>
                              {stats.highRiskTransactions.length > 0 && (
                                <Badge className="bg-red-500 text-white text-xs">{stats.highRiskTransactions.length}</Badge>
                              )}
                            </div>
                            {stats.highRiskTransactions.length > 0 ? (
                              <div className="space-y-1.5 mt-2">
                                {stats.highRiskTransactions.slice(0, 3).map((tx, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-red-500/10">
                                    <span className="truncate max-w-[100px] text-red-700 dark:text-red-300">{tx.customerName}</span>
                                    <span className="font-semibold text-red-600">{formatCurrency(tx.nominal)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-2">
                                <CheckCircle2 className="h-3 w-3" /> No high-risk transactions
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )}

          {/* ==================== REVENUE TREND CHART ==================== */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      <TrendingUp className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Revenue & Profit Trend</CardTitle>
                      <CardDescription className="text-xs">Monthly volume and profit</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {forecastChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <AreaChart data={forecastChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tickFormatter={formatDateLabel} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="volume" stroke="hsl(262 83% 58%)" fill="url(#fillVolume)" strokeWidth={2} name="Volume" />
                      <Area type="monotone" dataKey="profit" stroke="hsl(142 76% 36%)" fill="url(#fillProfit)" strokeWidth={2} name="Profit" />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center">
                      <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Belum ada data tren</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ==================== MARGIN HEALTH + PAYMENT DISTRIBUTION ==================== */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Margin Health */}
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Margin Health</CardTitle>
                      <CardDescription className="text-xs">Payment type performance</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* CC Margin */}
                <div className="p-4 rounded-xl border bg-gradient-to-r from-violet-500/5 to-purple-500/5">
                  <div className="flex items-center justify-between mb-3">
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
                      <p className={cn("text-2xl font-bold", getHealthColor(stats.marginHealth.cc.avgMarginPercent))}>
                        {stats.marginHealth.cc.avgMarginPercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Avg margin</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(stats.marginHealth.cc.totalProfit)}</p>
                      <p className="text-xs text-muted-foreground">{stats.marginHealth.cc.count} tx</p>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(100, stats.marginHealth.cc.avgMarginPercent * 10)}
                    className="mt-3 h-1.5"
                  />
                </div>

                {/* Paylater Margin */}
                <div className="p-4 rounded-xl border bg-gradient-to-r from-fuchsia-500/5 to-pink-500/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-fuchsia-500" />
                      <span className="text-sm font-medium">Paylater</span>
                    </div>
                    <Badge className={cn("text-white text-xs", getHealthBg(stats.marginHealth.paylater.avgMarginPercent))}>
                      {getHealthLabel(stats.marginHealth.paylater.avgMarginPercent)}
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={cn("text-2xl font-bold", getHealthColor(stats.marginHealth.paylater.avgMarginPercent))}>
                        {stats.marginHealth.paylater.avgMarginPercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Avg margin</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(stats.marginHealth.paylater.totalProfit)}</p>
                      <p className="text-xs text-muted-foreground">{stats.marginHealth.paylater.count} tx</p>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(100, stats.marginHealth.paylater.avgMarginPercent * 10)}
                    className="mt-3 h-1.5"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Type Distribution */}
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-fuchsia-500/10">
                    <PieChartIcon className="h-4 w-4 text-fuchsia-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Payment Distribution</CardTitle>
                    <CardDescription className="text-xs">Volume by payment type</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {paymentTypeData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <PieChart>
                        <Pie
                          data={paymentTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {paymentTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex items-center gap-6 mt-2">
                      {paymentTypeData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <div>
                            <p className="text-xs font-medium">{entry.name}</p>
                            <p className="text-[10px] text-muted-foreground">{entry.count} tx · {formatCurrency(entry.value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center">
                      <PieChartIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Belum ada data distribusi</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ==================== MARGIN TREND CHART ==================== */}
          {filteredMarginTrend.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Activity className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Margin Trend</CardTitle>
                      <CardDescription className="text-xs">CC vs Paylater daily margin</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <LineChart data={filteredMarginTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tickFormatter={formatDateLabel} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="ccMargin" stroke="hsl(262 83% 58%)" strokeWidth={2} dot={false} name="CC Margin" />
                      <Line type="monotone" dataKey="paylaterMargin" stroke="hsl(330 80% 55%)" strokeWidth={2} dot={false} name="Paylater Margin" />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ==================== TOP PARTNERS + TARGET PROGRESS ==================== */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Partners Bar Chart */}
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Trophy className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Top Partners</CardTitle>
                      <CardDescription className="text-xs">By profit</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push('/owner/partners')}>
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {topPartnersChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <BarChart data={topPartnersChartData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                      <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={80} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="profit" fill="hsl(262 83% 58%)" radius={[0, 6, 6, 0]} name="Profit" />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Belum ada data mitra</p>
                    </div>
                  </div>
                )}

                {/* Top 3 Partner List */}
                {stats.topPartners.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {stats.topPartners.slice(0, 3).map((partner, i) => (
                      <div
                        key={partner.partnerId}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/owner/partners?id=${partner.partnerId}`)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold",
                            i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : "bg-amber-600"
                          )}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{partner.name}</p>
                            <div className="flex items-center gap-1.5">
                              <Badge className={cn("text-white text-[9px] px-1.5 py-0", tierColors[partner.tier] || 'bg-slate-500')}>
                                {partner.tier}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{partner.transactions} tx</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(partner.profit)}</p>
                          <p className="text-[10px] text-muted-foreground">Profit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Partners Near Target */}
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Target className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Target Progress</CardTitle>
                    <CardDescription className="text-xs">Partners near monthly target</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {stats.partnersNearTarget && stats.partnersNearTarget.length > 0 ? (
                  <ScrollArea className="max-h-[340px]">
                    <div className="space-y-3 pr-2">
                      {stats.partnersNearTarget.map((partner) => (
                        <div
                          key={partner.partnerId}
                          className="p-3 rounded-xl border bg-gradient-to-r from-blue-500/5 to-cyan-500/5 hover:from-blue-500/10 hover:to-cyan-500/10 transition-colors cursor-pointer"
                          onClick={() => router.push(`/owner/partners?id=${partner.partnerId}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{partner.name}</span>
                              <Badge className={cn("text-white text-[9px] px-1.5 py-0", tierColors[partner.tier] || 'bg-slate-500')}>
                                {partner.tier}
                              </Badge>
                            </div>
                            <Badge className={cn(
                              "text-white text-[9px]",
                              partner.progress >= 90 ? "bg-emerald-500" :
                              partner.progress >= 75 ? "bg-blue-500" :
                              "bg-amber-500"
                            )}>
                              {partner.progress.toFixed(0)}%
                            </Badge>
                          </div>
                          <Progress value={partner.progress} className="h-1.5 mb-2" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{formatCurrency(partner.totalProfit)}</span>
                            <span>Target: {formatCurrency(partner.targetAmount)}</span>
                          </div>
                          {partner.progress >= 90 && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 mt-1">
                              <Sparkles className="h-3 w-3" />
                              <span>Gap: {formatCurrency(partner.gap)} lagi!</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center">
                      <Target className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Belum ada mitra mendekati target</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ==================== 30-DAY FORECAST ==================== */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection('forecast')}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Eye className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">30-Day Forecast</h2>
                    <p className="text-xs text-muted-foreground">Predicted volume & profit</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Predicted Volume</p>
                    <p className="text-sm font-bold text-violet-600">{formatCurrency(stats.forecast.predicted30DaysVolume)}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Predicted Profit</p>
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(stats.forecast.predicted30DaysProfit)}</p>
                  </div>
                  {expandedSection.forecast ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
              <AnimatePresence>
                {expandedSection.forecast && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t p-4">
                      <div className="grid grid-cols-2 gap-3 mb-4 sm:hidden">
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

                      {stats.forecast.dailyData && stats.forecast.dailyData.length > 0 && (
                        <ChartContainer config={chartConfig} className="h-[200px] w-full">
                          <AreaChart data={stats.forecast.dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="forecastVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="date" tickFormatter={formatDateLabel} fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area type="monotone" dataKey="predictedVolume" stroke="hsl(262 83% 58%)" fill="url(#forecastVolume)" strokeWidth={2} strokeDasharray="5 5" name="Predicted Volume" />
                          </AreaChart>
                        </ChartContainer>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* ==================== TOP VOLUME 30 DAYS ==================== */}
          {stats.topPartnersByVolume30Days && stats.topPartnersByVolume30Days.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-cyan-500/10">
                        <Flame className="h-4 w-4 text-cyan-500" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Top Volume 30 Hari</CardTitle>
                        <CardDescription className="text-xs">Partners with highest transaction volume</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {stats.topPartnersByVolume30Days.map((partner, i) => (
                      <div
                        key={partner.partnerId}
                        className="flex items-center justify-between p-3 rounded-xl border bg-gradient-to-r from-cyan-500/5 to-blue-500/5 hover:from-cyan-500/10 hover:to-blue-500/10 transition-colors cursor-pointer"
                        onClick={() => router.push(`/owner/partners?id=${partner.partnerId}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                            i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-600" : "bg-cyan-500"
                          )}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{partner.name}</p>
                            <Badge className={cn("text-white text-[9px] px-1.5 py-0", tierColors[partner.tier] || 'bg-slate-500')}>
                              {partner.tier}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-cyan-600">{formatCurrency(partner.totalVolume)}</p>
                          <p className="text-[10px] text-muted-foreground">{partner.transactions} transaksi</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ==================== RECENT TRANSACTIONS ==================== */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection('transactions')}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">Recent Transactions</h2>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => { e.stopPropagation(); router.push('/owner/transactions') }}
                  >
                    View All
                  </Button>
                  {expandedSection.transactions ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
              <AnimatePresence>
                {expandedSection.transactions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t">
                      {stats.recentTransactions.length === 0 ? (
                        <div className="p-8 text-center">
                          <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">No recent transactions</p>
                        </div>
                      ) : (
                        <ScrollArea className="max-h-[360px]">
                          <div className="divide-y">
                            {stats.recentTransactions.slice(0, 8).map((tx) => {
                              const status = statusConfig[tx.status] || statusConfig.PENDING
                              const StatusIcon = status.icon
                              return (
                                <div
                                  key={tx.orderId}
                                  className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                                  onClick={() => router.push(`/track?orderId=${tx.orderId}`)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center">
                                      <CircleDot className="h-5 w-5 text-violet-500" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{tx.customerName}</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{formatRelativeTime(tx.createdAt)}</span>
                                        <span className="text-[10px] text-muted-foreground">· {tx.paymentType}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold">{formatCurrency(tx.nominal)}</p>
                                    <Badge className={cn("text-[9px] px-1.5 py-0", status.bg, status.text)}>
                                      {tx.status}
                                    </Badge>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* Bottom spacing for mobile bottom nav */}
          <div className="h-4 md:h-0" />
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
