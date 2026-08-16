'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Users,
  Search,
  TrendingUp,
  Clock,
  Crown,
  UserPlus,
  Loader2,
  Target,
  Settings,
  Key,
  Building2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  BarChart3,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  Edit,
  Activity,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CitySearch } from '@/components/ui/city-search';
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import AnalyticsBubbleMap from '@/components/map/analytics-bubble-map';

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  city: string;
  commission: number;
  target: number;
  tier: string;
  badge: string;
  status: string;
  totalProfit: number;
  totalVolume: number;
  totalTransactions: number;
  notes: string | null;
  joinedAt: string;
  createdAt: string;
  lastLogin: string | null;
  user?: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
  rankingHistory?: Array<{
    id: string;
    month: string;
    profit: number;
    volume: number;
    transactions: number;
    rank: number | null;
    badge: string | null;
  }>;
  _count?: {
    transactions: number;
    customers: number;
  };
  monthlyStats?: {
    volume: number;
    profit: number;
    transactions: number;
  };
}

interface PartnerStats {
  totalPartners: number;
  activePartners: number;
  suspendedPartners: number;
  totalVolume: number;
  totalProfit: number;
  totalTransactions: number;
  avgProfitPerPartner: number;
  avgVolumePerPartner: number;
  tierDistribution: Array<{ tier: string; count: number; volume: number; profit: number }>;
  topPartnersByProfit: Array<{ id: string; name: string; profit: number; volume: number; tier: string; transactions: number }>;
  topPartnersByVolume: Array<{ id: string; name: string; profit: number; volume: number; tier: string; transactions: number }>;
  topCities: Array<{ city: string; count: number; volume: number }>;
  newThisMonth: number;
  growthRate: number;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: '#f97316',
  Silver: '#6b7280',
  Gold: '#eab308',
  Platinum: '#a855f7',
};

export default function OwnerPartnersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mainTab, setMainTab] = useState<'list' | 'analytics'>('list');
  const [sortOrder, setSortOrder] = useState<string>('profit-desc');
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
      fetchPartners();
      fetchStats();
    }
  }, [isAuthenticated, hasHydrated, user]);

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => {
        fetchPartners(true);
        fetchStats();
      }, 60000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, hasHydrated, user]);

  const fetchPartners = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch('/api/partners');
      const result = await response.json();
      if (result.success) {
        setPartners(result.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      if (!isAutoRefresh) toast.error('Gagal memuat data partner');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/partners/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch partner stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const activePartners = partners.filter((p) => p.status === 'active');
  const totalVolume = partners.reduce((sum, p) => sum + (p.totalVolume || 0), 0);
  const totalProfit = partners.reduce((sum, p) => sum + (p.totalProfit || 0), 0);

  // HRD-style insight computations
  const inactivePartners = partners.filter(p => p.status === 'suspended');
  const zeroProfitPartners = partners.filter(p => !p.totalProfit || p.totalProfit === 0);
  const nearTargetPartners = partners.filter(p => p.target > 0 && p.totalProfit >= p.target * 0.7 && p.totalProfit < p.target);
  const newPartners30d = partners.filter(p => {
    const d = new Date(p.joinedAt);
    return (Date.now() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
  });

  // Sort & filter logic
  const sortedAndFilteredPartners = (() => {
    const searchLower = searchQuery.toLowerCase();
    let result = partners.filter((p) => (
      p.name?.toLowerCase().includes(searchLower) ||
      p.email?.toLowerCase().includes(searchLower) ||
      p.city?.toLowerCase().includes(searchLower)
    ));
    switch (sortOrder) {
      case 'profit-desc':
        result.sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0));
        break;
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

  if (isLoading || !hasHydrated) {
    return (
      <div className="min-h-screen bg-background dashboard-mesh">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
        <Skeleton className="h-8 w-24 rounded-xl bg-muted" />
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
          <Skeleton className="h-9 flex-1 rounded-lg bg-muted" />
          <Skeleton className="h-9 flex-1 rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-muted" />)}</div>
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
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Partner</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Partner</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">Kelola mitra aktif</p>
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
            onClick={() => { fetchPartners(); fetchStats(); }}
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 rounded-lg"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
          <NewPartnerDialog onCreated={() => { fetchPartners(); fetchStats(); }} />
        </div>
      </div>

      {/* ── KPI Cards - Always visible ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PartnerKPICard
          title="Partner Aktif"
          value={activePartners.length}
          icon={<Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="primary"
          isCount
        />
        <PartnerKPICard
          title="Total Volume"
          value={totalVolume}
          icon={<TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="green"
        />
        <PartnerKPICard
          title="Total Profit"
          value={totalProfit}
          icon={<Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="amber"
        />
        <PartnerKPICard
          title="Total Trx"
          value={partners.reduce((sum, p) => sum + (p.totalTransactions || 0), 0)}
          icon={<BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="purple"
          isCount
        />
      </div>

      {/* ── Main Tabs ── */}
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
          Partner
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
          {/* Insight Summary Bar */}
          {!loading && partners.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {inactivePartners.length > 0 && (
                <button
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  <XCircle className="w-3 h-3" />
                  <span>{inactivePartners.length} Suspended</span>
                </button>
              )}
              {nearTargetPartners.length > 0 && (
                <button
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                >
                  <Target className="w-3 h-3" />
                  <span>{nearTargetPartners.length} Near Target</span>
                </button>
              )}
              {newPartners30d.length > 0 && (
                <button
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{newPartners30d.length} Partner Baru</span>
                </button>
              )}
              {zeroProfitPartners.length > 0 && (
                <button
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-muted/60 text-muted-foreground border border-border/60 hover:bg-muted transition-colors"
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>{zeroProfitPartners.length} Belum Ada Profit</span>
                </button>
              )}
            </div>
          )}

          {/* Search + Sort Bar */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, kota..."
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
                <SelectItem value="profit-desc">Profit ↓</SelectItem>
                <SelectItem value="volume-desc">Volume ↓</SelectItem>
                <SelectItem value="trx-desc">Trx ↓</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Partner Count */}
          {!loading && (
            <p className="text-[10px] sm:text-[11px] text-muted-foreground px-1">
              {sortedAndFilteredPartners.length} partner{sortedAndFilteredPartners.length !== 1 ? 's' : ''} ditemukan
            </p>
          )}

          {/* Partner List */}
          <div className="space-y-2 sm:space-y-2.5">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 sm:h-[76px] rounded-xl bg-muted" />)
            ) : sortedAndFilteredPartners.length > 0 ? (
              sortedAndFilteredPartners.map((partner) => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  onUpdate={() => { fetchPartners(); fetchStats(); }}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Tidak ada partner ditemukan</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <PartnerAnalytics stats={stats} loading={statsLoading} partners={partners} />
      )}
  </div></div>
  );
}

// Partner Analytics Component
function PartnerAnalytics({ stats, loading, partners }: { stats: PartnerStats | null; loading: boolean; partners: Partner[] }) {
  // Prepare chart data
  const tierData = stats?.tierDistribution?.map(t => ({
    name: t.tier,
    value: t.count,
    volume: t.volume,
    profit: t.profit,
    color: TIER_COLORS[t.tier] || '#6b7280',
  })).filter(d => d.value > 0) || [];

  const topProfitData = stats?.topPartnersByProfit?.slice(0, 5) || [];
  const topVolumeData = stats?.topPartnersByVolume?.slice(0, 5) || [];

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

  // Computed insights
  const targetAchieved = partners.filter(p => p.target > 0 && p.totalProfit >= p.target).length;
  const targetPct = partners.length > 0 ? ((targetAchieved / partners.length) * 100).toFixed(0) : '0';
  const activePct = partners.length > 0 ? ((partners.filter(p => p.status === 'active').length / partners.length) * 100).toFixed(0) : '0';
  const topTier = tierData.length > 0 ? [...tierData].sort((a, b) => b.value - a.value)[0] : null;
  const topCity = stats?.topCities?.[0] || null;

  return (
    <div className="space-y-3">
      {/* Analytics Summary Card */}
      <div className="rounded-xl dash-card overflow-hidden p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Avg Profit/Partner</p>
              <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">{formatCurrency(stats?.avgProfitPerPartner || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Avg Volume/Partner</p>
              <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">{formatCurrency(stats?.avgVolumePerPartner || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">New This Month</p>
              <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">{stats?.newThisMonth || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Conversion Rate</p>
              <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
                {stats?.totalPartners > 0 ? `${((stats.activePartners / stats.totalPartners) * 100).toFixed(1)}%` : '0.0%'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 col-span-2 sm:col-span-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Growth Rate</p>
              <p className="text-sm sm:text-lg font-bold tracking-tight flex items-center gap-1">
                <span className={cn(
                  (stats?.growthRate || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {(stats?.growthRate || 0) >= 0 ? '+' : ''}{(stats?.growthRate || 0).toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Partner + Top Lokasi — 2-Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top Partners by Profit */}
        <div className="rounded-xl dash-card overflow-hidden">
          <div className="px-3 pt-3 sm:px-4 sm:pt-3.5 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
                <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                Top Partner by Profit
              </h3>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 pl-5 sm:pl-6">
                {topProfitData.length > 0
                  ? `${topProfitData[0].name} memimpin dengan ${formatCurrency(topProfitData[0].profit)} profit`
                  : 'Belum ada data partner'}
              </p>
            </div>
            {topProfitData.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 flex-shrink-0">
                {topProfitData.length} partner
              </Badge>
            )}
          </div>
          <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-3.5">
            {topProfitData.length > 0 ? (
              <div className="space-y-1.5">
                {topProfitData.map((partner, index) => (
                  <div key={partner.id} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
                      <p className="text-[11px] sm:text-sm font-medium truncate">{partner.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">{partner.transactions} transaksi</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] sm:text-sm font-bold text-primary">{formatCurrency(partner.profit)}</p>
                      <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 rounded-full">
                        {partner.tier}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-muted-foreground text-xs">
                <div className="text-center">
                  <Crown className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/30" />
                  <p>Belum ada data partner</p>
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
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                Top Lokasi
              </h3>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 pl-5 sm:pl-6">
                {topCity
                  ? `${topCity.city} paling aktif dengan ${topCity.count} partner`
                  : 'Belum ada data lokasi'}
              </p>
            </div>
            {stats?.topCities && stats.topCities.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 flex-shrink-0">
                {stats.topCities.length} lokasi
              </Badge>
            )}
          </div>
          <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-3.5">
            {stats?.topCities && stats.topCities.length > 0 ? (
              <AnalyticsBubbleMap topCities={stats.topCities} accentColor="#8b5cf6" />
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

      {/* Distribusi Tier & Performance Overview — Merged */}
      <div className="rounded-xl dash-card overflow-hidden">
        <div className="px-3 pt-3 sm:px-4 sm:pt-3.5">
          <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            Distribusi Tier & Performance
          </h3>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 pl-5 sm:pl-6">
            {topTier
              ? `Tier ${topTier.name} mendominasi dengan ${topTier.value} partner (${((topTier.value / (stats?.totalPartners || 1)) * 100).toFixed(0)}%) — ${targetPct}% partner mencapai target`
              : `${targetPct}% partner mencapai target · ${activePct}% partner aktif`}
          </p>
        </div>
        <div className="px-3 pb-3 pt-2.5 sm:px-4 sm:pb-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tier Pie */}
            <div>
              {tierData.length > 0 ? (
                <div className="flex flex-col items-center gap-2.5">
                  <ResponsiveContainer width="100%" height={100} className="sm:h-[120px]">
                    <RePieChart>
                      <Pie
                        data={tierData}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={38}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {tierData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value} partner`} />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1">
                    {tierData.map((item) => {
                      const pct = ((item.value / (stats?.totalPartners || 1)) * 100).toFixed(0);
                      return (
                        <div key={item.name} className="flex items-center justify-between text-[10px] sm:text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
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
                <div className="h-[100px] flex items-center justify-center text-muted-foreground text-xs">
                  Belum ada data
                </div>
              )}
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-2.5 content-center">
              <div className="p-2.5 sm:p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="w-3 h-3 text-primary" />
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Target</p>
                </div>
                <p className="text-lg sm:text-xl font-bold text-primary leading-none">
                  {targetPct}%
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  {targetAchieved} dari {partners.length} partner
                </p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Aktif</p>
                </div>
                <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                  {activePct}%
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  {partners.filter(p => p.status === 'active').length} dari {partners.length} partner
                </p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${activePct}%` }}
                  />
                </div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="w-3 h-3 text-amber-500" />
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Volume</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground leading-none">
                  {formatCurrency(stats?.avgVolumePerPartner || 0)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">rata-rata/partner</p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Wallet className="w-3 h-3 text-violet-500" />
                  <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Profit</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground leading-none">
                  {formatCurrency(stats?.avgProfitPerPartner || 0)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">rata-rata/partner</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Partner KPI Card
function PartnerKPICard({ title, value, icon, color, isCount }: {
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

// Partner Card
const TIER_AVATAR: Record<string, string> = {
  Bronze: 'bg-orange-500/15 text-orange-500',
  Silver: 'bg-gray-400/15 text-gray-400',
  Gold: 'bg-amber-500/15 text-amber-500',
  Platinum: 'bg-violet-500/15 text-violet-500',
};

function PartnerCard({
  partner,
  onUpdate,
}: {
  partner: Partner;
  onUpdate: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Calculate progress based on profit (not volume)
  const progress = partner.target > 0 ? Math.min(100, (partner.totalProfit / partner.target) * 100) : 0;
  const progressColor = progress >= 100 ? 'bg-emerald-500' : progress >= 70 ? 'bg-amber-500' : progress >= 40 ? 'bg-orange-500' : 'bg-red-500';

  const isSuspended = partner.status === 'suspended';
  const initials = partner.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const tierAvatarClass = TIER_AVATAR[partner.tier] || 'bg-muted/50 text-muted-foreground';

  return (
    <>
      <div
        className={cn(
          'group relative rounded-xl dash-card overflow-hidden border border-border/50 transition-all hover:border-border',
          isSuspended && 'opacity-60'
        )}
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3 cursor-pointer">
          {/* Avatar - tier-colored initials */}
          <div className={cn(
            'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] sm:text-xs font-bold',
            tierAvatarClass
          )}>
            {initials}
          </div>

          {/* Center - Name, tier, city, mini stats, progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <p className="text-[11px] sm:text-sm font-semibold truncate">{partner.name}</p>
              <Badge
                variant="outline"
                className={cn(
                  'text-[8px] sm:text-[9px] px-1.5 py-0 rounded-full flex-shrink-0',
                  partner.tier === 'Platinum' && 'border-violet-500/30 text-violet-500',
                  partner.tier === 'Gold' && 'border-amber-500/30 text-amber-500',
                  partner.tier === 'Silver' && 'border-gray-400/30 text-gray-400',
                  partner.tier === 'Bronze' && 'border-orange-500/30 text-orange-500'
                )}
              >
                {partner.tier}
              </Badge>
              {isSuspended && (
                <Badge variant="destructive" className="text-[8px] sm:text-[9px] px-1.5 py-0 rounded-full flex-shrink-0">Suspended</Badge>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1 flex-wrap">
              {partner.city && (
                <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{partner.city}</span>
              )}
              <span className="text-[10px] text-muted-foreground/40 inline sm:inline">·</span>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground">{partner.totalTransactions} trx</span>
              <span className="text-[10px] text-muted-foreground/40 hidden sm:inline">·</span>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground hidden sm:inline truncate">{formatCurrency(partner.totalVolume)}</span>
              <span className="text-[10px] text-muted-foreground/40 hidden lg:inline">·</span>
              <span className={cn(
                "text-[10px] sm:text-[11px] hidden lg:inline-flex items-center gap-1",
                partner.lastLogin ? 'text-muted-foreground' : 'text-muted-foreground/50'
              )}>
                <Clock className="w-2.5 h-2.5" />
                {partner.lastLogin ? formatTimeAgo(new Date(partner.lastLogin)) : 'Belum login'}
              </span>
            </div>
            {/* Progress bar */}
            {partner.target > 0 && (
              <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', progressColor)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className={cn(
                  'text-[9px] sm:text-[10px] font-semibold flex-shrink-0',
                  progress >= 100 ? 'text-emerald-500' : 'text-muted-foreground'
                )}>
                  {progress.toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Right - Profit + Edit */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <p className={cn(
              'text-[11px] sm:text-sm font-bold tracking-tight',
              progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
            )}>
              {formatCurrency(partner.totalProfit)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-muted/80"
              onClick={(e) => {
                e.stopPropagation();
                setShowEdit(true);
              }}
            >
              <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <PartnerDetailDialog
        partner={partner}
        open={showDetail}
        onOpenChange={setShowDetail}
        onEdit={() => {
          setShowDetail(false);
          setShowEdit(true);
        }}
      />

      {/* Edit Dialog */}
      <EditPartnerDialog
        partner={partner}
        open={showEdit}
        onOpenChange={setShowEdit}
        onSuccess={() => {
          onUpdate();
        }}
      />
    </>
  );
}

// Partner Detail Dialog
function PartnerDetailDialog({
  partner,
  open,
  onOpenChange,
  onEdit,
}: {
  partner: Partner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  const [detailedPartner, setDetailedPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && partner.id) {
      fetchPartnerDetail();
    }
  }, [open, partner.id]);

  const fetchPartnerDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/partners/${partner.id}`);
      const result = await response.json();
      if (result.success) {
        setDetailedPartner(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch partner detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const data = detailedPartner || partner;
  const progress = data.target > 0 ? Math.min(100, (data.totalProfit / data.target) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            Detail Partner
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-4 space-y-3 overflow-y-auto max-h-[75vh]">
            <Skeleton className="h-16 rounded-xl bg-muted" />
            <Skeleton className="h-32 rounded-xl bg-muted" />
            <Skeleton className="h-12 rounded-xl bg-muted" />
          </div>
        ) : (
          <div className="p-4 space-y-3 overflow-y-auto max-h-[75vh]">
            {/* Compact Header */}
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm sm:text-base font-bold',
                data.tier === 'Platinum' ? 'bg-violet-500/15 text-violet-500' :
                data.tier === 'Gold' ? 'bg-amber-500/15 text-amber-500' :
                data.tier === 'Silver' ? 'bg-gray-400/15 text-gray-400' :
                'bg-orange-500/15 text-orange-500'
              )}>
                {data.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-sm sm:text-base truncate">{data.name}</h3>
                  <Badge variant="outline" className={cn(
                    'text-[8px] sm:text-[9px] px-1.5 py-0 rounded-full',
                    data.tier === 'Platinum' && 'border-violet-500/30 text-violet-500',
                    data.tier === 'Gold' && 'border-amber-500/30 text-amber-500',
                    data.tier === 'Silver' && 'border-gray-400/30 text-gray-400',
                    data.tier === 'Bronze' && 'border-orange-500/30 text-orange-500'
                  )}>{data.tier}</Badge>
                  {data.status === 'suspended' && (
                    <Badge variant="destructive" className="text-[8px] px-1.5 py-0 rounded-full">Suspended</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-muted-foreground flex-wrap">
                  <span className="truncate min-w-0">{data.email}</span>
                  <span className="flex-shrink-0 hidden sm:inline">·</span>
                  <span className="hidden sm:inline flex-shrink-0">{data.phone}</span>
                </div>
              </div>
            </div>

            {/* Compact Stats Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded-xl bg-muted/40 text-center">
                <p className="text-[9px] font-medium text-muted-foreground">Volume</p>
                <p className="text-[11px] sm:text-xs font-bold text-primary mt-0.5">{formatCurrency(data.totalVolume)}</p>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 text-center">
                <p className="text-[9px] font-medium text-muted-foreground">Profit</p>
                <p className={cn(
                  "text-[11px] sm:text-xs font-bold mt-0.5",
                  progress >= 100 ? 'text-emerald-500' : 'text-foreground'
                )}>{formatCurrency(data.totalProfit)}</p>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 text-center">
                <p className="text-[9px] font-medium text-muted-foreground">Transaksi</p>
                <p className="text-[11px] sm:text-xs font-bold mt-0.5">{data.totalTransactions}</p>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 text-center">
                <p className="text-[9px] font-medium text-muted-foreground">Komisi</p>
                <p className="text-[11px] sm:text-xs font-bold mt-0.5">{data.commission}%</p>
              </div>
            </div>

            {/* Monthly + Target in one compact card */}
            <div className="rounded-xl bg-muted/30 p-3 space-y-3">
              {/* Target Progress */}
              {data.target > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground font-medium flex items-center gap-1"><Target className="w-3 h-3" /> Target</span>
                    <span className="font-semibold">{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatCurrency(data.totalProfit)}</span>
                    <span>dari {formatCurrency(data.target)}</span>
                  </div>
                </div>
              )}

              {/* Monthly Stats */}
              {detailedPartner?.monthlyStats && (
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/40">
                  <div>
                    <p className="text-[9px] text-muted-foreground">Volume</p>
                    <p className="text-[11px] font-semibold">{formatCurrency(detailedPartner.monthlyStats.volume)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Profit</p>
                    <p className="text-[11px] font-semibold">{formatCurrency(detailedPartner.monthlyStats.profit)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Trx</p>
                    <p className="text-[11px] font-semibold">{detailedPartner.monthlyStats.transactions}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Info rows - Kontak & Rekening in compact list */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-muted/20">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-muted-foreground">Kota</p>
                  <p className="text-[11px] font-medium truncate">{data.city || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-muted/20">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-muted-foreground">Rekening</p>
                  <p className="text-[11px] font-medium truncate">{data.bankName} · {data.bankAccount}</p>
                  <p className="text-[10px] text-muted-foreground truncate">a.n. {data.bankHolder}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-muted/20">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-muted-foreground">Bergabung</p>
                  <p className="text-[11px] font-medium">{formatShortDate(data.joinedAt)}</p>
                </div>
              </div>
              {data.lastLogin && (
                <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-muted/20">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-muted-foreground">Login Terakhir</p>
                    <p className="text-[11px] font-medium">{formatTimeAgo(new Date(data.lastLogin))}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {data.notes && (
              <div className="p-3 rounded-xl bg-muted/20">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Catatan</p>
                <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{data.notes}</p>
              </div>
            )}

            {/* Edit Button */}
            <Button
              className="w-full bg-primary text-primary-foreground rounded-xl h-9 text-xs font-semibold hover:bg-primary/90"
              onClick={onEdit}
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Edit Partner
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Edit Partner Dialog
function EditPartnerDialog({
  partner,
  open,
  onOpenChange,
  onSuccess,
}: {
  partner: Partner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tier: partner.tier,
    target: partner.target.toString(),
    status: partner.status,
    notes: partner.notes || '',
    commission: partner.commission.toString(),
  });
  const [newPassword, setNewPassword] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
      tier: partner.tier,
      target: partner.target.toString(),
      status: partner.status,
      notes: partner.notes || '',
      commission: partner.commission.toString(),
    });
    setNewPassword(null);
  }, [partner, open]);

  const handleGeneratePassword = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatePassword: true }),
      });

      const result = await response.json();
      if (result.success) {
        setNewPassword(result.newPassword);
        toast.success('Password baru berhasil dibuat');
      } else {
        toast.error(result.error || 'Gagal membuat password');
      }
    } catch (err) {
      console.error('Failed to generate password:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: formData.tier,
          target: parseFloat(formData.target),
          status: formData.status,
          notes: formData.notes,
          commission: parseFloat(formData.commission),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Partner berhasil diperbarui');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || 'Gagal memperbarui partner');
      }
    } catch (err) {
      console.error('Failed to update partner:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            Edit Partner
          </DialogTitle>
          <DialogDescription>Edit pengaturan untuk {partner.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto max-h-[75vh]">
          {/* Password Section */}
          <div className="space-y-2 p-3 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs sm:text-sm font-medium">Password</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                disabled={loading}
                className="h-9 text-xs font-medium rounded-lg"
              >
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                Generate
              </Button>
            </div>
            {newPassword && (
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-[10px] text-muted-foreground mb-0.5">Password baru:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs sm:text-sm font-mono font-bold">{newPassword}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] rounded-lg"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      toast.success('Password disalin');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2">
              {formData.status === 'active' ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500" />
              )}
              <Label className="text-xs sm:text-sm font-medium">
                {formData.status === 'active' ? 'Aktif' : 'Suspended'}
              </Label>
            </div>
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, status: checked ? 'active' : 'suspended' }))
              }
              size="md"
            />
          </div>

          {/* Tier & Commission */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tier</Label>
              <Select
                value={formData.tier}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
              >
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Komisi (%)</Label>
              <Input
                type="number"
                value={formData.commission}
                onChange={(e) => setFormData((prev) => ({ ...prev, commission: e.target.value }))}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>

          {/* Target */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Target Bulanan</Label>
            <Input
              type="number"
              value={formData.target}
              onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
              className="h-8 text-xs rounded-lg"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Catatan</Label>
            <Textarea
              placeholder="Tambahkan catatan..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="text-xs rounded-lg"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 text-xs font-medium rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground rounded-xl h-10 text-xs font-semibold hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// New Partner Dialog
function NewPartnerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Temporary password shown ONCE after partner creation. Kept only in
  // component state (NOT persisted — no localStorage/sessionStorage/Zustand).
  // Cleared when the dialog closes so it cannot be recovered.
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    city: '',
    tier: 'Bronze',
    commission: '30',
    target: '5000000',
  });

  // Clear password whenever the dialog is closed (acknowledged or not).
  // This is the only way the password leaves the API response — once the
  // dialog closes, the password is gone from the UI.
  const handleClose = (next: boolean) => {
    if (!next) {
      setTemporaryPassword(null);
      // Reset form only after password is acknowledged & dismissed
      if (!temporaryPassword) {
        setFormData({
          name: '', email: '', phone: '', bankName: '',
          bankAccount: '', bankHolder: '', city: '',
          tier: 'Bronze', commission: '30', target: '5000000',
        });
      }
    }
    setOpen(next);
  };

  // Explicit "I've saved it" acknowledgment. Clears password, closes dialog,
  // and refreshes the partner list.
  const handleAcknowledgePassword = () => {
    setTemporaryPassword(null);
    setOpen(false);
    setFormData({
      name: '', email: '', phone: '', bankName: '',
      bankAccount: '', bankHolder: '', city: '',
      tier: 'Bronze', commission: '30', target: '5000000',
    });
    onCreated();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          commission: parseInt(formData.commission),
          target: parseInt(formData.target),
        }),
      });

      const result = await response.json();
      if (result.success) {
        // DO NOT close the dialog yet. The temporary password must be shown
        // exactly once and acknowledged by the owner before the dialog can
        // be dismissed. Password lives only in component state — never in
        // URL, never in toast, never in persistent storage.
        if (result.temporaryPassword) {
          setTemporaryPassword(result.temporaryPassword);
          toast.success('Partner berhasil dibuat — simpan password sementara di bawah');
        } else {
          // Defensive: API should always return a temp password on create.
          // If it doesn't, do not silently proceed — surface the issue.
          toast.error('Password sementara tidak diterima dari server. Hubungi admin.');
        }
      } else {
        toast.error(result.error || 'Gagal membuat partner');
      }
    } catch (err) {
      console.error('Failed to create partner:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground rounded-lg h-9 px-4 font-medium hover:bg-primary/90">
          <UserPlus className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Baru</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-base sm:text-lg">
            {temporaryPassword ? 'Password Sementara' : 'Partner Baru'}
          </DialogTitle>
          <DialogDescription>
            {temporaryPassword
              ? 'Simpan password sekarang — tidak dapat dilihat kembali'
              : 'Tambahkan mitra baru ke sistem'}
          </DialogDescription>
        </DialogHeader>

        {/* === TEMPORARY PASSWORD REVEAL === */}
        {/* Shown exactly once after creation. Cannot be re-fetched. */}
        {temporaryPassword && (
          <div className="p-4 space-y-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Simpan password ini sekarang. Password tidak dapat dilihat kembali.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-background border border-border">
                <p className="text-[10px] text-muted-foreground mb-0.5">Password sementara partner:</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold break-all">{temporaryPassword}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] rounded-lg flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(temporaryPassword);
                      toast.success('Password disalin');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 bg-primary text-primary-foreground rounded-xl h-10 text-xs font-semibold hover:bg-primary/90"
                onClick={handleAcknowledgePassword}
              >
                Saya sudah menyimpan password
              </Button>
            </div>
          </div>
        )}

        {!temporaryPassword && (
        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nama Lengkap *</Label>
              <Input
                placeholder="Nama"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">No. WA *</Label>
              <Input
                placeholder="08xxx"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                required
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email *</Label>
            <Input
              type="email"
              placeholder="email@contoh.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="h-8 text-xs rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Kota *</Label>
            <CitySearch
              value={formData.city}
              onChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
              placeholder="Cari kota..."
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border/60">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Rekening</p>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nama Bank *</Label>
              <Select
                value={formData.bankName || '__placeholder__'}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, bankName: value }));
                  if (value !== 'Lainnya') {
                    setFormData((prev) => ({ ...prev, customBankName: '' }));
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Pilih bank..." />
                </SelectTrigger>
                <SelectContent>
                  {['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon', 'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'].map(bank => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.bankName === 'Lainnya' && (
                <Input
                  placeholder="Ketik nama bank..."
                  value={(formData as Record<string, string>).customBankName || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value, customBankName: e.target.value }))}
                  className="h-8 text-xs rounded-lg mt-1.5"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">No. Rekening *</Label>
                <Input
                  placeholder="1234567890"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bankAccount: e.target.value }))}
                  required
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nama di Rekening *</Label>
                <Input
                  placeholder="Nama pemilik"
                  value={formData.bankHolder}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bankHolder: e.target.value }))}
                  required
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/60">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pengaturan</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bronze">Bronze</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Komisi (%)</Label>
                <Input
                  type="number"
                  value={formData.commission}
                  onChange={(e) => setFormData((prev) => ({ ...prev, commission: e.target.value }))}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Target Bulanan</Label>
              <Input
                type="number"
                value={formData.target}
                onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-xs font-medium rounded-lg" onClick={() => handleClose(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-primary text-primary-foreground rounded-xl h-10 text-xs font-semibold hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper function
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} bulan lalu`;
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear} tahun lalu`;
}
