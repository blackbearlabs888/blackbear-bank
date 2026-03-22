'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { SimplePagination } from '@/components/ui/pagination';
import {
  Plus, Search, Loader2, ChevronRight, ArrowUp, ArrowDown, Target,
  Percent, AlertCircle, X, Check, User, Clock, Hash, Trash2, Edit3,
  Calculator, TrendingUp, TrendingDown, Wallet, CreditCard, Info,
  CheckCircle, XCircle, ChevronLeft, ChevronRight as ChevronRightIcon,
  RefreshCw, Eye, Zap, Filter, Calendar, ArrowRightLeft, Sparkles,
  Store, DollarSign, PiggyBank, Building2, ArrowRight, MinusCircle, Copy,
  BarChart3, PieChart, LineChart, Activity, Layers, Users,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AnalyticsData {
  forecast: {
    currentMonthProfit: number;
    currentMonthVolume: number;
    avgDailyProfit: number;
    avgDailyVolume: number;
    projectedProfit: number;
    projectedVolume: number;
    daysRemaining: number;
    profitChange: number;
    volumeChange: number;
    lastMonthProfit: number;
    lastMonthVolume: number;
    daysPassed: number;
    daysInMonth: number;
  };
  feeAnalysis: {
    avgPaymentFee: number;
    avgPlatformFee: number;
    avgMarginPercent: number;
    totalPaymentFee: number;
    totalPlatformFee: number;
    totalNetMargin: number;
    totalOwnerProfit: number;
    totalTransactions: number;
    totalVolume: number;
  };
  dailyTrends: Array<{ date: string; day: string; profit: number; volume: number; count: number; }>;
  statusCounts: Record<string, number>;
  statusDetails: Record<string, { count: number; volume: number; profit: number; }>;
  paymentTypes: Array<{ id: string; name: string; transactionCount: number; totalVolume: number; totalProfit: number; successRate: number; }>;
  partnerStats: Array<{ id: string; name: string; tier: string; last30DaysVolume: number; last30DaysTransactions: number; }>;
  marketplaceAnalysis: Array<{ id: string; name: string; transactionCount: number; totalVolume: number; }>;
  peakHours: Array<{ hour: number; count: number; }>;
}

interface Transaction {
  id: string;
  orderId: string;
  nominal: number;
  paymentFee: number;
  platformFee: number;
  ownerProfit: number;
  partnerProfit: number;
  totalReceived: number;
  methodTransaction: string;
  status: string;
  notes: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string; city?: string; bankName?: string; bankAccount?: string; bankHolder?: string; };
  paymentType: { id: string; name: string; };
  marketplace?: { id: string; name: string; feePercent: number; isActive?: boolean; } | null;
  partner?: { id: string; name: string; tier: string; commission?: number; } | null;
}

interface PaymentType { id: string; name: string; onlineFeePercent: number; onlineFeeFlat: number; codFeePercent: number; codFeeFlat: number; threshold: number; isActive: boolean; }
interface Partner { id: string; name: string; commission: number; tier: string; status: string; }
interface Customer { id: string; name: string; phone: string; city?: string; bankName?: string; bankAccount?: string; bankHolder?: string; totalTransactions: number; }
interface Marketplace { id: string; name: string; feePercent: number; feeFlat?: number; isActive: boolean; }

const STATUS_CONFIG = {
  pending: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock, iconColor: 'text-orange-600', gradient: 'from-orange-500 to-amber-600' },
  verification: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle, iconColor: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
  process: { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Loader2, iconColor: 'text-cyan-600', gradient: 'from-cyan-500 to-teal-600' },
  success: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: ArrowUp, iconColor: 'text-green-600', gradient: 'from-green-500 to-emerald-600' },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: ArrowDown, iconColor: 'text-red-600', gradient: 'from-red-500 to-rose-600' },
};

export default function OwnerTransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [mainTab, setMainTab] = useState<'transactions' | 'analytics'>('transactions');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newTxOpen, setNewTxOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { if (!hasHydrated) hydrate(); }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading) {
      if (!isAuthenticated) router.replace('/login');
      else if (user?.role !== 'owner') router.replace('/partner/dashboard');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchTransactions();
      fetchAnalytics();
    }
  }, [isAuthenticated, hasHydrated, user, activeTab, currentPage]);

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => {
        fetchTransactions(true);
        fetchAnalytics();
      }, 60000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, hasHydrated, user, activeTab, currentPage]);
  
  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const fetchTransactions = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.append('days', '30');
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      if (activeTab !== 'all') params.append('status', activeTab);
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalItems(data.pagination.totalItems);
        }
        setLastUpdated(new Date());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setIsRefreshing(false); }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/transactions/analytics');
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch (e) { console.error(e); }
    finally { setAnalyticsLoading(false); }
  };

  const updateStatus = async (id: string, status: string, notes?: string, marketplaceId?: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, marketplaceId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status diubah ke ${status}`);
        fetchTransactions();
        fetchAnalytics();
        setDetailOpen(false);
        setSelectedTransaction(null);
      } else toast.error(data.error || 'Gagal');
    } catch (e) { toast.error('Gagal'); }
    finally { setUpdatingStatus(false); }
  };

  const deleteTx = async (id: string) => {
    if (!confirm('Yakin hapus transaksi ini?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Terhapus');
        fetchTransactions();
        fetchAnalytics();
        setDetailOpen(false);
      } else toast.error(data.error || 'Gagal');
    } catch (e) { toast.error('Gagal'); }
  };

  const filtered = useMemo(() => transactions.filter(tx => {
    const q = searchQuery.toLowerCase();
    return tx.orderId?.toLowerCase().includes(q) || tx.customer?.name?.toLowerCase().includes(q) || tx.customer?.phone?.includes(q);
  }), [transactions, searchQuery]);

  if (isLoading || !hasHydrated) return <LoadingState />;
  if (!isAuthenticated || user?.role !== 'owner') return null;

  return (
    <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3 pb-20 md:pb-4">
      {/* Header with Last Updated */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span className="truncate">Transaksi</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Kelola semua transaksi</p>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {isRefreshing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : formatTimeAgo(lastUpdated)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Button
            onClick={() => { fetchTransactions(); fetchAnalytics(); }}
            size="sm"
            variant="outline"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button onClick={() => setNewTxOpen(true)} size="sm" className="gradient-primary text-white rounded-lg h-8 sm:h-9 px-2.5 sm:px-3 shadow-md">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" /> 
            <span className="hidden sm:inline">Baru</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs: Transaksi & Analytics */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setMainTab('transactions')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium transition-all",
            mainTab === 'transactions' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Wallet className="w-4 h-4" />
          Transaksi
        </button>
        <button
          onClick={() => setMainTab('analytics')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium transition-all",
            mainTab === 'analytics' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      {mainTab === 'transactions' ? (
        <div className="space-y-3">
          {/* Status Filter Pills */}
          <div className="overflow-x-auto -mx-3 px-3 scrollbar-hide">
            <div className="flex gap-1.5 min-w-max pb-1">
              {[
                { value: 'all', label: 'Semua' },
                { value: 'pending', label: 'Pending', count: analytics?.statusCounts.pending, color: 'orange' },
                { value: 'verification', label: 'Verif', count: analytics?.statusCounts.verification, color: 'blue' },
                { value: 'process', label: 'Proses', count: analytics?.statusCounts.process, color: 'cyan' },
                { value: 'success', label: 'Sukses', count: analytics?.statusCounts.success, color: 'green' },
                { value: 'failed', label: 'Gagal', count: analytics?.statusCounts.failed, color: 'red' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap",
                    activeTab === tab.value 
                      ? cn(
                          tab.color === 'orange' && "bg-orange-500 text-white shadow-sm",
                          tab.color === 'blue' && "bg-blue-500 text-white shadow-sm",
                          tab.color === 'cyan' && "bg-cyan-500 text-white shadow-sm",
                          tab.color === 'green' && "bg-green-500 text-white shadow-sm",
                          tab.color === 'red' && "bg-red-500 text-white shadow-sm",
                          !tab.color && "bg-primary text-primary-foreground shadow-sm"
                        )
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn("ml-1", activeTab === tab.value ? "opacity-80" : "opacity-60")}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            <Input
              placeholder="Cari order ID, nama, no. WA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 h-9 sm:h-10 rounded-xl text-sm"
            />
          </div>

          {/* Transaction List */}
          <div className="space-y-2">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 sm:h-20 rounded-xl" />)
            ) : filtered.length > 0 ? (
              filtered.map(tx => (
                <TxCard key={tx.id} tx={tx} onClick={() => { setSelectedTransaction(tx); setDetailOpen(true); }} />
              ))
            ) : (
              <div className="text-center py-12">
                <Wallet className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-xs sm:text-sm text-muted-foreground">Tidak ada transaksi</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <SimplePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      ) : (
        <ModernAnalyticsDashboard analytics={analytics} loading={analyticsLoading} />
      )}

      {/* Dialogs */}
      <NewTxDialog open={newTxOpen} onOpenChange={setNewTxOpen} onCreated={() => { fetchTransactions(); fetchAnalytics(); }} />
      <TxDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        tx={selectedTransaction}
        onUpdate={updateStatus}
        onDelete={deleteTx}
        updating={updatingStatus}
      />
    </div>
  );
}

// Modern Analytics Dashboard Component
function ModernAnalyticsDashboard({ analytics, loading }: { analytics: AnalyticsData | null; loading: boolean }) {
  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  
  // Prepare data for charts
  const statusChartData = analytics ? [
    { name: 'Berhasil', value: analytics.statusCounts.success, color: '#22c55e' },
    { name: 'Proses', value: analytics.statusCounts.process, color: '#3b82f6' },
    { name: 'Verifikasi', value: analytics.statusCounts.verification, color: '#8b5cf6' },
    { name: 'Pending', value: analytics.statusCounts.pending, color: '#f59e0b' },
    { name: 'Gagal', value: analytics.statusCounts.failed, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const paymentTypePieData = analytics?.paymentTypes.slice(0, 6).map((pt, i) => ({
    name: pt.name,
    value: pt.transactionCount,
    volume: pt.totalVolume,
    fill: COLORS[i % COLORS.length],
  })) || [];

  if (loading) {
    return (
      <div className="space-y-2 sm:space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 sm:h-24 rounded-lg sm:rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
          <Skeleton className="h-48 sm:h-64 rounded-lg sm:rounded-xl" />
          <Skeleton className="h-48 sm:h-64 rounded-lg sm:rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        <ModernKPICard
          title="Proyeksi Profit"
          value={analytics?.forecast.projectedProfit || 0}
          subtitle={`Sisa ${analytics?.forecast.daysRemaining} hari`}
          change={analytics?.forecast.profitChange}
          icon={<Target className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="emerald"
        />
        <ModernKPICard
          title="Profit Bulan Ini"
          value={analytics?.forecast.currentMonthProfit || 0}
          subtitle={`${analytics?.forecast.daysPassed}/${analytics?.forecast.daysInMonth} hari`}
          icon={<TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="blue"
        />
        <ModernKPICard
          title="Volume Bulan Ini"
          value={analytics?.forecast.currentMonthVolume || 0}
          subtitle={`${analytics?.feeAnalysis.totalTransactions} transaksi`}
          icon={<Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="amber"
        />
        <ModernKPICard
          title="Net Margin"
          value={`${(analytics?.feeAnalysis.avgMarginPercent || 0).toFixed(2)}%`}
          subtitle="Rata-rata margin"
          icon={<Percent className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="purple"
          isPercent
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        {/* Profit Trend Chart */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Tren 7 Hari Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            {analytics && analytics.dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={160} className="sm:h-[200px]">
                <AreaChart data={analytics.dailyTrends}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} width={35} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontSize: 11 }}
                    contentStyle={{ fontSize: 10, borderRadius: 6 }}
                  />
                  <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name="Profit" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] sm:h-[200px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Distribusi Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            {statusChartData.length > 0 ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <ResponsiveContainer width="45%" height={140} className="sm:h-[180px]">
                  <RePieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} trx`} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1 sm:space-y-1.5">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[140px] sm:h-[180px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Types & Volume Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        {/* Payment Type Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Payment Type (30 Hari)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            {paymentTypePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140} className="sm:h-[180px]">
                <BarChart data={paymentTypePieData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} stroke="#9ca3af" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} stroke="#9ca3af" width={55} />
                  <Tooltip formatter={(value: number) => `${value} trx`} contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {paymentTypePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[140px] sm:h-[180px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Ringkasan Fee
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg sm:rounded-xl">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Total Payment Fee</p>
                <p className="text-xs sm:text-sm font-bold text-green-600 truncate">{formatCurrency(analytics?.feeAnalysis.totalPaymentFee || 0)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg sm:rounded-xl">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Total Platform Fee</p>
                <p className="text-xs sm:text-sm font-bold text-orange-600 truncate">{formatCurrency(analytics?.feeAnalysis.totalPlatformFee || 0)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg sm:rounded-xl">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Net Margin</p>
                <p className="text-xs sm:text-sm font-bold text-blue-600 truncate">{formatCurrency(analytics?.feeAnalysis.totalNetMargin || 0)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg sm:rounded-xl">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Total Profit</p>
                <p className="text-xs sm:text-sm font-bold text-purple-600 truncate">{formatCurrency(analytics?.feeAnalysis.totalOwnerProfit || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Required Row */}
      {(analytics?.statusCounts.pending || 0) > 0 || (analytics?.statusCounts.verification || 0) > 0 ? (
        <Card className="glass-card border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium">Perlu Tindakan</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {(analytics?.statusCounts.pending || 0) > 0 && `${analytics?.statusCounts.pending} pending`}
                    {(analytics?.statusCounts.pending || 0) > 0 && (analytics?.statusCounts.verification || 0) > 0 && ' • '}
                    {(analytics?.statusCounts.verification || 0) > 0 && `${analytics?.statusCounts.verification} verifikasi`}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                {(analytics?.statusCounts.pending || 0) > 0 && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-[9px] sm:text-[10px] px-1.5 sm:px-2">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    {analytics?.statusCounts.pending}
                  </Badge>
                )}
                {(analytics?.statusCounts.verification || 0) > 0 && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[9px] sm:text-[10px] px-1.5 sm:px-2">
                    <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    {analytics?.statusCounts.verification}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// Modern KPI Card Component
function ModernKPICard({ title, value, subtitle, change, icon, color, isPercent }: {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: number;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
  isPercent?: boolean;
}) {
  const colorClasses = {
    emerald: 'from-emerald-500 to-teal-600',
    blue: 'from-blue-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-violet-600',
  };

  const bgColorClasses = {
    emerald: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
    blue: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
    amber: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    purple: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
  };

  const textColorClasses = {
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
  };

  return (
    <Card className={cn("glass-card overflow-hidden", bgColorClasses[color])}>
      <div className={cn("h-0.5 sm:h-1 bg-gradient-to-r", colorClasses[color])} />
      <CardContent className="p-2 sm:p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{title}</p>
            <p className={cn("text-sm sm:text-lg font-bold truncate", textColorClasses[color])}>
              {isPercent ? value : formatCurrency(value as number)}
            </p>
            {subtitle && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{subtitle}</p>
            )}
            {change !== undefined && (
              <div className={cn("flex items-center gap-0.5 text-[9px] sm:text-[10px]", change >= 0 ? 'text-green-600' : 'text-red-600')}>
                {change >= 0 ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className={cn("w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Stat Card Component
function StatCard({ title, value, change, isPercent, isCount, loading, icon, gradient, highlight }: {
  title: string;
  value: number | string;
  change?: number;
  isPercent?: boolean;
  isCount?: boolean;
  loading?: boolean;
  icon: React.ReactNode;
  gradient: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn("glass-card overflow-hidden", highlight && "ring-2 ring-amber-400/50")}>
      <div className={cn("h-0.5 bg-gradient-to-r", gradient)} />
      <CardContent className="p-2.5">
        {loading ? (
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">{title}</p>
            <div className="flex items-end justify-between">
              <p className="text-sm sm:text-base font-bold">
                {isCount ? value : isPercent ? value : formatCurrency(value as number)}
              </p>
              <div className={cn("w-6 h-6 rounded bg-gradient-to-br flex items-center justify-center text-white", gradient)}>
                {icon}
              </div>
            </div>
            {change !== undefined && (
              <div className={cn("text-[10px] flex items-center gap-0.5", change >= 0 ? 'text-green-600' : 'text-red-600')}>
                {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Transaction Card
function TxCard({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Card className="glass-card overflow-hidden active-scale cursor-pointer hover:shadow-md transition-all tap-highlight" onClick={onClick}>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 p-2 sm:gap-2.5 sm:p-2.5">
          <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-gradient-to-br flex-shrink-0", config.gradient)}>
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5 text-white", tx.status === 'process' && "animate-spin")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="font-mono text-[9px] sm:text-[10px] text-muted-foreground truncate">{tx.orderId}</p>
              <Badge className={cn("text-[8px] sm:text-[9px] capitalize px-1.5 sm:px-2", config.color)}>{tx.status}</Badge>
            </div>
            <p className="text-[11px] sm:text-xs font-medium truncate">{tx.customer?.name}</p>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{tx.paymentType?.name} • {tx.methodTransaction}</p>
              <p className="text-[10px] sm:text-xs font-bold text-primary flex-shrink-0">+{formatCurrency(tx.ownerProfit)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-2 sm:px-2.5 py-1.5 bg-muted/30 border-t text-[9px] sm:text-[10px]">
          <span className="text-muted-foreground truncate">{formatCurrency(tx.nominal)} • {formatDate(tx.createdAt)}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {tx.marketplace && (
              <Badge variant="outline" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1 flex items-center gap-0.5">
                <Store className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                <span className="truncate max-w-[50px] sm:max-w-none">{tx.marketplace.name}</span>
              </Badge>
            )}
            {tx.partner && <Badge variant="secondary" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1 truncate max-w-[50px] sm:max-w-none">{tx.partner.name}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="container mx-auto px-3 py-4 space-y-3 pb-20">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <Skeleton className="h-10 rounded-lg" />
      <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
    </div>
  );
}

// New Transaction Dialog
function NewTxDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchCust, setSearchCust] = useState('');
  const [searchPartner, setSearchPartner] = useState('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isNewCust, setIsNewCust] = useState(false);
  const [showPartner, setShowPartner] = useState(false);

  const [form, setForm] = useState({
    customerId: '', customerName: '', customerPhone: '', customerCity: '',
    customerBankName: '', customerBankAccount: '', customerBankHolder: '',
    nominal: '', paymentTypeId: '', methodTransaction: 'Online', marketplaceId: '', partnerId: '',
  });

  // Real-time calculation
  const calc = useMemo(() => {
    const nominal = parseFloat(form.nominal) || 0;
    if (!nominal || !form.paymentTypeId) return null;
    const pt = paymentTypes.find(p => p.id === form.paymentTypeId);
    if (!pt) return null;

    // Get fee values with safety checks
    // Fee percent should be between 0-100, if higher it might be stored incorrectly
    let feePercent = form.methodTransaction === 'Online' ? pt.onlineFeePercent : pt.codFeePercent;
    const feeFlat = form.methodTransaction === 'Online' ? pt.onlineFeeFlat : pt.codFeeFlat;
    
    // Safety: if feePercent > 100, it's likely stored incorrectly (e.g., 8000 instead of 8%)
    // This can happen due to database precision issues or incorrect input
    if (feePercent > 100) {
      console.warn('[WARN] Fee percent > 100%, normalizing. Original:', feePercent);
      feePercent = feePercent / 1000; // Normalize: 8000 -> 8
    }
    
    // Debug log for production troubleshooting
    console.log('[DEBUG] Payment calculation:', {
      nominal,
      feePercent,
      feeFlat,
      threshold: pt.threshold,
      feePercentType: typeof feePercent,
      ptRaw: pt,
    });
    
    // Use threshold logic: if nominal >= threshold, use percentage; otherwise use flat fee
    let paymentFee: number;
    if (nominal >= (pt.threshold || 0)) {
      paymentFee = nominal * (feePercent / 100);
    } else {
      paymentFee = feeFlat;
    }

    let platformFee = 0;
    let selectedMp: Marketplace | null = null;
    if (form.marketplaceId && form.marketplaceId !== 'none') {
      const mp = marketplaces.find(m => m.id === form.marketplaceId);
      if (mp) {
        // Safety: ensure numeric values and normalize marketplace fee percent if > 100
        let mpFeePercent = Number(mp.feePercent) || 0;
        const mpFeeFlat = Number(mp.feeFlat) || 0;
        if (mpFeePercent > 100) {
          mpFeePercent = mpFeePercent / 1000;
        }
        platformFee = nominal * (mpFeePercent / 100) + mpFeeFlat;
        selectedMp = mp;
      }
    }

    const netMargin = paymentFee - platformFee;
    const partnerRate = selectedPartner?.commission || 0;
    const partnerProfit = netMargin * partnerRate / 100;
    const ownerProfit = netMargin - partnerProfit;
    const totalReceived = nominal - paymentFee;

    return { paymentFee, platformFee, netMargin, partnerProfit, ownerProfit, totalReceived, feePercent, selectedMp, threshold: pt.threshold };
  }, [form, paymentTypes, marketplaces, selectedPartner]);

  useEffect(() => { if (open) { fetchPT(); fetchMP(); fetchP(); } }, [open]);
  useEffect(() => { if (searchCust.length >= 2 && !isNewCust) searchC(); }, [searchCust, isNewCust]);

  const fetchPT = async () => { const res = await fetch('/api/payment-types?all=true'); const d = await res.json(); if (d.success) setPaymentTypes(d.data.filter((p: PaymentType) => p.isActive)); };
  const fetchMP = async () => { const res = await fetch('/api/marketplaces?activeOnly=true'); const d = await res.json(); if (d.success) setMarketplaces(d.data); };
  const fetchP = async () => { const res = await fetch('/api/partners'); const d = await res.json(); if (d.success) setPartners(d.data.filter((p: Partner) => p.status === 'active')); };
  const searchC = async () => { const res = await fetch(`/api/customers?search=${searchCust}`); const d = await res.json(); if (d.success) setCustomers(d.data); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Normalize marketplaceId: 'none' or '' means no marketplace
      const normalizedMarketplaceId = (form.marketplaceId && form.marketplaceId !== 'none') 
        ? form.marketplaceId 
        : null;
      
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...form, 
          nominal: parseFloat(form.nominal), 
          marketplaceId: normalizedMarketplaceId, 
          partnerId: form.partnerId || null, 
          isNewCustomer: isNewCust 
        }),
      });
      const d = await res.json();
      if (d.success) {
        onOpenChange(false);
        onCreated();
        setSelectedCust(null);
        setSelectedPartner(null);
        setIsNewCust(false);
        setShowPartner(false);
        setForm({ customerId: '', customerName: '', customerPhone: '', customerCity: '', customerBankName: '', customerBankAccount: '', customerBankHolder: '', nominal: '', paymentTypeId: '', methodTransaction: 'Online', marketplaceId: '', partnerId: '' });
        toast.success('Transaksi dibuat (Status: Process)');
      } else toast.error(d.error || 'Gagal');
    } catch (e) { toast.error('Gagal'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Transaksi Baru
          </DialogTitle>
          <DialogDescription className="text-xs">Buat transaksi dengan kalkulasi real-time</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {/* Customer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Customer</Label>
              <div className="flex gap-1">
                <Button type="button" variant={!isNewCust ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] px-2" onClick={() => { setIsNewCust(false); setSelectedCust(null); }}>Existing</Button>
                <Button type="button" variant={isNewCust ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] px-2" onClick={() => { setIsNewCust(true); setSelectedCust(null); }}>Baru</Button>
              </div>
            </div>
            {isNewCust ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Nama" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} required className="h-8 text-xs" />
                  <Input placeholder="WA" value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} required className="h-8 text-xs" />
                  <Input placeholder="Kota" value={form.customerCity} onChange={e => setForm(p => ({ ...p, customerCity: e.target.value }))} className="h-8 text-xs" />
                </div>
                {/* Bank Account Fields */}
                <div className="p-2 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Rekening (Opsional)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="Nama Bank" value={form.customerBankName} onChange={e => setForm(p => ({ ...p, customerBankName: e.target.value }))} className="h-8 text-xs" />
                    <Input placeholder="No. Rekening" value={form.customerBankAccount} onChange={e => setForm(p => ({ ...p, customerBankAccount: e.target.value }))} className="h-8 text-xs" />
                    <Input placeholder="Atas Nama" value={form.customerBankHolder} onChange={e => setForm(p => ({ ...p, customerBankHolder: e.target.value }))} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            ) : selectedCust ? (
              <div className="p-2 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{selectedCust.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedCust.phone}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setSelectedCust(null); setForm(p => ({ ...p, customerId: '' })); }}>Ganti</Button>
                </div>
                {/* Bank Account Preview */}
                {selectedCust.bankName && selectedCust.bankAccount && (
                  <div className="flex items-center gap-2 p-2 bg-background rounded-md border">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground">{selectedCust.bankName}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-mono font-medium truncate">{selectedCust.bankAccount}</p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedCust.bankAccount || '');
                            toast.success('No. rekening disalin');
                          }}
                          className="p-0.5 hover:bg-muted rounded"
                        >
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                      {selectedCust.bankHolder && (
                        <p className="text-[10px] text-muted-foreground">a.n. {selectedCust.bankHolder}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Input placeholder="Cari nama/WA..." value={searchCust} onChange={e => setSearchCust(e.target.value)} className="h-8 text-xs" />
                {customers.length > 0 && searchCust && (
                  <div className="absolute top-full left-0 right-0 bg-background border rounded-lg shadow-lg z-10 mt-1 max-h-32 overflow-y-auto">
                    {customers.map(c => (
                      <button key={c.id} type="button" className="w-full text-left p-2 hover:bg-muted text-xs" onClick={() => { setSelectedCust(c); setForm(p => ({ ...p, customerId: c.id })); setSearchCust(''); setCustomers([]); }}>
                        {c.name} <span className="text-muted-foreground">({c.phone})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Nominal & Payment */}
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px]">Nominal</Label><Input type="number" value={form.nominal} onChange={e => setForm(p => ({ ...p, nominal: e.target.value }))} required className="h-8 text-xs" /></div>
            <div><Label className="text-[10px]">Payment Type</Label><Select value={form.paymentTypeId} onValueChange={v => setForm(p => ({ ...p, paymentTypeId: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{paymentTypes.map(pt => <SelectItem key={pt.id} value={pt.id} className="text-xs">{pt.name}</SelectItem>)}</SelectContent></Select></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px]">Metode</Label><Select value={form.methodTransaction} onValueChange={v => setForm(p => ({ ...p, methodTransaction: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Online">Online</SelectItem><SelectItem value="COD">COD</SelectItem></SelectContent></Select></div>
            <div>
              <Label className="text-[10px]">Marketplace</Label>
              <Select value={form.marketplaceId} onValueChange={v => setForm(p => ({ ...p, marketplaceId: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tanpa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa</SelectItem>
                  {marketplaces.map(mp => (
                    <SelectItem key={mp.id} value={mp.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span>{mp.name}</span>
                        <Badge variant="outline" className="text-[9px] h-4">
                          {mp.feePercent}%{mp.feeFlat ? ` + ${formatCurrency(mp.feeFlat)}` : ''}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Partner */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Partner (Opsional)</Label>
            <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => { setShowPartner(!showPartner); if (showPartner) { setSelectedPartner(null); setForm(p => ({ ...p, partnerId: '' })); } }}>{showPartner ? 'Hapus' : '+ Tambah'}</Button>
          </div>
          {showPartner && (
            selectedPartner ? (
              <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <div><p className="text-xs font-medium">{selectedPartner.name}</p><p className="text-[10px] text-muted-foreground">Komisi: {selectedPartner.commission}%</p></div>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setSelectedPartner(null); setForm(p => ({ ...p, partnerId: '' })); }}>Ganti</Button>
              </div>
            ) : (
              <div className="relative">
                <Input placeholder="Cari partner..." value={searchPartner} onChange={e => setSearchPartner(e.target.value)} className="h-8 text-xs" />
                {searchPartner.length >= 1 && (
                  <div className="absolute top-full left-0 right-0 bg-background border rounded-lg shadow-lg z-10 mt-1 max-h-32 overflow-y-auto">
                    {partners.filter(p => p.name.toLowerCase().includes(searchPartner.toLowerCase())).map(p => (
                      <button key={p.id} type="button" className="w-full text-left p-2 hover:bg-muted text-xs" onClick={() => { setSelectedPartner(p); setForm(pr => ({ ...pr, partnerId: p.id })); setSearchPartner(''); }}>
                        {p.name} <span className="text-muted-foreground">({p.commission}%)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* Calculation */}
          {calc && form.nominal && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary">
                  <Calculator className="w-3 h-3" /> Kalkulasi Real-time
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nominal:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(form.nominal))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee ({calc.feePercent}%):</span>
                    <span className="text-red-600">-{formatCurrency(calc.paymentFee)}</span>
                  </div>
                </div>
                
                {calc.platformFee > 0 && calc.selectedMp && (
                  <div className="flex items-center justify-between text-[10px] p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-1">
                      <Store className="w-3 h-3 text-orange-600" />
                      <span className="text-orange-700 dark:text-orange-400">{calc.selectedMp.name}</span>
                      <Badge variant="outline" className="text-[9px] h-3.5">{calc.selectedMp.feePercent}%</Badge>
                    </div>
                    <span className="text-red-600 font-medium">-{formatCurrency(calc.platformFee)}</span>
                  </div>
                )}
                
                <Separator className="my-1" />
                
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Diterima Customer:</span>
                  <span className="font-bold text-primary">{formatCurrency(calc.totalReceived)}</span>
                </div>
                
                <div className="flex justify-between text-xs p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-1">
                    <PiggyBank className="w-3.5 h-3.5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">Profit Anda:</span>
                  </div>
                  <span className="font-bold text-green-600">+{formatCurrency(calc.ownerProfit)}</span>
                </div>
                
                {selectedPartner && calc.partnerProfit > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Profit Partner ({selectedPartner.name}):</span>
                    <span className="text-blue-600">+{formatCurrency(calc.partnerProfit)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="submit" className="w-full gradient-primary text-white h-9" disabled={loading || (!isNewCust && !selectedCust) || !form.nominal || !form.paymentTypeId}>
              {loading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Proses...</> : <><Check className="w-3 h-3 mr-1" /> Buat (Process)</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Transaction Detail Dialog Content (uses key pattern for reset)
function TxDetailDialogContent({ tx, onUpdate, onDelete, updating }: { tx: Transaction; onUpdate: (id: string, status: string, notes?: string, mp?: string) => void; onDelete: (id: string) => void; updating: boolean }) {
  const [notes, setNotes] = useState(tx.notes || '');
  const [status, setStatus] = useState(tx.status);
  const [marketplace, setMarketplace] = useState(tx.marketplace?.id || 'none');
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);

  // Load marketplaces when dialog opens if status is verification
  useEffect(() => {
    if (status === 'verification') {
      fetch('/api/marketplaces?activeOnly=true')
        .then(res => res.json())
        .then(d => {
          if (d.success) {
            // Include current transaction's marketplace if it exists and is not already in the list
            if (tx.marketplace && !d.data.find((mp: Marketplace) => mp.id === tx.marketplace?.id)) {
              setMarketplaces([...d.data, tx.marketplace as Marketplace]);
            } else {
              setMarketplaces(d.data);
            }
          }
        });
    }
  }, []);

  // Calculate profit preview when marketplace changes
  const profitPreview = useMemo(() => {
    if (status !== 'verification') return null;

    const selectedMp = marketplaces.find(m => m.id === marketplace);
    const currentPlatformFee = tx.platformFee || 0;

    // Safety: ensure numeric values and normalize marketplace fee percent if > 100
    let newPlatformFee = 0;
    if (selectedMp) {
      let mpFeePercent = Number(selectedMp.feePercent) || 0;
      const mpFeeFlat = Number(selectedMp.feeFlat) || 0;
      if (mpFeePercent > 100) {
        mpFeePercent = mpFeePercent / 1000;
      }
      newPlatformFee = Number(tx.nominal) * (mpFeePercent / 100) + mpFeeFlat;
    }
    
    const currentNetMargin = tx.paymentFee - currentPlatformFee;
    const newNetMargin = tx.paymentFee - newPlatformFee;
    
    const partnerRate = tx.partner?.commission || 0;
    const currentPartnerProfit = currentNetMargin * partnerRate / 100;
    const newPartnerProfit = newNetMargin * partnerRate / 100;
    
    const currentOwnerProfit = currentNetMargin - currentPartnerProfit;
    const newOwnerProfit = newNetMargin - newPartnerProfit;
    
    return {
      selectedMp,
      currentPlatformFee,
      newPlatformFee,
      currentOwnerProfit,
      newOwnerProfit,
      currentPartnerProfit,
      newPartnerProfit,
      profitChange: newOwnerProfit - currentOwnerProfit,
    };
  }, [status, marketplace, marketplaces, tx]);

  const handleStatus = (s: string) => {
    setStatus(s);
    if (s === 'verification' && marketplaces.length === 0) { 
      // Load marketplaces if not already loaded
      fetch('/api/marketplaces?activeOnly=true')
        .then(res => res.json())
        .then(d => {
          if (d.success) {
            if (tx.marketplace && !d.data.find((mp: Marketplace) => mp.id === tx.marketplace?.id)) {
              setMarketplaces([...d.data, tx.marketplace as Marketplace]);
            } else {
              setMarketplaces(d.data);
            }
          }
        });
    }
  };

  const save = () => { 
    // Send 'none' explicitly so backend knows to clear marketplace
    onUpdate(tx.id, status, notes, marketplace); 
  };

  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  // Check if any changes were made
  // For verification status, always allow save (it's a confirmation action)
  const originalMarketplace = tx.marketplace?.id || 'none';
  const hasChanges = status !== tx.status || 
    marketplace !== originalMarketplace || 
    notes !== (tx.notes || '') ||
    status === 'verification'; // Always allow save when status is verification

  return (
    <div className="space-y-2.5 p-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between -mx-4 -mt-4 mb-0 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
            <StatusIcon className={cn("w-4 h-4 text-white", tx.status === 'process' && "animate-spin")} />
          </div>
          <div>
            <p className="text-[9px] text-white/70 uppercase">Status</p>
            <p className="text-sm font-bold text-white capitalize">{tx.status}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/70">ID</p>
          <p className="text-[10px] font-mono text-white bg-white/20 px-1.5 py-0.5 rounded">{tx.orderId}</p>
        </div>
      </div>

      {/* Amount & Profit Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-muted/30 p-2.5">
          <p className="text-[9px] text-muted-foreground mb-0.5">Nominal</p>
          <p className="text-base font-bold text-violet-600">{formatCurrency(tx.nominal)}</p>
          <div className="text-[9px] text-muted-foreground mt-1 space-y-0.5">
            <div className="flex justify-between">
              <span>Fee</span>
              <span className="text-red-500">-{formatCurrency(tx.paymentFee)}</span>
            </div>
            {tx.platformFee > 0 && (
              <div className="flex justify-between">
                <span>Platform</span>
                <span className="text-red-500">-{formatCurrency(tx.platformFee)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-slate-900 p-2.5 text-white">
          <p className="text-[9px] text-white/70 mb-0.5">Profit Anda</p>
          <p className="text-base font-bold text-fuchsia-400">+{formatCurrency(tx.ownerProfit)}</p>
          {tx.partner && (
            <p className="text-[9px] text-white/60 mt-1">
              {tx.partner.name}: <span className="text-violet-400">+{formatCurrency(tx.partnerProfit)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Customer & Payment Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-muted/30 p-2.5">
          <p className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
            <User className="w-2.5 h-2.5" /> Customer
          </p>
          <p className="text-xs font-semibold truncate">{tx.customer?.name}</p>
          <p className="text-[9px] text-muted-foreground">{tx.customer?.phone}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-2.5">
          <p className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
            <CreditCard className="w-2.5 h-2.5" /> Payment
          </p>
          <p className="text-xs font-semibold">{tx.paymentType?.name}</p>
          <p className="text-[9px] text-muted-foreground">{tx.methodTransaction}</p>
        </div>
      </div>

      {/* Bank Account - Compact */}
      {tx.customer?.bankName && tx.customer?.bankAccount && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 p-2.5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-muted-foreground">{tx.customer.bankName}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-mono font-bold">{tx.customer.bankAccount}</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tx.customer.bankAccount || '');
                    toast.success('Disalin');
                  }}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                >
                  <Copy className="w-3 h-3 text-blue-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change */}
      <div className="pt-2 border-t">
        <p className="text-[9px] font-medium text-muted-foreground mb-2">UBAH STATUS</p>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { v: 'pending', l: 'Pending', icon: Clock, color: 'bg-orange-500' },
            { v: 'verification', l: 'Verif', icon: AlertCircle, color: 'bg-violet-500' },
            { v: 'process', l: 'Proses', icon: Loader2, color: 'bg-cyan-500' },
            { v: 'success', l: 'Sukses', icon: CheckCircle, color: 'bg-emerald-500' },
            { v: 'failed', l: 'Gagal', icon: XCircle, color: 'bg-red-500' },
          ].map(s => {
            const Icon = s.icon;
            const isSelected = status === s.v;
            return (
              <button 
                key={s.v} 
                type="button" 
                onClick={() => handleStatus(s.v)} 
                disabled={updating} 
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all min-h-[44px]",
                  isSelected 
                    ? `${s.color} text-white shadow` 
                    : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-4 h-4", !isSelected && "text-muted-foreground", s.v === 'process' && "animate-spin")} />
                <span className="text-[8px] font-medium">{s.l}</span>
              </button>
            );
          })}
        </div>

        {/* Marketplace - Compact */}
        {status === 'verification' && (
          <div className="mt-2 space-y-2">
            <Select value={marketplace} onValueChange={setMarketplace}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih marketplace..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">Tanpa Marketplace</SelectItem>
                {marketplaces.map(mp => (
                  <SelectItem key={mp.id} value={mp.id} className="text-xs">
                    <span className="flex items-center gap-1">
                      {mp.name}
                      <span className="text-muted-foreground">({mp.feePercent}%{mp.feeFlat ? ` + ${formatCurrency(mp.feeFlat)}` : ''})</span>
                      {mp.isActive === false && <Badge variant="outline" className="text-[8px] h-3.5 text-orange-600 border-orange-300">Nonaktif</Badge>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {profitPreview && (
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Saat ini</p>
                  <p className="font-bold">{formatCurrency(profitPreview.currentOwnerProfit)}</p>
                </div>
                <div className={cn(
                  "p-2 rounded-lg",
                  profitPreview.profitChange >= 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
                )}>
                  <p className="text-muted-foreground">Baru</p>
                  <p className="font-bold">{formatCurrency(profitPreview.newOwnerProfit)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="mt-2">
          <Textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            placeholder="Catatan..." 
            className="h-10 text-xs resize-none" 
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <Button 
            onClick={save} 
            disabled={updating || !hasChanges} 
            className="flex-1 h-8 text-xs bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
          >
            {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            <span className="ml-1">Simpan</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onDelete(tx.id)} 
            disabled={updating} 
            className="h-8 w-8 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Transaction Detail Dialog Wrapper
function TxDetailDialog({ open, onOpenChange, tx, onUpdate, onDelete, updating }: { open: boolean; onOpenChange: (v: boolean) => void; tx: Transaction | null; onUpdate: (id: string, status: string, notes?: string, mp?: string) => void; onDelete: (id: string) => void; updating: boolean }) {
  if (!tx) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Detail Transaksi {tx.orderId}</DialogTitle>
        </DialogHeader>
        <TxDetailDialogContent key={tx.id} tx={tx} onUpdate={onUpdate} onDelete={onDelete} updating={updating} />
      </DialogContent>
    </Dialog>
  );
}

// Helper
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
