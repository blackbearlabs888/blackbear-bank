'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Trophy,
  Clock,
  Megaphone,
  ExternalLink,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Calendar,
  Activity,
  BarChart3,
  RefreshCw,
  CreditCard,
  Percent,
  Radio,
  Tag,
  Star,
  Handshake,
  UserCheck,
  Store,
} from 'lucide-react';
import {
  AreaChart,
  Area,
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
import { getErrorMessage } from '@/lib/get-error-message';

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
  const [mobileChartTab, setMobileChartTab] = useState<'overview' | 'forecast'>('overview');
  const [bubbleFilter, setBubbleFilter] = useState<'volume' | 'transactions'>('volume');

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
      else { setError(getErrorMessage(result.error, 'Gagal memuat data dashboard')); }
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
      else { setError(getErrorMessage(result.error, 'Gagal memperbarui status transaksi')); }
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

  // Health Score (0-100) with grade system
  const calculateHealthScore = (): { score: number; grade: string; color: string; stroke: string; bg: string } => {
    if (!stats || dataLoading) return { score: 0, grade: '—', color: 'text-muted-foreground', stroke: 'stroke-muted-foreground', bg: 'bg-muted/10' };

    let score = 0;
    // Conversion rate scoring (0-30 points)
    score += Math.min(30, (stats.conversionRate || 0) * 1.5);
    // Throughput rate scoring (0-25 points)
    score += Math.min(25, throughputRate * 0.25);
    // Profit growth scoring (0-25 points)
    const growthScore = Math.max(0, (stats.profitChange || 0) * 2.5);
    score += Math.min(25, growthScore);
    // Active partners scoring (0-20 points)
    score += Math.min(20, (stats.activePartners || 0) * 2);

    score = Math.round(Math.min(100, Math.max(0, score)));

    let grade: string;
    let color: string;
    let stroke: string;
    let bg: string;
    if (score >= 85) { grade = 'A'; color = 'text-emerald-500'; stroke = 'stroke-emerald-500'; bg = 'bg-emerald-500/10'; }
    else if (score >= 70) { grade = 'B'; color = 'text-violet-500'; stroke = 'stroke-violet-500'; bg = 'bg-violet-500/10'; }
    else if (score >= 55) { grade = 'C'; color = 'text-amber-500'; stroke = 'stroke-amber-500'; bg = 'bg-amber-500/10'; }
    else if (score >= 40) { grade = 'D'; color = 'text-orange-500'; stroke = 'stroke-orange-500'; bg = 'bg-orange-500/10'; }
    else { grade = 'E'; color = 'text-red-500'; stroke = 'stroke-red-500'; bg = 'bg-red-500/10'; }

    return { score, grade, color, stroke, bg };
  };

  const healthScoreData = calculateHealthScore();
  const scoreMeta = { label: healthScoreData.grade, color: healthScoreData.color, stroke: healthScoreData.stroke, bg: healthScoreData.bg };
  const healthScore = healthScoreData.score;

  // Sparkline data for 7-day trend
  const sparkVolume = chartData.map(d => d.volume);
  const sparkProfit = chartData.map(d => d.profit);

  // Generate synthetic trend for metrics without real daily data
  const generateSyntheticTrend = (change: number, length: number = 7): Array<{ day: number; value: number }> => {
    const values: number[] = [];
    let current = 50;
    for (let i = 0; i < length; i++) {
      current += (change / length) + (Math.sin(i) * 2);
      values.push(Math.max(0, current));
    }
    return values.map((v, i) => ({ day: i, value: v }));
  };

  const sparkConversion = generateSyntheticTrend(stats?.conversionRate || 0);
  const sparkAvgTransaction = generateSyntheticTrend(stats?.avgTransactionValue ? (stats.avgTransactionValue > 0 ? 5 : -3) : 0);

  // Recharts-based sparkline for KPI cards
  function ChartSparkline({ data, dataKey, color, height = 40 }: { data: Array<Record<string, any>>; dataKey: string; color: string; height?: number }) {
    if (!data || data.length < 2) return null;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} fill={`url(#spark-${color.replace('#', '')})`} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Revenue chart content (shared between desktop & mobile)
  function RevenueChartContent() {
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-500" />
            <p className="text-xs sm:text-sm font-semibold">Tren 7 Hari Terakhir</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span className="text-[9px] text-muted-foreground">Volume</span>
            </div>
            {analytics && chartData.some(d => d.profit > 0) && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-[9px] text-muted-foreground">Profit</span>
              </div>
            )}
          </div>
        </div>
        {dataLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : chartData.length > 0 && chartData.some(d => d.volume > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="areaVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#334155" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#334155" tickFormatter={formatYAxis} width={45} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#e2e8f0' }}
                formatter={(value: number, name: string) => [formatCurrency(value), name === 'volume' ? 'Volume' : 'Profit']}
              />
              <Area type="monotone" dataKey="volume" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#areaVolume)" name="Volume" />
              {analytics && chartData.some(d => d.profit > 0) && (
                <Area type="monotone" dataKey="profit" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="5 5" fill="url(#areaProfit)" name="Profit" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-xs">Belum ada transaksi 7 hari terakhir</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Forecast content (shared between desktop & mobile)
  function ForecastContent() {
    if (!analytics) return null;
    return (
      <>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-violet-500" />
          <p className="text-xs sm:text-sm font-semibold">Proyeksi Bulan Ini</p>
        </div>
        {/* Month progress */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold text-xs">{monthProgress.toFixed(0)}%</span>
          </div>
          <Progress value={monthProgress} className="h-1.5 [&>div]:bg-violet-500" />
          <p className="text-[10px] text-muted-foreground">
            {analytics.forecast.daysPassed} / {analytics.forecast.daysInMonth} hari &bull; {analytics.forecast.daysRemaining} tersisa
          </p>
        </div>
        <Separator />
        {/* 2 grid: Profit + Volume */}
        <div className="grid grid-cols-2 gap-3 my-3">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-medium mb-1">Profit</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCompactCurrency(analytics.forecast.projectedProfit)}</p>
            <p className="text-[10px] text-muted-foreground">{formatCompactCurrency(analytics.forecast.avgDailyProfit)}/hari</p>
            <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-semibold mt-1", analytics.forecast.profitChange >= 0 ? "text-emerald-500" : "text-red-500")}>
              {analytics.forecast.profitChange >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {analytics.forecast.profitChange >= 0 ? '+' : ''}{analytics.forecast.profitChange.toFixed(1)}%
            </span>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-medium mb-1">Volume</p>
            <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{formatCompactCurrency(analytics.forecast.projectedVolume)}</p>
            <p className="text-[10px] text-muted-foreground">{formatCompactCurrency(analytics.forecast.avgDailyVolume)}/hari</p>
            <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-semibold mt-1", analytics.forecast.volumeChange >= 0 ? "text-emerald-500" : "text-red-500")}>
              {analytics.forecast.volumeChange >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {analytics.forecast.volumeChange >= 0 ? '+' : ''}{analytics.forecast.volumeChange.toFixed(1)}%
            </span>
          </div>
        </div>
        <Separator />
        <p className="text-[10px] text-muted-foreground mt-2">
          Bulan lalu: {formatCompactCurrency(analytics.forecast.lastMonthProfit)}
        </p>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background dashboard-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-24 md:pb-8">

        {/* ============================================ */}
        {/* 1. GREETING CARD + HEALTH SCORE + ICONS          */}
        {/* ============================================ */}
        <Card className="rounded-xl dash-card overflow-hidden relative dash-section d2">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 dark:from-violet-500/10 dark:to-cyan-500/10 pointer-events-none" />
          <CardContent className="relative p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              {/* Left: Greeting + Stats */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Dashboard Owner</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight mt-1.5">
                  {greeting.text}, {user?.name?.split(' ')[0]}
                </h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/30">
                  <div className="text-center">
                    <p className={cn("text-sm sm:text-base font-bold leading-none", dataLoading ? "text-muted-foreground" : "text-foreground")}>{dataLoading ? '—' : (stats?.totalTransactions || 0)}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">Total Trx</p>
                  </div>
                  <div className="text-center">
                    <p className={cn("text-sm sm:text-base font-bold leading-none text-emerald-500", dataLoading && "text-muted-foreground")}>{dataLoading ? '—' : (stats?.successCount || 0)}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">Sukses</p>
                  </div>
                  <div className="text-center">
                    <p className={cn("text-sm sm:text-base font-bold leading-none text-amber-500", dataLoading && "text-muted-foreground")}>{dataLoading ? '—' : (stats?.pendingCount || 0)}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className={cn("text-sm sm:text-base font-bold leading-none text-red-400", dataLoading && "text-muted-foreground")}>{dataLoading ? '—' : (stats?.failedCount || 0)}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">Gagal</p>
                  </div>
                </div>
              </div>

              {/* Right: Health Score + Icons (no background) */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {/* Health Score Ring */}
                  <div className="text-center">
                    <div className="relative w-14 h-14">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" className="stroke-muted/30" strokeWidth="3" />
                        <circle
                          cx="28" cy="28" r="24" fill="none"
                          strokeWidth="3" strokeLinecap="round"
                          className={cn(scoreMeta.stroke, "transition-all duration-700")}
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          strokeDashoffset={`${2 * Math.PI * 24 * (1 - healthScore / 100)}`}
                        />
                      </svg>
                      <span className={cn("absolute inset-0 flex items-center justify-center text-sm font-bold", scoreMeta.color)}>
                        {dataLoading ? '—' : healthScore}
                      </span>
                    </div>
                    <p className={cn("text-[9px] mt-0.5 font-medium", scoreMeta.color)}>Score</p>
                  </div>
                </div>
                {/* Inline icons - no background */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { fetchDashboard(transactionsPage); fetchAnalytics(); }}
                    disabled={isRefreshing}
                    className="w-7 h-7 rounded-md hover:bg-muted/50 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isRefreshing && "animate-spin")} />
                  </button>
                  <Link
                    href="/owner/dashboard/notifications"
                    className="relative w-7 h-7 rounded-md hover:bg-muted/50 flex items-center justify-center transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-[12px] px-0.5 rounded-full bg-red-500 text-[7px] font-bold text-white flex items-center justify-center">
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="text-xs sm:text-sm animate-fade-in">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ============================================ */}
        {/* 2. OVERVIEW - SINGLE CARD                      */}
        {/* ============================================ */}
        <Card className="rounded-xl dash-card overflow-hidden dash-section d3">
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Overview</p>
                <p className="text-xs sm:text-sm font-semibold mt-0.5">Metrik & Tren 7 Hari</p>
              </div>
              {stats?.dailyGrowth !== undefined && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium",
                  stats.dailyGrowth >= 0
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                )}>
                  {stats.dailyGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(stats.dailyGrowth).toFixed(1)}% hari ini
                </span>
              )}
            </div>

            {/* KPI Grid - clean, no cards, no lines */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">Profit Bulan Ini</p>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500/40" />
                </div>
                <p className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight leading-none">{dataLoading ? '—' : formatCurrency(stats?.thisMonthProfit || 0)}</p>
                {stats?.profitChange !== undefined && (
                  <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-semibold mt-1.5", (stats.profitChange || 0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {(stats.profitChange || 0) >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {(stats.profitChange || 0) >= 0 ? '+' : ''}{(stats.profitChange || 0).toFixed(1)}%
                  </span>
                )}
                <div className="mt-1.5"><ChartSparkline data={chartData.map((d, i) => ({ day: i, value: d.profit }))} dataKey="value" color="#10b981" height={28} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">Volume Bulan Ini</p>
                  <TrendingUp className="w-3.5 h-3.5 text-violet-500/40" />
                </div>
                <p className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight leading-none">{dataLoading ? '—' : formatCurrency(stats?.thisMonthVolume || 0)}</p>
                {stats?.volumeChange !== undefined && (
                  <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-semibold mt-1.5", (stats.volumeChange || 0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {(stats.volumeChange || 0) >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {(stats.volumeChange || 0) >= 0 ? '+' : ''}{(stats.volumeChange || 0).toFixed(1)}%
                  </span>
                )}
                <div className="mt-1.5"><ChartSparkline data={chartData.map((d, i) => ({ day: i, value: d.volume }))} dataKey="value" color="#8b5cf6" height={28} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">Conversion</p>
                  <Percent className="w-3.5 h-3.5 text-amber-500/40" />
                </div>
                <p className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight leading-none">{dataLoading ? '—' : `${(stats?.conversionRate || 0).toFixed(1)}%`}</p>
                <span className="text-[9px] text-muted-foreground/50 font-medium mt-1.5 inline-block">success / total</span>
                <div className="mt-1"><ChartSparkline data={sparkConversion} dataKey="value" color="#f59e0b" height={28} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">Avg Trx</p>
                  <CreditCard className="w-3.5 h-3.5 text-fuchsia-500/40" />
                </div>
                <p className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight leading-none">{dataLoading ? '—' : formatCurrency(stats?.avgTransactionValue || 0)}</p>
                <span className="text-[9px] text-muted-foreground/50 font-medium mt-1.5 inline-block">nilai rata-rata</span>
                <div className="mt-1"><ChartSparkline data={sparkAvgTransaction} dataKey="value" color="#d946ef" height={28} /></div>
              </div>
            </div>

            {/* Revenue Chart + Forecast - Mobile: tabs, Desktop: side by side */}
            <div className="flex lg:hidden bg-muted/30 rounded-lg p-0.5">
              <button onClick={() => setMobileChartTab('overview')} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors", mobileChartTab === 'overview' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}> <BarChart3 className="w-3.5 h-3.5" /> Revenue </button>
              <button onClick={() => setMobileChartTab('forecast')} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors", mobileChartTab === 'forecast' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}> <Activity className="w-3.5 h-3.5" /> Forecast </button>
            </div>

            {/* Desktop: side by side */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 rounded-xl bg-muted/20 border border-border/40 p-3 sm:p-4"><RevenueChartContent /></div>
              {analytics && <div className="rounded-xl bg-muted/20 border border-border/40 p-3 sm:p-4"><ForecastContent /></div>}
            </div>
            {/* Mobile: tabbed */}
            <div className="lg:hidden">
              {mobileChartTab === 'overview' && <div className="rounded-xl bg-muted/20 border border-border/40 p-3 sm:p-4"><RevenueChartContent /></div>}
              {mobileChartTab === 'forecast' && analytics && <div className="rounded-xl bg-muted/20 border border-border/40 p-3 sm:p-4"><ForecastContent /></div>}
            </div>
          </CardContent>
        </Card>

        {/* ============================================ */}
        {/* 3B. ANALYTICS (Payment Methods + Urgent + Insights) */}
        {/* ============================================ */}
        {analytics?.paymentTypes && analytics.paymentTypes.length > 0 && (
          <Card className="rounded-xl dash-card overflow-hidden dash-section d5">
            <CardHeader className="pb-2 px-4 sm:px-5 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Analytics</p>
                  <CardTitle className="text-sm font-semibold">Payment Methods & Urgent Tasks</CardTitle>
                </div>
                <div className="flex bg-muted/40 rounded-md p-0.5">
                  <button
                    onClick={() => setBubbleFilter('volume')}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors",
                      bubbleFilter === 'volume' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                    )}
                  >Volume</button>
                  <button
                    onClick={() => setBubbleFilter('transactions')}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors",
                      bubbleFilter === 'transactions' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                    )}
                  >Total Trx</button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-5 pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
                {/* Left sidebar: Urgent Tasks + Transaction Insights */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  {/* Urgent Tasks - horizontal */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">Urgent Tasks</p>
                      {(stats?.pendingCount || stats?.verificationCount || stats?.processCount) ? (
                        <Badge variant="outline" className="text-amber-600 text-[9px] h-5">
                          {notifications + (stats?.processCount || 0)} item
                        </Badge>
                      ) : null}
                    </div>
                    {(stats?.pendingCount || stats?.verificationCount || stats?.processCount) ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        <Link href="/owner/dashboard/transactions?status=pending" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
                          <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-900/15 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <p className="text-base font-bold leading-none text-amber-600 dark:text-amber-400">{stats?.pendingCount || 0}</p>
                          <p className="text-[9px] text-muted-foreground font-medium">Pending</p>
                        </Link>
                        <Link href="/owner/dashboard/transactions?status=verification" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors">
                          <div className="w-7 h-7 rounded-md bg-yellow-50 dark:bg-yellow-900/15 flex items-center justify-center">
                            <AlertCircle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <p className="text-base font-bold leading-none text-yellow-600 dark:text-yellow-400">{stats?.verificationCount || 0}</p>
                          <p className="text-[9px] text-muted-foreground font-medium">Verifikasi</p>
                        </Link>
                        <Link href="/owner/dashboard/transactions?status=process" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/10 transition-colors">
                          <div className="w-7 h-7 rounded-md bg-cyan-50 dark:bg-cyan-900/15 flex items-center justify-center">
                            <Loader2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-spin" />
                          </div>
                          <p className="text-base font-bold leading-none text-cyan-600 dark:text-cyan-400">{stats?.processCount || 0}</p>
                          <p className="text-[9px] text-muted-foreground font-medium">Proses</p>
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-3">
                        <div className="text-center">
                          <CheckCircle className="w-7 h-7 mx-auto mb-1 text-emerald-500 opacity-40" />
                          <p className="text-[10px] text-muted-foreground">Semua sudah diproses</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transaction Insights */}
                  <Separator />
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium mb-2">Transaction Insights</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Peak Hour</p>
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {peakHourData && peakHourData.count > 0 ? `${String(peakHourData.hour).padStart(2, '0')}:00` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Avg Daily Volume</p>
                        <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
                          {analytics ? formatCompactCurrency(analytics.forecast.avgDailyVolume) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Avg Daily Profit</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {analytics ? formatCompactCurrency(analytics.forecast.avgDailyProfit) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Success Rate</p>
                        <p className="text-sm font-bold">{throughputRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Bubble Chart - genetic network style */}
                <div className="lg:col-span-8 flex items-center justify-center">
                  <div className="relative w-full max-w-[340px] sm:max-w-[400px] mx-auto" style={{ aspectRatio: '1.1' }}>
                    {(() => {
                      const sorted = [...analytics.paymentTypes].sort((a, b) => {
                        const valA = bubbleFilter === 'volume' ? a.totalVolume : b.transactionCount;
                        const valB = bubbleFilter === 'volume' ? b.totalVolume : b.transactionCount;
                        return valB - valA;
                      });
                      const maxVal = Math.max(...sorted.map(pt => bubbleFilter === 'volume' ? pt.totalVolume : pt.transactionCount), 1);
                      const minR = 46;
                      const maxR = 78;
                      const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#d946ef'];
                      const bubbles = sorted.slice(0, 6).map((pt, i) => {
                        const val = bubbleFilter === 'volume' ? pt.totalVolume : pt.transactionCount;
                        const ratio = val / maxVal;
                        const size = Math.round(minR + (maxR - minR) * ratio);
                        const color = colors[i % colors.length];
                        const shortName = pt.name.length > 10 ? pt.name.slice(0, 9) + '…' : pt.name;
                        const fontSize = size >= 64 ? 11 : size >= 54 ? 10 : 9;
                        return { pt, i, size, color, shortName, fontSize, val };
                      });

                      // Position in a circular cluster: center + ring
                      const positions: Array<{ x: number; y: number }> = [];
                      if (bubbles.length === 1) {
                        positions.push({ x: 50, y: 50 });
                      } else if (bubbles.length <= 3) {
                        const r = 24;
                        bubbles.forEach((_, i) => {
                          const angle = (2 * Math.PI * i) / bubbles.length - Math.PI / 2;
                          positions.push({ x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) });
                        });
                      } else if (bubbles.length <= 6) {
                        positions.push({ x: 50, y: 47 });
                        const ringCount = bubbles.length - 1;
                        const r = 29;
                        for (let i = 0; i < ringCount; i++) {
                          const angle = (2 * Math.PI * i) / ringCount - Math.PI / 2;
                          positions.push({ x: 50 + r * Math.cos(angle), y: 47 + r * Math.sin(angle) });
                        }
                      } else {
                        bubbles.forEach((_, i) => {
                          const angle = (2 * Math.PI * i) / bubbles.length - Math.PI / 2;
                          const r = 30;
                          positions.push({ x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) });
                        });
                      }

                      // Build connection pairs: center↔ring + ring↔ring (adjacent)
                      const connections: Array<{ from: number; to: number }> = [];
                      if (bubbles.length > 1) {
                        for (let i = 1; i < bubbles.length; i++) {
                          connections.push({ from: 0, to: i });
                        }
                        // Adjacent ring connections
                        for (let i = 1; i < bubbles.length; i++) {
                          const next = i + 1 < bubbles.length ? i + 1 : 1;
                          connections.push({ from: i, to: next });
                        }
                      }

                      return (
                        <>
                          {/* SVG layer: connecting lines */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                            <defs>
                              {bubbles.map((b, i) => (
                                <linearGradient key={`lg-${i}`} id={`line-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor={b.color} stopOpacity="0.5" />
                                  <stop offset="100%" stopColor={b.color} stopOpacity="0.15" />
                                </linearGradient>
                              ))}
                              <filter id="line-glow">
                                <feGaussianBlur stdDeviation="1.5" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>
                            {connections.map((c, ci) => {
                              const p1 = positions[c.from];
                              const p2 = positions[c.to];
                              if (!p1 || !p2) return null;
                              const isCenterLine = c.from === 0 || c.to === 0;
                              const lineColor = bubbles[c.to]?.color || bubbles[c.from]?.color || '#8b5cf6';
                              return (
                                <line
                                  key={`conn-${ci}`}
                                  x1={`${p1.x}%`}
                                  y1={`${p1.y}%`}
                                  x2={`${p2.x}%`}
                                  y2={`${p2.y}%`}
                                  stroke={lineColor}
                                  strokeWidth={isCenterLine ? 1.5 : 1}
                                  strokeOpacity={isCenterLine ? 0.4 : 0.2}
                                  strokeDasharray={isCenterLine ? 'none' : '4 3'}
                                  filter="url(#line-glow)"
                                />
                              );
                            })}
                            {/* Animated pulse nodes at intersections */}
                            {positions.map((pos, i) => (
                              <circle
                                key={`node-${i}`}
                                cx={`${pos.x}%`}
                                cy={`${pos.y}%`}
                                r="2.5"
                                fill={bubbles[i]?.color || '#8b5cf6'}
                                opacity="0.6"
                              >
                                <animate
                                  attributeName="r"
                                  values="2.5;4;2.5"
                                  dur={`${2 + i * 0.3}s`}
                                  repeatCount="indefinite"
                                />
                                <animate
                                  attributeName="opacity"
                                  values="0.6;0.2;0.6"
                                  dur={`${2 + i * 0.3}s`}
                                  repeatCount="indefinite"
                                />
                              </circle>
                            ))}
                          </svg>

                          {/* Bubble nodes */}
                          {bubbles.map((b, idx) => {
                            const pos = positions[idx];
                            if (!pos) return null;
                            return (
                              <div
                                key={b.pt.id}
                                className="absolute flex flex-col items-center transition-transform duration-300 hover:scale-110 cursor-default group"
                                style={{
                                  left: `${pos.x}%`,
                                  top: `${pos.y}%`,
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: idx === 0 ? 10 : 5,
                                }}
                              >
                                <div
                                  className="rounded-full flex items-center justify-center relative"
                                  style={{
                                    width: b.size,
                                    height: b.size,
                                    background: `radial-gradient(circle at 35% 35%, ${b.color}20, ${b.color}08)`,
                                    border: `2px solid ${b.color}40`,
                                    boxShadow: `0 0 12px ${b.color}15, inset 0 0 12px ${b.color}08`,
                                  }}
                                >
                                  <span className="relative font-semibold text-foreground/90 whitespace-nowrap drop-shadow-sm" style={{ fontSize: b.fontSize }}>{b.shortName}</span>
                                  {/* Hover tooltip */}
                                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                    <div className="bg-popover text-popover-foreground border border-border/60 rounded-lg px-2.5 py-1 shadow-xl text-[10px] pointer-events-none">
                                      {b.pt.successRate.toFixed(0)}% success
                                    </div>
                                  </div>
                                </div>
                                <div className="text-center mt-1">
                                  <p className="font-bold text-[11px] leading-none tracking-tight" style={{ color: b.color }}>
                                    {bubbleFilter === 'volume' ? formatCompactCurrency(b.pt.totalVolume) : `${b.pt.transactionCount}`}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================ */}
        {/* 4. BUSINESS HEALTH (Funnel + Fees)          */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 dash-section d6">
          {/* Left: Transaction Funnel */}
          <Card className="rounded-xl dash-card">
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
            <Card className="rounded-xl dash-card">
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
        {/* 5. QUICK ACTIONS                             */}
        {/* ============================================ */}
        <div className="dash-section d7">
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

        {/* Announcements Banner */}
        {data?.announcements && data.announcements.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl stat-strip dash-section d8">
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
          <Card className="rounded-xl dash-card overflow-hidden dash-section d9">
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
        {/* 6. PERFORMANCE + BEST PERFORMER (2-grid)       */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 dash-section d10">
          {/* Performance tabs (2/3) */}
          <div className="lg:col-span-2">
            <Card className="rounded-xl dash-card overflow-hidden h-full">
              <Tabs defaultValue="partners">
                <CardHeader className="pb-0 px-4 sm:px-5 pt-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Performance</p>
                </CardHeader>
                <div className="px-4 sm:px-5">
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
                  <CardContent className="px-4 sm:px-5 pb-4">
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
                  <CardContent className="px-4 sm:px-5 pb-4">
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
                  <CardContent className="px-4 sm:px-5 pb-4">
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
                              <div className="h-1 rounded-full bg-muted w-full">
                                <div className="h-1 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pt.successRate}%` }} />
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
                    <CardContent className="px-4 sm:px-5 pb-4">
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
          </div>

          {/* Best Performer (1/3) */}
          <Card className="rounded-xl dash-card">
            <CardHeader className="pb-2 px-5 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Best Performer</p>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] text-muted-foreground">Revenue/Partner</p>
                  <p className="text-base font-bold text-violet-600 dark:text-violet-400">{formatCompactCurrency(revenuePerPartner)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Avg Success Rate</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{avgPartnerSuccessRate.toFixed(1)}%</p>
                </div>
              </div>
              {bestPartner && (
                <div className="pt-3 border-t border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{bestPartner.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(bestPartner.totalProfit)} profit</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/40">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Volume</p>
                      <p className="text-xs font-bold">{formatCompactCurrency(bestPartner.totalVolume)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Trx 30d</p>
                      <p className="text-xs font-bold">{bestPartner.last30DaysTransactions} trx</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============================================ */}
        {/* 7B. WEEKLY COMPARISON CHART                  */}
        {/* ============================================ */}
        {analytics?.dailyTrends && analytics.dailyTrends.length >= 7 && (
          <Card className="rounded-xl dash-card chart-ambient chart-ambient-cyan inner-glow overflow-hidden">
            <CardHeader className="pb-2 px-5 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Weekly Comparison</p>
                  <CardTitle className="text-sm font-semibold mt-1">This Week vs Last Week</CardTitle>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-0.5 rounded-full bg-violet-500" />
                    <span className="text-muted-foreground">Minggu Ini</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-0.5 rounded-full bg-cyan-500" />
                    <span className="text-muted-foreground">Minggu Lalu</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={
                  (() => {
                    const recent = analytics.dailyTrends.slice(-7);
                    const prevWeek = analytics.dailyTrends.slice(-14, -7);
                    const maxLen = Math.max(recent.length, prevWeek.length);
                    return Array.from({ length: maxLen }, (_, i) => ({
                      day: recent[i]?.day || prevWeek[i]?.day || '',
                      thisWeek: recent[i]?.volume || 0,
                      lastWeek: prevWeek[i]?.volume || 0,
                    }));
                  })()
                }>
                  <defs>
                    <linearGradient id="thisWeekGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lastWeekGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#334155" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#334155" tickFormatter={formatYAxis} width={45} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#e2e8f0' }} formatter={(value: number, name: string) => [formatCurrency(value), name === 'thisWeek' ? 'Minggu Ini' : 'Minggu Lalu']} />
                  <Line type="monotone" dataKey="thisWeek" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} name="thisWeek" />
                  <Line type="monotone" dataKey="lastWeek" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2, fill: '#06b6d4', strokeWidth: 0 }} name="lastWeek" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ============================================ */}
        {/* 8. TESTIMONIALS & TRANSACTIONS               */}
        {/* Desktop: 2-grid side-by-side                */}
        {/* Mobile: 1 card with 2 tabs                  */}
        {/* ============================================ */}

        {/* ===== DESKTOP: 2-column grid ===== */}
        <div className="hidden lg:grid grid-cols-2 gap-3 dash-section d12">
          {/* LEFT: Recent Transactions */}
          <Card className="rounded-xl dash-card overflow-hidden">
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
          <Card className="rounded-xl dash-card overflow-hidden">
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
          <Card className="rounded-xl dash-card overflow-hidden">
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
          <Card className="rounded-xl dash-card">
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

function QuickStatPill({ label, value, dotColor }: { label: string; value: string | number; dotColor: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)} />
      <div className="flex items-center gap-1">
        <span className="text-[9px] sm:text-[10px] text-muted-foreground leading-none">{label}</span>
        <span className="text-[11px] sm:text-xs font-semibold leading-none">{value}</span>
      </div>
    </div>
  );
}

function MiniSparkline({ data, color, width = 64, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2 || data.every(v => v === 0)) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  // Fill path
  const firstX = pad;
  const lastX = pad + ((data.length - 1) / (data.length - 1)) * (width - pad * 2);
  const fillPoints = `${firstX},${height} ${points} ${lastX},${height}`;

  return (
    <svg width={width} height={height} className="flex-shrink-0 opacity-80">
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#spark-fill-${color.replace('#', '')})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KPICard({
  title, value, change, icon: Icon, accent, subtitle, loading, isNeutral
}: {
  title: string; value: string; change?: number; icon: React.ElementType;
  accent: string; subtitle?: string; loading?: boolean; isNeutral?: boolean;
}) {
  const accentClasses: Record<string, { iconBg: string; iconColor: string; glow: string; shadow: string }> = {
    violet: { iconBg: 'bg-violet-500/10 dark:bg-violet-500/15', iconColor: 'text-violet-500 dark:text-violet-400', glow: 'ring-1 ring-violet-500/20 dark:ring-violet-400/15', shadow: 'hover:shadow-violet-500/10' },
    emerald: { iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15', iconColor: 'text-emerald-500 dark:text-emerald-400', glow: 'ring-1 ring-emerald-500/20 dark:ring-emerald-400/15', shadow: 'hover:shadow-emerald-500/10' },
    amber: { iconBg: 'bg-amber-500/10 dark:bg-amber-500/15', iconColor: 'text-amber-500 dark:text-amber-400', glow: 'ring-1 ring-amber-500/20 dark:ring-amber-400/15', shadow: 'hover:shadow-amber-500/10' },
    fuchsia: { iconBg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15', iconColor: 'text-fuchsia-500 dark:text-fuchsia-400', glow: 'ring-1 ring-fuchsia-500/20 dark:ring-fuchsia-400/15', shadow: 'hover:shadow-fuchsia-500/10' },
  };
  const styles = accentClasses[accent] || accentClasses.violet;

  return (
    <div className={cn(
      "dash-card kpi-accent p-4 hover:shadow-lg transition-all group cursor-default",
      `accent-${accent}`,
      loading && "animate-pulse-soft"
    )}>
      {loading ? (
        <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-28" /></div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">{title}</p>
            </div>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              styles.iconBg,
              styles.glow
            )}>
              <Icon className={cn("w-4 h-4", styles.iconColor)} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">{value}</p>
          {change !== undefined && !isNeutral && (
            <div className={cn(
              "inline-flex items-center gap-0.5 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              change >= 0
                ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                : "bg-red-500/10 text-red-500 dark:text-red-400"
            )}>
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              <span className="text-muted-foreground/60 hidden sm:inline ml-0.5">{subtitle}</span>
            </div>
          )}
          {isNeutral && subtitle && (
            <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-medium">{subtitle}</p>
          )}
        </>
      )}
    </div>
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
        "dash-card p-3 text-center cursor-pointer",
        urgency === 'high' && count > 0 && "border-amber-300 dark:border-amber-700"
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
    <div className="min-h-screen bg-background dashboard-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-24 md:pb-8">
        {/* Greeting card + health score */}
        <Skeleton className="h-32 w-full rounded-xl" />
        {/* Unified KPI card */}
        <Skeleton className="h-48 w-full rounded-xl" />
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