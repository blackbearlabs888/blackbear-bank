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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Bell,
  Star,
  Gift,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  Radio,
  Calendar,
  CreditCard,
  Quote,
  Globe,
  XCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';

interface Announcement {
  id: string;
  title: string;
  description?: string;
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

  // Recent transactions & testimonials state
  const [recentTransactions, setRecentTransactions] = useState<Array<{
    id: string;
    orderId: string;
    nominal: number;
    status: string;
    createdAt: string;
    customer: { name: string };
    paymentType: { name: string };
  }>>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [partnerTestimonials, setPartnerTestimonials] = useState<Array<{
    id: string;
    rating: number;
    review: string;
    customerName: string;
    isApproved: boolean;
    isFeatured: boolean;
    createdAt: string;
    transaction: { orderId: string; nominal: number; paymentType: { name: string } } | null;
  }>>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);

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
      fetchRecentTransactions();
      fetchPartnerTestimonials();
    }
  }, [isAuthenticated, hasHydrated, user]);

  // Fetch recent partner transactions
  const fetchRecentTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const response = await fetch('/api/transactions?limit=5&status=success');
      const result = await response.json();
      if (result.success && result.data) {
        setRecentTransactions(result.data);
      }
    } catch {
      // Non-critical
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Fetch partner testimonials
  const fetchPartnerTestimonials = async () => {
    setTestimonialsLoading(true);
    try {
      const response = await fetch('/api/testimonials/partner');
      const result = await response.json();
      if (result.success && result.data) {
        setPartnerTestimonials(result.data);
      }
    } catch {
      // Non-critical
    } finally {
      setTestimonialsLoading(false);
    }
  };

  // Window focus revalidation for real-time data
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'partner') {
        fetchDashboard();
        fetchRecentTransactions();
        fetchPartnerTestimonials();
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
        setError(getErrorMessage(result.error, 'Gagal memuat data'));
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
  // Only show 'announcement' type in running text (not promo or broadcast)
  const regularAnnouncements = announcements?.filter(a => a.type === 'announcement') || [];
  const promoItems = announcements?.filter(a => a.type === 'promo') || [];

  return (
    <div className="min-h-screen bg-background dashboard-mesh">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* Welcome Card - Clean Modern Design */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/80">
        {/* Simple decorative circle */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -right-4 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />

        <div className="relative p-4 sm:p-5">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'P'}
              </span>
            </div>

            {/* Greeting */}
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-sm">Selamat datang,</p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
                {user?.name?.split(' ')[0]}!
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge className="bg-white/20 text-white border-0 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                  {currentPartner?.tier as string}
                </Badge>
                <Badge className="bg-white/20 text-white border-0 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                  {currentPartner?.commission as number}%
                </Badge>
              </div>
            </div>

            {/* Progress Circle */}
            <div className="text-center flex-shrink-0">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="3"
                    strokeDasharray={`${Math.min(progressPercent, 100)} 100`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm sm:text-base">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>
              <p className="text-white/60 text-[10px] mt-1">Target</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs">
            <div>
              <p className="text-white/60">Profit</p>
              <p className="text-white font-semibold">{formatCurrency(currentPartner?.totalProfit as number || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60">Target</p>
              <p className="text-white font-semibold">{formatCurrency(currentPartner?.target as number || 0)}</p>
            </div>
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
        <div className="space-y-3">
          {broadcasts.slice(0, 3).map((broadcast, index) => (
            <Card
              key={broadcast.id}
              className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setSelectedBroadcast(broadcast)}
            >
              <div className="flex">
                {/* Left accent bar */}
                <div className="w-1 bg-gradient-to-b from-amber-400 to-orange-500" />

                <CardContent className="flex-1 p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <Radio className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[9px] sm:text-[10px] font-medium bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                          BROADCAST
                        </Badge>
                        {broadcast.startDate && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(broadcast.startDate)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm mb-1 truncate">{broadcast.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{broadcast.description}</p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}

          {/* Show more button if there are more broadcasts */}
          {broadcasts.length > 3 && (
            <button className="w-full py-2 text-xs text-muted-foreground hover:text-primary transition-colors">
              +{broadcasts.length - 3} broadcast lainnya
            </button>
          )}
        </div>
      )}

      {/* Announcements Banner (Running Text) */}
      {regularAnnouncements && regularAnnouncements.length > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-muted/50 border border-border/60">
          <div className="flex items-center gap-3 py-3 px-4">
            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>

            {/* Running text */}
            <div className="flex-1 overflow-hidden">
              <div className="animate-marquee whitespace-nowrap">
                {regularAnnouncements.map((a, i) => (
                  <span key={a.id} className="text-sm">
                    <strong className="text-primary">{a.title}</strong>
                    {a.description && (
                      <span className="text-muted-foreground">: {a.description}</span>
                    )}
                    {i < regularAnnouncements.length - 1 && (
                      <span className="mx-4 text-primary/50">•</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          color="text-violet-600 dark:text-violet-400"
          bg="bg-violet-100 dark:bg-violet-900/20"
          trend={stats?.totalTransactions > 0 ? 'up' : 'neutral'}
        />
        <StatsCard
          title="Total Volume"
          value={formatCurrency(stats?.totalVolume || 0)}
          icon={TrendingUp}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-100 dark:bg-emerald-900/20"
          trend={stats?.totalVolume > 0 ? 'up' : 'neutral'}
        />
        <StatsCard
          title="Pending"
          value={String(stats?.pendingTransactions || 0)}
          icon={Clock}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-100 dark:bg-amber-900/20"
          alert={stats?.pendingTransactions > 0}
        />
      </div>

      {/* Phase 5: Commission Status Summary (partner-facing, no fraud score/rules) */}
      {data?.commissionSummary && (
        <Card className="rounded-xl border border-border/60 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Status Komisi Saya
            </CardTitle>
            <CardDescription className="text-xs">
              Ringkasan komisi berdasarkan status transaksi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border/50 p-3 bg-blue-50/50 dark:bg-blue-900/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">Diproses</span>
                </div>
                <p className="text-sm sm:text-base font-bold">
                  {formatCurrency((data.commissionSummary as Record<string, { count: number; amount: number }>).pending?.amount || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {(data.commissionSummary as Record<string, { count: number }>).pending?.count || 0} transaksi
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 bg-emerald-50/50 dark:bg-emerald-900/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground">Disetujui</span>
                </div>
                <p className="text-sm sm:text-base font-bold">
                  {formatCurrency((data.commissionSummary as Record<string, { count: number; amount: number }>).approved?.amount || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {(data.commissionSummary as Record<string, { count: number }>).approved?.count || 0} transaksi
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 bg-amber-50/50 dark:bg-amber-900/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground">Ditahan</span>
                </div>
                <p className="text-sm sm:text-base font-bold">
                  {formatCurrency((data.commissionSummary as Record<string, { count: number; amount: number }>).held?.amount || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {(data.commissionSummary as Record<string, { count: number }>).held?.count || 0} transaksi
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 bg-red-50/50 dark:bg-red-900/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-medium text-muted-foreground">Ditolak</span>
                </div>
                <p className="text-sm sm:text-base font-bold">
                  {formatCurrency((data.commissionSummary as Record<string, { count: number; amount: number }>).rejected?.amount || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {(data.commissionSummary as Record<string, { count: number }>).rejected?.count || 0} transaksi
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - Mobile */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 rounded-lg hover:bg-muted/30 transition-colors">
          <Link href="/partner/dashboard/customers">
            <Users className="w-4 h-4" />
            <span className="text-[10px]">Kelola Customer</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 rounded-lg hover:bg-muted/30 transition-colors">
          <Link href="/partner/dashboard/transactions">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-[10px]">Riwayat Transaksi</span>
          </Link>
        </Button>
      </div>

      {/* Share Order Link - Partner Referral */}
      <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-500" />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            Link Order Customer
          </CardTitle>
          <CardDescription className="text-[10px] font-medium text-muted-foreground">
            Bagikan link ini ke customer untuk order langsung dengan nama Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">Link Pribadi Anda</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/order?partnerId=${currentPartner?.id}` : '/order?partnerId=...'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-xl h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={() => {
                  const link = `${window.location.origin}/order?partnerId=${currentPartner?.id}`;
                  navigator.clipboard.writeText(link);
                }}
              >
                {navigator ? (
                  <>
                    {false ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                    Salin Link
                  </>
                ) : 'Salin Link'}
              </Button>
              <Button
                variant="outline"
                className="h-9 px-3 rounded-lg text-xs font-medium hover:bg-muted/30 transition-colors"
                onClick={() => {
                  const link = `${window.location.origin}/order?partnerId=${currentPartner?.id}`;
                  if (navigator.share) {
                    navigator.share({ title: 'Order Gestun', url: link });
                  } else {
                    navigator.clipboard.writeText(link);
                  }
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            💡 Customer yang order lewat link ini otomatis tercatat atas nama Anda
          </p>
        </CardContent>
      </Card>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Target Progress */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
          <div className="h-1 bg-primary" />
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Progress Target
            </CardTitle>
            <CardDescription className="text-[10px] font-medium text-muted-foreground">Target bulanan Anda</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1.5 text-xs sm:text-sm">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Profit Saat Ini</p>
                  <p className="text-base sm:text-xl font-bold text-primary">
                    {formatCurrency(currentPartner?.totalProfit as number || 0)}
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-muted/30">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Target</p>
                  <p className="text-base sm:text-xl font-bold">{formatCurrency(currentPartner?.target as number || 0)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-medium">{currentPartner?.tier as string}</Badge>
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">{currentPartner?.badge as string}</Badge>
                <Badge variant="outline" className="border-primary/30 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                  Komisi: {currentPartner?.commission as number}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Leaderboard
            </CardTitle>
            <CardDescription className="text-[10px] font-medium text-muted-foreground">Top 5 Partner bulan ini</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="space-y-1">
              {dataLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 sm:h-14 rounded-xl" />)
              ) : leaderboard?.length ? (
                leaderboard.map((p: Record<string, unknown>, index: number) => {
                  const isMe = p.id === currentPartner?.id;
                  return (
                    <div
                      key={p.id as string}
                      className={cn(
                        'flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-xl transition-colors',
                        isMe ? 'bg-primary/10 ring-2 ring-primary/30' : 'hover:bg-muted/30'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-xs flex-shrink-0',
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
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
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">{p.tier as string}</Badge>
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

      {/* Promos Section */}
      {(promoItems && promoItems.length > 0) && (
        <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-pink-500 via-violet-500 to-fuchsia-500" />
          <CardHeader className="pb-1 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Gift className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                Promo & Materi
              </CardTitle>
              <Badge className="bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                {promoItems.length} Aktif
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {promoItems.map((promo) => (
                <button
                  key={promo.id}
                  onClick={() => setSelectedPromo(promo)}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/60 text-left"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center flex-shrink-0">
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

      {/* Recent Transactions & Testimonials Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent Transactions */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                Transaksi Terakhir
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="rounded-lg h-9 text-xs font-medium hover:bg-muted/30 transition-colors">
                <Link href="/partner/dashboard/transactions">
                  Semua
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
                </Link>
              </Button>
            </div>
            <CardDescription className="text-[10px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Transaksi berhasil
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {transactionsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 sm:h-16 rounded-xl" />)}
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-1.5">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors border border-transparent hover:border-emerald-500/20">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-xs sm:text-sm truncate">{tx.customer.name}</p>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-primary">{formatCurrency(tx.nominal)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground">
                        <span className="truncate">{tx.paymentType.name}</span>
                        <span>•</span>
                        <span>{formatDate(tx.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-xs sm:text-sm text-muted-foreground">Belum ada transaksi berhasil</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partner Testimonials */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Testimoni Customer
              </CardTitle>
              <Badge className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                {partnerTestimonials.length}
              </Badge>
            </div>
            <CardDescription className="text-[10px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Dari transaksi Anda
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {testimonialsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 sm:h-20 rounded-xl" />)}
              </div>
            ) : partnerTestimonials.length > 0 ? (
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {partnerTestimonials.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-xl p-3 transition-colors border",
                      !t.isApproved
                        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30"
                        : "bg-muted/20 border-border/60 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        !t.isApproved
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : "bg-gradient-to-br from-emerald-400 to-emerald-500"
                      )}>
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-xs sm:text-sm truncate">{t.customerName}</p>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={cn(
                                  "w-2.5 h-2.5 sm:w-3 sm:h-3",
                                  s <= t.rating
                                    ? "text-amber-400 dark:text-amber-300 fill-amber-400 dark:fill-amber-300"
                                    : "text-muted-foreground/20"
                                )}
                              />
                            ))}
                          </div>
                          {t.isFeatured && (
                            <Trophy className="w-3 h-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        {t.review && (
                          <div className="relative mt-1">
                            <Quote className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 text-muted-foreground/15" />
                            <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed pl-3 line-clamp-2">
                              {t.review}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] sm:text-[10px] text-muted-foreground">
                          {t.transaction && (
                            <span className="flex items-center gap-0.5">
                              <CreditCard className="w-2.5 h-2.5" />
                              {t.transaction.paymentType.name}
                            </span>
                          )}
                          {t.transaction && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-primary">{formatCurrency(t.transaction.nominal)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatDate(t.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-xs sm:text-sm text-muted-foreground">Belum ada testimoni</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Testimoni akan muncul setelah customer memberi rating</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Broadcast Detail Dialog */}
      <Dialog open={!!selectedBroadcast} onOpenChange={() => setSelectedBroadcast(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedBroadcast?.title || 'Detail Broadcast'}</DialogTitle>
            <DialogDescription>{selectedBroadcast?.description || 'Informasi broadcast'}</DialogDescription>
          </DialogHeader>
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 p-6 pb-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                  BROADCAST
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-white">{selectedBroadcast?.title}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedBroadcast?.description}
            </p>

            {selectedBroadcast?.startDate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDate(selectedBroadcast.startDate)}
                  {selectedBroadcast.expireDate && ` - ${formatDate(selectedBroadcast.expireDate)}`}
                </span>
              </div>
            )}

            {selectedBroadcast?.link && (
              <Button asChild className="w-full h-10 text-xs font-semibold rounded-xl">
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
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedPromo?.title || 'Detail Promo'}</DialogTitle>
            <DialogDescription>{selectedPromo?.description || 'Informasi promo'}</DialogDescription>
          </DialogHeader>
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-pink-500 to-violet-600 p-6 pb-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                  PROMO
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-white">{selectedPromo?.title}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedPromo?.description}
            </p>

            {selectedPromo?.startDate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Berlaku: {formatDate(selectedPromo.startDate)}
                  {selectedPromo.expireDate && ` - ${formatDate(selectedPromo.expireDate)}`}
                </span>
              </div>
            )}

            <Button asChild className="w-full h-10 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <a href={selectedPromo?.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Buka Materi Promo
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  </div>
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
      'rounded-xl border border-border/60 shadow-none bg-card overflow-hidden',
      alert && 'ring-2 ring-amber-400 dark:ring-amber-600'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
            <p className={cn('text-sm sm:text-xl font-bold truncate', gradient && 'text-primary')}>{value}</p>
            {alert && (
              <p className="text-[9px] sm:text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Perlu ditangani
              </p>
            )}
          </div>
          <div className={cn(
            'w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0',
            gradient && 'bg-primary text-primary-foreground shadow-sm',
            !gradient && bg
          )}>
            <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', gradient ? 'text-primary-foreground' : color)} />
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
    return <Skeleton className="h-24 rounded-xl" />;
  }

  // Build notifications list - simplified
  const notifications: Array<{
    id: string;
    icon: React.ElementType;
    title: string;
    value: string;
    type: 'warning' | 'success' | 'info';
    action?: { label: string; href: string };
  }> = [];

  // Pending transactions - priority warning
  if (pendingCount > 0) {
    notifications.push({
      id: 'pending',
      icon: AlertTriangle,
      title: 'Transaksi Pending',
      value: `${pendingCount} menunggu`,
      type: 'warning',
      action: { label: 'Lihat', href: '/partner/dashboard/transactions' },
    });
  }

  // Target progress
  if (targetProgress >= 100) {
    notifications.push({
      id: 'target',
      icon: CheckCircle,
      title: 'Target Tercapai',
      value: 'Bulan ini',
      type: 'success',
    });
  }

  // Leaderboard position
  if (leaderboardPosition > 0 && leaderboardPosition <= 3) {
    notifications.push({
      id: 'rank',
      icon: Trophy,
      title: 'Peringkat',
      value: `#${leaderboardPosition}`,
      type: 'success',
    });
  }

  // New customers
  if (newCustomersCount > 0) {
    notifications.push({
      id: 'customers',
      icon: Users,
      title: 'Customer Baru',
      value: `${newCustomersCount} orang`,
      type: 'info',
    });
  }

  // Active promos
  if (promos.length > 0) {
    notifications.push({
      id: 'promos',
      icon: Gift,
      title: 'Promo Aktif',
      value: `${promos.length} tersedia`,
      type: 'info',
    });
  }

  // Announcements
  if (announcements.length > 0) {
    notifications.push({
      id: 'announcements',
      icon: Megaphone,
      title: 'Pengumuman',
      value: `${announcements.length} aktif`,
      type: 'info',
    });
  }

  if (notifications.length === 0) {
    return null;
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-500 dark:bg-amber-400';
      case 'success':
        return 'bg-emerald-500 dark:bg-emerald-400';
      default:
        return 'bg-violet-500 dark:bg-violet-400';
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {notifications.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const isClickable = !!item.action;

        const content = (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border/60 flex-shrink-0 min-w-[140px]',
              'transition-colors',
              isClickable && 'cursor-pointer hover:bg-muted/30 hover:border-primary/50'
            )}
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', getTypeStyle(item.type))}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">{item.title}</p>
              <p className="text-xs font-semibold truncate">{item.value}</p>
            </div>
          </div>
        );

        if (isClickable) {
          return (
            <Link key={item.id} href={item.action!.href} className="block">
              {content}
            </Link>
          );
        }

        return content;
      })}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 max-w-4xl">
      <Skeleton className="h-28 sm:h-36 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 sm:h-32 rounded-xl" />)}
      </div>
      <Skeleton className="h-28 sm:h-36 rounded-xl" />
      <Skeleton className="h-48 sm:h-64 rounded-xl" />
    </div>
  );
}
