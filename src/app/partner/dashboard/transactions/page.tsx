'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SimplePagination } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import {
  Wallet, ArrowRightLeft, Search, RefreshCw,
  Loader2, AlertCircle, CheckCircle, XCircle, User, CreditCard, Store,
  MessageSquare, Copy, Edit3, Clock, ArrowUp, ArrowDown, Plus,
  Sparkles, Calculator, Building2, Save, Send, TrendingUp, Activity, Info,
  DollarSign, ShoppingBag, BarChart3, PieChart, Layers, Star,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CitySearch } from '@/components/ui/city-search';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell,
} from 'recharts';

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

interface Customer {
  id: string;
  name: string;
  phone: string;
  city?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
}

interface PaymentType {
  id: string;
  name: string;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  isActive: boolean;
}

interface Marketplace {
  id: string;
  name: string;
  feePercent: number;
  feeFlat: number;
}

const STATUS_CONFIG = {
  pending: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock, iconColor: 'text-orange-600', barColor: 'bg-orange-500', dotColor: 'bg-orange-500' },
  verification: { color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', icon: AlertCircle, iconColor: 'text-violet-600', barColor: 'bg-violet-500', dotColor: 'bg-violet-500' },
  process: { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Loader2, iconColor: 'text-cyan-600', barColor: 'bg-cyan-500', dotColor: 'bg-cyan-500' },
  success: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: ArrowUp, iconColor: 'text-emerald-600', barColor: 'bg-emerald-500', dotColor: 'bg-emerald-500' },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: ArrowDown, iconColor: 'text-red-600', barColor: 'bg-red-500', dotColor: 'bg-red-500' },
};

const BANK_LIST = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon',
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

export default function PartnerTransactionsPage() {
  const router = useRouter();
  const { user, partner, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newTxOpen, setNewTxOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => { if (!hasHydrated) hydrate(); }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading) {
      if (!isAuthenticated) router.replace('/login');
      else if (user?.role === 'owner') router.replace('/owner/dashboard');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'partner') {
      fetchTransactions();
    }
  }, [isAuthenticated, hasHydrated, user, activeTab, currentPage]);

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

  const filtered = useMemo(() => transactions.filter(tx => {
    const q = searchQuery.toLowerCase();
    return tx.orderId?.toLowerCase().includes(q) || tx.customer?.name?.toLowerCase().includes(q) || tx.customer?.phone?.includes(q);
  }), [transactions, searchQuery]);

  // Calculate analytics from transactions
  const analytics = useMemo(() => {
    const totalVolume = transactions.reduce((sum, tx) => sum + tx.nominal, 0);
    const totalProfit = transactions.reduce((sum, tx) => sum + tx.partnerProfit, 0);
    const pendingCount = transactions.filter(tx => tx.status === 'pending').length;
    const successCount = transactions.filter(tx => tx.status === 'success').length;
    const processCount = transactions.filter(tx => tx.status === 'process' || tx.status === 'verification').length;
    const failedCount = transactions.filter(tx => tx.status === 'failed').length;

    // Group by date for chart (last 7 days)
    const last7Days: { [key: string]: { volume: number; profit: number; count: number } } = {};
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      last7Days[key] = { volume: 0, profit: 0, count: 0 };
    }

    transactions.forEach(tx => {
      const key = tx.createdAt.split('T')[0];
      if (last7Days[key]) {
        last7Days[key].volume += tx.nominal;
        last7Days[key].profit += tx.partnerProfit;
        last7Days[key].count += 1;
      }
    });

    const chartData = Object.entries(last7Days).map(([date, data]) => {
      const d = new Date(date);
      return {
        date,
        dayName: dayNames[d.getDay()],
        volume: data.volume,
        profit: data.profit,
        count: data.count,
      };
    });

    // Status distribution for pie chart
    const statusData = [
      { name: 'Sukses', value: successCount, color: '#10b981' },
      { name: 'Pending', value: pendingCount, color: '#f97316' },
      { name: 'Proses', value: processCount, color: '#06b6d4' },
      { name: 'Gagal', value: failedCount, color: '#ef4444' },
    ].filter(d => d.value > 0);

    return {
      totalTransactions: transactions.length,
      totalVolume,
      totalProfit,
      pendingCount,
      successCount,
      processCount,
      failedCount,
      chartData,
      statusData,
    };
  }, [transactions]);

  if (isLoading || !hasHydrated) return <LoadingState />;
  if (!isAuthenticated || user?.role !== 'partner') return null;

  return (
    <div className="min-h-screen bg-background dashboard-mesh">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Transaksi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Transaksi Saya</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">Riwayat transaksi partner</p>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isRefreshing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={() => setNewTxOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground rounded-xl h-9 px-3.5 text-xs font-medium hover:bg-primary/90 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah</span>
          </Button>
          <Button
            onClick={() => fetchTransactions()}
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 rounded-lg"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-primary/15 flex items-center justify-center">
                <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
              </div>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Trx</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">{analytics.totalTransactions}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Total transaksi</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-500/15 flex items-center justify-center">
                <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Profit</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight truncate">{formatCurrency(analytics.totalProfit)}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Total profit</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-violet-500/15 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Volume</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight truncate">{formatCurrency(analytics.totalVolume)}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Total volume</span>
            </div>
          </div>

          <div className={cn(
            "rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50",
            analytics.pendingCount > 0 && "ring-2 ring-orange-300 dark:ring-orange-700"
          )}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={cn(
                "w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center",
                analytics.pendingCount > 0 
                  ? "bg-amber-500/15" 
                  : "bg-muted"
              )}>
                <Clock className={cn(
                  "w-3 h-3 sm:w-3.5 sm:h-3.5",
                  analytics.pendingCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                )} />
              </div>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Pending</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">{analytics.pendingCount}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Menunggu proses</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Volume Chart */}
          <div className="rounded-xl dash-card overflow-hidden">
            <div className="px-3 pt-3 sm:px-4 sm:pt-4">
              <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                Volume 7 Hari
              </h3>
            </div>
            <div className="px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={analytics.chartData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="dayName" 
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} 
                    stroke="var(--border)" 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} 
                    stroke="var(--border)" 
                    width={30}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      if (v >= 1000000) return `${(v/1000000).toFixed(0)}jt`;
                      if (v >= 1000) return `${(v/1000).toFixed(0)}rb`;
                      return v.toString();
                    }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontSize: 10 }}
                    contentStyle={{ fontSize: 9, borderRadius: 6, backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#8b5cf6" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorVolume)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="rounded-xl dash-card overflow-hidden">
            <div className="px-3 pt-3 sm:px-4 sm:pt-4">
              <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
                <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                Status Transaksi
              </h3>
            </div>
            <div className="px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Pie Chart */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={analytics.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={35}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {analytics.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="flex-1 space-y-2">
                  {analytics.statusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: item.color }} 
                        />
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2.5 rounded-full overflow-hidden flex bg-muted mt-3">
                {analytics.statusData.map((item) => (
                  <div 
                    key={item.name}
                    className="h-full" 
                    style={{ 
                      width: `${(item.value / analytics.totalTransactions) * 100}%`,
                      backgroundColor: item.color 
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter - Skeleton Icon Style */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-3 sm:p-3.5 space-y-2.5">
        <div className="relative flex items-center justify-between px-1">
          {/* Connecting line */}
          <div className="absolute left-6 right-6 top-1/2 h-px bg-border" />
          {/* Glow behind active */}
          <div className={cn(
            "absolute w-12 h-12 rounded-full blur-lg -z-10 transition-all duration-300",
            activeTab === 'all' && "bg-primary/20",
            activeTab === 'pending' && "bg-orange-400/20",
            activeTab === 'verification' && "bg-violet-400/20",
            activeTab === 'process' && "bg-cyan-400/20",
            activeTab === 'success' && "bg-emerald-400/20",
            activeTab === 'failed' && "bg-red-400/20",
          )} />
          {[
            { v: 'all', l: 'Semua', icon: Layers, bg: 'bg-primary', ring: 'ring-primary/20' },
            { v: 'pending', l: 'Pending', icon: Clock, bg: 'bg-orange-500', ring: 'ring-orange-500/20' },
            { v: 'verification', l: 'Verif', icon: AlertCircle, bg: 'bg-violet-500', ring: 'ring-violet-500/20' },
            { v: 'process', l: 'Proses', icon: Loader2, bg: 'bg-cyan-500', ring: 'ring-cyan-500/20' },
            { v: 'success', l: 'Sukses', icon: CheckCircle, bg: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
            { v: 'failed', l: 'Gagal', icon: XCircle, bg: 'bg-red-500', ring: 'ring-red-500/20' },
          ].map(s => {
            const Icon = s.icon;
            const isActive = activeTab === s.v;
            return (
              <button
                key={s.v}
                onClick={() => setActiveTab(s.v)}
                className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all flex-shrink-0 border-2",
                  isActive
                    ? cn(s.bg, 'text-white shadow-lg ring-2', s.ring, 'border-transparent scale-110')
                    : "bg-background border-border hover:border-border/80 text-muted-foreground hover:text-foreground shadow-sm"
                )}
              >
                <Icon className={cn("w-4 h-4", !isActive && "opacity-40", s.v === 'process' && isActive && "animate-spin")} />
              </button>
            );
          })}
        </div>
        {/* Labels */}
        <div className="flex justify-between px-1">
          {[
            { v: 'all', l: 'Semua', color: 'text-primary' },
            { v: 'pending', l: 'Pending', color: 'text-orange-500' },
            { v: 'verification', l: 'Verif', color: 'text-violet-500' },
            { v: 'process', l: 'Proses', color: 'text-cyan-500' },
            { v: 'success', l: 'Sukses', color: 'text-emerald-500' },
            { v: 'failed', l: 'Gagal', color: 'text-red-500' },
          ].map(s => (
            <span
              key={s.v}
              className={cn(
                "w-10 text-center text-[8px] font-medium transition-colors",
                activeTab === s.v ? s.color : "text-transparent"
              )}
            >
              {s.l}
            </span>
          ))}
        </div>
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
          <>
            <div className="rounded-xl border border-border/50 bg-card/50 p-3 sm:p-3.5 space-y-2.5">
              <div className="flex justify-between px-1">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="w-9 h-9 rounded-full flex-shrink-0" />
                ))}
              </div>
            </div>
            {[...Array(5)].map((_, i) => (
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
            ))}
          </>
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

      {/* New Transaction Dialog */}
      <NewTxDialog
        open={newTxOpen}
        onOpenChange={setNewTxOpen}
        onCreated={() => { fetchTransactions(); }}
        partnerId={partner?.id || ''}
        commission={partner?.commission || 0}
      />

      {/* Detail Dialog */}
      <TxDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        tx={selectedTransaction}
        onUpdate={fetchTransactions}
      />
  </div>
</div>
  );
}

// New Transaction Dialog for Partner
function NewTxDialog({ open, onOpenChange, onCreated, partnerId, commission }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  partnerId: string;
  commission: number;
}) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [searchCust, setSearchCust] = useState('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [isNewCust, setIsNewCust] = useState(false);
  const [customBankName, setCustomBankName] = useState('');

  const [form, setForm] = useState({
    customerId: '', customerName: '', customerPhone: '', customerCity: '',
    customerBankName: '', customerBankAccount: '', customerBankHolder: '',
    nominal: '', paymentTypeId: '', methodTransaction: 'Online',
  });

  // Real-time calculation
  const calc = useMemo(() => {
    const nominal = parseFloat(form.nominal) || 0;
    if (!nominal || !form.paymentTypeId) return null;
    const pt = paymentTypes.find(p => p.id === form.paymentTypeId);
    if (!pt) return null;

    let feePercent = form.methodTransaction === 'Online' ? pt.onlineFeePercent : pt.codFeePercent;
    const feeFlat = form.methodTransaction === 'Online' ? pt.onlineFeeFlat : pt.codFeeFlat;
    
    if (feePercent > 100) feePercent = feePercent / 1000;
    
    let originalFee: number;
    if (nominal >= (pt.threshold || 0)) {
      originalFee = nominal * (feePercent / 100);
    } else {
      originalFee = feeFlat;
    }

    // Apply discount from payment type
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

    const netMargin = paymentFee - platformFee;
    const partnerProfit = netMargin * commission / 100;
    const ownerProfit = netMargin - partnerProfit;
    const totalReceived = nominal - paymentFee;

    return { paymentFee, originalFee, discountAmount, appliedDiscountPercent, platformFee, netMargin, partnerProfit, ownerProfit, totalReceived, feePercent, threshold: pt.threshold, meetsMin, ptMinTransaction, hasDiscount: discountAmount > 0 };
  }, [form, paymentTypes, commission]);

  useEffect(() => { if (open) { fetchPT(); } }, [open]);
  useEffect(() => { if (searchCust.length >= 2 && !isNewCust) searchC(); }, [searchCust, isNewCust]);

  const fetchPT = async () => { const res = await fetch('/api/payment-types?all=true'); const d = await res.json(); if (d.success) setPaymentTypes(d.data.filter((p: PaymentType) => p.isActive)); };
  const searchC = async () => { const res = await fetch(`/api/customers?search=${searchCust}`); const d = await res.json(); if (d.success) setCustomers(d.data); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const bankNameToSubmit = form.customerBankName === 'Lainnya' ? customBankName : form.customerBankName;
      
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...form, 
          customerBankName: bankNameToSubmit,
          nominal: parseFloat(form.nominal), 
          marketplaceId: null, 
          partnerId: partnerId,
          isNewCustomer: isNewCust 
        }),
      });
      const d = await res.json();
      if (d.success) {
        onOpenChange(false);
        onCreated();
        setSelectedCust(null);
        setIsNewCust(false);
        setCustomBankName('');
        setForm({ customerId: '', customerName: '', customerPhone: '', customerCity: '', customerBankName: '', customerBankAccount: '', customerBankHolder: '', nominal: '', paymentTypeId: '', methodTransaction: 'Online' });
        toast.success('Transaksi dibuat (Status: Process)');
      } else toast.error(d.error || 'Gagal');
    } catch (e) { toast.error('Gagal'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[85vh]">
          <div className="p-4 sm:p-5 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-primary" />
                Transaksi Baru
              </DialogTitle>
              <DialogDescription className="text-xs">Buat transaksi dengan kalkulasi real-time</DialogDescription>
            </DialogHeader>

            <form onSubmit={submit} className="space-y-4">
              {/* Customer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Customer</Label>
                  <div className="flex gap-1">
                    <Button type="button" variant={!isNewCust ? 'default' : 'outline'} size="sm" className="rounded-lg h-8 text-xs font-medium px-3" onClick={() => { setIsNewCust(false); setSelectedCust(null); }}>Existing</Button>
                    <Button type="button" variant={isNewCust ? 'default' : 'outline'} size="sm" className="rounded-lg h-8 text-xs font-medium px-3" onClick={() => { setIsNewCust(true); setSelectedCust(null); }}>Baru</Button>
                  </div>
                </div>
                {isNewCust ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <Input placeholder="Nama" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} required className="h-9 text-xs rounded-lg" />
                      <Input placeholder="WA" value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} required className="h-9 text-xs rounded-lg" />
                      <CitySearch value={form.customerCity} onChange={(value) => setForm(p => ({ ...p, customerCity: value }))} placeholder="Kota" className="h-9" />
                    </div>
                    {/* Bank Account Fields */}
                    <div className="p-3 bg-muted/30 rounded-xl space-y-3 border border-border/60">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" /> Rekening (Opsional)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Select
                          value={form.customerBankName}
                          onValueChange={(value) => {
                            setForm(p => ({ ...p, customerBankName: value }));
                            if (value !== 'Lainnya') setCustomBankName('');
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs rounded-lg">
                            <SelectValue placeholder="Pilih Bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {BANK_LIST.map((bank) => (
                              <SelectItem key={bank} value={bank} className="text-xs">{bank}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input placeholder="No. Rekening" value={form.customerBankAccount} onChange={e => setForm(p => ({ ...p, customerBankAccount: e.target.value }))} className="h-9 text-xs rounded-lg" />
                      </div>
                      {form.customerBankName === 'Lainnya' && (
                        <Input placeholder="Ketik Nama Bank" value={customBankName} onChange={e => setCustomBankName(e.target.value)} className="h-9 text-xs rounded-lg" />
                      )}
                      <Input placeholder="Atas Nama" value={form.customerBankHolder} onChange={e => setForm(p => ({ ...p, customerBankHolder: e.target.value }))} className="h-9 text-xs rounded-lg" />
                    </div>
                  </div>
                ) : selectedCust ? (
                  <div className="p-3 bg-muted/30 rounded-xl space-y-2 border border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold">{selectedCust.name}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedCust.phone}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="rounded-lg h-8 text-xs font-medium" onClick={() => { setSelectedCust(null); setForm(p => ({ ...p, customerId: '' })); }}>Ganti</Button>
                    </div>
                    {selectedCust.bankName && selectedCust.bankAccount && (
                      <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground">{selectedCust.bankName}</p>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-mono font-medium truncate">{selectedCust.bankAccount}</p>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(selectedCust.bankAccount || ''); toast.success('No. rekening disalin'); }} className="p-0.5 hover:bg-muted/30 rounded transition-colors">
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                          {selectedCust.bankHolder && <p className="text-[10px] text-muted-foreground">a.n. {selectedCust.bankHolder}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Input placeholder="Cari nama/WA..." value={searchCust} onChange={e => setSearchCust(e.target.value)} className="h-9 text-xs rounded-lg" />
                    {customers.length > 0 && searchCust && (
                      <div className="absolute top-full left-0 right-0 bg-background border rounded-lg shadow-lg z-10 mt-1 max-h-32 overflow-y-auto">
                        {customers.map(c => (
                          <button key={c.id} type="button" className="w-full text-left p-2 hover:bg-muted/30 text-xs transition-colors" onClick={() => { setSelectedCust(c); setForm(p => ({ ...p, customerId: c.id })); setSearchCust(''); setCustomers([]); }}>
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
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nominal</Label><Input type="number" value={form.nominal} onChange={e => setForm(p => ({ ...p, nominal: e.target.value }))} required className="h-9 text-xs rounded-lg" /></div>
                <div><Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Payment Type</Label><Select value={form.paymentTypeId} onValueChange={v => setForm(p => ({ ...p, paymentTypeId: v }))}><SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{paymentTypes.map(pt => <SelectItem key={pt.id} value={pt.id} className="text-xs">{pt.name}</SelectItem>)}</SelectContent></Select></div>
              </div>

              <div>
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Metode</Label>
                <Select value={form.methodTransaction} onValueChange={v => setForm(p => ({ ...p, methodTransaction: v }))}>
                  <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="COD">COD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Calculation */}
              {calc && form.nominal && (
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary uppercase tracking-wider">
                      <Calculator className="w-3 h-3" /> Kalkulasi Real-time
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nominal:</span>
                        <span className="font-medium">{formatCurrency(parseFloat(form.nominal))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee ({calc.feePercent}%):</span>
                        <span className="text-red-600 dark:text-red-400">{calc.hasDiscount ? <><s className="text-muted-foreground/50 mr-0.5">{formatCurrency(calc.originalFee)}</s>{formatCurrency(calc.paymentFee)}</> : `-${formatCurrency(calc.paymentFee)}`}</span>
                      </div>
                    </div>
                    
                    {calc.hasDiscount && (
                      <div className="flex items-center justify-between text-[10px] p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-400">Diskon {calc.appliedDiscountPercent.toFixed(1)}%</span>
                        </div>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">-{formatCurrency(calc.discountAmount)}</span>
                      </div>
                    )}
                    
                    {!calc.meetsMin && calc.ptMinTransaction > 0 && (
                      <div className="text-[9px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Info className="w-2.5 h-2.5" />
                        Min. {formatCurrency(calc.ptMinTransaction)} untuk diskon
                      </div>
                    )}
                    
                    <Separator className="my-1" />
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Diterima Customer:</span>
                      <span className="font-bold text-primary">{formatCurrency(calc.totalReceived)}</span>
                    </div>
                    
                    <div className="flex justify-between text-xs p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">Profit Anda:</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(calc.partnerProfit)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DialogFooter>
                <Button type="submit" className="w-full bg-primary text-primary-foreground rounded-xl h-10 text-xs font-semibold hover:bg-primary/90" disabled={loading || (!isNewCust && !selectedCust) || !form.nominal || !form.paymentTypeId}>
                  {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Proses...</> : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Buat Transaksi</>}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Transaction Card
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

            {/* Bottom: payment type + partner profit */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground truncate">
                {tx.paymentType?.name} · {tx.methodTransaction}
              </p>
              <p className="text-sm font-bold text-primary flex-shrink-0 tabular-nums bg-primary/5 px-2 py-0.5 rounded-md">
                +{formatCurrency(tx.partnerProfit)}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Transaction Detail Dialog Content
function TxDetailDialogContent({ tx, onUpdate }: { tx: Transaction; onUpdate?: () => void }) {
  const [editNominal, setEditNominal] = useState(false);
  const [nominal, setNominal] = useState(tx.nominal.toString());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const canEditNominal = tx.status === 'pending' || tx.status === 'verification';

  const previewCalc = useMemo(() => {
    if (!editNominal) return null;

    const newNominal = parseFloat(nominal);
    if (isNaN(newNominal) || newNominal <= 0) return null;

    const isOnline = tx.methodTransaction === 'Online';
    let feePercent = isOnline ? (tx.paymentType?.onlineFeePercent || 0) : (tx.paymentType?.codFeePercent || 0);
    const feeFlat = isOnline ? (tx.paymentType?.onlineFeeFlat || 0) : (tx.paymentType?.codFeeFlat || 0);
    const threshold = tx.paymentType?.threshold || 1000000;

    if (feePercent > 100) feePercent = feePercent / 1000;

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
      if (mpFeePercent > 100) mpFeePercent = mpFeePercent / 1000;
      platformFee = newNominal * (mpFeePercent / 100) + mpFeeFlat;
    }

    const netMargin = paymentFee - platformFee;
    const partnerRate = tx.partner?.commission || 0;
    const partnerProfit = netMargin * (partnerRate / 100);
    const ownerProfit = netMargin - partnerProfit;
    const totalReceived = newNominal - paymentFee;

    return { paymentFee, platformFee, netMargin, partnerProfit, ownerProfit, totalReceived };
  }, [editNominal, nominal, tx]);

  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  const handleSaveNominal = async () => {
    const newNominal = parseFloat(nominal);
    if (isNaN(newNominal) || newNominal <= 0) {
      toast.error('Nominal tidak valid');
      return;
    }

    if (newNominal === tx.nominal) {
      toast.error('Nominal tidak berubah');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal: newNominal,
          sendNotification: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Nominal berhasil diupdate');
        setEditNominal(false);
        onUpdate?.();
      } else {
        toast.error(data.error || 'Gagal mengupdate nominal');
      }
    } catch {
      toast.error('Gagal mengupdate nominal');
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }

    setSendingMessage(true);
    try {
      const res = await fetch('/api/notifications/partner-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: tx.id,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pesan terkirim ke Owner');
        setMessage('');
      } else {
        toast.error(data.error || 'Gagal mengirim pesan');
      }
    } catch {
      toast.error('Gagal mengirim pesan');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between -mx-4 -mt-4 mb-0 px-4 py-2.5 pr-14 bg-card border-b">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize", config.color)}>
            <StatusIcon className={cn("w-3 h-3", tx.status === 'process' && "animate-spin")} />
            {tx.status}
          </span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">{tx.orderId}</p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(tx.orderId);
              toast.success('Order ID disalin');
            }}
            className="p-1 hover:bg-muted/30 rounded transition-colors shrink-0"
          >
            <Copy className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* 1. Financial Card */}
      <div className="rounded-xl bg-slate-900 text-white p-4 space-y-3">
        {/* Nominal */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-muted-foreground">Nominal</p>
            {canEditNominal ? (
              <button
                type="button"
                onClick={() => setEditNominal(!editNominal)}
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  editNominal ? "bg-muted text-foreground" : "hover:bg-muted/30 text-muted-foreground"
                )}
                title={editNominal ? 'Batal edit' : 'Edit nominal'}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Terkunci
              </span>
            )}
          </div>

          {editNominal && canEditNominal ? (
            <div className="space-y-1.5">
              <Input
                type="number"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                className="h-10 text-sm font-bold bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-white/30 rounded-xl"
                placeholder="Masukkan nominal"
              />
              <p className="text-[11px] text-muted-foreground">
                Hanya bisa diubah saat pending/verifikasi
              </p>
            </div>
          ) : (
            <p className="text-xl font-bold text-foreground tracking-tight">{formatCurrency(tx.nominal)}</p>
          )}

          {!canEditNominal && !editNominal && (
            <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" />
              Hanya bisa diubah saat pending/verifikasi
            </p>
          )}
        </div>

        {/* Fee breakdown */}
        <div className="text-[11px] text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Fee</span>
            <span className="text-red-400 dark:text-red-400">-{formatCurrency(previewCalc?.paymentFee ?? tx.paymentFee)}</span>
          </div>
          {(previewCalc?.platformFee ?? tx.platformFee) > 0 && (
            <div className="flex justify-between">
              <span>Platform</span>
              <span className="text-red-400 dark:text-red-400">-{formatCurrency(previewCalc?.platformFee ?? tx.platformFee)}</span>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-white/10" />

        {/* Profit */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Profit Anda</p>
            <p className="text-lg font-bold text-emerald-400 dark:text-emerald-400">+{formatCurrency(previewCalc?.partnerProfit ?? tx.partnerProfit)}</p>
          </div>
          {previewCalc && (
            <span className="text-[11px] text-emerald-400/70 bg-emerald-400/10 px-2 py-0.5 rounded-full">Preview</span>
          )}
        </div>

        {/* Dana Diterima Customer */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Dana Diterima Customer</p>
            <p className="text-base font-bold text-cyan-400 dark:text-cyan-400">{formatCurrency(previewCalc?.totalReceived ?? tx.totalReceived)}</p>
          </div>
        </div>

        {/* Save button inside card */}
        {editNominal && canEditNominal && (
          <Button
            onClick={handleSaveNominal}
            disabled={saving || !nominal || parseFloat(nominal) <= 0 || parseFloat(nominal) === tx.nominal}
            className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium gap-1.5 mt-1 rounded-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Simpan Perubahan
              </>
            )}
          </Button>
        )}
      </div>

      {/* 2. Transaction Info */}
      <div className="space-y-1">
        {/* Customer */}
        <div className="flex items-start gap-2.5 py-1.5">
          <User className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">Customer</p>
            <p className="text-sm font-semibold truncate">{tx.customer?.name}</p>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-xs text-muted-foreground">{tx.customer?.phone}</p>
              <div className="flex items-center gap-0.5 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tx.customer?.phone || '');
                    toast.success('No. WA disalin');
                  }}
                  className="p-1.5 hover:bg-muted/30 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <a
                  href={`https://wa.me/${tx.customer?.phone?.replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-muted/30 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="flex items-start gap-2.5 py-1.5">
          <CreditCard className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">Payment</p>
            <p className="text-sm font-semibold">{tx.paymentType?.name}</p>
            <p className="text-xs text-muted-foreground">{tx.methodTransaction}</p>
          </div>
        </div>

        {/* Bank Account (conditional) */}
        {tx.customer?.bankName && tx.customer?.bankAccount && (
          <div className="flex items-start gap-2.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">Rekening</p>
              <p className="text-sm font-semibold">{tx.customer.bankName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-xs font-mono text-muted-foreground">{tx.customer.bankAccount}</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tx.customer.bankAccount || '');
                    toast.success('Disalin');
                  }}
                  className="p-1.5 hover:bg-muted/30 rounded-lg transition-colors"
                >
                  <Copy className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Marketplace (conditional) */}
        {tx.marketplace && (
          <div className="flex items-start gap-2.5 py-1.5">
            <Store className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">Marketplace</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{tx.marketplace.name}</p>
                <span className="text-xs text-red-500 dark:text-red-400 font-medium">-{formatCurrency(tx.platformFee)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes (conditional) */}
        {tx.notes && (
          <div className="flex items-start gap-2.5 py-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">Catatan</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{tx.notes}</p>
            </div>
          </div>
        )}

        {/* Date */}
        <div className="flex items-start gap-2.5 py-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">Tanggal</p>
            <p className="text-sm font-semibold">{formatDate(tx.createdAt)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Profit partner dapat berubah tergantung marketplace yang akan digunakan
            </p>
          </div>
        </div>
      </div>

      {/* 3. Message to Owner */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Kirim pesan ke Owner..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-10 text-xs flex-1 rounded-xl"
        />
        <Button
          onClick={handleSendMessage}
          disabled={sendingMessage || !message.trim()}
          size="sm"
          className="rounded-lg h-10 w-10 p-0 flex-shrink-0"
        >
          {sendingMessage ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* WhatsApp Review Reminder - only for success status */}
      {tx.status === 'success' && tx.customer?.phone && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Star className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Minta Ulasan Customer</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                Kirim pesan WhatsApp untuk mengingatkan customer memberi ulasan.
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

      {/* Share Track Order via WA - for pending/verification/process status */}
      {tx.status !== 'failed' && tx.status !== 'success' && tx.customer?.phone && (
        <a
          href={`https://wa.me/${tx.customer.phone.replace(/^0/, '62')}?text=${encodeURIComponent(
            `🛒 Detail Transaksi\n\n` +
            `📋 Order ID: ${tx.orderId}\n` +
            `💰 Nominal: ${formatCurrency(tx.nominal)}\n` +
            `💳 Payment: ${tx.paymentType?.name}\n` +
            `📊 Status: ${STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG]?.color ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : tx.status}\n\n` +
            `📱 Lacak pesanan Anda:\n${typeof window !== 'undefined' ? window.location.origin : ''}/track?orderId=${tx.orderId}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Share Track Order via WhatsApp
        </a>
      )}
    </div>
  );
}

// Transaction Detail Dialog Wrapper
function TxDetailDialog({ open, onOpenChange, tx, onUpdate }: { open: boolean; onOpenChange: (v: boolean) => void; tx: Transaction | null; onUpdate?: () => void }) {
  if (!tx) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[85vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Detail Transaksi {tx.orderId}</DialogTitle>
          </DialogHeader>
          <TxDetailDialogContent key={tx.id} tx={tx} onUpdate={onUpdate} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 pb-20 md:pb-6 max-w-4xl">
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
      <div className="space-y-2.5">{[1, 2, 3].map(i => (
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
      ))}</div>
    </div>
  );
}
