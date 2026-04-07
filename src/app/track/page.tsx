'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Star,
  Send,
  ThumbsUp,
  Quote,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderData {
  orderId: string;
  nominal: number;
  paymentFee: number;
  totalReceived: number;
  status: string;
  notes: string | null;
  customer: {
    name: string;
    phone: string;
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

interface TestimonialData {
  id: string;
  rating: number;
  review: string;
  customerName: string;
  createdAt: string;
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

const ratingLabels = ['', 'Sangat Buruk', 'Buruk', 'Biasa', 'Bagus', 'Sangat Bagus'];

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

// Star Rating Component
function StarRating({
  rating,
  hoverRating,
  onHover,
  onLeave,
  onRate,
  size = 'md',
  readonly = false,
}: {
  rating: number;
  hoverRating: number;
  onHover?: (rating: number) => void;
  onLeave?: () => void;
  onRate?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };
  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn(
            "relative transition-all duration-200",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"
          )}
          onMouseEnter={() => !readonly && onHover?.(star)}
          onMouseLeave={() => !readonly && onLeave?.()}
          onClick={() => !readonly && onRate?.(star)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-all duration-200",
              star <= displayRating
                ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                : "text-muted-foreground/30"
            )}
          />
          {star <= displayRating && !readonly && (
            <div className="absolute inset-0 animate-ping opacity-20">
              <Star className={cn(sizeClasses[size], "text-amber-400 fill-amber-400")} />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// Helper to get initials from name
function getInitials(name: string): string {
  if (!name) return '?';
  const words = name.trim().split(' ').filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0][0].toUpperCase();
}

// Testimonial Form Component
function TestimonialForm({
  orderId,
  customerName,
  onSubmit,
}: {
  orderId: string;
  customerName: string;
  onSubmit: (testimonial: TestimonialData) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const initials = getInitials(customerName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Silakan pilih rating 1-5 bintang');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: orderId,
          rating,
          review: review.trim(),
          customerName: customerName.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Terjadi kesalahan');
        return;
      }

      toast.success('Terima kasih atas ulasan Anda.');

      onSubmit(data.data);
    } catch {
      toast.error('Silakan coba lagi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="glass-card overflow-hidden border-0 shadow-xl animate-slide-up">
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 blur-md opacity-40" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Star className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base">Bagaimana Pengalaman Anda?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Transaksi berhasil! Berikan testimoni untuk membantu kami meningkatkan layanan
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Identity (readonly) */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-muted/40">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Menulis sebagai</p>
              <p className="font-medium text-sm truncate">{maskName(customerName)}</p>
            </div>
          </div>

          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Rating
            </label>
            <div className="flex flex-col items-center gap-2 py-2">
              <StarRating
                rating={rating}
                hoverRating={hoverRating}
                onHover={setHoverRating}
                onLeave={() => setHoverRating(0)}
                onRate={setRating}
                size="lg"
              />
              {(rating > 0 || hoverRating > 0) && (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 transition-all">
                  {ratingLabels[hoverRating || rating]}
                </p>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Ulasan <span className="text-muted-foreground/60">(opsional)</span>
            </label>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tulis pengalaman Anda tentang layanan kami..."
              className="min-h-[80px] rounded-lg bg-white/50 dark:bg-black/20 resize-none text-sm"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {review.length}/500
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Kirim Testimoni
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Testimonial Already Submitted Component
function TestimonialSubmitted({
  testimonial,
}: {
  testimonial: TestimonialData;
}) {
  return (
    <Card className="glass-card overflow-hidden border-0 shadow-xl animate-fade-in">
      <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">Testimoni Terkirim</h3>
            <p className="text-[10px] text-muted-foreground">
              {formatDate(testimonial.createdAt)}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full">
            <ThumbsUp className="w-3 h-3 mr-1" />
            Terima kasih
          </Badge>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-2 px-1">
          <StarRating rating={testimonial.rating} hoverRating={0} size="sm" readonly />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {ratingLabels[testimonial.rating]}
          </span>
        </div>

        {/* Review Text */}
        {testimonial.review && (
          <div className="relative px-3 py-2.5 rounded-lg bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-500/10">
            <Quote className="absolute top-2 left-1.5 w-3 h-3 text-amber-400/40" />
            <p className="text-sm text-muted-foreground italic pl-3">
              {testimonial.review}
            </p>
          </div>
        )}

        <p className="text-[10px] text-center text-muted-foreground/60">
          oleh <span className="font-medium">{maskName(testimonial.customerName)}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Testimonial state
  const [testimonial, setTestimonial] = useState<TestimonialData | null>(null);
  const [checkingTestimonial, setCheckingTestimonial] = useState(false);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'waiting' | 'payment' | null>(null);
  const modalShownRef = useRef<string | null>(null);

  // Auto-fill from URL param
  useEffect(() => {
    const id = searchParams.get('orderId');
    if (id) {
      setOrderId(id);
      handleSearch(id);
    }
  }, [searchParams]);

  // Check for existing testimonial when order is found and status is success
  useEffect(() => {
    if (order && order.status === 'success') {
      checkTestimonial(order.orderId);
    } else {
      setTestimonial(null);
      setShowTestimonialForm(false);
    }
  }, [order]);

  // Auto-show modal based on order status (only once per order load)
  useEffect(() => {
    if (!order) return;

    const modalKey = `${order.orderId}-${order.status}-${order.transactionLink}`;
    if (modalShownRef.current === modalKey) return;
    modalShownRef.current = modalKey;

    if (order.status === 'pending' && !order.transactionLink) {
      // Case A: pending + no link => waiting modal
      setModalType('waiting');
      setShowModal(true);
    } else if (order.status === 'verification' && order.transactionLink) {
      // Case B: verification + has link => payment modal
      setModalType('payment');
      setShowModal(true);
    } else if (order.status === 'process') {
      // Case C: process => toast notification
      toast.info('Transaksi Anda sedang diproses. Mohon tunggu...');
    }
  }, [order]);

  const checkTestimonial = async (id: string) => {
    setCheckingTestimonial(true);
    try {
      const response = await fetch(`/api/testimonials?orderId=${id}`);
      const data = await response.json();
      if (data.success && data.data) {
        setTestimonial(data.data);
      }
    } catch {
      // Silently fail - testimonial check is non-critical
    } finally {
      setCheckingTestimonial(false);
    }
  };

  const handleSearch = async (id?: string) => {
    const searchId = id || orderId;
    if (!searchId) {
      setError('Masukkan Order ID');
      return;
    }

    setError('');
    setLoading(true);
    setOrder(null);
    setTestimonial(null);
    setShowTestimonialForm(false);
    setShowModal(false);
    setModalType(null);
    modalShownRef.current = null;

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

  const handleTestimonialSubmit = (newTestimonial: TestimonialData) => {
    setTestimonial(newTestimonial);
    setShowTestimonialForm(false);
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
                <div className={cn(
                  "p-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border transition-all",
                  order.status === 'verification' 
                    ? "border-violet-500/50 shadow-lg shadow-violet-500/10 animate-pulse" 
                    : "border-violet-500/20"
                )}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-violet-500" />
                    <p className="text-xs font-medium text-violet-700 dark:text-violet-400">Link Transaksi Gestun</p>
                    {order.status === 'verification' && (
                      <Badge className="ml-auto bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-2 py-0 rounded-full">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                        Siap Bayar
                      </Badge>
                    )}
                  </div>
                  <a 
                    href={order.transactionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center justify-between gap-2 p-2 rounded-md transition-colors group",
                      order.status === 'verification'
                        ? "bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/20"
                        : "bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/30"
                    )}
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

          {/* Testimonial Section - Only for SUCCESS status */}
          {order.status === 'success' && (
            <>
              {/* Loading testimonial check */}
              {checkingTestimonial && (
                <Card className="glass-card overflow-hidden border-0 shadow-xl">
                  <CardContent className="p-6 flex items-center justify-center">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Memuat...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No testimonial yet - show CTA */}
              {!checkingTestimonial && !testimonial && !showTestimonialForm && (
                <Card className="glass-card overflow-hidden border-0 shadow-xl animate-slide-up cursor-pointer group hover:shadow-2xl transition-all duration-300"
                  onClick={() => setShowTestimonialForm(true)}
                >
                  <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Star className="w-6 h-6 text-white fill-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm">Beri Testimoni</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Bagikan pengalaman Anda tentang layanan kami
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-3 py-1 rounded-full group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Ketuk untuk menulis testimoni
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Testimonial Form */}
              {!checkingTestimonial && !testimonial && showTestimonialForm && (
                <TestimonialForm
                  orderId={order.orderId}
                  customerName={order.customer.name}
                  onSubmit={handleTestimonialSubmit}
                />
              )}

              {/* Testimonial Already Submitted */}
              {!checkingTestimonial && testimonial && (
                <TestimonialSubmitted testimonial={testimonial} />
              )}
            </>
          )}

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

      {/* ===== Auto-showing Modal Dialogs ===== */}

      {/* Case A: Waiting Modal — pending + no transactionLink */}
      {order && showModal && modalType === 'waiting' && (
        <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false); }}>
          <DialogContent
            className="glass-card sm:max-w-md border-0 shadow-2xl p-0 overflow-hidden"
            modal={true}
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            {/* Gradient header */}
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 px-6 pt-6 pb-4">
              <DialogHeader className="text-left">
                {/* Animated pulsing clock icon */}
                <div className="relative w-14 h-14 mb-3">
                  <div className="absolute inset-0 rounded-2xl bg-white/20 blur-md animate-pulse" />
                  <div className="relative w-14 h-14 rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center">
                    <Clock className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
                <DialogTitle className="text-xl font-bold text-white">
                  ⏳ Tunggu Link Transaksi
                </DialogTitle>
                <DialogDescription className="text-amber-100 text-sm mt-1">
                  Order sedang dalam proses verifikasi
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Status badge */}
              <div className="flex justify-center">
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-sm px-4 py-1.5 rounded-full font-semibold animate-pulse">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Menunggu Verifikasi
                </Badge>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div className="flex gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Order Anda sedang menunggu verifikasi dari tim kami.
                  </p>
                </div>
                <div className="flex gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Setelah order diverifikasi, admin akan memberikan link pembayaran untuk melanjutkan proses gestun.
                  </p>
                </div>
                <div className="flex gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Anda bisa mengecek kembali status order ini secara berkala melalui halaman ini.
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setShowModal(false)}
                  className="w-full h-11 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/20"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Case B: Payment Modal — verification + has transactionLink */}
      {order && showModal && modalType === 'payment' && (
        <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false); }}>
          <DialogContent className="glass-card sm:max-w-md border-0 shadow-2xl p-0 overflow-hidden">
            {/* Gradient header */}
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 px-6 pt-6 pb-4">
              <DialogHeader className="text-left">
                {/* Check circle icon */}
                <div className="relative w-14 h-14 mb-3">
                  <div className="absolute inset-0 rounded-2xl bg-white/20 blur-md opacity-60" />
                  <div className="relative w-14 h-14 rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <DialogTitle className="text-xl font-bold text-white">
                  ✅ Link Pembayaran Tersedia!
                </DialogTitle>
                <DialogDescription className="text-green-100 text-sm mt-1">
                  Lanjutkan pembayaran untuk proses gestun
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Payment type badge */}
              <div className="flex flex-wrap justify-center gap-2">
                <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 text-xs px-3 py-1 rounded-full font-medium">
                  <CreditCard className="w-3 h-3 mr-1" />
                  {order.paymentType}
                </Badge>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs px-3 py-1 rounded-full font-medium">
                  <Wallet className="w-3 h-3 mr-1" />
                  {formatCurrency(order.nominal)}
                </Badge>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div className="flex gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Order Anda telah diverifikasi dan link pembayaran sudah tersedia.
                  </p>
                </div>
                <div className="flex gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
                  <CreditCard className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Lanjutkan proses gestun dengan melakukan pembayaran menggunakan{' '}
                    <span className="font-semibold text-foreground">{order.paymentType}</span> yang Anda pilih.
                  </p>
                </div>
                <div className="flex gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
                  <Wallet className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Setelah pembayaran berhasil, dana akan langsung ditransfer ke rekening Anda.
                  </p>
                </div>
              </div>

              {/* COD note */}
              {order.methodTransaction === 'COD' && (
                <div className="flex gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Ini adalah transaksi COD. Pastikan koordinasi dengan admin untuk pengiriman barang.
                  </p>
                </div>
              )}

              <DialogFooter className="flex-col gap-2 pt-2 sm:flex-col">
                <Button
                  onClick={() => {
                    if (order.transactionLink) {
                      window.open(order.transactionLink, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="w-full h-11 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-md shadow-green-500/20"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Lanjutkan Pembayaran
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="w-full h-10 rounded-lg"
                >
                  Nanti Saja
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
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
