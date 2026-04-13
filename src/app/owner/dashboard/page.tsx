'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trophy,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
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
  CreditCard,
  Percent,
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
  announcements: Array<{ id: string; title: string; description: string }>;
  promos: Array<{ id: string; title: string; link: string }>;
  partnerNotifications: PartnerNotification[];
  partnerMessages: PartnerMessage[];
  unreadPartnerMessages: number;
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const redirectAttempted = useRef(false);

  // Recent testimonials state
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
    }
  }, [isAuthenticated, hasHydrated, user]);

  // Fetch unread notifications count
  const fetchUnreadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=1');

      if (!response.ok) {
        console.error('Notifications API error:', response.status);
        return;
      }

      const notifResult = await response.json();

      // Only count actual unread notifications
      let totalCount = 0;
      if (notifResult.success) {
        totalCount = notifResult.data.unreadCount || 0;
      }

      setUnreadNotifications(totalCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Fetch recent testimonials (owner sees all, including pending)
  const fetchRecentTestimonials = async () => {
    setTestimonialsLoading(true);
    try {
      const response = await fetch('/api/testimonials?limit=10');
      const result = await response.json();
      if (result.success && result.data) {
        setRecentTestimonials(Array.isArray(result.data) ? result.data : []);
      }
    } catch {
      // Non-critical
    } finally {
      setTestimonialsLoading(false);
    }
  };

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
        fetchUnreadNotifications();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, hasHydrated, user, transactionsPage]);

  // Custom event for notification count refresh
  useEffect(() => {
    const handleNotificationUpdate = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'owner') {
        fetchUnreadNotifications();
      }
    };
    window.addEventListener('notification-count-update', handleNotificationUpdate);
    return () => window.removeEventListener('notification-count-update', handleNotificationUpdate);
  }, [isAuthenticated, hasHydrated, user]);

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
    <div className="container mx-auto px-4 py-4 space-y-4 pb-24 md:pb-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Header — flat white card with greeting + date */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h1 className="text-lg sm:text-xl font-semibold mt-0.5 truncate">
                {greeting.text}, {user?.name?.split(' ')[0]}
              </h1>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fetchDashboard(transactionsPage)}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              </Button>
              <Link href="/owner/dashboard/notifications" className="relative">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Bell className="w-4 h-4" />
                </Button>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards — clean 2×2 mobile, 4-col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Profit Bulan Ini"
          value={formatCurrency(stats?.thisMonthProfit || 0)}
          change={stats?.profitChange}
          icon={DollarSign}
          subtitle="vs bulan lalu"
          loading={dataLoading}
        />
        <KPICard
          title="Volume Bulan Ini"
          value={formatCurrency(stats?.thisMonthVolume || 0)}
          change={stats?.volumeChange}
          icon={TrendingUp}
          subtitle="vs bulan lalu"
          loading={dataLoading}
        />
        <KPICard
          title="Conversion Rate"
          value={`${(stats?.conversionRate || 0).toFixed(1)}%`}
          icon={Percent}
          subtitle="success / total"
          loading={dataLoading}
          isNeutral
        />
        <KPICard
          title="Avg Transaction"
          value={formatCurrency(stats?.avgTransactionValue || 0)}
          icon={CreditCard}
          subtitle="nilai rata-rata"
          loading={dataLoading}
          isNeutral
        />
      </div>

      {/* Urgent Tasks — inline alert bar */}
      {(stats?.pendingCount || stats?.verificationCount || stats?.processCount) ? (
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/60">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm text-amber-800 dark:text-amber-200 min-w-0">
            <span className="font-medium flex-shrink-0">Tugas mendesak:</span>
            {(stats?.pendingCount || 0) > 0 && (
              <Link
                href="/owner/dashboard/transactions?status=pending"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
              >
                <Clock className="w-3 h-3" />
                {stats.pendingCount} pending
              </Link>
            )}
            {(stats?.verificationCount || 0) > 0 && (
              <Link
                href="/owner/dashboard/transactions?status=verification"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
              >
                <AlertCircle className="w-3 h-3" />
                {stats.verificationCount} verifikasi
              </Link>
            )}
            {(stats?.processCount || 0) > 0 && (
              <Link
                href="/owner/dashboard/transactions?status=process"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
              >
                <Loader2 className="w-3 h-3" />
                {stats.processCount} proses
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {/* Partner Notifications — compact list, max 5 */}
      <Card>
        <CardHeader className="pb-2 px-4 sm:px-5 pt-4 sm:pt-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Notifikasi Partner
              {(data?.unreadPartnerMessages || 0) > 0 && (
                <Badge variant="secondary" className="text-xs">{data.unreadPartnerMessages} baru</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link href="/owner/dashboard/notifications">
                Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
          {(data?.partnerMessages?.length || 0) > 0 ? (
            <div className="divide-y divide-border">
              {data.partnerMessages.slice(0, 5).map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/50 -mx-1 px-1 rounded transition-colors"
                  onClick={() => {
                    if (msg.transactionId) {
                      router.push(`/owner/dashboard/transactions?highlight=${msg.transactionId}`);
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{msg.title}</p>
                      {!msg.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDateAgo(msg.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (data?.partnerNotifications?.length || 0) > 0 ? (
            <div className="divide-y divide-border">
              {data.partnerNotifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{n.partnerName || 'Partner'}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {n.notes?.split('\n').pop()?.replace(/\[.*?\]\s*/, '') || 'Tidak ada pesan'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDateAgo(n.updatedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada notifikasi baru</p>
          )}
        </CardContent>
      </Card>

      {/* Volume 7 Hari Chart */}
      <Card>
        <CardHeader className="pb-2 px-4 sm:px-5 pt-4 sm:pt-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Volume 7 Hari
              </CardTitle>
              {data?.last7DaysData && (
                <CardDescription className="text-xs mt-0.5">
                  Total {formatCompactCurrency(data.last7DaysData.reduce((s, d) => s + d.volume, 0))} &bull; {data.last7DaysData.reduce((s, d) => s + d.count, 0)} trx
                </CardDescription>
              )}
            </div>
            {stats?.dailyGrowth !== undefined && (
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                stats.dailyGrowth >= 0
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}>
                {stats.dailyGrowth >= 0
                  ? <ArrowUpRight className="w-3 h-3" />
                  : <ArrowDownRight className="w-3 h-3" />
                }
                {Math.abs(stats.dailyGrowth).toFixed(1)}%
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
          {dataLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : data?.last7DaysData && data.last7DaysData.length > 0 && data.last7DaysData.some(d => d.volume > 0) ? (
            <ResponsiveContainer width="100%" height={160} className="sm:!h-[180px]">
              <AreaChart data={data?.last7DaysData || []}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                <XAxis
                  dataKey="dayName"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickFormatter={(v) => {
                    if (v >= 1000000000) return `${(v / 1000000000).toFixed(0)}M`;
                    if (v >= 1000000) return `${(v / 1000000).toFixed(0)}jt`;
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`;
                    return v.toString();
                  }}
                  width={40}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                  name="Volume"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Belum ada transaksi 7 hari terakhir</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions — compact list */}
      <Card>
        <CardHeader className="pb-2 px-4 sm:px-5 pt-4 sm:pt-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              Transaksi Terbaru
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link href="/owner/dashboard/transactions">
                Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
          {dataLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </div>
          ) : data?.recentTransactions?.length ? (
            <>
              <div className="divide-y divide-border">
                {data.recentTransactions.map((tx) => {
                  const statusColor: Record<string, string> = {
                    pending: 'bg-amber-400',
                    verification: 'bg-violet-500',
                    process: 'bg-blue-500',
                    success: 'bg-emerald-500',
                    failed: 'bg-red-500',
                  };
                  const dotColor = statusColor[tx.status] || statusColor.pending;

                  return (
                    <div
                      key={tx.id}
                      className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      {/* Status dot */}
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dotColor)} />

                      {/* Main info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-medium truncate">{tx.customer.name}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">—</span>
                          <p className="text-sm font-semibold text-primary truncate">{formatCurrency(tx.nominal)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {tx.paymentType.name}
                          {tx.partner && <span> &bull; {tx.partner.name}</span>}
                          <span> &bull; {formatDateAgo(tx.createdAt)}</span>
                        </p>
                      </div>

                      {/* Quick status actions */}
                      {tx.status !== 'success' && tx.status !== 'failed' && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {tx.status === 'pending' && (
                            <button
                              onClick={() => updateTransactionStatus(tx.id, 'process')}
                              disabled={updatingStatus === tx.id}
                              className="w-7 h-7 rounded-md bg-muted hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex items-center justify-center transition-colors disabled:opacity-50"
                              title="Proses"
                            >
                              {updatingStatus === tx.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                : <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                              }
                            </button>
                          )}
                          {tx.status === 'verification' && (
                            <>
                              <button
                                onClick={() => updateTransactionStatus(tx.id, 'success')}
                                disabled={updatingStatus === tx.id}
                                className="w-7 h-7 rounded-md bg-muted hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex items-center justify-center transition-colors disabled:opacity-50"
                                title="Success"
                              >
                                {updatingStatus === tx.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                  : <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                }
                              </button>
                              <button
                                onClick={() => updateTransactionStatus(tx.id, 'failed')}
                                disabled={updatingStatus === tx.id}
                                className="w-7 h-7 rounded-md bg-muted hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors disabled:opacity-50"
                                title="Failed"
                              >
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </>
                          )}
                          {tx.status === 'process' && (
                            <button
                              onClick={() => updateTransactionStatus(tx.id, 'verification')}
                              disabled={updatingStatus === tx.id}
                              className="w-7 h-7 rounded-md bg-muted hover:bg-violet-100 dark:hover:bg-violet-900/30 flex items-center justify-center transition-colors disabled:opacity-50"
                              title="Verifikasi"
                            >
                              {updatingStatus === tx.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                : <AlertCircle className="w-3.5 h-3.5 text-violet-600" />
                              }
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {data.transactionsPagination && data.transactionsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Halaman {data.transactionsPagination.currentPage} dari {data.transactionsPagination.totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToTransactionsPage(transactionsPage - 1)}
                      disabled={transactionsPage === 1 || dataLoading}
                      className="h-7 px-2 text-xs"
                    >
                      <ChevronLeft className="w-3 h-3 mr-0.5" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToTransactionsPage(transactionsPage + 1)}
                      disabled={transactionsPage === data.transactionsPagination.totalPages || dataLoading}
                      className="h-7 px-2 text-xs"
                    >
                      Next
                      <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada transaksi</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Partner — simplified, top 5 */}
      <Card>
        <CardHeader className="pb-2 px-4 sm:px-5 pt-4 sm:pt-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              Top Partner Bulan Ini
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link href="/owner/dashboard/partners">
                Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
          {dataLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </div>
          ) : data?.topPartnersThisMonth?.length ? (
            <div className="divide-y divide-border">
              {data.topPartnersThisMonth.slice(0, 5).map((partner, index) => (
                <div key={partner.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    index === 0 && 'bg-amber-400 text-white',
                    index === 1 && 'bg-gray-300 text-white',
                    index === 2 && 'bg-orange-400 text-white',
                    index > 2 && 'bg-muted text-muted-foreground',
                  )}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{partner.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(partner.profit || 0)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">{partner.tier}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  subtitle,
  loading,
  isNeutral,
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  subtitle?: string;
  loading?: boolean;
  isNeutral?: boolean;
}) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4 sm:p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{title}</span>
            </div>
            <p className="text-base sm:text-lg font-bold truncate">{value}</p>
            {change !== undefined && change !== 0 && !isNeutral && (
              <p className={cn(
                'text-xs flex items-center gap-1 mt-1',
                change >= 0 ? 'text-emerald-600' : 'text-red-600',
              )}>
                {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                {subtitle && <span className="text-muted-foreground ml-1">{subtitle}</span>}
              </p>
            )}
            {(change === undefined || change === 0) && !isNeutral && subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {isNeutral && subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Dashboard Skeleton
function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 space-y-4 pb-24 md:pb-4">
      <Skeleton className="h-16 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

// ── Local Helper Functions ──────────────────────────────────────────

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
  if (value >= 1000000000000) return `Rp ${(value / 1000000000000).toFixed(1).replace(/\.0$/, '')}T`;
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
  if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}rb`;
  return `Rp ${value}`;
}