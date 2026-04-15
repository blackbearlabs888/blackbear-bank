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
    <div className="rounded-xl dash-card p-3 sm:p-4">
      <div className="flex items-center gap-2.5">
        <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center', bgColorClass)}>
          <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', colorClass)} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
          <p className="text-sm font-semibold leading-tight">{value}</p>
        </div>
      </div>
    </div>
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
        'p-3 sm:p-4 rounded-xl border border-border/60 transition-colors',
        testimonial.isApproved
          ? 'bg-card hover:bg-muted/30'
          : 'bg-card hover:bg-muted/30'
      )}
    >
      {/* Top row: name + rating + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[11px] sm:text-xs font-semibold truncate">
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
            <Badge className="h-5 px-2 py-0.5 text-[9px] sm:text-[10px] rounded-full bg-amber-500 text-white border-0 gap-0.5">
              <Award className="w-2.5 h-2.5" />
              Unggulan
            </Badge>
          )}
          {testimonial.isApproved ? (
            <Badge className="h-5 px-2 py-0.5 text-[9px] sm:text-[10px] rounded-full bg-emerald-500 text-white border-0 gap-0.5">
              <CheckCircle className="w-2.5 h-2.5" />
              Disetujui
            </Badge>
          ) : (
            <Badge className="h-5 px-2 py-0.5 text-[9px] sm:text-[10px] rounded-full bg-amber-500 text-white border-0 gap-0.5">
              <XCircle className="w-2.5 h-2.5" />
              Belum
            </Badge>
          )}
        </div>
      </div>

      {/* Review text */}
      {testimonial.review && (
        <div className="relative mb-2.5 pl-3 border-l-2 border-border/60">
          <Quote className="absolute -left-1.5 -top-0.5 w-3 h-3 text-muted-foreground/30 fill-muted-foreground/30" />
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-3">
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
            'h-8 rounded-lg px-2.5 text-[10px] sm:text-xs font-medium gap-1.5 flex-1 sm:flex-none',
            testimonial.isApproved
              ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
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
            'h-8 rounded-lg px-2.5 text-[10px] sm:text-xs font-medium gap-1.5 flex-1 sm:flex-none',
            testimonial.isFeatured
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-0'
              : 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
          )}
          onClick={() => onToggleFeatured(testimonial)}
        >
          <Award className="w-3.5 h-3.5" />
          {testimonial.isFeatured ? 'Hapus Unggulan' : 'Unggulkan'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg px-2.5 text-[10px] sm:text-xs font-medium gap-1.5 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300"
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
      <div className="min-h-screen bg-background dashboard-mesh">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
          <Skeleton className="h-8 w-40" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-10 rounded-xl" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') return null;

  // ─── Main Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background dashboard-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Testimonials</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/owner/dashboard')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Kelola Testimoni</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">{totalCount} testimoni dari pelanggan</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchTestimonials(activeTab)}
            disabled={loading}
            className="h-9 w-9 p-0 rounded-lg"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={MessageSquare}
          label="Total Testimoni"
          value={totalCount}
          colorClass="text-violet-600 dark:text-violet-400"
          bgColorClass="bg-violet-100 dark:bg-violet-900/30"
        />
        <StatCard
          icon={TrendingUp}
          label="Rata-rata Rating"
          value={avgRating}
          colorClass="text-amber-600 dark:text-amber-400"
          bgColorClass="bg-amber-100 dark:bg-amber-900/30"
        />
        <StatCard
          icon={Award}
          label="Unggulan"
          value={featuredCount}
          colorClass="text-orange-600 dark:text-orange-400"
          bgColorClass="bg-orange-100 dark:bg-orange-900/30"
        />
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-2.5 px-2 text-xs font-medium rounded-lg transition-all',
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Testimonials List ── */}
      <div className="rounded-xl dash-card overflow-hidden">
        <div className="p-3 sm:p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {activeTab === 'all' && 'Semua Testimoni'}
                {activeTab === 'approved' && 'Disetujui'}
                {activeTab === 'unapproved' && 'Belum Disetujui'}
                {activeTab === 'featured' && 'Testimoni Unggulan'}
              </span>
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[9px] sm:text-[10px] rounded-full">
                {testimonials.length}
              </Badge>
            </div>
            {activeTab === 'all' && approvedCount < totalCount && (
              <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                {approvedCount} disetujui
              </span>
            )}
          </div>
        </div>
        <div className="px-2 sm:px-4 pb-3 sm:pb-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : testimonials.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
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
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-muted/60 flex items-center justify-center">
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
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
          <div className="p-6 space-y-4">
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
              <div className="rounded-xl bg-muted/60 p-3 space-y-1.5">
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
          </div>
          <AlertDialogFooter className="border-t border-border/60 px-6 py-4">
            <AlertDialogCancel disabled={!!actionLoading} className="h-9 rounded-lg text-xs font-medium">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white h-9 rounded-lg text-xs font-medium"
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
    </div>
  );
}
