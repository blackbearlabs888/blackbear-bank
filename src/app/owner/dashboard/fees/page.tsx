'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CreditCard,
  Plus,
  DollarSign,
  Loader2,
  TrendingUp,
  Globe,
  BarChart3,
  RefreshCw,
  Settings2,
  Sparkles,
  Search,
  ImageIcon,
  Store,
  Truck,
  Target,
} from 'lucide-react';
import { formatCurrency, formatShort } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PaymentType {
  id: string;
  name: string;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  discountPercent: number;
  discountNominal: number;
  minTransaction: number;
  logoUrl: string | null;
  isActive: boolean;
}

interface PaymentTypeStats {
  id: string;
  name: string;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  discountPercent: number;
  discountNominal: number;
  minTransaction: number;
  logoUrl: string | null;
  isActive: boolean;
  transactionCount: number;
  onlineCount: number;
  codCount: number;
  totalVolume: number;
  totalFees: number;
}

interface Marketplace {
  id: string;
  name: string;
  feePercent: number;
  feeFlat: number;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

interface MarketplaceStats {
  id: string;
  name: string;
  feePercent: number;
  feeFlat: number;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  transactionCount: number;
  totalVolume: number;
  totalFees: number;
}

type DiscountType = 'percent' | 'nominal';

export default function OwnerFeesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [paymentTypeStats, setPaymentTypeStats] = useState<PaymentTypeStats[]>([]);
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mainTab, setMainTab] = useState<'payment' | 'marketplace'>('payment');
  const [searchQuery, setSearchQuery] = useState('');
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
      fetchData();
    }
  }, [isAuthenticated, hasHydrated, user]);

  // Reset search on tab change
  useEffect(() => {
    setSearchQuery('');
  }, [mainTab]);

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => {
        fetchData(true);
      }, 60000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, hasHydrated, user]);

  const fetchData = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [ptRes, mpRes, ptStatsRes, mpStatsRes] = await Promise.all([
        fetch('/api/payment-types'),
        fetch('/api/marketplaces'),
        fetch('/api/payment-types/stats'),
        fetch('/api/marketplaces/stats'),
      ]);
      
      const ptData = await ptRes.json();
      const mpData = await mpRes.json();
      const ptStatsData = await ptStatsRes.json();
      const mpStatsData = await mpStatsRes.json();
      
      if (ptData.success) setPaymentTypes(ptData.data);
      if (mpData.success) setMarketplaces(mpData.data);
      if (ptStatsData.success) setPaymentTypeStats(ptStatsData.data);
      if (mpStatsData.success) setMarketplaceStats(mpStatsData.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const togglePaymentType = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/payment-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const result = await response.json();
      if (result.success) {
        setPaymentTypes(prev => 
          prev.map(pt => pt.id === id ? { ...pt, isActive: !isActive } : pt)
        );
        setPaymentTypeStats(prev => 
          prev.map(pt => pt.id === id ? { ...pt, isActive: !isActive } : pt)
        );
        toast.success(isActive ? 'Payment type dinonaktifkan' : 'Payment type diaktifkan');
      }
    } catch (err) {
      console.error('Failed to toggle payment type:', err);
    }
  };

  const toggleMarketplace = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/marketplaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const result = await response.json();
      if (result.success) {
        setMarketplaces(prev => 
          prev.map(mp => mp.id === id ? { ...mp, isActive: !isActive } : mp)
        );
        setMarketplaceStats(prev => 
          prev.map(mp => mp.id === id ? { ...mp, isActive: !isActive } : mp)
        );
        toast.success(isActive ? 'Marketplace dinonaktifkan' : 'Marketplace diaktifkan');
      }
    } catch (err) {
      console.error('Failed to toggle marketplace:', err);
    }
  };

  // Filtered lists based on search
  const filteredPaymentTypes = useMemo(() => {
    if (!searchQuery.trim()) return paymentTypes;
    const q = searchQuery.toLowerCase();
    return paymentTypes.filter(pt => pt.name.toLowerCase().includes(q));
  }, [paymentTypes, searchQuery]);

  const filteredMarketplaces = useMemo(() => {
    if (!searchQuery.trim()) return marketplaces;
    const q = searchQuery.toLowerCase();
    return marketplaces.filter(mp => mp.name.toLowerCase().includes(q));
  }, [marketplaces, searchQuery]);

  if (isLoading || !hasHydrated) {
    return (
      <div className="min-h-screen bg-background dashboard-mesh">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
          <Skeleton className="h-8 w-24" />
          <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 flex-1 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  const activePaymentTypes = paymentTypes.filter(pt => pt.isActive).length;
  const activeMarketplaces = marketplaces.filter(mp => mp.isActive).length;
  const totalPlatformFees = marketplaceStats.reduce((sum, mp) => sum + mp.totalFees, 0);
  const totalPaymentFees = paymentTypeStats.reduce((sum, pt) => sum + pt.totalFees, 0);

  return (
    <div className="min-h-screen bg-background dashboard-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Fee & Marketplace</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Pengaturan Fee</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">Kelola biaya & marketplace</p>
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
        <Button
          onClick={() => fetchData()}
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 rounded-lg"
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <FeeKPICard
          title="Payment Aktif"
          value={activePaymentTypes}
          icon={<CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="primary"
          isCount
        />
        <FeeKPICard
          title="Marketplace"
          value={activeMarketplaces}
          icon={<Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="green"
          isCount
        />
        <FeeKPICard
          title="Fee Payment"
          value={totalPaymentFees}
          icon={<TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="violet"
        />
        <FeeKPICard
          title="Fee Platform"
          value={totalPlatformFees}
          icon={<DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          color="amber"
        />
      </div>

      {/* ── Active Discounts Indicator ── */}
      <ActiveDiscountsCard paymentTypes={paymentTypes} />

      {/* ── Main Tabs: Payment & Marketplace ── */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
        <button
          onClick={() => setMainTab('payment')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
            mainTab === 'payment' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          <CreditCard className="w-4 h-4" />
          Payment
        </button>
        <button
          onClick={() => setMainTab('marketplace')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
            mainTab === 'marketplace' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          <Globe className="w-4 h-4" />
          Marketplace
        </button>
      </div>

      {/* ── Tab Content ── */}
      {mainTab === 'payment' ? (
        <div className="space-y-4">
          {/* Stats Summary */}
          {paymentTypeStats.length > 0 && (
            <Card className="rounded-xl dash-card overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-3.5 h-3.5 text-primary dark:text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Top Payment by Volume</span>
                </div>
                <div className="space-y-2">
                  {[...paymentTypeStats].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 3).map((pt, idx) => (
                    <div key={pt.id} className="flex items-center justify-between text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="w-4 h-4 p-0 text-[8px] justify-center">
                          {idx + 1}
                        </Badge>
                        <span className="truncate">{pt.name}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(pt.totalVolume)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search + New Button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari payment type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs rounded-lg"
              />
            </div>
            <NewPaymentTypeDialog onCreated={() => fetchData()} />
          </div>

          {/* Payment Type Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 sm:h-48 rounded-xl" />)}
            </div>
          ) : filteredPaymentTypes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredPaymentTypes.map((pt) => {
                const stats = paymentTypeStats.find(s => s.id === pt.id);
                return (
                  <PaymentTypeGridCard
                    key={pt.id}
                    paymentType={pt}
                    stats={stats}
                    onToggle={() => togglePaymentType(pt.id, pt.isActive)}
                    onUpdated={() => fetchData()}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                {searchQuery ? 'Tidak ditemukan' : 'Belum ada tipe pembayaran'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats Summary */}
          {marketplaceStats.length > 0 && (
            <Card className="rounded-xl dash-card overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Top Marketplace by Fee</span>
                </div>
                <div className="space-y-2">
                  {[...marketplaceStats].sort((a, b) => b.totalFees - a.totalFees).slice(0, 3).map((mp, idx) => (
                    <div key={mp.id} className="flex items-center justify-between text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="w-4 h-4 p-0 text-[8px] justify-center">
                          {idx + 1}
                        </Badge>
                        <span className="truncate">{mp.name}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(mp.totalFees)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search + New Button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs rounded-lg"
              />
            </div>
            <NewMarketplaceDialog onCreated={() => fetchData()} />
          </div>

          {/* Marketplace Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 sm:h-44 rounded-xl" />)}
            </div>
          ) : filteredMarketplaces.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredMarketplaces.map((mp) => {
                const stats = marketplaceStats.find(s => s.id === mp.id);
                return (
                  <MarketplaceGridCard
                    key={mp.id}
                    marketplace={mp}
                    stats={stats}
                    onToggle={() => toggleMarketplace(mp.id, mp.isActive)}
                    onUpdated={() => fetchData()}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                {searchQuery ? 'Tidak ditemukan' : 'Belum ada marketplace'}
              </p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// Fee KPI Card
function FeeKPICard({ title, value, icon, color, isCount }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'violet' | 'amber';
  isCount?: boolean;
}) {
  const iconBgClasses = {
    primary: 'bg-primary/15',
    green: 'bg-emerald-500/15',
    violet: 'bg-violet-500/15',
    amber: 'bg-amber-500/15',
  };

  const iconColorClasses = {
    primary: 'text-primary dark:text-primary',
    green: 'text-emerald-600 dark:text-emerald-400',
    violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="rounded-lg bg-muted/30 border border-border p-3 sm:p-3.5 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center", iconBgClasses[color])}>
          <div className={iconColorClasses[color]}>{icon}</div>
        </div>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">{title}</span>
      </div>
      <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
        {isCount ? value : formatCurrency(value)}
      </p>
    </div>
  );
}

// Active Discounts Indicator Card
function ActiveDiscountsCard({ paymentTypes }: { paymentTypes: PaymentType[] }) {
  const discounted = paymentTypes.filter(
    pt => pt.isActive && (pt.discountPercent > 0 || pt.discountNominal > 0)
  );

  if (discounted.length === 0) return null;

  return (
    <Card className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-card shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold">Diskon Berjalan</p>
            <p className="text-[10px] text-muted-foreground">Payment type yang sedang diskon</p>
          </div>
          <Badge className="ml-auto text-[9px] px-2 py-0.5 rounded-full h-5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
            {discounted.length} aktif
          </Badge>
        </div>
        <div className="space-y-1.5">
          {discounted.map(pt => {
            const label = pt.discountPercent > 0
              ? `${pt.discountPercent}%`
              : formatCurrency(pt.discountNominal);
            return (
              <div
                key={pt.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {pt.logoUrl ? (
                    <img
                      src={pt.logoUrl}
                      alt={pt.name}
                      className="w-6 h-6 rounded-md object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-amber-200/60 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    </div>
                  )}
                  <span className="text-[11px] sm:text-xs font-medium truncate">{pt.name}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {pt.minTransaction > 0 && (
                    <span className="text-[9px] text-muted-foreground hidden sm:inline">
                      Min. {formatCurrency(pt.minTransaction)}
                    </span>
                  )}
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    -{label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Payment Type Grid Card (compact card in grid layout)
// ============================================================
function PaymentTypeGridCard({ 
  paymentType, 
  stats, 
  onToggle, 
  onUpdated 
}: { 
  paymentType: PaymentType;
  stats?: PaymentTypeStats;
  onToggle: () => void;
  onUpdated: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);

  const hasDiscount = paymentType.discountPercent > 0 || paymentType.discountNominal > 0;
  const discountBadgeLabel = paymentType.discountPercent > 0 
    ? `Diskon: ${paymentType.discountPercent}%` 
    : `Diskon: ${formatCurrency(paymentType.discountNominal)}`;

  return (
    <>
      <Card className={cn(
        "rounded-xl border border-border/60 bg-card shadow-none flex flex-col overflow-hidden",
        !paymentType.isActive && "opacity-60"
      )}>
        <CardContent className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
          {/* Top row: Logo + Name + Switch */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              {/* Logo */}
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden relative",
                paymentType.isActive ? "bg-primary/10 dark:bg-primary/20" : "bg-muted"
              )}>
                {paymentType.logoUrl ? (
                  <img 
                    src={paymentType.logoUrl} 
                    alt={paymentType.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <CreditCard className={cn("w-5 h-5 sm:w-6 sm:h-6", paymentType.isActive ? "text-primary dark:text-primary" : "text-muted-foreground")} />
                )}
                {/* Hidden fallback icon for error state */}
                <CreditCard className={cn("w-5 h-5 sm:w-6 sm:h-6 hidden absolute", paymentType.isActive ? "text-primary dark:text-primary" : "text-muted-foreground")} />
              </div>

              <div className="min-w-0 flex-1">
                {/* Name */}
                <p className="text-[11px] sm:text-sm font-semibold truncate leading-tight">{paymentType.name}</p>
                
                {/* Fee display */}
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">
                  {paymentType.onlineFeePercent}% + {formatCurrency(paymentType.onlineFeeFlat)}
                </p>

                {/* Discount badge */}
                {hasDiscount && (
                  <Badge className="mt-1 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    {discountBadgeLabel}
                  </Badge>
                )}

                {/* Min transaction indicator */}
                {hasDiscount && paymentType.minTransaction > 0 && (
                  <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5">
                    Min. {formatCurrency(paymentType.minTransaction)}
                  </p>
                )}
              </div>
            </div>
            {/* Switch — top right */}
            <div className="flex-shrink-0">
              <Switch
                size="sm"
                checked={paymentType.isActive}
                onCheckedChange={onToggle}
              />
            </div>
          </div>

          {/* Stats row - Payment Type */}
          {stats && (
            <div className="grid grid-cols-3 gap-1 mt-auto pt-2 border-t">
              <div className="text-center">
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Trx</p>
                <p className="text-[9px] sm:text-[10px] font-semibold">{formatShort(stats.transactionCount)}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Volume</p>
                <p className="text-[9px] sm:text-[10px] font-semibold">{formatShort(stats.totalVolume)}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Fee</p>
                <p className="text-[9px] sm:text-[10px] font-semibold">{formatShort(stats.totalFees)}</p>
              </div>
            </div>
          )}

          {/* Bottom row: Edit button */}
          <div className="flex items-center justify-end pt-1 mt-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setShowEdit(true)}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditPaymentTypeDialog 
        paymentType={paymentType} 
        open={showEdit} 
        onOpenChange={setShowEdit} 
        onUpdated={onUpdated} 
      />
    </>
  );
}

// ============================================================
// Marketplace Grid Card (compact card in grid layout)
// ============================================================
function MarketplaceGridCard({ 
  marketplace, 
  stats, 
  onToggle, 
  onUpdated 
}: { 
  marketplace: Marketplace;
  stats?: MarketplaceStats;
  onToggle: () => void;
  onUpdated: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <Card className={cn(
        "rounded-xl border border-border/60 bg-card shadow-none flex flex-col overflow-hidden",
        !marketplace.isActive && "opacity-60"
      )}>
        <CardContent className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
          {/* Top row: Logo + Name + Switch */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              {/* Logo */}
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden relative",
                marketplace.isActive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted"
              )}>
                {marketplace.logoUrl ? (
                  <img 
                    src={marketplace.logoUrl} 
                    alt={marketplace.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <Store className={cn("w-5 h-5 sm:w-6 sm:h-6", marketplace.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
                )}
                <Store className={cn("w-5 h-5 sm:w-6 sm:h-6 hidden absolute", marketplace.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
              </div>

              <div className="min-w-0 flex-1">
                {/* Name */}
                <p className="text-[11px] sm:text-sm font-semibold truncate leading-tight">{marketplace.name}</p>
                
                {/* Fee display */}
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full h-4">
                    {marketplace.feePercent}%
                  </Badge>
                  {marketplace.feeFlat > 0 && (
                    <span className="text-[8px] sm:text-[9px] text-muted-foreground">
                      +{formatCurrency(marketplace.feeFlat)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Switch — top right */}
            <div className="flex-shrink-0">
              <Switch
                size="sm"
                checked={marketplace.isActive}
                onCheckedChange={onToggle}
              />
            </div>
          </div>

          {/* Description */}
          {marketplace.description && (
            <p className="text-[8px] sm:text-[9px] text-muted-foreground line-clamp-2 leading-tight">
              {marketplace.description}
            </p>
          )}

          {/* Stats row - Marketplace */}
          {stats && (
            <div className="grid grid-cols-3 gap-1 mt-auto pt-2 border-t">
              <div className="text-center">
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Trx</p>
                <p className="text-[9px] sm:text-[10px] font-semibold">{formatShort(stats.transactionCount)}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Volume</p>
                <p className="text-[9px] sm:text-[10px] font-semibold">{formatShort(stats.totalVolume)}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Fee</p>
                <p className="text-[9px] sm:text-[10px] font-semibold">{formatShort(stats.totalFees)}</p>
              </div>
            </div>
          )}

          {/* Bottom row: Edit button */}
          <div className="flex items-center justify-end pt-1 mt-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setShowEdit(true)}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditMarketplaceDialog 
        marketplace={marketplace} 
        open={showEdit} 
        onOpenChange={setShowEdit} 
        onUpdated={onUpdated} 
      />
    </>
  );
}

// ============================================================
// Logo Preview Helper
// ============================================================
function LogoPreview({ url, fallbackIcon }: { url: string | null | undefined; fallbackIcon: React.ReactNode }) {
  if (!url) return null;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="w-8 h-8 rounded-xl overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
        <img 
          src={url} 
          alt="Logo preview" 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      <span className="text-[9px] text-muted-foreground truncate max-w-[160px]">{url}</span>
    </div>
  );
}

// ============================================================
// New Payment Type Dialog
// ============================================================
function NewPaymentTypeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [formData, setFormData] = useState({
    name: '',
    onlineFeePercent: 0,
    onlineFeeFlat: 0,
    codFeePercent: 0,
    codFeeFlat: 0,
    threshold: 1000000,
    discountPercent: 0,
    discountNominal: 0,
    minTransaction: 0,
    logoUrl: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      onlineFeePercent: 0,
      onlineFeeFlat: 0,
      codFeePercent: 0,
      codFeeFlat: 0,
      threshold: 1000000,
      discountPercent: 0,
      discountNominal: 0,
      minTransaction: 0,
      logoUrl: '',
    });
    setDiscountType('percent');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Clear the other discount field based on type
    const submitData = { ...formData };
    if (discountType === 'percent') {
      submitData.discountNominal = 0;
    } else {
      submitData.discountPercent = 0;
    }

    try {
      const response = await fetch('/api/payment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        resetForm();
        toast.success('Payment type berhasil dibuat');
      } else {
        toast.error(result.error || 'Gagal membuat payment type');
      }
    } catch (err) {
      console.error('Failed to create payment type:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground rounded-lg h-9 px-4 text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3 h-3 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base sm:text-lg">Tipe Pembayaran Baru</DialogTitle>
          <DialogDescription>Tambahkan tipe pembayaran dengan pengaturan fee</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 px-4 pb-4 overflow-y-auto max-h-[60vh]">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Nama</Label>
            <Input
              placeholder="contoh: BRI, Mandiri, dll"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9 rounded-lg"
            />
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Logo URL
            </Label>
            <Input
              placeholder="https://..."
              value={formData.logoUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
              className="h-9 rounded-lg"
            />
            <p className="text-[10px] text-muted-foreground">Masukkan URL gambar logo (https://...)</p>
            <LogoPreview url={formData.logoUrl} fallbackIcon={<CreditCard className="w-4 h-4 text-primary" />} />
          </div>
          
          {/* Fee Online */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Fee Online
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Persentase (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.onlineFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeePercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Flat (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.onlineFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeeFlat: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Fee COD */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> Fee COD
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Persentase (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.codFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeePercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Flat (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.codFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeeFlat: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Threshold */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Threshold (diatas nominal ini pakai %)</Label>
            <Input
              type="number"
              placeholder="1000000"
              value={formData.threshold}
              onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
              className="h-9 rounded-lg"
            />
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Diskon Default
            </p>
            {/* Discount type toggle */}
            <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all",
                  discountType === 'percent'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                Persentase (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('nominal')}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all",
                  discountType === 'nominal'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                Nominal (Rp)
              </button>
            </div>

            {discountType === 'percent' ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={formData.discountPercent || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountPercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
                <p className="text-[10px] text-muted-foreground">Diskon otomatis diterapkan saat transaksi baru</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  value={formData.discountNominal || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountNominal: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
                <p className="text-[10px] text-muted-foreground">Potongan nominal tetap dari fee</p>
              </div>
            )}

            {/* Min Transaction for Discount */}
            {(formData.discountPercent > 0 || formData.discountNominal > 0) && (
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Min. Nominal Transaksi
                </Label>
                <Input
                  type="number"
                  step="10000"
                  min="0"
                  placeholder="0 (tanpa minimum)"
                  value={formData.minTransaction || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, minTransaction: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
                <p className="text-[10px] text-muted-foreground">
                  Diskon hanya berlaku jika nominal transaksi ≥ {formData.minTransaction > 0 ? formatCurrency(formData.minTransaction) : 'Rp 0'}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 rounded-lg" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-primary text-primary-foreground rounded-xl h-10 text-xs font-semibold hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Edit Payment Type Dialog
// ============================================================
function EditPaymentTypeDialog({ 
  paymentType, 
  open, 
  onOpenChange, 
  onUpdated 
}: { 
  paymentType: PaymentType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>(
    paymentType.discountPercent > 0 ? 'percent' : 'nominal'
  );
  const [formData, setFormData] = useState({
    name: paymentType.name,
    onlineFeePercent: paymentType.onlineFeePercent,
    onlineFeeFlat: paymentType.onlineFeeFlat,
    codFeePercent: paymentType.codFeePercent,
    codFeeFlat: paymentType.codFeeFlat,
    threshold: paymentType.threshold,
    discountPercent: paymentType.discountPercent || 0,
    discountNominal: paymentType.discountNominal || 0,
    minTransaction: paymentType.minTransaction || 0,
    logoUrl: paymentType.logoUrl || '',
  });

  useEffect(() => {
    setFormData({
      name: paymentType.name,
      onlineFeePercent: paymentType.onlineFeePercent,
      onlineFeeFlat: paymentType.onlineFeeFlat,
      codFeePercent: paymentType.codFeePercent,
      codFeeFlat: paymentType.codFeeFlat,
      threshold: paymentType.threshold,
      discountPercent: paymentType.discountPercent || 0,
      discountNominal: paymentType.discountNominal || 0,
      minTransaction: paymentType.minTransaction || 0,
      logoUrl: paymentType.logoUrl || '',
    });
    setDiscountType(paymentType.discountPercent > 0 ? 'percent' : 'nominal');
  }, [paymentType, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const submitData = { ...formData };
    if (discountType === 'percent') {
      submitData.discountNominal = 0;
    } else {
      submitData.discountPercent = 0;
    }

    try {
      const response = await fetch(`/api/payment-types/${paymentType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();
      if (result.success) {
        onOpenChange(false);
        onUpdated();
        toast.success('Payment type berhasil diperbarui');
      } else {
        toast.error(result.error || 'Gagal memperbarui payment type');
      }
    } catch (err) {
      console.error('Failed to update payment type:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base sm:text-lg">Edit Payment Type</DialogTitle>
          <DialogDescription>Edit pengaturan fee untuk {paymentType.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 px-4 pb-4 overflow-y-auto max-h-[60vh]">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Nama</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9 rounded-lg"
            />
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Logo URL
            </Label>
            <Input
              placeholder="https://..."
              value={formData.logoUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
              className="h-9 rounded-lg"
            />
            <p className="text-[10px] text-muted-foreground">Masukkan URL gambar logo (https://...)</p>
            <LogoPreview url={formData.logoUrl || paymentType.logoUrl} fallbackIcon={<CreditCard className="w-4 h-4 text-primary" />} />
          </div>

          {/* Fee Online */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Fee Online
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">%</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.onlineFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeePercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Flat</Label>
                <Input
                  type="number"
                  value={formData.onlineFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeeFlat: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Fee COD */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> Fee COD
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">%</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.codFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeePercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Flat</Label>
                <Input
                  type="number"
                  value={formData.codFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeeFlat: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Threshold */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Threshold</Label>
            <Input
              type="number"
              value={formData.threshold}
              onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
              className="h-9 rounded-lg"
            />
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Diskon Default
            </p>
            <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all",
                  discountType === 'percent'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                Persentase (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('nominal')}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all",
                  discountType === 'nominal'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                Nominal (Rp)
              </button>
            </div>

            {discountType === 'percent' ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={formData.discountPercent || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountPercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
                <p className="text-[10px] text-muted-foreground">Diskon otomatis diterapkan saat transaksi baru</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  value={formData.discountNominal || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountNominal: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
                <p className="text-[10px] text-muted-foreground">Potongan nominal tetap dari fee</p>
              </div>
            )}

            {/* Min Transaction for Discount */}
            {(formData.discountPercent > 0 || formData.discountNominal > 0) && (
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Min. Nominal Transaksi
                </Label>
                <Input
                  type="number"
                  step="10000"
                  min="0"
                  placeholder="0 (tanpa minimum)"
                  value={formData.minTransaction || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, minTransaction: parseFloat(e.target.value) || 0 }))}
                  className="h-9 rounded-lg"
                />
                <p className="text-[10px] text-muted-foreground">
                  Diskon hanya berlaku jika nominal transaksi ≥ {formData.minTransaction > 0 ? formatCurrency(formData.minTransaction) : 'Rp 0'}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 rounded-lg" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-primary text-primary-foreground rounded-xl h-10 text-xs font-semibold hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// New Marketplace Dialog
// ============================================================
function NewMarketplaceDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    feePercent: 0,
    feeFlat: 0,
    description: '',
    logoUrl: '',
  });

  const resetForm = () => {
    setFormData({ name: '', feePercent: 0, feeFlat: 0, description: '', logoUrl: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/marketplaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        resetForm();
        toast.success('Marketplace berhasil dibuat');
      } else {
        toast.error(result.error || 'Gagal membuat marketplace');
      }
    } catch (err) {
      console.error('Failed to create marketplace:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground rounded-lg h-9 px-4 text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3 h-3 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base sm:text-lg">Marketplace Baru</DialogTitle>
          <DialogDescription>Tambahkan marketplace dengan pengaturan fee</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 px-4 pb-4 overflow-y-auto max-h-[60vh]">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Nama</Label>
            <Input
              placeholder="contoh: Shopee, Tokopedia"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9 rounded-lg"
            />
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Logo URL
            </Label>
            <Input
              placeholder="https://..."
              value={formData.logoUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
              className="h-9 rounded-lg"
            />
            <p className="text-[10px] text-muted-foreground">Masukkan URL gambar logo (https://...)</p>
            <LogoPreview url={formData.logoUrl} fallbackIcon={<Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} />
          </div>

          {/* Fee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fee Persentase (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={formData.feePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, feePercent: parseFloat(e.target.value) || 0 }))}
                className="h-9 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fee Flat (Rp)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.feeFlat}
                onChange={(e) => setFormData(prev => ({ ...prev, feeFlat: parseFloat(e.target.value) || 0 }))}
                className="h-9 rounded-lg"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Deskripsi (opsional)</Label>
            <Textarea
              placeholder="Deskripsi singkat..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="text-sm rounded-lg"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 rounded-lg" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-primary text-primary-foreground rounded-xl h-10 text-xs font-semibold hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Edit Marketplace Dialog
// ============================================================
function EditMarketplaceDialog({ 
  marketplace, 
  open, 
  onOpenChange, 
  onUpdated 
}: { 
  marketplace: Marketplace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: marketplace.name,
    feePercent: marketplace.feePercent,
    feeFlat: marketplace.feeFlat,
    description: marketplace.description || '',
    logoUrl: marketplace.logoUrl || '',
  });

  useEffect(() => {
    setFormData({
      name: marketplace.name,
      feePercent: marketplace.feePercent,
      feeFlat: marketplace.feeFlat,
      description: marketplace.description || '',
      logoUrl: marketplace.logoUrl || '',
    });
  }, [marketplace, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/marketplaces/${marketplace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        onOpenChange(false);
        onUpdated();
        toast.success('Marketplace berhasil diperbarui');
      } else {
        toast.error(result.error || 'Gagal memperbarui marketplace');
      }
    } catch (err) {
      console.error('Failed to update marketplace:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base sm:text-lg">Edit Marketplace</DialogTitle>
          <DialogDescription>Edit pengaturan untuk {marketplace.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 px-4 pb-4 overflow-y-auto max-h-[60vh]">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Nama</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9 rounded-lg"
            />
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Logo URL
            </Label>
            <Input
              placeholder="https://..."
              value={formData.logoUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
              className="h-9 rounded-lg"
            />
            <p className="text-[10px] text-muted-foreground">Masukkan URL gambar logo (https://...)</p>
            <LogoPreview url={formData.logoUrl || marketplace.logoUrl} fallbackIcon={<Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} />
          </div>

          {/* Fee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fee %</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.feePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, feePercent: parseFloat(e.target.value) || 0 }))}
                className="h-9 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fee Flat</Label>
              <Input
                type="number"
                value={formData.feeFlat}
                onChange={(e) => setFormData(prev => ({ ...prev, feeFlat: parseFloat(e.target.value) || 0 }))}
                className="h-9 rounded-lg"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Deskripsi</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="text-sm rounded-lg"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 rounded-lg" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-primary text-primary-foreground rounded-xl h-10 text-xs font-semibold hover:bg-primary/90" disabled={loading}>
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
