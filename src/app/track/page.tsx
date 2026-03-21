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
  Wallet,
  User,
  Calendar,
  ArrowRight,
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
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    icon: Clock,
    description: 'Order menunggu verifikasi tim kami',
    progress: 25,
    gradient: 'from-amber-500 to-yellow-500',
  },
  verification: {
    label: 'Verifikasi',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: AlertCircle,
    description: 'Sedang dalam proses verifikasi',
    progress: 50,
    gradient: 'from-blue-500 to-cyan-500',
  },
  process: {
    label: 'Diproses',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Loader2,
    description: 'Transaksi sedang diproses',
    progress: 75,
    gradient: 'from-purple-500 to-violet-500',
  },
  success: {
    label: 'Berhasil',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
    description: 'Transaksi berhasil, dana telah dikirim',
    progress: 100,
    gradient: 'from-green-500 to-emerald-500',
  },
  failed: {
    label: 'Gagal',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle,
    description: 'Transaksi gagal',
    progress: 0,
    gradient: 'from-red-500 to-rose-500',
  },
};

// Status Timeline Component
function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const statuses = ['pending', 'verification', 'process', 'success'];
  const currentIndex = statuses.indexOf(currentStatus);
  
  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute top-6 left-6 right-6 h-0.5 bg-muted">
        <div 
          className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500"
          style={{ width: `${(currentIndex / (statuses.length - 1)) * 100}%` }}
        />
      </div>
      
      {/* Status Points */}
      <div className="relative flex justify-between">
        {statuses.map((status, index) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const Icon = config.icon;
          const isCompleted = index <= currentIndex;
          const isCurrent = status === currentStatus;
          
          return (
            <div key={status} className="flex flex-col items-center">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                isCompleted 
                  ? `bg-gradient-to-br ${config.gradient} border-transparent` 
                  : "bg-background border-muted",
                isCurrent && "ring-4 ring-primary/20"
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  isCompleted ? "text-white" : "text-muted-foreground",
                  status === 'process' && isCurrent && "animate-spin"
                )} />
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium",
                isCompleted ? "text-foreground" : "text-muted-foreground"
              )}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="max-w-lg mx-auto space-y-4 sm:space-y-6">
      {/* Search Card */}
      <Card className="glass-card animate-slide-up overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500" />
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Package className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  placeholder="Contoh: BB-XXXXXX"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                  className="h-12 sm:h-14 pl-10 sm:pl-12 text-base sm:text-lg font-mono tracking-wide rounded-xl"
                />
              </div>
              <Button 
                type="submit" 
                className="h-12 sm:h-14 w-12 sm:w-14 rounded-xl gradient-primary shadow-lg shadow-primary/25"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Masukkan Order ID yang Anda terima saat membuat order
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="glass-card border-destructive/50 animate-fade-in">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Order Tidak Ditemukan</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Found */}
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
                    {/* Status Icon */}
                    <div className={cn(
                      'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br',
                      config.gradient
                    )}>
                      <Icon className={cn('w-10 h-10 sm:w-12 sm:h-12 text-white', order.status === 'process' && 'animate-spin')} />
                    </div>
                    
                    {/* Status Badge */}
                    <Badge className={cn(config.color, 'text-sm sm:text-base px-4 sm:px-5 py-1 sm:py-1.5')}>
                      {config.label}
                    </Badge>
                    
                    <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-xs mx-auto">
                      {config.description}
                    </p>
                    
                    {/* Timeline - Hidden for failed status */}
                    {order.status !== 'failed' && (
                      <div className="mt-6 sm:mt-8">
                        <StatusTimeline currentStatus={order.status} />
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Order Details Card */}
          <Card className="glass-card animate-slide-up overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Order ID */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Order ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-base sm:text-lg">{order.orderId}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg tap-highlight"
                    onClick={() => navigator.clipboard.writeText(order.orderId)}
                  >
                    <Package className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Amount Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 sm:p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Nominal</p>
                  </div>
                  <p className="font-semibold text-sm sm:text-base">{formatCurrency(order.nominal)}</p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-xs text-muted-foreground">Biaya</p>
                  </div>
                  <p className="font-semibold text-sm sm:text-base text-red-500">-{formatCurrency(order.paymentFee)}</p>
                </div>
              </div>

              {/* Total Received */}
              <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-primary/10 to-fuchsia-500/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm sm:text-base">Total Diterima</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-primary">{formatCurrency(order.totalReceived)}</span>
                </div>
              </div>

              <Separator />

              {/* Customer Info */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Data Penerima</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Nama</p>
                    <p className="text-sm font-medium">{order.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Bank</p>
                    <p className="text-sm font-medium">
                      {order.customer.bankName && order.customer.bankAccount
                        ? `${order.customer.bankName} - ${order.customer.bankAccount}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment & Method Info */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                    <CreditCard className="w-3 h-3" />
                    Tipe Pembayaran
                  </p>
                  <p className="text-sm font-medium">{order.paymentType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                    <Truck className="w-3 h-3" />
                    Metode
                  </p>
                  <p className="text-sm font-medium">{order.methodTransaction}</p>
                </div>
              </div>

              {order.partner && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Partner</p>
                  <p className="text-sm font-medium">{order.partner}</p>
                </div>
              )}

              <Separator />

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <div>
                    <p>Dibuat</p>
                    <p className="font-medium text-foreground text-xs">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 justify-end text-right">
                  <Clock className="w-3 h-3" />
                  <div>
                    <p>Update Terakhir</p>
                    <p className="font-medium text-foreground text-xs">{formatDate(order.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              asChild 
              variant="outline"
              className="flex-1 h-12 rounded-xl"
            >
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Link>
            </Button>
            <Button 
              asChild 
              className="flex-1 h-12 rounded-xl gradient-primary"
            >
              <Link href="/order">
                <Package className="w-4 h-4 mr-2" />
                Order Baru
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackOrderSkeleton() {
  return (
    <div className="max-w-lg mx-auto space-y-4 sm:space-y-6">
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Skeleton className="h-12 sm:h-14 flex-1 rounded-xl" />
            <Skeleton className="h-12 sm:h-14 w-12 sm:w-14 rounded-xl" />
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
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b">
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
