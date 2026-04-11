'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  BarChart3,
  Clock,
  Trophy,
  Medal,
  Award,
  Star,
  Crown,
  Target,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  X,
  Zap,
  Gift,
  BadgeCheck,
  ArrowRight,
  Minus,
  ChevronLeft,
  ChevronRight,
  Menu,
  Info
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { LoadingSpinner } from '@/components/shared/loading'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatCurrency, formatNumber } from '@/lib/calculations'
import { apiFetch } from '@/lib/api'
import { useAuthStore, useIsPartner } from '@/store/auth'
import { cn } from '@/lib/utils'

interface PartnerStats {
  profit: number
  transactions: number
  volume: number
  pending: number
  lastMonthProfit?: number
  lastMonthTransactions?: number
  lastMonthVolume?: number
}

interface TierInfo {
  current: string
  calculated: string
  progress: number
  gapToNext: number
  nextTier: string | null
  commissionRate: number
  badge: string | null
}

interface TargetInfo {
  amount: number
  progress: number
  currentAmount: number
}

interface LeaderboardItem {
  partnerId: string
  name: string
  profit: number
  volume: number
  transactions: number
  tier: string
  badge: string | null
  rank: number
  avatar?: string | null
}

interface VolumeLeaderboardItem {
  partnerId: string
  name: string
  tier: string
  totalVolume: number
  transactions: number
  avatar?: string | null
  rank: number
}

interface BadgeHistoryItem {
  id: string
  year: number
  month: number
  badge: string
  profit: number
  volume: number
  transactions: number
  rank: number
}

interface Announcement {
  id: string
  title: string
  description: string
  type?: string
}

interface PartnerInfo {
  id: string
  name: string
  email: string
  avatar: string | null
  tier: string
  badge: string | null
  totalProfit: number
  totalVolume: number
  totalTransactions: number
}

interface DashboardData {
  stats: PartnerStats
  tier: TierInfo
  target: TargetInfo
  leaderboard: LeaderboardItem[]
  partnerRank: number
  gapToNextRank: number
  topPartnersByVolume30Days: VolumeLeaderboardItem[]
  partnerVolumeRank: number
  gapToNextVolumeRank: number
  badgeHistory: BadgeHistoryItem[]
  announcements: Announcement[]
  partner: PartnerInfo
  achievements?: string[]
}

// Tier configuration with enhanced styling
const TIER_CONFIG: Record<string, { 
  color: string
  bgClass: string
  gradientClass: string
  borderClass: string
  icon: typeof Trophy
  minProfit: number
  glowColor: string
}> = {
  Bronze: { 
    color: 'text-amber-600', 
    bgClass: 'bg-amber-500/20', 
    gradientClass: 'from-amber-500/20 via-amber-600/10 to-transparent',
    borderClass: 'border-amber-500/30',
    icon: Medal, 
    minProfit: 0,
    glowColor: 'shadow-amber-500/20'
  },
  Silver: { 
    color: 'text-slate-400', 
    bgClass: 'bg-slate-400/20', 
    gradientClass: 'from-slate-400/20 via-slate-500/10 to-transparent',
    borderClass: 'border-slate-400/30',
    icon: Medal, 
    minProfit: 5000000,
    glowColor: 'shadow-slate-400/20'
  },
  Gold: { 
    color: 'text-yellow-500', 
    bgClass: 'bg-yellow-500/20', 
    gradientClass: 'from-yellow-500/20 via-amber-500/10 to-transparent',
    borderClass: 'border-yellow-500/30',
    icon: Award, 
    minProfit: 10000000,
    glowColor: 'shadow-yellow-500/30'
  },
  Platinum: { 
    color: 'text-cyan-400', 
    bgClass: 'bg-cyan-500/20', 
    gradientClass: 'from-cyan-500/20 via-teal-500/10 to-transparent',
    borderClass: 'border-cyan-500/30',
    icon: Sparkles, 
    minProfit: 25000000,
    glowColor: 'shadow-cyan-500/30'
  },
  Diamond: { 
    color: 'text-purple-400', 
    bgClass: 'bg-purple-500/20', 
    gradientClass: 'from-purple-500/20 via-violet-500/10 to-transparent',
    borderClass: 'border-purple-500/30',
    icon: Crown, 
    minProfit: 50000000,
    glowColor: 'shadow-purple-500/40'
  }
}

// Badge configuration with enhanced styling
const BADGE_CONFIG: Record<string, { icon: typeof Trophy; color: string; label: string; gradient: string }> = {
  'Champion': { icon: Crown, color: 'text-yellow-500', label: 'Monthly Champion', gradient: 'from-yellow-500 to-amber-600' },
  'Top Performer': { icon: Star, color: 'text-blue-400', label: 'Top Performer', gradient: 'from-blue-500 to-cyan-500' },
  'Rising Star': { icon: Sparkles, color: 'text-green-400', label: 'Rising Star', gradient: 'from-green-500 to-emerald-500' },
  'Veteran': { icon: Award, color: 'text-amber-500', label: 'Veteran', gradient: 'from-amber-500 to-orange-500' }
}

// Achievement configuration
const ACHIEVEMENT_CONFIG: Record<string, { icon: typeof Trophy; color: string; label: string; description: string }> = {
  'First Transaction': { icon: Zap, color: 'text-blue-400', label: 'First Steps', description: 'Complete your first transaction' },
  'Target Hunter': { icon: Target, color: 'text-green-400', label: 'Target Hunter', description: 'Hit monthly target 3 times' },
  'Streak Master': { icon: Flame, color: 'text-orange-400', label: 'Streak Master', description: '10 transactions in a row' },
  'Rising Champion': { icon: TrendingUp, color: 'text-purple-400', label: 'Rising Champion', description: 'Reach Gold tier' },
  'Top Earner': { icon: DollarSign, color: 'text-emerald-400', label: 'Top Earner', description: 'Earn 1M+ in a month' },
  'Volume King': { icon: BarChart3, color: 'text-cyan-400', label: 'Volume King', description: 'Process 50M+ volume' },
  'Customer Favorite': { icon: Gift, color: 'text-pink-400', label: 'Customer Favorite', description: 'Serve 100+ customers' },
  'Consistent Partner': { icon: BadgeCheck, color: 'text-teal-400', label: 'Consistent Partner', description: 'Active for 6 months' }
}

// Month names in Indonesian
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Medal icons component for top 3 - Mobile Optimized
function MedalIcon({ rank }: { rank: number }) {
  const sizeClasses = 'w-7 h-7 sm:w-8 sm:h-8'
  
  if (rank === 1) {
    return (
      <div className="relative">
        <div className="absolute inset-0 animate-ping opacity-20">
          <div className={cn(sizeClasses, 'rounded-full bg-yellow-400')} />
        </div>
        <div className={cn(
          'relative rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/40',
          sizeClasses,
          'bg-gradient-to-br from-yellow-400 to-amber-500'
        )}>
          <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
        </div>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className={cn(
        'rounded-full flex items-center justify-center shadow-lg shadow-slate-400/30',
        sizeClasses,
        'bg-gradient-to-br from-slate-300 to-slate-500'
      )}>
        <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className={cn(
        'rounded-full flex items-center justify-center shadow-lg shadow-amber-600/30',
        sizeClasses,
        'bg-gradient-to-br from-amber-600 to-amber-700'
      )}>
        <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
      </div>
    )
  }
  return (
    <div className={cn('rounded-full bg-muted flex items-center justify-center', sizeClasses)}>
      <span className="text-xs sm:text-sm font-bold text-muted-foreground">{rank}</span>
    </div>
  )
}

// Enhanced Stats Card Component - Mobile Optimized
function EnhancedStatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  gradientFrom,
  gradientTo,
  iconBgClass
}: {
  title: string
  value: string | number
  description?: string
  icon?: typeof DollarSign
  trend?: { value: number; isPositive: boolean }
  gradientFrom: string
  gradientTo: string
  iconBgClass: string
}) {
  return (
    <Card className={cn(
      'relative overflow-hidden border-0 shadow-lg transition-all duration-300',
      'active:scale-[0.98] sm:hover:shadow-xl sm:hover:scale-[1.02]',
      'bg-gradient-to-br',
      gradientFrom, gradientTo,
      'min-h-[120px] sm:min-h-[140px]'
    )}>
      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 -mr-6 sm:-mr-8 -mt-6 sm:-mt-8 rounded-full bg-white/5 blur-2xl" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 relative z-10 px-4 pt-4">
        <CardTitle className="text-xs sm:text-sm font-medium text-white/80 line-clamp-1">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn(
            'p-1.5 sm:p-2 rounded-lg sm:rounded-xl min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center',
            iconBgClass
          )}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
        )}
      </CardHeader>
      <CardContent className="relative z-10 px-4 pb-4">
        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white line-clamp-1">{value}</div>
        {description && (
          <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 sm:mt-1 line-clamp-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-300 flex-shrink-0" />
            ) : trend.value === 0 ? (
              <Minus className="h-3 w-3 text-white/60 flex-shrink-0" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-300 flex-shrink-0" />
            )}
            <span className={cn(
              'text-[10px] sm:text-xs font-medium',
              trend.isPositive ? 'text-green-300' : trend.value === 0 ? 'text-white/60' : 'text-red-300'
            )}>
              {trend.isPositive && trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-[10px] sm:text-xs text-white/50 hidden sm:inline">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Animated Tier Badge Component - Mobile Optimized
function AnimatedTierBadge({ tier, tierConfig, size = 'default' }: { tier: string; tierConfig: typeof TIER_CONFIG['Bronze']; size?: 'sm' | 'default' }) {
  const TierIcon = tierConfig.icon
  const isSmall = size === 'sm'
  
  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className={cn(
        'absolute inset-0 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300',
        tierConfig.bgClass
      )} />
      
      {/* Badge */}
      <div className={cn(
        'relative rounded-full flex items-center justify-center',
        'bg-gradient-to-br',
        tierConfig.gradientClass,
        'border-2',
        tierConfig.borderClass,
        'shadow-lg',
        tierConfig.glowColor,
        'group-hover:scale-110 transition-transform duration-300',
        isSmall ? 'w-14 h-14' : 'w-16 h-16 sm:w-20 sm:h-20'
      )}>
        <TierIcon className={cn('animate-pulse', isSmall ? 'h-7 w-7' : 'h-8 w-8 sm:h-10 sm:w-10', tierConfig.color)} />
      </div>
      
      {/* Sparkle animation for top tiers */}
      {(tier === 'Diamond' || tier === 'Platinum') && (
        <div className="absolute inset-0">
          <Sparkles className={cn(
            'absolute top-0 right-0',
            isSmall ? 'h-3 w-3' : 'h-4 w-4',
            tierConfig.color,
            'animate-bounce'
          )} />
        </div>
      )}
    </div>
  )
}

// Animated Progress Bar Component
function AnimatedProgress({ 
  value, 
  className,
  indicatorClassName,
  showAnimation = true 
}: { 
  value: number
  className?: string
  indicatorClassName?: string
  showAnimation?: boolean
}) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const isFirstRender = useRef(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value)
    }, showAnimation && isFirstRender.current ? 100 : 0)
    isFirstRender.current = false
    return () => clearTimeout(timer)
  }, [value, showAnimation])
  
  return (
    <div className={cn('relative h-4 w-full overflow-hidden rounded-full bg-muted/30', className)}>
      <div 
        className={cn(
          'h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden',
          indicatorClassName
        )}
        style={{ width: `${animatedValue}%` }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>
    </div>
  )
}

// Achievement Badge Component - Mobile Optimized with Sheet
function AchievementBadge({ achievement }: { achievement: string }) {
  const config = ACHIEVEMENT_CONFIG[achievement]
  if (!config) return null
  
  const Icon = config.icon
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className={cn(
          'p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-muted to-muted/50',
          'border border-border/50 hover:border-primary/50',
          'transition-all duration-300 active:scale-95 sm:hover:scale-110 cursor-pointer',
          'shadow-sm hover:shadow-md',
          'min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex items-center justify-center'
        )}>
          <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', config.color)} />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-3 rounded-xl bg-gradient-to-br from-muted to-muted/50',
              'border border-border/50'
            )}>
              <Icon className={cn('h-8 w-8', config.color)} />
            </div>
            <div>
              <SheetTitle className="text-lg">{config.label}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{achievement}</p>
            </div>
          </div>
        </SheetHeader>
        <div className="mt-4 p-4 rounded-xl bg-muted/50">
          <p className="text-sm">{config.description}</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function PartnerDashboardPage() {
  const router = useRouter()
  const isPartner = useIsPartner()
  const { partner } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBroadcast, setShowBroadcast] = useState(true)
  const [isBroadcastPaused, setIsBroadcastPaused] = useState(false)
  const broadcastRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isPartner || !partner) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        const response = await apiFetch(`/api/stats/partner?partnerId=${partner.id}`)
        // Check 401 before parsing JSON
        if (response.status === 401) {
          useAuthStore.getState().logout()
          return
        }
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error || 'Failed to fetch data')
        }
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    // Hydrate auth state, then fetch dashboard data
    useAuthStore.getState().hydrate().then(() => {
      if (useAuthStore.getState().isAuthenticated) {
        fetchData()
      }
    })
  }, [isPartner, partner, router])

  // Calculate trend percentages
  const calculateTrend = (current: number, previous?: number) => {
    if (!previous || previous === 0) return { value: 0, isPositive: current > 0 }
    const change = ((current - previous) / previous) * 100
    return { value: Math.round(change), isPositive: change >= 0 }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Broadcast skeleton */}
          <Skeleton className="h-12 w-full" />
          
          {/* Header skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          {/* Stats skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          
          {/* Main content skeleton */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-destructive">{error || 'Failed to load data'}</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const tierConfig = TIER_CONFIG[data.tier.current] || TIER_CONFIG['Bronze']

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Running Text Broadcast - Mobile Optimized */}
        {data.announcements.length > 0 && showBroadcast && (
          <div className="relative overflow-hidden rounded-lg sm:rounded-xl">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMjBjMC01LjUyMy00LjQ3Ny0xMC0xMC0xMFMwIDE0LjQ3NyAwIDIwczQuNDc3IDEwIDEwIDEwIDEwLTQuNDc3IDEwLTEwem0yMCAwYzAtNS41MjMtNC40NzctMTAtMTAtMTBTMjAgMTQuNDc3IDIwIDIwczQuNDc3IDEwIDEwIDEwIDEwLTQuNDc3IDEwLTEweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-30" />
            
            <div className="relative flex items-center">
              {/* Left icon section - Compact on mobile */}
              <div className="flex-shrink-0 px-2 sm:px-4 py-2 sm:py-3 flex items-center gap-1.5 sm:gap-2 bg-white/10">
                <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 text-white animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-white hidden sm:inline">PENGUMUMAN</span>
              </div>
              
              {/* Marquee content */}
              <div 
                className="flex-1 overflow-hidden cursor-pointer"
                onTouchStart={() => setIsBroadcastPaused(true)}
                onTouchEnd={() => setIsBroadcastPaused(false)}
                onMouseEnter={() => setIsBroadcastPaused(true)}
                onMouseLeave={() => setIsBroadcastPaused(false)}
                ref={broadcastRef}
              >
                <div className={cn(
                  'whitespace-nowrap py-2 sm:py-3 px-2 sm:px-4',
                  isBroadcastPaused ? 'animate-marquee-paused' : 'animate-marquee'
                )}>
                  {[...data.announcements, ...data.announcements].map((ann, i) => (
                    <span key={`${ann.id}-${i}`} className="inline-block text-white text-xs sm:text-sm">
                      <span className="font-semibold">{ann.title}</span>
                      <span className="mx-2 sm:mx-3 text-white/50">|</span>
                      <span className="text-white/80">{ann.description}</span>
                      {i < data.announcements.length * 2 - 1 && (
                        <span className="mx-4 sm:mx-6 text-white/30">◆</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Close button - Touch friendly */}
              <button
                onClick={() => setShowBroadcast(false)}
                className="flex-shrink-0 p-2 sm:p-3 hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close broadcast"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Page Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/20">
              <AvatarImage src={data.partner.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold text-sm sm:text-base">
                {data.partner.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text line-clamp-1">
                Selamat Datang, {data.partner.name}!
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Berikut ringkasan performa Anda
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge 
              variant="outline" 
              className="text-xs sm:text-sm px-2.5 sm:px-3 py-1 border-primary/30 bg-primary/5"
            >
              {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </Badge>
          </div>
        </div>

        {/* Personal Stats Cards - Mobile Optimized 2x2 Grid */}
        <div className="grid gap-3 grid-cols-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EnhancedStatsCard
            title="Profit Bulan Ini"
            value={formatCurrency(data.stats.profit)}
            description="Komisi dari transaksi selesai"
            icon={DollarSign}
            trend={calculateTrend(data.stats.profit, data.stats.lastMonthProfit)}
            gradientFrom="from-emerald-500"
            gradientTo="to-green-600"
            iconBgClass="bg-white/20"
          />
          <EnhancedStatsCard
            title="Transaksi Bulan Ini"
            value={formatNumber(data.stats.transactions)}
            description="Total transaksi selesai"
            icon={ShoppingBag}
            trend={calculateTrend(data.stats.transactions, data.stats.lastMonthTransactions)}
            gradientFrom="from-blue-500"
            gradientTo="to-cyan-600"
            iconBgClass="bg-white/20"
          />
          <EnhancedStatsCard
            title="Volume Bulan Ini"
            value={formatCurrency(data.stats.volume)}
            description="Total nominal transaksi"
            icon={BarChart3}
            trend={calculateTrend(data.stats.volume, data.stats.lastMonthVolume)}
            gradientFrom="from-violet-500"
            gradientTo="to-purple-600"
            iconBgClass="bg-white/20"
          />
          <EnhancedStatsCard
            title="Pending Orders"
            value={formatNumber(data.stats.pending)}
            description={data.stats.pending > 0 ? "Menunggu diproses" : "Tidak ada pending"}
            icon={Clock}
            gradientFrom={data.stats.pending > 0 ? "from-amber-500" : "from-slate-500"}
            gradientTo={data.stats.pending > 0 ? "to-orange-600" : "to-slate-600"}
            iconBgClass="bg-white/20"
          />
        </div>

        {/* Tier Progress & Target Section - Mobile Optimized */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {/* Current Tier & Progress */}
          <Card className={cn(
            'relative overflow-hidden border-2',
            tierConfig.borderClass,
            'bg-gradient-to-br',
            tierConfig.gradientClass
          )}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 -mr-8 sm:-mr-10 -mt-8 sm:-mt-10 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl" />
            
            <CardHeader className="relative z-10 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Tier & Progress
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Status tier dan progress Anda</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 sm:space-y-6 relative z-10 p-4 sm:p-6 pt-0 sm:pt-0">
              {/* Current Tier Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 sm:gap-4">
                  <AnimatedTierBadge tier={data.tier.current} tierConfig={tierConfig} size="sm" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Tier Saat Ini</p>
                    <p className={cn('text-lg sm:text-2xl font-bold', tierConfig.color)}>
                      {data.tier.current}
                    </p>
                    {data.tier.badge && BADGE_CONFIG[data.tier.badge] && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          'mt-1 bg-gradient-to-r text-[10px] sm:text-xs',
                          BADGE_CONFIG[data.tier.badge].gradient,
                          'text-white border-0'
                        )}
                      >
                        {(() => {
                          const BadgeIcon = BADGE_CONFIG[data.tier.badge].icon
                          return <BadgeIcon className="h-3 w-3 mr-1" />
                        })()}
                        {data.tier.badge}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-muted-foreground">Komisi</p>
                  <div className="flex items-center gap-1 justify-end">
                    <p className="text-lg sm:text-2xl font-bold text-green-500">
                      {(data.tier.commissionRate * 100).toFixed(0)}%
                    </p>
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {data.tier.nextTier && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      Progress ke {data.tier.nextTier}
                    </span>
                    <span className="font-semibold">{data.tier.progress.toFixed(1)}%</span>
                  </div>
                  <AnimatedProgress 
                    value={data.tier.progress} 
                    indicatorClassName="bg-gradient-to-r from-primary to-primary/80"
                  />
                  <div className="flex items-center justify-center gap-2 p-2 sm:p-3 rounded-lg bg-background/50 border">
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-center">
                      Butuh <span className="font-bold text-primary">{formatCurrency(data.tier.gapToNext)}</span> untuk naik tier
                    </p>
                  </div>
                </div>
              )}

              {/* Max Tier Message */}
              {!data.tier.nextTier && (
                <div className="text-center p-3 sm:p-4 rounded-lg bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-pink-500/20 border border-purple-500/30">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 animate-ping opacity-30">
                      <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400" />
                    </div>
                    <Crown className="relative h-8 w-8 sm:h-10 sm:w-10 text-purple-400 mx-auto mb-2" />
                  </div>
                  <p className="font-bold text-purple-400 text-base sm:text-lg">Tier Maksimal!</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Anda sudah di tier tertinggi</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Target Progress */}
          <Card className="bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Target Bulanan
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Progress pencapaian target bulan ini</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Target</p>
                  <p className="text-lg sm:text-2xl font-bold">{formatCurrency(data.target.amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-muted-foreground">Tercapai</p>
                  <div className="flex items-center gap-1 justify-end">
                    <p className={cn(
                      'text-lg sm:text-2xl font-bold',
                      data.target.progress >= 100 ? 'text-green-500' : 'text-foreground'
                    )}>
                      {formatCurrency(data.target.currentAmount)}
                    </p>
                    {data.target.progress >= 100 && (
                      <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span>Progress</span>
                  <span className={cn(
                    'font-semibold px-2 py-0.5 rounded-full text-[10px] sm:text-xs',
                    data.target.progress >= 100 ? 'bg-green-500/20 text-green-500' :
                    data.target.progress >= 75 ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {data.target.progress.toFixed(1)}%
                  </span>
                </div>
                <AnimatedProgress 
                  value={Math.min(100, data.target.progress)}
                  indicatorClassName={cn(
                    data.target.progress >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    data.target.progress >= 75 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                    'bg-gradient-to-r from-primary to-primary/80'
                  )}
                />
              </div>

              {data.target.progress < 100 && (
                <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-yellow-500/20">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Menuju Target</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Kurang <span className="font-semibold text-yellow-500">{formatCurrency(data.target.amount - data.target.currentAmount)}</span> lagi
                    </p>
                  </div>
                </div>
              )}

              {data.target.progress >= 100 && (
                <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-green-500">Target Tercapai!</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Luar biasa! Target bulan ini berhasil dicapai</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Section - Mobile Optimized with Collapsible */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {/* Top 5 Leaderboard - Mobile Version with Collapsible */}
          <Card className="sm:hidden">
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <CardHeader className="p-4 cursor-pointer active:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      Leaderboard Bulan Ini
                    </CardTitle>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-4 pt-0">
                  <ScrollArea className="max-h-80 -webkit-overflow-scrolling-touch">
                    <div className="space-y-1.5">
                      {data.leaderboard.map((item, index) => {
                        const isCurrentUser = item.partnerId === partner?.id
                        const itemTierConfig = TIER_CONFIG[item.tier] || TIER_CONFIG['Bronze']
                        
                        return (
                          <div
                            key={item.partnerId}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg transition-all duration-300',
                              isCurrentUser 
                                ? 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/30' 
                                : 'border border-transparent active:bg-muted/30'
                            )}
                          >
                            <MedalIcon rank={index + 1} />
                            <Avatar className={cn(
                              'h-8 w-8 ring-2 flex-shrink-0',
                              isCurrentUser ? 'ring-primary/50' : 'ring-transparent'
                            )}>
                              <AvatarImage src={item.avatar || undefined} />
                              <AvatarFallback className={cn(itemTierConfig.bgClass, itemTierConfig.color, 'text-xs')}>
                                {item.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={cn('font-medium truncate text-sm', isCurrentUser && 'text-primary')}>
                                  {item.name}
                                </p>
                                {isCurrentUser && (
                                  <Badge variant="default" className="text-[10px]">Anda</Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {item.transactions} transaksi
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-green-500 text-xs">{formatCurrency(item.profit)}</p>
                              <Badge variant="secondary" className={cn('text-[10px] mt-0.5', itemTierConfig.bgClass, itemTierConfig.color)}>
                                {item.tier}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                  {data.partnerRank > 5 && (
                    <div className="mt-3 p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                          #{data.partnerRank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-primary text-sm truncate">{data.partner.name} (Anda)</p>
                          <p className="text-[10px] text-muted-foreground">
                            Kurang <span className="font-semibold text-green-500">{formatCurrency(data.gapToNextRank)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          
          {/* Desktop Leaderboard */}
          <Card className="hidden sm:block">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                Leaderboard Bulan Ini
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Top 5 partner dengan profit tertinggi</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <ScrollArea className="max-h-80 sm:max-h-96 -webkit-overflow-scrolling-touch">
                <div className="space-y-1.5 sm:space-y-2">
                  {data.leaderboard.map((item, index) => {
                    const isCurrentUser = item.partnerId === partner?.id
                    const itemTierConfig = TIER_CONFIG[item.tier] || TIER_CONFIG['Bronze']
                    
                    return (
                      <div
                        key={item.partnerId}
                        className={cn(
                          'flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300',
                          isCurrentUser 
                            ? 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 shadow-lg shadow-primary/10' 
                            : 'hover:bg-muted/50 border border-transparent active:bg-muted/30'
                        )}
                      >
                        {/* Rank with Medal */}
                        <MedalIcon rank={index + 1} />

                        {/* Avatar */}
                        <Avatar className={cn(
                          'h-8 w-8 sm:h-10 sm:w-10 ring-2 flex-shrink-0',
                          isCurrentUser ? 'ring-primary/50' : 'ring-transparent'
                        )}>
                          <AvatarImage src={item.avatar || undefined} />
                          <AvatarFallback className={cn(itemTierConfig.bgClass, itemTierConfig.color, 'text-xs sm:text-sm')}>
                            {item.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <p className={cn(
                              'font-medium truncate text-sm sm:text-base',
                              isCurrentUser && 'text-primary'
                            )}>
                              {item.name}
                            </p>
                            {isCurrentUser && (
                              <Badge variant="default" className="text-[10px] sm:text-xs">
                                Anda
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                            <span>{item.transactions} transaksi</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{formatCurrency(item.volume)}</span>
                          </div>
                        </div>

                        {/* Profit */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-green-500 text-xs sm:text-sm">
                            {formatCurrency(item.profit)}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={cn('text-[10px] sm:text-xs mt-0.5 sm:mt-1', itemTierConfig.bgClass, itemTierConfig.color)}
                          >
                            {item.tier}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Current Partner Position (if not in top 5) */}
              {data.partnerRank > 5 && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm sm:text-lg">
                      #{data.partnerRank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary text-sm truncate">{data.partner.name} (Anda)</p>
                      <p className="text-[10px] sm:text-sm text-muted-foreground">
                        Kurang <span className="font-semibold text-green-500">{formatCurrency(data.gapToNextRank)}</span> untuk naik rank
                      </p>
                    </div>
                    <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-bounce flex-shrink-0" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Volume 30 Days - Mobile Optimized */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500" />
                Top Volume 30 Hari
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Partner dengan volume penjualan tertinggi</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <ScrollArea className="max-h-80 sm:max-h-96 -webkit-overflow-scrolling-touch">
                <div className="space-y-1.5 sm:space-y-2">
                  {data.topPartnersByVolume30Days.map((item, index) => {
                    const isCurrentUser = item.partnerId === partner?.id
                    const itemTierConfig = TIER_CONFIG[item.tier] || TIER_CONFIG['Bronze']
                    
                    return (
                      <div
                        key={item.partnerId}
                        className={cn(
                          'flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300',
                          isCurrentUser 
                            ? 'bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border-2 border-violet-500/30' 
                            : 'hover:bg-muted/50 border border-transparent active:bg-muted/30'
                        )}
                      >
                        {/* Rank with Medal */}
                        <MedalIcon rank={index + 1} />

                        {/* Avatar */}
                        <Avatar className={cn(
                          'h-8 w-8 sm:h-10 sm:w-10 ring-2 flex-shrink-0',
                          isCurrentUser ? 'ring-violet-500/50' : 'ring-transparent'
                        )}>
                          <AvatarImage src={item.avatar || undefined} />
                          <AvatarFallback className={cn(itemTierConfig.bgClass, itemTierConfig.color, 'text-xs sm:text-sm')}>
                            {item.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <p className={cn(
                              'font-medium truncate text-sm sm:text-base',
                              isCurrentUser && 'text-violet-600'
                            )}>
                              {item.name}
                            </p>
                            {isCurrentUser && (
                              <Badge variant="default" className="text-[10px] sm:text-xs bg-violet-500">
                                Anda
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                            <span>{item.transactions} transaksi</span>
                          </div>
                        </div>

                        {/* Volume */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-violet-500 text-xs sm:text-sm">
                            {formatCurrency(item.totalVolume)}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={cn('text-[10px] sm:text-xs mt-0.5 sm:mt-1', itemTierConfig.bgClass, itemTierConfig.color)}
                          >
                            {item.tier}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Current Partner Position (if not in top 5) */}
              {data.partnerVolumeRank > 5 && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-dashed border-violet-500/30 bg-violet-500/5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm sm:text-lg">
                      #{data.partnerVolumeRank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-violet-600 text-sm truncate">{data.partner.name} (Anda)</p>
                      <p className="text-[10px] sm:text-sm text-muted-foreground">
                        Kurang <span className="font-semibold text-violet-500">{formatCurrency(data.gapToNextVolumeRank)}</span> untuk naik rank
                      </p>
                    </div>
                    <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500 animate-bounce flex-shrink-0" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badge History & Achievements - Mobile Optimized */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Medal className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                Riwayat & Pencapaian
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Badge dan pencapaian Anda</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {/* Achievement Badges */}
              {data.achievements && data.achievements.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Achievement Badges</p>
                  <div className="flex flex-wrap gap-2">
                    {data.achievements.map((achievement) => (
                      <AchievementBadge key={achievement} achievement={achievement} />
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-3 sm:pt-4">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Riwayat Badge Bulanan</p>
                {data.badgeHistory.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="p-3 sm:p-4 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                      <Flame className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
                    </div>
                    <p className="font-medium text-muted-foreground text-sm sm:text-base">Belum ada badge</p>
                    <p className="text-xs sm:text-sm text-muted-foreground/70">Raih posisi terbaik untuk mendapatkan badge!</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-48 sm:max-h-64 -webkit-overflow-scrolling-touch">
                    <div className="space-y-1.5 sm:space-y-2">
                      {data.badgeHistory.map((item) => {
                        const badgeConfig = BADGE_CONFIG[item.badge]
                        const BadgeIcon = badgeConfig?.icon || Medal
                        
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl border bg-gradient-to-r from-amber-500/5 to-transparent hover:from-amber-500/10 transition-colors"
                          >
                            <div className={cn(
                              'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0',
                              'bg-gradient-to-br',
                              badgeConfig?.gradient || 'from-amber-500 to-amber-600'
                            )}>
                              <BadgeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <p className="font-medium text-sm sm:text-base">{item.badge}</p>
                                <Badge variant="outline" className="text-[10px] sm:text-xs">
                                  #{item.rank}
                                </Badge>
                              </div>
                              <p className="text-[10px] sm:text-sm text-muted-foreground">
                                {MONTH_NAMES[item.month - 1]} {item.year}
                              </p>
                              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                                <span className="text-green-500 font-medium">{formatCurrency(item.profit)}</span>
                                <span>•</span>
                                <span>{item.transactions} transaksi</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gap Indicator / Motivation Card - Mobile Optimized */}
        {(data.tier.gapToNext > 0 || (data.partnerRank > 1 && data.gapToNextRank > 0) || data.target.progress < 100) && (
          <Card className="relative overflow-hidden bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/30">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 sm:w-60 sm:h-60 -mr-12 sm:-mr-20 -mt-12 sm:-mt-20 rounded-full bg-gradient-to-br from-violet-500/20 to-transparent blur-3xl" />
            <div className="absolute bottom-0 left-0 w-28 h-28 sm:w-40 sm:h-40 -ml-6 sm:-ml-10 -mb-6 sm:-mb-10 rounded-full bg-gradient-to-tr from-fuchsia-500/20 to-transparent blur-3xl" />
            
            <CardContent className="p-4 sm:p-6 pt-4 sm:pt-6 relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
                  <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                    Tingkatkan Performa!
                  </h3>
                  <div className="mt-2 sm:mt-3 grid gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    {data.tier.gapToNext > 0 && (
                      <div className="flex items-center gap-2 p-2 sm:p-2 rounded-lg bg-background/50">
                        <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                        <p className="text-[10px] sm:text-sm">
                          <span className="font-semibold text-primary">{formatCurrency(data.tier.gapToNext)}</span>
                          <span className="text-muted-foreground"> lagi untuk naik ke tier {data.tier.nextTier}</span>
                        </p>
                      </div>
                    )}
                    {data.partnerRank > 1 && data.gapToNextRank > 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                        <p className="text-[10px] sm:text-sm">
                          <span className="font-semibold text-green-500">{formatCurrency(data.gapToNextRank)}</span>
                          <span className="text-muted-foreground"> lagi untuk naik ke posisi #{data.partnerRank - 1}</span>
                        </p>
                      </div>
                    )}
                    {data.target.progress < 100 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                        <Target className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                        <p className="text-[10px] sm:text-sm">
                          <span className="font-semibold text-yellow-500">{formatCurrency(data.target.amount - data.target.currentAmount)}</span>
                          <span className="text-muted-foreground"> lagi untuk mencapai target bulanan</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/30 transition-all active:scale-95 sm:hover:scale-105 min-h-[44px] w-full sm:w-auto"
                  onClick={() => router.push('/partner/transactions')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Transaksi
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-marquee {
          display: inline-block;
          animation: marquee 30s linear infinite;
        }
        
        .animate-marquee-paused {
          display: inline-block;
          animation: marquee 30s linear infinite;
          animation-play-state: paused;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </DashboardLayout>
  )
}

// Plus icon component
function Plus({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
