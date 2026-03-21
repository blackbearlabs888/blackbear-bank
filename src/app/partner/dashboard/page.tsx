'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Trophy,
  Target,
  Clock,
  Megaphone,
  ExternalLink,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
  Bell,
  Star,
  Zap,
  TrendingDown,
  ArrowUpRight,
  Gift,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  X,
  Radio,
  Tag,
  FileText,
  Calendar,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  description: string;
  type: 'promo' | 'broadcast' | 'announcement';
  link?: string;
  startDate?: string;
  expireDate?: string;
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const { user, partner, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBroadcast, setSelectedBroadcast] = useState<Announcement | null>(null);
  const [selectedPromo, setSelectedPromo] = useState<Announcement | null>(null);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    if (!hasHydrated) {
      hydrate();
    }
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !redirectAttempted.current) {
      redirectAttempted.current = true;
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.role === 'owner') {
        router.replace('/owner/dashboard');
      }
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'partner') {
      fetchDashboard();
    }
  }, [isAuthenticated, hasHydrated, user]);

  // Window focus revalidation for real-time data
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'partner') {
        fetchDashboard();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, hasHydrated, user]);

  const fetchDashboard = async () => {
    setDataLoading(true);
    try {
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Gagal memuat data');
      }
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setDataLoading(false);
    }
  };

  if (isLoading || !hasHydrated) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated || user?.role !== 'partner') {
    return null;
  }

  const stats = data?.stats as Record<string, number> | null;
  const partnerData = data?.partner as Record<string, unknown> | null;
  const leaderboard = data?.leaderboard as Array<Record<string, unknown>> | null;
  const announcements = data?.announcements as Announcement[] | null;
  const promos = data?.promos as Announcement[] | null;

  // Use partner data from store or API response
  const currentPartner = partner || partnerData;
  const progressPercent = Math.min(((currentPartner?.totalProfit as number || 0) / (currentPartner?.target as number || 1)) * 100, 100);

  // Find leaderboard position
  const leaderboardPosition = leaderboard?.findIndex(
    (p: Record<string, unknown>) => p.id === currentPartner?.id
  ) + 1 || 0;

  // Separate broadcasts from announcements
  const broadcasts = announcements?.filter(a => a.type === 'broadcast') || [];
  const regularAnnouncements = announcements?.filter(a => a.type === 'announcement') || [];
  const promoItems = announcements?.filter(a => a.type === 'promo') || [];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6 pb-24 md:pb-6">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-3 sm:p-6 text-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs sm:text-sm">Selamat datang kembali,</p>
            <h1 className="text-lg sm:text-2xl font-bold">{user?.name?.split(' ')[0]}! 👋</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-white/20 text-white border-white/30 capitalize text-[10px] sm:text-xs">
                {currentPartner?.tier as string}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 capitalize text-[10px] sm:text-xs">
                {currentPartner?.badge as string}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-[10px] sm:text-xs">Komisi Anda</p>
            <p className="text-xl sm:text-3xl font-bold">{currentPartner?.commission as number}%</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Broadcast Notifications */}
      {broadcasts && broadcasts.length > 0 && (
        <Card className="glass-card border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 animate-fade-in">
          <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px]">
                    BROADCAST
                  </Badge>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  {broadcasts.slice(0, 2).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBroadcast(b)}
                      className="w-full text-left p-2 sm:p-3 bg-white/50 dark:bg-white/5 rounded-lg sm:rounded-xl hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                    >
                      <p className="font-medium text-xs sm:text-sm line-clamp-1">{b.title}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{b.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements Banner (Running Text) */}
      {regularAnnouncements && regularAnnouncements.length > 0 && (
        <Card className="glass-card border-primary/20 bg-primary/5 animate-fade-in overflow-hidden">
          <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="animate-marquee whitespace-nowrap">
                  {regularAnnouncements.map((a, i) => (
                    <span key={a.id} className="text-[10px] sm:text-sm">
                      <strong>{a.title}</strong>: {a.description}
                      {i < regularAnnouncements.length - 1 && ' • '}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - Enhanced Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatsCard 
          title="Profit Saya" 
          value={formatCurrency(stats?.totalProfit || 0)} 
          icon={DollarSign} 
          gradient 
          trend={stats?.totalProfit > 0 ? 'up' : 'neutral'}
        />
        <StatsCard 
          title="Total Transaksi" 
          value={String(stats?.totalTransactions || 0)} 
          icon={ShoppingBag} 
          color="text-blue-600" 
          bg="bg-blue-100 dark:bg-blue-900/30"
          trend={stats?.totalTransactions > 0 ? 'up' : 'neutral'}
        />
        <StatsCard 
          title="Total Volume" 
          value={formatCurrency(stats?.totalVolume || 0)} 
          icon={TrendingUp} 
          color="text-green-600" 
          bg="bg-green-100 dark:bg-green-900/30"
          trend={stats?.totalVolume > 0 ? 'up' : 'neutral'}
        />
        <StatsCard 
          title="Pending" 
          value={String(stats?.pendingTransactions || 0)} 
          icon={Clock} 
          color="text-orange-600" 
          bg="bg-orange-100 dark:bg-orange-900/30"
          alert={stats?.pendingTransactions > 0}
        />
      </div>

      {/* Quick Actions - Mobile */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 tap-highlight active-scale glass-card">
          <Link href="/partner/dashboard/customers">
            <Users className="w-4 h-4" />
            <span className="text-[10px]">Kelola Customer</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 tap-highlight active-scale glass-card">
          <Link href="/partner/dashboard/transactions">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-[10px]">Riwayat Transaksi</span>
          </Link>
        </Button>
      </div>

      {/* Smart Alerts Section */}
      <SmartAlertsCard
        pendingCount={stats?.pendingTransactions || 0}
        targetProgress={progressPercent}
        leaderboardPosition={leaderboardPosition}
        newCustomersCount={stats?.newCustomersThisMonth || 0}
        announcements={announcements || []}
        promos={promoItems || []}
        dataLoading={dataLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Target Progress - Enhanced */}
        <Card className="glass-card animate-slide-up overflow-hidden">
          <div className="h-1 gradient-primary" />
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Progress Target
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Target bulanan Anda</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="flex justify-between mb-1 sm:mb-2 text-xs sm:text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-bold text-primary">{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="relative">
                  <Progress value={progressPercent} className="h-2 sm:h-3" />
                  {progressPercent >= 100 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Profit Saat Ini</p>
                  <p className="text-base sm:text-xl font-bold text-primary">
                    {formatCurrency(currentPartner?.totalProfit as number || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-muted/50">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Target</p>
                  <p className="text-base sm:text-xl font-bold">{formatCurrency(currentPartner?.target as number || 0)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                <Badge className="gradient-primary text-white text-[10px] sm:text-xs">{currentPartner?.tier as string}</Badge>
                <Badge variant="secondary" className="text-[10px] sm:text-xs">{currentPartner?.badge as string}</Badge>
                <Badge variant="outline" className="border-primary/30 text-primary text-[10px] sm:text-xs">
                  Komisi: {currentPartner?.commission as number}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard - Enhanced */}
        <Card className="glass-card animate-slide-up stagger-1 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" />
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Leaderboard
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Top 5 Partner bulan ini</CardDescription>
          </CardHeader>
          <CardContent className="px-1 sm:px-6">
            <div className="space-y-0.5 sm:space-y-1">
              {dataLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 sm:h-14 rounded-lg sm:rounded-xl" />)
              ) : leaderboard?.length ? (
                leaderboard.map((p: Record<string, unknown>, index: number) => {
                  const isMe = p.id === currentPartner?.id;
                  return (
                    <div 
                      key={p.id as string} 
                      className={cn(
                        'flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl transition-all tap-highlight active-scale',
                        isMe ? 'bg-primary/10 ring-2 ring-primary/30 shadow-md' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-xs flex-shrink-0',
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm truncate">
                          {p.name as string}
                          {isMe && <span className="text-primary ml-1 font-bold">(Anda)</span>}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{formatCurrency(p.totalProfit as number)}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px]">{p.tier as string}</Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">Belum ada data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promos Section - Enhanced */}
      {(promoItems && promoItems.length > 0) && (
        <Card className="glass-card animate-slide-up stagger-2 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
          <CardHeader className="pb-1 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Gift className="w-4 h-4 text-pink-500" />
                Promo & Materi
              </CardTitle>
              <Badge className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-[10px]">
                {promoItems.length} Aktif
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {promoItems.map((promo) => (
                <button
                  key={promo.id}
                  onClick={() => setSelectedPromo(promo)}
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 rounded-lg sm:rounded-xl hover:from-pink-100 hover:to-purple-100 dark:hover:from-pink-900/20 dark:hover:to-purple-900/20 transition-all tap-highlight active-scale border border-pink-100 dark:border-pink-900/30 text-left"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs sm:text-sm truncate">{promo.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {promo.description || 'Tap untuk melihat'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Broadcast Detail Dialog */}
      <Dialog open={!!selectedBroadcast} onOpenChange={() => setSelectedBroadcast(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Radio className="w-5 h-5 text-amber-500" />
              {selectedBroadcast?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground">{selectedBroadcast?.description}</p>
            {selectedBroadcast?.startDate && (
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>
                  {formatDate(selectedBroadcast.startDate)}
                  {selectedBroadcast.expireDate && ` - ${formatDate(selectedBroadcast.expireDate)}`}
                </span>
              </div>
            )}
            {selectedBroadcast?.link && (
              <Button asChild className="w-full gradient-primary text-white h-10 sm:h-11">
                <a href={selectedBroadcast.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Buka Link
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Promo Detail Dialog */}
      <Dialog open={!!selectedPromo} onOpenChange={() => setSelectedPromo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Gift className="w-5 h-5 text-pink-500" />
              {selectedPromo?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground">{selectedPromo?.description}</p>
            {selectedPromo?.startDate && (
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>
                  Berlaku: {formatDate(selectedPromo.startDate)}
                  {selectedPromo.expireDate && ` - ${formatDate(selectedPromo.expireDate)}`}
                </span>
              </div>
            )}
            <Button asChild className="w-full gradient-primary text-white h-10 sm:h-11">
              <a href={selectedPromo?.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Buka Materi Promo
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, gradient, color, bg, trend, alert }: { 
  title: string; 
  value: string; 
  icon: React.ElementType;
  gradient?: boolean;
  color?: string;
  bg?: string;
  trend?: 'up' | 'down' | 'neutral';
  alert?: boolean;
}) {
  return (
    <Card className={cn(
      'glass-card animate-fade-in tap-highlight active-scale overflow-hidden',
      alert && 'ring-2 ring-orange-300 dark:ring-orange-700'
    )}>
      <CardContent className="p-2 sm:p-4">
        <div className="flex items-start justify-between gap-1 sm:gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{title}</p>
            <p className={cn('text-sm sm:text-xl font-bold truncate', gradient && 'text-primary')}>{value}</p>
            {alert && (
              <p className="text-[9px] sm:text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 sm:mt-1 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Perlu ditangani
              </p>
            )}
          </div>
          <div className={cn(
            'w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0',
            gradient && 'gradient-primary shadow-md',
            !gradient && bg
          )}>
            <Icon className={cn('w-3.5 h-3.5 sm:w-5 sm:h-5', gradient ? 'text-white' : color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SmartAlertsCard({
  pendingCount,
  targetProgress,
  leaderboardPosition,
  newCustomersCount,
  announcements,
  promos,
  dataLoading,
}: {
  pendingCount: number;
  targetProgress: number;
  leaderboardPosition: number;
  newCustomersCount: number;
  announcements: Announcement[];
  promos: Announcement[];
  dataLoading: boolean;
}) {
  if (dataLoading) {
    return <Skeleton className="h-28 sm:h-32 rounded-xl sm:rounded-2xl" />;
  }

  const alerts: Array<{
    type: 'warning' | 'success' | 'info' | 'motivational';
    icon: React.ElementType;
    title: string;
    message: string;
    action?: string;
    href?: string;
  }> = [];

  // Warning: Pending transactions
  if (pendingCount > 0) {
    alerts.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'Transaksi Pending',
      message: `${pendingCount} transaksi menunggu diproses`,
      action: 'Lihat Transaksi',
      href: '/partner/dashboard/transactions',
    });
  }

  // Success/Motivational: Target progress
  if (targetProgress >= 100) {
    alerts.push({
      type: 'success',
      icon: CheckCircle,
      title: 'Target Tercapai!',
      message: 'Selamat! Anda telah mencapai target bulan ini',
    });
  } else if (targetProgress >= 75) {
    alerts.push({
      type: 'motivational',
      icon: Zap,
      title: 'Hampir Sampai!',
      message: `${targetProgress.toFixed(0)}% menuju target - Sedikit lagi!`,
    });
  } else if (targetProgress >= 50) {
    alerts.push({
      type: 'motivational',
      icon: TrendingUp,
      title: 'Progress Bagus!',
      message: `${targetProgress.toFixed(0)}% menuju target - Terus semangat!`,
    });
  } else if (targetProgress > 0) {
    alerts.push({
      type: 'info',
      icon: Target,
      title: 'Menuju Target',
      message: `${targetProgress.toFixed(0)}% tercapai - Ayo tingkatkan!`,
    });
  }

  // Success: Leaderboard position
  if (leaderboardPosition > 0 && leaderboardPosition <= 3) {
    const positionText = leaderboardPosition === 1 ? 'Juara 1!' : leaderboardPosition === 2 ? 'Juara 2!' : 'Juara 3!';
    alerts.push({
      type: 'success',
      icon: Trophy,
      title: `Anda ${positionText}`,
      message: 'Pertahankan posisi terbaik Anda!',
    });
  } else if (leaderboardPosition > 3 && leaderboardPosition <= 5) {
    alerts.push({
      type: 'motivational',
      icon: Star,
      title: `Peringkat #${leaderboardPosition}`,
      message: 'Hampir masuk top 3, terus tingkatkan!',
    });
  } else if (leaderboardPosition > 5) {
    alerts.push({
      type: 'info',
      icon: TrendingDown,
      title: `Peringkat #${leaderboardPosition}`,
      message: 'Tingkatkan performa untuk naik peringkat!',
    });
  }

  // Info: New customers this month
  if (newCustomersCount > 0) {
    alerts.push({
      type: 'info',
      icon: Users,
      title: 'Customer Baru',
      message: `${newCustomersCount} customer baru ditambahkan bulan ini`,
    });
  }

  // Info: Active promos
  if (promos.length > 0) {
    alerts.push({
      type: 'info',
      icon: Gift,
      title: 'Promo Aktif',
      message: `${promos.length} promo tersedia untuk Anda`,
    });
  }

  // Info: Active announcements
  if (announcements.length > 0) {
    alerts.push({
      type: 'info',
      icon: Megaphone,
      title: 'Pengumuman',
      message: `${announcements.length} pengumuman aktif`,
    });
  }

  // Don't render if no alerts
  if (alerts.length === 0) {
    return null;
  }

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800/50',
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          iconColor: 'text-amber-600 dark:text-amber-400',
          titleColor: 'text-amber-800 dark:text-amber-200',
          textColor: 'text-amber-700 dark:text-amber-300',
        };
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800/50',
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          iconColor: 'text-green-600 dark:text-green-400',
          titleColor: 'text-green-800 dark:text-green-200',
          textColor: 'text-green-700 dark:text-green-300',
        };
      case 'motivational':
        return {
          bg: 'bg-violet-50 dark:bg-violet-900/20',
          border: 'border-violet-200 dark:border-violet-800/50',
          iconBg: 'bg-violet-100 dark:bg-violet-900/30',
          iconColor: 'text-violet-600 dark:text-violet-400',
          titleColor: 'text-violet-800 dark:text-violet-200',
          textColor: 'text-violet-700 dark:text-violet-300',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800/50',
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-400',
          titleColor: 'text-blue-800 dark:text-blue-200',
          textColor: 'text-blue-700 dark:text-blue-300',
        };
    }
  };

  // Show only top 4 alerts to avoid cluttering
  const displayedAlerts = alerts.slice(0, 4);

  return (
    <Card className="glass-card overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base">Notifikasi & Alert</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {displayedAlerts.map((alert, index) => {
            const styles = getAlertStyles(alert.type);
            const Icon = alert.icon;
            return (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all tap-highlight active-scale',
                  styles.bg,
                  styles.border
                )}
              >
                <div className={cn(
                  'w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0',
                  styles.iconBg
                )}>
                  <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', styles.iconColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <p className={cn('font-medium text-xs sm:text-sm', styles.titleColor)}>
                      {alert.title}
                    </p>
                    {alert.type === 'success' && (
                      <ArrowUpRight className={cn('w-3 h-3 sm:w-3.5 sm:h-3.5', styles.iconColor)} />
                    )}
                  </div>
                  <p className={cn('text-[11px] sm:text-xs mt-0.5 sm:mt-1 leading-relaxed', styles.textColor)}>
                    {alert.message}
                  </p>
                  {alert.action && alert.href && (
                    <Button
                      variant="link"
                      size="sm"
                      className={cn('h-auto p-0 mt-1 text-[10px] sm:text-xs', styles.iconColor)}
                      asChild
                    >
                      <Link href={alert.href}>
                        {alert.action}
                        <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5 sm:ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6">
      <Skeleton className="h-24 sm:h-32 rounded-xl sm:rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 sm:h-32 rounded-lg sm:rounded-2xl" />)}
      </div>
      <Skeleton className="h-28 sm:h-32 rounded-xl sm:rounded-2xl" />
      <Skeleton className="h-48 sm:h-64 rounded-xl sm:rounded-2xl" />
    </div>
  );
}
