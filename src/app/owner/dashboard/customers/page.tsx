'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { SimplePagination } from '@/components/ui/pagination';

import {
  Users,
  Search,
  Plus,
  Phone,
  Wallet,
  Loader2,
  MapPin,
  Crown,
  Star,
  Trash2,
  Edit,
  Ban,
  FileText,
  User,
  Building,
  Copy,
  Check,
  Activity,
  Sparkles,
  WalletCards,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PieChart,
  Target,
  Receipt,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CitySearch } from '@/components/ui/city-search';
import { isValidIndonesianPhone, normalizePhone } from '@/lib/customer-utils';
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import AnalyticsBubbleMap from '@/components/map/analytics-bubble-map';

interface Partner {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  city?: string;
  label: string;
  totalVolume: number;
  totalTransactions: number;
  partnerId?: string;
  addedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  partner?: Partner;
  _count?: {
    transactions: number;
  };
}

interface CustomerStats {
  totalCustomers: number;
  totalVolume: number;
  vipCount: number;
  newCount: number;
  regularCount: number;
  blacklistCount: number;
  avgTransactionValue: number;
  topCities: Array<{ city: string; count: number; volume: number }>;
  topCustomers: Array<{ id: string; name: string; totalVolume: number; totalTransactions: number; label: string }>;
  growthRate: number;
  newThisMonth: number;
}

const COLORS = ['#f59e0b', '#6b7280', '#06b6d4', '#ef4444'];

// Label → avatar color mapping
const LABEL_AVATAR: Record<string, string> = {
  VIP: 'bg-amber-500/15 text-amber-500',
  Regular: 'bg-gray-400/15 text-gray-400',
  New: 'bg-cyan-500/15 text-cyan-500',
  Blacklist: 'bg-red-500/15 text-red-500',
};

export default function OwnerCustomersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [mainTab, setMainTab] = useState<'list' | 'analytics'>('list');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>('volume-desc');
  const redirectAttempted = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10;

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
      fetchCustomers();
      fetchStats();
    }
  }, [isAuthenticated, hasHydrated, user, currentPage, labelFilter]);
  
  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [labelFilter]);

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => {
        fetchCustomers(true);
        fetchStats();
      }, 60000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, hasHydrated, user, currentPage, labelFilter]);

  const fetchCustomers = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      if (labelFilter !== 'all') {
        params.append('label', labelFilter === 'blacklist' ? 'Blacklist' : labelFilter);
      }
      
      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalItems(result.pagination.totalItems);
        }
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/customers/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Filter customers based on search, then sort client-side
  const filteredCustomers = (() => {
    const searchLower = searchQuery.toLowerCase();
    let result = customers.filter((c) => {
      if (!searchQuery) return true;
      return (
        c.name?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(searchLower)
      );
    });
    switch (sortOrder) {
      case 'volume-desc':
        result.sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0));
        break;
      case 'trx-desc':
        result.sort((a, b) => (b.totalTransactions || 0) - (a.totalTransactions || 0));
        break;
      case 'name-asc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    return result;
  })();

  // KPI computations
  const totalVolume = stats?.totalVolume || 0;

  if (isLoading || !hasHydrated) {
    return (
      <div className="min-h-screen bg-background dashboard-mesh">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
        <Skeleton className="h-8 w-24 rounded-xl bg-muted" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-muted" />)}</div>
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
          <Skeleton className="h-9 flex-1 rounded-lg bg-muted" />
          <Skeleton className="h-9 flex-1 rounded-lg bg-muted" />
        </div>
  </div></div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background dashboard-mesh">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Customer</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Customer</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">Kelola data pelanggan</p>
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
            onClick={() => { fetchCustomers(); fetchStats(); }}
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 rounded-lg"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
          <NewCustomerDialog onCreated={() => { fetchCustomers(); fetchStats(); }} />
        </div>
      </div>

      {/* ── KPI Cards - Always visible ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CustomerKPICard
          title="Total Customer"
          value={stats?.totalCustomers || 0}
          icon={<Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="primary"
          isCount
        />
        <CustomerKPICard
          title="Total Volume"
          value={totalVolume}
          icon={<TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="green"
        />
        <CustomerKPICard
          title="VIP"
          value={stats?.vipCount || 0}
          icon={<Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="amber"
          isCount
        />
        <CustomerKPICard
          title="New This Month"
          value={stats?.newThisMonth || 0}
          icon={<Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="purple"
          isCount
        />
      </div>

      {/* ── Main Tabs: Customer & Analytics ── */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
        <button
          onClick={() => setMainTab('list')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
            mainTab === 'list' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          <Users className="w-4 h-4" />
          Customer
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
      {mainTab === 'list' ? (
        <div className="space-y-3">
          {/* Insight Chips (filter pills, partner-style) */}
          {!loading && stats && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {(stats?.vipCount || 0) > 0 && (
                <button
                  onClick={() => setLabelFilter(labelFilter === 'VIP' ? 'all' : 'VIP')}
                  className={cn(
                    "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors",
                    labelFilter === 'VIP'
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                  )}
                >
                  <Users className="w-3 h-3" />
                  <span>{stats.vipCount} VIP</span>
                </button>
              )}
              {(stats?.blacklistCount || 0) > 0 && (
                <button
                  onClick={() => setLabelFilter(labelFilter === 'blacklist' ? 'all' : 'blacklist')}
                  className={cn(
                    "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors",
                    labelFilter === 'blacklist'
                      ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  )}
                >
                  <Ban className="w-3 h-3" />
                  <span>{stats.blacklistCount} Blacklist</span>
                </button>
              )}
              {(stats?.newCount || 0) > 0 && (
                <button
                  onClick={() => setLabelFilter(labelFilter === 'New' ? 'all' : 'New')}
                  className={cn(
                    "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors",
                    labelFilter === 'New'
                      ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30"
                      : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20"
                  )}
                >
                  <Star className="w-3 h-3" />
                  <span>{stats.newCount} New</span>
                </button>
              )}
              {(stats?.regularCount || 0) > 0 && (
                <button
                  onClick={() => setLabelFilter(labelFilter === 'Regular' ? 'all' : 'Regular')}
                  className={cn(
                    "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors",
                    labelFilter === 'Regular'
                      ? "bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30"
                      : "bg-muted/60 text-muted-foreground border border-border/60 hover:bg-muted"
                  )}
                >
                  <User className="w-3 h-3" />
                  <span>{stats.regularCount} Regular</span>
                </button>
              )}
              {labelFilter !== 'all' && (
                <button
                  onClick={() => setLabelFilter('all')}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  <Users className="w-3 h-3" />
                  <span>Semua ({totalItems})</span>
                </button>
              )}
            </div>
          )}

          {/* Search + Sort Bar */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama/no. WA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-9 sm:h-10 rounded-xl text-xs sm:text-sm bg-muted/40 border-border/60 focus-visible:bg-background"
              />
            </div>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-[110px] sm:w-[130px] h-9 sm:h-10 rounded-xl text-[11px] sm:text-xs bg-muted/40 border-border/60">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volume-desc">Volume ↓</SelectItem>
                <SelectItem value="trx-desc">Trx ↓</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customer Count */}
          {!loading && (
            <p className="text-[10px] sm:text-[11px] text-muted-foreground px-1">
              {filteredCustomers.length} customer ditemukan
            </p>
          )}

          {/* Customer List */}
          <div className="space-y-2 sm:space-y-2.5">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 sm:h-[76px] rounded-xl bg-muted" />)
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onUpdated={() => { fetchCustomers(); fetchStats(); }}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Tidak ada customer ditemukan</p>
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
        <CustomerAnalytics stats={stats} loading={statsLoading} />
      )}
  </div></div>
  );
}

// Customer Analytics Component
function CustomerAnalytics({ stats, loading }: { stats: CustomerStats | null; loading: boolean }) {
  // Prepare chart data
  const segmentData = stats ? [
    { name: 'VIP', value: stats.vipCount, color: '#f59e0b' },
    { name: 'Regular', value: stats.regularCount, color: '#6b7280' },
    { name: 'New', value: stats.newCount, color: '#06b6d4' },
    { name: 'Blacklist', value: stats.blacklistCount, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const topCustomersData = stats?.topCustomers?.slice(0, 5) || [];
  const topCity = stats?.topCities?.[0] || null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[88px] sm:h-24 rounded-xl bg-muted" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-56 sm:h-72 rounded-xl bg-muted" />
          <Skeleton className="h-56 sm:h-72 rounded-xl bg-muted" />
        </div>
        <Skeleton className="h-64 sm:h-72 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Analytics Summary Card */}
      <div className="rounded-xl dash-card overflow-hidden p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <AnalyticsCard
            title="Total Customer"
            value={stats?.totalCustomers || 0}
            subtitle={`${stats?.newThisMonth || 0} baru bulan ini`}
            icon={<Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            color="primary"
            isCount
          />
          <AnalyticsCard
            title="Total Volume"
            value={stats?.totalVolume || 0}
            subtitle="dari semua customer"
            icon={<Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            color="emerald"
          />
          <AnalyticsCard
            title="Avg Transaction"
            value={stats?.avgTransactionValue || 0}
            subtitle="nilai rata-rata"
            icon={<Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            color="cyan"
          />
          <AnalyticsCard
            title="Conversion Rate"
            value={stats?.totalCustomers > 0 ? `${(((stats.regularCount || 0) + (stats.vipCount || 0)) / stats.totalCustomers * 100).toFixed(1)}%` : '0.0%'}
            subtitle="rasio aktif"
            icon={<Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            color="amber"
            isPercent
          />
          <AnalyticsCard
            title="Growth Rate"
            value={`${(stats?.growthRate || 0).toFixed(1)}%`}
            subtitle="pertumbuhan bulanan"
            icon={<TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            color="violet"
            isPercent
            change={stats?.growthRate}
          />
        </div>
      </div>

      {/* Top Customer + Top Lokasi — 2-Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top Customer */}
        <div className="rounded-xl dash-card overflow-hidden">
          <div className="px-3 pt-3 sm:px-4 sm:pt-3.5 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
                <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                Top Customer
              </h3>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 pl-5 sm:pl-6">
                {topCustomersData.length > 0
                  ? `${topCustomersData[0].name} memimpin dengan ${formatCurrency(topCustomersData[0].totalVolume)} volume`
                  : 'Belum ada data customer'}
              </p>
            </div>
            {topCustomersData.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 flex-shrink-0">
                {topCustomersData.length} customer
              </Badge>
            )}
          </div>
          <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-3.5">
            {topCustomersData.length > 0 ? (
              <div className="space-y-1.5">
                {topCustomersData.map((customer, index) => (
                  <div key={customer.id} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={cn(
                      "w-5 h-5 sm:w-7 sm:h-7 rounded-md flex items-center justify-center font-bold text-[9px] sm:text-[11px] flex-shrink-0",
                      index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
                      index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                      index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] sm:text-sm font-medium truncate">{customer.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">{customer.totalTransactions} transaksi</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] sm:text-sm font-bold text-primary">{formatCurrency(customer.totalVolume || 0)}</p>
                      <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 rounded-full">
                        {customer.label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-muted-foreground text-xs">
                <div className="text-center">
                  <Crown className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/30" />
                  <p>Belum ada data customer</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Lokasi */}
        <div className="rounded-xl dash-card overflow-hidden">
          <div className="px-3 pt-3 sm:px-4 sm:pt-3.5 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500" />
                Top Lokasi
              </h3>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 pl-5 sm:pl-6">
                {topCity
                  ? `${topCity.city} paling aktif dengan ${topCity.count} customer`
                  : 'Belum ada data lokasi'}
              </p>
            </div>
            {stats?.topCities && stats.topCities.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-0 flex-shrink-0">
                {stats.topCities.length} lokasi
              </Badge>
            )}
          </div>
          <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-3.5">
            {stats?.topCities && stats.topCities.length > 0 ? (
              <AnalyticsBubbleMap topCities={stats.topCities} accentColor="#06b6d4" />
            ) : (
              <div className="h-[140px] sm:h-[180px] flex items-center justify-center text-muted-foreground text-xs">
                <div className="text-center">
                  <MapPin className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/30" />
                  <p>Belum ada data lokasi</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segmentasi Customer */}
      <div className="rounded-xl dash-card overflow-hidden">
        <div className="px-3 pt-3 sm:px-4 sm:pt-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
                <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600 dark:text-violet-400" />
                Segmentasi Customer
              </h3>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 pl-5 sm:pl-6">
                {segmentData.length > 0
                  ? (() => {
                      const top = [...segmentData].sort((a, b) => b.value - a.value)[0];
                      const total = segmentData.reduce((s, d) => s + d.value, 0);
                      return `${top.name} mendominasi dengan ${top.value} customer (${((top.value / total) * 100).toFixed(0)}%)`;
                    })()
                  : 'Belum ada data'}
              </p>
            </div>
            {segmentData.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border-0 flex-shrink-0">
                {segmentData.reduce((s, d) => s + d.value, 0)} total
              </Badge>
            )}
          </div>
        </div>
        <div className="px-3 pb-3 pt-2.5 sm:px-4 sm:pb-3.5">
          {segmentData.length > 0 ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <ResponsiveContainer width="45%" height={140} className="sm:h-[180px]">
                <RePieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {segmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} customer`} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1 sm:space-y-1.5">
                {segmentData.map((item) => {
                  const total = segmentData.reduce((s, d) => s + d.value, 0);
                  const pct = ((item.value / total) * 100).toFixed(0);
                  return (
                    <div key={item.name} className="flex items-center justify-between text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{item.value}</span>
                        <span className="text-[9px] text-muted-foreground">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-[140px] sm:h-[180px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
              Belum ada data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Customer KPI Card (same style as PartnerKPICard)
function CustomerKPICard({ title, value, icon, color, isCount }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'amber' | 'purple';
  isCount?: boolean;
}) {
  const iconStyles = {
    primary: { bg: 'bg-primary/15', text: 'text-primary dark:text-primary' },
    green: { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
    purple: { bg: 'bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400' },
  };

  const style = iconStyles[color];

  return (
    <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center", style.bg)}>
          <div className={style.text}>{icon}</div>
        </div>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">{title}</span>
      </div>
      <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
        {isCount ? value.toLocaleString() : formatCurrency(value)}
      </p>
    </div>
  );
}

// Analytics Card Component
function AnalyticsCard({ title, value, subtitle, icon, color, isCount, isPercent, change }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'emerald' | 'cyan' | 'violet' | 'amber';
  isCount?: boolean;
  isPercent?: boolean;
  change?: number;
}) {
  const iconBgClasses = {
    primary: 'bg-primary/15',
    emerald: 'bg-emerald-500/15',
    cyan: 'bg-cyan-500/15',
    violet: 'bg-violet-500/15',
    amber: 'bg-amber-500/15',
  };

  const iconColorClasses = {
    primary: 'text-primary',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
    violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center", iconBgClasses[color], iconColorClasses[color])}>
          {icon}
        </div>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">{title}</span>
      </div>
      <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
        {isPercent ? value : isCount ? value : formatCurrency(value as number)}
      </p>
      <div className={cn("flex items-center mt-1", change !== undefined ? "justify-between" : "gap-1.5")}>
        {subtitle && (
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">{subtitle}</span>
        )}
        {change !== undefined && (
          <span className={cn("text-[9px] sm:text-[10px] font-semibold flex items-center gap-0.5",
            change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          )}>
            {change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Label Badge Component
function LabelBadge({ label }: { label: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    VIP: {
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      icon: <Crown className="w-3 h-3" />,
    },
    Regular: {
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      icon: <User className="w-3 h-3" />,
    },
    New: {
      className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
      icon: <Star className="w-3 h-3" />,
    },
    Blacklist: {
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
      icon: <Ban className="w-3 h-3" />,
    },
  };

  const variant = variants[label] || variants.Regular;

  return (
    <Badge variant="outline" className={cn('text-[8px] sm:text-[9px] gap-0.5 sm:gap-1 font-medium px-1.5 sm:px-2 py-0 rounded-full', variant.className)}>
      {variant.icon}
      {label}
    </Badge>
  );
}

// Added By Badge Component
function AddedByBadge({ addedBy, partner }: { addedBy: string; partner?: Partner }) {
  const getAddedByInfo = () => {
    switch (addedBy) {
      case 'owner':
        return { label: 'Owner', icon: <Building className="w-2.5 h-2.5 sm:w-3 sm:h-3" />, className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' };
      case 'partner':
        return { label: partner?.name || 'Partner', icon: <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
      case 'public':
        return { label: 'Public', icon: <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
      default:
        return { label: addedBy, icon: <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
    }
  };

  const info = getAddedByInfo();

  return (
    <Badge variant="outline" className={cn('text-[9px] sm:text-[10px] gap-0.5 sm:gap-1 border-0 py-0.5 rounded-full', info.className)}>
      {info.icon}
      <span className="truncate max-w-[50px] sm:max-w-none">{info.label}</span>
    </Badge>
  );
}

// Customer Card Component (PartnerCard-style redesign)
function CustomerCard({
  customer,
  onUpdated,
}: {
  customer: Customer;
  onUpdated: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const isBlacklisted = customer.label === 'Blacklist';
  const initials = customer.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const labelAvatarClass = LABEL_AVATAR[customer.label] || 'bg-muted/50 text-muted-foreground';

  return (
    <>
      <div
        className={cn(
          'group relative rounded-xl dash-card overflow-hidden border border-border/50 transition-all hover:border-border cursor-pointer active:scale-[0.98]',
          isBlacklisted && 'opacity-60'
        )}
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3">
          {/* Avatar - label-colored initials */}
          <div className={cn(
            'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-bold',
            labelAvatarClass
          )}>
            {initials}
          </div>

          {/* Center - Name, label, info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs sm:text-sm font-semibold truncate">{customer.name}</p>
              <LabelBadge label={customer.label} />
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
              <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground/40 flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{customer.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold">{formatCurrency(customer.totalVolume)}</span>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground">{customer.totalTransactions} trx</span>
              {customer.city && (
                <>
                  <span className="text-[10px] text-muted-foreground/30 hidden sm:inline">·</span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden sm:inline">{customer.city}</span>
                </>
              )}
            </div>
          </div>

          {/* Right - Edit button (always visible on mobile, hover on desktop) */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-muted/80"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetail(true);
            }}
          >
            <Edit className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>

        {/* Bottom meta row - only visible on sm+ */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 pb-2.5 -mt-0.5">
          <AddedByBadge addedBy={customer.addedBy} partner={customer.partner} />
        </div>
      </div>

      {/* Detail Dialog */}
      <CustomerActionsDialogContent
        customer={customer}
        onUpdated={() => {
          onUpdated();
          setShowDetail(false);
        }}
        onClose={() => setShowDetail(false)}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
}

// Customer Actions Dialog Content
function CustomerActionsDialogContent({
  customer,
  onUpdated,
  onClose,
  open,
  onOpenChange,
}: {
  customer: Customer;
  onUpdated: () => void;
  onClose: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [label, setLabel] = useState(customer.label);
  const [notes, setNotes] = useState(customer.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'transactions'>('info');
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Fetch transactions when tab changes
  useEffect(() => {
    if (activeTab === 'transactions' && transactions.length === 0) {
      fetchTransactions();
    }
  }, [activeTab, customer.id]);

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}/transactions?limit=20`);
      const result = await response.json();
      if (result.success) {
        setTransactions(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(customer.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy phone:', err);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, notes }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Customer berhasil diperbarui');
        onUpdated();
      } else {
        setError(result.error || 'Gagal memperbarui customer');
      }
    } catch (err) {
      console.error('Failed to update customer:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Customer berhasil dihapus');
        onUpdated();
      } else {
        setError(result.error || 'Gagal menghapus customer');
      }
    } catch (err) {
      console.error('Failed to delete customer:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleBlacklistToggle = async () => {
    const newLabel = customer.label === 'Blacklist' ? 'Regular' : 'Blacklist';
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(newLabel === 'Blacklist' ? 'Customer ditambahkan ke blacklist' : 'Customer dihapus dari blacklist');
        onUpdated();
      } else {
        setError(result.error || 'Gagal mengubah status blacklist');
      }
    } catch (err) {
      console.error('Failed to toggle blacklist:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md max-h-[90vh] sm:max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
      <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className={cn(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-bold",
            LABEL_AVATAR[customer.label] || 'bg-muted/50 text-muted-foreground'
          )}>
            {customer.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm truncate">{customer.name}</DialogTitle>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <LabelBadge label={customer.label} />
              <span className="text-[9px] sm:text-[10px] text-muted-foreground">{formatCurrency(customer.totalVolume)} · {customer.totalTransactions} trx</span>
            </div>
          </div>
        </div>
      </DialogHeader>

      {/* Tab Buttons */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl mx-4 sm:mx-5">
        <button
          onClick={() => setActiveTab('info')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-all",
            activeTab === 'info' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Info
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-all",
            activeTab === 'transactions' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          <Receipt className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Transaksi
          <Badge variant="secondary" className="text-[8px] sm:text-[9px] h-4 px-1 py-0.5 rounded-full">
            {customer.totalTransactions}
          </Badge>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 sm:px-5 py-3">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs sm:text-sm mb-3">
            {error}
          </div>
        )}

        {activeTab === 'info' ? (
          <div className="space-y-3 sm:space-y-4">
            {/* Info Rows */}
            <div className="rounded-xl border border-border/50 divide-y divide-border/50 overflow-hidden">
              {/* Phone */}
              <div className="flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">WhatsApp</p>
                    <p className="text-[11px] sm:text-xs font-medium truncate">{customer.phone}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={handleCopyPhone}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {/* City */}
              {customer.city && (
                <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">Kota</p>
                    <p className="text-[11px] sm:text-xs font-medium truncate">{customer.city}</p>
                  </div>
                </div>
              )}

              {/* Bank */}
              {(customer.bankName || customer.bankAccount || customer.bankHolder) && (
                <div className="px-3 py-2 sm:px-3.5 sm:py-2.5">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">Bank</p>
                      <p className="text-[11px] sm:text-xs font-medium truncate">
                        {[customer.bankName, customer.bankHolder && `a.n ${customer.bankHolder}`].filter(Boolean).join(' · ')}
                      </p>
                      {customer.bankAccount && (
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono mt-0.5">{customer.bankAccount}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Added By */}
              <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Building className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Ditambahkan</p>
                  <AddedByBadge addedBy={customer.addedBy} partner={customer.partner} />
                </div>
              </div>
            </div>

            {/* Change Label */}
            <div className="space-y-1.5">
              <Label className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Label / Tier
              </Label>
              <Select value={label} onValueChange={setLabel}>
                <SelectTrigger className="w-full h-9 text-[11px] sm:text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIP">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      VIP
                    </div>
                  </SelectItem>
                  <SelectItem value="Regular">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      Regular
                    </div>
                  </SelectItem>
                  <SelectItem value="New">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      New
                    </div>
                  </SelectItem>
                  <SelectItem value="Blacklist">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                      Blacklist
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Catatan
              </Label>
              <Textarea
                placeholder="Tambahkan catatan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-[11px] sm:text-xs rounded-lg"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <Button
                onClick={handleUpdate}
                className="w-full h-9 text-[11px] sm:text-xs font-semibold rounded-xl"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
                Simpan Perubahan
              </Button>

              <Button
                variant="outline"
                onClick={handleBlacklistToggle}
                className={cn(
                  "w-full h-9 text-[11px] sm:text-xs font-medium rounded-xl",
                  customer.label === 'Blacklist' && "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                )}
                disabled={loading}
              >
                {customer.label === 'Blacklist' ? (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    Hapus dari Blacklist
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Tambah ke Blacklist
                  </>
                )}
              </Button>

              <Separator />

              {/* Delete Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Hapus Customer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Customer?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan. Customer <strong>{customer.name}</strong> akan dihapus secara permanen.
                      {customer.totalTransactions > 0 && (
                        <span className="block mt-2 text-amber-600 dark:text-amber-400">
                          Customer ini memiliki {customer.totalTransactions} transaksi dan tidak dapat dihapus.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={loading || customer.totalTransactions > 0}
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 pb-2 sm:pb-4">
            {transactionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => {
                const status = tx.status as string;
                const statusColors: Record<string, string> = {
                  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                  verification: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
                  process: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
                  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                };
                return (
                  <Card key={tx.id as string} className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
                    <CardContent className="p-2.5 sm:p-3">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <span className="text-[10px] sm:text-xs font-mono text-muted-foreground truncate mr-2">{tx.orderId as string}</span>
                        <Badge className={cn("text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0", statusColors[status] || statusColors.pending)}>
                          {status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-primary text-xs sm:text-sm">{formatCurrency(tx.nominal as number)}</p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                            Fee: {formatCurrency(tx.paymentFee as number)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] sm:text-xs font-medium">{tx.paymentType?.name as string}</p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">{tx.methodTransaction as string}</p>
                        </div>
                      </div>
                      {tx.partner && (
                        <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/60">
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                            Partner: <span className="font-medium">{(tx.partner as {name: string}).name}</span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-6 sm:py-8">
                <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
                  <Receipt className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">Belum ada transaksi</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DialogContent>
    </Dialog>
  );
}

// Bank list for dropdown
const BANK_LIST = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon',
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

// New Customer Dialog

function NewCustomerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customBankName, setCustomBankName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    city: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number
    if (!isValidIndonesianPhone(formData.phone)) {
      toast.error('Format nomor WA tidak valid. Gunakan format 08xxx');
      return;
    }

    setLoading(true);

    try {
      const bankNameToSubmit = formData.bankName === 'Lainnya' ? customBankName : formData.bankName;

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: normalizePhone(formData.phone),
          bankName: bankNameToSubmit,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        setFormData({ name: '', phone: '', email: '', bankName: '', bankAccount: '', bankHolder: '', city: '' });
        setCustomBankName('');
        if (result.isExisting) {
          toast.info(result.message || 'Customer sudah ada, data diperbarui');
        } else {
          toast.success('Customer berhasil ditambahkan');
        }
      } else {
        toast.error(result.error || 'Gagal menambahkan customer');
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
      toast.error('Gagal menambahkan customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground rounded-lg h-9 px-4 font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Baru</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Customer Baru
          </DialogTitle>
          <DialogDescription>Tambahkan pelanggan baru ke sistem</DialogDescription>
        </DialogHeader>
        <form id="owner-customer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="px-5 py-4 space-y-4">
            {/* Basic Info - Grid */}
            <div className="space-y-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Informasi Dasar</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nama <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Nama lengkap"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>No. WA <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="08xxx"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email <span className="text-muted-foreground font-normal">(Opsional)</span></Label>
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lokasi / Kota <span className="text-muted-foreground font-normal">(Opsional)</span></Label>
                  <CitySearch
                    value={formData.city}
                    onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                    placeholder="Cari kota..."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Bank Info */}
            <div className="space-y-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <WalletCards className="w-3 h-3" />
                Informasi Bank <span className="normal-case tracking-normal text-muted-foreground/60">(Opsional)</span>
              </p>
              <div className="space-y-2">
                <Select
                  value={formData.bankName}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, bankName: value }));
                    if (value !== 'Lainnya') {
                      setCustomBankName('');
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue placeholder="Pilih bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_LIST.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.bankName === 'Lainnya' && (
                  <Input
                    placeholder="Ketik nama bank"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Nomor Rekening"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                    className="h-9 text-xs rounded-lg"
                  />
                  <Input
                    placeholder="Nama Pemilik Rekening"
                    value={formData.bankHolder}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankHolder: e.target.value }))}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
        <div className="px-5 pb-5 pt-2 border-t border-border/50 bg-background">
          <Button type="submit" form="owner-customer-form" className="w-full h-10 text-xs font-semibold rounded-xl" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Simpan Customer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
