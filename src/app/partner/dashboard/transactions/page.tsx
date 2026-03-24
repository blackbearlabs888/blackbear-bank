'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SimplePagination } from '@/components/ui/pagination';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Loader2,
  User,
  CreditCard,
  Building2,
  Copy,
  Check,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  Share2,
  MessageSquare,
  Phone,
  Calendar,
  X,
  Bell,
  Info,
  ExternalLink,
  Calculator,
  Percent,
  TrendingDown,
  BarChart3,
  Store,
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatDate, formatDateAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Types
interface Customer {
  id: string;
  name: string;
  phone: string;
  label?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  city?: string;
}

interface PaymentType {
  id: string;
  name: string;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
}

interface Marketplace {
  id: string;
  name: string;
  feePercent: number;
  feeFlat: number;
}

interface Transaction {
  id: string;
  orderId: string;
  nominal: number;
  paymentFee: number;
  platformFee: number;
  netMargin: number;
  partnerProfit: number;
  ownerProfit: number;
  totalReceived: number;
  methodTransaction: string;
  status: string;
  notes?: string;
  transactionLink?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  paymentType: PaymentType;
  marketplace?: Marketplace;
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'verification', label: 'Verifikasi', icon: AlertCircle },
  { key: 'process', label: 'Proses', icon: Loader2 },
  { key: 'success', label: 'Berhasil', icon: CheckCircle },
];

export default function PartnerTransactionsPage() {
  const router = useRouter();
  const { user, partner, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const redirectAttempted = useRef(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !redirectAttempted.current) {
      redirectAttempted.current = true;
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.role === 'owner') {
        router.replace('/owner/dashboard');
      }
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  const fetchTransactions = async () => {
    if (!isAuthenticated || !hasHydrated || user?.role !== 'partner') return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/transactions?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setTransactions(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalItems(result.pagination.totalItems);
        }
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [isAuthenticated, hasHydrated, user, statusFilter, currentPage]);
  
  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'partner') {
        fetchTransactions();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, hasHydrated, user]);

  const filteredTransactions = transactions.filter((tx) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      tx.orderId.toLowerCase().includes(searchLower) ||
      tx.customer.name.toLowerCase().includes(searchLower) ||
      tx.customer.phone.includes(searchLower)
    );
  });

  const totalProfit = transactions.reduce((sum, tx) => sum + (tx.partnerProfit || 0), 0);
  const totalVolume = transactions.reduce((sum, tx) => sum + (tx.nominal || 0), 0);
  const pendingCount = transactions.filter(tx => tx.status === 'pending' || tx.status === 'verification').length;
  
  // Payment type segmentation - group by payment type name
  const paymentTypeMap = new Map<string, { count: number; volume: number }>();
  transactions.forEach(tx => {
    const name = tx.paymentType?.name || 'Unknown';
    const existing = paymentTypeMap.get(name) || { count: 0, volume: 0 };
    paymentTypeMap.set(name, {
      count: existing.count + 1,
      volume: existing.volume + tx.nominal,
    });
  });
  const paymentTypeSegments = Array.from(paymentTypeMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);
  
  // Status segmentation
  const statusCounts = {
    pending: transactions.filter(tx => tx.status === 'pending').length,
    verification: transactions.filter(tx => tx.status === 'verification').length,
    process: transactions.filter(tx => tx.status === 'process').length,
    success: transactions.filter(tx => tx.status === 'success').length,
    failed: transactions.filter(tx => tx.status === 'failed').length,
  };

  const openTransactionDetail = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setDetailOpen(true);
  };

  if (isLoading || !hasHydrated) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'partner') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Transaksi</h1>
          <p className="text-sm text-muted-foreground">Riwayat transaksi Anda</p>
        </div>
        <NewTransactionDialog onCreated={fetchTransactions} />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Komisi Anda</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(totalProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Volume</p>
                <p className="text-sm font-bold">{formatCurrency(totalVolume)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Trx</p>
                <p className="text-lg font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "glass-card",
          pendingCount > 0 && "ring-2 ring-amber-400 dark:ring-amber-600"
        )}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                pendingCount > 0 
                  ? "bg-amber-100 dark:bg-amber-900/30" 
                  : "bg-muted"
              )}>
                <Clock className={cn(
                  "w-5 h-5",
                  pendingCount > 0 ? "text-amber-600" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className={cn(
                  "text-lg font-bold",
                  pendingCount > 0 && "text-amber-600"
                )}>{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segmentation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Type Segmentation */}
        <Card className="glass-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Segmentasi Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {paymentTypeSegments.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {paymentTypeSegments.map((segment, index) => (
                    <PaymentTypeBadge 
                      key={segment.name}
                      label={segment.name} 
                      count={segment.count} 
                      index={index}
                    />
                  ))}
                </div>
                
                {/* Progress bar */}
                <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                  {paymentTypeSegments.map((segment, index) => (
                    <div 
                      key={segment.name}
                      className={cn("h-full", getPaymentTypeColor(index))}
                      style={{ width: `${(segment.count / transactions.length) * 100}%` }}
                    />
                  ))}
                </div>
                
                {/* Volume info */}
                <div className="mt-3 space-y-1.5">
                  {paymentTypeSegments.slice(0, 3).map((segment) => (
                    <div key={segment.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{segment.name}</span>
                      <span className="font-medium">{formatCompactCurrency(segment.volume)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada data transaksi
              </p>
            )}
          </CardContent>
        </Card>

        {/* Transaction Status Segmentation */}
        <Card className="glass-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Status Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <StatusBadge label="Pending" count={statusCounts.pending} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" icon={Clock} />
              <StatusBadge label="Verifikasi" count={statusCounts.verification} color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" icon={AlertCircle} />
              <StatusBadge label="Proses" count={statusCounts.process} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" icon={Loader2} />
              <StatusBadge label="Berhasil" count={statusCounts.success} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" icon={CheckCircle} />
              <StatusBadge label="Gagal" count={statusCounts.failed} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" icon={XCircle} />
            </div>
            
            {/* Progress bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-muted">
              {transactions.length > 0 && (
                <>
                  {statusCounts.pending > 0 && (
                    <div className="bg-amber-400 h-full" style={{ width: `${(statusCounts.pending / transactions.length) * 100}%` }} />
                  )}
                  {statusCounts.verification > 0 && (
                    <div className="bg-violet-400 h-full" style={{ width: `${(statusCounts.verification / transactions.length) * 100}%` }} />
                  )}
                  {statusCounts.process > 0 && (
                    <div className="bg-blue-400 h-full" style={{ width: `${(statusCounts.process / transactions.length) * 100}%` }} />
                  )}
                  {statusCounts.success > 0 && (
                    <div className="bg-green-400 h-full" style={{ width: `${(statusCounts.success / transactions.length) * 100}%` }} />
                  )}
                  {statusCounts.failed > 0 && (
                    <div className="bg-red-400 h-full" style={{ width: `${(statusCounts.failed / transactions.length) * 100}%` }} />
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari order ID, nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-11 rounded-xl">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verification">Verifikasi</SelectItem>
            <SelectItem value="process">Proses</SelectItem>
            <SelectItem value="success">Berhasil</SelectItem>
            <SelectItem value="failed">Gagal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => (
            <TransactionCard 
              key={tx.id} 
              transaction={tx} 
              onClick={() => openTransactionDetail(tx)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada transaksi ditemukan</p>
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

      {/* Transaction Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <TransactionDetailView 
              transaction={selectedTransaction}
              onClose={() => setDetailOpen(false)}
              onRefresh={fetchTransactions}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Payment Type Badge Component
function PaymentTypeBadge({ label, count, index }: { label: string; count: number; index: number }) {
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  ];
  
  return (
    <div className={cn('px-3 py-1.5 rounded-full flex items-center gap-2', colors[index % colors.length])}>
      <CreditCard className="w-3.5 h-3.5" />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-bold">{count}</span>
    </div>
  );
}

// Get payment type progress bar color
function getPaymentTypeColor(index: number): string {
  const colors = [
    'bg-blue-400',
    'bg-purple-400',
    'bg-teal-400',
    'bg-pink-400',
    'bg-orange-400',
    'bg-cyan-400',
  ];
  return colors[index % colors.length];
}

// Status Badge Component
function StatusBadge({ label, count, color, icon: Icon }: { label: string; count: number; color: string; icon: React.ElementType }) {
  return (
    <div className={cn('px-3 py-1.5 rounded-full flex items-center gap-2', color)}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-bold">{count}</span>
    </div>
  );
}

function TransactionCard({ transaction: tx, onClick }: { transaction: Transaction; onClick: () => void }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyOrderId = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderId);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success': 
        return { 
          label: 'Berhasil', 
          bg: 'bg-green-500',
          lightBg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-400',
          dot: 'bg-green-500',
          icon: CheckCircle,
        };
      case 'pending': 
        return { 
          label: 'Pending', 
          bg: 'bg-amber-500',
          lightBg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-700 dark:text-amber-400',
          dot: 'bg-amber-500',
          icon: Clock,
        };
      case 'process': 
        return { 
          label: 'Proses', 
          bg: 'bg-blue-500',
          lightBg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-400',
          dot: 'bg-blue-500',
          icon: Loader2,
        };
      case 'verification': 
        return { 
          label: 'Verifikasi', 
          bg: 'bg-violet-500',
          lightBg: 'bg-violet-100 dark:bg-violet-900/30',
          text: 'text-violet-700 dark:text-violet-400',
          dot: 'bg-violet-500',
          icon: AlertCircle,
        };
      case 'failed': 
        return { 
          label: 'Gagal', 
          bg: 'bg-red-500',
          lightBg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-400',
          dot: 'bg-red-500',
          icon: XCircle,
        };
      default: 
        return { 
          label: status, 
          bg: 'bg-gray-500',
          lightBg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-700 dark:text-gray-300',
          dot: 'bg-gray-500',
          icon: Clock,
        };
    }
  };

  const statusConfig = getStatusConfig(tx.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card 
      className="glass-card overflow-hidden tap-highlight active-scale cursor-pointer border-l-4"
      style={{ borderLeftColor: tx.status === 'success' ? '#22c55e' : tx.status === 'pending' ? '#f59e0b' : tx.status === 'process' ? '#3b82f6' : tx.status === 'verification' ? '#8b5cf6' : tx.status === 'failed' ? '#ef4444' : '#6b7280' }}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Mobile-Optimized Layout */}
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            statusConfig.lightBg
          )}>
            <StatusIcon className={cn(
              'w-5 h-5',
              statusConfig.text,
              (tx.status === 'process' || tx.status === 'verification') && 'animate-spin'
            )} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Row 1: Customer Name */}
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm truncate">{tx.customer.name}</p>
              <Badge className={cn('text-[10px] font-medium px-2 py-0.5', statusConfig.lightBg, statusConfig.text)}>
                {statusConfig.label}
              </Badge>
            </div>
            
            {/* Row 2: Order ID */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-muted-foreground">
                #{tx.orderId.slice(-8).toUpperCase()}
              </span>
              <button
                onClick={(e) => copyOrderId(tx.orderId, e)}
                className="p-0.5 rounded hover:bg-muted transition-colors"
              >
                {copiedId === tx.orderId ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            </div>
            
            {/* Row 3: Method & Time */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate">{tx.paymentType.name} • {tx.methodTransaction}</span>
              <span className="flex-shrink-0 ml-2">{formatDateAgo(tx.createdAt)}</span>
            </div>
            
            {/* Row 4: Nominal & Profit */}
            <div className="flex items-end justify-between pt-1.5 border-t border-dashed mt-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Nominal</p>
                <p className="text-sm font-bold">{formatCompactCurrency(tx.nominal)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Komisi</p>
                <p className="text-sm font-bold text-primary">+{formatCompactCurrency(tx.partnerProfit)}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionDetailView({ 
  transaction: tx, 
  onClose,
  onRefresh 
}: { 
  transaction: Transaction; 
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [sending, setSending] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const shareOrderId = () => {
    const text = `Order ID: ${tx.orderId}\nNominal: ${formatCurrency(tx.nominal)}\nStatus: ${tx.status}`;
    if (navigator.share) {
      navigator.share({
        title: `Order ${tx.orderId}`,
        text: text,
      });
    } else {
      copyToClipboard(text, 'share');
      toast({
        title: 'Disalin!',
        description: 'Detail order disalin ke clipboard',
      });
    }
  };

  const sendNotification = async () => {
    if (!notifyMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Pesan tidak boleh kosong',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: tx.id,
          message: notifyMessage,
          type: 'partner_notification',
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Berhasil!',
          description: 'Notifikasi berhasil dikirim ke Owner',
        });
        setNotifyOpen(false);
        setNotifyMessage('');
        onRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal mengirim notifikasi',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success': 
        return { 
          label: 'Berhasil', 
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-100 dark:bg-green-900/30',
          gradient: 'from-green-500 to-emerald-600',
          icon: CheckCircle 
        };
      case 'pending': 
        return { 
          label: 'Pending', 
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          gradient: 'from-amber-500 to-orange-600',
          icon: Clock 
        };
      case 'process': 
        return { 
          label: 'Proses', 
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          gradient: 'from-blue-500 to-cyan-600',
          icon: Loader2 
        };
      case 'verification': 
        return { 
          label: 'Verifikasi', 
          color: 'text-violet-600 dark:text-violet-400',
          bg: 'bg-violet-100 dark:bg-violet-900/30',
          gradient: 'from-violet-500 to-purple-600',
          icon: AlertCircle 
        };
      case 'failed': 
        return { 
          label: 'Gagal', 
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-100 dark:bg-red-900/30',
          gradient: 'from-red-500 to-rose-600',
          icon: XCircle 
        };
      default: 
        return { 
          label: status, 
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-100 dark:bg-gray-800',
          gradient: 'from-gray-500 to-gray-600',
          icon: Clock 
        };
    }
  };

  const getProgressPercent = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'verification': return 33;
      case 'process': return 66;
      case 'success': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  };

  const statusConfig = getStatusConfig(tx.status);
  const StatusIcon = statusConfig.icon;
  const currentStep = STATUS_STEPS.findIndex(s => s.key === tx.status);

  return (
    <div className="space-y-0">
      {/* Compact Header with Status */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 bg-gradient-to-r",
        statusConfig.gradient
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <StatusIcon className={cn("w-5 h-5 text-white", tx.status === 'process' && "animate-spin")} />
          </div>
          <div>
            <p className="text-[10px] text-white/70 uppercase tracking-wider">Order ID</p>
            <div className="flex items-center gap-1.5">
              <p className="font-mono text-sm font-bold text-white">{tx.orderId.slice(0, 12)}...</p>
              <button
                onClick={() => copyToClipboard(tx.orderId, 'orderId')}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                {copiedField === 'orderId' ? (
                  <Check className="w-3 h-3 text-white" />
                ) : (
                  <Copy className="w-3 h-3 text-white/70" />
                )}
              </button>
            </div>
          </div>
        </div>
        <Badge className={cn("px-3 py-1.5 text-xs font-semibold", statusConfig.bg, statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Progress Steps - Compact */}
      {tx.status !== 'failed' && (
        <div className="px-4 py-3 bg-muted/30 border-b">
          <div className="flex items-center justify-between mb-2">
            {STATUS_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentStep;
              const isCurrent = index === currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                    isActive 
                      ? "bg-primary text-white shadow-md shadow-primary/30" 
                      : "bg-muted text-muted-foreground",
                    isCurrent && "ring-2 ring-primary/50 ring-offset-1"
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", isCurrent && tx.status !== 'success' && "animate-spin")} />
                  </div>
                  <span className={cn(
                    "text-[9px] mt-1 font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={getProgressPercent(tx.status)} className="h-1.5" />
        </div>
      )}

      {/* Failed Status Banner */}
      {tx.status === 'failed' && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Transaksi Gagal</span>
          </div>
        </div>
      )}

      {/* Main Amount Card */}
      <div className="p-4">
        <div className="rounded-2xl overflow-hidden border shadow-sm">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Nominal</p>
                <p className="text-xl font-bold text-white">{formatCurrency(tx.nominal)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Komisi Anda</p>
                <p className="text-xl font-bold text-primary">+{formatCurrency(tx.partnerProfit)}</p>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Fee</span>
              <span className="text-red-500">-{formatCurrency(tx.paymentFee)}</span>
            </div>
            {tx.platformFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="text-red-500">-{formatCurrency(tx.platformFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-dashed">
              <span className="font-medium">Total Diterima</span>
              <span className="font-bold text-green-600">{formatCurrency(tx.totalReceived)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Payment - Compact Grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Customer</span>
          </div>
          <p className="font-semibold text-sm truncate">{tx.customer.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-xs text-muted-foreground">{tx.customer.phone}</p>
            <a 
              href={`https://wa.me/${tx.customer.phone.replace(/^0/, '62')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
            >
              <Phone className="w-3 h-3" />
            </a>
          </div>
          {tx.customer.city && (
            <p className="text-[10px] text-muted-foreground mt-1">{tx.customer.city}</p>
          )}
        </div>
        
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Pembayaran</span>
          </div>
          <p className="font-semibold text-sm">{tx.paymentType.name}</p>
          <p className="text-xs text-muted-foreground">{tx.methodTransaction}</p>
          {tx.marketplace && (
            <div className="flex items-center gap-1 mt-1.5">
              <Store className="w-3 h-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">{tx.marketplace.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes - Compact */}
      {tx.notes && (
        <div className="px-4 mt-3">
          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Catatan</span>
            </div>
            <p className="text-sm text-muted-foreground">{tx.notes}</p>
          </div>
        </div>
      )}

      {/* Transaction Link from Owner */}
      {tx.transactionLink && (
        <div className="px-4 mt-3">
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ExternalLink className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-[10px] font-medium text-violet-700 dark:text-violet-400 uppercase">Link Transaksi dari Owner</span>
            </div>
            <a
              href={tx.transactionLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30 transition-colors group"
            >
              <span className="text-xs text-muted-foreground truncate flex-1">{tx.transactionLink}</span>
              <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                <span className="text-[10px] font-medium">Buka</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>
          </div>
        </div>
      )}

      {/* Timestamp - Compact */}
      <div className="px-4 py-3 mt-3 border-t flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Dibuat {formatDateAgo(tx.createdAt)}</span>
        </div>
        <span>Update {formatDateAgo(tx.updatedAt)}</span>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 space-y-2">
        {(tx.status === 'pending' || tx.status === 'process' || tx.status === 'verification') && (
          <Button 
            variant="outline" 
            className="w-full h-10 rounded-xl border-dashed"
            onClick={() => setNotifyOpen(true)}
          >
            <Bell className="w-4 h-4 mr-2" />
            Kirim Notifikasi ke Owner
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={shareOrderId} className="h-10 rounded-xl">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button onClick={onClose} className="h-10 rounded-xl gradient-primary text-white">
            <Check className="w-4 h-4 mr-2" />
            Tutup
          </Button>
        </div>
      </div>

      {/* Notification Dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Kirim Notifikasi
            </DialogTitle>
            <DialogDescription>
              Kirim pesan ke Owner terkait transaksi ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-[10px] text-muted-foreground uppercase">Order ID</p>
              <p className="font-mono font-bold">{tx.orderId}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Pesan</Label>
              <Textarea
                placeholder="Contoh: Mohon untuk segera diproses..."
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                rows={3}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setNotifyOpen(false)} 
                className="flex-1 h-10 rounded-xl"
              >
                Batal
              </Button>
              <Button 
                className="flex-1 h-10 rounded-xl gradient-primary text-white"
                onClick={sendNotification}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Kirim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Bank list for dropdown
const BANK_LIST = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon',
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

// New Transaction Dialog with Calculation Simulation
function NewTransactionDialog({ onCreated }: { onCreated: () => void }) {
  const { partner } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [customBankName, setCustomBankName] = useState('');
  const [newCustomer, setNewCustomer] = useState({ 
    name: '', 
    phone: '', 
    bankName: '', 
    bankAccount: '', 
    bankHolder: '',
    city: ''
  });

  const [formData, setFormData] = useState({
    customerId: '',
    nominal: '',
    paymentTypeId: '',
    methodTransaction: 'Online',
    notes: '',
  });

  // Get selected payment type for calculation
  const selectedPaymentType = useMemo(() => {
    return paymentTypes.find(pt => pt.id === formData.paymentTypeId);
  }, [paymentTypes, formData.paymentTypeId]);

  // Calculate simulation
  const simulation = useMemo(() => {
    const nominal = parseFloat(formData.nominal) || 0;
    const method = formData.methodTransaction as 'Online' | 'COD';
    const commission = partner?.commission || 30;

    if (!selectedPaymentType || nominal <= 0) {
      return null;
    }

    // Calculate payment fee
    let feePercent = method === 'Online' 
      ? selectedPaymentType.onlineFeePercent 
      : selectedPaymentType.codFeePercent;
    const feeFlat = method === 'Online' 
      ? selectedPaymentType.onlineFeeFlat 
      : selectedPaymentType.codFeeFlat;

    // Safety: if feePercent > 100, normalize it (database precision issue fix)
    if (feePercent > 100) {
      feePercent = feePercent / 1000;
    }

    let paymentFee: number;
    if (nominal >= selectedPaymentType.threshold) {
      paymentFee = nominal * (feePercent / 100);
    } else {
      paymentFee = feeFlat;
    }

    // For partner, platform fee is 0 (owner absorbs it)
    const platformFee = 0;
    
    // Net margin = payment fee - platform fee
    const netMargin = paymentFee - platformFee;
    
    // Partner profit = net margin * commission%
    const partnerProfit = netMargin * (commission / 100);
    
    // Owner profit = net margin - partner profit
    const ownerProfit = netMargin - partnerProfit;
    
    // Total received by customer
    const totalReceived = nominal - paymentFee;

    return {
      paymentFee,
      platformFee,
      netMargin,
      partnerProfit,
      ownerProfit,
      totalReceived,
      feePercent,
      commission,
    };
  }, [formData.nominal, formData.methodTransaction, selectedPaymentType, partner?.commission]);

  useEffect(() => {
    if (open) {
      fetchPaymentTypes();
    }
  }, [open]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchCustomer.length >= 2) {
        searchCustomers();
      } else {
        setCustomers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchCustomer]);

  const fetchPaymentTypes = async () => {
    const res = await fetch('/api/payment-types?activeOnly=true');
    const data = await res.json();
    if (data.success) setPaymentTypes(data.data);
  };

  const searchCustomers = async () => {
    setSearching(true);
    try {
      // Search ALL customers in database
      const res = await fetch(`/api/customers?search=${encodeURIComponent(searchCustomer)}&all=true&limit=30`);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({ ...prev, customerId: customer.id }));
    setSearchCustomer('');
    setCustomers([]);
    setNewCustomerMode(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setFormData((prev) => ({ ...prev, customerId: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let customerId = formData.customerId;

      if (newCustomerMode && newCustomer.name && newCustomer.phone) {
        // Handle bank name: use customBankName if "Lainnya" is selected
        const bankNameToSubmit = newCustomer.bankName === 'Lainnya' ? customBankName : newCustomer.bankName;
        
        const customerRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCustomer.name,
            phone: newCustomer.phone,
            bankName: bankNameToSubmit || null,
            bankAccount: newCustomer.bankAccount || null,
            bankHolder: newCustomer.bankHolder || null,
            city: newCustomer.city || null,
          }),
        });
        const customerData = await customerRes.json();
        if (customerData.success) {
          customerId = customerData.data.id;
        } else {
          throw new Error(customerData.error || 'Gagal membuat customer');
        }
      }

      if (!customerId) {
        throw new Error('Customer wajib dipilih');
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          nominal: parseFloat(formData.nominal),
          paymentTypeId: formData.paymentTypeId,
          methodTransaction: formData.methodTransaction,
          notes: formData.notes || null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        // Reset form
        setSelectedCustomer(null);
        setNewCustomerMode(false);
        setCustomBankName('');
        setNewCustomer({ name: '', phone: '', bankName: '', bankAccount: '', bankHolder: '', city: '' });
        setFormData({
          customerId: '',
          nominal: '',
          paymentTypeId: '',
          methodTransaction: 'Online',
          notes: '',
        });
      } else {
        throw new Error(result.error || 'Gagal membuat transaksi');
      }
    } catch (err) {
      console.error('Failed to create transaction:', err);
      alert(err instanceof Error ? err.message : 'Gagal membuat transaksi');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (newCustomerMode) {
      return newCustomer.name && newCustomer.phone && formData.nominal && formData.paymentTypeId;
    }
    return formData.customerId && formData.nominal && formData.paymentTypeId;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-white rounded-xl h-10 px-4">
          <Plus className="w-4 h-4 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Plus className="w-5 h-5 text-primary" />
            Transaksi Baru
          </DialogTitle>
          <DialogDescription>
            Status default: Pending (akan diproses oleh Owner)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Grid: Form left, Simulation right on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Form */}
            <div className="space-y-4">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Customer</Label>
                {selectedCustomer ? (
                  <div className="p-3 bg-muted rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedCustomer.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearCustomer}
                      >
                        Ganti
                      </Button>
                    </div>
                    {(selectedCustomer.bankName || selectedCustomer.bankAccount) && (
                      <div className="pt-2 border-t text-xs space-y-1">
                        {selectedCustomer.bankName && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bank</span>
                            <span className="font-medium">{selectedCustomer.bankName}</span>
                          </div>
                        )}
                        {selectedCustomer.bankAccount && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rekening</span>
                            <span className="font-mono font-medium">{selectedCustomer.bankAccount}</span>
                          </div>
                        )}
                        {selectedCustomer.bankHolder && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Atas Nama</span>
                            <span className="font-medium">{selectedCustomer.bankHolder}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Mode Toggle */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={!newCustomerMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewCustomerMode(false)}
                        className={cn(
                          "rounded-xl h-10",
                          !newCustomerMode && "gradient-primary text-white"
                        )}
                      >
                        <Search className="w-4 h-4 mr-1.5" />
                        Cari Customer
                      </Button>
                      <Button
                        type="button"
                        variant={newCustomerMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewCustomerMode(true)}
                        className={cn(
                          "rounded-xl h-10",
                          newCustomerMode && "gradient-primary text-white"
                        )}
                      >
                        <User className="w-4 h-4 mr-1.5" />
                        Customer Baru
                      </Button>
                    </div>

                    {!newCustomerMode ? (
                      /* Search Existing Customer */
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Cari nama atau no. HP..."
                          value={searchCustomer}
                          onChange={(e) => setSearchCustomer(e.target.value)}
                          className="pl-10 h-11 rounded-xl"
                        />
                        {searching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    ) : (
                      /* New Customer Form */
                      <div className="space-y-3 p-3 border rounded-xl bg-muted/30">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nama *</Label>
                            <Input
                              placeholder="Nama lengkap"
                              value={newCustomer.name}
                              onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                              className="h-10 rounded-lg"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">No. WA *</Label>
                            <Input
                              placeholder="08xxxxxxxxxx"
                              value={newCustomer.phone}
                              onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                              className="h-10 rounded-lg"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nama Bank</Label>
                            <Select
                              value={newCustomer.bankName}
                              onValueChange={(value) => {
                                setNewCustomer(prev => ({ ...prev, bankName: value }));
                                if (value !== 'Lainnya') {
                                  setCustomBankName('');
                                }
                              }}
                            >
                              <SelectTrigger className="h-10 rounded-lg">
                                <SelectValue placeholder="Pilih Bank" />
                              </SelectTrigger>
                              <SelectContent>
                                {BANK_LIST.map((bank) => (
                                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">No. Rekening</Label>
                            <Input
                              placeholder="123456789"
                              value={newCustomer.bankAccount}
                              onChange={(e) => setNewCustomer(prev => ({ ...prev, bankAccount: e.target.value }))}
                              className="h-10 rounded-lg"
                            />
                          </div>
                        </div>
                        {newCustomer.bankName === 'Lainnya' && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nama Bank Lainnya</Label>
                            <Input
                              placeholder="Ketik nama bank"
                              value={customBankName}
                              onChange={(e) => setCustomBankName(e.target.value)}
                              className="h-10 rounded-lg"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Atas Nama</Label>
                            <Input
                              placeholder="Nama di rekening"
                              value={newCustomer.bankHolder}
                              onChange={(e) => setNewCustomer(prev => ({ ...prev, bankHolder: e.target.value }))}
                              className="h-10 rounded-lg"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Kota</Label>
                            <Input
                              placeholder="Jakarta"
                              value={newCustomer.city}
                              onChange={(e) => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                              className="h-10 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Customer Search Results */}
                    {!newCustomerMode && customers.length > 0 && (
                      <div className="border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        {customers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 tap-highlight"
                            onClick={() => selectCustomer(customer)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">{customer.phone}</p>
                              </div>
                              {customer.bankName && (
                                <Badge variant="outline" className="text-xs">
                                  {customer.bankName}
                                </Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Transaction Details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Nominal *</Label>
                    <Input
                      type="number"
                      placeholder="1000000"
                      value={formData.nominal}
                      onChange={(e) => setFormData(prev => ({ ...prev, nominal: e.target.value }))}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Tipe Pembayaran *</Label>
                    <Select
                      value={formData.paymentTypeId}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, paymentTypeId: v }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Pilih tipe" />
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
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Metode Transaksi</Label>
                  <Select
                    value={formData.methodTransaction}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, methodTransaction: v }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="COD">COD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Catatan</Label>
                  <Textarea
                    placeholder="Catatan tambahan (opsional)"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="rounded-xl resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Simulation Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Simulasi Perhitungan</Label>
              </div>
              
              {simulation ? (
                <Card className="glass-card overflow-hidden">
                  <div className="h-1 gradient-primary" />
                  <CardContent className="p-4 space-y-3">
                    {/* Nominal */}
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground">Nominal</span>
                      <span className="text-lg font-bold">{formatCurrency(parseFloat(formData.nominal) || 0)}</span>
                    </div>

                    {/* Fee Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                          <span>Payment Fee</span>
                          <span className="text-xs">({simulation.feePercent}%)</span>
                        </div>
                        <span className="font-medium text-red-600">-{formatCurrency(simulation.paymentFee)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Net Margin</span>
                        <span className="font-medium">{formatCurrency(simulation.netMargin)}</span>
                      </div>
                    </div>

                    {/* Commission Split */}
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-primary" />
                          <span className="text-sm">Komisi Anda</span>
                          <Badge variant="outline" className="text-xs">{simulation.commission}%</Badge>
                        </div>
                        <span className="text-lg font-bold text-primary">+{formatCurrency(simulation.partnerProfit)}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Profit Owner</span>
                        <span className="font-medium">{formatCurrency(simulation.ownerProfit)}</span>
                      </div>
                    </div>

                    {/* Total Received */}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Diterima Customer</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrency(simulation.totalReceived)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Calculator className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Masukkan nominal dan pilih tipe pembayaran untuk melihat simulasi</p>
                  </CardContent>
                </Card>
              )}

              {/* Fee Info */}
              {selectedPaymentType && (
                <div className="p-3 bg-muted/50 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1 font-medium text-foreground">
                    <Info className="w-3.5 h-3.5" />
                    <span>Info Fee {selectedPaymentType.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                    <span>Online: {selectedPaymentType.onlineFeePercent}% / {formatCurrency(selectedPaymentType.onlineFeeFlat)}</span>
                    <span>COD: {selectedPaymentType.codFeePercent}% / {formatCurrency(selectedPaymentType.codFeeFlat)}</span>
                  </div>
                  <p className="text-muted-foreground">Threshold: {formatCurrency(selectedPaymentType.threshold)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl h-11"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-primary text-white rounded-xl h-11"
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Buat Transaksi
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
