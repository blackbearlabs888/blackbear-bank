'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Truck,
  CreditCard,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface OrderData {
  orderId: string;
  nominal: number;
  paymentFee: number;
  totalReceived: number;
  status: string;
  customer: {
    name: string;
    bankName: string | null;
    bankAccount: string | null;
  };
  paymentType: string;
  methodTransaction: string;
  partner: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  pending: {
    label: 'Menunggu',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
    description: 'Order menunggu verifikasi',
    progress: 25,
  },
  verification: {
    label: 'Verifikasi',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: AlertCircle,
    description: 'Sedang dalam proses verifikasi',
    progress: 50,
  },
  process: {
    label: 'Diproses',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Loader2,
    description: 'Transaksi sedang diproses',
    progress: 75,
  },
  success: {
    label: 'Berhasil',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
    description: 'Transaksi berhasil, dana telah dikirim',
    progress: 100,
  },
  failed: {
    label: 'Gagal',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle,
    description: 'Transaksi gagal',
    progress: 0,
  },
};

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill from URL param
  useEffect(() => {
    const id = searchParams.get('orderId');
    if (id) {
      setOrderId(id);
      handleSearch(id);
    }
  }, [searchParams]);

  const handleSearch = async (id?: string) => {
    const searchId = id || orderId;
    if (!searchId) {
      setError('Masukkan Order ID');
      return;
    }

    setError('');
    setLoading(true);
    setOrder(null);

    try {
      const response = await fetch(`/api/orders/track?orderId=${searchId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Order tidak ditemukan');
        setLoading(false);
        return;
      }

      setOrder(data.data);
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Search Card */}
      <Card className="glass-card animate-slide-up">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Contoh: BB-XXXXXX"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                  className="mobile-input pl-11 text-lg font-mono tracking-wide"
                />
              </div>
              <Button 
                type="submit" 
                className="mobile-btn-primary px-5"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="glass-card border-destructive/50 animate-fade-in">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {order && (
        <div className="space-y-4 animate-fade-in">
          {/* Status Card */}
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0">
              {(() => {
                const config = getStatusConfig(order.status);
                const Icon = config.icon;
                return (
                  <div className="text-center py-6 sm:py-8 px-4 bg-gradient-to-br from-muted/50 to-muted/30">
                    <div className={cn(
                      'w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center',
                      config.color
                    )}>
                      <Icon className={cn('w-10 h-10', order.status === 'process' && 'animate-spin')} />
                    </div>
                    <Badge className={cn(config.color, 'text-sm px-4 py-1')}>
                      {config.label}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-3">
                      {config.description}
                    </p>
                    
                    {/* Progress bar */}
                    <div className="mt-6 max-w-xs mx-auto">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full gradient-primary rounded-full transition-all duration-500"
                          style={{ width: `${config.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Pending</span>
                        <span>Success</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Order Details Card */}
          <Card className="glass-card animate-slide-up stagger-1">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Order ID</span>
                <span className="font-mono font-bold text-primary">{order.orderId}</span>
              </div>

              <Separator />

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Nominal</p>
                  <p className="font-semibold">{formatCurrency(order.nominal)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Biaya Layanan</p>
                  <p className="font-semibold text-destructive">-{formatCurrency(order.paymentFee)}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl gradient-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Total Diterima</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(order.totalReceived)}</p>
              </div>

              <Separator />

              {/* Customer Info */}
              <div>
                <p className="text-sm font-medium mb-3">Data Penerima</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Nama</p>
                    <p className="font-medium">{order.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bank</p>
                    <p className="font-medium">
                      {order.customer.bankName && order.customer.bankAccount
                        ? `${order.customer.bankName} - ${order.customer.bankAccount}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    Tipe Pembayaran
                  </p>
                  <p className="font-medium">{order.paymentType}</p>
                </div>
                {order.partner && (
                  <div>
                    <p className="text-xs text-muted-foreground">Partner</p>
                    <p className="font-medium">{order.partner}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Metode
                  </p>
                  <p className="font-medium">{order.methodTransaction}</p>
                </div>
              </div>

              <Separator />

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <p>Dibuat</p>
                  <p className="font-medium text-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p>Update Terakhir</p>
                  <p className="font-medium text-foreground">{formatDate(order.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TrackOrderSkeleton() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen gradient-hero pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b ios-safe-top">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 h-14 sm:h-16">
            <Button 
              variant="ghost" 
              size="icon"
              asChild 
              className="tap-highlight rounded-xl"
            >
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold text-base sm:text-lg">Track Order</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Cek status transaksi Anda</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <Suspense fallback={<TrackOrderSkeleton />}>
          <TrackOrderContent />
        </Suspense>
      </div>
    </div>
  );
}
