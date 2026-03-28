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
  Trophy,
  TrendingUp,
  TrendingDown,
  Crown,
  Star,
  UserPlus,
  Loader2,
  Medal,
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
  PieChart,
  Activity,
  Award,
} from 'lucide-react';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CitySearch } from '@/components/ui/city-search';
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

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

  const filteredPartners = partners.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(searchLower) ||
      p.email?.toLowerCase().includes(searchLower) ||
      p.city?.toLowerCase().includes(searchLower)
    );
  });

  const activePartners = partners.filter((p) => p.status === 'active');
  const totalVolume = partners.reduce((sum, p) => sum + (p.totalVolume || 0), 0);
  const totalProfit = partners.reduce((sum, p) => sum + (p.totalProfit || 0), 0);

  // Sort partners by profit for top ranking
  const topPartners = [...partners]
    .sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0))
    .slice(0, 5);

  // Count partners by tier
  const tierCounts = {
    Bronze: partners.filter((p) => p.tier === 'Bronze').length,
    Silver: partners.filter((p) => p.tier === 'Silver').length,
    Gold: partners.filter((p) => p.tier === 'Gold').length,
    Platinum: partners.filter((p) => p.tier === 'Platinum').length,
  };

  if (isLoading || !hasHydrated) {
    return (
      <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3 pb-20 md:pb-4">
        <Skeleton className="h-8 w-24" />
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-1.5">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  return (
    <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span className="truncate">Partner</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Kelola mitra aktif</p>
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
            onClick={() => { fetchPartners(); fetchStats(); }}
            size="sm"
            variant="outline"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isRefreshing && "animate-spin")} />
          </Button>
          <NewPartnerDialog onCreated={() => { fetchPartners(); fetchStats(); }} />
        </div>
      </div>

      {/* KPI Cards - Always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        <PartnerKPICard
          title="Partner Aktif"
          value={activePartners.length}
          icon={<Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="primary"
          isCount
        />
        <PartnerKPICard
          title="Total Volume"
          value={totalVolume}
          icon={<TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="green"
        />
        <PartnerKPICard
          title="Total Profit"
          value={totalProfit}
          icon={<Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="amber"
        />
        <PartnerKPICard
          title="Total Trx"
          value={partners.reduce((sum, p) => sum + (p.totalTransactions || 0), 0)}
          icon={<BarChart3 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="purple"
          isCount
        />
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setMainTab('list')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium transition-all",
            mainTab === 'list' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="w-4 h-4" />
          Partner
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
      {mainTab === 'list' ? (
        <div className="space-y-3">
          {/* Top Partners */}
          {topPartners.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                  <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
                  Top Partner
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-2.5 sm:pb-3">
                <div className="space-y-1.5 sm:space-y-2">
                  {topPartners.map((partner, index) => (
                    <TopPartnerItem key={partner.id} partner={partner} rank={index + 1} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tier Statistics */}
          <Card className="glass-card">
            <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                Statistik Tier
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2.5 sm:pb-3">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <TierBadge tier="Bronze" count={tierCounts.Bronze} color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" />
                <TierBadge tier="Silver" count={tierCounts.Silver} color="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" />
                <TierBadge tier="Gold" count={tierCounts.Gold} color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" />
                <TierBadge tier="Platinum" count={tierCounts.Platinum} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" />
              </div>
              <div className="mt-2 sm:mt-3 h-2 sm:h-3 rounded-full overflow-hidden flex">
                {Object.entries(tierCounts).map(([tier, count]) => {
                  const total = Object.values(tierCounts).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  const colors: Record<string, string> = {
                    Bronze: 'bg-orange-400',
                    Silver: 'bg-gray-400',
                    Gold: 'bg-yellow-400',
                    Platinum: 'bg-purple-400',
                  };
                  return percentage > 0 ? (
                    <div
                      key={tier}
                      className={cn(colors[tier], 'h-full transition-all')}
                      style={{ width: `${percentage}%` }}
                    />
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, kota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 h-9 sm:h-10 rounded-xl text-sm"
            />
          </div>

          {/* Partner List */}
          <div className="space-y-2">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 sm:h-28 rounded-lg sm:rounded-xl" />)
            ) : filteredPartners.length > 0 ? (
              filteredPartners.map((partner, index) => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  rank={index + 1}
                  onUpdate={() => { fetchPartners(); fetchStats(); }}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-xs sm:text-sm text-muted-foreground">Tidak ada partner ditemukan</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <PartnerAnalytics stats={stats} loading={statsLoading} partners={partners} />
      )}
    </div>
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
      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        <AnalyticsCard
          title="Avg Profit/Partner"
          value={stats?.avgProfitPerPartner || 0}
          subtitle="rata-rata profit"
          icon={<Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="amber"
        />
        <AnalyticsCard
          title="Avg Volume/Partner"
          value={stats?.avgVolumePerPartner || 0}
          subtitle="rata-rata volume"
          icon={<TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="green"
        />
        <AnalyticsCard
          title="New This Month"
          value={stats?.newThisMonth || 0}
          subtitle="partner baru"
          icon={<UserPlus className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="primary"
          isCount
        />
        <AnalyticsCard
          title="Growth Rate"
          value={`${(stats?.growthRate || 0).toFixed(1)}%`}
          subtitle="pertumbuhan"
          icon={<Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="purple"
          isPercent
          change={stats?.growthRate}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        {/* Tier Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Distribusi Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            {tierData.length > 0 ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <ResponsiveContainer width="45%" height={140} className="sm:h-[180px]">
                  <RePieChart>
                    <Pie
                      data={tierData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
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
                <div className="flex-1 space-y-1 sm:space-y-1.5">
                  {tierData.map((item) => (
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

        {/* Top Cities */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Top Lokasi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            {stats?.topCities && stats.topCities.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {stats.topCities.slice(0, 5).map((city, index) => {
                  const percentage = stats.totalPartners > 0 
                    ? (city.count / stats.totalPartners) * 100 
                    : 0;
                  return (
                    <div key={city.city} className="flex items-center gap-2 sm:gap-3">
                      <div className={cn(
                        "w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center text-[9px] sm:text-xs font-bold flex-shrink-0",
                        index === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        index === 1 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                        index === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="text-[10px] sm:text-sm font-medium truncate">{city.city}</span>
                          <span className="text-[9px] sm:text-xs text-muted-foreground">{city.count}</span>
                        </div>
                        <div className="h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[9px] sm:text-xs font-medium text-primary flex-shrink-0">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[140px] sm:h-[180px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                Belum ada data lokasi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Partners by Profit */}
      <Card className="glass-card">
        <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            Top Partner by Profit
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
          {topProfitData.length > 0 ? (
            <div className="space-y-1.5 sm:space-y-2">
              {topProfitData.map((partner, index) => (
                <div key={partner.id} className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-muted/30">
                  <div className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-xs flex-shrink-0",
                    index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
                    index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                    index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] sm:text-sm font-medium truncate">{partner.name}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground">{partner.transactions} transaksi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] sm:text-sm font-bold text-primary">{formatCurrency(partner.profit)}</p>
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] h-4 sm:h-5 px-1">
                      {partner.tier}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
              Belum ada data partner
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card className="glass-card">
        <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 rounded-lg sm:rounded-xl bg-muted/30">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Target Achievement</p>
              <p className="text-sm sm:text-lg font-bold text-primary">
                {partners.length > 0 
                  ? ((partners.filter(p => p.target > 0 && p.totalProfit >= p.target).length / partners.length) * 100).toFixed(0)
                  : 0}%
              </p>
              <p className="text-[9px] text-muted-foreground">partners achieved target</p>
            </div>
            <div className="text-center p-2 sm:p-3 rounded-lg sm:rounded-xl bg-muted/30">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Active Rate</p>
              <p className="text-sm sm:text-lg font-bold text-green-600">
                {partners.length > 0 
                  ? ((partners.filter(p => p.status === 'active').length / partners.length) * 100).toFixed(0)
                  : 0}%
              </p>
              <p className="text-[9px] text-muted-foreground">partners active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Analytics Card Component
function AnalyticsCard({ title, value, subtitle, icon, color, isCount, isPercent, change }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'amber' | 'purple';
  isCount?: boolean;
  isPercent?: boolean;
  change?: number;
}) {
  const colorClasses = {
    primary: 'from-primary to-primary/70',
    green: 'from-green-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-violet-600',
  };

  const bgColorClasses = {
    primary: 'bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20',
    green: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
    amber: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    purple: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
  };

  return (
    <Card className={cn("glass-card overflow-hidden", bgColorClasses[color])}>
      <div className={cn("h-0.5 sm:h-1 bg-gradient-to-r", colorClasses[color])} />
      <CardContent className="p-2 sm:p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{title}</p>
            <p className="text-sm sm:text-lg font-bold truncate">
              {isPercent ? value : isCount ? (typeof value === 'number' ? value.toLocaleString() : value) : formatCurrency(value as number)}
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
          <div className={cn("w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
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
  const colorClasses = {
    primary: 'from-primary to-primary/70',
    green: 'from-green-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-violet-600',
  };

  const bgColorClasses = {
    primary: 'bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20',
    green: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
    amber: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    purple: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
  };

  return (
    <Card className={cn("glass-card overflow-hidden", bgColorClasses[color])}>
      <div className={cn("h-0.5 sm:h-1 bg-gradient-to-r", colorClasses[color])} />
      <CardContent className="p-2 sm:p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{title}</p>
            <p className="text-sm sm:text-lg font-bold truncate">
              {isCount ? value.toLocaleString() : formatCurrency(value)}
            </p>
          </div>
          <div className={cn("w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Top Partner Item
function TopPartnerItem({ partner, rank }: { partner: Partner; rank: number }) {
  const getRankStyle = (rank: number) => {
    if (rank === 1) return { icon: Crown, class: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
    if (rank === 2) return { icon: Trophy, class: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/50' };
    if (rank === 3) return { icon: Medal, class: 'text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    return { icon: Star, class: 'text-muted-foreground', bg: 'bg-muted/50' };
  };

  const style = getRankStyle(rank);
  const RankIcon = style.icon;

  return (
    <div className={cn('flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg', style.bg)}>
      <div className={cn('w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center', style.class)}>
        <RankIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <p className="text-[11px] sm:text-sm font-medium truncate">{partner.name}</p>
          <Badge variant="outline" className="text-[9px] sm:text-[10px] h-4 px-1">{partner.tier}</Badge>
        </div>
        <p className="text-[9px] sm:text-xs text-muted-foreground">{partner.totalTransactions} transaksi</p>
      </div>
      <p className="text-[11px] sm:text-sm font-bold text-primary">{formatCurrency(partner.totalProfit)}</p>
    </div>
  );
}

// Tier Badge
function TierBadge({ tier, count, color }: { tier: string; count: number; color: string }) {
  return (
    <div className={cn('px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 sm:gap-2', color)}>
      <span className="text-[10px] sm:text-xs font-medium">{tier}</span>
      <span className="text-[10px] sm:text-xs font-bold">{count}</span>
    </div>
  );
}

// Partner Card
function PartnerCard({
  partner,
  rank,
  onUpdate,
}: {
  partner: Partner;
  rank: number;
  onUpdate: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Crown, class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    if (rank === 2) return { icon: Trophy, class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
    if (rank === 3) return { icon: Star, class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    return null;
  };

  const badge = getRankBadge(rank);

  // Calculate progress based on profit (not volume)
  const progress = partner.target > 0 ? Math.min(100, (partner.totalProfit / partner.target) * 100) : 0;
  const progressColor = progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-400';

  const isSuspended = partner.status === 'suspended';

  return (
    <>
      <Card className={cn('glass-card overflow-hidden tap-highlight active-scale', isSuspended && 'opacity-60')}>
        <CardContent className="p-0">
          <div
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 cursor-pointer"
            onClick={() => setShowDetail(true)}
          >
            {/* Rank */}
            <div
              className={cn(
                'w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 font-bold',
                badge ? badge.class : 'bg-muted text-muted-foreground'
              )}
            >
              {badge ? <badge.icon className="w-4 h-4 sm:w-5 sm:h-5" /> : <span className="text-xs sm:text-sm">{rank}</span>}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <p className="text-[11px] sm:text-sm font-medium truncate">{partner.name}</p>
                <Badge variant="outline" className="text-[9px] sm:text-[10px] h-4 px-1">{partner.tier}</Badge>
                {isSuspended && (
                  <Badge variant="destructive" className="text-[9px] h-4 px-1">Suspended</Badge>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{partner.city}</p>

              {/* Progress Bar */}
              <div className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
                <div className="flex items-center justify-between text-[9px] sm:text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full transition-all duration-300', progressColor)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex flex-col items-end gap-0.5 sm:gap-1 flex-shrink-0">
              <p className="text-[11px] sm:text-sm font-bold text-primary">{formatCurrency(partner.totalProfit)}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground">{partner.totalTransactions} trx</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 sm:h-7 sm:w-7 p-0 mt-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEdit(true);
                }}
              >
                <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            Detail Partner
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {data.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base truncate">{data.name}</h3>
                  <Badge variant="outline" className="text-[10px]">{data.tier}</Badge>
                  {data.status === 'suspended' && (
                    <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{data.email}</p>
              </div>
            </div>

            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm">Kontak</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 sm:px-4 pb-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs sm:text-sm">{data.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs sm:text-sm">{data.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs sm:text-sm">{data.city}</span>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm">Rekening</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 sm:px-4 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs sm:text-sm">{data.bankName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium">{data.bankAccount}</p>
                    <p className="text-[10px] text-muted-foreground">a.n. {data.bankHolder}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm">Statistik</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="text-center p-2 sm:p-2.5 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Volume</p>
                    <p className="text-xs sm:text-sm font-bold text-primary">{formatCurrency(data.totalVolume)}</p>
                  </div>
                  <div className="text-center p-2 sm:p-2.5 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Profit</p>
                    <p className="text-xs sm:text-sm font-bold text-green-600">{formatCurrency(data.totalProfit)}</p>
                  </div>
                  <div className="text-center p-2 sm:p-2.5 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Transaksi</p>
                    <p className="text-sm sm:text-base font-bold">{data.totalTransactions}</p>
                  </div>
                  <div className="text-center p-2 sm:p-2.5 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Komisi</p>
                    <p className="text-sm sm:text-base font-bold">{data.commission}%</p>
                  </div>
                </div>

                {/* Monthly Stats */}
                {detailedPartner?.monthlyStats && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-[10px] text-muted-foreground mb-2">Bulan Ini</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Volume</p>
                        <p className="text-[10px] sm:text-xs font-medium">{formatCurrency(detailedPartner.monthlyStats.volume)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Profit</p>
                        <p className="text-[10px] sm:text-xs font-medium">{formatCurrency(detailedPartner.monthlyStats.profit)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Trx</p>
                        <p className="text-[10px] sm:text-xs font-medium">{detailedPartner.monthlyStats.transactions}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Target Progress */}
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Target Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] sm:text-xs">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-medium">{formatCurrency(data.target)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-xs">
                    <span className="text-muted-foreground">Profit</span>
                    <span className="font-medium">{formatCurrency(data.totalProfit)}</span>
                  </div>
                  <Progress
                    value={data.target > 0 ? Math.min(100, (data.totalProfit / data.target) * 100) : 0}
                    className="h-2"
                  />
                  <p className="text-right text-[10px] sm:text-xs font-medium">
                    {data.target > 0 ? ((data.totalProfit / data.target) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {data.notes && (
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-3 sm:px-4">
                  <CardTitle className="text-xs sm:text-sm">Catatan</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{data.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Joined Date */}
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Bergabung: {formatShortDate(data.joinedAt)}</span>
            </div>

            {/* Edit Button */}
            <Button
              className="w-full gradient-primary text-white h-9 sm:h-10"
              onClick={onEdit}
            >
              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            Edit Partner
          </DialogTitle>
          <DialogDescription>Edit pengaturan untuk {partner.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Password Section */}
          <div className="space-y-2 p-2.5 sm:p-3 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs sm:text-sm font-medium">Password</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                disabled={loading}
                className="h-7 sm:h-8 text-[10px] sm:text-xs"
              >
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                Generate
              </Button>
            </div>
            {newPassword && (
              <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-[10px] text-muted-foreground mb-0.5">Password baru:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs sm:text-sm font-mono font-bold">{newPassword}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 sm:h-6 px-2 text-[10px]"
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
          <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {formData.status === 'active' ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
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
            />
          </div>

          {/* Tier & Commission */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tier</Label>
              <Select
                value={formData.tier}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
              >
                <SelectTrigger className="h-9">
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
            <div className="space-y-1">
              <Label className="text-xs">Komisi (%)</Label>
              <Input
                type="number"
                value={formData.commission}
                onChange={(e) => setFormData((prev) => ({ ...prev, commission: e.target.value }))}
                className="h-9"
              />
            </div>
          </div>

          {/* Target */}
          <div className="space-y-1">
            <Label className="text-xs">Target Bulanan</Label>
            <Input
              type="number"
              value={formData.target}
              onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
              className="h-9"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Catatan</Label>
            <Textarea
              placeholder="Tambahkan catatan..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-primary text-white h-9"
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
        setOpen(false);
        onCreated();
        setFormData({
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
        toast.success('Partner berhasil dibuat');
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-white rounded-lg h-8 px-3 text-[10px] sm:text-xs">
          <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Partner Baru</DialogTitle>
          <DialogDescription>Tambahkan mitra baru ke sistem</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nama Lengkap *</Label>
              <Input
                placeholder="Nama"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">No. WA *</Label>
              <Input
                placeholder="08xxx"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                required
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Email *</Label>
            <Input
              type="email"
              placeholder="email@contoh.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Kota *</Label>
            <CitySearch
              value={formData.city}
              onChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
              placeholder="Cari kota..."
            />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium">Rekening</p>
            <div className="space-y-1">
              <Label className="text-xs">Nama Bank *</Label>
              <Input
                placeholder="BCA, Mandiri, BRI"
                value={formData.bankName}
                onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))}
                required
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1">
                <Label className="text-xs">No. Rekening *</Label>
                <Input
                  placeholder="1234567890"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bankAccount: e.target.value }))}
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama di Rekening *</Label>
                <Input
                  placeholder="Nama pemilik"
                  value={formData.bankHolder}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bankHolder: e.target.value }))}
                  required
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium">Pengaturan</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
                >
                  <SelectTrigger className="h-9">
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
              <div className="space-y-1">
                <Label className="text-xs">Komisi (%)</Label>
                <Input
                  type="number"
                  value={formData.commission}
                  onChange={(e) => setFormData((prev) => ({ ...prev, commission: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target Bulanan</Label>
              <Input
                type="number"
                value={formData.target}
                onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 gradient-primary text-white h-9" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper function
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
}
