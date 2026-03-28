'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CreditCard,
  Plus,
  Percent,
  DollarSign,
  Loader2,
  TrendingUp,
  Globe,
  Truck,
  Calculator,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings2,
  Wallet,
  Target,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
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
  isActive: boolean;
}

interface MarketplaceStats {
  id: string;
  name: string;
  feePercent: number;
  feeFlat: number;
  description: string | null;
  isActive: boolean;
  transactionCount: number;
  totalVolume: number;
  totalFees: number;
}

const COLORS = {
  primary: 'from-primary to-primary/70',
  green: 'from-green-500 to-emerald-600',
  violet: 'from-violet-500 to-purple-600',
  amber: 'from-amber-500 to-orange-600',
};

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

  const activePaymentTypes = paymentTypes.filter(pt => pt.isActive).length;
  const activeMarketplaces = marketplaces.filter(mp => mp.isActive).length;
  const totalPlatformFees = marketplaceStats.reduce((sum, mp) => sum + mp.totalFees, 0);
  const totalPaymentFees = paymentTypeStats.reduce((sum, pt) => sum + pt.totalFees, 0);

  return (
    <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span className="truncate">Pengaturan Fee</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Kelola biaya & marketplace</p>
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
        <Button
          onClick={() => fetchData()}
          size="sm"
          variant="outline"
          className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg"
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        <FeeKPICard
          title="Payment Aktif"
          value={activePaymentTypes}
          icon={<CreditCard className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="primary"
          isCount
        />
        <FeeKPICard
          title="Marketplace"
          value={activeMarketplaces}
          icon={<Globe className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="green"
          isCount
        />
        <FeeKPICard
          title="Fee Payment"
          value={totalPaymentFees}
          icon={<TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="violet"
        />
        <FeeKPICard
          title="Fee Platform"
          value={totalPlatformFees}
          icon={<DollarSign className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="amber"
        />
      </div>

      {/* Fee Calculator */}
      <FeeCalculatorCard paymentTypes={paymentTypes} marketplaces={marketplaces} />

      {/* Main Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setMainTab('payment')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium transition-all",
            mainTab === 'payment' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CreditCard className="w-4 h-4" />
          Payment
        </button>
        <button
          onClick={() => setMainTab('marketplace')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium transition-all",
            mainTab === 'marketplace' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe className="w-4 h-4" />
          Marketplace
        </button>
      </div>

      {/* Tab Content */}
      {mainTab === 'payment' ? (
        <div className="space-y-2 sm:space-y-3">
          {/* Stats Summary */}
          {paymentTypeStats.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] sm:text-xs font-medium">Top Payment by Volume</span>
                </div>
                <div className="space-y-1">
                  {[...paymentTypeStats].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 3).map((pt, idx) => (
                    <div key={pt.id} className="flex items-center justify-between text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="w-4 h-4 p-0 text-[8px] justify-center">
                          {idx + 1}
                        </Badge>
                        <span className="truncate">{pt.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(pt.totalVolume)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Type List */}
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium">Tipe Pembayaran</p>
            <NewPaymentTypeDialog onCreated={() => fetchData()} />
          </div>

          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 sm:h-32 rounded-lg sm:rounded-xl" />)
          ) : paymentTypes.length > 0 ? (
            <div className="space-y-2">
              {paymentTypes.map((pt) => {
                const stats = paymentTypeStats.find(s => s.id === pt.id);
                return (
                  <PaymentTypeCard
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
              <p className="text-xs sm:text-sm text-muted-foreground">Belum ada tipe pembayaran</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {/* Stats Summary */}
          {marketplaceStats.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-[10px] sm:text-xs font-medium">Top Marketplace by Fee</span>
                </div>
                <div className="space-y-1">
                  {[...marketplaceStats].sort((a, b) => b.totalFees - a.totalFees).slice(0, 3).map((mp, idx) => (
                    <div key={mp.id} className="flex items-center justify-between text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="w-4 h-4 p-0 text-[8px] justify-center">
                          {idx + 1}
                        </Badge>
                        <span className="truncate">{mp.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(mp.totalFees)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Marketplace List */}
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-medium">Marketplace</p>
            <NewMarketplaceDialog onCreated={() => fetchData()} />
          </div>

          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 sm:h-28 rounded-lg sm:rounded-xl" />)
          ) : marketplaces.length > 0 ? (
            <div className="space-y-2">
              {marketplaces.map((mp) => {
                const stats = marketplaceStats.find(s => s.id === mp.id);
                return (
                  <MarketplaceCard
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
              <p className="text-xs sm:text-sm text-muted-foreground">Belum ada marketplace</p>
            </div>
          )}
        </div>
      )}
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
  const colorClasses = {
    primary: 'from-primary to-primary/70',
    green: 'from-green-500 to-emerald-600',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
  };

  const bgColorClasses = {
    primary: 'bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20',
    green: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
    violet: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
    amber: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
  };

  return (
    <Card className={cn("glass-card overflow-hidden", bgColorClasses[color])}>
      <div className={cn("h-0.5 sm:h-1 bg-gradient-to-r", colorClasses[color])} />
      <CardContent className="p-2 sm:p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{title}</p>
            <p className="text-sm sm:text-lg font-bold truncate">
              {isCount ? value : formatCurrency(value)}
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

// Fee Calculator Card
function FeeCalculatorCard({ 
  paymentTypes, 
  marketplaces 
}: { 
  paymentTypes: PaymentType[];
  marketplaces: Marketplace[];
}) {
  const [nominal, setNominal] = useState<string>('1000000');
  const [paymentTypeId, setPaymentTypeId] = useState<string>('');
  const [marketplaceId, setMarketplaceId] = useState<string>('');
  const [method, setMethod] = useState<'Online' | 'COD'>('Online');

  const selectedPaymentType = paymentTypes.find(pt => pt.id === paymentTypeId);
  const selectedMarketplace = marketplaces.find(mp => mp.id === marketplaceId);

  const nominalNum = parseFloat(nominal) || 0;

  // Calculate payment fee
  let paymentFee = 0;
  let isAboveThreshold = false;
  if (selectedPaymentType && nominalNum > 0) {
    const feePercent = method === 'Online' 
      ? selectedPaymentType.onlineFeePercent 
      : selectedPaymentType.codFeePercent;
    const feeFlat = method === 'Online' 
      ? selectedPaymentType.onlineFeeFlat 
      : selectedPaymentType.codFeeFlat;
    
    isAboveThreshold = nominalNum >= selectedPaymentType.threshold;
    paymentFee = isAboveThreshold 
      ? nominalNum * (feePercent / 100) 
      : feeFlat;
  }

  // Calculate platform fee
  let platformFee = 0;
  if (selectedMarketplace && nominalNum > 0) {
    // Safety: ensure numeric values and normalize fee percent if > 100
    let mpFeePercent = Number(selectedMarketplace.feePercent) || 0;
    const mpFeeFlat = Number(selectedMarketplace.feeFlat) || 0;
    if (mpFeePercent > 100) {
      mpFeePercent = mpFeePercent / 1000;
    }
    platformFee = nominalNum * (mpFeePercent / 100) + mpFeeFlat;
  }

  const netMargin = paymentFee - platformFee;
  const totalDeduction = paymentFee + platformFee;
  const customerReceives = nominalNum - paymentFee;

  return (
    <Card className="glass-card border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
          <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-500" />
          Kalkulator Fee
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-2.5 sm:pb-3 space-y-2 sm:space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Nominal</Label>
            <Input
              type="number"
              placeholder="Nominal"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              className="h-8 sm:h-9 text-xs sm:text-sm rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Metode</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as 'Online' | 'COD')}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="COD">COD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Payment Type</Label>
            <Select value={paymentTypeId} onValueChange={setPaymentTypeId}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm rounded-lg">
                <SelectValue placeholder="Pilih..." />
              </SelectTrigger>
              <SelectContent>
                {paymentTypes.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Marketplace</Label>
            <Select value={marketplaceId} onValueChange={setMarketplaceId}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm rounded-lg">
                <SelectValue placeholder="Opsional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Tanpa</SelectItem>
                {marketplaces.map((mp) => (
                  <SelectItem key={mp.id} value={mp.id}>{mp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="bg-muted/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">Nominal</span>
            <span className="font-medium">{formatCurrency(nominalNum)}</span>
          </div>

          {selectedPaymentType && (
            <>
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Payment Fee</span>
                  <Badge variant={isAboveThreshold ? "default" : "secondary"} className="text-[8px] h-3.5 px-1">
                    {isAboveThreshold ? '%' : 'Flat'}
                  </Badge>
                </div>
                <span className="font-medium text-violet-600">-{formatCurrency(paymentFee)}</span>
              </div>
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted-foreground">
                <span>Customer receives</span>
                <span>{formatCurrency(customerReceives)}</span>
              </div>
            </>
          )}

          {selectedMarketplace && (
            <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1 border-t">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="font-medium text-amber-600">-{formatCurrency(platformFee)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1 border-t">
            <span className="font-medium">Net Margin</span>
            <span className={cn("font-bold", netMargin > 0 ? "text-green-600" : "text-muted-foreground")}>
              {formatCurrency(netMargin)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <span className="font-medium">Total Potongan</span>
            <span className="font-bold text-red-500">-{formatCurrency(totalDeduction)}</span>
          </div>
        </div>

        {/* Threshold Info */}
        {selectedPaymentType && (
          <div className={cn(
            "flex items-center gap-1.5 text-[9px] sm:text-[10px] p-1.5 sm:p-2 rounded-lg",
            isAboveThreshold 
              ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
              : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
          )}>
            {isAboveThreshold ? (
              <>
                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Above threshold - Fee % applied</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Below threshold - Flat fee applied</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Payment Type Card
function PaymentTypeCard({ 
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

  return (
    <>
      <Card className={cn("glass-card tap-highlight", !paymentType.isActive && "opacity-60")}>
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0",
                paymentType.isActive ? "bg-primary/10" : "bg-muted"
              )}>
                <CreditCard className={cn("w-4 h-4 sm:w-5 sm:h-5", paymentType.isActive ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-sm font-medium truncate">{paymentType.name}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">
                  Threshold: {formatCurrency(paymentType.threshold)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                onClick={() => setShowEdit(true)}
              >
                <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Switch
                checked={paymentType.isActive}
                onCheckedChange={onToggle}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
              <div className="text-[9px] sm:text-xs">
                <p className="text-muted-foreground">Online</p>
                <p className="font-medium">{paymentType.onlineFeePercent}% + {formatCurrency(paymentType.onlineFeeFlat)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
              <div className="text-[9px] sm:text-xs">
                <p className="text-muted-foreground">COD</p>
                <p className="font-medium">{paymentType.codFeePercent}% + {formatCurrency(paymentType.codFeeFlat)}</p>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Trx</p>
                <p className="text-[10px] sm:text-xs font-medium">{stats.transactionCount}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Volume</p>
                <p className="text-[10px] sm:text-xs font-medium">{formatCurrency(stats.totalVolume)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Fee</p>
                <p className="text-[10px] sm:text-xs font-medium">{formatCurrency(stats.totalFees)}</p>
              </div>
            </div>
          )}
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

// Marketplace Card
function MarketplaceCard({ 
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
      <Card className={cn("glass-card tap-highlight", !marketplace.isActive && "opacity-60")}>
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0",
                marketplace.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
              )}>
                <Globe className={cn("w-4 h-4 sm:w-5 sm:h-5", marketplace.isActive ? "text-green-600" : "text-muted-foreground")} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-sm font-medium truncate">{marketplace.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {marketplace.feePercent}%
                  </Badge>
                  {marketplace.feeFlat > 0 && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      +{formatCurrency(marketplace.feeFlat)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                onClick={() => setShowEdit(true)}
              >
                <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Switch
                checked={marketplace.isActive}
                onCheckedChange={onToggle}
              />
            </div>
          </div>

          {marketplace.description && (
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-2 pt-2 border-t">
              {marketplace.description}
            </p>
          )}

          {stats && (
            <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Trx</p>
                <p className="text-[10px] sm:text-xs font-medium">{stats.transactionCount}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Volume</p>
                <p className="text-[10px] sm:text-xs font-medium">{formatCurrency(stats.totalVolume)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Fee</p>
                <p className="text-[10px] sm:text-xs font-medium">{formatCurrency(stats.totalFees)}</p>
              </div>
            </div>
          )}
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

// New Payment Type Dialog
function NewPaymentTypeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    onlineFeePercent: 0,
    onlineFeeFlat: 0,
    codFeePercent: 0,
    codFeeFlat: 0,
    threshold: 1000000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/payment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        setFormData({
          name: '',
          onlineFeePercent: 0,
          onlineFeeFlat: 0,
          codFeePercent: 0,
          codFeeFlat: 0,
          threshold: 1000000,
        });
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
        <Button size="sm" className="gradient-primary text-white rounded-lg h-8 px-3 text-[10px] sm:text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Tipe Pembayaran Baru</DialogTitle>
          <DialogDescription>Tambahkan tipe pembayaran dengan pengaturan fee</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Nama</Label>
            <Input
              placeholder="contoh: BRI, Mandiri, dll"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9 sm:h-10"
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Fee Online
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] sm:text-xs">Persentase (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.onlineFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeePercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] sm:text-xs">Flat (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.onlineFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeeFlat: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> Fee COD
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] sm:text-xs">Persentase (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.codFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeePercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] sm:text-xs">Flat (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.codFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeeFlat: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Threshold (diatas nominal ini pakai %)</Label>
            <Input
              type="number"
              placeholder="1000000"
              value={formData.threshold}
              onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
              className="h-9"
            />
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

// Edit Payment Type Dialog
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
  const [formData, setFormData] = useState({
    name: paymentType.name,
    onlineFeePercent: paymentType.onlineFeePercent,
    onlineFeeFlat: paymentType.onlineFeeFlat,
    codFeePercent: paymentType.codFeePercent,
    codFeeFlat: paymentType.codFeeFlat,
    threshold: paymentType.threshold,
  });

  useEffect(() => {
    setFormData({
      name: paymentType.name,
      onlineFeePercent: paymentType.onlineFeePercent,
      onlineFeeFlat: paymentType.onlineFeeFlat,
      codFeePercent: paymentType.codFeePercent,
      codFeeFlat: paymentType.codFeeFlat,
      threshold: paymentType.threshold,
    });
  }, [paymentType, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/payment-types/${paymentType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Edit Payment Type</DialogTitle>
          <DialogDescription>Edit pengaturan fee untuk {paymentType.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Nama</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9"
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Fee Online
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">%</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.onlineFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeePercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Flat</Label>
                <Input
                  type="number"
                  value={formData.onlineFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeeFlat: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> Fee COD
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">%</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.codFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeePercent: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Flat</Label>
                <Input
                  type="number"
                  value={formData.codFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeeFlat: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Threshold</Label>
            <Input
              type="number"
              value={formData.threshold}
              onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
              className="h-9"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => onOpenChange(false)}>
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

// New Marketplace Dialog
function NewMarketplaceDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    feePercent: 0,
    feeFlat: 0,
    description: '',
  });

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
        setFormData({ name: '', feePercent: 0, feeFlat: 0, description: '' });
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
        <Button size="sm" className="gradient-primary text-white rounded-lg h-8 px-3 text-[10px] sm:text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Marketplace Baru</DialogTitle>
          <DialogDescription>Tambahkan marketplace dengan pengaturan fee</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Nama</Label>
            <Input
              placeholder="contoh: Shopee, Tokopedia"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Fee Persentase (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={formData.feePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, feePercent: parseFloat(e.target.value) || 0 }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Fee Flat (Rp)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.feeFlat}
                onChange={(e) => setFormData(prev => ({ ...prev, feeFlat: parseFloat(e.target.value) || 0 }))}
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Deskripsi (opsional)</Label>
            <Textarea
              placeholder="Deskripsi singkat..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="text-sm"
            />
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

// Edit Marketplace Dialog
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
  });

  useEffect(() => {
    setFormData({
      name: marketplace.name,
      feePercent: marketplace.feePercent,
      feeFlat: marketplace.feeFlat,
      description: marketplace.description || '',
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Edit Marketplace</DialogTitle>
          <DialogDescription>Edit pengaturan untuk {marketplace.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Nama</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Fee %</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.feePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, feePercent: parseFloat(e.target.value) || 0 }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Fee Flat</Label>
              <Input
                type="number"
                value={formData.feeFlat}
                onChange={(e) => setFormData(prev => ({ ...prev, feeFlat: parseFloat(e.target.value) || 0 }))}
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Deskripsi</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => onOpenChange(false)}>
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
