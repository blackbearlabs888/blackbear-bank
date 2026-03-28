'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimplePagination } from '@/components/ui/pagination';
import {
  Wallet, ArrowRightLeft, Search, RefreshCw,
  Loader2, AlertCircle, CheckCircle, XCircle, User, CreditCard, Store,
  MessageSquare, Copy, Edit3, Clock, ArrowUp, ArrowDown,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  orderId: string;
  nominal: number;
  paymentFee: number;
  platformFee: number;
  ownerProfit: number;
  partnerProfit: number;
  totalReceived: number;
  methodTransaction: string;
  status: string;
  notes: string | null;
  transactionLink?: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string; city?: string; bankName?: string; bankAccount?: string; bankHolder?: string; };
  paymentType: { id: string; name: string; onlineFeePercent?: number; onlineFeeFlat?: number; codFeePercent?: number; codFeeFlat?: number; threshold?: number; };
  marketplace?: { id: string; name: string; feePercent: number; feeFlat?: number; isActive?: boolean; } | null;
  partner?: { id: string; name: string; tier: string; commission?: number; } | null;
}

const STATUS_CONFIG = {
  pending: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock, iconColor: 'text-orange-600', gradient: 'from-orange-500 to-amber-600' },
  verification: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle, iconColor: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
  process: { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Loader2, iconColor: 'text-cyan-600', gradient: 'from-cyan-500 to-teal-600' },
  success: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: ArrowUp, iconColor: 'text-green-600', gradient: 'from-green-500 to-emerald-600' },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: ArrowDown, iconColor: 'text-red-600', gradient: 'from-red-500 to-rose-600' },
};

export default function PartnerTransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => { if (!hasHydrated) hydrate(); }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading) {
      if (!isAuthenticated) router.replace('/login');
      else if (user?.role === 'owner') router.replace('/owner/dashboard');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'partner') {
      fetchTransactions();
    }
  }, [isAuthenticated, hasHydrated, user, activeTab, currentPage]);

  const fetchTransactions = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.append('days', '30');
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      if (activeTab !== 'all') params.append('status', activeTab);
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalItems(data.pagination.totalItems);
        }
        setLastUpdated(new Date());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setIsRefreshing(false); }
  };

  const filtered = useMemo(() => transactions.filter(tx => {
    const q = searchQuery.toLowerCase();
    return tx.orderId?.toLowerCase().includes(q) || tx.customer?.name?.toLowerCase().includes(q) || tx.customer?.phone?.includes(q);
  }), [transactions, searchQuery]);

  if (isLoading || !hasHydrated) return <LoadingState />;
  if (!isAuthenticated || user?.role !== 'partner') return null;

  return (
    <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span className="truncate">Transaksi Saya</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Riwayat transaksi partner</p>
        </div>
        <Button
          onClick={() => fetchTransactions()}
          size="sm"
          variant="outline"
          className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg"
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Status Filter Pills */}
      <div className="overflow-x-auto -mx-3 px-3 scrollbar-hide">
        <div className="flex gap-1.5 min-w-max pb-1">
          {[
            { value: 'all', label: 'Semua' },
            { value: 'pending', label: 'Pending', color: 'orange' },
            { value: 'verification', label: 'Verif', color: 'blue' },
            { value: 'process', label: 'Proses', color: 'cyan' },
            { value: 'success', label: 'Sukses', color: 'green' },
            { value: 'failed', label: 'Gagal', color: 'red' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap",
                activeTab === tab.value
                  ? cn(
                      tab.color === 'orange' && "bg-orange-500 text-white shadow-sm",
                      tab.color === 'blue' && "bg-blue-500 text-white shadow-sm",
                      tab.color === 'cyan' && "bg-cyan-500 text-white shadow-sm",
                      tab.color === 'green' && "bg-green-500 text-white shadow-sm",
                      tab.color === 'red' && "bg-red-500 text-white shadow-sm",
                      !tab.color && "bg-primary text-primary-foreground shadow-sm"
                    )
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
        <Input
          placeholder="Cari order ID, nama, no. WA..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 sm:pl-10 h-9 sm:h-10 rounded-xl text-sm"
        />
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 sm:h-20 rounded-xl" />)
        ) : filtered.length > 0 ? (
          filtered.map(tx => (
            <TxCard key={tx.id} tx={tx} onClick={() => { setSelectedTransaction(tx); setDetailOpen(true); }} />
          ))
        ) : (
          <div className="text-center py-12">
            <Wallet className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-xs sm:text-sm text-muted-foreground">Tidak ada transaksi</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <SimplePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Detail Dialog */}
      <TxDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        tx={selectedTransaction}
      />
    </div>
  );
}

// Transaction Card
function TxCard({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Card className="glass-card overflow-hidden active-scale cursor-pointer hover:shadow-md transition-all tap-highlight" onClick={onClick}>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 p-2 sm:gap-2.5 sm:p-2.5">
          <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-gradient-to-br flex-shrink-0", config.gradient)}>
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5 text-white", tx.status === 'process' && "animate-spin")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="font-mono text-[9px] sm:text-[10px] text-muted-foreground truncate">{tx.orderId}</p>
              <Badge className={cn("text-[8px] sm:text-[9px] capitalize px-1.5 sm:px-2", config.color)}>{tx.status}</Badge>
            </div>
            <p className="text-[11px] sm:text-xs font-medium truncate">{tx.customer?.name}</p>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{tx.paymentType?.name} • {tx.methodTransaction}</p>
              <p className="text-[10px] sm:text-xs font-bold text-primary flex-shrink-0">+{formatCurrency(tx.partnerProfit)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-2 sm:px-2.5 py-1.5 bg-muted/30 border-t text-[9px] sm:text-[10px]">
          <span className="text-muted-foreground truncate">{formatCurrency(tx.nominal)} • {formatDate(tx.createdAt)}</span>
          {tx.marketplace && (
            <Badge variant="outline" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1 flex items-center gap-0.5">
              <Store className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              <span className="truncate max-w-[50px] sm:max-w-none">{tx.marketplace.name}</span>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Transaction Detail Dialog Content
function TxDetailDialogContent({ tx }: { tx: Transaction }) {
  const [editNominal, setEditNominal] = useState(false);
  const [nominal, setNominal] = useState(tx.nominal.toString());

  // Check if nominal can be edited (only pending and verification status)
  const canEditNominal = tx.status === 'pending' || tx.status === 'verification';

  // Calculate preview when nominal changes
  const previewCalc = useMemo(() => {
    if (!editNominal) return null;

    const newNominal = parseFloat(nominal);
    if (isNaN(newNominal) || newNominal <= 0) return null;

    const isOnline = tx.methodTransaction === 'Online';
    let feePercent = isOnline ? (tx.paymentType?.onlineFeePercent || 0) : (tx.paymentType?.codFeePercent || 0);
    const feeFlat = isOnline ? (tx.paymentType?.onlineFeeFlat || 0) : (tx.paymentType?.codFeeFlat || 0);
    const threshold = tx.paymentType?.threshold || 1000000;

    if (feePercent > 100) feePercent = feePercent / 1000;

    let paymentFee: number;
    if (newNominal >= threshold) {
      paymentFee = newNominal * (feePercent / 100);
    } else {
      paymentFee = feeFlat;
    }

    let platformFee = 0;
    if (tx.marketplace) {
      let mpFeePercent = tx.marketplace.feePercent || 0;
      const mpFeeFlat = tx.marketplace.feeFlat || 0;
      if (mpFeePercent > 100) mpFeePercent = mpFeePercent / 1000;
      platformFee = newNominal * (mpFeePercent / 100) + mpFeeFlat;
    }

    const netMargin = paymentFee - platformFee;
    const partnerRate = tx.partner?.commission || 0;
    const partnerProfit = netMargin * (partnerRate / 100);
    const ownerProfit = netMargin - partnerProfit;
    const totalReceived = newNominal - paymentFee;

    return { paymentFee, platformFee, netMargin, partnerProfit, ownerProfit, totalReceived };
  }, [editNominal, nominal, tx]);

  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  return (
    <div className="space-y-2.5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between -mx-4 -mt-4 mb-0 px-4 py-2.5 pr-12 bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
            <StatusIcon className={cn("w-4 h-4 text-white", tx.status === 'process' && "animate-spin")} />
          </div>
          <div>
            <p className="text-[9px] text-white/70 uppercase">Status</p>
            <p className="text-sm font-bold text-white capitalize">{tx.status}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/70">ID</p>
          <div className="flex items-center justify-end gap-1">
            <p className="text-[10px] font-mono text-white bg-white/20 px-1.5 py-0.5 rounded truncate max-w-[120px]">{tx.orderId}</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(tx.orderId);
                toast.success('Order ID disalin');
              }}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <Copy className="w-3 h-3 text-white/80" />
            </button>
          </div>
        </div>
      </div>

      {/* Amount & Profit Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-muted/30 p-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[9px] text-muted-foreground">Nominal</p>
            {canEditNominal ? (
              <button
                type="button"
                onClick={() => setEditNominal(!editNominal)}
                className={cn("p-1 rounded transition-colors", editNominal ? "bg-violet-100 text-violet-600" : "hover:bg-muted text-muted-foreground")}
                title={editNominal ? 'Batal edit' : 'Edit nominal'}
              >
                <Edit3 className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[8px] text-muted-foreground/60 flex items-center gap-0.5">
                <AlertCircle className="w-2.5 h-2.5" />
                Terkunci
              </span>
            )}
          </div>
          {editNominal && canEditNominal ? (
            <Input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              className="h-7 text-xs font-bold text-violet-600"
              placeholder="Masukkan nominal"
            />
          ) : (
            <p className="text-base font-bold text-violet-600">{formatCurrency(tx.nominal)}</p>
          )}
          {!canEditNominal && (
            <p className="text-[8px] text-amber-600 mt-0.5 flex items-center gap-0.5">
              <AlertCircle className="w-2 h-2" />
              Hanya bisa diubah saat pending/verifikasi
            </p>
          )}
          <div className="text-[9px] text-muted-foreground mt-1 space-y-0.5">
            <div className="flex justify-between">
              <span>Fee</span>
              <span className="text-red-500">-{formatCurrency(previewCalc?.paymentFee ?? tx.paymentFee)}</span>
            </div>
            {(previewCalc?.platformFee ?? tx.platformFee) > 0 && (
              <div className="flex justify-between">
                <span>Platform</span>
                <span className="text-red-500">-{formatCurrency(previewCalc?.platformFee ?? tx.platformFee)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-slate-900 p-2.5 text-white">
          <p className="text-[9px] text-white/70 mb-0.5">Profit Anda</p>
          <p className="text-base font-bold text-fuchsia-400">+{formatCurrency(previewCalc?.partnerProfit ?? tx.partnerProfit)}</p>
          {previewCalc && (
            <p className="text-[8px] text-fuchsia-300 mt-1">*Preview</p>
          )}
        </div>
      </div>

      {/* Customer & Payment Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-muted/30 p-2.5">
          <p className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
            <User className="w-2.5 h-2.5" /> Customer
          </p>
          <p className="text-xs font-semibold truncate">{tx.customer?.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-[9px] text-muted-foreground">{tx.customer?.phone}</p>
            <div className="flex items-center gap-0.5 ml-auto">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(tx.customer?.phone || '');
                  toast.success('No. WA disalin');
                }}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <Copy className="w-3 h-3 text-muted-foreground" />
              </button>
              <a
                href={`https://wa.me/${tx.customer?.phone?.replace(/^0/, '62')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
              >
                <MessageSquare className="w-3 h-3 text-green-600" />
              </a>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-2.5">
          <p className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1">
            <CreditCard className="w-2.5 h-2.5" /> Payment
          </p>
          <p className="text-xs font-semibold">{tx.paymentType?.name}</p>
          <p className="text-[9px] text-muted-foreground">{tx.methodTransaction}</p>
        </div>
      </div>

      {/* Bank Account */}
      {tx.customer?.bankName && tx.customer?.bankAccount && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 p-2.5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-muted-foreground">{tx.customer.bankName}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-mono font-bold">{tx.customer.bankAccount}</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tx.customer.bankAccount || '');
                    toast.success('Disalin');
                  }}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                >
                  <Copy className="w-3 h-3 text-blue-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {tx.notes && (
        <div className="rounded-lg border bg-muted/30 p-2.5">
          <p className="text-[9px] text-muted-foreground mb-1">Catatan</p>
          <p className="text-xs">{tx.notes}</p>
        </div>
      )}

      {/* Marketplace Info */}
      {tx.marketplace && (
        <div className="flex items-center justify-between text-[9px] p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-1">
            <Store className="w-3 h-3 text-orange-600" />
            <span className="text-orange-700 dark:text-orange-400">{tx.marketplace.name}</span>
          </div>
          <span className="text-red-600 font-medium">-{formatCurrency(tx.platformFee)}</span>
        </div>
      )}

      {/* Info */}
      <div className="text-center text-[10px] text-muted-foreground pt-2">
        <p>Transaksi ini dapat diedit oleh Owner</p>
        <p className="mt-1">Dibuat: {formatDate(tx.createdAt)}</p>
      </div>
    </div>
  );
}

// Transaction Detail Dialog Wrapper
function TxDetailDialog({ open, onOpenChange, tx }: { open: boolean; onOpenChange: (v: boolean) => void; tx: Transaction | null }) {
  if (!tx) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Detail Transaksi {tx.orderId}</DialogTitle>
        </DialogHeader>
        <TxDetailDialogContent key={tx.id} tx={tx} />
      </DialogContent>
    </Dialog>
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="container mx-auto px-3 py-4 space-y-3 pb-20">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-1.5">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-7 w-16 rounded-full" />)}
      </div>
      <Skeleton className="h-10 rounded-xl" />
      <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
    </div>
  );
}
