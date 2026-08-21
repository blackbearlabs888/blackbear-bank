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
  Percent, AlertCircle, X, Check, User, Clock, Trash2, Edit3,
  Calculator, TrendingUp, TrendingDown, Wallet, CreditCard, Info,
  CheckCircle, XCircle, RefreshCw, Zap, Calendar, ArrowRightLeft, Sparkles,
  Store, PiggyBank, Building2, Copy,
  BarChart3, PieChart, Activity, Users, MessageSquare,
  ExternalLink, Banknote, Layers, Filter, Star,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
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

interface PaymentType { id: string; name: string; onlineFeePercent: number; onlineFeeFlat: number; codFeePercent: number; codFeeFlat: number; threshold: number; discountPercent?: number; discountNominal?: number; minTransaction?: number; isActive: boolean; }
interface Partner { id: string; name: string; commission: number; tier: string; status: string; }
interface Customer { id: string; name: string; phone: string; city?: string; bankName?: string; bankAccount?: string; bankHolder?: string; totalTransactions: number; }
interface Marketplace { id: string; name: string; feePercent: number; feeFlat?: number; isActive: boolean; }

const STATUS_CONFIG = {
  pending: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock, iconColor: 'text-orange-600', barColor: 'bg-orange-500', dotColor: 'bg-orange-500' },
  verification: { color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', icon: AlertCircle, iconColor: 'text-violet-600', barColor: 'bg-violet-500', dotColor: 'bg-violet-500' },
  process: { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Loader2, iconColor: 'text-cyan-600', barColor: 'bg-cyan-500', dotColor: 'bg-cyan-500' },
  success: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: ArrowUp, iconColor: 'text-emerald-600', barColor: 'bg-emerald-500', dotColor: 'bg-emerald-500' },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: ArrowDown, iconColor: 'text-red-600', barColor: 'bg-red-500', dotColor: 'bg-red-500' },
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

  const updateStatus = async (id: string, status: string, notes?: string, marketplaceId?: string, transactionLink?: string, nominal?: number, recalculate?: boolean, partnerId?: string, discountPercent?: number, discountNominal?: number) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, marketplaceId, transactionLink, nominal, recalculate, partnerId, discountPercent, discountNominal }),
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
        if (data.data) {
          setSelectedTransaction(data.data as Transaction);
          setTransactions(prev => prev.map(t => t.id === id ? (data.data as Transaction) : t));
        }
        fetchAnalytics();
        setDetailOpen(false);
        setSelectedTransaction(null);
      } else {
        // P0 hotfix: same toast.error(object) crash risk as confirmDelete —
        // data.error is an object, not a string.
        const errMsg =
          typeof data.error === 'string'
            ? data.error
            : (data.error?.message || 'Gagal');
        toast.error(errMsg);
      }
    } catch (e) { toast.error('Gagal'); }
    finally { setUpdatingStatus(false); }
  };

  const deleteTx = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    setDeletingTx(tx);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingTx) return;
    try {
      const res = await fetch(`/api/transactions/${deletingTx.id}`, { method: 'DELETE' });
      // P0 hotfix (delete client-side crash): the API error shape is
      // `{ success: false, error: { code, message, requestId } }` — an OBJECT.
      // Passing it to toast.error() crashed React ("Objects are not valid as a
      // React child"). Also guard against empty/non-JSON responses (redirects,
      // proxy 502, dev HMR races) that throw on res.json().
      if (!res.ok) {
        toast.error('Gagal menghapus transaksi');
        setDeleteConfirmOpen(false);
        setDeletingTx(null);
        return;
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (data.success) {
        toast.success('Transaksi berhasil dihapus');
        fetchTransactions();
        fetchAnalytics();
        setDetailOpen(false);
        setDeleteConfirmOpen(false);
        setDeletingTx(null);
        // Clear the dangling selectedTransaction reference (was missing —
        // matched the updateStatus pattern at line 227).
        setSelectedTransaction(null);
      } else {
        // Safely extract the message string from the apiError object shape.
        const errMsg =
          typeof data.error === 'string'
            ? data.error
            : (data.error?.message || 'Gagal menghapus transaksi');
        toast.error(errMsg);
      }
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
    <div className="min-h-screen bg-background dashboard-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Transaksi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Kelola Transaksi</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">Semua transaksi partner & customer</p>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isRefreshing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : formatTimeAgo(lastUpdated)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={() => { fetchTransactions(); fetchAnalytics(); }}
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 rounded-lg"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button onClick={() => setNewTxOpen(true)} size="sm" className="bg-primary text-primary-foreground rounded-lg h-9 px-4 font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Baru</span>
          </Button>
        </div>
      </div>

      {/* ── Main Tabs: Transaksi & Analytics ── */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
        <button
          onClick={() => setMainTab('transactions')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
            mainTab === 'transactions'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          <Wallet className="w-4 h-4" />
          Transaksi
        </button>
        <button
          onClick={() => setMainTab('analytics')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
            mainTab === 'analytics'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {/* ── Tab Content ── */}
      {mainTab === 'transactions' ? (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1">
            {[
              { value: 'all', label: 'Semua', icon: Layers },
              { value: 'pending', label: 'Pending', count: analytics?.statusCounts.pending, color: 'bg-orange-500', icon: Clock },
              { value: 'verification', label: 'Verif', count: analytics?.statusCounts.verification, color: 'bg-violet-500', icon: AlertCircle },
              { value: 'process', label: 'Proses', count: analytics?.statusCounts.process, color: 'bg-cyan-500', icon: Loader2 },
              { value: 'success', label: 'Sukses', count: analytics?.statusCounts.success, color: 'bg-emerald-500', icon: CheckCircle },
              { value: 'failed', label: 'Gagal', count: analytics?.statusCounts.failed, color: 'bg-red-500', icon: XCircle },
            ].map(tab => {
              const TabIcon = tab.icon!;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0',
                    isActive
                      ? tab.color
                        ? cn(tab.color, 'text-white shadow-sm')
                        : 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <TabIcon className={cn('w-3.5 h-3.5', tab.value === 'process' && isActive && 'animate-spin')} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn(
                      'tabular-nums text-[10px] min-w-[16px] text-center px-1 rounded-full',
                      isActive ? 'bg-white/20' : 'bg-muted'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari order ID, nama, no. WA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl text-sm bg-muted/40 border-border/60 focus-visible:bg-background"
            />
          </div>

          {/* Transaction List */}
          <div className="space-y-2.5">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="rounded-xl border bg-card overflow-hidden">
                  <div className="flex items-center gap-3 p-3.5">
                    <Skeleton className="w-3 h-14 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            ) : filtered.length > 0 ? (
              filtered.map(tx => (
                <TxCard key={tx.id} tx={tx} onClick={() => { setSelectedTransaction(tx); setDetailOpen(true); }} />
              ))
            ) : (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Tidak ada transaksi</p>
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
    </div>
  );
}

// ──────────────────────────────────────────
// Health Score Calculator
// ──────────────────────────────────────────
function calculateHealthScore(analytics: AnalyticsData): { score: number; breakdown: { label: string; value: number; weight: number; score: number; }[] } {
  // 1. Success Rate Score (30%)
  const total = Object.values(analytics.statusCounts).reduce((a, b) => a + b, 0);
  const successRate = total > 0 ? (analytics.statusCounts.success / total) * 100 : 0;
  const successScore = Math.min(100, successRate * 1.25);

  // 2. Margin Health (25%)
  const marginPercent = analytics.feeAnalysis.avgMarginPercent;
  const marginScore = Math.min(100, (marginPercent / 5) * 100);

  // 3. Volume Trend (25%)
  const trendScore = Math.max(0, Math.min(100, 50 + analytics.forecast.profitChange));

  // 4. Transaction Volume (20%)
  const volumeScore = Math.min(100, (analytics.feeAnalysis.totalTransactions / 200) * 100);

  const score = Math.round(
    successScore * 0.30 + marginScore * 0.25 + trendScore * 0.25 + volumeScore * 0.20
  );

  return {
    score,
    breakdown: [
      { label: 'Success Rate', value: parseFloat(successRate.toFixed(1)), weight: 30, score: Math.round(successScore) },
      { label: 'Margin Health', value: parseFloat(marginPercent.toFixed(2)), weight: 25, score: Math.round(marginScore) },
      { label: 'Volume Trend', value: parseFloat(analytics.forecast.profitChange.toFixed(1)), weight: 25, score: Math.round(trendScore) },
      { label: 'Volume', value: analytics.feeAnalysis.totalTransactions, weight: 20, score: Math.round(volumeScore) },
    ]
  };
}

// ──────────────────────────────────────────
// Analytics Dashboard — Dark Modern Premium UI
// ──────────────────────────────────────────
function ModernAnalyticsDashboard({ analytics, loading }: { analytics: AnalyticsData | null; loading: boolean }) {
  const statusChartData = analytics ? [
    { name: 'Berhasil', value: analytics.statusCounts.success, color: '#22c55e' },
    { name: 'Proses', value: analytics.statusCounts.process, color: '#06b6d4' },
    { name: 'Verifikasi', value: analytics.statusCounts.verification, color: '#8b5cf6' },
    { name: 'Pending', value: analytics.statusCounts.pending, color: '#f59e0b' },
    { name: 'Gagal', value: analytics.statusCounts.failed, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <div className="space-y-3">
        {/* Loading Main Card */}
        <div className="rounded-xl dash-card overflow-hidden p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Health Score skeleton */}
            <div className="flex flex-col items-center mx-auto sm:mx-0">
              <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted/60" />
              <Skeleton className="h-3 w-20 mt-2 bg-muted" />
              <div className="mt-2.5 space-y-1.5 w-28">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-2.5 w-full bg-muted/40" />)}
              </div>
            </div>
            {/* KPIs skeleton */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="rounded-lg bg-muted/30 border border-border p-3">
                  <Skeleton className="h-2.5 w-16 mb-2 bg-muted" />
                  <Skeleton className="h-5 w-20 mb-1 bg-muted" />
                  <Skeleton className="h-2 w-12 bg-muted/60" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Loading Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <Skeleton className="h-52 sm:h-64 rounded-xl bg-muted" />
          <Skeleton className="h-52 sm:h-64 rounded-xl bg-muted" />
        </div>
        {/* Loading sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <Skeleton className="h-48 rounded-xl bg-muted" />
          <Skeleton className="h-32 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const healthScore = analytics ? calculateHealthScore(analytics) : null;
  const healthColor = healthScore ? (healthScore.score >= 80 ? '#22c55e' : healthScore.score >= 50 ? '#f59e0b' : '#ef4444') : '#6b7280';
  const healthColorClass = healthScore ? (healthScore.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : healthScore.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400') : 'text-muted-foreground';
  const healthGlowClass = healthScore ? (healthScore.score >= 80 ? 'shadow-emerald-500/20' : healthScore.score >= 50 ? 'shadow-amber-500/20' : 'shadow-red-500/20') : '';

  const feeRows = analytics ? [
    { label: 'Total Payment Fee', value: analytics.feeAnalysis.totalPaymentFee, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Total Platform Fee', value: analytics.feeAnalysis.totalPlatformFee, color: 'text-orange-600 dark:text-orange-400' },
    { label: 'Net Margin', value: analytics.feeAnalysis.totalNetMargin, color: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Total Profit Owner', value: analytics.feeAnalysis.totalOwnerProfit, color: 'text-violet-600 dark:text-violet-400' },
    { label: 'Avg Payment Fee / Trx', value: analytics.feeAnalysis.avgPaymentFee, color: 'text-muted-foreground' },
    { label: 'Avg Margin', value: `${analytics.feeAnalysis.avgMarginPercent.toFixed(2)}%`, isText: true, color: 'text-muted-foreground' },
  ] : [];

  const sortedPeakHours = analytics?.peakHours
    ? [...analytics.peakHours].sort((a, b) => b.count - a.count).slice(0, 5)
    : [];
  const maxPeakCount = sortedPeakHours.length > 0 ? sortedPeakHours[0].count : 1;

  return (
    <div className="space-y-3">
      {/* ── Main Card: Health Score + KPIs ── */}
      <div className="rounded-xl dash-card overflow-hidden overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
            {/* ── Health Score (left/top) ── */}
            {healthScore && (
              <div className="flex flex-col items-center mx-auto sm:mx-0 flex-shrink-0">
                <div className={cn('relative w-20 h-20 sm:w-24 sm:h-24 rounded-full', healthGlowClass, 'shadow-lg')}>
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none"
                      stroke={healthColor}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${(healthScore.score / 100) * 213.6} 213.6`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('text-xl sm:text-2xl font-bold tabular-nums', healthColorClass)}>{healthScore.score}</span>
                    <span className="text-[8px] sm:text-[10px] text-muted-foreground font-medium">SCORE</span>
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs font-semibold text-foreground mt-2.5">Health Score</p>
                {/* Breakdown */}
                <div className="w-full mt-3 space-y-2 px-1">
                  {healthScore.breakdown.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate flex-1">{item.label}</span>
                      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700',
                            item.score >= 80 ? 'bg-emerald-500/60' : item.score >= 50 ? 'bg-amber-500/60' : 'bg-red-500/60'
                          )}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <span className={cn('text-[9px] sm:text-[10px] font-bold tabular-nums w-5 text-right flex-shrink-0',
                        item.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : item.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {item.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Divider (vertical on desktop) ── */}
            {healthScore && <div className="hidden sm:block w-px bg-border self-stretch flex-shrink-0" />}
            {healthScore && <div className="sm:hidden h-px bg-border" />}

            {/* ── 4 KPI Metrics (right/bottom) ── */}
            <div className="flex-1 grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Proyeksi Profit */}
              <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-500/15 flex items-center justify-center">
                    <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Proyeksi Profit</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
                  {formatCompactCurrency(analytics?.forecast.projectedProfit || 0)}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">Sisa {analytics?.forecast.daysRemaining} hari</span>
                  {analytics?.forecast.profitChange !== undefined && !isNaN(analytics?.forecast.profitChange) && (
                    <span className={cn('text-[9px] sm:text-[10px] font-semibold flex items-center gap-0.5',
                      analytics?.forecast.profitChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {analytics?.forecast.profitChange >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {analytics?.forecast.profitChange >= 0 ? '+' : ''}{analytics?.forecast.profitChange.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Profit Bulan Ini */}
              <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-violet-500/15 flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Profit Bulan Ini</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
                  {formatCompactCurrency(analytics?.forecast.currentMonthProfit || 0)}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">{analytics?.forecast.daysPassed}/{analytics?.forecast.daysInMonth} hari</span>
                </div>
              </div>

              {/* Volume Bulan Ini */}
              <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-amber-500/15 flex items-center justify-center">
                    <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Volume Bulan Ini</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
                  {formatCompactCurrency(analytics?.forecast.currentMonthVolume || 0)}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">{analytics?.feeAnalysis.totalTransactions} transaksi</span>
                </div>
              </div>

              {/* Net Margin */}
              <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-cyan-500/15 flex items-center justify-center">
                    <Percent className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Net Margin</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
                  {(analytics?.feeAnalysis.avgMarginPercent || 0).toFixed(2)}%
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">Rata-rata margin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* Profit Trend Chart */}
        <div className="rounded-xl dash-card overflow-hidden">
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
              Tren Profit 7 Hari
            </h3>
          </div>
          <div className="px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2">
            {analytics && analytics.dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={150} className="sm:h-[220px]">
                <AreaChart data={analytics.dailyTrends}>
                  <defs>
                    <linearGradient id="colorProfitDark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => {
                      if (v >= 1000000000000) return `${(v / 1000000000000).toFixed(0)}T`;
                      if (v >= 1000000000) return `${(v / 1000000000).toFixed(0)}M`;
                      if (v >= 1000000) return `${(v / 1000000).toFixed(0)}jt`;
                      if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`;
                      return v.toString();
                    }}
                    width={38}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontSize: 12, fontWeight: 600 }}
                    contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)' }}
                  />
                  <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorProfitDark)" name="Profit" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[150px] sm:h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Activity className="w-8 h-8 opacity-30" />
                <p className="text-xs sm:text-sm">Belum ada data</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-xl dash-card overflow-hidden">
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
              <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600 dark:text-violet-400" />
              Distribusi Status
            </h3>
          </div>
          <div className="px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2">
            {statusChartData.length > 0 ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <ResponsiveContainer width="45%" height={130} className="sm:h-[200px]">
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
                    <Tooltip formatter={(value: number) => `${value} trx`} contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)' }} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 sm:space-y-2.5">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] sm:text-sm text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-[11px] sm:text-sm font-semibold tabular-nums text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[130px] sm:h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <PieChart className="w-8 h-8 opacity-30" />
                <p className="text-xs sm:text-sm">Belum ada data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Payment Type Performance + Peak Hours Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* Payment Type Performance */}
        <div className="rounded-xl dash-card overflow-hidden">
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
              Performa Metode Pembayaran
            </h3>
          </div>
          <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3 space-y-2.5">
            {analytics && analytics.paymentTypes.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {analytics.paymentTypes.map((pt) => {
                  const rateColor = pt.successRate >= 80 ? 'bg-emerald-500' : pt.successRate >= 50 ? 'bg-amber-500' : 'bg-red-500';
                  const rateTextColor = pt.successRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pt.successRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
                  return (
                    <div key={pt.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-medium text-foreground truncate">{pt.name}</span>
                        <span className={cn('text-[10px] sm:text-xs font-semibold tabular-nums', rateTextColor)}>
                          {pt.successRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', rateColor)}
                            style={{ width: `${Math.max(2, pt.successRate)}%` }}
                          />
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                          {pt.transactionCount} trx
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-24 flex flex-col items-center justify-center text-muted-foreground gap-1.5">
                <CreditCard className="w-6 h-6 opacity-30" />
                <p className="text-[11px] sm:text-xs">Belum ada data</p>
              </div>
            )}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="rounded-xl dash-card overflow-hidden">
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600 dark:text-yellow-400" />
              Jam Puncak Transaksi
            </h3>
          </div>
          <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
            {sortedPeakHours.length > 0 ? (
              <div className="space-y-2">
                {sortedPeakHours.map((ph, idx) => (
                  <div key={ph.hour} className="flex items-center gap-2.5">
                    {/* Rank badge */}
                    <div className={cn(
                      'w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-bold flex-shrink-0',
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : idx === 1 ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'
                    )}>
                      {idx + 1}
                    </div>
                    {/* Hour label */}
                    <span className="text-[11px] sm:text-xs font-mono text-foreground w-10 sm:w-12 flex-shrink-0">
                      {String(ph.hour).padStart(2, '0')}:00
                    </span>
                    {/* Bar */}
                    <div className="flex-1 h-2 sm:h-2.5 bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-yellow-500/80 to-orange-500/80 transition-all duration-500"
                        style={{ width: `${(ph.count / maxPeakCount) * 100}%` }}
                      />
                    </div>
                    {/* Count */}
                    <span className="text-[10px] sm:text-xs font-semibold tabular-nums text-foreground w-8 text-right flex-shrink-0">
                      {ph.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-24 flex flex-col items-center justify-center text-muted-foreground gap-1.5">
                <Zap className="w-6 h-6 opacity-30" />
                <p className="text-[11px] sm:text-xs">Belum ada data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Fee Summary Card ── */}
      <div className="rounded-xl dash-card overflow-hidden">
        <div className="px-3 pt-3 sm:px-4 sm:pt-4">
          <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 dark:text-cyan-400" />
            Ringkasan Fee
          </h3>
        </div>
        <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
          <div className="rounded-lg border border-border overflow-hidden">
            {feeRows.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  'flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5',
                  i < feeRows.length - 1 && 'border-b border-border',
                  i === feeRows.length - 1 && 'bg-muted/30',
                  i % 2 !== 0 && i < feeRows.length - 1 && 'bg-muted/20'
                )}
              >
                <span className="text-[11px] sm:text-sm text-muted-foreground">{row.label}</span>
                <span className={cn('text-[11px] sm:text-sm font-semibold tabular-nums', row.color)}>
                  {row.isText ? row.value : formatCompactCurrency(row.value as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action Required ── */}
      {(analytics?.statusCounts.pending || 0) > 0 || (analytics?.statusCounts.verification || 0) > 0 ? (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/20 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300">Perlu Tindakan</p>
                <p className="text-[10px] sm:text-xs text-amber-600/70 dark:text-amber-400/60 truncate">
                  {(analytics?.statusCounts.pending || 0) > 0 && `${analytics?.statusCounts.pending} pending`}
                  {(analytics?.statusCounts.pending || 0) > 0 && (analytics?.statusCounts.verification || 0) > 0 && ' · '}
                  {(analytics?.statusCounts.verification || 0) > 0 && `${analytics?.statusCounts.verification} verifikasi`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {(analytics?.statusCounts.pending || 0) > 0 && (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-500" />
                  <span className="text-[10px] sm:text-xs font-medium text-orange-600 dark:text-orange-400">{analytics?.statusCounts.pending}</span>
                </div>
              )}
              {(analytics?.statusCounts.verification || 0) > 0 && (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500" />
                  <span className="text-[10px] sm:text-xs font-medium text-violet-600 dark:text-violet-400">{analytics?.statusCounts.verification}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function formatCompactCurrency(value: number): string {
  if (value >= 1000000000000) return `Rp ${(value / 1000000000000).toFixed(1).replace(/\.0$/, '')}T`;
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
  if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ──────────────────────────────────────────
// Transaction Card — left accent bar, clean layout
// ──────────────────────────────────────────
function TxCard({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;

  return (
    <Card
      className="rounded-xl border bg-card shadow-none overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Left accent bar */}
          <div className={cn('w-[3px] flex-shrink-0 rounded-l-xl', config.barColor)} />

          <div className="flex-1 min-w-0 p-3 sm:p-3.5">
            {/* Top row: order ID + status badge */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-mono text-[11px] sm:text-xs text-muted-foreground truncate">{tx.orderId}</p>
              <Badge className={cn("text-[9px] sm:text-[10px] capitalize px-2 py-0.5 rounded-full", config.color)}>
                {tx.status}
              </Badge>
            </div>

            {/* Customer name */}
            <p className="text-sm font-semibold truncate mb-1.5">{tx.customer?.name}</p>

            {/* Bottom: payment type + owner profit */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground truncate">
                {tx.paymentType?.name} · {tx.methodTransaction}
              </p>
              <p className="text-sm font-bold text-primary flex-shrink-0 tabular-nums bg-primary/5 px-2 py-0.5 rounded-md">
                +{formatCurrency(tx.ownerProfit)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer bar */}
        <div className="flex items-center justify-between px-3 sm:px-3.5 py-2 bg-muted/30 border-t border-border/60 text-[10px] sm:text-[11px]">
          <span className="text-muted-foreground truncate flex items-center gap-1.5">
            <span className="font-semibold text-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">{formatCurrency(tx.nominal)}</span>
            <span className="bg-muted/60 px-1.5 py-0.5 rounded">{formatDate(tx.createdAt)}</span>
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {tx.marketplace && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 flex items-center gap-0.5 rounded-md">
                <Store className="w-2.5 h-2.5" />
                <span className="truncate max-w-[50px] sm:max-w-none">{tx.marketplace.name}</span>
              </Badge>
            )}
            {tx.partner && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 truncate max-w-[50px] sm:max-w-none rounded-md">
                {tx.partner.name}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────
// Loading State
// ──────────────────────────────────────────
function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-4 space-y-4 pb-20 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-10 rounded-xl" />
      <div className="space-y-2">{[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-stretch">
            <Skeleton className="w-[3px] rounded-l-xl" />
            <div className="flex-1 p-3.5 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      ))}</div>
    </div>
  );
}

// ──────────────────────────────────────────
// Bank list for dropdown
// ──────────────────────────────────────────
const BANK_LIST = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon',
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

// ──────────────────────────────────────────
// New Transaction Dialog
// ──────────────────────────────────────────
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

    let feePercent = form.methodTransaction === 'Online' ? pt.onlineFeePercent : pt.codFeePercent;
    const feeFlat = form.methodTransaction === 'Online' ? pt.onlineFeeFlat : pt.codFeeFlat;

    if (feePercent > 100) {
      feePercent = feePercent / 1000;
    }

    let originalFee: number;
    if (nominal >= (pt.threshold || 0)) {
      originalFee = nominal * (feePercent / 100);
    } else {
      originalFee = feeFlat;
    }

    const ptDiscountPercent = pt.discountPercent || 0;
    const ptDiscountNominal = pt.discountNominal || 0;
    const ptMinTransaction = pt.minTransaction || 0;
    const meetsMin = ptMinTransaction <= 0 || nominal >= ptMinTransaction;

    let discountAmount = 0;
    let appliedDiscountPercent = 0;
    if (meetsMin && (ptDiscountPercent > 0 || ptDiscountNominal > 0)) {
      if (ptDiscountPercent > 0) {
        discountAmount = originalFee * (ptDiscountPercent / 100);
        appliedDiscountPercent = ptDiscountPercent;
      } else if (ptDiscountNominal > 0) {
        discountAmount = Math.min(ptDiscountNominal, originalFee);
        appliedDiscountPercent = originalFee > 0 ? (discountAmount / originalFee) * 100 : 0;
      }
    }

    const paymentFee = Math.max(0, originalFee - discountAmount);

    let platformFee = 0;
    let selectedMp: Marketplace | null = null;
    if (form.marketplaceId && form.marketplaceId !== 'none') {
      const mp = marketplaces.find(m => m.id === form.marketplaceId);
      if (mp) {
        let mpFeePercent = Number(mp.feePercent) || 0;
        const mpFeeFlat = Number(mp.feeFlat) || 0;
        if (mpFeePercent > 100) { mpFeePercent = mpFeePercent / 1000; }
        platformFee = nominal * (mpFeePercent / 100) + mpFeeFlat;
        selectedMp = mp;
      }
    }

    const netMargin = paymentFee - platformFee;
    const partnerRate = selectedPartner?.commission || 0;
    const partnerProfit = netMargin * partnerRate / 100;
    const ownerProfit = netMargin - partnerProfit;
    const totalReceived = nominal - paymentFee;

    return { paymentFee, originalFee, discountAmount, appliedDiscountPercent, platformFee, netMargin, partnerProfit, ownerProfit, totalReceived, feePercent, selectedMp, threshold: pt.threshold, meetsMin, ptMinTransaction, hasDiscount: discountAmount > 0 };
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
      const normalizedMarketplaceId = (form.marketplaceId && form.marketplaceId !== 'none')
        ? form.marketplaceId
        : null;

      const bankNameToSubmit = form.customerBankName === 'Lainnya' ? customBankName : form.customerBankName;

      // ── Phase 2: Generate idempotency key for this submission ──
      const idempotencyKey = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
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

        <form onSubmit={submit} className="space-y-4">
          {/* ── Customer Section ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Customer</Label>
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
                <div className="p-2.5 bg-muted/40 rounded-lg space-y-2 border border-border/60">
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
              <div className="p-2.5 bg-muted/40 rounded-lg space-y-2 border border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{selectedCust.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedCust.phone}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setSelectedCust(null); setForm(p => ({ ...p, customerId: '' })); }}>Ganti</Button>
                </div>
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

          {/* ── Nominal & Payment ── */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Transaksi</p>
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
          </div>

          <Separator />

          {/* ── Partner ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Partner (Opsional)</Label>
              <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => { setShowPartner(!showPartner); if (showPartner) { setSelectedPartner(null); setForm(p => ({ ...p, partnerId: '' })); } }}>{showPartner ? 'Hapus' : '+ Tambah'}</Button>
            </div>
            {showPartner && (
              selectedPartner ? (
                <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border border-border/60">
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
          </div>

          {/* ── Real-time Calculation Card ── */}
          {calc && form.nominal && (
            <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Calculator className="w-3.5 h-3.5" /> Kalkulasi Real-time
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(form.nominal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee ({calc.feePercent}%):</span>
                  <span className="text-red-600">{calc.hasDiscount ? <><s className="text-muted-foreground/50 mr-0.5">{formatCurrency(calc.originalFee)}</s>{formatCurrency(calc.paymentFee)}</> : `-${formatCurrency(calc.paymentFee)}`}</span>
                </div>
              </div>

              {calc.hasDiscount && (
                <div className="flex items-center justify-between text-[11px] p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">Diskon {calc.appliedDiscountPercent.toFixed(1)}%</span>
                  </div>
                  <span className="text-emerald-600 font-semibold">-{formatCurrency(calc.discountAmount)}</span>
                </div>
              )}

              {!calc.meetsMin && calc.ptMinTransaction > 0 && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Info className="w-2.5 h-2.5" />
                  Min. {formatCurrency(calc.ptMinTransaction)} untuk diskon
                </div>
              )}

              {calc.platformFee > 0 && calc.selectedMp && (
                <div className="flex items-center justify-between text-[11px] p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-1">
                    <Store className="w-3 h-3 text-orange-600" />
                    <span className="text-orange-700 dark:text-orange-400 font-medium">{calc.selectedMp.name}</span>
                    <Badge variant="outline" className="text-[9px] h-3.5">{calc.selectedMp.feePercent}%</Badge>
                  </div>
                  <span className="text-red-600 font-semibold">-{formatCurrency(calc.platformFee)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Diterima Customer:</span>
                <span className="font-bold text-primary">{formatCurrency(calc.totalReceived)}</span>
              </div>

              <div className="flex justify-between text-xs p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Profit Anda:</span>
                </div>
                <span className="font-bold text-emerald-600">+{formatCurrency(calc.ownerProfit)}</span>
              </div>

              {selectedPartner && calc.partnerProfit > 0 && (
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Profit Partner ({selectedPartner.name}):</span>
                  <span className="text-cyan-600 font-medium">+{formatCurrency(calc.partnerProfit)}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" className="w-full bg-primary text-primary-foreground h-9 font-medium hover:bg-primary/90" disabled={loading || (!isNewCust && !selectedCust) || !form.nominal || !form.paymentTypeId}>
              {loading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Proses...</> : <><Check className="w-3 h-3 mr-1" /> Buat (Process)</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────
// Transaction Detail Dialog Content
// ──────────────────────────────────────────
function TxDetailDialogContent({ tx, onUpdate, onDelete, updating }: {
  tx: Transaction;
  onUpdate: (id: string, status: string, notes?: string, mp?: string, link?: string, nominal?: number, recalculate?: boolean, partnerId?: string, discountPercent?: number, discountNominal?: number) => void;
  onDelete: (id: string) => void;
  updating: boolean;
}) {
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

  const calculatedPreview = useMemo(() => {
    if (!editNominal) return null;

    const newNominal = parseFloat(nominal);
    if (isNaN(newNominal) || newNominal <= 0) return null;

    if (newNominal === tx.nominal) return null;

    const isOnline = tx.methodTransaction === 'Online';
    let feePercent = isOnline ? (tx.paymentType?.onlineFeePercent || 0) : (tx.paymentType?.codFeePercent || 0);
    const feeFlat = isOnline ? (tx.paymentType?.onlineFeeFlat || 0) : (tx.paymentType?.codFeeFlat || 0);
    const threshold = tx.paymentType?.threshold || 1000000;

    if (feePercent > 100) {
      feePercent = feePercent / 1000;
    }

    let paymentFee: number;
    if (newNominal >= threshold) {
      paymentFee = newNominal * (feePercent / 100);
    } else {
      paymentFee = feeFlat;
    }

    let platformFee = 0;
    if (tx.marketplace) {
      let mpFeePercent = tx.marketplace.feePercent || 0;
      const mpFeeFlat = tx.marketplace.feeFlat || 0;
      if (mpFeePercent > 100) {
        mpFeePercent = mpFeePercent / 1000;
      }
      platformFee = newNominal * (mpFeePercent / 100) + mpFeeFlat;
    }

    const netMargin = paymentFee - platformFee;
    const partnerRate = tx.partner?.commission || 0;
    const partnerProfit = netMargin * (partnerRate / 100);
    const ownerProfit = netMargin - partnerProfit;
    const totalReceived = newNominal - paymentFee;

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

  const profitPreview = useMemo(() => {
    if (status !== 'verification') return null;

    const selectedMp = marketplaces.find(m => m.id === marketplace);
    const currentPlatformFee = tx.platformFee || 0;

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
    const nominalChanged = editNominal && parseFloat(nominal) !== tx.nominal;
    const newNominal = nominalChanged ? parseFloat(nominal) : undefined;

    const effectivePartnerId = partnerChanged ? selectedPartnerId : undefined;
    let discountPercent: number | undefined;
    let discountNominal: number | undefined;
    if (discountValue) {
      const val = parseFloat(discountValue);
      if (!isNaN(val) && val > 0) {
        if (discountType === 'percent') {
          discountPercent = Math.min(val, 100);
        } else {
          discountNominal = val;
        }
      }
    }
    onUpdate(tx.id, status, notes, marketplace, transactionLink, newNominal, nominalChanged, effectivePartnerId, discountPercent, discountNominal);
  };

  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

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
    status === 'verification';

  const discountPreview = useMemo(() => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return null;

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

    // P0 hotfix: clamp final fee to >= 0 (mirrors calculateTransaction line 216).
    // Previously this was `originalPaymentFee - discountAmount` with no clamp,
    // which could go negative if discount > gross fee.
    const newPaymentFee = Math.max(0, originalPaymentFee - discountAmount);
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
    <Tabs value={discountTab} onValueChange={setDiscountTab} className="w-full min-w-0 flex flex-col">
      {/* ── Header: Status + Order ID ── */}
      <div className="px-4 pt-3 pb-2 pr-12 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold", config.color)}>
            <StatusIcon className={cn("w-3 h-3", tx.status === 'process' && "animate-spin")} />
            <span className="capitalize">{tx.status}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(tx.orderId);
              toast.success('Order ID disalin');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted transition-colors"
            title="Salin Order ID"
          >
            <span className="text-[10px] font-mono text-muted-foreground">{tx.orderId}</span>
            <Copy className="w-2.5 h-2.5 text-muted-foreground/60" />
          </button>
        </div>
      </div>

      {/* ── Segmented Tab Control ── */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
          {[
            { value: 'detail', label: 'Detail', icon: Info },
            { value: 'aksi', label: 'Aksi', icon: Zap },
            { value: 'diskon', label: 'Diskon', icon: Percent, disabled: !canDiscount },
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = discountTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => !('disabled' in tab && tab.disabled) && setDiscountTab(tab.value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : ('disabled' in tab && tab.disabled)
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground/70"
                )}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Contents ── */}
      <div className="overflow-y-auto overflow-x-hidden hide-scrollbar px-4 min-w-0 flex-1" style={{ maxHeight: 'calc(85vh - 170px)' }}>

        {/* ══════════════════════════════════════ */}
        {/* TAB 1: DETAIL */}
        {/* ══════════════════════════════════════ */}
        <TabsContent value="detail" className="mt-0 pb-4 space-y-3 min-w-0">
          {/* ── Financial Summary Card ── */}
          <div className="rounded-xl dash-card overflow-hidden p-4">
            {/* Nominal */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Nominal</p>
                {editNominal ? (
                  <Input
                    type="number"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                    className="h-9 mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-muted border-border focus:border-emerald-500 rounded-lg"
                    placeholder="Masukkan nominal"
                  />
                ) : (
                  <p className="text-2xl font-bold tracking-tight mt-0.5 text-foreground">{formatCurrency(tx.nominal)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditNominal(!editNominal);
                  if (editNominal) setNominal(tx.nominal.toString());
                }}
                className={cn(
                  "p-2 rounded-lg transition-all flex-shrink-0",
                  editNominal
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title={editNominal ? 'Batal edit' : 'Edit nominal'}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fee breakdown */}
            <div className="space-y-2 py-2.5 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Payment Fee</span>
                <span className="text-[12px] font-semibold text-red-600 dark:text-red-400 tabular-nums">
                  {previewCalc && previewCalc.paymentFee !== tx.paymentFee ? (
                    <>
                      <span className="line-through text-muted-foreground/50 mr-1">{formatCurrency(tx.paymentFee)}</span>
                      -{formatCurrency(previewCalc.paymentFee)}
                    </>
                  ) : (
                    <span>-{formatCurrency(previewCalc?.paymentFee ?? tx.paymentFee)}</span>
                  )}
                </span>
              </div>
              {(previewCalc?.platformFee ?? tx.platformFee) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Platform Fee</span>
                  <span className="text-[12px] font-semibold text-red-600 dark:text-red-400 tabular-nums">
                    {previewCalc && previewCalc.platformFee !== tx.platformFee ? (
                      <>
                        <span className="line-through text-muted-foreground/50 mr-1">{formatCurrency(tx.platformFee)}</span>
                        -{formatCurrency(previewCalc.platformFee)}
                      </>
                    ) : (
                      <span>-{formatCurrency(previewCalc?.platformFee ?? tx.platformFee)}</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Profit */}
            <div className="pt-2.5 border-t border-border">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Profit Anda</p>
              {previewCalc && previewCalc.ownerProfit !== tx.ownerProfit ? (
                <div>
                  <p className="text-[10px] text-muted-foreground line-through">{formatCurrency(tx.ownerProfit)}</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(previewCalc.ownerProfit)}</p>
                </div>
              ) : (
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(previewCalc?.ownerProfit ?? tx.ownerProfit)}</p>
              )}
              {tx.partner && (
                <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border">
                  <Users className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                  <span className="text-[10px] text-muted-foreground">{tx.partner.name}</span>
                  <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-300 tabular-nums">
                    {previewCalc && previewCalc.partnerProfit !== tx.partnerProfit ? (
                      <>
                        <span className="line-through text-muted-foreground/50 mr-0.5">{formatCurrency(tx.partnerProfit)}</span>
                        +{formatCurrency(previewCalc.partnerProfit)}
                      </>
                    ) : (
                      <span>+{formatCurrency(previewCalc?.partnerProfit ?? tx.partnerProfit)}</span>
                    )}
                  </span>
                </div>
              )}
              {previewCalc && previewCalc.ownerProfit !== tx.ownerProfit && (
                <p className="text-[9px] text-muted-foreground/50 mt-1.5 italic flex items-center gap-1">
                  <Calculator className="w-2.5 h-2.5" /> Preview kalkulasi
                </p>
              )}

              {/* Dana Diterima Customer */}
              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Dana Diterima Customer</p>
                {previewCalc && previewCalc.totalReceived !== tx.totalReceived ? (
                  <p className="text-base font-bold text-cyan-600 dark:text-cyan-400">
                    <span className="text-[10px] text-muted-foreground line-through mr-1">{formatCurrency(tx.totalReceived)}</span>
                    {formatCurrency(previewCalc.totalReceived)}
                  </p>
                ) : (
                  <p className="text-base font-bold text-cyan-600 dark:text-cyan-400">{formatCurrency(previewCalc?.totalReceived ?? tx.totalReceived)}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Info Rows ── */}
          <div className="rounded-xl border divide-y divide-border/60 overflow-hidden">
            {/* Customer */}
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium">Customer</p>
                <p className="text-sm font-semibold truncate">{tx.customer?.name}</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0 self-center">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tx.customer?.phone || '');
                    toast.success('No. WA disalin');
                  }}
                  className="flex items-center justify-center w-8 h-8 hover:bg-muted rounded-md transition-colors"
                  title="Salin No. WA"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <a
                  href={`https://wa.me/${tx.customer?.phone?.replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 hover:bg-muted rounded-md transition-colors"
                  title="Buka WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                </a>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-emerald-500">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium">WhatsApp</p>
                <p className="text-sm font-mono font-medium">{tx.customer?.phone}</p>
              </div>
            </div>

            {/* Payment */}
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium">Payment</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold">{tx.paymentType?.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{tx.methodTransaction}</span>
                </div>
              </div>
            </div>

            {/* Bank Account */}
            {tx.customer?.bankName && tx.customer?.bankAccount && (
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium">Rekening</p>
                  <p className="text-sm font-semibold">{tx.customer.bankName} <span className="font-mono text-xs text-muted-foreground">{tx.customer.bankAccount}</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tx.customer.bankAccount || '');
                    toast.success('Disalin');
                  }}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors flex-shrink-0"
                  title="Salin nomor rekening"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Marketplace */}
            {tx.marketplace && (
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Store className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium">Marketplace</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{tx.marketplace.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium">{tx.marketplace.feePercent}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Partner */}
            {tx.partner && (
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-cyan-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium">Partner</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{tx.partner.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-medium">{tx.partner.commission}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium">Tanggal</p>
                <p className="text-sm font-medium">{formatDate(tx.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* WhatsApp Review Reminder - only for success status */}
          {tx.status === 'success' && tx.customer?.phone && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Star className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Minta Ulasan Customer</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Kirim pesan WhatsApp untuk mengingatkan customer memberi ulasan setelah transaksi selesai.
                  </p>
                </div>
              </div>
              <a
                href={`https://wa.me/${tx.customer.phone.replace(/^0/, '62')}?text=${encodeURIComponent(
                  `Halo ${tx.customer.name.split(' ')[0]}! 🎉\n\n` +
                  `Terima kasih sudah bertransaksi dengan kami!\n\n` +
                  `📋 Order ID: ${tx.orderId}\n` +
                  `💰 Nominal: ${formatCurrency(tx.nominal)}\n` +
                  `💳 Payment: ${tx.paymentType?.name}\n` +
                  `✅ Status: Selesai\n\n` +
                  `Kami sangat senang jika Anda bisa memberikan ulasan tentang pengalaman bertransaksi bersama kami. 😊\n\n` +
                  `📝 Tulis ulasan anda disini:\n${typeof window !== 'undefined' ? window.location.origin : ''}/track?orderId=${tx.orderId}\n\n` +
                  `Terima kasih! 🙏`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Kirim Reminder via WhatsApp
              </a>
            </div>
          )}

          {/* WhatsApp Share */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`🛒 Detail Transaksi\n\nOrder ID: ${tx.orderId}\nNominal: ${formatCurrency(tx.nominal)}\nPayment: ${tx.paymentType?.name}\nStatus: ${tx.status.toUpperCase()}\nCustomer: ${tx.customer?.name}\nTanggal: ${formatDate(tx.createdAt)}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Share ke WhatsApp
          </a>
        </TabsContent>

        {/* ══════════════════════════════════════ */}
        {/* TAB 2: AKSI */}
        {/* ══════════════════════════════════════ */}
        <TabsContent value="aksi" className="mt-0 pb-4 space-y-4 min-w-0">
          {/* ── Status Change ── */}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground mb-3 uppercase tracking-wider text-center">Ubah Status</p>
            <div className="relative flex items-center justify-between px-2">
              {/* Connecting line */}
              <div className="absolute left-5 right-5 top-1/2 h-px bg-border" />
              {/* Glow behind active icon */}
              <div className={cn(
                "absolute w-12 h-12 rounded-full blur-md -z-10 transition-all duration-300",
                status === 'pending' && "bg-orange-400/20",
                status === 'verification' && "bg-violet-400/20",
                status === 'process' && "bg-cyan-400/20",
                status === 'success' && "bg-emerald-400/20",
                status === 'failed' && "bg-red-400/20",
              )} />
              {[
                { v: 'pending', l: 'Pending', icon: Clock, bg: 'bg-orange-500', ring: 'ring-orange-500/20' },
                { v: 'verification', l: 'Verifikasi', icon: AlertCircle, bg: 'bg-violet-500', ring: 'ring-violet-500/20' },
                { v: 'process', l: 'Proses', icon: Loader2, bg: 'bg-cyan-500', ring: 'ring-cyan-500/20' },
                { v: 'success', l: 'Sukses', icon: CheckCircle, bg: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
                { v: 'failed', l: 'Gagal', icon: XCircle, bg: 'bg-red-500', ring: 'ring-red-500/20' },
              ].map(s => {
                const Icon = s.icon;
                const isSelected = status === s.v;
                return (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => handleStatus(s.v)}
                    disabled={updating}
                    title={s.l}
                    className={cn(
                      "relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all flex-shrink-0 border-2",
                      isSelected
                        ? cn(s.bg, 'text-white shadow-lg ring-2', s.ring, 'border-transparent scale-110')
                        : "bg-background border-border hover:border-border/80 text-muted-foreground hover:text-foreground shadow-sm"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", !isSelected && "opacity-40", s.v === 'process' && isSelected && "animate-spin")} />
                  </button>
                );
              })}
            </div>
            {/* Labels row */}
            <div className="flex justify-between px-2 mt-1.5">
              {[
                { v: 'pending', l: 'Pending', color: 'text-orange-500' },
                { v: 'verification', l: 'Verifikasi', color: 'text-violet-500' },
                { v: 'process', l: 'Proses', color: 'text-cyan-500' },
                { v: 'success', l: 'Sukses', color: 'text-emerald-500' },
                { v: 'failed', l: 'Gagal', color: 'text-red-500' },
              ].map(s => (
                <span
                  key={s.v}
                  className={cn(
                    "w-10 text-center text-[8px] font-medium transition-colors",
                    status === s.v ? s.color : "text-transparent"
                  )}
                >
                  {s.l}
                </span>
              ))}
            </div>
          </div>

          {/* ── Marketplace (when verification) ── */}
          {status === 'verification' && (
            <div className="rounded-xl border bg-muted/20 p-3 space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3 h-3" /> Marketplace
              </p>
              <Select value={marketplace} onValueChange={setMarketplace}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
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
                <div className="space-y-2 text-[11px]">
                  {/* Owner profit preview */}
                  <div className="rounded-lg bg-muted/30 border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-muted-foreground flex items-center gap-1.5 text-[10px]">
                        <PiggyBank className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Profit Owner
                      </p>
                      {profitPreview.profitChange !== 0 && (
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full",
                          profitPreview.profitChange >= 0
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-600 dark:text-red-400"
                        )}>
                          {profitPreview.profitChange >= 0 ? '+' : ''}{formatCompactCurrency(profitPreview.profitChange)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Saat ini</p>
                        <p className="font-bold text-sm tabular-nums">{formatCompactCurrency(profitPreview.currentOwnerProfit)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Baru</p>
                        <p className={cn(
                          "font-bold text-sm tabular-nums",
                          profitPreview.profitChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}>{formatCompactCurrency(profitPreview.newOwnerProfit)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Partner profit preview */}
                  {tx.partner && profitPreview.currentPartnerProfit !== undefined && (
                    <div className="rounded-lg bg-violet-500/5 border border-violet-500/10 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-muted-foreground flex items-center gap-1.5 text-[10px]">
                          <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /> Profit Partner
                          <span className="text-[9px] text-violet-600/60 dark:text-violet-400/60">({tx.partner.name})</span>
                        </p>
                        {profitPreview.newPartnerProfit !== undefined && (
                          <span className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded-full",
                            (profitPreview.newPartnerProfit - profitPreview.currentPartnerProfit) >= 0
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/15 text-red-600 dark:text-red-400"
                          )}>
                            {(profitPreview.newPartnerProfit - profitPreview.currentPartnerProfit) >= 0 ? '+' : ''}
                            {formatCompactCurrency(profitPreview.newPartnerProfit - profitPreview.currentPartnerProfit)}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] text-muted-foreground">Saat ini</p>
                          <p className="font-bold text-sm text-violet-600 dark:text-violet-300 tabular-nums">{formatCompactCurrency(profitPreview.currentPartnerProfit)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Baru</p>
                          <p className={cn(
                            "font-bold text-sm tabular-nums",
                            profitPreview.newPartnerProfit !== undefined &&
                            (profitPreview.newPartnerProfit - profitPreview.currentPartnerProfit) >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          )}>
                            {profitPreview.newPartnerProfit !== undefined ? formatCompactCurrency(profitPreview.newPartnerProfit) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {profitPreview.newPlatformFee > 0 && profitPreview.selectedMp && (
                    <div className="flex items-center justify-between text-[10px] px-3 py-2 bg-orange-500/10 rounded-lg border border-orange-500/15">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                        <span className="text-orange-600 dark:text-orange-300 font-medium">{profitPreview.selectedMp.name}</span>
                      </div>
                      <span className="text-red-600 dark:text-red-400 font-semibold tabular-nums">-{formatCompactCurrency(profitPreview.newPlatformFee)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Partner Selector ── */}
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Partner
              </p>
              {selectedPartnerId !== 'none' && (
                <button
                  type="button"
                  className="text-[9px] text-red-500 hover:text-red-600 font-medium"
                  onClick={() => { setSelectedPartnerId('none'); setPartnerChanged(true); }}
                >
                  Hapus
                </button>
              )}
            </div>
            {selectedPartnerId !== 'none' ? (
              (() => {
                const p = partners.find(x => x.id === selectedPartnerId) || tx.partner;
                return p ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.tier} &middot; Komisi {p.commission}%</p>
                    </div>
                    <button type="button" className="text-[10px] text-primary font-semibold hover:underline" onClick={() => { setSelectedPartnerId('none'); setPartnerChanged(true); }}>Ganti</button>
                  </div>
                ) : <p className="text-[10px] text-muted-foreground">Partner tidak ditemukan</p>;
              })()
            ) : (
              <div className="space-y-1.5">
                <Input placeholder="Cari partner..." value={searchPartner} onChange={e => setSearchPartner(e.target.value)} className="h-8 text-xs rounded-lg" />
                {searchPartner.length >= 1 ? (
                  <div className="max-h-24 overflow-y-auto space-y-0.5">
                    {partners.filter(p => p.name.toLowerCase().includes(searchPartner.toLowerCase())).slice(0, 5).map(p => (
                      <button key={p.id} type="button" onClick={() => { setSelectedPartnerId(p.id); setPartnerChanged(true); setSearchPartner(''); }} className="w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-[11px] font-medium">{p.name}</p>
                          <p className="text-[9px] text-muted-foreground">{p.tier} &middot; {p.commission}%</p>
                        </div>
                        <Check className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-1.5">Ketik nama partner untuk mencari...</p>
                )}
              </div>
            )}
          </div>

          {/* ── Link + Notes ── */}
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3" /> Link Transaksi
              </p>
              <Input
                type="url"
                value={transactionLink}
                onChange={e => setTransactionLink(e.target.value)}
                placeholder="https://contoh.com/transaksi..."
                className="h-9 text-xs rounded-lg"
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3 h-3" /> Catatan
              </p>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Catatan untuk customer/partner..."
                className="h-12 text-xs resize-none rounded-lg"
              />
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex gap-2 pt-3 border-t">
            <Button
              onClick={save}
              disabled={updating || !hasChanges}
              className="flex-1 h-10 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span className="ml-1.5">Simpan Perubahan</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete(tx.id)}
              disabled={updating}
              className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-red-500/15 border-red-200 dark:border-red-500/30"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════ */}
        {/* TAB 3: DISKON */}
        {/* ══════════════════════════════════════ */}
        <TabsContent value="diskon" className="mt-0 pb-4 space-y-3 min-w-0">
          {!canDiscount ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Tidak Bisa Diskon</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">Diskon hanya bisa diterapkan saat status <span className="font-semibold text-foreground">Pending</span> atau <span className="font-semibold text-foreground">Verifikasi</span></p>
            </div>
          ) : (
            <>
              {/* Warning */}
              {(tx.paymentType?.minTransaction ?? 0) > 0 && tx.nominal < (tx.paymentType?.minTransaction ?? 0) && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-[11px]">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">Nominal di bawah minimum</p>
                    <p className="text-amber-600/70 dark:text-amber-400/70 mt-0.5">Diskon {tx.paymentType?.name} hanya berlaku untuk transaksi ≥ {formatCompactCurrency(tx.paymentType?.minTransaction ?? 0)}</p>
                  </div>
                </div>
              )}

              {/* ── Fee Info Card ── */}
              <div className="rounded-xl dash-card overflow-hidden overflow-hidden">
                <div className="px-3.5 pt-3 pb-2">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Info Fee Saat Ini</p>
                </div>
                <div className="px-3.5 pb-3.5">
                  <div className="space-y-0 text-[11px] rounded-lg border border-border overflow-hidden">
                    <div className="flex justify-between items-center px-3 py-2">
                      <span className="text-muted-foreground">Payment Fee</span>
                      <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">-{formatCompactCurrency(tx.paymentFee)}</span>
                    </div>
                    {tx.platformFee > 0 && (
                      <div className="flex justify-between items-center px-3 py-2 border-t border-border bg-muted/20">
                        <span className="text-muted-foreground">Platform Fee <span className="text-muted-foreground/60">({tx.marketplace?.name})</span></span>
                        <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">-{formatCompactCurrency(tx.platformFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center px-3 py-2 border-t border-border bg-muted/30">
                      <span className="text-muted-foreground font-medium">Total Fee</span>
                      <span className="font-bold text-red-600 dark:text-red-300 tabular-nums">-{formatCompactCurrency(tx.paymentFee + tx.platformFee)}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2 border-t border-border">
                      <span className="text-muted-foreground">Net Margin</span>
                      <span className="font-semibold text-foreground tabular-nums">{formatCompactCurrency(tx.paymentFee - tx.platformFee)}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2 border-t border-border bg-muted/20">
                      <span className="text-muted-foreground">Customer Receives</span>
                      <span className="font-semibold text-foreground tabular-nums">{formatCompactCurrency(tx.totalReceived)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Discount Controls ── */}
              <div className="rounded-xl border bg-muted/20 p-3.5 space-y-3">
                {/* Discount Type Toggle */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Tipe Diskon</p>
                  <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
                    <button
                      type="button"
                      onClick={() => { setDiscountType('percent'); setDiscountValue(''); }}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all",
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
                        "flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all",
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
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    {discountType === 'percent' ? 'Nilai Diskon (%)' : 'Nilai Diskon (Rp)'}
                  </p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                      {discountType === 'percent' ? '%' : 'Rp'}
                    </span>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder="0"
                      className="h-11 text-base font-bold pl-10 rounded-xl tabular-nums"
                      min="0"
                      max={discountType === 'percent' ? '100' : undefined}
                    />
                  </div>
                  {discountType === 'percent' && discountValue && parseFloat(discountValue) > 100 && (
                    <p className="text-[9px] text-red-500 mt-1.5 font-medium">Maksimal 100%</p>
                  )}
                  {discountType === 'nominal' && discountPreview && parseFloat(discountValue) > discountPreview.originalPaymentFee && (
                    <p className="text-[9px] text-red-500 mt-1.5 font-medium">Maksimal {formatCompactCurrency(discountPreview.originalPaymentFee)}</p>
                  )}
                </div>
              </div>

              {/* Discount Preview */}
              {discountPreview && (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Preview Perhitungan</p>

                  {/* Fee comparison card */}
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3.5">
                    <div className="text-[11px] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Original Fee</span>
                        <span className="font-semibold tabular-nums text-foreground">{formatCompactCurrency(discountPreview.originalPaymentFee)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-500">
                        <span className="font-medium">Diskon ({discountPreview.effectiveDiscountPercent.toFixed(1)}%)</span>
                        <span className="font-bold tabular-nums">-{formatCompactCurrency(discountPreview.discountAmount)}</span>
                      </div>
                      <div className="border-t border-emerald-500/10 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">New Fee</span>
                          <span className="font-bold text-orange-600 dark:text-orange-500 tabular-nums">{formatCompactCurrency(discountPreview.newPaymentFee)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Results after discount */}
                  <div className="rounded-xl dash-card overflow-hidden overflow-hidden">
                    <div className="px-3.5 pt-3 pb-2">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Hasil Setelah Diskon</p>
                    </div>
                    <div className="px-3.5 pb-3.5">
                      <div className="space-y-0 text-[11px] rounded-lg border border-border overflow-hidden">
                        <div className="flex justify-between items-center px-3 py-2">
                          <span className="text-muted-foreground">Customer Receives</span>
                          <div className="text-right flex items-center gap-1.5">
                            <span className="line-through text-muted-foreground/40 tabular-nums text-[10px]">{formatCompactCurrency(discountPreview.originalTotalReceived)}</span>
                            <span className="font-bold text-foreground tabular-nums">{formatCompactCurrency(discountPreview.newTotalReceived)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 border-t border-border bg-muted/20">
                          <span className="text-muted-foreground">Net Margin</span>
                          <div className="text-right flex items-center gap-1.5">
                            <span className="line-through text-muted-foreground/40 tabular-nums text-[10px]">{formatCompactCurrency(discountPreview.originalNetMargin)}</span>
                            <span className="font-bold text-foreground tabular-nums">{formatCompactCurrency(discountPreview.newNetMargin)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 border-t border-border">
                          <span className="text-muted-foreground font-medium">Owner Profit</span>
                          <div className="text-right flex items-center gap-1.5">
                            <span className="line-through text-muted-foreground/40 tabular-nums text-[10px]">{formatCompactCurrency(discountPreview.originalOwnerProfit)}</span>
                            <span className={cn(
                              "font-bold tabular-nums",
                              discountPreview.newOwnerProfit >= discountPreview.originalOwnerProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            )}>{formatCompactCurrency(discountPreview.newOwnerProfit)}</span>
                          </div>
                        </div>
                        {tx.partner && (
                          <div className="flex justify-between items-center px-3 py-2 border-t border-border bg-muted/20">
                            <span className="text-muted-foreground">Partner Profit <span className="text-muted-foreground/60">({tx.partner.name})</span></span>
                            <div className="text-right flex items-center gap-1.5">
                              <span className="line-through text-muted-foreground/40 tabular-nums text-[10px]">{formatCompactCurrency(discountPreview.originalPartnerProfit)}</span>
                              <span className={cn(
                                "font-bold tabular-nums",
                                discountPreview.newPartnerProfit >= discountPreview.originalPartnerProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                              )}>{formatCompactCurrency(discountPreview.newPartnerProfit)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => { save(); }}
                    disabled={updating || !discountValue || parseFloat(discountValue) <= 0}
                    className="w-full h-11 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Percent className="w-3.5 h-3.5" />}
                    <span className="ml-1.5">Terapkan Diskon & Simpan</span>
                  </Button>
                </div>
              )}

              {!discountPreview && (
                <div className="text-center py-6">
                  <Calculator className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-[11px] text-muted-foreground/50">Masukkan nilai diskon untuk melihat preview perhitungan</p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}

// ──────────────────────────────────────────
// Transaction Detail Dialog Wrapper
// ──────────────────────────────────────────
function TxDetailDialog({ open, onOpenChange, tx, onUpdate, onDelete, updating }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx: Transaction | null;
  onUpdate: (id: string, status: string, notes?: string, mp?: string, link?: string, nominal?: number, recalculate?: boolean, partnerId?: string, discountPercent?: number, discountNominal?: number) => void;
  onDelete: (id: string) => void;
  updating: boolean;
}) {
  if (!tx) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Detail Transaksi {tx.orderId}</DialogTitle>
        </DialogHeader>
        <TxDetailDialogContent key={tx.id} tx={tx} onUpdate={onUpdate} onDelete={onDelete} updating={updating} />
      </DialogContent>
    </Dialog>
  );
}
