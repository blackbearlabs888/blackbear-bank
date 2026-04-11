'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  DollarSign,
  ShoppingBag,
  BarChart3,
  Users,
  Trophy,
  CheckCircle2,
  Minus,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatNumber } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import type { PartnerKPI, PartnerKPIWithTrend } from '@/types'

interface PartnerKPISummary {
  currentMonth: PartnerKPIWithTrend
  monthlyData: PartnerKPI[]
  achievementHistory: Array<{
    year: number
    month: number
    achieved: boolean
    progress: number
  }>
  totalAchievements: number
  avgProgress: number
  kpiTarget: number
}

interface PartnerKPICardProps {
  partnerId: string
  className?: string
}

// Month names in Indonesian
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

const FULL_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Animated Progress Bar Component
function AnimatedProgress({
  value,
  className,
  indicatorClassName,
}: {
  value: number
  className?: string
  indicatorClassName?: string
}) {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value)
    }, 100)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className={cn('relative h-4 w-full overflow-hidden rounded-full bg-muted/30', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden',
          indicatorClassName
        )}
        style={{ width: `${animatedValue}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>
    </div>
  )
}

// Trend Badge Component
function TrendBadge({ trend, label }: { trend: number; label: string }) {
  const isPositive = trend > 0
  const isNeutral = trend === 0

  return (
    <div className={cn(
      'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
      isPositive ? 'bg-green-500/20 text-green-500' :
      isNeutral ? 'bg-muted text-muted-foreground' :
      'bg-red-500/20 text-red-500'
    )}>
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNeutral && <Minus className="h-3 w-3" />}
      {!isPositive && !isNeutral && <TrendingDown className="h-3 w-3" />}
      <span>{isPositive && trend > 0 ? '+' : ''}{trend.toFixed(1)}%</span>
      <span className="text-muted-foreground hidden sm:inline">{label}</span>
    </div>
  )
}

// Mini Stat Card
function MiniStatCard({
  title,
  value,
  icon: Icon,
  trend,
  colorClass,
}: {
  title: string
  value: string
  icon: typeof DollarSign
  trend?: number
  colorClass: string
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', colorClass)} />
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-semibold">{value}</span>
        {trend !== undefined && (
          <TrendBadge trend={trend} label="" />
        )}
      </div>
    </div>
  )
}

export function PartnerKPICard({ partnerId, className }: PartnerKPICardProps) {
  const [data, setData] = useState<PartnerKPISummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/partners/${partnerId}/kpi`)
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch KPI data')
      }
    } catch (err) {
      setError('Failed to load KPI data')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCalculate = async () => {
    setIsCalculating(true)
    try {
      const response = await fetch(`/api/partners/${partnerId}/kpi/calculate`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        // Refresh data after calculation
        await fetchData()
      }
    } catch (err) {
      console.error('Error calculating KPI:', err)
    } finally {
      setIsCalculating(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [partnerId])

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-6 text-center">
          <p className="text-destructive">{error || 'Failed to load data'}</p>
          <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { currentMonth, monthlyData, achievementHistory, totalAchievements, avgProgress, kpiTarget } = data
  const currentMonthName = FULL_MONTH_NAMES[currentMonth.month - 1]

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-b">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                KPI Bulanan
              </CardTitle>
              <CardDescription>
                {currentMonthName} {currentMonth.year}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCalculate}
              disabled={isCalculating}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isCalculating && 'animate-spin')} />
              Hitung
            </Button>
          </div>
        </CardHeader>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Target Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Target Progress</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-sm font-semibold',
                currentMonth.targetAchieved ? 'text-green-500' : 'text-foreground'
              )}>
                {currentMonth.targetProgress.toFixed(1)}%
              </span>
              {currentMonth.targetAchieved && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Tercapai
                </Badge>
              )}
            </div>
          </div>
          <AnimatedProgress
            value={Math.min(100, currentMonth.targetProgress)}
            indicatorClassName={cn(
              currentMonth.targetAchieved
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : currentMonth.targetProgress >= 75
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                : 'bg-gradient-to-r from-primary to-primary/80'
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Target: {formatCurrency(kpiTarget)}</span>
            <span>Tercapai: {formatCurrency(currentMonth.totalVolume)}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <MiniStatCard
            title="Profit"
            value={formatCurrency(currentMonth.totalProfit)}
            icon={DollarSign}
            trend={currentMonth.profitTrend}
            colorClass="text-green-500"
          />
          <MiniStatCard
            title="Volume"
            value={formatCurrency(currentMonth.totalVolume)}
            icon={BarChart3}
            trend={currentMonth.volumeTrend}
            colorClass="text-blue-500"
          />
          <MiniStatCard
            title="Transaksi"
            value={formatNumber(currentMonth.totalTrans)}
            icon={ShoppingBag}
            trend={currentMonth.transTrend}
            colorClass="text-purple-500"
          />
          <MiniStatCard
            title="Customer Baru"
            value={formatNumber(currentMonth.newCustomers)}
            icon={Users}
            colorClass="text-cyan-500"
          />
        </div>

        {/* Monthly Chart */}
        {monthlyData.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Tren Profit (12 Bulan)</p>
            <div className="h-20 flex items-end gap-1">
              {monthlyData.slice(-12).map((item, index) => {
                const maxProfit = Math.max(...monthlyData.map(m => m.totalProfit), 1)
                const height = (item.totalProfit / maxProfit) * 100
                const isCurrentMonth = item.year === currentMonth.year && item.month === currentMonth.month

                return (
                  <div
                    key={`${item.year}-${item.month}`}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className={cn(
                        'w-full rounded-t transition-all duration-300',
                        isCurrentMonth
                          ? 'bg-gradient-to-t from-primary to-primary/60'
                          : 'bg-muted-foreground/20 hover:bg-muted-foreground/30'
                      )}
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${MONTH_NAMES[item.month - 1]} ${item.year}: ${formatCurrency(item.totalProfit)}`}
                    />
                    {index % 3 === 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {MONTH_NAMES[item.month - 1]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Achievement Summary */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium">Achievement</p>
              <p className="text-xs text-muted-foreground">
                Rata-rata progress: {avgProgress.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-500">{totalAchievements}</p>
            <p className="text-xs text-muted-foreground">Target tercapai</p>
          </div>
        </div>

        {/* Recent Achievements */}
        {achievementHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Riwayat Achievement</p>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {achievementHistory.slice(0, 5).map((item, index) => (
                  <div
                    key={`${item.year}-${item.month}-${index}`}
                    className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                  >
                    <span>{FULL_MONTH_NAMES[item.month - 1]} {item.year}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.progress.toFixed(0)}%</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
