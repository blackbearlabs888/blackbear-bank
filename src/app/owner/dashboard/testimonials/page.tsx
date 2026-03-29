'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  Award,
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  Quote,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Testimonial {
  id: string;
  transactionId: string;
  customerId: string;
  customerName: string;
  rating: number;
  review: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  transaction?: {
    orderId: string;
    nominal: number;
    paymentType?: { name: string } | null;
  } | null;
  customer?: {
    name: string;
    city: string;
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type FilterTab = 'all' | 'approved' | 'unapproved' | 'featured';

// ─── Constants ──────────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'unapproved', label: 'Belum Disetujui' },
  { key: 'featured', label: 'Unggulan' },
];

// ─── Helper Components ──────────────────────────────────────────────────────

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            iconSize,
            i < rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
  bgColorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  colorClass: string;
  bgColorClass: string;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center', bgColorClass)}>
            <Icon className={cn('w-4 h-4 sm:w-4.5 sm:h-4.5', colorClass)} />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">{label}</p>
            <p className="text-sm sm:text-base font-bold leading-tight">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TestimonialCard({
  testimonial,
  onToggleApprove,
  onToggleFeatured,
  onDelete,
}: {
  testimonial: Testimonial;
  onToggleApprove: (t: Testimonial) => void;
  onToggleFeatured: (t: Testimonial) => void;
  onDelete: (t: Testimonial) => void;
}) {
  return (
    <div
      className={cn(
        'p-3 sm:p-4 rounded-xl border transition-all',
        testimonial.isApproved
          ? 'bg-white dark:bg-background hover:shadow-md border-green-200 dark:border-green-800/60'
          : 'bg-amber-50/50 dark:bg-amber-950/20 hover:shadow-md border-amber-200 dark:border-amber-800/60'
      )}
    >
      {/* Top row: name + rating + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-semibold truncate">
              {testimonial.customer?.name || testimonial.customerName}
            </h3>
            <StarRating rating={testimonial.rating} />
          </div>
          {testimonial.customer?.city && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              {testimonial.customer.city}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {testimonial.isFeatured && (
            <Badge className="h-5 px-1.5 text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-0.5">
              <Award className="w-2.5 h-2.5" />
              Unggulan
            </Badge>
          )}
          {testimonial.isApproved ? (
            <Badge className="h-5 px-1.5 text-[9px] bg-green-500 text-white border-0 gap-0.5">
              <CheckCircle className="w-2.5 h-2.5" />
              Disetujui
            </Badge>
          ) : (
            <Badge className="h-5 px-1.5 text-[9px] bg-amber-500 text-white border-0 gap-0.5">
              <XCircle className="w-2.5 h-2.5" />
              Belum
            </Badge>
          )}
        </div>
      </div>

      {/* Review text */}
      {testimonial.review && (
        <div className="relative mb-2.5 pl-3 border-l-2 border-primary/20">
          <Quote className="absolute -left-1.5 -top-0.5 w-3 h-3 text-primary/30 fill-primary/30" />
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {testimonial.review}
          </p>
        </div>
      )}

      {/* Meta row: order ID, payment type, date */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] sm:text-xs text-muted-foreground mb-3">
        {testimonial.transaction?.orderId && (
          <span className="flex items-center gap-0.5 bg-muted px-1.5 py-0.5 rounded-md font-mono">
            {testimonial.transaction.orderId}
          </span>
        )}
        {testimonial.transaction?.paymentType?.name && (
          <span>{testimonial.transaction.paymentType.name}</span>
        )}
        <span className="ml-auto">{formatDate(testimonial.createdAt)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/60">
        <Button
          variant={testimonial.isApproved ? 'outline' : 'default'}
          size="sm"
          className={cn(
            'h-8 px-2.5 text-[10px] sm:text-xs gap-1.5 flex-1 sm:flex-none',
            testimonial.isApproved
              ? 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30'
              : 'bg-green-600 hover:bg-green-700 text-white'
          )}
          onClick={() => onToggleApprove(testimonial)}
        >
          {testimonial.isApproved ? (
            <>
              <ShieldX className="w-3.5 h-3.5" />
              Batalkan
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              Setujui
            </>
          )}
        </Button>
        <Button
          variant={testimonial.isFeatured ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'h-8 px-2.5 text-[10px] sm:text-xs gap-1.5 flex-1 sm:flex-none',
            testimonial.isFeatured
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0'
              : 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30'
          )}
          onClick={() => onToggleFeatured(testimonial)}
        >
          <Award className="w-3.5 h-3.5" />
          {testimonial.isFeatured ? 'Hapus Unggulan' : 'Unggulkan'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-[10px] sm:text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
          onClick={() => onDelete(testimonial)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function OwnerTestimonialsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);

  const redirectAttempted = useRef(false);

  // ─── Auth Guard ─────────────────────────────────────────────────────────
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

  // ─── Data Fetching ──────────────────────────────────────────────────────
  const fetchTestimonials = useCallback(async (tab?: FilterTab) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');

      if (tab === 'approved') params.append('approved', 'true');
      else if (tab === 'unapproved') params.append('approved', 'false');
      else if (tab === 'featured') params.append('featured', 'true');

      const response = await fetch(`/api/testimonials?${params.toString()}`);
      if (!response.ok) {
        console.error('Fetch testimonials error:', response.status);
        setLoading(false);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setTestimonials(result.data || []);
        setPagination(result.pagination || null);
      }
    } catch (err) {
      console.error('Failed to fetch testimonials:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchTestimonials(activeTab);
    }
  }, [isAuthenticated, hasHydrated, user, activeTab, fetchTestimonials]);

  // Window focus revalidation
  useEffect(() => {
    const onFocus = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'owner') {
        fetchTestimonials(activeTab);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAuthenticated, hasHydrated, user, activeTab, fetchTestimonials]);

  // ─── Stats ───────────────────────────────────────────────────────────────
  const totalCount = pagination?.total ?? testimonials.length;
  const featuredCount = testimonials.filter((t) => t.isFeatured).length;
  const approvedCount = testimonials.filter((t) => t.isApproved).length;
  const avgRating =
    testimonials.length > 0
      ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1)
      : '0.0';

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleToggleApprove = async (testimonial: Testimonial) => {
    setActionLoading(testimonial.id);
    try {
      const response = await fetch(`/api/testimonials/${testimonial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: !testimonial.isApproved }),
      });

      if (!response.ok) {
        toast.error('Terjadi kesalahan saat mengubah status');
        return;
      }

      const result = await response.json();
      if (result.success) {
        // Optimistically update local state
        setTestimonials((prev) =>
          prev.map((t) => (t.id === testimonial.id ? { ...t, isApproved: !testimonial.isApproved } : t))
        );
        toast.success(`Ulasan dari ${testimonial.customer?.name || testimonial.customerName} berhasil diperbarui`);
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeatured = async (testimonial: Testimonial) => {
    setActionLoading(testimonial.id);
    try {
      const response = await fetch(`/api/testimonials/${testimonial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !testimonial.isFeatured }),
      });

      if (!response.ok) {
        toast.error('Terjadi kesalahan saat mengubah status unggulan');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setTestimonials((prev) =>
          prev.map((t) => (t.id === testimonial.id ? { ...t, isFeatured: !testimonial.isFeatured } : t))
        );
        toast.success(`Ulasan dari ${testimonial.customer?.name || testimonial.customerName} berhasil diperbarui`);
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      const response = await fetch(`/api/testimonials/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        toast.error('Terjadi kesalahan saat menghapus testimoni');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setTestimonials((prev) => prev.filter((t) => t.id !== deleteTarget.id));
        toast.success('Testimoni berhasil dihapus secara permanen');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  // ─── Loading / Auth Guard Renders ────────────────────────────────────────
  if (isLoading || !hasHydrated) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3">
          <Skeleton className="h-8 w-40" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-10 rounded-xl" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  // ─── Main Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/owner/dashboard')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold">Kelola Testimoni</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {totalCount} testimoni dari pelanggan
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchTestimonials(activeTab)}
            disabled={loading}
            className="text-xs h-8 gap-1"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Gradient Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4 sm:p-5 text-white">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-lg" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5 blur-md" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5" />
              <h2 className="text-sm sm:text-base font-semibold">Testimoni Pelanggan</h2>
            </div>
            <p className="text-[10px] sm:text-xs text-white/70">
              Kelola dan moderasi ulasan dari pelanggan Anda
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            icon={MessageSquare}
            label="Total Testimoni"
            value={totalCount}
            colorClass="text-violet-600"
            bgColorClass="bg-violet-100 dark:bg-violet-900/30"
          />
          <StatCard
            icon={TrendingUp}
            label="Rata-rata Rating"
            value={avgRating}
            colorClass="text-amber-600"
            bgColorClass="bg-amber-100 dark:bg-amber-900/30"
          />
          <StatCard
            icon={Award}
            label="Unggulan"
            value={featuredCount}
            colorClass="text-orange-600"
            bgColorClass="bg-orange-100 dark:bg-orange-900/30"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 py-2 px-2 text-[10px] sm:text-xs font-medium rounded-lg transition-all',
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Testimonials List */}
        <Card className="glass-card">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                {activeTab === 'all' && `Semua Testimoni`}
                {activeTab === 'approved' && `Disetujui`}
                {activeTab === 'unapproved' && `Belum Disetujui`}
                {activeTab === 'featured' && `Testimoni Unggulan`}
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[9px]">
                  {testimonials.length}
                </Badge>
              </CardTitle>
              {activeTab === 'all' && approvedCount < totalCount && (
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                  {approvedCount} disetujui
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3 sm:pb-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
              </div>
            ) : testimonials.length > 0 ? (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {testimonials.map((testimonial) => (
                  <TestimonialCard
                    key={testimonial.id}
                    testimonial={testimonial}
                    onToggleApprove={handleToggleApprove}
                    onToggleFeatured={handleToggleFeatured}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {activeTab === 'all' && 'Belum ada testimoni'}
                  {activeTab === 'approved' && 'Belum ada testimoni disetujui'}
                  {activeTab === 'unapproved' && 'Tidak ada testimoni yang menunggu persetujuan'}
                  {activeTab === 'featured' && 'Belum ada testimoni unggulan'}
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground/70">
                  Testimoni dari pelanggan akan muncul di sini
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Hapus Testimoni
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus testimoni dari{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.customer?.name || deleteTarget?.customerName}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="flex items-center gap-2">
                <StarRating rating={deleteTarget.rating} />
                <span className="text-xs text-muted-foreground">{deleteTarget.rating}/5</span>
              </div>
              {deleteTarget.review && (
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  &ldquo;{deleteTarget.review}&rdquo;
                </p>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Hapus Permanen
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
