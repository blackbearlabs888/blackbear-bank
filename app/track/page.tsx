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

// Helper functions to mask sensitive data
function maskName(name: string): string {
  if (!name || name.length <= 2) return name;
  const words = name.split(' ');
  return words.map(word => {
    if (word.length <= 2) return word[0] + '*';
    return word[0] + '*'.repeat(word.length - 1);
  }).join(' ');
}

function maskBankAccount(account: string): string {
  if (!account || account.length <= 4) return account;
  const visibleStart = account.slice(0, 2);
  const visibleEnd = account.slice(-3);
  const masked = '*'.repeat(account.length - 5);
  return `${visibleStart}${masked}${visibleEnd}`;
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
    <div className="relative p-3 rounded-xl bg-white/30 dark:bg-black/10 backdrop-blur-xl">
      {/* Progress Line */}
      <div className="absolute top-7 left-7 right-7 h-0.5 bg-muted/50 rounded-full overflow-hidden">
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
                "w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-500",
                isCompleted 
                  ? `bg-gradient-to-br ${config.gradient} border-transparent shadow-md` 
                  : "bg-background border-muted",
                isCurrent && "ring-2 ring-primary/20"
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  isCompleted ? "text-white" : "text-muted-foreground",
                  status === 'process' && isCurrent && "animate-spin"
                )} />
              </div>
              <span className={cn(
                "text-[10px] mt-1 font-medium text-center",
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
      <Card className="glass-card animate-slide-up overflow-hidden border-0 shadow-xl shadow-primary/10">
        <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500" />
        <CardContent className="pt-4 pb-4 px-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shadow-md shadow-primary/20">
                <Search className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-base">Lacak Order</p>
                <p className="text-xs text-muted-foreground">Masukkan Order ID Anda</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Contoh: BB-XXXXXX"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                  className="h-11 pl-10 text-base font-mono tracking-wide rounded-lg bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
                />
              </div>
              <Button 
                type="submit" 
                className="h-11 w-11 rounded-lg bg-gradient-to-r from-primary to-fuchsia-500 hover:from-primary/90 hover:to-fuchsia-500/90 shadow-md shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="glass-card border-red-500/30 animate-fade-in overflow-hidden">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-md shadow-red-500/20">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-red-600 dark:text-red-400 text-sm">Order Tidak Ditemukan</p>
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
          <Card className="glass-card overflow-hidden border-0 shadow-xl">
            <CardContent className="p-0">
              {(() => {
                const config = getStatusConfig(order.status);
                const Icon = config.icon;
                return (
                  <div className={cn(
                    "text-center py-5 sm:py-6 px-3 bg-gradient-to-br",
                    config.bgGradient
                  )}>
                    {/* Status Icon */}
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 mx-auto mb-3">
                      <div className={cn(
                        "absolute inset-0 rounded-2xl blur-lg opacity-50",
                        `bg-gradient-to-br ${config.gradient}`
                      )} />
                      <div className={cn(
                        "relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center shadow-xl",
                        `bg-gradient-to-br ${config.gradient}`
                      )}>
                        <Icon className={cn('w-8 h-8 sm:w-9 sm:h-9 text-white', order.status === 'process' && 'animate-spin')} />
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <Badge className={cn(config.color, 'text-sm px-4 py-1 rounded-full')}>
                      {config.label}
                    </Badge>
                    
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                      {config.description}
                    </p>
                    
                    {/* Timeline - Hidden for failed status */}
                    {order.status !== 'failed' && (
                      <div className="mt-4">
                        <StatusTimeline currentStatus={order.status} />
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Order Details Card */}
          <Card className="glass-card animate-slide-up overflow-hidden border-0 shadow-xl shadow-primary/5">
            <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <CardContent className="p-4 space-y-4">
              {/* Order ID */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-primary/5 to-fuchsia-500/5 border border-primary/10">
                <span className="text-xs text-muted-foreground">Order ID</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <span className="font-mono font-bold text-primary text-sm">{order.orderId}</span>
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Amount Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-muted/30 border border-muted/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">Nominal</p>
                  </div>
                  <p className="font-bold text-base">{formatCurrency(order.nominal)}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wallet className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-[10px] text-muted-foreground">Biaya</p>
                  </div>
                  <p className="font-bold text-base text-red-500">-{formatCurrency(order.paymentFee)}</p>
                </div>
              </div>

              {/* Total Received */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 via-purple-500/10 to-fuchsia-500/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Total Diterima</span>
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                    {formatCurrency(order.totalReceived)}
                  </span>
                </div>
              </div>

              <Separator className="my-3" />

              {/* Customer Info - Masked for Security */}
              <div className="p-3 rounded-lg bg-muted/20 border border-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                  <p className="font-medium text-sm">Data Penerima</p>
                  <Badge variant="outline" className="text-[8px] ml-auto px-1.5 py-0">
                    <Shield className="w-2 h-2 mr-0.5" />
                    Terlindungi
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Nama</p>
                    <p className="font-medium text-sm">{maskName(order.customer.name)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Bank</p>
                    <p className="font-medium text-sm">
                      {order.customer.bankName && order.customer.bankAccount
                        ? `${order.customer.bankName} - ${maskBankAccount(order.customer.bankAccount)}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />

              {/* Payment & Method Info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/20">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                    <CreditCard className="w-3 h-3" />
                    Tipe Pembayaran
                  </p>
                  <p className="font-medium text-sm">{order.paymentType}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/20">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                    <Truck className="w-3 h-3" />
                    Metode
                  </p>
                  <p className="font-medium text-sm">{order.methodTransaction}</p>
                </div>
              </div>

              {order.partner && (
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Partner</p>
                  <p className="font-medium text-primary text-sm">{order.partner}</p>
                </div>
              )}

              {/* Notes from Owner */}
              {order.notes && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Catatan dari Admin</p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}

              {/* Follow Up Button */}
              {(order.partnerPhone || order.ownerWhatsapp) && (
                <Button
                  asChild
                  className="w-full h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-md shadow-green-500/20"
                >
                  <a
                    href={`https://wa.me/${order.partnerPhone || order.ownerWhatsapp}?text=${encodeURIComponent(`Halo, saya ingin menanyakan status order saya dengan Order ID: ${order.orderId}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Follow Up via WhatsApp
                    {order.partner ? ` (${order.partner})` : ' (Owner)'}
                  </a>
                </Button>
              )}

              {/* Transaction Link Gestun */}
              {order.transactionLink && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-violet-500" />
                    <p className="text-xs font-medium text-violet-700 dark:text-violet-400">Link Transaksi Gestun</p>
                  </div>
                  <a 
                    href={order.transactionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/30 transition-colors group"
                  >
                    <span className="text-xs text-muted-foreground truncate flex-1">{order.transactionLink}</span>
                    <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                      <span className="text-[10px] font-medium">Buka</span>
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </a>
                </div>
              )}

              <Separator className="my-3" />

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3 h-3 text-green-500" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px]">Dibuat</p>
                    <p className="font-medium">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end text-right">
                  <div>
                    <p className="text-muted-foreground text-[10px]">Update Terakhir</p>
                    <p className="font-medium">{formatDate(order.updatedAt)}</p>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3 h-3 text-blue-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              asChild 
              variant="outline"
              className="flex-1 h-10 rounded-lg"
            >
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Link>
            </Button>
            <Button 
              asChild 
              className="flex-1 h-10 rounded-lg bg-gradient-to-r from-primary to-fuchsia-500 hover:from-primary/90 hover:to-fuchsia-500/90 shadow-md shadow-primary/20"
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
    <div className="max-w-lg mx-auto space-y-4">
      <Card className="glass-card border-0 shadow-xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-fuchsia-500" />
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-lg" />
            <Skeleton className="h-11 w-11 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen pb-6">
      <AnimatedBackground />
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2.5 h-14">
            <Button 
              variant="ghost" 
              size="icon"
              asChild 
              className="rounded-lg bg-white/50 dark:bg-black/20 h-9 w-9"
            >
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-base">Track Order</h1>
              <p className="text-[10px] text-muted-foreground">Cek status transaksi Anda</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <Shield className="w-3 h-3 text-green-500" />
              <span className="text-xs font-medium">Real-time</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Suspense fallback={<TrackOrderSkeleton />}>
          <TrackOrderContent />
        </Suspense>
      </div>
    </div>
  );
}
