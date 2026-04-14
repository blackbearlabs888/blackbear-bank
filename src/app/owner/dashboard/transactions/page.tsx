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
import { CitySearch } from '@/components/ui/city-search';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus, Search, Loader2, ChevronRight, ArrowUp, ArrowDown, Target,
  Percent, AlertCircle, X, Check, User, Clock, Hash, Trash2, Edit3,
  Calculator, TrendingUp, TrendingDown, Wallet, CreditCard, Info,
  CheckCircle, XCircle, ChevronLeft, ChevronRight as ChevronRightIcon,
  RefreshCw, Eye, Zap, Filter, Calendar, ArrowRightLeft, Sparkles,
  Store, DollarSign, PiggyBank, Building2, ArrowRight, MinusCircle, Copy,
  BarChart3, PieChart, LineChart, Activity, Layers, Users, MessageSquare,
  ExternalLink,
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
  transactionLink?: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string; city?: string; bankName?: string; bankAccount?: string; bankHolder?: string; };
  paymentType: { id: string; name: string; onlineFeePercent?: number; onlineFeeFlat?: number; codFeePercent?: number; codFeeFlat?: number; threshold?: number; };
  marketplace?: { id: string; name: string; feePercent: number; feeFlat?: number; isActive?: boolean; } | null;
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  
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

  const updateStatus = async (id: string, status: string, notes?: string, marketplaceId?: string, transactionLink?: string, nominal?: number, recalculate?: boolean, partnerId?: string, discountPercent?: number) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, marketplaceId, transactionLink, nominal, recalculate, partnerId, discountPercent }),
      });
      const data = await res.json();
      if (data.success) {
        if (partnerId !== undefined) {
          toast.success(partnerId === 'none' ? 'Partner dihapus' : 'Partner berhasil diubah');
        } else if (nominal !== undefined) {
          toast.success(`Nominal diubah ke ${formatCurrency(nominal)}`);
        } else {
          toast.success(`Status diubah ke ${status}`);
        }
        // Update transaction locally without full page refresh
        if (data.data) {
          setSelectedTransaction(data.data as Transaction);
          setTransactions(prev => prev.map(t => t.id === id ? (data.data as Transaction) : t));
        }
        // Refresh analytics in background
        fetchAnalytics();
        // Close dialog after save
        setDetailOpen(false);
        setSelectedTransaction(null);
      } else toast.error(data.error || 'Gagal');
    } catch (e) { toast.error('Gagal'); }
    finally { setUpdatingStatus(false); }
  };

  const deleteTx = async (id: string) => {
    // Find the transaction to delete
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    
    // Show confirmation dialog
    setDeletingTx(tx);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingTx) return;
    
    try {
      const res = await fetch(`/api/transactions/${deletingTx.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Transaksi berhasil dihapus');
        fetchTransactions();
        fetchAnalytics();
        setDetailOpen(false);
        setDeleteConfirmOpen(false);
        setDeletingTx(null);
      } else toast.error(data.error || 'Gagal menghapus');
    } catch (e) { 
      console.error('Delete error:', e);
      toast.error('Gagal menghapus transaksi'); 
    }
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-4 h-4" />
              Hapus Transaksi
            </DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus transaksi ini?
            </DialogDescription>
          </DialogHeader>
          {deletingTx && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono font-medium">{deletingTx.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{deletingTx.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nominal:</span>
                <span className="font-bold text-red-600">{formatCurrency(deletingTx.nominal)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setDeletingTx(null); }}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Minimalist Modern Analytics Dashboard Component
function ModernAnalyticsDashboard({ analytics, loading }: { analytics: AnalyticsData | null; loading: boolean }) {
  // Prepare data for charts
  const statusChartData = analytics ? [
    { name: 'Berhasil', value: analytics.statusCounts.success, color: '#22c55e' },
    { name: 'Proses', value: analytics.statusCounts.process, color: '#3b82f6' },
    { name: 'Verifikasi', value: analytics.statusCounts.verification, color: '#8b5cf6' },
    { name: 'Pending', value: analytics.statusCounts.pending, color: '#f59e0b' },
    { name: 'Gagal', value: analytics.statusCounts.failed, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[88px] sm:h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const feeRows = analytics ? [
    { label: 'Total Payment Fee', value: analytics.feeAnalysis.totalPaymentFee, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Total Platform Fee', value: analytics.feeAnalysis.totalPlatformFee, color: 'text-orange-600 dark:text-orange-400' },
    { label: 'Net Margin', value: analytics.feeAnalysis.totalNetMargin, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Total Profit Owner', value: analytics.feeAnalysis.totalOwnerProfit, color: 'text-violet-600 dark:text-violet-400' },
    { label: 'Avg Payment Fee / Trx', value: analytics.feeAnalysis.avgPaymentFee, color: 'text-muted-foreground' },
    { label: 'Avg Margin', value: `${analytics.feeAnalysis.avgMarginPercent.toFixed(2)}%`, isText: true, color: 'text-muted-foreground' },
  ] : [];

  return (
    <div className="space-y-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <ModernKPICard
          title="Proyeksi Profit"
          value={analytics?.forecast.projectedProfit || 0}
          subtitle={`Sisa ${analytics?.forecast.daysRemaining} hari`}
          change={analytics?.forecast.profitChange}
          icon={<Target className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="border-l-emerald-500"
          iconColor="text-emerald-500"
        />
        <ModernKPICard
          title="Profit Bulan Ini"
          value={analytics?.forecast.currentMonthProfit || 0}
          subtitle={`${analytics?.forecast.daysPassed}/${analytics?.forecast.daysInMonth} hari`}
          icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="border-l-blue-500"
          iconColor="text-blue-500"
        />
        <ModernKPICard
          title="Volume Bulan Ini"
          value={analytics?.forecast.currentMonthVolume || 0}
          subtitle={`${analytics?.feeAnalysis.totalTransactions} transaksi`}
          icon={<Wallet className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="border-l-amber-500"
          iconColor="text-amber-500"
        />
        <ModernKPICard
          title="Net Margin"
          value={`${(analytics?.feeAnalysis.avgMarginPercent || 0).toFixed(2)}%`}
          subtitle="Rata-rata margin"
          icon={<Percent className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="border-l-violet-500"
          iconColor="text-violet-500"
          isPercent
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Profit Trend Chart */}
        <Card className="rounded-2xl border bg-card shadow-none">
          <CardHeader className="pb-0 pt-5 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Tren Profit 7 Hari
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-2">
            {analytics && analytics.dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={180} className="sm:h-[220px]">
                <AreaChart data={analytics.dailyTrends}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#d1d5db" axisLine={false} tickLine={false} />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    stroke="#d1d5db" 
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => {
                      if (v >= 1000000000000) return `${(v/1000000000000).toFixed(0)}T`;
                      if (v >= 1000000000) return `${(v/1000000000).toFixed(0)}M`;
                      if (v >= 1000000) return `${(v/1000000).toFixed(0)}jt`;
                      if (v >= 1000) return `${(v/1000).toFixed(0)}rb`;
                      return v.toString();
                    }} 
                    width={40} 
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontSize: 12, fontWeight: 600 }}
                    contentStyle={{ fontSize: 11, borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name="Profit" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] sm:h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Activity className="w-8 h-8 opacity-20" />
                <p className="text-sm">Belum ada data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="rounded-2xl border bg-card shadow-none">
          <CardHeader className="pb-0 pt-5 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-muted-foreground" />
              Distribusi Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-2">
            {statusChartData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="48%" height={160} className="sm:h-[200px]">
                  <RePieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} trx`} contentStyle={{ fontSize: 11, borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[160px] sm:h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <PieChart className="w-8 h-8 opacity-20" />
                <p className="text-sm">Belum ada data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fee Summary Card */}
      <Card className="rounded-2xl border bg-card shadow-none">
        <CardHeader className="pb-0 pt-5 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Ringkasan Fee
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-3">
          <div className="rounded-xl border overflow-hidden">
            {feeRows.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  'flex items-center justify-between px-4 py-3',
                  i < feeRows.length - 1 && 'border-b',
                  i === feeRows.length - 1 && 'bg-muted/30'
                )}
              >
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className={cn('text-sm font-semibold tabular-nums', row.color)}>
                  {row.isText ? row.value : formatCurrency(row.value as number)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Required */}
      {(analytics?.statusCounts.pending || 0) > 0 || (analytics?.statusCounts.verification || 0) > 0 ? (
        <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Perlu Tindakan</p>
                <p className="text-xs text-muted-foreground truncate">
                  {(analytics?.statusCounts.pending || 0) > 0 && `${analytics?.statusCounts.pending} pending`}
                  {(analytics?.statusCounts.pending || 0) > 0 && (analytics?.statusCounts.verification || 0) > 0 && ' · '}
                  {(analytics?.statusCounts.verification || 0) > 0 && `${analytics?.statusCounts.verification} verifikasi`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {(analytics?.statusCounts.pending || 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400">{analytics?.statusCounts.pending}</span>
                </div>
              )}
              {(analytics?.statusCounts.verification || 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{analytics?.statusCounts.verification}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Compact currency formatter for large numbers
function formatCompactCurrency(value: number): string {
  if (value >= 1000000000000) return `Rp ${(value / 1000000000000).toFixed(1).replace(/\.0$/, '')}T`;
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
  if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

// Minimalist KPI Card Component
function ModernKPICard({ title, value, subtitle, change, icon, accentColor, iconColor, isPercent }: {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: number;
  icon: React.ReactNode;
  accentColor: string;
  iconColor: string;
  isPercent?: boolean;
}) {
  // Format value safely
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    if (isNaN(val) || !isFinite(val)) return 'Rp 0';
    return formatCompactCurrency(val);
  };

  return (
    <Card className={cn('rounded-2xl border bg-card shadow-none border-l-[3px]', accentColor)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs text-muted-foreground truncate font-medium">{title}</p>
            <p className="text-lg sm:text-xl font-bold truncate tracking-tight">
              {isPercent ? value : formatValue(value)}
            </p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground/70 truncate">{subtitle}</p>
            )}
            {change !== undefined && !isNaN(change) && (
              <div className={cn('flex items-center gap-1 text-[11px] font-medium', change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center flex-shrink-0', iconColor, 'bg-muted/40')}>
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

// Bank list for dropdown
const BANK_LIST = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon',
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

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
  const [customBankName, setCustomBankName] = useState('');

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
      
      // Handle bank name: use customBankName if "Lainnya" is selected
      const bankNameToSubmit = form.customerBankName === 'Lainnya' ? customBankName : form.customerBankName;
      
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...form, 
          customerBankName: bankNameToSubmit,
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
        setCustomBankName('');
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
                  <CitySearch
                    value={form.customerCity}
                    onChange={(value) => setForm(p => ({ ...p, customerCity: value }))}
                    placeholder="Kota"
                    className="h-8"
                  />
                </div>
                {/* Bank Account Fields */}
                <div className="p-2 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Rekening (Opsional)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={form.customerBankName}
                      onValueChange={(value) => {
                        setForm(p => ({ ...p, customerBankName: value }));
                        if (value !== 'Lainnya') {
                          setCustomBankName('');
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Pilih Bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {BANK_LIST.map((bank) => (
                          <SelectItem key={bank} value={bank} className="text-xs">{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="No. Rekening" value={form.customerBankAccount} onChange={e => setForm(p => ({ ...p, customerBankAccount: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  {form.customerBankName === 'Lainnya' && (
                    <Input placeholder="Ketik Nama Bank" value={customBankName} onChange={e => setCustomBankName(e.target.value)} className="h-8 text-xs" />
                  )}
                  <Input placeholder="Atas Nama" value={form.customerBankHolder} onChange={e => setForm(p => ({ ...p, customerBankHolder: e.target.value }))} className="h-8 text-xs" />
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
function TxDetailDialogContent({ tx, onUpdate, onDelete, updating }: { tx: Transaction; onUpdate: (id: string, status: string, notes?: string, mp?: string, link?: string, nominal?: number, recalculate?: boolean, partnerId?: string, discountPercent?: number) => void; onDelete: (id: string) => void; updating: boolean }) {
  const [notes, setNotes] = useState(tx.notes || '');
  const [transactionLink, setTransactionLink] = useState(tx.transactionLink || '');
  const [status, setStatus] = useState(tx.status);
  const [marketplace, setMarketplace] = useState(tx.marketplace?.id || 'none');
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [editNominal, setEditNominal] = useState(false);
  const [nominal, setNominal] = useState(tx.nominal.toString());
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(tx.partner?.id || 'none');
  const [searchPartner, setSearchPartner] = useState('');
  const [partnerChanged, setPartnerChanged] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'nominal'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountTab, setDiscountTab] = useState('detail');

  // Load partners always, marketplaces when verification
  useEffect(() => {
    fetch('/api/partners')
      .then(res => res.json())
      .then(d => {
        if (d.success) setPartners((d.data || []).filter((p: Partner) => p.status === 'active'));
      });
    if (status === 'verification') {
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
  }, []);

  // Calculate preview when nominal changes
  const calculatedPreview = useMemo(() => {
    if (!editNominal) return null;

    const newNominal = parseFloat(nominal);
    if (isNaN(newNominal) || newNominal <= 0) return null;

    if (newNominal === tx.nominal) return null;

    // Get fee calculation based on existing payment type
    const isOnline = tx.methodTransaction === 'Online';
    let feePercent = isOnline ? (tx.paymentType?.onlineFeePercent || 0) : (tx.paymentType?.codFeePercent || 0);
    const feeFlat = isOnline ? (tx.paymentType?.onlineFeeFlat || 0) : (tx.paymentType?.codFeeFlat || 0);
    const threshold = tx.paymentType?.threshold || 1000000;

    // Safety: normalize fee percent if > 100
    if (feePercent > 100) {
      feePercent = feePercent / 1000;
    }

    // Calculate payment fee
    let paymentFee: number;
    if (newNominal >= threshold) {
      paymentFee = newNominal * (feePercent / 100);
    } else {
      paymentFee = feeFlat;
    }

    // Calculate platform fee if marketplace exists
    let platformFee = 0;
    if (tx.marketplace) {
      let mpFeePercent = tx.marketplace.feePercent || 0;
      const mpFeeFlat = tx.marketplace.feeFlat || 0;
      if (mpFeePercent > 100) {
        mpFeePercent = mpFeePercent / 1000;
      }
      platformFee = newNominal * (mpFeePercent / 100) + mpFeeFlat;
    }

    // Calculate margins
    const netMargin = paymentFee - platformFee;
    const partnerRate = tx.partner?.commission || 0;
    const partnerProfit = netMargin * (partnerRate / 100);
    const ownerProfit = netMargin - partnerProfit;
    const totalReceived = newNominal - paymentFee;

    // Also include the new nominal for reference
    return {
      nominal: newNominal,
      paymentFee,
      platformFee,
      netMargin,
      partnerProfit,
      ownerProfit,
      totalReceived,
    };
  }, [editNominal, nominal, tx]);

  const previewCalc = calculatedPreview;

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
    // Check if nominal changed
    const nominalChanged = editNominal && parseFloat(nominal) !== tx.nominal;
    const newNominal = nominalChanged ? parseFloat(nominal) : undefined;

    // Send 'none' explicitly so backend knows to clear marketplace
    const effectivePartnerId = partnerChanged ? selectedPartnerId : undefined;
    // Calculate discount percent if discount tab was used
    let discountPercent: number | undefined;
    if (discountValue) {
      const val = parseFloat(discountValue);
      if (!isNaN(val) && val > 0) {
        if (discountType === 'percent') {
          discountPercent = Math.min(val, 100);
        } else {
          // Convert nominal discount to percent
          const isOnline = tx.methodTransaction === 'Online';
          let feePercent = isOnline ? (tx.paymentType?.onlineFeePercent || 0) : (tx.paymentType?.codFeePercent || 0);
          const feeFlat = isOnline ? (tx.paymentType?.onlineFeeFlat || 0) : (tx.paymentType?.codFeeFlat || 0);
          const threshold = tx.paymentType?.threshold || 1000000;
          if (feePercent > 100) feePercent = feePercent / 1000;
          let paymentFee = tx.nominal >= threshold ? tx.nominal * (feePercent / 100) : feeFlat;
          let platformFee = 0;
          if (tx.marketplace) {
            let mpFeePercent = tx.marketplace.feePercent || 0;
            const mpFeeFlat = tx.marketplace.feeFlat || 0;
            if (mpFeePercent > 100) mpFeePercent = mpFeePercent / 1000;
            platformFee = tx.nominal * (mpFeePercent / 100) + mpFeeFlat;
          }
          const originalFee = paymentFee;
          if (originalFee > 0) {
            discountPercent = Math.min((val / originalFee) * 100, 100);
          }
        }
      }
    }
    onUpdate(tx.id, status, notes, marketplace, transactionLink, newNominal, nominalChanged, effectivePartnerId, discountPercent);
  };

  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  // Check if any changes were made
  // For verification status, always allow save (it's a confirmation action)
  const originalMarketplace = tx.marketplace?.id || 'none';
  const nominalChanged = editNominal && parseFloat(nominal) !== tx.nominal;
  const hasDiscount = discountValue && parseFloat(discountValue) > 0;
  const hasChanges = status !== tx.status ||
    marketplace !== originalMarketplace ||
    notes !== (tx.notes || '') ||
    transactionLink !== (tx.transactionLink || '') ||
    nominalChanged ||
    partnerChanged ||
    hasDiscount ||
    status === 'verification'; // Always allow save when status is verification

  // Discount preview calculation
  const discountPreview = useMemo(() => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return null;

    // Calculate original fee
    const isOnline = tx.methodTransaction === 'Online';
    let feePercent = isOnline ? (tx.paymentType?.onlineFeePercent || 0) : (tx.paymentType?.codFeePercent || 0);
    const feeFlat = isOnline ? (tx.paymentType?.onlineFeeFlat || 0) : (tx.paymentType?.codFeeFlat || 0);
    const threshold = tx.paymentType?.threshold || 1000000;
    if (feePercent > 100) feePercent = feePercent / 1000;

    const originalPaymentFee = tx.nominal >= threshold ? tx.nominal * (feePercent / 100) : feeFlat;

    let originalPlatformFee = 0;
    if (tx.marketplace) {
      let mpFeePercent = tx.marketplace.feePercent || 0;
      const mpFeeFlat = tx.marketplace.feeFlat || 0;
      if (mpFeePercent > 100) mpFeePercent = mpFeePercent / 1000;
      originalPlatformFee = tx.nominal * (mpFeePercent / 100) + mpFeeFlat;
    }

    const originalTotalFee = originalPaymentFee + originalPlatformFee;
    const originalNetMargin = originalPaymentFee - originalPlatformFee;
    const originalTotalReceived = tx.nominal - originalPaymentFee;

    let discountAmount = 0;
    let effectiveDiscountPercent = 0;

    if (discountType === 'percent') {
      effectiveDiscountPercent = Math.min(val, 100);
      discountAmount = originalPaymentFee * (effectiveDiscountPercent / 100);
    } else {
      discountAmount = Math.min(val, originalPaymentFee);
      if (originalPaymentFee > 0) {
        effectiveDiscountPercent = (discountAmount / originalPaymentFee) * 100;
      }
    }

    const newPaymentFee = originalPaymentFee - discountAmount;
    const newTotalFee = newPaymentFee + originalPlatformFee;
    const newNetMargin = newPaymentFee - originalPlatformFee;

    const partnerRate = tx.partner?.commission || 0;
    const originalPartnerProfit = originalNetMargin * (partnerRate / 100);
    const originalOwnerProfit = originalNetMargin - originalPartnerProfit;

    const newPartnerProfit = newNetMargin * (partnerRate / 100);
    const newOwnerProfit = newNetMargin - newPartnerProfit;
    const newTotalReceived = tx.nominal - newPaymentFee;

    return {
      originalPaymentFee,
      originalPlatformFee,
      originalTotalFee,
      originalNetMargin,
      originalTotalReceived,
      originalOwnerProfit,
      originalPartnerProfit,
      discountAmount,
      effectiveDiscountPercent,
      newPaymentFee,
      newTotalFee,
      newNetMargin,
      newTotalReceived,
      newOwnerProfit,
      newPartnerProfit,
    };
  }, [discountValue, discountType, tx]);

  const canDiscount = tx.status === 'pending' || tx.status === 'verification';

  return (
    <Tabs value={discountTab} onValueChange={setDiscountTab} className="w-full">
      {/* Gradient Header with Tabs */}
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-t-lg">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
              <StatusIcon className={cn("w-4 h-4 text-white", tx.status === 'process' && "animate-spin")} />
            </div>
            <div>
              <p className="text-[9px] text-white/70 uppercase">Status</p>
              <p className="text-sm font-bold text-white capitalize">{tx.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center justify-end gap-1">
              <p className="text-[10px] font-mono text-white bg-white/20 px-1.5 py-0.5 rounded truncate max-w-[100px]">{tx.orderId}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(tx.orderId);
                  toast.success('Order ID disalin');
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Salin Order ID"
              >
                <Copy className="w-3 h-3 text-white/80" />
              </button>
            </div>
          </div>
        </div>
        {/* Tab Triggers */}
        <TabsList className="w-full bg-transparent h-auto p-0 gap-0 rounded-none">
          <TabsTrigger
            value="detail"
            className="flex-1 h-8 text-[11px] font-medium rounded-none data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none text-white/70 border-b-2 border-transparent data-[state=active]:border-white/60 data-[state=active]:rounded-none"
          >
            <Info className="w-3 h-3 mr-1" /> Detail
          </TabsTrigger>
          <TabsTrigger
            value="aksi"
            className="flex-1 h-8 text-[11px] font-medium rounded-none data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none text-white/70 border-b-2 border-transparent data-[state=active]:border-white/60 data-[state=active]:rounded-none"
          >
            <Zap className="w-3 h-3 mr-1" /> Aksi
          </TabsTrigger>
          <TabsTrigger
            value="diskon"
            className={cn(
              "flex-1 h-8 text-[11px] font-medium rounded-none data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-white/60 data-[state=active]:rounded-none",
              canDiscount ? "text-white/70" : "text-white/30 cursor-not-allowed"
            )}
            disabled={!canDiscount}
          >
            <Percent className="w-3 h-3 mr-1" /> Diskon
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab Contents */}
      <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(85vh - 140px)' }}>
        {/* TAB 1: Detail */}
        <TabsContent value="detail" className="mt-0 p-4 space-y-2.5">
          {/* Amount & Profit Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[9px] text-muted-foreground">Nominal</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditNominal(!editNominal);
                    if (editNominal) {
                      setNominal(tx.nominal.toString());
                    }
                  }}
                  className={cn("p-1 rounded transition-colors", editNominal ? "bg-violet-100 text-violet-600" : "hover:bg-muted text-muted-foreground")}
                  title={editNominal ? 'Batal edit' : 'Edit nominal'}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
              {editNominal ? (
                <Input
                  type="number"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  className="h-7 text-xs font-bold text-violet-600"
                  placeholder="Masukkan nominal"
                />
              ) : (
                <p className="text-base font-bold text-violet-600">{formatCurrency(tx.nominal)}</p>
              )}
              <div className="text-[9px] text-muted-foreground mt-1 space-y-0.5">
                <div className="flex justify-between">
                  <span>Fee</span>
                  <span className="text-red-500">
                    {previewCalc && previewCalc.paymentFee !== tx.paymentFee ? (
                      <span>
                        <span className="line-through text-muted-foreground mr-1">{formatCurrency(tx.paymentFee)}</span>
                        <span>-{formatCurrency(previewCalc.paymentFee)}</span>
                      </span>
                    ) : (
                      <span>-{formatCurrency(previewCalc?.paymentFee ?? tx.paymentFee)}</span>
                    )}
                  </span>
                </div>
                {(previewCalc?.platformFee ?? tx.platformFee) > 0 && (
                  <div className="flex justify-between">
                    <span>Platform</span>
                    <span className="text-red-500">
                      {previewCalc && previewCalc.platformFee !== tx.platformFee ? (
                        <span>
                          <span className="line-through text-muted-foreground mr-1">{formatCurrency(tx.platformFee)}</span>
                          <span>-{formatCurrency(previewCalc.platformFee)}</span>
                        </span>
                      ) : (
                        <span>-{formatCurrency(previewCalc?.platformFee ?? tx.platformFee)}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-slate-900 p-2.5 text-white">
              <p className="text-[9px] text-white/70 mb-0.5">Profit Anda</p>
              {previewCalc && previewCalc.ownerProfit !== tx.ownerProfit ? (
                <div>
                  <p className="text-[9px] text-white/50 line-through">{formatCurrency(tx.ownerProfit)}</p>
                  <p className="text-base font-bold text-fuchsia-400">+{formatCurrency(previewCalc.ownerProfit)}</p>
                  <p className="text-[8px] text-fuchsia-300">*Preview</p>
                </div>
              ) : (
                <p className="text-base font-bold text-fuchsia-400">+{formatCurrency(previewCalc?.ownerProfit ?? tx.ownerProfit)}</p>
              )}
              {tx.partner && (
                <p className="text-[9px] text-white/60 mt-1">
                  {tx.partner.name}: <span className="text-violet-400">
                    {previewCalc && previewCalc.partnerProfit !== tx.partnerProfit ? (
                      <span>
                        <span className="line-through text-white/40 mr-1">{formatCurrency(tx.partnerProfit)}</span>
                        +{formatCurrency(previewCalc.partnerProfit)}
                      </span>
                    ) : (
                      <span>+{formatCurrency(previewCalc?.partnerProfit ?? tx.partnerProfit)}</span>
                    )}
                  </span>
                </p>
              )}
              {previewCalc && previewCalc.ownerProfit !== tx.ownerProfit && (
                <p className="text-[8px] text-fuchsia-300 mt-1">*Preview</p>
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
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[9px] text-muted-foreground">{tx.customer?.phone}</p>
                <div className="flex items-center gap-0.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tx.customer?.phone || '');
                      toast.success('No. WA disalin');
                    }}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Salin No. WA"
                  >
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <a
                    href={`https://wa.me/${tx.customer?.phone?.replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                    title="Buka WhatsApp"
                  >
                    <MessageSquare className="w-3 h-3 text-green-600" />
                  </a>
                </div>
              </div>
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

          {/* Timestamp & Marketplace info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-muted/30 p-2.5">
              <p className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" /> Tanggal
              </p>
              <p className="text-xs font-semibold">{formatDate(tx.createdAt)}</p>
            </div>
            {tx.marketplace && (
              <div className="rounded-lg border bg-muted/30 p-2.5">
                <p className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Store className="w-2.5 h-2.5" /> Marketplace
                </p>
                <p className="text-xs font-semibold">{tx.marketplace.name}</p>
                <p className="text-[9px] text-muted-foreground">Fee: {tx.marketplace.feePercent}%</p>
              </div>
            )}
          </div>

          {/* WhatsApp Share Button */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`🛒 Detail Transaksi\n\nOrder ID: ${tx.orderId}\nNominal: ${formatCurrency(tx.nominal)}\nPayment: ${tx.paymentType?.name}\nStatus: ${tx.status.toUpperCase()}\nCustomer: ${tx.customer?.name}\nTanggal: ${formatDate(tx.createdAt)}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-2.5 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-xs font-medium"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share ke WhatsApp
          </a>
        </TabsContent>

        {/* TAB 2: Aksi */}
        <TabsContent value="aksi" className="mt-0 p-4 space-y-2.5">
          {/* Status Change */}
          <div>
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
          </div>

          {/* Marketplace - when verification */}
          {status === 'verification' && (
            <div className="space-y-2">
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
                <div className="space-y-2 text-[10px]">
                  {/* Owner Profit Comparison */}
                  <div className="p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-medium text-muted-foreground flex items-center gap-1">
                        <PiggyBank className="w-3 h-3" /> Profit Owner
                      </p>
                      {profitPreview.profitChange !== 0 && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded",
                          profitPreview.profitChange >= 0 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {profitPreview.profitChange >= 0 ? '+' : ''}{formatCurrency(profitPreview.profitChange)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Saat ini</p>
                        <p className="font-bold text-sm">{formatCurrency(profitPreview.currentOwnerProfit)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Baru</p>
                        <p className={cn(
                          "font-bold text-sm",
                          profitPreview.profitChange >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>{formatCurrency(profitPreview.newOwnerProfit)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Partner Profit Comparison */}
                  {tx.partner && profitPreview.currentPartnerProfit !== undefined && (
                    <div className="p-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-medium text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" /> Profit Partner
                          <span className="text-[9px] text-blue-600">({tx.partner.name})</span>
                        </p>
                        {profitPreview.newPartnerProfit !== undefined && (
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded",
                            (profitPreview.newPartnerProfit - profitPreview.currentPartnerProfit) >= 0 
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {(profitPreview.newPartnerProfit - profitPreview.currentPartnerProfit) >= 0 ? '+' : ''}
                            {formatCurrency(profitPreview.newPartnerProfit - profitPreview.currentPartnerProfit)}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[9px] text-muted-foreground">Saat ini</p>
                          <p className="font-bold text-sm text-blue-600">{formatCurrency(profitPreview.currentPartnerProfit)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Baru</p>
                          <p className={cn(
                            "font-bold text-sm",
                            profitPreview.newPartnerProfit !== undefined && 
                            (profitPreview.newPartnerProfit - profitPreview.currentPartnerProfit) >= 0 
                              ? "text-emerald-600" 
                              : "text-red-600"
                          )}>
                            {profitPreview.newPartnerProfit !== undefined ? formatCurrency(profitPreview.newPartnerProfit) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Platform Fee Info */}
                  {profitPreview.newPlatformFee > 0 && profitPreview.selectedMp && (
                    <div className="flex items-center justify-between text-[9px] p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-1">
                        <Store className="w-3 h-3 text-orange-600" />
                        <span className="text-orange-700 dark:text-orange-400">{profitPreview.selectedMp.name}</span>
                      </div>
                      <span className="text-red-600 font-medium">-{formatCurrency(profitPreview.newPlatformFee)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Partner Selector */}
          <div className="rounded-lg border bg-muted/30 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Users className="w-2.5 h-2.5" /> Partner
              </p>
              {selectedPartnerId !== 'none' && (
                <Button type="button" variant="ghost" size="sm" className="h-5 text-[9px] text-red-500 px-1.5" onClick={() => { setSelectedPartnerId('none'); setPartnerChanged(true); }}>
                  <X className="w-2.5 h-2.5" />
                </Button>
              )}
            </div>
            {selectedPartnerId !== 'none' ? (
              (() => {
                const p = partners.find(x => x.id === selectedPartnerId) || tx.partner;
                return p ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">{p.name}</p>
                      <p className="text-[9px] text-muted-foreground">{p.tier} &middot; Komisi {p.commission}%</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => { setSelectedPartnerId('none'); setPartnerChanged(true); }}>Ganti</Button>
                  </div>
                ) : <p className="text-[9px] text-muted-foreground">Partner tidak ditemukan</p>;
              })()
            ) : (
              <div className="space-y-1.5">
                <Input placeholder="Cari partner..." value={searchPartner} onChange={e => setSearchPartner(e.target.value)} className="h-7 text-[10px]" />
                {searchPartner.length >= 1 ? (
                  <div className="max-h-24 overflow-y-auto space-y-0.5">
                    {partners.filter(p => p.name.toLowerCase().includes(searchPartner.toLowerCase())).slice(0, 5).map(p => (
                      <button key={p.id} type="button" onClick={() => { setSelectedPartnerId(p.id); setPartnerChanged(true); setSearchPartner(''); }} className="w-full text-left flex items-center justify-between px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-[10px] font-medium">{p.name}</p>
                          <p className="text-[8px] text-muted-foreground">{p.tier} &middot; {p.commission}%</p>
                        </div>
                        <Check className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] text-muted-foreground text-center py-1">Ketik nama partner untuk mencari...</p>
                )}
              </div>
            )}
          </div>

          {/* Transaction Link */}
          <div className="p-2 rounded-lg border border-dashed bg-violet-50/50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800">
            <p className="text-[9px] font-medium text-violet-700 dark:text-violet-400 flex items-center gap-1 mb-1.5">
              <ExternalLink className="w-3 h-3" />
              Link Transaksi
            </p>
            <Input
              type="url"
              value={transactionLink}
              onChange={e => setTransactionLink(e.target.value)}
              placeholder="https://contoh.com/transaksi..."
              className="h-8 text-xs"
            />
            <p className="text-[9px] text-muted-foreground">Link untuk customer/partner melakukan transaksi</p>
          </div>
          
          {/* Notes */}
          <Textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            placeholder="Catatan untuk customer/partner..." 
            className="h-10 text-xs resize-none" 
          />

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
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
        </TabsContent>

        {/* TAB 3: Diskon */}
        <TabsContent value="diskon" className="mt-0 p-4 space-y-3">
          {!canDiscount ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Diskon hanya bisa diterapkan saat status <span className="font-medium">Pending</span> atau <span className="font-medium">Verifikasi</span></p>
            </div>
          ) : (
            <>
              {/* Current Fee Info */}
              <div className="rounded-lg border bg-muted/30 p-2.5 space-y-1.5">
                <p className="text-[9px] font-medium text-muted-foreground uppercase">Info Fee Saat Ini</p>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Fee</span>
                    <span className="font-semibold text-red-500">-{formatCurrency(tx.paymentFee)}</span>
                  </div>
                  {tx.platformFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee ({tx.marketplace?.name})</span>
                      <span className="font-semibold text-red-500">-{formatCurrency(tx.platformFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Fee</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(tx.paymentFee + tx.platformFee)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Margin</span>
                    <span className="font-semibold">{formatCurrency(tx.paymentFee - tx.platformFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer Receives</span>
                    <span className="font-semibold">{formatCurrency(tx.totalReceived)}</span>
                  </div>
                </div>
              </div>

              {/* Discount Type Toggle */}
              <div>
                <p className="text-[9px] font-medium text-muted-foreground mb-1.5 uppercase">Tipe Diskon</p>
                <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                  <button
                    type="button"
                    onClick={() => { setDiscountType('percent'); setDiscountValue(''); }}
                    className={cn(
                      "flex-1 py-2 rounded-md text-[11px] font-medium transition-all",
                      discountType === 'percent' 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Persentase (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDiscountType('nominal'); setDiscountValue(''); }}
                    className={cn(
                      "flex-1 py-2 rounded-md text-[11px] font-medium transition-all",
                      discountType === 'nominal' 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Nominal (Rp)
                  </button>
                </div>
              </div>

              {/* Discount Input */}
              <div>
                <p className="text-[9px] font-medium text-muted-foreground mb-1.5">
                  {discountType === 'percent' ? 'Diskon (%)' : 'Diskon (Rp)'}
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {discountType === 'percent' ? '%' : 'Rp'}
                  </span>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percent' ? '0' : '0'}
                    className="h-10 text-sm font-semibold pl-10"
                    min="0"
                    max={discountType === 'percent' ? '100' : undefined}
                  />
                </div>
                {discountType === 'percent' && discountValue && parseFloat(discountValue) > 100 && (
                  <p className="text-[9px] text-red-500 mt-1">Maksimal 100%</p>
                )}
                {discountType === 'nominal' && discountPreview && parseFloat(discountValue) > discountPreview.originalPaymentFee && (
                  <p className="text-[9px] text-red-500 mt-1">Maksimal {formatCurrency(discountPreview.originalPaymentFee)}</p>
                )}
              </div>

              {/* Live Preview */}
              {discountPreview && (
                <div className="space-y-2 animate-fade-in">
                  <p className="text-[9px] font-medium text-muted-foreground uppercase">Preview Perhitungan</p>
                  
                  <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-900/10 p-2.5 space-y-1.5">
                    <div className="text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original Fee</span>
                        <span className="font-medium">{formatCurrency(discountPreview.originalPaymentFee)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Diskon ({discountPreview.effectiveDiscountPercent.toFixed(1)}%)</span>
                        <span className="font-bold">-{formatCurrency(discountPreview.discountAmount)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">New Fee</span>
                        <span className="font-bold text-orange-600">{formatCurrency(discountPreview.newPaymentFee)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 p-2.5 space-y-1.5">
                    <p className="text-[9px] font-medium text-blue-700 dark:text-blue-400 uppercase">Hasil Setelah Diskon</p>
                    <div className="text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer Receives</span>
                        <div className="text-right">
                          <span className="line-through text-muted-foreground mr-1 text-[9px]">{formatCurrency(discountPreview.originalTotalReceived)}</span>
                          <span className="font-bold text-blue-600">{formatCurrency(discountPreview.newTotalReceived)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net Margin</span>
                        <div className="text-right">
                          <span className="line-through text-muted-foreground mr-1 text-[9px]">{formatCurrency(discountPreview.originalNetMargin)}</span>
                          <span className="font-bold">{formatCurrency(discountPreview.newNetMargin)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner Profit</span>
                        <div className="text-right">
                          <span className="line-through text-muted-foreground mr-1 text-[9px]">{formatCurrency(discountPreview.originalOwnerProfit)}</span>
                          <span className={cn(
                            "font-bold",
                            discountPreview.newOwnerProfit >= discountPreview.originalOwnerProfit ? "text-emerald-600" : "text-red-600"
                          )}>{formatCurrency(discountPreview.newOwnerProfit)}</span>
                        </div>
                      </div>
                      {tx.partner && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Partner Profit ({tx.partner.name})</span>
                          <div className="text-right">
                            <span className="line-through text-muted-foreground mr-1 text-[9px]">{formatCurrency(discountPreview.originalPartnerProfit)}</span>
                            <span className={cn(
                              "font-bold",
                              discountPreview.newPartnerProfit >= discountPreview.originalPartnerProfit ? "text-emerald-600" : "text-red-600"
                            )}>{formatCurrency(discountPreview.newPartnerProfit)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Apply Discount Button */}
                  <Button
                    onClick={() => {
                      save();
                    }}
                    disabled={updating || !discountValue || parseFloat(discountValue) <= 0}
                    className="w-full h-9 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
                  >
                    {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Percent className="w-3 h-3" />}
                    <span className="ml-1">Terapkan Diskon & Simpan</span>
                  </Button>
                </div>
              )}

              {/* No discount entered hint */}
              {!discountPreview && (
                <p className="text-[10px] text-muted-foreground text-center py-4">
                  Masukkan nilai diskon untuk melihat preview perhitungan
                </p>
              )}
            </>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}

// Transaction Detail Dialog Wrapper
function TxDetailDialog({ open, onOpenChange, tx, onUpdate, onDelete, updating }: { open: boolean; onOpenChange: (v: boolean) => void; tx: Transaction | null; onUpdate: (id: string, status: string, notes?: string, mp?: string, link?: string, nominal?: number, recalculate?: boolean, partnerId?: string, discountPercent?: number) => void; onDelete: (id: string) => void; updating: boolean }) {
  if (!tx) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0">
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
