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
  Sparkles,
  Zap,
  Shield,
  XCircle,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface OrderData {
  orderId: string;
  nominal: number;
  paymentFee: number;
  totalReceived: number;
  status: string;
  notes: string | null;
  customer: {
    name: string;
    bankName: string | null;
    bankAccount: string | null;
  };
  paymentType: string;
  methodTransaction: string;
  partner: string | null;
  partnerPhone: string | null;
  ownerWhatsapp: string | null;
  transactionLink?: string | null;
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
    gradient: 'from-amber-400 to-yellow-500',
    bgGradient: 'from-amber-500/10 to-yellow-500/10',
  },
  verification: {
    label: 'Verifikasi',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: AlertCircle,
    description: 'Sedang dalam proses verifikasi',
    progress: 50,
    gradient: 'from-blue-400 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
  },
  process: {
    label: 'Diproses',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Loader2,
    description: 'Transaksi sedang diproses',
    progress: 75,
    gradient: 'from-purple-400 to-violet-500',
    bgGradient: 'from-purple-500/10 to-violet-500/10',
  },
  success: {
    label: 'Berhasil',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
    description: 'Transaksi berhasil, dana telah dikirim',
    progress: 100,
    gradient: 'from-green-400 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
  },
  failed: {
    label: 'Gagal',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
    description: 'Transaksi gagal',
    progress: 0,
    gradient: 'from-red-400 to-rose-500',
    bgGradient: 'from-red-500/10 to-rose-500/10',
  },
};

// Animated Background Component
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 dark:from-gray-950 dark:via-violet-950/20 dark:to-fuchsia-950/20" />
      
      {/* Mesh Gradient Orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-violet-400/30 to-fuchsia-400/30 dark:from-violet-600/20 dark:to-fuchsia-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-br from-pink-400/30 to-rose-400/30 dark:from-pink-600/20 dark:to-rose-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-fuchsia-500/10 dark:from-primary/5 dark:to-fuchsia-500/5 rounded-full blur-3xl" />
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20 dark:bg-primary/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

// Status Timeline Component
function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const statuses = ['pending', 'verification', 'process', 'success'];
  const currentIndex = statuses.indexOf(currentStatus);
  
  return (
    <div className="relative p-4 rounded-2xl bg-white/30 dark:bg-black/10 backdrop-blur-xl">
      {/* Progress Line */}
      <div className="absolute top-10 left-10 right-10 h-1 bg-muted/50 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary via-purple-500 to-green-500 transition-all duration-700 rounded-full"
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
            <div key={status} className="flex flex-col items-center relative z-10">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-500",
                isCompleted 
                  ? `bg-gradient-to-br ${config.gradient} border-transparent shadow-lg` 
                  : "bg-background border-muted",
                isCurrent && "ring-4 ring-primary/20 scale-110"
              )}>
                <Icon className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6",
                  isCompleted ? "text-white" : "text-muted-foreground",
                  status === 'process' && isCurrent && "animate-spin"
                )} />
              </div>
              <span className={cn(
                "text-xs mt-2 font-medium text-center",
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
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    if (order) {
      navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 sm:space-y-6">
      {/* Search Card */}
      <Card className="glass-card animate-slide-up overflow-hidden border-0 shadow-2xl shadow-primary/10">
        <div className="h-1.5 bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500" />
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shadow-lg shadow-primary/30">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg">Lacak Order</p>
                <p className="text-sm text-muted-foreground">Masukkan Order ID Anda</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Contoh: BB-XXXXXX"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                  className="h-14 pl-12 text-lg font-mono tracking-wide rounded-xl bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
                />
              </div>
              <Button 
                type="submit" 
                className="h-14 w-14 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 hover:from-primary/90 hover:to-fuchsia-500/90 shadow-lg shadow-primary/30"
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
        <Card className="glass-card border-red-500/30 animate-fade-in overflow-hidden">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-600 dark:text-red-400">Order Tidak Ditemukan</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Found */}
      {order && (
        <div className="space-y-5 animate-fade-in">
          {/* Status Card */}
          <Card className="glass-card overflow-hidden border-0 shadow-2xl">
            <CardContent className="p-0">
              {(() => {
                const config = getStatusConfig(order.status);
                const Icon = config.icon;
                return (
                  <div className={cn(
                    "text-center py-8 sm:py-10 px-4 bg-gradient-to-br",
                    config.bgGradient
                  )}>
                    {/* Status Icon */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-5">
                      <div className={cn(
                        "absolute inset-0 rounded-3xl blur-xl opacity-50",
                        `bg-gradient-to-br ${config.gradient}`
                      )} />
                      <div className={cn(
                        "relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center shadow-2xl",
                        `bg-gradient-to-br ${config.gradient}`
                      )}>
                        <Icon className={cn('w-12 h-12 sm:w-14 sm:h-14 text-white', order.status === 'process' && 'animate-spin')} />
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <Badge className={cn(config.color, 'text-base px-5 py-1.5 rounded-full')}>
                      {config.label}
                    </Badge>
                    
                    <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-xs mx-auto">
                      {config.description}
                    </p>
                    
                    {/* Timeline - Hidden for failed status */}
                    {order.status !== 'failed' && (
                      <div className="mt-8">
                        <StatusTimeline currentStatus={order.status} />
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Order Details Card */}
          <Card className="glass-card animate-slide-up overflow-hidden border-0 shadow-2xl shadow-primary/5">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* Order ID */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-fuchsia-500/5 border border-primary/10">
                <span className="text-sm text-muted-foreground">Order ID</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <span className="font-mono font-bold text-primary">{order.orderId}</span>
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Package className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Amount Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-muted/30 border border-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Nominal</p>
                  </div>
                  <p className="font-bold text-lg">{formatCurrency(order.nominal)}</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-red-500" />
                    <p className="text-xs text-muted-foreground">Biaya</p>
                  </div>
                  <p className="font-bold text-lg text-red-500">-{formatCurrency(order.paymentFee)}</p>
                </div>
              </div>

              {/* Total Received */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-fuchsia-500/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Total Diterima</span>
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                    {formatCurrency(order.totalReceived)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Customer Info */}
              <div className="p-4 rounded-xl bg-muted/20 border border-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-medium">Data Penerima</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nama</p>
                    <p className="font-medium">{order.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Bank</p>
                    <p className="font-medium">
                      {order.customer.bankName && order.customer.bankAccount
                        ? `${order.customer.bankName} - ${order.customer.bankAccount}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment & Method Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/20">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <CreditCard className="w-3 h-3" />
                    Tipe Pembayaran
                  </p>
                  <p className="font-medium">{order.paymentType}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Truck className="w-3 h-3" />
                    Metode
                  </p>
                  <p className="font-medium">{order.methodTransaction}</p>
                </div>
              </div>

              {order.partner && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground mb-1">Partner</p>
                  <p className="font-medium text-primary">{order.partner}</p>
                </div>
              )}

              {/* Notes from Owner */}
              {order.notes && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Catatan dari Admin</p>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}

              {/* Follow Up Button */}
              {(order.partnerPhone || order.ownerWhatsapp) && (
                <Button
                  asChild
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/20"
                >
                  <a
                    href={`https://wa.me/${order.partnerPhone || order.ownerWhatsapp}?text=${encodeURIComponent(`Halo, saya ingin menanyakan status order saya dengan Order ID: ${order.orderId}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Follow Up via WhatsApp
                    {order.partner ? ` (${order.partner})` : ' (Owner)'}
                  </a>
                </Button>
              )}

              {/* Transaction Link Gestun */}
              {order.transactionLink && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="w-4 h-4 text-violet-500" />
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-400">Link Transaksi Gestun</p>
                  </div>
                  <a 
                    href={order.transactionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 p-3 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/30 transition-colors group"
                  >
                    <span className="text-sm text-muted-foreground truncate flex-1">{order.transactionLink}</span>
                    <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                      <span className="text-xs font-medium">Buka</span>
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </a>
                </div>
              )}

              <Separator />

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Dibuat</p>
                    <p className="font-medium">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 justify-end text-right">
                  <div>
                    <p className="text-muted-foreground text-xs">Update Terakhir</p>
                    <p className="font-medium">{formatDate(order.updatedAt)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-blue-500" />
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
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 hover:from-primary/90 hover:to-fuchsia-500/90 shadow-lg shadow-primary/30"
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
    <div className="max-w-lg mx-auto space-y-5 sm:space-y-6">
      <Card className="glass-card border-0 shadow-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-fuchsia-500" />
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Skeleton className="h-14 flex-1 rounded-xl" />
            <Skeleton className="h-14 w-14 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen pb-8">
      <AnimatedBackground />
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 h-16 sm:h-20">
            <Button 
              variant="ghost" 
              size="icon"
              asChild 
              className="rounded-xl bg-white/50 dark:bg-black/20"
            >
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-lg sm:text-xl">Track Order</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Cek status transaksi Anda</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Real-time</span>
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
