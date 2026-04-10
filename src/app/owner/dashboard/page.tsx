'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trophy,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Activity,
  RefreshCw,
  CreditCard,
  Users,
  UserPlus,
  BarChart3,
  Settings,
  Wallet,
  Radio,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Target,
  Zap,
  Shield,
  PieChart,
  Gauge,
  Calculator,
  Layers,
  Eye,
  CircleDot,
  AlertTriangle,
  ShoppingBag,
  Filter,
  Crown,
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

// ─── Interfaces ───────────────────────────────────────────

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

interface DashboardData {
  stats: {
    totalTransactions: number;
    totalVolume: number;
    totalProfit: number;
    activePartners: number;
    totalCustomers: number;
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
    todayProfit?: number;
    todayVolume?: number;
    todayCount?: number;
    yesterdayProfit?: number;
    yesterdayVolume?: number;
    yesterdayCount?: number;
    weekProfit?: number;
    weekVolume?: number;
    weekCount?: number;
    lastWeekProfit?: number;
    lastWeekVolume?: number;
    lastWeekCount?: number;
  };
  recentTransactions: Transaction[];
  topPartnersThisMonth: Array<{
    id: string;
    name: string;
    tier: string;
    profit?: number;
    volume?: number;
  }>;
  last7DaysData: Array<{
    date: string;
    dayName: string;
    volume: number;
    count: number;
  }>;
  partnerNotifications: PartnerNotification[];
  partnerMessages: PartnerMessage[];
  unreadPartnerMessages: number;
  topCustomersThisMonth: Array<{
    id: string;
    name: string;
    label?: string;
    volume: number;
    transactions: number;
  }>;
  partnersCloseToTarget: Array<{
    id: string;
    name: string;
    tier: string;
    achievement: number;
    profit: number;
    target: number;
  }>;
  newPartners: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
}

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
  paymentTypes: Array<{
    id: string;
    name: string;
    transactionCount: number;
    totalVolume: number;
    totalProfit: number;
    totalFee: number;
    successRate: number;
  }>;
  peakHours: Array<{ hour: number; count: number }>;
  partnerStats: Array<{
    id: string;
    name: string;
    tier: string;
    last30DaysVolume: number;
    last30DaysTransactions: number;
    last30DaysSuccessCount: number;
  }>;
  marketplaceAnalysis: Array<{
    name: string;
    feePercent: number;
    transactionCount: number;
    totalVolume: number;
    totalFee: number;
  }>;
  statusDetails: Record<string, {
    count: number;
    volume: number;
    profit: number;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins}m lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}j lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}h lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatDateAgo(dateString: string): string {
  try { return formatTimeAgo(new Date(dateString)); } catch { return dateString; }
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}M`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
  if (value > 0) return value.toLocaleString('id-ID');
  return '0';
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    pending: 'bg-orange-100/80 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    verification: 'bg-yellow-100/80 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    process: 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    success: 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    failed: 'bg-red-100/80 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };
  return (
    <Badge className={cn('text-[8px] sm:text-[9px] px-1.5 sm:px-2 capitalize', config[status] || config.pending)}>
      {status}
    </Badge>
  );
}

function ChangeIndicator({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const isPositive = value >= 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
      isPositive
        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
    )}>
      {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function ProgressBar({ value, max, color = 'bg-violet-500', className = '', barStyle }: {
  value: number;
  max: number;
  color?: string;
  className?: string;
  barStyle?: React.CSSProperties;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={cn('h-1.5 bg-muted/80 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out', color)}
        style={{ width: `${pct}%`, ...barStyle }}
      />
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 py-3 sm:py-6 space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5"><Skeleton className="h-6 w-40" /><Skeleton className="h-3 w-56" /></div>
        <div className="flex gap-2"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-9 w-9 rounded-xl" /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <div className="space-y-4"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
      </div>
      <Skeleton className="h-14 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}
      </div>
    </div>
  );
}

// ─── Status Colors Map ──────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: '#f97316',
  verification: '#eab308',
  process: '#3b82f6',
  success: '#10b981',
  failed: '#ef4444',
};

const PAYMENT_COLORS = ['#7c3aed', '#0891b2', '#d97706', '#dc2626', '#059669', '#ea580c', '#db2777', '#4f46e5'];

// ─── Main Component ───────────────────────────────────────

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const redirectAttempted = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { if (!hasHydrated) hydrate(); }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !redirectAttempted.current) {
      redirectAttempted.current = true;
      if (!isAuthenticated) router.replace('/login');
      else if (user?.role !== 'owner') router.replace('/partner/dashboard');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchDashboard();
      fetchAnalytics();
      fetchUnreadNotifications();
    }
  }, [isAuthenticated, hasHydrated, user]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => { fetchDashboard(true); fetchAnalytics(); }, 60000);
    }
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [isAuthenticated, hasHydrated, user]);

  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'owner') { fetchDashboard(); fetchAnalytics(); fetchUnreadNotifications(); }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, hasHydrated, user]);

  useEffect(() => {
    const handleNotifUpdate = () => { if (isAuthenticated && hasHydrated && user?.role === 'owner') fetchUnreadNotifications(); };
    window.addEventListener('notification-count-update', handleNotifUpdate);
    return () => window.removeEventListener('notification-count-update', handleNotifUpdate);
  }, [isAuthenticated, hasHydrated, user]);

  // ─── Data Fetchers ──────────────────────────────────

  const fetchUnreadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=1');
      if (!res.ok) return;
      const result = await res.json();
      if (result.success) setUnreadNotifications(result.data.unreadCount || 0);
    } catch {}
  };

  const fetchDashboard = async (isAutoRefresh = false) => {
    if (isAutoRefresh) setIsRefreshing(true); else setDataLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const result = await res.json();
      if (result.success) { setData(result.data); setLastUpdated(new Date()); }
      else setError(result.error || 'Gagal memuat data');
    } catch { setError('Terjadi kesalahan'); }
    finally { setDataLoading(false); setIsRefreshing(false); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/transactions/analytics');
      const result = await res.json();
      if (result.success) setAnalytics(result.data);
    } catch {}
  };

  const updateTransactionStatus = useCallback(async (transactionId: string, newStatus: string) => {
    setUpdatingStatus(transactionId);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      const result = await res.json();
      if (result.success) fetchDashboard();
      else setError(result.error || 'Gagal memperbarui status');
    } catch { setError('Terjadi kesalahan'); }
    finally { setUpdatingStatus(null); }
  }, []);

  // ─── Guards ─────────────────────────────────────────

  if (isLoading || !hasHydrated) return <DashboardSkeleton />;
  if (!isAuthenticated || user?.role !== 'owner') return null;

  const stats = data?.stats;
  const fc = analytics?.forecast;
  const fee = analytics?.feeAnalysis;

  // ─── Computed Values ────────────────────────────────

  const todayProfitChange = (() => {
    if (!stats?.yesterdayProfit || stats.yesterdayProfit === 0) return stats?.todayProfit && stats.todayProfit > 0 ? 100 : 0;
    return ((stats.todayProfit - stats.yesterdayProfit) / stats.yesterdayProfit) * 100;
  })();

  const weekProfitChange = (() => {
    if (!stats?.lastWeekProfit || stats.lastWeekProfit === 0) return stats?.weekProfit && stats.weekProfit > 0 ? 100 : 0;
    return ((stats.weekProfit - stats.lastWeekProfit) / stats.lastWeekProfit) * 100;
  })();

  const successRate = stats?.totalTransactions ? ((stats.successCount / stats.totalTransactions) * 100) : 0;
  const failedRate = stats?.totalTransactions ? ((stats.failedCount / stats.totalTransactions) * 100) : 0;
  const activePipeline = (stats?.pendingCount || 0) + (stats?.verificationCount || 0) + (stats?.processCount || 0);

  const pipelineStages = [
    { label: 'Pending', count: stats?.pendingCount || 0, color: 'bg-orange-500', href: '/owner/dashboard/transactions?status=pending' },
    { label: 'Verifikasi', count: stats?.verificationCount || 0, color: 'bg-yellow-500', href: '/owner/dashboard/transactions?status=verification' },
    { label: 'Proses', count: stats?.processCount || 0, color: 'bg-blue-500', href: '/owner/dashboard/transactions?status=process' },
    { label: 'Sukses', count: stats?.successCount || 0, color: 'bg-emerald-500', href: '/owner/dashboard/transactions?status=success' },
    { label: 'Gagal', count: stats?.failedCount || 0, color: 'bg-red-400', href: '/owner/dashboard/transactions?status=failed' },
  ];

  const chartData = data?.last7DaysData || [];
  const chartTotalVolume = chartData.reduce((s, d) => s + d.volume, 0);

  // Status breakdown data — convert object to array
  const statusDetailsRaw = analytics?.statusDetails || {};
  const statusDetails = Object.entries(statusDetailsRaw).map(([status, d]) => ({
    status,
    count: d.count,
    totalVolume: d.volume,
    totalProfit: d.profit,
  }));
  const statusTotalVolume = statusDetails.reduce((s, d) => s + d.totalVolume, 0);

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {lastUpdated && <span className="ml-2 opacity-50">· {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchDashboard(); fetchAnalytics(); }} disabled={isRefreshing}
            className="w-9 h-9 rounded-xl border border-border/50 bg-card hover:bg-muted/50 flex items-center justify-center transition-colors disabled:opacity-50" title="Refresh">
            <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isRefreshing && 'animate-spin')} />
          </button>
          <Link href="/owner/dashboard/notifications" className="relative w-9 h-9 rounded-xl border border-border/50 bg-card hover:bg-muted/50 flex items-center justify-center transition-colors">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-semibold text-white flex items-center justify-center">{unreadNotifications}</span>
            )}
          </Link>
        </div>
      </div>

      {error && <Alert variant="destructive" className="text-xs sm:text-sm animate-fade-in"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* ═══════════════════════════════════════════════════
          SECTION 1: KPI HERO STRIP (5 cards)
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {dataLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)
        ) : (
          <>
            {/* Profit Hari Ini — subtle emerald gradient */}
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-900/10 animate-slide-up overflow-hidden relative">
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/[0.06] rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-3 sm:p-4 relative z-10">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-100" />
                  <p className="text-[9px] sm:text-[10px] text-emerald-100 font-medium">Hari Ini</p>
                </div>
                <p className="text-base sm:text-xl font-semibold tabular-nums tracking-tight">{formatCurrency(stats?.todayProfit || 0)}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={cn('inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                    todayProfitChange >= 0 ? 'bg-white/15 text-white' : 'bg-red-400/25 text-red-100')}>
                    {todayProfitChange >= 0 ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />}
                    {Math.abs(todayProfitChange).toFixed(1)}%
                  </span>
                  <span className="text-[9px] text-emerald-100/60">vs kemarin</span>
                </div>
              </CardContent>
            </Card>

            {/* Profit Bulan Ini — clean with left border accent */}
            <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up overflow-hidden border-l-[3px] border-l-violet-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Profit Bulan Ini</p>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-500" />
                  </div>
                </div>
                <p className="text-base sm:text-xl font-semibold tabular-nums tracking-tight">{formatCurrency(stats?.thisMonthProfit || 0)}</p>
                <ChangeIndicator value={stats?.profitChange || 0} />
              </CardContent>
            </Card>

            {/* Volume Bulan Ini */}
            <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up overflow-hidden border-l-[3px] border-l-cyan-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Volume Bulan Ini</p>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-center">
                    <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-500" />
                  </div>
                </div>
                <p className="text-base sm:text-xl font-semibold tabular-nums tracking-tight">{formatCompactCurrency(stats?.thisMonthVolume || 0)}</p>
                <ChangeIndicator value={stats?.volumeChange || 0} />
              </CardContent>
            </Card>

            {/* Total Transaksi */}
            <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up overflow-hidden border-l-[3px] border-l-amber-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Total Transaksi</p>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                    <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-base sm:text-xl font-semibold tabular-nums tracking-tight">{stats?.totalTransactions?.toLocaleString('id-ID') || 0}</p>
                  {(stats?.todayCount || 0) > 0 && <Badge className="bg-amber-100/80 text-amber-700 dark:bg-amber-900/20 text-amber-400 text-[8px] px-1">+{stats?.todayCount}</Badge>}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{successRate.toFixed(1)}% success rate</p>
              </CardContent>
            </Card>

            {/* Customer */}
            <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up overflow-hidden border-l-[3px] border-l-pink-500 col-span-2 lg:col-span-1">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Total Pelanggan</p>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center">
                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-500" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-base sm:text-xl font-semibold tabular-nums tracking-tight">{stats?.totalCustomers?.toLocaleString('id-ID') || 0}</p>
                  {(stats?.newCustomersThisMonth || 0) > 0 && <Badge className="bg-pink-100/80 text-pink-700 dark:bg-pink-900/20 text-pink-400 text-[8px] px-1">+{stats?.newCustomersThisMonth} baru</Badge>}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{stats?.activePartners || 0} partner aktif</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION 2: CHART + CMO QUICK METRICS
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Revenue Chart — soft glass feel */}
        <Card className="lg:col-span-2 rounded-2xl border border-border/50 shadow-sm overflow-hidden animate-slide-up backdrop-blur-sm bg-white/70 dark:bg-card/70">
          <CardHeader className="pb-1 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Tren Revenue 7 Hari
              </CardTitle>
              <div className="flex items-center gap-2">
                {stats?.weekProfit !== undefined && stats?.weekProfit > 0 && (
                  <ChangeIndicator value={weekProfitChange} />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-5 pb-3 sm:pb-4">
            {dataLoading ? (
              <Skeleton className="h-40 sm:h-48 w-full rounded-xl" />
            ) : chartData.length > 0 && chartData.some(d => d.volume > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={160} className="sm:!h-[190px]">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                    <XAxis dataKey="dayName" tick={{ fontSize: 10 }} stroke="#9ca3af" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af"
                      tickFormatter={(v) => v >= 1000000000 ? `${(v/1000000000).toFixed(0)}M` : v >= 1000000 ? `${(v/1000000).toFixed(0)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v.toString()}
                      width={38} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} labelStyle={{ fontSize: 11 }}
                      contentStyle={{ fontSize: 10, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} />
                    <Area type="monotone" dataKey="volume" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" name="Volume" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span>Total: <strong className="text-foreground font-medium">{formatCompactCurrency(chartTotalVolume)}</strong></span>
                  <span className="text-border">·</span>
                  <span>Rata-rata/hari: <strong className="text-foreground font-medium">{formatCompactCurrency(chartTotalVolume / 7)}</strong></span>
                </div>
              </>
            ) : (
              <div className="h-40 sm:h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center"><BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-15" /><p className="text-xs">Belum ada transaksi 7 hari terakhir</p></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CMO Quick Metrics — softer icon containers */}
        <div className="flex flex-col gap-4">
          {/* Conversion Rate */}
          <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up flex-1">
            <CardContent className="p-3 sm:p-4 flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Conversion Rate</p>
                <p className="text-xl sm:text-2xl font-semibold tracking-tight">{(stats?.conversionRate || 0).toFixed(1)}%</p>
                <ProgressBar value={stats?.conversionRate || 0} max={100} color="bg-indigo-500" className="mt-2" />
              </div>
            </CardContent>
          </Card>

          {/* Avg Transaction */}
          <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up flex-1">
            <CardContent className="p-3 sm:p-4 flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-950/30 flex items-center justify-center flex-shrink-0">
                <Calculator className="w-4 h-4 text-fuchsia-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Avg Transaction</p>
                <p className="text-xl sm:text-2xl font-semibold tracking-tight">{formatCompactCurrency(stats?.avgTransactionValue || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION 3: PIPELINE
          ═══════════════════════════════════════════════════ */}
      {activePipeline + (stats?.successCount || 0) + (stats?.failedCount || 0) > 0 && (
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Pipeline Transaksi
              </p>
              {activePipeline > 0 && <Badge variant="outline" className="text-[9px]">{activePipeline} aktif</Badge>}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {pipelineStages.map((stage) => {
                return (
                  <Link key={stage.label} href={stage.href} className="flex-shrink-0">
                    <div className={cn(
                      'flex items-center gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs font-medium transition-all cursor-pointer min-w-[85px] shadow-sm',
                      stage.count === 0
                        ? 'bg-muted/30 text-muted-foreground/30 cursor-default'
                        : `${stage.color} text-white hover:shadow-md hover:brightness-110`
                    )}>
                      <span className="text-[11px]">{stage.label}</span>
                      <span className="text-sm font-semibold">{stage.count}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════
          SECTION 4: CMO INSIGHTS — Payment Distribution + Partner Leaderboard
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* CMO: Payment Type Distribution */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
                <PieChart className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">CMO</span>
                Payment Distribution
              </CardTitle>
              <Badge variant="outline" className="text-[9px] text-muted-foreground">30 hari</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
            ) : analytics?.paymentTypes && analytics.paymentTypes.length > 0 ? (
              <div className="space-y-3">
                {analytics.paymentTypes.slice(0, 5).map((pt, i) => {
                  const maxVol = Math.max(...analytics.paymentTypes.slice(0, 5).map(p => p.totalVolume), 1);
                  return (
                    <div key={pt.id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                          <span className="text-xs font-medium">{pt.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{pt.transactionCount} tx</span>
                          <span className="text-xs font-medium">{formatCompactCurrency(pt.totalVolume)}</span>
                        </div>
                      </div>
                      <ProgressBar value={pt.totalVolume} max={maxVol} color="" className="!h-1" barStyle={{ backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><PieChart className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data</p></div>
            )}
          </CardContent>
        </Card>

        {/* CMO: Partner Performance Leaderboard */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
                <Trophy className="w-4 h-4 text-amber-500" />
                Top Partner Bulan Ini
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-7 text-[10px] text-muted-foreground hover:text-foreground">
                <Link href="/owner/dashboard/partners">Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : data?.topPartnersThisMonth?.length ? (
              <div className="space-y-1">
                {data.topPartnersThisMonth.slice(0, 5).map((partner, index) => {
                  const medals = [
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                  ];
                  const maxProfit = Math.max(...data.topPartnersThisMonth.slice(0, 5).map(p => p.profit || 0), 1);
                  return (
                    <div key={partner.id} className="flex items-center gap-3 p-2 sm:p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold flex-shrink-0', medals[index] || 'bg-muted text-muted-foreground')}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{partner.name}</p>
                        <ProgressBar value={partner.profit || 0} max={maxProfit} color="bg-amber-400" className="mt-1" />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium">{formatCurrency(partner.profit || 0)}</p>
                        <Badge variant="outline" className="text-[8px]">{partner.tier}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data partner</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION 4.5: CMO WIDGETS — Customer Acquisition + Top Customers
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* CMO: Customer Acquisition Funnel */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">CMO</span>
                Customer Acquisition
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : stats ? (
              <div className="space-y-4">
                {/* Total Customers */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Total Pelanggan</span>
                    </div>
                    <span className="text-sm font-semibold">{stats.totalCustomers?.toLocaleString('id-ID') || 0}</span>
                  </div>
                  <div className="h-2 bg-muted/80 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-400 dark:bg-zinc-500 rounded-full transition-all duration-700" style={{ width: '100%' }} />
                  </div>
                </div>
                {/* New This Month */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Baru Bulan Ini</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{stats.newCustomersThisMonth || 0}</span>
                      <span className="text-[9px] text-muted-foreground">
                        ({stats.totalCustomers ? ((stats.newCustomersThisMonth / stats.totalCustomers) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={stats.newCustomersThisMonth || 0} max={stats.totalCustomers || 1} color="bg-violet-400" className="!h-2" />
                </div>
                {/* Conversion Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Conversion Rate</span>
                    </div>
                    <span className="text-sm font-semibold">{(stats.conversionRate || 0).toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={stats.conversionRate || 0} max={100} color="bg-emerald-400" className="!h-2" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><Filter className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data</p></div>
            )}
          </CardContent>
        </Card>

        {/* CMO: Top Customers */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
                <Crown className="w-4 h-4 text-amber-500" />
                Top Pelanggan Bulan Ini
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-7 text-[10px] text-muted-foreground hover:text-foreground">
                <Link href="/owner/dashboard/customers">Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : data?.topCustomersThisMonth?.length ? (
              <div className="space-y-1">
                {data.topCustomersThisMonth.slice(0, 5).map((customer, index) => {
                  const maxVol = Math.max(...data.topCustomersThisMonth.slice(0, 5).map(c => c.volume), 1);
                  const medals = [
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                  ];
                  return (
                    <div key={customer.id} className="flex items-center gap-3 p-2 sm:p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold flex-shrink-0', medals[index] || 'bg-muted text-muted-foreground')}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{customer.name}</p>
                          {customer.label && <Badge variant="outline" className="text-[7px] px-1 py-0">{customer.label}</Badge>}
                        </div>
                        <ProgressBar value={customer.volume} max={maxVol} color="bg-emerald-400" className="mt-1" />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium">{formatCompactCurrency(customer.volume)}</p>
                        <p className="text-[9px] text-muted-foreground">{customer.transactions} tx</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><Crown className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data pelanggan</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION 5: CTO INSIGHTS — Forecast + Fee + Error Rate + Status + Marketplace + Peak Hours
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* CTO: Revenue Forecast */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
              <Gauge className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">CTO</span>
              Forecast Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
            ) : fc ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Projected Profit</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-semibold">{formatCurrency(fc.projectedProfit)}</p>
                    <ChangeIndicator value={fc.profitChange} />
                  </div>
                  <ProgressBar value={fc.currentMonthProfit} max={fc.projectedProfit} color="bg-blue-500" className="mt-2" />
                  <p className="text-[9px] text-muted-foreground mt-1.5">{fc.daysRemaining} hari tersisa · rata-rata {formatCurrency(fc.avgDailyProfit)}/hari</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
                  <div>
                    <p className="text-[9px] text-muted-foreground">Volume Aktual</p>
                    <p className="text-xs font-medium">{formatCompactCurrency(fc.currentMonthVolume)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Volume Projected</p>
                    <p className="text-xs font-medium">{formatCompactCurrency(fc.projectedVolume)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><Gauge className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data</p></div>
            )}
          </CardContent>
        </Card>

        {/* CTO: Fee & Margin Analysis */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
              <Percent className="w-4 h-4 text-muted-foreground" />
              Analisa Fee & Margin
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
            ) : fee ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-muted-foreground">Payment Fee</p>
                    <p className="text-sm font-semibold text-orange-600">{fee.avgPaymentFeePercent.toFixed(2)}%</p>
                    <p className="text-[9px] text-muted-foreground">{formatCompactCurrency(fee.totalPaymentFee)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-muted-foreground">Platform Fee</p>
                    <p className="text-sm font-semibold text-blue-600">{fee.avgPlatformFeePercent.toFixed(2)}%</p>
                    <p className="text-[9px] text-muted-foreground">{formatCompactCurrency(fee.totalPlatformFee)}</p>
                  </div>
                </div>
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-muted-foreground">Net Margin</p>
                  <p className="text-lg font-semibold text-emerald-600">{fee.avgMarginPercent.toFixed(2)}%</p>
                  <p className="text-[9px] text-muted-foreground">Owner profit: {formatCompactCurrency(fee.totalOwnerProfit)}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><Percent className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data</p></div>
            )}
          </CardContent>
        </Card>

        {/* CTO: Error Rate Tracker */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              Error Rate Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
            ) : stats?.totalTransactions ? (
              <div className="space-y-3">
                {/* Error Rate Circle-style Indicator */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/50" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke={failedRate > 10 ? '#ef4444' : failedRate > 5 ? '#f97316' : '#10b981'} strokeWidth="2.5"
                        strokeDasharray={`${failedRate}, 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn('text-sm font-semibold', failedRate > 10 ? 'text-red-600' : failedRate > 5 ? 'text-orange-600' : 'text-emerald-600')}>
                        {failedRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Gagal Rate</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {stats.failedCount} dari {stats.totalTransactions} transaksi
                    </p>
                  </div>
                </div>
                {/* Status Distribution Summary */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Pending</p>
                    <p className="text-xs font-medium text-orange-600">{stats.pendingCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Proses</p>
                    <p className="text-xs font-medium text-blue-600">{stats.processCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Berhasil</p>
                    <p className="text-xs font-medium text-emerald-600">{stats.successCount}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><AlertTriangle className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data</p></div>
            )}
          </CardContent>
        </Card>

        {/* CTO: Status Breakdown — Stacked Bar */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
              <Layers className="w-4 h-4 text-muted-foreground" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-3"><Skeleton className="h-3 rounded-full" /><Skeleton className="h-4 w-full" /></div>
            ) : statusDetails.length > 0 ? (
              <div className="space-y-3">
                {/* Stacked Bar */}
                <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
                  {statusDetails.map((sd) => {
                    const pct = statusTotalVolume > 0 ? (sd.totalVolume / statusTotalVolume) * 100 : 0;
                    if (pct < 0.5) return null;
                    return (
                      <div
                        key={sd.status}
                        className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[sd.status] || '#9ca3af' }}
                        title={`${sd.status}: ${formatCompactCurrency(sd.totalVolume)}`}
                      />
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {statusDetails.map((sd) => (
                    <div key={sd.status} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[sd.status] || '#9ca3af' }} />
                      <span className="text-[10px] text-muted-foreground capitalize">{sd.status}</span>
                      <span className="text-[10px] font-medium">{sd.count}</span>
                    </div>
                  ))}
                </div>
                {/* Total Volume */}
                <div className="pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">Total Volume</span>
                    <span className="text-xs font-medium">{formatCompactCurrency(statusTotalVolume)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><Layers className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data</p></div>
            )}
          </CardContent>
        </Card>

        {/* CTO: Marketplace Performance */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                Marketplace Performance
              </CardTitle>
              <Badge variant="outline" className="text-[9px] text-muted-foreground">30 hari</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
            ) : analytics?.marketplaceAnalysis && analytics.marketplaceAnalysis.length > 0 ? (
              <div className="space-y-2.5">
                {analytics.marketplaceAnalysis.slice(0, 5).map((mp, i) => {
                  const maxFee = Math.max(...analytics.marketplaceAnalysis.slice(0, 5).map(m => m.totalFee), 1);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate">{mp.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-[10px] text-muted-foreground">{mp.transactionCount} tx</span>
                            <span className="text-[10px] font-medium">{mp.feePercent.toFixed(1)}%</span>
                          </div>
                        </div>
                        <ProgressBar value={mp.totalFee} max={maxFee} color="bg-violet-400" className="!h-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><ShoppingBag className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data</p></div>
            )}
          </CardContent>
        </Card>

        {/* CTO: Peak Hours & System Health */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
              <Zap className="w-4 h-4 text-muted-foreground" />
              Peak Hours & Health
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
            ) : analytics?.peakHours && analytics.peakHours.length > 0 ? (
              <div className="space-y-3">
                {/* System Health */}
                <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                  <Shield className={cn('w-7 h-7', successRate > 80 ? 'text-emerald-500' : successRate > 50 ? 'text-yellow-500' : 'text-red-500')} />
                  <div>
                    <p className="text-xs font-medium">Success Rate</p>
                    <p className="text-[9px] text-muted-foreground">{stats?.totalTransactions || 0} transaksi · {successRate.toFixed(1)}% berhasil</p>
                  </div>
                  <p className={cn('ml-auto text-lg font-semibold', successRate > 80 ? 'text-emerald-600' : 'text-yellow-600')}>{successRate.toFixed(0)}%</p>
                </div>
                {/* Peak Hours */}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-2 font-medium">Jam Terpadat (30 hari)</p>
                  <div className="flex gap-1">
                    {analytics.peakHours.slice(0, 5).map((ph, i) => (
                      <div key={i} className="flex-1 bg-muted/40 rounded-lg p-2 text-center">
                        <p className="text-[10px] font-medium">{ph.hour.toString().padStart(2, '0')}:00</p>
                        <p className="text-[9px] text-muted-foreground">{ph.count} tx</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><Zap className="w-8 h-8 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Belum ada data</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION 6: TRANSACTIONS + MESSAGES
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Transaksi Terbaru */}
        <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up overflow-hidden">
          <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 tracking-tight">
                <CircleDot className="w-4 h-4 text-muted-foreground" />
                Transaksi Terbaru
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-7 text-[10px] text-muted-foreground hover:text-foreground">
                <Link href="/owner/dashboard/transactions">Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-5 pb-4">
            {dataLoading ? (
              <div className="space-y-1.5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : data?.recentTransactions?.length ? (
              <ScrollArea className="max-h-[200px] sm:max-h-[320px]">
                <div className="space-y-0.5">
                  {data.recentTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="group flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className={cn('w-1 h-8 sm:h-10 rounded-full flex-shrink-0',
                        tx.status === 'success' ? 'bg-emerald-500' : tx.status === 'pending' ? 'bg-orange-500' : tx.status === 'verification' ? 'bg-yellow-500' : tx.status === 'process' ? 'bg-blue-500' : 'bg-red-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground">{tx.orderId}</span>
                          <StatusBadge status={tx.status} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-medium truncate">{tx.customer.name}</span>
                          {tx.partner && <span className="text-[10px] text-muted-foreground hidden sm:inline">via {tx.partner.name}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
                        <p className="text-xs font-medium">{formatCurrency(tx.nominal)}</p>
                        <p className="text-[9px] text-muted-foreground">{formatDateAgo(tx.createdAt)}</p>
                      </div>
                      {tx.status !== 'success' && tx.status !== 'failed' && (
                        <div className="hidden sm:flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {tx.status === 'pending' && (
                            <button onClick={() => updateTransactionStatus(tx.id, 'process')} disabled={updatingStatus === tx.id}
                              className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50">
                              {updatingStatus === tx.id ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <ArrowUpRight className="w-3 h-3 text-white" />}
                            </button>
                          )}
                          {tx.status === 'verification' && (<>
                            <button onClick={() => updateTransactionStatus(tx.id, 'success')} disabled={updatingStatus === tx.id}
                              className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50">
                              {updatingStatus === tx.id ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <CheckCircle className="w-3 h-3 text-white" />}
                            </button>
                            <button onClick={() => updateTransactionStatus(tx.id, 'failed')} disabled={updatingStatus === tx.id}
                              className="w-7 h-7 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors disabled:opacity-50">
                              <XCircle className="w-3 h-3 text-white" />
                            </button>
                          </>)}
                          {tx.status === 'process' && (
                            <button onClick={() => updateTransactionStatus(tx.id, 'verification')} disabled={updatingStatus === tx.id}
                              className="w-7 h-7 rounded-lg bg-violet-500 hover:bg-violet-600 flex items-center justify-center transition-colors disabled:opacity-50">
                              {updatingStatus === tx.id ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <AlertCircle className="w-3 h-3 text-white" />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-10 text-muted-foreground"><Wallet className="w-8 h-8 mx-auto mb-2 opacity-15" /><p className="text-xs">Belum ada transaksi</p></div>
            )}
          </CardContent>
        </Card>

        {/* Pesan Partner + Notifications */}
        <div className="flex flex-col gap-4">
          <Card className={cn('rounded-2xl border border-border/50 shadow-sm animate-slide-up overflow-hidden', (data?.unreadPartnerMessages || 0) > 0 ? 'border-amber-300/50 dark:border-amber-700/50' : '')}>
            <CardHeader className="pb-2 px-3.5 sm:px-5 pt-3 sm:pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className={cn('w-4 h-4', (data?.unreadPartnerMessages || 0) > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
                  <CardTitle className="text-sm font-medium">Pesan Partner</CardTitle>
                  {(data?.unreadPartnerMessages || 0) > 0 && <Badge className="bg-amber-500 text-white text-[9px]">{data?.unreadPartnerMessages} baru</Badge>}
                </div>
                <Button variant="ghost" size="sm" asChild className="h-7 text-[10px] text-muted-foreground hover:text-foreground">
                  <Link href="/owner/dashboard/notifications">Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-5 pb-4">
              {dataLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
              ) : (data?.partnerMessages?.length || 0) > 0 ? (
                <ScrollArea className="max-h-[130px] sm:max-h-40">
                  <div className="space-y-1 pr-1">
                    {data.partnerMessages.slice(0, 4).map((msg) => (
                      <div key={msg.id} className={cn('p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer',
                        !msg.isRead ? 'bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30' : 'bg-muted/30 border border-transparent hover:bg-muted/40'
                      )} onClick={() => { if (msg.transactionId) router.push(`/owner/dashboard/transactions?highlight=${msg.transactionId}`); }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className={cn('text-xs font-medium truncate', !msg.isRead ? 'text-amber-700 dark:text-amber-300' : '')}>{msg.title}</p>
                              {!msg.isRead && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{msg.message}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {msg.data?.nominal && <span className="text-[10px] font-medium">{formatCurrency(msg.data.nominal)}</span>}
                            <span className="text-[9px] text-muted-foreground">{formatDateAgo(msg.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (data?.partnerNotifications?.length || 0) > 0 ? (
                <ScrollArea className="max-h-[130px] sm:max-h-40">
                  <div className="space-y-1 pr-1">
                    {data.partnerNotifications.slice(0, 4).map((notif) => (
                      <div key={notif.id} className="p-2 rounded-xl bg-muted/30 border border-transparent">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{notif.partnerName || 'Partner'}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{notif.notes?.split('\n').pop()?.replace(/\[.*?\]\s*/, '') || ''}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <span className="text-[10px] font-medium">{formatCurrency(notif.nominal)}</span>
                            <span className="text-[9px] text-muted-foreground">{formatDateAgo(notif.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-6 text-muted-foreground"><MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-15" /><p className="text-[10px]">Tidak ada pesan baru</p></div>
              )}
            </CardContent>
          </Card>

          {/* Week Summary */}
          <Card className="rounded-2xl border border-border/50 shadow-sm animate-slide-up bg-muted/20">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] text-muted-foreground font-medium mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3 h-3" /> Minggu Ini
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs sm:text-sm font-semibold">{formatCompactCurrency(stats?.weekProfit || 0)}</p>
                  <p className="text-[9px] text-muted-foreground">Profit</p>
                </div>
                <div className="text-center border-x border-border/40">
                  <p className="text-xs sm:text-sm font-semibold">{formatCompactCurrency(stats?.weekVolume || 0)}</p>
                  <p className="text-[9px] text-muted-foreground">Volume</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm font-semibold">{stats?.weekCount || 0}</p>
                  <p className="text-[9px] text-muted-foreground">Transaksi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION 7: QUICK ACTIONS
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-slide-up">
        {[
          { label: 'Transaksi', icon: Wallet, href: '/owner/dashboard/transactions', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Partner', icon: Users, href: '/owner/dashboard/partners', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
          { label: 'Pelanggan', icon: UserPlus, href: '/owner/dashboard/customers', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Broadcast', icon: Radio, href: '/owner/dashboard/broadcast', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Fee & Tarif', icon: Tag, href: '/owner/dashboard/fees', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' },
          { label: 'Settings', icon: Settings, href: '/owner/dashboard/settings', color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800/50' },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <Card className="rounded-2xl border border-border/50 shadow-sm hover:bg-muted/50 transition-colors cursor-pointer group h-full">
              <CardContent className="p-2 sm:p-3 flex flex-col items-center gap-1.5 justify-center">
                <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105', action.bg)}>
                  <action.icon className={cn('w-3.5 h-3.5 sm:w-4.5 sm:h-4.5', action.color)} />
                </div>
                <span className="text-[9px] sm:text-[10px] font-medium text-center">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <p className="text-center text-[10px] text-muted-foreground/30 pb-1">
          Data diperbarui {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · Auto-refresh setiap 1 menit
        </p>
      )}
    </div>
  );
}
