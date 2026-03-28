'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SimplePagination } from '@/components/ui/pagination';
import {
  Wallet, ArrowRightLeft, Search, RefreshCw,
  Loader2, AlertCircle, CheckCircle, XCircle, User, CreditCard, Store,
  MessageSquare, Copy, Edit3, Clock, ArrowUp, ArrowDown, Plus,
  Sparkles, Calculator, Building2, Save, Send,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CitySearch } from '@/components/ui/city-search';

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

interface Customer {
  id: string;
  name: string;
  phone: string;
  city?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
}

interface PaymentType {
  id: string;
  name: string;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  isActive: boolean;
}

interface Marketplace {
  id: string;
  name: string;
  feePercent: number;
  feeFlat: number;
}

const STATUS_CONFIG = {
  pending: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock, iconColor: 'text-orange-600', gradient: 'from-orange-500 to-amber-600' },
  verification: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle, iconColor: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
  process: { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Loader2, iconColor: 'text-cyan-600', gradient: 'from-cyan-500 to-teal-600' },
  success: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: ArrowUp, iconColor: 'text-green-600', gradient: 'from-green-500 to-emerald-600' },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: ArrowDown, iconColor: 'text-red-600', gradient: 'from-red-500 to-rose-600' },
};

const BANK_LIST = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon',
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

export default function PartnerTransactionsPage() {
  const router = useRouter();
  const { user, partner, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newTxOpen, setNewTxOpen] = useState(false);
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            onClick={() => setNewTxOpen(true)}
            size="sm"
            className="h-8 sm:h-9 rounded-lg gap-1 sm:gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Tambah</span>
          </Button>
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

      {/* New Transaction Dialog */}
      <NewTxDialog
        open={newTxOpen}
        onOpenChange={setNewTxOpen}
        onCreated={() => { fetchTransactions(); }}
        partnerId={partner?.id || ''}
        commission={partner?.commission || 0}
      />

      {/* Detail Dialog */}
      <TxDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        tx={selectedTransaction}
        onUpdate={fetchTransactions}
      />
    </div>
  );
}

// New Transaction Dialog for Partner
function NewTxDialog({ open, onOpenChange, onCreated, partnerId, commission }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  partnerId: string;
  commission: number;
}) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [searchCust, setSearchCust] = useState('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [isNewCust, setIsNewCust] = useState(false);
  const [customBankName, setCustomBankName] = useState('');

  const [form, setForm] = useState({
    customerId: '', customerName: '', customerPhone: '', customerCity: '',
    customerBankName: '', customerBankAccount: '', customerBankHolder: '',
    nominal: '', paymentTypeId: '', methodTransaction: 'Online', marketplaceId: '',
  });

  // Real-time calculation
  const calc = useMemo(() => {
    const nominal = parseFloat(form.nominal) || 0;
    if (!nominal || !form.paymentTypeId) return null;
    const pt = paymentTypes.find(p => p.id === form.paymentTypeId);
    if (!pt) return null;

    let feePercent = form.methodTransaction === 'Online' ? pt.onlineFeePercent : pt.codFeePercent;
    const feeFlat = form.methodTransaction === 'Online' ? pt.onlineFeeFlat : pt.codFeeFlat;
    
    if (feePercent > 100) feePercent = feePercent / 1000;
    
    let paymentFee: number;
    if (nominal >= (pt.threshold || 0)) {
      paymentFee = nominal * (feePercent / 100);
    } else {
      paymentFee = feeFlat;
    }

    let platformFee = 0;
    let selectedMp: Marketplace | null = null;
    if (form.marketplaceId && form.marketplaceId !== 'none') {
      const mp = marketplaces.find(m => m.id === form.marketplaceId);
      if (mp) {
        let mpFeePercent = Number(mp.feePercent) || 0;
        const mpFeeFlat = Number(mp.feeFlat) || 0;
        if (mpFeePercent > 100) mpFeePercent = mpFeePercent / 1000;
        platformFee = nominal * (mpFeePercent / 100) + mpFeeFlat;
        selectedMp = mp;
      }
    }

    const netMargin = paymentFee - platformFee;
    const partnerProfit = netMargin * commission / 100;
    const ownerProfit = netMargin - partnerProfit;
    const totalReceived = nominal - paymentFee;

    return { paymentFee, platformFee, netMargin, partnerProfit, ownerProfit, totalReceived, feePercent, selectedMp, threshold: pt.threshold };
  }, [form, paymentTypes, marketplaces, commission]);

  useEffect(() => { if (open) { fetchPT(); fetchMP(); } }, [open]);
  useEffect(() => { if (searchCust.length >= 2 && !isNewCust) searchC(); }, [searchCust, isNewCust]);

  const fetchPT = async () => { const res = await fetch('/api/payment-types?all=true'); const d = await res.json(); if (d.success) setPaymentTypes(d.data.filter((p: PaymentType) => p.isActive)); };
  const fetchMP = async () => { const res = await fetch('/api/marketplaces?activeOnly=true'); const d = await res.json(); if (d.success) setMarketplaces(d.data); };
  const searchC = async () => { const res = await fetch(`/api/customers?search=${searchCust}`); const d = await res.json(); if (d.success) setCustomers(d.data); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedMarketplaceId = (form.marketplaceId && form.marketplaceId !== 'none') 
        ? form.marketplaceId 
        : null;
      
      const bankNameToSubmit = form.customerBankName === 'Lainnya' ? customBankName : form.customerBankName;
      
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...form, 
          customerBankName: bankNameToSubmit,
          nominal: parseFloat(form.nominal), 
          marketplaceId: normalizedMarketplaceId, 
          partnerId: partnerId,
          isNewCustomer: isNewCust 
        }),
      });
      const d = await res.json();
      if (d.success) {
        onOpenChange(false);
        onCreated();
        setSelectedCust(null);
        setIsNewCust(false);
        setCustomBankName('');
        setForm({ customerId: '', customerName: '', customerPhone: '', customerCity: '', customerBankName: '', customerBankAccount: '', customerBankHolder: '', nominal: '', paymentTypeId: '', methodTransaction: 'Online', marketplaceId: '' });
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
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Nama" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} required className="h-8 text-xs" />
                  <Input placeholder="WA" value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} required className="h-8 text-xs" />
                  <CitySearch value={form.customerCity} onChange={(value) => setForm(p => ({ ...p, customerCity: value }))} placeholder="Kota" className="h-8" />
                </div>
                {/* Bank Account Fields */}
                <div className="p-2 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Rekening (Opsional)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={form.customerBankName}
                      onValueChange={(value) => {
                        setForm(p => ({ ...p, customerBankName: value }));
                        if (value !== 'Lainnya') setCustomBankName('');
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Pilih Bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {BANK_LIST.map((bank) => (
                          <SelectItem key={bank} value={bank} className="text-xs">{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="No. Rekening" value={form.customerBankAccount} onChange={e => setForm(p => ({ ...p, customerBankAccount: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  {form.customerBankName === 'Lainnya' && (
                    <Input placeholder="Ketik Nama Bank" value={customBankName} onChange={e => setCustomBankName(e.target.value)} className="h-8 text-xs" />
                  )}
                  <Input placeholder="Atas Nama" value={form.customerBankHolder} onChange={e => setForm(p => ({ ...p, customerBankHolder: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>
            ) : selectedCust ? (
              <div className="p-2 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{selectedCust.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedCust.phone}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setSelectedCust(null); setForm(p => ({ ...p, customerId: '' })); }}>Ganti</Button>
                </div>
                {selectedCust.bankName && selectedCust.bankAccount && (
                  <div className="flex items-center gap-2 p-2 bg-background rounded-md border">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground">{selectedCust.bankName}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-mono font-medium truncate">{selectedCust.bankAccount}</p>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(selectedCust.bankAccount || ''); toast.success('No. rekening disalin'); }} className="p-0.5 hover:bg-muted rounded">
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                      {selectedCust.bankHolder && <p className="text-[10px] text-muted-foreground">a.n. {selectedCust.bankHolder}</p>}
                    </div>
                  </div>
                )}
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
                        <Badge variant="outline" className="text-[9px] h-4">
                          {mp.feePercent}%{mp.feeFlat ? ` + ${formatCurrency(mp.feeFlat)}` : ''}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                    <Wallet className="w-3.5 h-3.5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">Profit Anda:</span>
                  </div>
                  <span className="font-bold text-green-600">+{formatCurrency(calc.partnerProfit)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="submit" className="w-full gradient-primary text-white h-9" disabled={loading || (!isNewCust && !selectedCust) || !form.nominal || !form.paymentTypeId}>
              {loading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Proses...</> : <><CheckCircle className="w-3 h-3 mr-1" /> Buat Transaksi</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
function TxDetailDialogContent({ tx, onUpdate }: { tx: Transaction; onUpdate?: () => void }) {
  const [editNominal, setEditNominal] = useState(false);
  const [nominal, setNominal] = useState(tx.nominal.toString());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const canEditNominal = tx.status === 'pending' || tx.status === 'verification';

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

  const handleSaveNominal = async () => {
    const newNominal = parseFloat(nominal);
    if (isNaN(newNominal) || newNominal <= 0) {
      toast.error('Nominal tidak valid');
      return;
    }

    if (newNominal === tx.nominal) {
      toast.error('Nominal tidak berubah');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal: newNominal,
          sendNotification: true, // Always send notification when partner changes nominal
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Nominal berhasil diupdate');
        setEditNominal(false);
        onUpdate?.();
      } else {
        toast.error(data.error || 'Gagal mengupdate nominal');
      }
    } catch {
      toast.error('Gagal mengupdate nominal');
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }

    setSendingMessage(true);
    try {
      const res = await fetch('/api/notifications/partner-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: tx.id,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pesan terkirim ke Owner');
        setMessage('');
      } else {
        toast.error(data.error || 'Gagal mengirim pesan');
      }
    } catch {
      toast.error('Gagal mengirim pesan');
    } finally {
      setSendingMessage(false);
    }
  };

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

      {/* Save Controls - Only show when editing nominal and can edit */}
      {editNominal && canEditNominal && (
        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
          <Button
            onClick={handleSaveNominal}
            disabled={saving || !nominal || parseFloat(nominal) <= 0 || parseFloat(nominal) === tx.nominal}
            className="w-full h-8 gradient-primary text-white text-xs gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      )}

      {/* Kirim Pesan ke Owner */}
      <div className="space-y-2 p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Kirim Pesan ke Owner</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Contoh: Mohon diproses ya..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={sendingMessage || !message.trim()}
            size="sm"
            className="h-8 px-3 gap-1"
          >
            {sendingMessage ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            <span className="text-xs">Kirim</span>
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground">
          Pesan akan dikirim sebagai notifikasi ke Owner untuk transaksi ini
        </p>
      </div>

      {/* Info */}
      <div className="text-center text-[10px] text-muted-foreground pt-2">
        <p>Transaksi ini dapat diedit oleh Owner</p>
        <p className="mt-1">Dibuat: {formatDate(tx.createdAt)}</p>
      </div>
    </div>
  );
}

// Transaction Detail Dialog Wrapper
function TxDetailDialog({ open, onOpenChange, tx, onUpdate }: { open: boolean; onOpenChange: (v: boolean) => void; tx: Transaction | null; onUpdate?: () => void }) {
  if (!tx) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Detail Transaksi {tx.orderId}</DialogTitle>
        </DialogHeader>
        <TxDetailDialogContent key={tx.id} tx={tx} onUpdate={onUpdate} />
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
