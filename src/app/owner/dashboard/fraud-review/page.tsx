'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { SimplePagination } from '@/components/ui/pagination';
import { toast } from 'sonner';

// ── Types ──

interface FraudReasonCode {
  code: string;
  description: string;
}

interface FraudReviewItem {
  transactionId: string;
  orderId: string;
  nominal: number;
  partnerProfit: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  fraudStatus: 'clear' | 'review' | 'confirmed' | 'dismissed';
  commissionStatus: 'pending' | 'held' | 'approved' | 'rejected' | 'not_applicable';
  commissionApprovedAmount: number;
  status: string;
  reasonCodes: FraudReasonCode[];
  partner: {
    id: string;
    name: string;
    status: string;
    city: string | null;
  } | null;
  customer: {
    name: string;
    phone: string;
    bankAccount: string;
    city: string | null;
  };
  paymentType: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

interface FraudReviewResponse {
  success: boolean;
  data: FraudReviewItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

const ITEMS_PER_PAGE = 10;

// ── Risk badge config ──

function riskBadgeClass(level: string): string {
  switch (level) {
    case 'critical':
      return 'bg-red-600 text-white hover:bg-red-600';
    case 'high':
      return 'bg-red-500 text-white hover:bg-red-500';
    case 'medium':
      return 'bg-amber-500 text-white hover:bg-amber-500';
    case 'low':
    default:
      return 'bg-emerald-500 text-white hover:bg-emerald-500';
  }
}

function commissionBadgeClass(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'held':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'rejected':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'pending':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'not_applicable':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function commissionLabel(status: string): string {
  switch (status) {
    case 'approved': return 'Disetujui';
    case 'held': return 'Ditahan';
    case 'rejected': return 'Ditolak';
    case 'pending': return 'Diproses';
    case 'not_applicable': return 'N/A';
    default: return status;
  }
}

function fraudStatusLabel(status: string): string {
  switch (status) {
    case 'clear': return 'Bersih';
    case 'review': return 'Perlu Review';
    case 'confirmed': return 'Fraud Terkonfirmasi';
    case 'dismissed': return 'Dibatalkan (False Positive)';
    default: return status;
  }
}

// ── Page ──

export default function FraudReviewPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [items, setItems] = useState<FraudReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('review');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Review dialog state
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    transactionId: string | null;
    orderId: string | null;
    action: 'approve' | 'reject' | 'suspend' | null;
    note: string;
    submitting: boolean;
  }>({
    open: false,
    transactionId: null,
    orderId: null,
    action: null,
    note: '',
    submitting: false,
  });

  const fetchFraudReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      const res = await fetch(`/api/admin/fraud?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          setError('Akses ditolak. Halaman ini hanya untuk owner.');
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data: FraudReviewResponse = await res.json();
      setItems(data.data || []);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data fraud');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currentPage, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'owner') {
      router.push('/partner/dashboard');
      return;
    }
    fetchFraudReviews();
  }, [isAuthenticated, user, router, fetchFraudReviews]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const openReviewDialog = (transactionId: string, orderId: string, action: 'approve' | 'reject' | 'suspend') => {
    setReviewDialog({
      open: true,
      transactionId,
      orderId,
      action,
      note: '',
      submitting: false,
    });
  };

  const closeReviewDialog = () => {
    setReviewDialog((prev) => ({ ...prev, open: false, transactionId: null, action: null, note: '' }));
  };

  const submitReviewAction = async () => {
    if (!reviewDialog.transactionId || !reviewDialog.action) return;
    setReviewDialog((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await fetch(`/api/admin/fraud/${reviewDialog.transactionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: reviewDialog.action,
          note: reviewDialog.note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      toast.success(`Aksi ${reviewDialog.action} berhasil diterapkan`);
      closeReviewDialog();
      // Refresh list
      fetchFraudReviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menerapkan aksi');
    } finally {
      setReviewDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  // ── Render ──

  if (loading && items.length === 0) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchFraudReviews} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Coba lagi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Fraud Review</h1>
            <p className="text-sm text-muted-foreground">
              Transaksi yang ditandai untuk peninjauan anti-fraud
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="review">Perlu Review</SelectItem>
              <SelectItem value="confirmed">Terkonfirmasi</SelectItem>
              <SelectItem value="dismissed">Dibatalkan</SelectItem>
              <SelectItem value="all">Semua</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={fetchFraudReviews}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Total Flagged</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Komisi Ditahan</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">
              {items.filter((i) => i.commissionStatus === 'held').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Disetujui</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">
              {items.filter((i) => i.commissionStatus === 'approved').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Ditolak</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">
              {items.filter((i) => i.commissionStatus === 'rejected').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {items.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-10 pb-10">
            <div className="flex flex-col items-center gap-3 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
              <h3 className="text-lg font-semibold">Tidak ada transaksi yang ditandai</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Semua transaksi dengan status &ldquo;{fraudStatusLabel(statusFilter === 'all' ? 'review' : statusFilter)}&rdquo; telah ditinjau.
                {statusFilter !== 'review' && (
                  <Button
                    variant="link"
                    className="p-0 h-auto ml-1"
                    onClick={() => setStatusFilter('review')}
                  >
                    Lihat yang perlu review
                  </Button>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fraud review list */}
      <div className="space-y-3">
        {items.map((item) => {
          const isExpanded = expandedId === item.transactionId;
          return (
            <Card key={item.transactionId} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        item.riskLevel === 'critical' && 'bg-red-100 dark:bg-red-900/30',
                        item.riskLevel === 'high' && 'bg-red-100 dark:bg-red-900/30',
                        item.riskLevel === 'medium' && 'bg-amber-100 dark:bg-amber-900/30',
                        item.riskLevel === 'low' && 'bg-emerald-100 dark:bg-emerald-900/30',
                      )}
                    >
                      <ShieldAlert
                        className={cn(
                          'w-5 h-5',
                          item.riskLevel === 'critical' && 'text-red-600 dark:text-red-400',
                          item.riskLevel === 'high' && 'text-red-500 dark:text-red-400',
                          item.riskLevel === 'medium' && 'text-amber-600 dark:text-amber-400',
                          item.riskLevel === 'low' && 'text-emerald-600 dark:text-emerald-400',
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base sm:text-lg truncate">
                          {item.orderId}
                        </CardTitle>
                        <Badge className={riskBadgeClass(item.riskLevel)}>
                          {item.riskLevel.toUpperCase()} · {item.riskScore}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        {item.customer.name} · {item.customer.phone} · {formatCurrency(item.nominal)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge variant="outline" className={commissionBadgeClass(item.commissionStatus)}>
                      Komisi: {commissionLabel(item.commissionStatus)}
                    </Badge>
                    {item.partner?.status === 'suspended' && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400">
                        Partner Suspended
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Quick info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Partner</p>
                    <p className="font-medium truncate">
                      {item.partner?.name ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rekening</p>
                    <p className="font-medium font-mono">{item.customer.bankAccount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Komisi Potensial</p>
                    <p className="font-medium">{formatCurrency(item.partnerProfit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status TX</p>
                    <p className="font-medium capitalize">{item.status}</p>
                  </div>
                </div>

                {/* Reason codes (always visible) */}
                {item.reasonCodes.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1.5">Sinyal Fraud:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.reasonCodes.map((r, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {r.description}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review note (if exists) */}
                {item.reviewNote && (
                  <div className="mb-3 p-2 rounded-lg bg-muted/50 text-xs">
                    <span className="text-muted-foreground">Catatan owner: </span>
                    {item.reviewNote}
                  </div>
                )}

                {/* Expand/collapse details */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.transactionId)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {isExpanded ? 'Sembunyikan detail' : 'Lihat detail'}
                </button>

                {isExpanded && (
                  <div className="mb-3 p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID</span>
                      <span className="font-mono">{item.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dibuat</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    {item.reviewedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Di Review</span>
                        <span>{formatDate(item.reviewedAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fraud Status</span>
                      <span>{fraudStatusLabel(item.fraudStatus)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Komisi Disetujui</span>
                      <span>{formatCurrency(item.commissionApprovedAmount)}</span>
                    </div>
                    {item.paymentType && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipe Pembayaran</span>
                        <span>{item.paymentType}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {item.fraudStatus === 'review' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => openReviewDialog(item.transactionId, item.orderId, 'approve')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => openReviewDialog(item.transactionId, item.orderId, 'reject')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                      onClick={() => openReviewDialog(item.transactionId, item.orderId, 'suspend')}
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Suspend Partner
                    </Button>
                  </div>
                )}

                {item.fraudStatus === 'dismissed' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    False positive — komisi telah disetujui
                  </div>
                )}

                {item.fraudStatus === 'confirmed' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs text-red-600 dark:text-red-400">
                    <ShieldX className="w-4 h-4" />
                    Fraud terkonfirmasi — komisi ditolak
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <SimplePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Review confirmation dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(o) => !o && closeReviewDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDialog.action === 'approve' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
              {reviewDialog.action === 'reject' && (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {reviewDialog.action === 'suspend' && (
                <Ban className="w-5 h-5 text-amber-600" />
              )}
              Konfirmasi {reviewDialog.action === 'approve' ? 'Approve' : reviewDialog.action === 'reject' ? 'Reject' : 'Suspend'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve' && (
                <>Transaksi <span className="font-mono font-semibold">{reviewDialog.orderId}</span> akan ditandai sebagai false positive. Komisi akan disetujui dan partner stats akan diperbarui.</>
              )}
              {reviewDialog.action === 'reject' && (
                <>Transaksi <span className="font-mono font-semibold">{reviewDialog.orderId}</span> akan ditandai sebagai fraud terkonfirmasi. Komisi akan ditolak. Jika sebelumnya approved, partner stats akan direvers.</>
              )}
              {reviewDialog.action === 'suspend' && (
                <>Partner pada transaksi <span className="font-mono font-semibold">{reviewDialog.orderId}</span> akan di-suspend. Komisi tetap ditahan hingga keputusan lanjutan.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Catatan (opsional)</label>
            <Textarea
              value={reviewDialog.note}
              onChange={(e) => setReviewDialog((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Tambahkan catatan untuk keputusan ini..."
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeReviewDialog} disabled={reviewDialog.submitting}>
              Batal
            </Button>
            <Button
              onClick={submitReviewAction}
              disabled={reviewDialog.submitting}
              className={cn(
                reviewDialog.action === 'approve' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
                reviewDialog.action === 'reject' && 'bg-red-600 hover:bg-red-700 text-white',
                reviewDialog.action === 'suspend' && 'bg-amber-600 hover:bg-amber-700 text-white',
              )}
            >
              {reviewDialog.submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
