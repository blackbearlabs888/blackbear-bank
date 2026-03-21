'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { SimplePagination } from '@/components/ui/pagination';
import {
  Plus, Search, Loader2, ChevronRight, ArrowUp, ArrowDown, Target,
  Percent, AlertCircle, X, Check, User, Clock, Hash, Trash2, Edit3,
  Calculator, TrendingUp, TrendingDown, Wallet, CreditCard, Info,
  CheckCircle, XCircle, ChevronLeft, ChevronRight as ChevronRightIcon,
  RefreshCw, Eye, Zap, Filter, Calendar, ArrowRightLeft, Sparkles,
  Store, DollarSign, PiggyBank, Building2, ArrowRight, MinusCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AnalyticsData {
  forecast: {
    currentMonthProfit: number;
    avgDailyProfit: number;
    projectedProfit: number;
    daysRemaining: number;
    profitChange: number;
  };
  feeAnalysis: {
    avgPaymentFee: number;
    avgPlatformFee: number;
    avgMarginPercent: number;
  };
  statusCounts: Record<string, number>;
  paymentTypes: Array<{ id: string; name: string; transactionCount: number; totalVolume: number; }>;
}

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
  createdAt: string;
  customer: { id: string; name: string; phone: string; city?: string; };
  paymentType: { id: string; name: string; };
  marketplace?: { id: string; name: string; feePercent: number; isActive?: boolean; } | null;
  partner?: { id: string; name: string; tier: string; commission?: number; } | null;
}

interface PaymentType { id: string; name: string; onlineFeePercent: number; onlineFeeFlat: number; codFeePercent: number; codFeeFlat: number; isActive: boolean; }
interface Partner { id: string; name: string; commission: number; tier: string; status: string; }
interface Customer { id: string; name: string; phone: string; city?: string; totalTransactions: number; }
interface Marketplace { id: string; name: string; feePercent: number; feeFlat?: number; isActive: boolean; }

const STATUS_CONFIG = {
  pending: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock, iconColor: 'text-orange-600', gradient: 'from-orange-500 to-amber-600' },
  verification: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle, iconColor: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
  process: { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Loader2, iconColor: 'text-cyan-600', gradient: 'from-cyan-500 to-teal-600' },
  success: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: ArrowUp, iconColor: 'text-green-600', gradient: 'from-green-500 to-emerald-600' },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: ArrowDown, iconColor: 'text-red-600', gradient: 'from-red-500 to-rose-600' },
};

export default function OwnerTransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newTxOpen, setNewTxOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { if (!hasHydrated) hydrate(); }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading) {
      if (!isAuthenticated) router.replace('/login');
      else if (user?.role !== 'owner') router.replace('/partner/dashboard');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchTransactions();
      fetchAnalytics();
    }
  }, [isAuthenticated, hasHydrated, user, activeTab, currentPage]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => {
        fetchTransactions(true);
        fetchAnalytics();
      }, 30000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, hasHydrated, user, activeTab, currentPage]);
  
  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

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

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/transactions/analytics');
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch (e) { console.error(e); }
    finally { setAnalyticsLoading(false); }
  };

  const updateStatus = async (id: string, status: string, notes?: string, marketplaceId?: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, marketplaceId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status diubah ke ${status}`);
        fetchTransactions();
        fetchAnalytics();
        setDetailOpen(false);
        setSelectedTransaction(null);
      } else toast.error(data.error || 'Gagal');
    } catch (e) { toast.error('Gagal'); }
    finally { setUpdatingStatus(false); }
  };

  const deleteTx = async (id: string) => {
    if (!confirm('Yakin hapus transaksi ini?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Terhapus');
        fetchTransactions();
        fetchAnalytics();
        setDetailOpen(false);
      } else toast.error(data.error || 'Gagal');
    } catch (e) { toast.error('Gagal'); }
  };

  const filtered = useMemo(() => transactions.filter(tx => {
    const q = searchQuery.toLowerCase();
    return tx.orderId?.toLowerCase().includes(q) || tx.customer?.name?.toLowerCase().includes(q) || tx.customer?.phone?.includes(q);
  }), [transactions, searchQuery]);

  if (isLoading || !hasHydrated) return <LoadingState />;
  if (!isAuthenticated || user?.role !== 'owner') return null;

  return (
    <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3 pb-20 md:pb-4">
      {/* Header with Last Updated */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Transaksi
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">Kelola semua transaksi</p>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {isRefreshing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
                <span>{isRefreshing ? 'Refreshing...' : formatTimeAgo(lastUpdated)}</span>
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => setNewTxOpen(true)} size="sm" className="gradient-primary text-white rounded-lg h-9 px-3 shadow-md">
          <Plus className="w-4 h-4 mr-1" /> Baru
        </Button>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          title="Proyeksi Bulan Ini"
          value={analytics?.forecast.projectedProfit || 0}
          change={analytics?.forecast.profitChange || 0}
          loading={analyticsLoading}
          icon={<Target className="w-4 h-4" />}
          gradient="from-emerald-500 to-teal-600"
        />
        <StatCard
          title="Net Margin"
          value={`${(analytics?.feeAnalysis.avgMarginPercent || 0).toFixed(2)}%`}
          isPercent
          loading={analyticsLoading}
          icon={<Percent className="w-4 h-4" />}
          gradient="from-amber-500 to-orange-600"
        />
        <StatCard
          title="Pending"
          value={analytics?.statusCounts.pending || 0}
          isCount
          loading={analyticsLoading}
          icon={<Clock className="w-4 h-4" />}
          gradient="from-orange-500 to-amber-600"
          highlight={analytics?.statusCounts.pending ? analytics.statusCounts.pending > 0 : false}
        />
        <StatCard
          title="Verifikasi"
          value={analytics?.statusCounts.verification || 0}
          isCount
          loading={analyticsLoading}
          icon={<AlertCircle className="w-4 h-4" />}
          gradient="from-blue-500 to-indigo-600"
          highlight={analytics?.statusCounts.verification ? analytics.statusCounts.verification > 0 : false}
        />
      </div>

      {/* Payment Type Quick Stats */}
      {analytics && analytics.paymentTypes.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
              <span className="text-xs text-muted-foreground flex-shrink-0">Payment:</span>
              {analytics.paymentTypes.slice(0, 6).map((pt) => (
                <div key={pt.id} className="flex-shrink-0 px-3 py-1.5 bg-muted/50 rounded-full text-xs flex items-center gap-1.5">
                  <span className="font-medium">{pt.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1 h-4">{pt.transactionCount}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari order ID, nama, no. WA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-auto flex-wrap gap-1 bg-transparent p-0">
            {[
              { value: 'all', label: 'Semua' },
              { value: 'pending', label: 'Pending', count: analytics?.statusCounts.pending },
              { value: 'verification', label: 'Verifikasi', count: analytics?.statusCounts.verification },
              { value: 'process', label: 'Proses', count: analytics?.statusCounts.process },
              { value: 'success', label: 'Berhasil', count: analytics?.statusCounts.success },
              { value: 'failed', label: 'Gagal', count: analytics?.statusCounts.failed },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-md h-7 transition-all",
                  activeTab === tab.value && tab.value === 'pending' && "bg-orange-100 text-orange-700",
                  activeTab === tab.value && tab.value === 'verification' && "bg-blue-100 text-blue-700",
                  activeTab === tab.value && tab.value === 'process' && "bg-cyan-100 text-cyan-700",
                  activeTab === tab.value && tab.value === 'success' && "bg-green-100 text-green-700",
                  activeTab === tab.value && tab.value === 'failed' && "bg-red-100 text-red-700"
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge className="ml-1 h-4 px-1 text-[9px]">{tab.count}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : filtered.length > 0 ? (
          filtered.map(tx => (
            <TxCard key={tx.id} tx={tx} onClick={() => { setSelectedTransaction(tx); setDetailOpen(true); }} />
          ))
        ) : (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Tidak ada transaksi</p>
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

      {/* Dialogs */}
      <NewTxDialog open={newTxOpen} onOpenChange={setNewTxOpen} onCreated={() => { fetchTransactions(); fetchAnalytics(); }} />
      <TxDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        tx={selectedTransaction}
        onUpdate={updateStatus}
        onDelete={deleteTx}
        updating={updatingStatus}
      />
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, change, isPercent, isCount, loading, icon, gradient, highlight }: {
  title: string;
  value: number | string;
  change?: number;
  isPercent?: boolean;
  isCount?: boolean;
  loading?: boolean;
  icon: React.ReactNode;
  gradient: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn("glass-card overflow-hidden", highlight && "ring-2 ring-amber-400/50")}>
      <div className={cn("h-0.5 bg-gradient-to-r", gradient)} />
      <CardContent className="p-2.5">
        {loading ? (
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">{title}</p>
            <div className="flex items-end justify-between">
              <p className="text-sm sm:text-base font-bold">
                {isCount ? value : isPercent ? value : formatCurrency(value as number)}
              </p>
              <div className={cn("w-6 h-6 rounded bg-gradient-to-br flex items-center justify-center text-white", gradient)}>
                {icon}
              </div>
            </div>
            {change !== undefined && (
              <div className={cn("text-[10px] flex items-center gap-0.5", change >= 0 ? 'text-green-600' : 'text-red-600')}>
                {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Transaction Card
function TxCard({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Card className="glass-card overflow-hidden active-scale cursor-pointer hover:shadow-md transition-all tap-highlight" onClick={onClick}>
      <CardContent className="p-0">
        <div className="flex items-center gap-2.5 p-2.5">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br", config.gradient)}>
            <Icon className={cn("w-5 h-5 text-white", tx.status === 'process' && "animate-spin")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="font-mono text-[10px] text-muted-foreground truncate">{tx.orderId}</p>
              <Badge className={cn("text-[9px] capitalize", config.color)}>{tx.status}</Badge>
            </div>
            <p className="text-xs font-medium truncate">{tx.customer?.name}</p>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <p className="text-[10px] text-muted-foreground">{tx.paymentType?.name} • {tx.methodTransaction}</p>
              <p className="text-xs font-bold text-primary">+{formatCurrency(tx.ownerProfit)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30 border-t text-[10px]">
          <span className="text-muted-foreground">{formatCurrency(tx.nominal)} • {formatDate(tx.createdAt)}</span>
          <div className="flex items-center gap-1">
            {tx.marketplace && (
              <Badge variant="outline" className="text-[9px] h-4 flex items-center gap-1">
                <Store className="w-2.5 h-2.5" />
                {tx.marketplace.name}
              </Badge>
            )}
            {tx.partner && <Badge variant="secondary" className="text-[9px] h-4">{tx.partner.name}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="container mx-auto px-3 py-4 space-y-3 pb-20">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <Skeleton className="h-10 rounded-lg" />
      <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
    </div>
  );
}

// New Transaction Dialog
function NewTxDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchCust, setSearchCust] = useState('');
  const [searchPartner, setSearchPartner] = useState('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isNewCust, setIsNewCust] = useState(false);
  const [showPartner, setShowPartner] = useState(false);

  const [form, setForm] = useState({
    customerId: '', customerName: '', customerPhone: '', customerCity: '',
    nominal: '', paymentTypeId: '', methodTransaction: 'Online', marketplaceId: '', partnerId: '',
  });

  // Real-time calculation
  const calc = useMemo(() => {
    const nominal = parseFloat(form.nominal) || 0;
    if (!nominal || !form.paymentTypeId) return null;
    const pt = paymentTypes.find(p => p.id === form.paymentTypeId);
    if (!pt) return null;

    const feePercent = form.methodTransaction === 'Online' ? pt.onlineFeePercent : pt.codFeePercent;
    const feeFlat = form.methodTransaction === 'Online' ? pt.onlineFeeFlat : pt.codFeeFlat;
    const paymentFee = (nominal * feePercent / 100) + feeFlat;

    let platformFee = 0;
    let selectedMp: Marketplace | null = null;
    if (form.marketplaceId && form.marketplaceId !== 'none') {
      const mp = marketplaces.find(m => m.id === form.marketplaceId);
      if (mp) {
        platformFee = nominal * mp.feePercent / 100 + (mp.feeFlat || 0);
        selectedMp = mp;
      }
    }

    const netMargin = paymentFee - platformFee;
    const partnerRate = selectedPartner?.commission || 0;
    const partnerProfit = netMargin * partnerRate / 100;
    const ownerProfit = netMargin - partnerProfit;
    const totalReceived = nominal - paymentFee;

    return { paymentFee, platformFee, netMargin, partnerProfit, ownerProfit, totalReceived, feePercent, selectedMp };
  }, [form, paymentTypes, marketplaces, selectedPartner]);

  useEffect(() => { if (open) { fetchPT(); fetchMP(); fetchP(); } }, [open]);
  useEffect(() => { if (searchCust.length >= 2 && !isNewCust) searchC(); }, [searchCust, isNewCust]);

  const fetchPT = async () => { const res = await fetch('/api/payment-types?all=true'); const d = await res.json(); if (d.success) setPaymentTypes(d.data.filter((p: PaymentType) => p.isActive)); };
  const fetchMP = async () => { const res = await fetch('/api/marketplaces'); const d = await res.json(); if (d.success) setMarketplaces(d.data); };
  const fetchP = async () => { const res = await fetch('/api/partners'); const d = await res.json(); if (d.success) setPartners(d.data.filter((p: Partner) => p.status === 'active')); };
  const searchC = async () => { const res = await fetch(`/api/customers?search=${searchCust}`); const d = await res.json(); if (d.success) setCustomers(d.data); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nominal: parseFloat(form.nominal), marketplaceId: form.marketplaceId === 'none' ? null : form.marketplaceId || null, partnerId: form.partnerId || null, isNewCustomer: isNewCust }),
      });
      const d = await res.json();
      if (d.success) {
        onOpenChange(false);
        onCreated();
        setSelectedCust(null);
        setSelectedPartner(null);
        setIsNewCust(false);
        setShowPartner(false);
        setForm({ customerId: '', customerName: '', customerPhone: '', customerCity: '', nominal: '', paymentTypeId: '', methodTransaction: 'Online', marketplaceId: '', partnerId: '' });
        toast.success('Transaksi dibuat (Status: Process)');
      } else toast.error(d.error || 'Gagal');
    } catch (e) { toast.error('Gagal'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Transaksi Baru
          </DialogTitle>
          <DialogDescription className="text-xs">Buat transaksi dengan kalkulasi real-time</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {/* Customer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Customer</Label>
              <div className="flex gap-1">
                <Button type="button" variant={!isNewCust ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] px-2" onClick={() => { setIsNewCust(false); setSelectedCust(null); }}>Existing</Button>
                <Button type="button" variant={isNewCust ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] px-2" onClick={() => { setIsNewCust(true); setSelectedCust(null); }}>Baru</Button>
              </div>
            </div>
            {isNewCust ? (
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Nama" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} required className="h-8 text-xs" />
                <Input placeholder="WA" value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} required className="h-8 text-xs" />
                <Input placeholder="Kota" value={form.customerCity} onChange={e => setForm(p => ({ ...p, customerCity: e.target.value }))} className="h-8 text-xs" />
              </div>
            ) : selectedCust ? (
              <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <div>
                  <p className="text-xs font-medium">{selectedCust.name}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedCust.phone}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setSelectedCust(null); setForm(p => ({ ...p, customerId: '' })); }}>Ganti</Button>
              </div>
            ) : (
              <div className="relative">
                <Input placeholder="Cari nama/WA..." value={searchCust} onChange={e => setSearchCust(e.target.value)} className="h-8 text-xs" />
                {customers.length > 0 && searchCust && (
                  <div className="absolute top-full left-0 right-0 bg-background border rounded-lg shadow-lg z-10 mt-1 max-h-32 overflow-y-auto">
                    {customers.map(c => (
                      <button key={c.id} type="button" className="w-full text-left p-2 hover:bg-muted text-xs" onClick={() => { setSelectedCust(c); setForm(p => ({ ...p, customerId: c.id })); setSearchCust(''); setCustomers([]); }}>
                        {c.name} <span className="text-muted-foreground">({c.phone})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Nominal & Payment */}
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px]">Nominal</Label><Input type="number" value={form.nominal} onChange={e => setForm(p => ({ ...p, nominal: e.target.value }))} required className="h-8 text-xs" /></div>
            <div><Label className="text-[10px]">Payment Type</Label><Select value={form.paymentTypeId} onValueChange={v => setForm(p => ({ ...p, paymentTypeId: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{paymentTypes.map(pt => <SelectItem key={pt.id} value={pt.id} className="text-xs">{pt.name}</SelectItem>)}</SelectContent></Select></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px]">Metode</Label><Select value={form.methodTransaction} onValueChange={v => setForm(p => ({ ...p, methodTransaction: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Online">Online</SelectItem><SelectItem value="COD">COD</SelectItem></SelectContent></Select></div>
            <div>
              <Label className="text-[10px]">Marketplace</Label>
              <Select value={form.marketplaceId} onValueChange={v => setForm(p => ({ ...p, marketplaceId: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tanpa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa</SelectItem>
                  {marketplaces.map(mp => (
                    <SelectItem key={mp.id} value={mp.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span>{mp.name}</span>
                        <Badge variant="outline" className="text-[9px] h-4">{mp.feePercent}%</Badge>
                        {!mp.isActive && <Badge variant="destructive" className="text-[9px] h-4">Inactive</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Partner */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Partner (Opsional)</Label>
            <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => { setShowPartner(!showPartner); if (showPartner) { setSelectedPartner(null); setForm(p => ({ ...p, partnerId: '' })); } }}>{showPartner ? 'Hapus' : '+ Tambah'}</Button>
          </div>
          {showPartner && (
            selectedPartner ? (
              <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <div><p className="text-xs font-medium">{selectedPartner.name}</p><p className="text-[10px] text-muted-foreground">Komisi: {selectedPartner.commission}%</p></div>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setSelectedPartner(null); setForm(p => ({ ...p, partnerId: '' })); }}>Ganti</Button>
              </div>
            ) : (
              <div className="relative">
                <Input placeholder="Cari partner..." value={searchPartner} onChange={e => setSearchPartner(e.target.value)} className="h-8 text-xs" />
                {searchPartner.length >= 1 && (
                  <div className="absolute top-full left-0 right-0 bg-background border rounded-lg shadow-lg z-10 mt-1 max-h-32 overflow-y-auto">
                    {partners.filter(p => p.name.toLowerCase().includes(searchPartner.toLowerCase())).map(p => (
                      <button key={p.id} type="button" className="w-full text-left p-2 hover:bg-muted text-xs" onClick={() => { setSelectedPartner(p); setForm(pr => ({ ...pr, partnerId: p.id })); setSearchPartner(''); }}>
                        {p.name} <span className="text-muted-foreground">({p.commission}%)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* Calculation */}
          {calc && form.nominal && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary">
                  <Calculator className="w-3 h-3" /> Kalkulasi Real-time
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nominal:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(form.nominal))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee ({calc.feePercent}%):</span>
                    <span className="text-red-600">-{formatCurrency(calc.paymentFee)}</span>
                  </div>
                </div>
                
                {calc.platformFee > 0 && calc.selectedMp && (
                  <div className="flex items-center justify-between text-[10px] p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-1">
                      <Store className="w-3 h-3 text-orange-600" />
                      <span className="text-orange-700 dark:text-orange-400">{calc.selectedMp.name}</span>
                      <Badge variant="outline" className="text-[9px] h-3.5">{calc.selectedMp.feePercent}%</Badge>
                    </div>
                    <span className="text-red-600 font-medium">-{formatCurrency(calc.platformFee)}</span>
                  </div>
                )}
                
                <Separator className="my-1" />
                
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Diterima Customer:</span>
                  <span className="font-bold text-primary">{formatCurrency(calc.totalReceived)}</span>
                </div>
                
                <div className="flex justify-between text-xs p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-1">
                    <PiggyBank className="w-3.5 h-3.5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">Profit Anda:</span>
                  </div>
                  <span className="font-bold text-green-600">+{formatCurrency(calc.ownerProfit)}</span>
                </div>
                
                {selectedPartner && calc.partnerProfit > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Profit Partner ({selectedPartner.name}):</span>
                    <span className="text-blue-600">+{formatCurrency(calc.partnerProfit)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="submit" className="w-full gradient-primary text-white h-9" disabled={loading || (!isNewCust && !selectedCust) || !form.nominal || !form.paymentTypeId}>
              {loading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Proses...</> : <><Check className="w-3 h-3 mr-1" /> Buat (Process)</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Transaction Detail Dialog Content (uses key pattern for reset)
function TxDetailDialogContent({ tx, onUpdate, onDelete, updating }: { tx: Transaction; onUpdate: (id: string, status: string, notes?: string, mp?: string) => void; onDelete: (id: string) => void; updating: boolean }) {
  const [notes, setNotes] = useState(tx.notes || '');
  const [status, setStatus] = useState(tx.status);
  const [marketplace, setMarketplace] = useState(tx.marketplace?.id || 'none');
  const [showMp, setShowMp] = useState(false);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);

  const loadMp = async () => {
    const res = await fetch('/api/marketplaces');
    const d = await res.json();
    if (d.success) setMarketplaces(d.data);
  };

  // Calculate profit preview when marketplace changes
  const profitPreview = useMemo(() => {
    if (!showMp || status !== 'verification') return null;
    
    const selectedMp = marketplaces.find(m => m.id === marketplace);
    const currentPlatformFee = tx.platformFee || 0;
    const newPlatformFee = selectedMp 
      ? tx.nominal * (selectedMp.feePercent / 100) + (selectedMp.feeFlat || 0)
      : 0;
    
    const currentNetMargin = tx.paymentFee - currentPlatformFee;
    const newNetMargin = tx.paymentFee - newPlatformFee;
    
    const partnerRate = tx.partner?.commission || 0;
    const currentPartnerProfit = currentNetMargin * partnerRate / 100;
    const newPartnerProfit = newNetMargin * partnerRate / 100;
    
    const currentOwnerProfit = currentNetMargin - currentPartnerProfit;
    const newOwnerProfit = newNetMargin - newPartnerProfit;
    
    return {
      selectedMp,
      currentPlatformFee,
      newPlatformFee,
      currentOwnerProfit,
      newOwnerProfit,
      currentPartnerProfit,
      newPartnerProfit,
      profitChange: newOwnerProfit - currentOwnerProfit,
    };
  }, [showMp, status, marketplace, marketplaces, tx]);

  const handleStatus = (s: string) => {
    setStatus(s);
    if (s === 'verification') { 
      setShowMp(true); 
      loadMp(); 
    } else setShowMp(false);
  };

  const save = () => { 
    onUpdate(tx.id, status, notes, marketplace === 'none' ? undefined : marketplace || undefined); 
  };

  const config = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;

  return (
    <div className="space-y-3">
      {/* Current Status */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Status Saat Ini</span>
        <Badge className={cn("text-[10px]", config.color)}>{tx.status}</Badge>
      </div>

      {/* Transaction Amount Breakdown */}
      <Card className="glass-card">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <DollarSign className="w-3.5 h-3.5" />
            Rincian Nominal
          </div>
          
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nominal Transaksi</span>
              <span className="font-medium">{formatCurrency(tx.nominal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee Payment</span>
              <span className="text-red-600">-{formatCurrency(tx.paymentFee)}</span>
            </div>
            {tx.platformFee > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Store className="w-3 h-3" />
                  <span>Platform Fee</span>
                  {tx.marketplace && (
                    <Badge variant="outline" className="text-[9px] h-3.5">{tx.marketplace.name}</Badge>
                  )}
                </div>
                <span className="text-red-600">-{formatCurrency(tx.platformFee)}</span>
              </div>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diterima Customer</span>
              <span className="font-bold text-primary">{formatCurrency(tx.totalReceived)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Profit Display */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-green-600" />
                <p className="text-[10px] text-muted-foreground">Profit Anda Saat Ini</p>
              </div>
              <p className="text-xl font-bold text-green-600 mt-0.5">+{formatCurrency(tx.ownerProfit)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Partner</p>
              {tx.partner ? (
                <div>
                  <p className="text-xs font-medium">{tx.partner.name}</p>
                  <p className="text-[10px] text-blue-600">+{formatCurrency(tx.partnerProfit)}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
            <User className="w-3 h-3" /> Customer
          </div>
          <p className="font-medium truncate">{tx.customer?.name}</p>
          <p className="text-[10px] text-muted-foreground">{tx.customer?.phone}</p>
        </div>
        <div className="p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
            <CreditCard className="w-3 h-3" /> Payment
          </div>
          <p className="font-medium">{tx.paymentType?.name}</p>
          <p className="text-[10px] text-muted-foreground">{tx.methodTransaction}</p>
        </div>
      </div>

      {/* Status Change */}
      <div className="space-y-3 pt-3 border-t">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5" /> Ubah Status
        </p>
        
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { v: 'pending', l: 'Pending', icon: Clock, c: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', gradient: 'from-orange-500 to-amber-600' },
            { v: 'verification', l: 'Verif', icon: AlertCircle, c: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', gradient: 'from-blue-500 to-indigo-600' },
            { v: 'process', l: 'Proses', icon: Loader2, c: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800', gradient: 'from-cyan-500 to-teal-600' },
            { v: 'success', l: 'Sukses', icon: CheckCircle, c: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', gradient: 'from-green-500 to-emerald-600' },
            { v: 'failed', l: 'Gagal', icon: XCircle, c: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', gradient: 'from-red-500 to-rose-600' },
          ].map(s => {
            const Icon = s.icon;
            const isSelected = status === s.v;
            return (
              <button 
                key={s.v} 
                type="button" 
                onClick={() => handleStatus(s.v)} 
                disabled={updating} 
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all duration-200 min-h-[56px]",
                  isSelected 
                    ? "gradient-primary border-primary text-white shadow-lg scale-[1.02]" 
                    : cn(s.bg, s.border, "hover:scale-[1.02] hover:shadow-md", s.c)
                )}
              >
                <Icon className={cn("w-4 h-4", isSelected && "text-white", !isSelected && s.c, s.v === 'process' && !isSelected && "animate-spin")} />
                <span className="text-[10px] font-medium">{s.l}</span>
              </button>
            );
          })}
        </div>

        {/* Marketplace Selection with Profit Preview */}
        {showMp && status === 'verification' && (
          <div className="space-y-3">
            {/* Marketplace Selector */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-400">
                  <Info className="w-3 h-3" /> 
                  Pilih marketplace untuk kalkulasi platform fee
                </div>
                
                <Select value={marketplace} onValueChange={setMarketplace}>
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-background">
                    <SelectValue placeholder="Pilih marketplace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      <div className="flex items-center gap-2">
                        <MinusCircle className="w-3 h-3 text-muted-foreground" />
                        <span>Tanpa Marketplace</span>
                      </div>
                    </SelectItem>
                    {marketplaces.map(mp => (
                      <SelectItem key={mp.id} value={mp.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Store className="w-3 h-3" />
                          <span>{mp.name}</span>
                          <Badge variant="outline" className="text-[9px] h-4">{mp.feePercent}%</Badge>
                          {mp.isActive ? (
                            <Badge className="text-[9px] h-4 bg-green-100 text-green-700">Active</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[9px] h-4">Inactive</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Profit Preview */}
            {profitPreview && (
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <Calculator className="w-3.5 h-3.5" />
                    Preview Profit Setelah Update
                  </div>
                  
                  {/* Selected Marketplace Info */}
                  {profitPreview.selectedMp && (
                    <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-background/50 rounded-lg text-xs">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-orange-600" />
                        <span className="font-medium">{profitPreview.selectedMp.name}</span>
                        <Badge variant="outline" className="text-[9px] h-3.5">{profitPreview.selectedMp.feePercent}%</Badge>
                      </div>
                      <span className="text-red-600 font-medium">-{formatCurrency(profitPreview.newPlatformFee)}</span>
                    </div>
                  )}
                  
                  {/* Profit Comparison */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/30 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">Profit Saat Ini</p>
                      <p className="text-sm font-bold">{formatCurrency(profitPreview.currentOwnerProfit)}</p>
                    </div>
                    <div className={cn(
                      "p-2 rounded-lg",
                      profitPreview.profitChange >= 0 
                        ? "bg-green-100 dark:bg-green-900/30" 
                        : "bg-red-100 dark:bg-red-900/30"
                    )}>
                      <p className="text-[10px] text-muted-foreground">Profit Baru</p>
                      <p className="text-sm font-bold flex items-center gap-1">
                        {formatCurrency(profitPreview.newOwnerProfit)}
                        {profitPreview.profitChange !== 0 && (
                          <span className={cn(
                            "text-[10px]",
                            profitPreview.profitChange >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            ({profitPreview.profitChange >= 0 ? '+' : ''}{formatCurrency(profitPreview.profitChange)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Partner Profit Preview */}
                  {tx.partner && profitPreview.newPartnerProfit !== profitPreview.currentPartnerProfit && (
                    <div className="flex items-center justify-between text-[10px] p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <span className="text-muted-foreground">Partner Profit ({tx.partner.name}):</span>
                      <div className="flex items-center gap-1">
                        <span>{formatCurrency(profitPreview.currentPartnerProfit)}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-blue-600 font-medium">{formatCurrency(profitPreview.newPartnerProfit)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div>
          <Label className="text-[10px]">Catatan</Label>
          <Textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            placeholder="Catatan tambahan..." 
            className="h-14 text-xs resize-none" 
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={save} 
            disabled={updating || (status === tx.status && marketplace === (tx.marketplace?.id || 'none'))} 
            className="flex-1 h-9 text-xs gradient-primary"
          >
            {updating ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Menyimpan...</>
            ) : (
              <><Check className="w-3 h-3 mr-1" /> Simpan Perubahan</>
            )}
          </Button>
          <Button 
            variant="destructive" 
            size="icon" 
            onClick={() => onDelete(tx.id)} 
            disabled={updating} 
            className="h-9 w-9"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Transaction Detail Dialog Wrapper
function TxDetailDialog({ open, onOpenChange, tx, onUpdate, onDelete, updating }: { open: boolean; onOpenChange: (v: boolean) => void; tx: Transaction | null; onUpdate: (id: string, status: string, notes?: string, mp?: string) => void; onDelete: (id: string) => void; updating: boolean }) {
  if (!tx) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Hash className="w-4 h-4 text-muted-foreground" /> 
            Detail Transaksi
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px]">{tx.orderId}</DialogDescription>
        </DialogHeader>
        <TxDetailDialogContent key={tx.id} tx={tx} onUpdate={onUpdate} onDelete={onDelete} updating={updating} />
      </DialogContent>
    </Dialog>
  );
}

// Helper
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
