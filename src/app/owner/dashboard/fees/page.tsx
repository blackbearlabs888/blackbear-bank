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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CreditCard,
  Plus,
  Edit,
  Percent,
  DollarSign,
  Loader2,
  Settings2,
  TrendingUp,
  Globe,
  Truck,
  Calculator,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

export default function OwnerFeesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [paymentTypeStats, setPaymentTypeStats] = useState<PaymentTypeStats[]>([]);
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const redirectAttempted = useRef(false);

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

  const fetchData = async () => {
    setLoading(true);
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
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
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
      }
    } catch (err) {
      console.error('Failed to toggle marketplace:', err);
    }
  };

  if (isLoading || !hasHydrated) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
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
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Pengaturan Fee</h1>
        <p className="text-sm text-muted-foreground">Kelola biaya, marketplace & kalkulator fee</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Aktif</p>
                <p className="text-lg font-bold text-primary">{activePaymentTypes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Marketplace</p>
                <p className="text-lg font-bold">{activeMarketplaces}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Fee Payment</p>
                <p className="text-sm font-bold">{formatCurrency(totalPaymentFees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Fee Platform</p>
                <p className="text-sm font-bold">{formatCurrency(totalPlatformFees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Calculator Card */}
      <FeeCalculatorCard paymentTypes={paymentTypes} marketplaces={marketplaces} />

      {/* Tabs */}
      <Tabs defaultValue="payment" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-12">
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2">
            <Globe className="w-4 h-4" />
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-4 mt-4">
          {/* Payment Type Usage Stats */}
          <PaymentTypeUsageStats stats={paymentTypeStats} loading={loading} />

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Tipe Pembayaran</p>
            <NewPaymentTypeDialog onCreated={fetchData} />
          </div>

          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
          ) : paymentTypes.length > 0 ? (
            <div className="space-y-3">
              {paymentTypes.map((pt) => {
                const stats = paymentTypeStats.find(s => s.id === pt.id);
                return (
                  <Card key={pt.id} className={cn(
                    "glass-card tap-highlight",
                    !pt.isActive && "opacity-60"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            pt.isActive ? "bg-primary/10" : "bg-muted"
                          )}>
                            <CreditCard className={cn(
                              "w-5 h-5",
                              pt.isActive ? "text-primary" : "text-muted-foreground"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium">{pt.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Threshold: {formatCurrency(pt.threshold)}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={pt.isActive}
                          onCheckedChange={() => togglePaymentType(pt.id, pt.isActive)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <div className="text-xs">
                            <p className="text-muted-foreground">Online</p>
                            <p className="font-medium">
                              {pt.onlineFeePercent}% + {formatCurrency(pt.onlineFeeFlat)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <div className="text-xs">
                            <p className="text-muted-foreground">COD</p>
                            <p className="font-medium">
                              {pt.codFeePercent}% + {formatCurrency(pt.codFeeFlat)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      {stats && (
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Transaksi</p>
                            <p className="text-sm font-medium">{stats.transactionCount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Volume</p>
                            <p className="text-sm font-medium">{formatCurrency(stats.totalVolume)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Total Fee</p>
                            <p className="text-sm font-medium">{formatCurrency(stats.totalFees)}</p>
                          </div>
                        </div>
                      )}

                      <PaymentTypeFeePreview paymentType={pt} />
                      <EditPaymentTypeDialog paymentType={pt} onUpdated={fetchData} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada tipe pembayaran</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4 mt-4">
          {/* Marketplace Usage Stats */}
          <MarketplaceUsageStats stats={marketplaceStats} loading={loading} />

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Marketplace</p>
            <NewMarketplaceDialog onCreated={fetchData} />
          </div>

          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
          ) : marketplaces.length > 0 ? (
            <div className="space-y-3">
              {marketplaces.map((mp) => {
                const stats = marketplaceStats.find(s => s.id === mp.id);
                return (
                  <Card key={mp.id} className={cn(
                    "glass-card tap-highlight",
                    !mp.isActive && "opacity-60"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            mp.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                          )}>
                            <Globe className={cn(
                              "w-5 h-5",
                              mp.isActive ? "text-green-600" : "text-muted-foreground"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium">{mp.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs h-5">
                                {mp.feePercent}% 
                              </Badge>
                              {mp.feeFlat > 0 && (
                                <Badge variant="outline" className="text-xs h-5">
                                  + {formatCurrency(mp.feeFlat)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={mp.isActive}
                          onCheckedChange={() => toggleMarketplace(mp.id, mp.isActive)}
                        />
                      </div>

                      {mp.description && (
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                          {mp.description}
                        </p>
                      )}

                      {/* Stats */}
                      {stats && (
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Transaksi</p>
                            <p className="text-sm font-medium">{stats.transactionCount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Volume</p>
                            <p className="text-sm font-medium">{formatCurrency(stats.totalVolume)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Total Fee</p>
                            <p className="text-sm font-medium">{formatCurrency(stats.totalFees)}</p>
                          </div>
                        </div>
                      )}

                      <MarketplaceFeePreview marketplace={mp} />
                      <EditMarketplaceDialog marketplace={mp} onUpdated={fetchData} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada marketplace</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Fee Calculator Card Component
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
    platformFee = nominalNum * (selectedMarketplace.feePercent / 100) + selectedMarketplace.feeFlat;
  }

  const netMargin = paymentFee - platformFee;
  const totalDeduction = paymentFee + platformFee;
  const customerReceives = nominalNum - paymentFee;

  return (
    <Card className="glass-card border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-5 h-5 text-violet-500" />
          Kalkulator Fee
        </CardTitle>
        <CardDescription>
          Hitung estimasi fee berdasarkan nominal dan pengaturan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Nominal Transaksi</Label>
            <Input
              type="number"
              placeholder="Masukkan nominal"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Metode</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as 'Online' | 'COD')}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="COD">COD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Tipe Pembayaran</Label>
            <Select value={paymentTypeId} onValueChange={setPaymentTypeId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Pilih tipe pembayaran" />
              </SelectTrigger>
              <SelectContent>
                {paymentTypes.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Marketplace (Opsional)</Label>
            <Select value={marketplaceId} onValueChange={setMarketplaceId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Pilih marketplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Tanpa Marketplace</SelectItem>
                {marketplaces.map((mp) => (
                  <SelectItem key={mp.id} value={mp.id}>
                    {mp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Nominal</span>
            <span className="font-medium">{formatCurrency(nominalNum)}</span>
          </div>

          {selectedPaymentType && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Payment Fee</span>
                  {isAboveThreshold ? (
                    <Badge variant="default" className="text-[10px] h-4 bg-violet-500">
                      Persentase
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      Flat
                    </Badge>
                  )}
                </div>
                <span className="font-medium text-violet-600">-{formatCurrency(paymentFee)}</span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Customer menerima</span>
                <span>{formatCurrency(customerReceives)}</span>
              </div>
            </>
          )}

          {selectedMarketplace && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Platform Fee</span>
                <Badge variant="outline" className="text-[10px] h-4">
                  {selectedMarketplace.feePercent}% + {formatCurrency(selectedMarketplace.feeFlat)}
                </Badge>
              </div>
              <span className="font-medium text-amber-600">-{formatCurrency(platformFee)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Net Margin</span>
            <span className={cn(
              "font-bold",
              netMargin > 0 ? "text-green-600" : "text-muted-foreground"
            )}>
              {formatCurrency(netMargin)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Potongan</span>
            <span className="font-bold text-red-500">-{formatCurrency(totalDeduction)}</span>
          </div>
        </div>

        {/* Threshold Info */}
        {selectedPaymentType && (
          <div className={cn(
            "flex items-center gap-2 text-xs p-2 rounded-lg",
            isAboveThreshold 
              ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
              : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
          )}>
            {isAboveThreshold ? (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>Diatas threshold ({formatCurrency(selectedPaymentType.threshold)}) - Fee persentase diterapkan</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-4 h-4" />
                <span>Dibawah threshold ({formatCurrency(selectedPaymentType.threshold)}) - Fee flat diterapkan</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Payment Type Fee Preview Component
function PaymentTypeFeePreview({ paymentType }: { paymentType: PaymentType }) {
  const [nominal, setNominal] = useState<string>('1000000');
  const [method, setMethod] = useState<'Online' | 'COD'>('Online');
  const [showPreview, setShowPreview] = useState(false);

  const nominalNum = parseFloat(nominal) || 0;
  const isAboveThreshold = nominalNum >= paymentType.threshold;
  
  const feePercent = method === 'Online' 
    ? paymentType.onlineFeePercent 
    : paymentType.codFeePercent;
  const feeFlat = method === 'Online' 
    ? paymentType.onlineFeeFlat 
    : paymentType.codFeeFlat;
  
  const fee = isAboveThreshold ? nominalNum * (feePercent / 100) : feeFlat;

  if (!showPreview) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        className="mt-3 h-8 text-xs w-full"
        onClick={() => setShowPreview(true)}
      >
        <Calculator className="w-3 h-3 mr-1" />
        Preview Fee
      </Button>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Preview Fee</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0" 
          onClick={() => setShowPreview(false)}
        >
          ×
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder="Nominal"
          value={nominal}
          onChange={(e) => setNominal(e.target.value)}
          className="h-8 text-xs"
        />
        <Select value={method} onValueChange={(v) => setMethod(v as 'Online' | 'COD')}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Online">Online</SelectItem>
            <SelectItem value="COD">COD</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
        <div className="flex items-center gap-2">
          {isAboveThreshold ? (
            <Badge variant="default" className="text-[10px] h-4 bg-violet-500">
              {feePercent}%
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] h-4">
              Flat
            </Badge>
          )}
        </div>
        <span className="font-medium text-violet-600">{formatCurrency(fee)}</span>
      </div>
    </div>
  );
}

// Marketplace Fee Preview Component
function MarketplaceFeePreview({ marketplace }: { marketplace: Marketplace }) {
  const [nominal, setNominal] = useState<string>('1000000');
  const [showPreview, setShowPreview] = useState(false);

  const nominalNum = parseFloat(nominal) || 0;
  const percentFee = nominalNum * (marketplace.feePercent / 100);
  const totalFee = percentFee + marketplace.feeFlat;

  if (!showPreview) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        className="mt-3 h-8 text-xs w-full"
        onClick={() => setShowPreview(true)}
      >
        <Calculator className="w-3 h-3 mr-1" />
        Preview Fee
      </Button>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Preview Fee Platform</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0" 
          onClick={() => setShowPreview(false)}
        >
          ×
        </Button>
      </div>
      <Input
        type="number"
        placeholder="Nominal"
        value={nominal}
        onChange={(e) => setNominal(e.target.value)}
        className="h-8 text-xs"
      />
      <div className="bg-muted/50 rounded-lg p-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Fee {marketplace.feePercent}%</span>
          <span>{formatCurrency(percentFee)}</span>
        </div>
        {marketplace.feeFlat > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Flat Fee</span>
            <span>{formatCurrency(marketplace.feeFlat)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-xs font-medium">Total</span>
          <span className="font-medium text-amber-600">{formatCurrency(totalFee)}</span>
        </div>
      </div>
    </div>
  );
}

// Payment Type Usage Stats Component
function PaymentTypeUsageStats({ stats, loading }: { stats: PaymentTypeStats[]; loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  if (stats.length === 0) return null;

  const topByVolume = [...stats].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 3);
  const topByTransactions = [...stats].sort((a, b) => b.transactionCount - a.transactionCount).slice(0, 3);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Statistik Payment Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Top Volume</p>
            <div className="space-y-2">
              {topByVolume.map((pt, idx) => (
                <div key={pt.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-5 h-5 p-0 text-[10px] justify-center">
                      {idx + 1}
                    </Badge>
                    <span className="text-xs">{pt.name}</span>
                  </div>
                  <span className="text-xs font-medium">{formatCurrency(pt.totalVolume)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Top Transaksi</p>
            <div className="space-y-2">
              {topByTransactions.map((pt, idx) => (
                <div key={pt.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-5 h-5 p-0 text-[10px] justify-center">
                      {idx + 1}
                    </Badge>
                    <span className="text-xs">{pt.name}</span>
                  </div>
                  <span className="text-xs font-medium">{pt.transactionCount} trx</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Marketplace Usage Stats Component
function MarketplaceUsageStats({ stats, loading }: { stats: MarketplaceStats[]; loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  if (stats.length === 0) return null;

  const topByVolume = [...stats].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 3);
  const topByFees = [...stats].sort((a, b) => b.totalFees - a.totalFees).slice(0, 3);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-green-600" />
          Statistik Marketplace
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Top Volume</p>
            <div className="space-y-2">
              {topByVolume.map((mp, idx) => (
                <div key={mp.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-5 h-5 p-0 text-[10px] justify-center">
                      {idx + 1}
                    </Badge>
                    <span className="text-xs">{mp.name}</span>
                  </div>
                  <span className="text-xs font-medium">{formatCurrency(mp.totalVolume)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Top Fee Platform</p>
            <div className="space-y-2">
              {topByFees.map((mp, idx) => (
                <div key={mp.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-5 h-5 p-0 text-[10px] justify-center">
                      {idx + 1}
                    </Badge>
                    <span className="text-xs">{mp.name}</span>
                  </div>
                  <span className="text-xs font-medium">{formatCurrency(mp.totalFees)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
      }
    } catch (err) {
      console.error('Failed to create payment type:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-white rounded-xl h-9 px-3 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tipe Pembayaran Baru</DialogTitle>
          <DialogDescription>
            Tambahkan tipe pembayaran baru dengan pengaturan fee
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input
              placeholder="contoh: BRI, Mandiri, dll"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" /> Fee Online
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Persentase (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.onlineFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeePercent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Flat (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.onlineFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, onlineFeeFlat: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Truck className="w-4 h-4" /> Fee COD
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Persentase (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.codFeePercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeePercent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Flat (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.codFeeFlat}
                  onChange={(e) => setFormData(prev => ({ ...prev, codFeeFlat: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Threshold Minimum
              <Info className="w-3 h-3 text-muted-foreground" />
            </Label>
            <Input
              type="number"
              placeholder="Minimal transaksi"
              value={formData.threshold}
              onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground">
              Di atas threshold: fee persentase, di bawah: fee flat
            </p>
          </div>

          <Button type="submit" className="w-full gradient-primary text-white h-11 rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Simpan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPaymentTypeDialog({ paymentType, onUpdated }: { paymentType: PaymentType; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
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
  }, [paymentType]);

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
        setOpen(false);
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to update payment type:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="mt-3 h-8 text-xs">
          <Edit className="w-3 h-3 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tipe Pembayaran</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Online %</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.onlineFeePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, onlineFeePercent: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Online Flat</Label>
              <Input
                type="number"
                value={formData.onlineFeeFlat}
                onChange={(e) => setFormData(prev => ({ ...prev, onlineFeeFlat: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">COD %</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.codFeePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, codFeePercent: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">COD Flat</Label>
              <Input
                type="number"
                value={formData.codFeeFlat}
                onChange={(e) => setFormData(prev => ({ ...prev, codFeeFlat: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Threshold</Label>
            <Input
              type="number"
              value={formData.threshold}
              onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <Button type="submit" className="w-full gradient-primary text-white h-11 rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Update
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
      }
    } catch (err) {
      console.error('Failed to create marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-white rounded-xl h-9 px-3 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marketplace Baru</DialogTitle>
          <DialogDescription>
            Tambahkan marketplace dengan pengaturan fee platform
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input
              placeholder="contoh: Shopee, Tokopedia, dll"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Fee Persentase (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="contoh: 4.25"
                value={formData.feePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, feePercent: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fee Flat (Rp)</Label>
              <Input
                type="number"
                placeholder="contoh: 60000"
                value={formData.feeFlat}
                onChange={(e) => setFormData(prev => ({ ...prev, feeFlat: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Deskripsi / Catatan</Label>
            <Textarea
              placeholder="Catatan tentang marketplace ini..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="h-20"
            />
          </div>
          <Button type="submit" className="w-full gradient-primary text-white h-11 rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Simpan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditMarketplaceDialog({ marketplace, onUpdated }: { marketplace: Marketplace; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
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
  }, [marketplace]);

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
        setOpen(false);
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to update marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus marketplace "${marketplace.name}"?`)) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/marketplaces/${marketplace.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onUpdated();
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('Failed to delete marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="mt-3 h-8 text-xs">
          <Edit className="w-3 h-3 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Marketplace</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Fee Persentase (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.feePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, feePercent: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fee Flat (Rp)</Label>
              <Input
                type="number"
                value={formData.feeFlat}
                onChange={(e) => setFormData(prev => ({ ...prev, feeFlat: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Deskripsi / Catatan</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="h-20"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="destructive" 
              className="flex-1 h-11 rounded-xl"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus
            </Button>
            <Button type="submit" className="flex-1 gradient-primary text-white h-11 rounded-xl" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
