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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Star,
  Quote,
  Settings,
  Zap,
  TrendingUpIcon,
  PieChart as PieChartIcon,
  Calculator,
  LayoutDashboard,
  Handshake,
  UserCheck,
  Store,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency, formatCompactCurrency, formatDateAgo, cn } from '@/lib/utils';
import Link from 'next/link';

/* ===== INTERFACES (unchanged) ===== */

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

interface PartnerMessage {
  id: string;
  transactionId: string | null;
  title: string;
  message: string;
  data: {
    orderId?: string;
    partnerName?: string;
    customerName?: string;
    nominal?: number;
    message?: string;
  } | null;
  isRead: boolean;
  createdAt: string;
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
  announcements: Array<{ id: string; title: string; description: string; type?: string }>;
  promos: Array<{ id: string; title: string; link: string }>;
  partnerNotifications: PartnerNotification[];
  partnerMessages: PartnerMessage[];
  unreadPartnerMessages: number;
}

/* ===== NEW: Analytics Interface ===== */

interface AnalyticsData {
  forecast: {
    currentMonthProfit: number;
    currentMonthVolume: number;
    avgDailyProfit: number;
    avgDailyVolume: number;
    projectedProfit: number;
    projectedVolume: number;
    daysRemaining: number;
    lastMonthProfit: number;
    lastMonthVolume: number;
    lastMonthAvgDaily: number;
    profitChange: number;
    volumeChange: number;
    daysPassed: number;
    daysInMonth: number;
  };
  feeAnalysis: {
    avgPaymentFee: number;
    avgPlatformFee: number;
    avgNetMargin: number;
    totalPaymentFee: number;
    totalPlatformFee: number;
    totalNetMargin: number;
    totalOwnerProfit: number;
    avgPaymentFeePercent: number;
    avgPlatformFeePercent: number;
    avgMarginPercent: number;
    totalTransactions: number;
    totalVolume: number;
  };
  dailyTrends: Array<{ date: string; day: string; profit: number; volume: number; count: number }>;
  paymentTypes: Array<{
    id: string;
    name: string;
    transactionCount: number;
    totalVolume: number;
    totalProfit: number;
    totalFee: number;
    successCount: number;
    avgFeePercent: number;
    successRate: number;
  }>;
  statusCounts: { pending: number; verification: number; process: number; success: number; failed: number };
  partnerStats: Array<{
    id: string;
    name: string;
    tier: string;
    commission: number;
    totalVolume: number;
    totalProfit: number;
    totalTransactions: number;
    last30DaysVolume: number;
    last30DaysTransactions: number;
    last30DaysSuccessCount: number;
  }>;
  marketplaceAnalysis: Array<{
    id: string;
    name: string;
    feePercent: number;
    transactionCount: number;
    totalVolume: number;
    totalFee: number;
  }>;
  peakHours: Array<{ hour: number; count: number }>;
}

/* ===== MAIN COMPONENT ===== */

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const redirectAttempted = useRef(false);

  const [mobileBottomTab, setMobileBottomTab] = useState<'transactions' | 'testimonials'>('transactions');

  const [recentTestimonials, setRecentTestimonials] = useState<Array<{
    id: string;
    rating: number;
    review: string;
    customerName: string;
    createdAt: string;
    isApproved: boolean;
    transaction: { nominal: number; paymentType: { name: string } } | null;
  }>>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
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
      fetchUnreadNotifications();
      fetchRecentTestimonials();
      fetchAnalytics();
    }
  }, [isAuthenticated, hasHydrated, user]);

  const fetchUnreadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=1');
      if (!response.ok) { console.error('Notifications API error:', response.status); return; }
      const notifResult = await response.json();
      let totalCount = 0;
      if (notifResult.success) { totalCount = notifResult.data.unreadCount || 0; }
      setUnreadNotifications(totalCount);
    } catch (err) { console.error('Failed to fetch notifications:', err); }
  };

  const fetchRecentTestimonials = async () => {
    setTestimonialsLoading(true);
    try {
      const response = await fetch('/api/testimonials?limit=10');
      const result = await response.json();
      if (result.success && result.data) {
        setRecentTestimonials(Array.isArray(result.data) ? result.data : []);
      }
    } catch { /* Non-critical */ } finally { setTestimonialsLoading(false); }
  };

  // NEW: Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/transactions/analytics');
      if (response.ok) {
        const result = await response.json();
        if (result.success) { setAnalytics(result.data); }
      }
    } catch { /* Non-critical */ }
  };

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => {
        fetchDashboard(transactionsPage, true);
      }, 60000);
    }
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [isAuthenticated, hasHydrated, user, transactionsPage]);

  // Window focus revalidation
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'owner') {
        fetchDashboard(transactionsPage);
        fetchUnreadNotifications();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, hasHydrated, user, transactionsPage]);

  // Custom event for notification count refresh
  useEffect(() => {
    const handleNotificationUpdate = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'owner') { fetchUnreadNotifications(); }
    };
    window.addEventListener('notification-count-update', handleNotificationUpdate);
    return () => window.removeEventListener('notification-count-update', handleNotificationUpdate);
  }, [isAuthenticated, hasHydrated, user]);

  const fetchDashboard = async (page = transactionsPage, isAutoRefresh = false) => {
    if (isAutoRefresh) { setIsRefreshing(true); } else { setDataLoading(true); }
    try {
      const response = await fetch(`/api/dashboard?transactionsPage=${page}`);
      const result = await response.json();
      if (result.success) { setData(result.data); setLastUpdated(new Date()); }
      else { setError(result.error || 'Gagal memuat data'); }
    } catch { setError('Terjadi kesalahan'); }
    finally { setDataLoading(false); setIsRefreshing(false); }
  };

  const goToTransactionsPage = (page: number) => { setTransactionsPage(page); fetchDashboard(page); };

  const updateTransactionStatus = useCallback(async (transactionId: string, newStatus: string) => {
    setUpdatingStatus(transactionId);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (result.success) { fetchDashboard(transactionsPage); }
      else { setError(result.error || 'Gagal memperbarui status'); }
    } catch { setError('Terjadi kesalahan'); }
    finally { setUpdatingStatus(null); }
  }, [transactionsPage]);

  if (isLoading || !hasHydrated) { return <DashboardSkeleton />; }
  if (!isAuthenticated || user?.role !== 'owner') { return null; }

  const stats = data?.stats;
  const notifications = (stats?.pendingCount || 0) + (stats?.verificationCount || 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Selamat Pagi', emoji: '🌅' };
    if (hour >= 12 && hour < 15) return { text: 'Selamat Siang', emoji: '☀️' };
    if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', emoji: '🌤️' };
    return { text: 'Selamat Malam', emoji: '🌙' };
  };
  const greeting = getGreeting();

  // Format for Y-axis
  const formatYAxis = (v: number) => {
    if (v >= 1000000000000) return `${(v / 1000000000000).toFixed(0)}T`;
    if (v >= 1000000000) return `${(v / 1000000000).toFixed(0)}M`;
    if (v >= 1000000) return `${(v / 1000000).toFixed(0)}jt`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`;
    return v.toString();
  };

  // Chart data for area chart (volume + profit from last7Days + analytics dailyTrends)
  const chartData = analytics?.dailyTrends?.slice(-7).map(d => ({
    day: d.day,
    volume: d.volume,
    profit: d.profit,
  })) || data?.last7DaysData?.map(d => ({
    day: d.dayName,
    volume: d.volume,
    profit: 0,
  })) || [];

  const monthProgress = analytics ? ((analytics.forecast.daysPassed / analytics.forecast.daysInMonth) * 100) : 0;

  // Derived metrics
  const revenuePerPartner = stats?.activePartners ? (stats.thisMonthProfit / stats.activePartners) : 0;
  const peakHourData = analytics?.peakHours?.reduce((max, h) => h.count > max.count ? h : max, { hour: 0, count: 0 });
  const throughputRate = stats ? ((stats.successCount / (stats.totalTransactions || 1)) * 100) : 0;
  const avgPartnerSuccessRate = analytics?.partnerStats?.length
    ? (analytics.partnerStats.reduce((sum, p) => sum + ((p.last30DaysSuccessCount / (p.last30DaysTransactions || 1)) * 100), 0) / analytics.partnerStats.length)
    : 0;
  const bestPartner = analytics?.partnerStats?.reduce((best, p) => p.totalProfit > (best?.totalProfit || 0) ? p : best, analytics.partnerStats?.[0] || null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-24 md:pb-8">

        {/* ============================================ */}
        {/* 1. COMPACT WELCOME BAR                      */}
        {/* ============================================ */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Dashboard Owner</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight mt-1">
              {greeting.text}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchDashboard(transactionsPage); fetchAnalytics(); }}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-lg border border-border/60 hover:bg-muted/50 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isRefreshing && "animate-spin")} />
            </button>
            <Link
              href="/owner/dashboard/notifications"
              className="relative w-8 h-8 rounded-lg border border-border/60 hover:bg-muted/50 flex items-center justify-center transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Today's quick snapshot strip */}
        <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl border border-border/60 bg-card">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-none">Trx</p>
              <p className="text-xs sm:text-sm font-semibold leading-tight">{dataLoading ? '—' : (stats?.totalTransactions || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-none">Sukses</p>
              <p className="text-xs sm:text-sm font-semibold leading-tight">{dataLoading ? '—' : (stats?.successCount || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-none">Pending</p>
              <p className="text-xs sm:text-sm font-semibold leading-tight">{dataLoading ? '—' : (stats?.pendingCount || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-none">Gagal</p>
              <p className="text-xs sm:text-sm font-semibold leading-tight">{dataLoading ? '—' : (stats?.failedCount || 0)}</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="text-xs sm:text-sm animate-fade-in">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ============================================ */}
        {/* 2. KPI CARDS ROW                             */}
        {/* ============================================ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            title="Profit Bulan Ini"
            value={formatCurrency(stats?.thisMonthProfit || 0)}
            change={stats?.profitChange || 0}
            icon={DollarSign}
            accent="emerald"
            subtitle="vs bulan lalu"
            loading={dataLoading}
          />
          <KPICard
            title="Volume Bulan Ini"
            value={formatCurrency(stats?.thisMonthVolume || 0)}
            change={stats?.volumeChange || 0}
            icon={TrendingUp}
            accent="violet"
            subtitle="vs bulan lalu"
            loading={dataLoading}
          />
          <KPICard
            title="Conversion Rate"
            value={`${(stats?.conversionRate || 0).toFixed(1)}%`}
            icon={Percent}
            accent="amber"
            subtitle="success / total"
            loading={dataLoading}
            isNeutral
          />
          <KPICard
            title="Avg Transaction"
            value={formatCurrency(stats?.avgTransactionValue || 0)}
            icon={CreditCard}
            accent="fuchsia"
            subtitle="nilai rata-rata"
            loading={dataLoading}
            isNeutral
          />
        </div>

        {/* ============================================ */}
        {/* 3. REVENUE OVERVIEW (Chart + Forecast)       */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left: Revenue Trend Chart (2/3) */}
          <Card className="lg:col-span-2 rounded-xl border border-border/60 overflow-hidden">
            <CardHeader className="pb-2 px-5 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Revenue Overview</p>
                  <CardTitle className="text-sm font-semibold mt-1 flex items-center gap-2">
                    Tren 7 Hari Terakhir
                    {stats?.dailyGrowth !== undefined && (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium",
                        stats.dailyGrowth >= 0
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      )}>
                        {stats.dailyGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(stats.dailyGrowth).toFixed(1)}%
                      </span>
                    )}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {dataLoading ? (
                <Skeleton className="h-52 w-full rounded-xl" />
              ) : chartData.length > 0 && chartData.some(d => d.volume > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="areaVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="areaProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={formatYAxis} width={45} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'volume' ? 'Volume' : 'Profit']}
                    />
                    <Area type="monotone" dataKey="volume" stroke="#8b5cf6" strokeWidth={2} fill="url(#areaVolume)" name="Volume" />
                    {analytics && chartData.some(d => d.profit > 0) && (
                      <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" fill="url(#areaProfit)" name="Profit" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Belum ada transaksi 7 hari terakhir</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Month Forecast (1/3) */}
          {analytics && (
            <Card className="rounded-xl border border-border/60">
              <CardHeader className="pb-2 px-5 pt-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Forecast</p>
                <CardTitle className="text-sm font-semibold">Proyeksi Bulan Ini</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-4">
                {/* Month progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold text-xs">{monthProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={monthProgress} className="h-1.5 [&>div]:bg-violet-500" />
                  <p className="text-[10px] text-muted-foreground">
                    {analytics.forecast.daysPassed} / {analytics.forecast.daysInMonth} hari • {analytics.forecast.daysRemaining} tersisa
                  </p>
                </div>

                <Separator />

                {/* Projected metrics */}
                <div className="space-y-3">
                  <ForecastItem
                    label="Proyeksi Profit"
                    value={formatCompactCurrency(analytics.forecast.projectedProfit)}
                    sub={`Ø ${formatCompactCurrency(analytics.forecast.avgDailyProfit)}/hari`}
                    accent="text-emerald-600 dark:text-emerald-400"
                  />
                  <ForecastItem
                    label="Proyeksi Volume"
                    value={formatCompactCurrency(analytics.forecast.projectedVolume)}
                    sub={`Ø ${formatCompactCurrency(analytics.forecast.avgDailyVolume)}/hari`}
                    accent="text-violet-600 dark:text-violet-400"
                  />
                </div>

                <Separator />

                {/* vs last month */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">vs Bulan Lalu</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Profit</span>
                    <span className={cn(
                      "text-xs font-semibold",
                      analytics.forecast.profitChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {analytics.forecast.profitChange >= 0 ? '+' : ''}{analytics.forecast.profitChange.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Volume</span>
                    <span className={cn(
                      "text-xs font-semibold",
                      analytics.forecast.volumeChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {analytics.forecast.volumeChange >= 0 ? '+' : ''}{analytics.forecast.volumeChange.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Bulan lalu: {formatCompactCurrency(analytics.forecast.lastMonthProfit)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ============================================ */}
        {/* 4. BUSINESS HEALTH (Funnel + Fees)          */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left: Transaction Funnel */}
          <Card className="rounded-xl border border-border/60">
            <CardHeader className="pb-2 px-5 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Pipeline</p>
              <CardTitle className="text-sm font-semibold">Transaction Funnel</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <StatusPipeline
                pending={stats?.pendingCount || 0}
                verification={stats?.verificationCount || 0}
                process={stats?.processCount || 0}
                success={stats?.successCount || 0}
                failed={stats?.failedCount || 0}
                loading={dataLoading}
              />
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/40">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Throughput Rate</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{throughputRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Active Pipeline</p>
                  <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {(stats?.pendingCount || 0) + (stats?.verificationCount || 0) + (stats?.processCount || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Fee & Margin Analysis */}
          {analytics && (
            <Card className="rounded-xl border border-border/60">
              <CardHeader className="pb-2 px-5 pt-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Margin</p>
                <CardTitle className="text-sm font-semibold">Fee & Margin Analysis</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-3">
                <div className="space-y-3">
                  <FeeBar
                    label="Payment Fee"
                    percent={analytics.feeAnalysis.avgPaymentFeePercent}
                    total={analytics.feeAnalysis.totalPaymentFee}
                    color="bg-violet-500"
                    lightColor="bg-violet-100 dark:bg-violet-900/20"
                  />
                  <FeeBar
                    label="Platform Fee"
                    percent={analytics.feeAnalysis.avgPlatformFeePercent}
                    total={analytics.feeAnalysis.totalPlatformFee}
                    color="bg-fuchsia-500"
                    lightColor="bg-fuchsia-100 dark:bg-fuchsia-900/20"
                  />
                  <FeeBar
                    label="Net Margin"
                    percent={analytics.feeAnalysis.avgMarginPercent}
                    total={analytics.feeAnalysis.totalOwnerProfit}
                    color="bg-emerald-500"
                    lightColor="bg-emerald-100 dark:bg-emerald-900/20"
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{analytics.feeAnalysis.avgMarginPercent.toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground">Margin</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">{formatCompactCurrency(analytics.feeAnalysis.totalOwnerProfit)}</p>
                    <p className="text-[10px] text-muted-foreground">Total Profit</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">{analytics.feeAnalysis.totalTransactions}</p>
                    <p className="text-[10px] text-muted-foreground">Transaksi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ============================================ */}
        {/* 5. OPERATIONS (Quick Actions + Urgent Tasks)  */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Quick Actions */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-1">Quick Actions</p>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/owner/dashboard/transactions" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Transaksi</span>
              </Link>
              <Link href="/owner/dashboard/partners" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Partner</span>
              </Link>
              <Link href="/owner/dashboard/broadcast" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/20 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Siaran</span>
              </Link>
            </div>
          </div>

          {/* Urgent Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Urgent Tasks</p>
              {(stats?.pendingCount || stats?.verificationCount || stats?.processCount) ? (
                <Badge variant="outline" className="text-amber-600 text-[10px]">
                  {notifications + (stats?.processCount || 0)} item
                </Badge>
              ) : null}
            </div>
            {(stats?.pendingCount || stats?.verificationCount || stats?.processCount) ? (
              <div className="grid grid-cols-3 gap-2">
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
            ) : (
              <div className="flex items-center justify-center h-full py-6 rounded-xl border border-border/60">
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-1.5 text-emerald-500 opacity-40" />
                  <p className="text-xs text-muted-foreground">Semua transaksi sudah diproses</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Announcements Banner */}
        {data?.announcements && data.announcements.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="animate-marquee whitespace-nowrap text-xs text-muted-foreground">
                {data.announcements.map((a, i) => (
                  <span key={a.id}>
                    <strong className="text-foreground">{a.title}</strong>: {a.description}
                    {i < data.announcements.length - 1 && '  •  '}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Partner Notifications (compact) */}
        {(data?.unreadPartnerMessages || 0) > 0 && (
          <Card className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
            <CardHeader className="pb-2 px-5 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-500 animate-pulse" />
                  <CardTitle className="text-sm font-semibold">Notifikasi Partner</CardTitle>
                  <Badge className="bg-amber-500 text-white text-[10px]">
                    {data?.unreadPartnerMessages} baru
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-7 text-[10px]">
                  <Link href="/owner/dashboard/notifications">Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ScrollArea className="max-h-48">
                <div className="space-y-1.5 px-1 pr-2">
                  {data?.partnerMessages?.slice(0, 4).map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2.5 rounded-lg transition-colors cursor-pointer hover:bg-muted/30 border border-transparent hover:border-border/40"
                      onClick={() => { if (msg.transactionId) router.push(`/owner/dashboard/transactions?highlight=${msg.transactionId}`); }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-xs">{msg.title}</p>
                            {msg.data?.orderId && <Badge variant="outline" className="text-[9px]">{msg.data.orderId}</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{msg.message}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-muted-foreground">{formatDateAgo(msg.createdAt)}</span>
                            {msg.data?.nominal && (
                              <span className="text-[9px] font-medium text-violet-600 dark:text-violet-400">{formatCurrency(msg.data.nominal)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* ============================================ */}
        {/* 6. PERFORMANCE TABS                          */}
        {/* ============================================ */}
        <Card className="rounded-xl border border-border/60 overflow-hidden">
          <Tabs defaultValue="partners">
            <CardHeader className="pb-0 px-5 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Performance</p>
            </CardHeader>
            <div className="px-5">
              <TabsList className="h-8 bg-muted/50 w-full">
                <TabsTrigger value="partners" className="text-[11px] h-6 px-2 sm:px-3 gap-1">
                  <Handshake className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Partner</span>
                </TabsTrigger>
                <TabsTrigger value="customers" className="text-[11px] h-6 px-2 sm:px-3 gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pelanggan</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="text-[11px] h-6 px-2 sm:px-3 gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pembayaran</span>
                </TabsTrigger>
                {analytics?.marketplaceAnalysis && analytics.marketplaceAnalysis.length > 0 && (
                  <TabsTrigger value="marketplace" className="text-[11px] h-6 px-2 sm:px-3 gap-1">
                    <Store className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Marketplace</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Partners Tab */}
            <TabsContent value="partners">
              <CardContent className="px-5 pb-4">
                {dataLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                ) : analytics?.partnerStats?.length ? (
                  <div className="space-y-1">
                    {analytics.partnerStats.slice(0, 5).map((partner, index) => (
                      <div key={partner.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] flex-shrink-0',
                          index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
                          index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs truncate">{partner.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatCurrency(partner.totalProfit)} • {partner.last30DaysSuccessCount} sukses/30d
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px] flex-shrink-0">{partner.tier}</Badge>
                      </div>
                    ))}
                  </div>
                ) : data?.topPartnersThisMonth?.length ? (
                  <div className="space-y-1">
                    {data.topPartnersThisMonth.slice(0, 5).map((partner, index) => (
                      <div key={partner.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] flex-shrink-0',
                          index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
                          index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs truncate">{partner.name}</p>
                          <p className="text-[10px] text-muted-foreground">Profit: {formatCurrency(partner.profit || 0)}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] flex-shrink-0">{partner.tier}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-6 text-xs">Belum ada data partner</div>
                )}
              </CardContent>
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers">
              <CardContent className="px-5 pb-4">
                {dataLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                ) : data?.topCustomersThisMonth?.length ? (
                  <div className="space-y-1">
                    {data.topCustomersThisMonth.slice(0, 5).map((customer) => (
                      <div key={customer.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0">
                          <Users className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs truncate">{customer.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatCurrency(customer.volume || 0)} • {customer.transactions} trx
                          </p>
                        </div>
                        <CustomerLabelBadge label={customer.label} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-6 text-xs">Belum ada data pelanggan</div>
                )}
              </CardContent>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <CardContent className="px-5 pb-4">
                {analytics?.paymentTypes && analytics.paymentTypes.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.paymentTypes.map((pt) => (
                      <div key={pt.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="w-8 h-8 rounded-md bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-xs truncate">{pt.name}</p>
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{pt.successRate.toFixed(0)}%</span>
                          </div>
                          {/* Success rate bar */}
                          <div className="h-1 rounded-full bg-muted w-full">
                            <div
                              className="h-1 rounded-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${pt.successRate}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-3 text-[9px] text-muted-foreground mt-1">
                            <span>Vol: <strong className="text-foreground">{formatCompactCurrency(pt.totalVolume)}</strong></span>
                            <span>Profit: <strong className="text-emerald-600 dark:text-emerald-400">{formatCompactCurrency(pt.totalProfit)}</strong></span>
                            <span>{pt.transactionCount} trx</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-6 text-xs">Belum ada data pembayaran</div>
                )}
              </CardContent>
            </TabsContent>

            {/* Marketplace Tab */}
            {analytics?.marketplaceAnalysis && analytics.marketplaceAnalysis.length > 0 && (
              <TabsContent value="marketplace">
                <CardContent className="px-5 pb-4">
                  <div className="space-y-2">
                    {analytics.marketplaceAnalysis.map((mp) => (
                      <div key={mp.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="w-8 h-8 rounded-md bg-fuchsia-100 dark:bg-fuchsia-900/20 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-medium text-xs truncate">{mp.name}</p>
                            <span className="text-[10px] font-medium">{mp.feePercent.toFixed(1)}% fee</span>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                            <span>Vol: <strong className="text-foreground">{formatCompactCurrency(mp.totalVolume)}</strong></span>
                            <span>{mp.transactionCount} trx</span>
                            <span>Fee: <strong className="text-foreground">{formatCompactCurrency(mp.totalFee)}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </TabsContent>
            )}
          </Tabs>
        </Card>

        {/* ============================================ */}
        {/* 7. ADVANCED METRICS                          */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Partner Productivity */}
          <Card className="rounded-xl border border-border/60">
            <CardHeader className="pb-2 px-5 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Partner Productivity</p>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Revenue/Partner</p>
                  <p className="text-base font-bold text-violet-600 dark:text-violet-400">{formatCompactCurrency(revenuePerPartner)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Avg Success Rate</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{avgPartnerSuccessRate.toFixed(1)}%</p>
                </div>
              </div>
              {bestPartner && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Best Performer</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-3 h-3 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">{bestPartner.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(bestPartner.totalProfit)} profit</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Insights */}
          <Card className="rounded-xl border border-border/60">
            <CardHeader className="pb-2 px-5 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Transaction Insights</p>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Peak Hour</p>
                  <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {peakHourData && peakHourData.count > 0 ? `${String(peakHourData.hour).padStart(2, '0')}:00` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Avg Daily Volume</p>
                  <p className="text-base font-bold text-violet-600 dark:text-violet-400">
                    {analytics ? formatCompactCurrency(analytics.forecast.avgDailyVolume) : '—'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Avg Daily Profit</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {analytics ? formatCompactCurrency(analytics.forecast.avgDailyProfit) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Success Rate</p>
                  <p className="text-base font-bold">{throughputRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============================================ */}
        {/* 8. TESTIMONIALS & TRANSACTIONS               */}
        {/* Desktop: 2-grid side-by-side                */}
        {/* Mobile: 1 card with 2 tabs                  */}
        {/* ============================================ */}

        {/* ===== DESKTOP: 2-column grid ===== */}
        <div className="hidden lg:grid grid-cols-2 gap-3">
          {/* LEFT: Recent Transactions */}
          <Card className="rounded-xl border border-border/60 overflow-hidden">
            <CardHeader className="pb-2 px-5 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Transactions</p>
                  <CardTitle className="text-sm font-semibold mt-1">Transaksi Terbaru</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {data?.transactionsPagination && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      {((data.transactionsPagination.currentPage - 1) * 10) + 1}–{Math.min(data.transactionsPagination.currentPage * 10, data.transactionsPagination.totalCount)} / {data.transactionsPagination.totalCount}
                    </span>
                  )}
                  <Button variant="ghost" size="sm" asChild className="h-7 text-[10px]">
                    <Link href="/owner/dashboard/transactions">Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              {dataLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
              ) : data?.recentTransactions?.length ? (
                <div className="space-y-1">
                  {data.recentTransactions.map((tx) => {
                    const statusConfig = {
                      pending: { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/15', icon: Clock },
                      verification: { color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/15', icon: AlertCircle },
                      process: { color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/15', icon: Loader2 },
                      success: { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/15', icon: CheckCircle },
                      failed: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/15', icon: XCircle },
                    };
                    const config = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = config.icon;

                    return (
                      <div key={tx.id} className="group relative flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/40">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
                          <StatusIcon className={cn("w-4 h-4", config.color, tx.status === 'process' && "animate-spin")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-xs truncate">{tx.customer.name}</p>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-md font-medium capitalize",
                              tx.status === 'success' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                              tx.status === 'pending' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                              tx.status === 'verification' && "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                              tx.status === 'process' && "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
                              tx.status === 'failed' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            )}>
                              {tx.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-semibold text-foreground">{formatCurrency(tx.nominal)}</span>
                            <span>•</span>
                            <span>{tx.paymentType.name}</span>
                            {tx.partner && (<><span>•</span><span className="truncate max-w-[80px]">{tx.partner.name}</span></>)}
                            <span>•</span>
                            <span>{formatDateAgo(tx.createdAt)}</span>
                          </div>
                        </div>
                        {tx.status !== 'success' && tx.status !== 'failed' && (
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {tx.status === 'pending' && (
                              <button onClick={() => updateTransactionStatus(tx.id, 'process')} disabled={updatingStatus === tx.id}
                                className="w-7 h-7 rounded-md bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50"
                                title="Proses">
                                {updatingStatus === tx.id ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5 text-white" />}
                              </button>
                            )}
                            {tx.status === 'verification' && (
                              <>
                                <button onClick={() => updateTransactionStatus(tx.id, 'success')} disabled={updatingStatus === tx.id}
                                  className="w-7 h-7 rounded-md bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50"
                                  title="Setujui">
                                  {updatingStatus === tx.id ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </button>
                                <button onClick={() => updateTransactionStatus(tx.id, 'failed')} disabled={updatingStatus === tx.id}
                                  className="w-7 h-7 rounded-md bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
                                  title="Tolak">
                                  <XCircle className="w-3.5 h-3.5 text-white" />
                                </button>
                              </>
                            )}
                            {tx.status === 'process' && (
                              <button onClick={() => updateTransactionStatus(tx.id, 'verification')} disabled={updatingStatus === tx.id}
                                className="w-7 h-7 rounded-md bg-violet-500 hover:bg-violet-600 flex items-center justify-center transition-colors disabled:opacity-50"
                                title="Verifikasi">
                                {updatingStatus === tx.id ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <AlertCircle className="w-3.5 h-3.5 text-white" />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                  <p className="text-xs text-muted-foreground">Belum ada transaksi</p>
                </div>
              )}
              {/* Pagination */}
              {data?.transactionsPagination && data.transactionsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground">
                    Halaman {data.transactionsPagination.currentPage} dari {data.transactionsPagination.totalPages}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => goToTransactionsPage(transactionsPage - 1)} disabled={transactionsPage === 1 || dataLoading}
                      className="h-7 px-2.5 rounded-md border border-border/60 bg-background hover:bg-muted/50 transition-colors disabled:opacity-50 text-[11px] flex items-center gap-1">
                      <ChevronLeft className="w-3 h-3" />Prev
                    </button>
                    <button onClick={() => goToTransactionsPage(transactionsPage + 1)} disabled={transactionsPage === data.transactionsPagination.totalPages || dataLoading}
                      className="h-7 px-2.5 rounded-md border border-border/60 bg-background hover:bg-muted/50 transition-colors disabled:opacity-50 text-[11px] flex items-center gap-1">
                      Next<ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: Recent Testimonials */}
          <Card className="rounded-xl border border-border/60 overflow-hidden">
            <CardHeader className="pb-2 px-5 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold">Testimoni Terbaru</CardTitle>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-7 text-[10px]">
                  <Link href="/owner/dashboard/testimonials">Kelola <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              {testimonialsLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
              ) : recentTestimonials.length > 0 ? (
                <ScrollArea className="max-h-[340px]">
                  <div className="space-y-1.5 pr-1">
                    {recentTestimonials.slice(0, 5).map((t) => (
                      <div key={t.id} className={cn(
                        "rounded-lg p-3 transition-colors border",
                        !t.isApproved
                          ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/40 dark:border-amber-800/20"
                          : "border-transparent hover:bg-muted/30 hover:border-border/40"
                      )}>
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                            !t.isApproved ? "bg-amber-100 dark:bg-amber-900/20" : "bg-emerald-100 dark:bg-emerald-900/20"
                          )}>
                            <Star className={cn("w-3.5 h-3.5", !t.isApproved ? "text-amber-500" : "text-emerald-500")} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-xs truncate">{t.customerName}</p>
                              <div className="flex items-center gap-px flex-shrink-0">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={cn("w-2 h-2", s <= t.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")} />
                                ))}
                              </div>
                              {!t.isApproved && (
                                <Badge variant="outline" className="text-[8px] px-1.5 flex-shrink-0 text-amber-600">Menunggu</Badge>
                              )}
                            </div>
                            {t.review && (
                              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{t.review}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-muted-foreground">
                              {t.transaction && <span>{t.transaction.paymentType.name} • {formatCurrency(t.transaction.nominal)}</span>}
                              <span>• {formatDateAgo(t.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                  <p className="text-xs text-muted-foreground">Belum ada testimoni</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== MOBILE: 1 card with 2 tabs ===== */}
        <div className="lg:hidden">
          <Card className="rounded-xl border border-border/60 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-border/60">
              <button
                onClick={() => setMobileBottomTab('transactions')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors relative",
                  mobileBottomTab === 'transactions'
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Wallet className="w-3.5 h-3.5" />
                Transaksi
                {data?.recentTransactions && data.recentTransactions.length > 0 && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                    mobileBottomTab === 'transactions'
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {data.recentTransactions.length}
                  </span>
                )}
                {mobileBottomTab === 'transactions' && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-violet-500" />
                )}
              </button>
              <button
                onClick={() => setMobileBottomTab('testimonials')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors relative",
                  mobileBottomTab === 'testimonials'
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Star className="w-3.5 h-3.5" />
                Testimoni
                {recentTestimonials.length > 0 && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                    mobileBottomTab === 'testimonials'
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {recentTestimonials.length}
                  </span>
                )}
                {mobileBottomTab === 'testimonials' && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-amber-500" />
                )}
              </button>
            </div>

            {/* Tab content: Transactions */}
            {mobileBottomTab === 'transactions' && (
              <CardContent className="px-3 py-3">
                {dataLoading ? (
                  <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                ) : data?.recentTransactions?.length ? (
                  <div className="space-y-1">
                    {data.recentTransactions.map((tx) => {
                      const statusConfig = {
                        pending: { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/15', icon: Clock },
                        verification: { color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/15', icon: AlertCircle },
                        process: { color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/15', icon: Loader2 },
                        success: { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/15', icon: CheckCircle },
                        failed: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/15', icon: XCircle },
                      };
                      const config = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.pending;
                      const StatusIcon = config.icon;

                      return (
                        <div key={tx.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/40">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
                            <StatusIcon className={cn("w-4 h-4", config.color, tx.status === 'process' && "animate-spin")} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-xs truncate">{tx.customer.name}</p>
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-md font-medium capitalize",
                                tx.status === 'success' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                tx.status === 'pending' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                tx.status === 'verification' && "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                                tx.status === 'process' && "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
                                tx.status === 'failed' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              )}>
                                {tx.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              <span className="font-semibold text-foreground">{formatCurrency(tx.nominal)}</span>
                              <span>•</span>
                              <span>{tx.paymentType.name}</span>
                              {tx.partner && (<><span>•</span><span className="truncate max-w-[70px]">{tx.partner.name}</span></>)}
                            </div>
                          </div>
                          {tx.status !== 'success' && tx.status !== 'failed' && (
                            <button onClick={() => {
                              if (tx.status === 'pending') updateTransactionStatus(tx.id, 'process');
                              else if (tx.status === 'verification') updateTransactionStatus(tx.id, 'success');
                              else if (tx.status === 'process') updateTransactionStatus(tx.id, 'verification');
                            }} disabled={updatingStatus === tx.id}
                              className="w-7 h-7 rounded-md bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0">
                              {updatingStatus === tx.id
                                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                : <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                              }
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                    <p className="text-xs text-muted-foreground">Belum ada transaksi</p>
                  </div>
                )}
                {/* Mobile pagination */}
                {data?.transactionsPagination && data.transactionsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-3 mt-2 border-t border-border/40">
                    <button onClick={() => goToTransactionsPage(transactionsPage - 1)} disabled={transactionsPage === 1 || dataLoading}
                      className="h-7 px-3 rounded-md border border-border/60 bg-background hover:bg-muted/50 transition-colors disabled:opacity-50 text-[11px] flex items-center gap-1">
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {data.transactionsPagination.currentPage}/{data.transactionsPagination.totalPages}
                    </span>
                    <button onClick={() => goToTransactionsPage(transactionsPage + 1)} disabled={transactionsPage === data.transactionsPagination.totalPages || dataLoading}
                      className="h-7 px-3 rounded-md border border-border/60 bg-background hover:bg-muted/50 transition-colors disabled:opacity-50 text-[11px] flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {/* Footer link */}
                <div className="flex justify-center pt-2">
                  <Button variant="ghost" size="sm" asChild className="h-7 text-[10px]">
                    <Link href="/owner/dashboard/transactions">Lihat Semua Transaksi <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
                  </Button>
                </div>
              </CardContent>
            )}

            {/* Tab content: Testimonials */}
            {mobileBottomTab === 'testimonials' && (
              <CardContent className="px-3 py-3">
                {testimonialsLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
                ) : recentTestimonials.length > 0 ? (
                  <div className="space-y-1.5">
                    {recentTestimonials.slice(0, 5).map((t) => (
                      <div key={t.id} className={cn(
                        "rounded-lg p-3 transition-colors border",
                        !t.isApproved
                          ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/40 dark:border-amber-800/20"
                          : "border-transparent hover:bg-muted/30 hover:border-border/40"
                      )}>
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                            !t.isApproved ? "bg-amber-100 dark:bg-amber-900/20" : "bg-emerald-100 dark:bg-emerald-900/20"
                          )}>
                            <Star className={cn("w-3.5 h-3.5", !t.isApproved ? "text-amber-500" : "text-emerald-500")} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-xs truncate">{t.customerName}</p>
                              <div className="flex items-center gap-px flex-shrink-0">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={cn("w-2 h-2", s <= t.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")} />
                                ))}
                              </div>
                              {!t.isApproved && (
                                <Badge variant="outline" className="text-[8px] px-1.5 flex-shrink-0 text-amber-600">Menunggu</Badge>
                              )}
                            </div>
                            {t.review && (
                              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{t.review}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-muted-foreground">
                              {t.transaction && <span>{t.transaction.paymentType.name} • {formatCurrency(t.transaction.nominal)}</span>}
                              <span>• {formatDateAgo(t.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                    <p className="text-xs text-muted-foreground">Belum ada testimoni</p>
                  </div>
                )}
                {/* Footer link */}
                <div className="flex justify-center pt-2">
                  <Button variant="ghost" size="sm" asChild className="h-7 text-[10px]">
                    <Link href="/owner/dashboard/testimonials">Kelola Testimoni <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* ============================================ */}
        {/* 10. PROMOS                                   */}
        {/* ============================================ */}
        {data?.promos && data.promos.length > 0 && (
          <Card className="rounded-xl border border-border/60">
            <CardHeader className="pb-2 px-5 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Promosi</p>
              <CardTitle className="text-sm font-semibold">Promo Aktif</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.promos.map((promo) => (
                  <a key={promo.id} href={promo.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 hover:shadow-sm transition-all">
                    <div className="w-8 h-8 rounded-md bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">{promo.title}</p>
                      <p className="text-[10px] text-muted-foreground">Klik untuk lihat</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================ */}
        {/* 11. FOOTER                                   */}
        {/* ============================================ */}
        {lastUpdated && (
          <div className="flex items-center justify-center gap-1 pt-2 pb-4">
            <p className="text-[10px] text-muted-foreground">
              Diperbarui: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {isRefreshing && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />}
          </div>
        )}

      </div>
    </div>
  );
}

/* ===== SUB-COMPONENTS ===== */

function KPICard({
  title, value, change, icon: Icon, accent, subtitle, loading, isNeutral
}: {
  title: string; value: string; change?: number; icon: React.ElementType;
  accent: string; subtitle?: string; loading?: boolean; isNeutral?: boolean;
}) {
  const accentClasses: Record<string, { bar: string; iconBg: string }> = {
    violet: { bar: 'bg-violet-500', iconBg: 'bg-violet-100 dark:bg-violet-900/20' },
    emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/20' },
    amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/20' },
    fuchsia: { bar: 'bg-fuchsia-500', iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/20' },
  };
  const styles = accentClasses[accent] || accentClasses.violet;

  return (
    <Card className="rounded-xl border border-border/60 relative overflow-hidden hover:shadow-sm transition-shadow">
      {/* Colored left accent bar */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-full", styles.bar)} />
      <CardContent className="p-4 pl-5">
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-28" /></div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground font-medium">{title}</p>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", styles.iconBg)}>
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-base sm:text-lg font-bold tracking-tight">{value}</p>
            {change !== undefined && !isNeutral && (
              <div className={cn(
                "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium",
                change >= 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              )}>
                {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                <span className="text-muted-foreground hidden sm:inline ml-0.5">{subtitle}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ForecastItem({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-bold", accent)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function FeeBar({ label, percent, total, color, lightColor }: { label: string; percent: number; total: number; color: string; lightColor: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{percent.toFixed(1)}%</span>
          <span className="text-muted-foreground text-[10px]">{formatCompactCurrency(total)}</span>
        </div>
      </div>
      <div className={cn("h-1.5 rounded-full", lightColor)}>
        <div className={cn("h-1.5 rounded-full transition-all duration-500", color)} style={{ width: `${Math.min(Math.max(percent, 2), 100)}%` }} />
      </div>
    </div>
  );
}

function UrgentTaskCard({
  title, count, icon: Icon, urgency, color, href
}: {
  title: string; count: number; icon: React.ElementType; urgency: 'high' | 'medium' | 'low'; color: string; href: string;
}) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    orange: { bg: 'bg-amber-50 dark:bg-amber-900/15', text: 'text-amber-600 dark:text-amber-400' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/15', text: 'text-yellow-600 dark:text-yellow-400' },
    blue: { bg: 'bg-cyan-50 dark:bg-cyan-900/15', text: 'text-cyan-600 dark:text-cyan-400' },
  };
  const styles = colorClasses[color];

  return (
    <Link href={href}>
      <div className={cn(
        "rounded-xl border border-border/60 p-3 text-center transition-all hover:shadow-sm hover:bg-muted/20 cursor-pointer",
        urgency === 'high' && count > 0 && "border-amber-200 dark:border-amber-800"
      )}>
        <div className={cn("w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center", styles.bg)}>
          <Icon className={cn("w-4 h-4", styles.text, urgency === 'low' && "animate-spin")} />
        </div>
        <p className="text-xl font-bold">{count}</p>
        <p className="text-[10px] text-muted-foreground font-medium">{title}</p>
      </div>
    </Link>
  );
}

function StatusPipeline({
  pending, verification, process, success, failed, loading
}: {
  pending: number; verification: number; process: number; success: number; failed: number; loading: boolean;
}) {
  const total = pending + verification + process + success + failed;
  if (loading) {
    return <Skeleton className="h-12 w-full rounded-lg" />;
  }
  if (total === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Belum ada data</p>;
  }

  const steps = [
    { label: 'Pending', count: pending, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Verifikasi', count: verification, color: 'bg-violet-500', textColor: 'text-violet-600 dark:text-violet-400' },
    { label: 'Proses', count: process, color: 'bg-cyan-500', textColor: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Sukses', count: success, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
  ];

  const maxCount = Math.max(...steps.map(s => s.count), 1);

  return (
    <div className="space-y-2">
      {/* Horizontal bar visualization */}
      <div className="flex rounded-lg overflow-hidden h-3">
        {steps.map((step, i) => step.count > 0 && (
          <div
            key={step.label}
            className={cn(step.color, "transition-all duration-500")}
            style={{ width: `${(step.count / total) * 100}%` }}
            title={`${step.label}: ${step.count}`}
          />
        ))}
      </div>

      {/* Step labels */}
      <div className="grid grid-cols-4 gap-2">
        {steps.map((step) => (
          <div key={step.label} className="text-center">
            <p className={cn("text-xs font-bold", step.textColor)}>{step.count}</p>
            <p className="text-[9px] text-muted-foreground">{step.label}</p>
            {/* Mini bar */}
            <div className="mt-1 h-0.5 rounded-full bg-muted mx-2">
              <div
                className={cn("h-0.5 rounded-full transition-all duration-500", step.color)}
                style={{ width: `${(step.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Failed badge */}
      {failed > 0 && (
        <div className="flex items-center gap-1.5 pt-1">
          <XCircle className="w-3 h-3 text-red-400" />
          <span className="text-[10px] text-red-500 font-medium">{failed} gagal</span>
        </div>
      )}
    </div>
  );
}

function CustomerLabelBadge({ label }: { label: string }) {
  const variants: Record<string, string> = {
    VIP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    Regular: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    New: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    Blacklist: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };
  return <Badge variant="outline" className={cn('text-[9px]', variants[label] || variants.Regular)}>{label}</Badge>;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-24 md:pb-8">
        {/* Welcome bar */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        </div>
        {/* KPI strip */}
        <Skeleton className="h-16 w-full rounded-xl" />
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        {/* Revenue overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        {/* Business health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
        {/* Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        {/* Performance tabs */}
        <Skeleton className="h-48 rounded-xl" />
        {/* Advanced metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        {/* Transactions */}
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}