'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  TrendingDown,
  Trophy,
  Clock,
  Megaphone,
  ExternalLink,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Target,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Calendar,
  Activity,
  Zap,
  BarChart3,
  RefreshCw,
  Eye,
  CreditCard,
  Percent,
  Award,
  Flame,
  Radio,
  Tag,
  FileText,
  Gift,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PartnerNotification {
  id: string;
  orderId: string;
  partnerName?: string;
  customerName: string;
  notes: string;
  nominal: number;
  status: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  orderId: string;
  nominal: number;
  status: string;
  createdAt: string;
  customer: { name: string };
  paymentType: { name: string };
  partner?: { name: string } | null;
}

interface TransactionsPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

interface DashboardData {
  stats: {
    totalTransactions: number;
    totalVolume: number;
    totalProfit: number;
    activePartners: number;
    thisMonthProfit: number;
    lastMonthProfit: number;
    profitChange: number;
    thisMonthVolume: number;
    lastMonthVolume: number;
    volumeChange: number;
    newCustomersThisMonth: number;
    newPartnersThisMonth: number;
    pendingCount: number;
    verificationCount: number;
    processCount: number;
    successCount: number;
    failedCount: number;
    conversionRate?: number;
    avgTransactionValue?: number;
    dailyGrowth?: number;
  };
  recentTransactions: Transaction[];
  transactionsPagination: TransactionsPagination;
  topPartnersThisMonth: Array<{
    id: string;
    name: string;
    tier: string;
    profit?: number;
    volume?: number;
  }>;
  partnersCloseToTarget: Array<{
    id: string;
    name: string;
    achievement?: number;
    profit?: number;
    target?: number;
  }>;
  newPartners: Array<{
    id: string;
    name: string;
    tier: string;
    joinedAt?: string;
  }>;
  topCustomersThisMonth: Array<{
    id: string;
    name: string;
    label: string;
    volume?: number;
    transactions?: number;
  }>;
  last7DaysData: Array<{
    date: string;
    dayName: string;
    volume: number;
    count: number;
  }>;
  last14DaysComparison?: Array<{
    date: string;
    dayName: string;
    volume: number;
    count: number;
    week: 'current' | 'previous';
  }>;
  announcements: Array<{ id: string; title: string; description: string }>;
  promos: Array<{ id: string; title: string; link: string }>;
  partnerNotifications: PartnerNotification[];
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const redirectAttempted = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !redirectAttempted.current) {
      redirectAttempted.current = true;
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.role !== 'owner') {
        router.replace('/partner/dashboard');
      }
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchDashboard(1);
    }
  }, [isAuthenticated, hasHydrated, user]);

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => {
        fetchDashboard(transactionsPage, true);
      }, 60000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, hasHydrated, user, transactionsPage]);

  // Window focus revalidation
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'owner') {
        fetchDashboard(transactionsPage);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, hasHydrated, user, transactionsPage]);

  const fetchDashboard = async (page = transactionsPage, isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setDataLoading(true);
    }
    try {
      const response = await fetch(`/api/dashboard?transactionsPage=${page}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        setError(result.error || 'Gagal memuat data');
      }
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setDataLoading(false);
      setIsRefreshing(false);
    }
  };

  const goToTransactionsPage = (page: number) => {
    setTransactionsPage(page);
    fetchDashboard(page);
  };

  const updateTransactionStatus = useCallback(async (transactionId: string, newStatus: string) => {
    setUpdatingStatus(transactionId);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (result.success) {
        fetchDashboard(transactionsPage);
      } else {
        setError(result.error || 'Gagal memperbarui status');
      }
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setUpdatingStatus(null);
    }
  }, [transactionsPage]);

  if (isLoading || !hasHydrated) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  const stats = data?.stats;
  const notifications = (stats?.pendingCount || 0) + (stats?.verificationCount || 0);
  const partnerNotifications = data?.partnerNotifications || [];

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Selamat Pagi', emoji: '🌅' };
    if (hour >= 12 && hour < 15) return { text: 'Selamat Siang', emoji: '☀️' };
    if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', emoji: '🌤️' };
    return { text: 'Selamat Malam', emoji: '🌙' };
  };
  const greeting = getGreeting();

  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 pb-24 md:pb-4">
      {/* Modern Simple Welcome Section */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Greeting */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-medium text-white/80">Owner Dashboard</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {greeting.text} {greeting.emoji}
              </h1>
              <p className="text-sm sm:text-base text-white/90 font-medium">
                {user?.name?.split(' ')[0]}
              </p>
              <p className="text-[10px] sm:text-xs text-white/70 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => fetchDashboard(transactionsPage)}
                disabled={isRefreshing}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={cn("w-4 h-4 text-white", isRefreshing && "animate-spin")} />
              </button>
              {notifications > 0 && (
                <button className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                  <Bell className="w-4 h-4 text-white" />
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                    {notifications}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/20">
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-white/70">Profit</p>
              <p className="text-xs sm:text-sm font-bold text-white">
                {dataLoading ? '...' : formatCompactCurrency(stats?.thisMonthProfit || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-white/70">Volume</p>
              <p className="text-xs sm:text-sm font-bold text-white">
                {dataLoading ? '...' : formatCompactCurrency(stats?.thisMonthVolume || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-white/70">Partner</p>
              <p className="text-xs sm:text-sm font-bold text-white">
                {dataLoading ? '...' : stats?.activePartners || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-white/70">Trx</p>
              <p className="text-xs sm:text-sm font-bold text-white">
                {dataLoading ? '...' : stats?.totalTransactions || 0}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="destructive" className="text-xs sm:text-sm animate-fade-in">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Announcements Banner */}
      {data?.announcements && data.announcements.length > 0 && (
        <Card className="glass-card border-primary/20 bg-primary/5 animate-fade-in overflow-hidden">
          <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="animate-marquee whitespace-nowrap text-xs sm:text-sm">
                  {data.announcements.map((a, i) => (
                    <span key={a.id}>
                      <strong>{a.title}</strong>: {a.description}
                      {i < data.announcements.length - 1 && ' • '}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards with Gradient Accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <KPICard
          title="Profit Bulan Ini"
          value={formatCurrency(stats?.thisMonthProfit || 0)}
          change={stats?.profitChange || 0}
          icon={DollarSign}
          gradient="from-emerald-500 to-teal-600"
          subtitle="vs bulan lalu"
          loading={dataLoading}
          sparkline={data?.last7DaysData?.map(d => d.volume)}
        />
        <KPICard
          title="Volume Bulan Ini"
          value={formatCurrency(stats?.thisMonthVolume || 0)}
          change={stats?.volumeChange || 0}
          icon={TrendingUp}
          gradient="from-blue-500 to-indigo-600"
          subtitle="vs bulan lalu"
          loading={dataLoading}
        />
        <KPICard
          title="Conversion Rate"
          value={`${(stats?.conversionRate || 0).toFixed(1)}%`}
          icon={Percent}
          gradient="from-amber-500 to-orange-600"
          subtitle="success / total"
          loading={dataLoading}
          isNeutral
        />
        <KPICard
          title="Avg Transaction"
          value={formatCurrency(stats?.avgTransactionValue || 0)}
          icon={CreditCard}
          gradient="from-purple-500 to-pink-600"
          subtitle="nilai rata-rata"
          loading={dataLoading}
          isNeutral
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <MiniStatCard
          title="Partner Aktif"
          value={String(stats?.activePartners || 0)}
          icon={Users}
          color="text-purple-600"
          bg="bg-purple-100 dark:bg-purple-900/30"
          loading={dataLoading}
        />
        <MiniStatCard
          title="Pelanggan Baru"
          value={String(stats?.newCustomersThisMonth || 0)}
          subtitle="bulan ini"
          icon={UserPlus}
          color="text-blue-600"
          bg="bg-blue-100 dark:bg-blue-900/30"
          loading={dataLoading}
        />
        <MiniStatCard
          title="Total Transaksi"
          value={String(stats?.totalTransactions || 0)}
          icon={ShoppingBag}
          color="text-emerald-600"
          bg="bg-emerald-100 dark:bg-emerald-900/30"
          loading={dataLoading}
        />
        <MiniStatCard
          title="Partner Baru"
          value={String(stats?.newPartnersThisMonth || 0)}
          subtitle="bulan ini"
          icon={Award}
          color="text-amber-600"
          bg="bg-amber-100 dark:bg-amber-900/30"
          loading={dataLoading}
        />
      </div>

      {/* Urgent Tasks Section */}
      {(stats?.pendingCount || stats?.verificationCount || stats?.processCount) ? (
        <Card className="glass-card animate-slide-up border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Tugas Mendesak
              </CardTitle>
              <Badge variant="outline" className="text-amber-600 text-[10px] sm:text-xs">
                {notifications + (stats?.processCount || 0)} item
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <UrgentTaskCard
                title="Pending"
                count={stats?.pendingCount || 0}
                icon={Clock}
                urgency="high"
                color="orange"
                href="/owner/dashboard/transactions?status=pending"
              />
              <UrgentTaskCard
                title="Verifikasi"
                count={stats?.verificationCount || 0}
                icon={AlertCircle}
                urgency="medium"
                color="yellow"
                href="/owner/dashboard/transactions?status=verification"
              />
              <UrgentTaskCard
                title="Proses"
                count={stats?.processCount || 0}
                icon={Loader2}
                urgency="low"
                color="blue"
                href="/owner/dashboard/transactions?status=process"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Partner Notifications Section */}
      <Card className="glass-card animate-slide-up border-violet-200 dark:border-violet-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-500" />
              Notifikasi Partner
            </CardTitle>
            <div className="flex items-center gap-2">
              {partnerNotifications.length > 0 && (
                <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px]">
                  {partnerNotifications.length} baru
                </Badge>
              )}
              <Button variant="ghost" size="sm" asChild className="tap-highlight h-7 sm:h-8 text-[10px] sm:text-xs">
                <Link href="/owner/dashboard/notifications">
                  Lihat Semua
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
                </Link>
              </Button>
            </div>
          </div>
          <CardDescription className="text-[10px] sm:text-xs">Pesan dari partner terkait transaksi</CardDescription>
        </CardHeader>
        <CardContent className="px-1 sm:px-6">
          {partnerNotifications.length > 0 ? (
            <ScrollArea className="max-h-48 sm:max-h-64">
              <div className="space-y-1.5 sm:space-y-2 pr-1 sm:pr-2">
                {partnerNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 hover:bg-violet-100/50 dark:hover:bg-violet-900/20 transition-colors"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <p className="font-medium text-xs sm:text-sm text-violet-700 dark:text-violet-300">
                            {notification.partnerName || 'Partner'}
                          </p>
                          <Badge variant="outline" className="text-[9px] sm:text-[10px]">
                            {notification.orderId}
                          </Badge>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                          {notification.notes?.split('\n').pop()?.replace(/\[.*?\]\s*/, '') || 'Tidak ada pesan'}
                        </p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5">
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-0.5 sm:gap-1">
                            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {formatDateAgo(notification.updatedAt)}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-primary font-medium">
                            {formatCurrency(notification.nominal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-xs text-muted-foreground">Tidak ada notifikasi baru</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions - Mobile */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1 tap-highlight active-scale">
          <Link href="/owner/dashboard/transactions">
            <Wallet className="w-4 h-4" />
            <span className="text-xs">Transaksi Baru</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1 tap-highlight active-scale">
          <Link href="/owner/dashboard/partners">
            <Users className="w-4 h-4" />
            <span className="text-xs">Kelola Partner</span>
          </Link>
        </Button>
      </div>

      {/* Broadcast & Promo Preview Section */}
      <Card className="glass-card animate-slide-up border-violet-200 dark:border-violet-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Radio className="w-4 h-4 text-violet-500" />
              Siaran Aktif
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="tap-highlight h-7 sm:h-8 text-[10px] sm:text-xs">
              <Link href="/owner/dashboard/broadcast">
                Kelola
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
              </Link>
            </Button>
          </div>
          <CardDescription className="text-[10px] sm:text-xs">Preview tampilan di dashboard partner</CardDescription>
        </CardHeader>
        <CardContent className="px-1 sm:px-6">
          {/* Preview Frame */}
          <div className="bg-muted/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-dashed border-muted-foreground/30">
            <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Preview Partner Dashboard
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              {/* Broadcast Preview */}
              {data?.announcements?.filter(a => a.type === 'broadcast').map((b, i) => (
                <div key={b.id} className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 sm:p-3 border border-amber-200 dark:border-amber-800/50">
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-300">BROADCAST</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium mt-1 truncate">{b.title}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{b.description}</p>
                </div>
              ))}
              
              {/* Announcement Preview - Running Text */}
              {data?.announcements?.filter(a => a.type === 'announcement').length > 0 && (
                <div className="bg-primary/5 rounded-lg p-2 sm:p-3 border border-primary/20 overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] sm:text-xs font-medium text-primary">PENGUMUMAN</span>
                  </div>
                  <div className="overflow-hidden">
                    <div className="animate-marquee whitespace-nowrap text-[10px] sm:text-xs">
                      📢 {data.announcements.filter(a => a.type === 'announcement').map(a => `${a.title}: ${a.description}`).join(' • ')}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Promo Preview */}
              {data?.promos?.slice(0, 2).map((p, i) => (
                <div key={p.id} className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg p-2 sm:p-3 border border-pink-200 dark:border-pink-800/50 flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium truncate">{p.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Tap untuk melihat promo</p>
                  </div>
                </div>
              ))}
              
              {/* Empty State */}
              {(!data?.announcements || data.announcements.length === 0) && (!data?.promos || data.promos.length === 0) && (
                <div className="text-center py-4 sm:py-6">
                  <Megaphone className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                  <p className="text-xs text-muted-foreground">Belum ada siaran aktif</p>
                  <Button asChild size="sm" variant="outline" className="mt-2 h-8 text-xs">
                    <Link href="/owner/dashboard/broadcast">Buat Siaran</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 mt-3 sm:mt-4">
            <div className="text-center p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
              <p className="text-lg sm:text-xl font-bold text-violet-600 dark:text-violet-400">
                {data?.announcements?.filter(a => a.type === 'promo').length || 0}
              </p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Promo</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                {data?.announcements?.filter(a => a.type === 'broadcast').length || 0}
              </p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Broadcast</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-900/20">
              <p className="text-lg sm:text-xl font-bold text-fuchsia-600 dark:text-fuchsia-400">
                {data?.announcements?.filter(a => a.type === 'announcement').length || 0}
              </p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Pengumuman</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume Chart - Line Chart */}
      <Card className="glass-card animate-slide-up overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Volume 7 Hari Terakhir
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs mt-1">
                {data?.last7DaysData ? (
                  <span className="flex items-center gap-2">
                    Total: {formatCompactCurrency(data.last7DaysData.reduce((sum, d) => sum + d.volume, 0))} •{' '}
                    {data.last7DaysData.reduce((sum, d) => sum + d.count, 0)} transaksi
                  </span>
                ) : (
                  'Grafik volume transaksi'
                )}
              </CardDescription>
            </div>
            {stats?.dailyGrowth !== undefined && (
              <div className={cn(
                "flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium",
                stats.dailyGrowth >= 0 
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {stats.dailyGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                {Math.abs(stats.dailyGrowth).toFixed(1)}%
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-3 sm:pb-4">
          {dataLoading ? (
            <Skeleton className="h-36 sm:h-44 w-full rounded-xl" />
          ) : data?.last7DaysData && data.last7DaysData.length > 0 && data.last7DaysData.some(d => d.volume > 0) ? (
            <ResponsiveContainer width="100%" height={160} className="sm:!h-[180px]">
              <AreaChart data={data?.last7DaysData || []}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="dayName" 
                  tick={{ fontSize: 9 }} 
                  stroke="#9ca3af" 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 9 }} 
                  stroke="#9ca3af" 
                  tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} 
                  width={35}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                  name="Volume" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 sm:h-44 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs sm:text-sm">Belum ada transaksi 7 hari terakhir</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partner & Customer Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Partner Highlights */}
        <Card className="glass-card animate-slide-up">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Top Partner Bulan Ini
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="tap-highlight h-7 sm:h-8 text-[10px] sm:text-xs">
                <Link href="/owner/dashboard/partners">
                  Lihat Semua
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-1 sm:px-6">
            {dataLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 sm:h-16 rounded-lg sm:rounded-xl" />)}
              </div>
            ) : data?.topPartnersThisMonth?.length ? (
              <div className="space-y-1 sm:space-y-2">
                {data.topPartnersThisMonth.slice(0, 5).map((partner, index) => (
                  <div key={partner.id} className="flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors tap-highlight active-scale">
                    <div className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-xs flex-shrink-0',
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs sm:text-sm truncate">{partner.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Profit: {formatCurrency(partner.profit || 0)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px]">{partner.tier}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4 sm:py-6 text-xs sm:text-sm">Belum ada data</div>
            )}
          </CardContent>
        </Card>

        {/* Customer Highlights */}
        <Card className="glass-card animate-slide-up stagger-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Top Pelanggan Bulan Ini
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="tap-highlight h-7 sm:h-8 text-[10px] sm:text-xs">
                <Link href="/owner/dashboard/customers">
                  Lihat Semua
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-1 sm:px-6">
            {dataLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 sm:h-16 rounded-lg sm:rounded-xl" />)}
              </div>
            ) : data?.topCustomersThisMonth?.length ? (
              <div className="space-y-1 sm:space-y-2">
                {data.topCustomersThisMonth.slice(0, 5).map((customer, index) => (
                  <div key={customer.id} className="flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors tap-highlight active-scale">
                    <div className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-xs flex-shrink-0',
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs sm:text-sm truncate">{customer.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatCurrency(customer.volume || 0)} • {customer.transactions} trx
                      </p>
                    </div>
                    <CustomerLabelBadge label={customer.label} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4 sm:py-6 text-xs sm:text-sm">Belum ada data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Partners Close to Target & New Partners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Partners Close to Target */}
        <Card className="glass-card animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Hampir Capai Target
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Partner dengan pencapaian 80%+</CardDescription>
          </CardHeader>
          <CardContent className="px-1 sm:px-6">
            {dataLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 sm:h-16 rounded-lg sm:rounded-xl" />)}
              </div>
            ) : data?.partnersCloseToTarget?.length ? (
              <ScrollArea className="max-h-40 sm:max-h-48">
                <div className="space-y-1.5 sm:space-y-2 pr-1 sm:pr-2">
                  {data.partnersCloseToTarget.map((partner) => (
                    <div key={partner.id} className="py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-xs sm:text-sm truncate">{partner.name}</p>
                        <Badge className={cn(
                          "text-[9px] sm:text-[10px]",
                          (partner.achievement || 0) >= 90 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {partner.achievement?.toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress 
                        value={partner.achievement} 
                        className={cn(
                          "h-1.5 sm:h-2",
                          (partner.achievement || 0) >= 90 ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500"
                        )} 
                      />
                      <div className="flex justify-between mt-1">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                          {formatCurrency(partner.profit || 0)} / {formatCurrency(partner.target || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground py-4 sm:py-6 text-xs sm:text-sm">Belum ada data</div>
            )}
          </CardContent>
        </Card>

        {/* New Partners This Month */}
        <Card className="glass-card animate-slide-up stagger-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Partner Baru Bulan Ini
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">{stats?.newPartnersThisMonth || 0} partner bergabung</CardDescription>
          </CardHeader>
          <CardContent className="px-1 sm:px-6">
            {dataLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 sm:h-14 rounded-lg sm:rounded-xl" />)}
              </div>
            ) : data?.newPartners?.length ? (
              <ScrollArea className="max-h-40 sm:max-h-48">
                <div className="space-y-1 sm:space-y-2 pr-1 sm:pr-2">
                  {data.newPartners.map((partner) => (
                    <div key={partner.id} className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-white">{partner.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm truncate">{partner.name}</p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                          Bergabung {formatDateAgo(partner.joinedAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px]">{partner.tier}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground py-4 sm:py-6 text-xs sm:text-sm">Belum ada partner baru</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed - Modern Design */}
      <Card className="glass-card animate-slide-up overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-primary to-purple-500" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Transaksi Terbaru
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="tap-highlight h-7 sm:h-8 text-[10px] sm:text-xs">
              <Link href="/owner/dashboard/transactions">
                Lihat Semua
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
              </Link>
            </Button>
          </div>
          <CardDescription className="text-[10px] sm:text-xs">
            {data?.transactionsPagination ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {((data.transactionsPagination.currentPage - 1) * 10) + 1}-{Math.min(data.transactionsPagination.currentPage * 10, data.transactionsPagination.totalCount)} dari {data.transactionsPagination.totalCount} transaksi
              </span>
            ) : '10 transaksi terakhir'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {dataLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 sm:h-16 rounded-xl" />)}
            </div>
          ) : data?.recentTransactions?.length ? (
            <>
              <div className="space-y-1.5">
                {data.recentTransactions.map((tx) => {
                  const statusConfig = {
                    pending: { bg: 'bg-gradient-to-br from-orange-500 to-amber-600', icon: Clock },
                    verification: { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', icon: AlertCircle },
                    process: { bg: 'bg-gradient-to-br from-cyan-500 to-blue-600', icon: Loader2 },
                    success: { bg: 'bg-gradient-to-br from-emerald-500 to-green-600', icon: CheckCircle },
                    failed: { bg: 'bg-gradient-to-br from-red-500 to-rose-600', icon: XCircle },
                  };
                  const config = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  
                  return (
                    <div key={tx.id} className="group relative overflow-hidden rounded-xl bg-muted/20 hover:bg-muted/40 transition-all duration-200 border border-transparent hover:border-primary/20">
                      <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3">
                        {/* Status Icon */}
                        <div className={cn(
                          "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg",
                          config.bg
                        )}>
                          <StatusIcon className={cn("w-4 h-4 sm:w-5 sm:h-5 text-white", tx.status === 'process' && "animate-spin")} />
                        </div>
                        
                        {/* Main Content */}
                        <div className="min-w-0 flex-1">
                          {/* Top Row: Customer + Status */}
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-xs sm:text-sm truncate">{tx.customer.name}</p>
                            <Badge className={cn(
                              "text-[8px] sm:text-[9px] px-1.5 sm:px-2 capitalize",
                              tx.status === 'success' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                              tx.status === 'pending' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                              tx.status === 'verification' && "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                              tx.status === 'process' && "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
                              tx.status === 'failed' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            )}>
                              {tx.status}
                            </Badge>
                          </div>
                          
                          {/* Amount */}
                          <p className="text-sm sm:text-base font-bold text-primary">{formatCurrency(tx.nominal)}</p>
                          
                          {/* Bottom Row: Payment Type + Partner + Time */}
                          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground">
                            <span className="truncate max-w-[80px] sm:max-w-none">{tx.paymentType.name}</span>
                            {tx.partner && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[60px] sm:max-w-none">{tx.partner.name}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatDateAgo(tx.createdAt)}</span>
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        {tx.status !== 'success' && tx.status !== 'failed' && (
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {tx.status === 'pending' && (
                              <button
                                onClick={() => updateTransactionStatus(tx.id, 'process')}
                                disabled={updatingStatus === tx.id}
                                className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50"
                              >
                                {updatingStatus === tx.id ? (
                                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                                ) : (
                                  <ArrowUpRight className="w-4 h-4 text-white" />
                                )}
                              </button>
                            )}
                            {tx.status === 'verification' && (
                              <>
                                <button
                                  onClick={() => updateTransactionStatus(tx.id, 'success')}
                                  disabled={updatingStatus === tx.id}
                                  className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50"
                                >
                                  {updatingStatus === tx.id ? (
                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  )}
                                </button>
                                <button
                                  onClick={() => updateTransactionStatus(tx.id, 'failed')}
                                  disabled={updatingStatus === tx.id}
                                  className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
                                >
                                  <XCircle className="w-4 h-4 text-white" />
                                </button>
                              </>
                            )}
                            {tx.status === 'process' && (
                              <button
                                onClick={() => updateTransactionStatus(tx.id, 'verification')}
                                disabled={updatingStatus === tx.id}
                                className="w-8 h-8 rounded-lg bg-violet-500 hover:bg-violet-600 flex items-center justify-center transition-colors disabled:opacity-50"
                              >
                                {updatingStatus === tx.id ? (
                                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-white" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination Controls */}
              {data.transactionsPagination && data.transactionsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-dashed">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Halaman {data.transactionsPagination.currentPage} dari {data.transactionsPagination.totalPages}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => goToTransactionsPage(transactionsPage - 1)}
                      disabled={transactionsPage === 1 || dataLoading}
                      className="h-8 px-3 rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50 text-xs flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>
                    <button
                      onClick={() => goToTransactionsPage(transactionsPage + 1)}
                      disabled={transactionsPage === data.transactionsPagination.totalPages || dataLoading}
                      className="h-8 px-3 rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50 text-xs flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Wallet className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-20" />
              <p className="text-xs sm:text-sm text-muted-foreground">Belum ada transaksi</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promos */}
      {data?.promos && data.promos.length > 0 && (
        <Card className="glass-card animate-slide-up stagger-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              Promo Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {data.promos.map((promo) => (
                <a
                  key={promo.id}
                  href={promo.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 transition-colors tap-highlight active-scale"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs sm:text-sm truncate">{promo.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Klik untuk lihat promo</p>
                  </div>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// KPI Card Component with Sparkline
function KPICard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  gradient, 
  subtitle, 
  loading, 
  sparkline,
  isNeutral 
}: { 
  title: string; 
  value: string; 
  change?: number; 
  icon: React.ElementType; 
  gradient: string; 
  subtitle?: string; 
  loading?: boolean;
  sparkline?: number[];
  isNeutral?: boolean;
}) {
  return (
    <Card className="glass-card overflow-hidden relative">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", gradient)} />
      <CardContent className="p-2.5 sm:p-4">
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ) : (
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[9px] sm:text-xs text-muted-foreground line-clamp-1">{title}</p>
              <div className={cn("w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0", gradient)}>
                <Icon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" />
              </div>
            </div>
            <p className="text-sm sm:text-lg lg:text-xl font-bold truncate">{value}</p>
            {change !== undefined && !isNeutral && (
              <div className={cn("text-[9px] sm:text-xs flex items-center gap-0.5", change >= 0 ? 'text-green-600' : 'text-red-600')}>
                {change >= 0 ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
                {subtitle && <span className="text-muted-foreground hidden sm:inline ml-1">{subtitle}</span>}
              </div>
            )}
            {sparkline && sparkline.length > 0 && (
              <div className="h-4 sm:h-6 flex items-end gap-0.5 mt-1 sm:mt-2">
                {sparkline.slice(-7).map((v, i) => {
                  const max = Math.max(...sparkline);
                  const height = max > 0 ? (v / max) * 100 : 0;
                  return (
                    <div 
                      key={i} 
                      className={cn("flex-1 rounded-t", i === sparkline.length - 1 ? "bg-primary" : "bg-primary/40")}
                      style={{ height: `${Math.max(height, 10)}%` }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mini Stat Card Component
function MiniStatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  bg, 
  loading 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon: React.ElementType; 
  color: string; 
  bg: string; 
  loading?: boolean; 
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-2 sm:p-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center", bg)}>
              <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", color)} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{title}</p>
              <p className="text-sm sm:text-base font-bold">{value}</p>
              {subtitle && <p className="text-[9px] sm:text-[10px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Urgent Task Card Component
function UrgentTaskCard({ 
  title, 
  count, 
  icon: Icon, 
  urgency, 
  color, 
  href 
}: { 
  title: string; 
  count: number; 
  icon: React.ElementType; 
  urgency: 'high' | 'medium' | 'low'; 
  color: string; 
  href: string; 
}) {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600', border: 'border-orange-200 dark:border-orange-800' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600', border: 'border-yellow-200 dark:border-yellow-800' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800' },
  };

  const styles = colorClasses[color];
  const urgencyStyles = {
    high: 'animate-pulse',
    medium: '',
    low: '',
  };

  return (
    <Link href={href}>
      <Card className={cn(
        "glass-card tap-highlight active-scale transition-all hover:shadow-md cursor-pointer",
        styles.border,
        "border-2",
        count > 0 && urgencyStyles[urgency]
      )}>
        <CardContent className="p-2 sm:p-3 text-center">
          <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg mx-auto mb-1 sm:mb-2 flex items-center justify-center", styles.bg)}>
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", styles.text, urgency === 'low' && "animate-spin")} />
          </div>
          <p className="text-lg sm:text-2xl font-bold">{count}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{title}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// Customer Label Badge
function CustomerLabelBadge({ label }: { label: string }) {
  const variants: Record<string, string> = {
    VIP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Regular: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    New: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Blacklist: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Badge variant="outline" className={cn('text-[9px] sm:text-[10px]', variants[label] || variants.Regular)}>
      {label}
    </Badge>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: React.ElementType }> = {
    pending: { className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock },
    verification: { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertCircle },
    process: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2 },
    success: { className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    failed: { className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  };

  const { className } = config[status] || config.pending;

  return (
    <Badge className={cn('text-[9px] sm:text-[10px] capitalize', className)}>
      {status}
    </Badge>
  );
}

// Dashboard Skeleton
function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-4 pb-24 md:pb-6">
      <Skeleton className="h-24 sm:h-32 rounded-xl sm:rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 sm:h-28 rounded-lg sm:rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 sm:h-20 rounded-lg sm:rounded-xl" />)}
      </div>
      <Skeleton className="h-32 sm:h-40 rounded-lg sm:rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-48 sm:h-64 rounded-lg sm:rounded-xl" />
        <Skeleton className="h-48 sm:h-64 rounded-lg sm:rounded-xl" />
      </div>
    </div>
  );
}

// Helper functions
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDateAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}jt`;
  if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}rb`;
  return `Rp ${value}`;
}
