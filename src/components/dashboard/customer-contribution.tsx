'use client'

import { useEffect, useState } from 'react'
import {
  Crown,
  Medal,
  Award,
  Star,
  TrendingUp,
  User,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatNumber } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import type { CustomerContribution, CustomerLabel } from '@/types'

interface CustomerContributionData {
  topCustomers: CustomerContribution[]
  period: string
  startDate: string
  endDate: string
  totalOwnerProfit: number
  totalCustomers: number
}

interface CustomerContributionProps {
  partnerId?: string
  className?: string
  onCustomerClick?: (customerId: string) => void
}

// Medal component for top 5
function MedalBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="relative">
        <div className="absolute inset-0 animate-ping opacity-20">
          <div className="w-10 h-10 rounded-full bg-yellow-400" />
        </div>
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/40">
          <Crown className="h-5 w-5 text-white" />
        </div>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-lg shadow-slate-400/30">
        <Medal className="h-5 w-5 text-white" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-600/30">
        <Award className="h-5 w-5 text-white" />
      </div>
    )
  }
  if (rank === 4) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
        <Star className="h-5 w-5 text-white" />
      </div>
    )
  }
  if (rank === 5) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
        <Star className="h-5 w-5 text-white" />
      </div>
    )
  }
  return (
    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
      <span className="font-bold text-muted-foreground">{rank}</span>
    </div>
  )
}

// Label badge colors
const LABEL_COLORS: Record<CustomerLabel, string> = {
  VIP: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  REGULAR: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  NEW: 'bg-green-500/20 text-green-600 border-green-500/30',
  BLACKLIST: 'bg-red-500/20 text-red-600 border-red-500/30',
}

// Period labels
const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Minggu Ini',
  monthly: 'Bulan Ini',
  yearly: 'Tahun Ini',
}

export function CustomerContributionSection({
  partnerId,
  className,
  onCustomerClick,
}: CustomerContributionProps) {
  const [data, setData] = useState<CustomerContributionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('monthly')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (partnerId) {
        params.append('partnerId', partnerId)
      }
      const response = await fetch(`/api/stats/customer-contribution?${params}`)
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError('Failed to load customer contribution data')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period, partnerId])

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
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

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 border-b">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Kontribusi Profit Customer
              </CardTitle>
              <CardDescription>
                Top 5 customer dengan kontribusi tertinggi
              </CardDescription>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Minggu Ini</SelectItem>
                <SelectItem value="monthly">Bulan Ini</SelectItem>
                <SelectItem value="yearly">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </div>

      <CardContent className="p-4">
        {/* Summary */}
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total Profit:</span>
            <span className="font-semibold text-green-500">
              {formatCurrency(data.totalOwnerProfit)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total Customer:</span>
            <span className="font-semibold">{formatNumber(data.totalCustomers)}</span>
          </div>
        </div>

        {/* Top Customers List */}
        {data.topCustomers.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada data transaksi</p>
            <p className="text-sm text-muted-foreground/70">
              Data akan muncul setelah ada transaksi selesai
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {data.topCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => onCustomerClick?.(customer.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl transition-all duration-300 cursor-pointer',
                    'border-2',
                    customer.rank <= 3
                      ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent hover:from-amber-500/10'
                      : 'border-transparent bg-muted/30 hover:bg-muted/50'
                  )}
                >
                  {/* Rank Medal */}
                  <MedalBadge rank={customer.rank} />

                  {/* Customer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{customer.name}</p>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', LABEL_COLORS[customer.label])}
                      >
                        {customer.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{customer.totalTransactions} transaksi</span>
                      <span>•</span>
                      <span>{formatCurrency(customer.totalVolume)}</span>
                    </div>
                    {customer.partnerBreakdown.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {customer.partnerBreakdown.slice(0, 2).map((p) => (
                          <Badge
                            key={p.partnerId}
                            variant="secondary"
                            className="text-[10px] py-0"
                          >
                            {p.partnerName}
                          </Badge>
                        ))}
                        {customer.partnerBreakdown.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{customer.partnerBreakdown.length - 2} lainnya
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contribution */}
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <p className="font-bold text-green-500">
                        {formatCurrency(customer.totalContribution)}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {customer.contributionPercent.toFixed(1)}% kontribusi
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Period Info */}
        <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
          Periode: {PERIOD_LABELS[data.period]} ({new Date(data.startDate).toLocaleDateString('id-ID')} - {new Date(data.endDate).toLocaleDateString('id-ID')})
        </div>
      </CardContent>
    </Card>
  )
}
