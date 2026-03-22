'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Loader2,
  Eye,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const redirectAttempted = useRef(false);

  useEffect(() => {
    if (!hasHydrated) {
      hydrate();
    }
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !isAuthenticated && !redirectAttempted.current) {
      redirectAttempted.current = true;
      router.replace('/login');
    }
  }, [hasHydrated, isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated) {
      fetchTransactions();
    }
  }, [isAuthenticated, hasHydrated, statusFilter]);

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/transactions?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setTransactions(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((tx: Record<string, unknown>) => {
    const customer = tx.customer as Record<string, unknown>;
    const searchLower = searchQuery.toLowerCase();
    return (
      (tx.orderId as string)?.toLowerCase().includes(searchLower) ||
      (customer?.name as string)?.toLowerCase().includes(searchLower) ||
      (customer?.phone as string)?.includes(searchLower)
    );
  });

  if (isLoading || !hasHydrated || loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transaksi</h1>
          <p className="text-muted-foreground">Kelola semua transaksi</p>
        </div>
        {user?.role === 'owner' && <NewTransactionDialog onCreated={fetchTransactions} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(
                    transactions.reduce((sum, tx) => sum + (user?.role === 'owner' ? (tx.ownerProfit as number || 0) : (tx.partnerProfit as number || 0)), 0)
                  )}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(transactions.reduce((sum, tx) => sum + (tx.nominal as number || 0), 0))}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari order ID, nama, atau no. WA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verification">Verifikasi</SelectItem>
                <SelectItem value="process">Proses</SelectItem>
                <SelectItem value="success">Berhasil</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx: Record<string, unknown>) => (
                    <TableRow key={tx.id as string}>
                      <TableCell className="font-mono text-sm">{tx.orderId as string}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{(tx.customer as Record<string, unknown>)?.name as string}</p>
                          <p className="text-xs text-muted-foreground">{(tx.customer as Record<string, unknown>)?.phone as string}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(tx.nominal as number)}</TableCell>
                      <TableCell className="text-primary font-medium">
                        {formatCurrency(user?.role === 'owner' ? (tx.ownerProfit as number) : (tx.partnerProfit as number))}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{(tx.paymentType as Record<string, unknown>)?.name as string}</p>
                          <p className="text-xs text-muted-foreground">{tx.methodTransaction as string}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(tx.status as string)}>
                          {tx.status as string}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(tx.createdAt as string)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Tidak ada transaksi ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewTransactionDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [paymentTypes, setPaymentTypes] = useState<Array<Record<string, unknown>>>([]);
  const [marketplaces, setMarketplaces] = useState<Array<Record<string, unknown>>>([]);
  const [partners, setPartners] = useState<Array<Record<string, unknown>>>([]);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Record<string, unknown> | null>(null);
  
  const [formData, setFormData] = useState({
    customerId: '',
    nominal: '',
    paymentTypeId: '',
    methodTransaction: 'Online',
    marketplaceId: '',
    partnerId: '',
  });

  useEffect(() => {
    if (open) {
      fetchPaymentTypes();
      fetchMarketplaces();
      fetchPartners();
    }
  }, [open]);

  useEffect(() => {
    if (searchCustomer.length >= 2) {
      searchCustomers();
    }
  }, [searchCustomer]);

  const fetchPaymentTypes = async () => {
    const res = await fetch('/api/payment-types');
    const data = await res.json();
    if (data.success) setPaymentTypes(data.data);
  };

  const fetchMarketplaces = async () => {
    const res = await fetch('/api/marketplaces');
    const data = await res.json();
    if (data.success) setMarketplaces(data.data);
  };

  const fetchPartners = async () => {
    const res = await fetch('/api/partners');
    const data = await res.json();
    if (data.success) setPartners(data.data);
  };

  const searchCustomers = async () => {
    const res = await fetch(`/api/customers?search=${searchCustomer}`);
    const data = await res.json();
    if (data.success) setCustomers(data.data);
  };

  const selectCustomer = (customer: Record<string, unknown>) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({ ...prev, customerId: customer.id as string }));
    setSearchCustomer('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          nominal: parseFloat(formData.nominal),
          marketplaceId: formData.marketplaceId || null,
          partnerId: formData.partnerId || null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
      }
    } catch (err) {
      console.error('Failed to create transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Transaksi Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaksi Baru</DialogTitle>
          <DialogDescription>Buat transaksi baru untuk customer</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Customer</Label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{selectedCustomer.name as string}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone as string}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setFormData((prev) => ({ ...prev, customerId: '' }));
                  }}
                >
                  Ganti
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Cari nama atau no. WA..."
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                />
                {customers.length > 0 && searchCustomer && (
                  <div className="absolute top-full left-0 right-0 bg-background border rounded-lg shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                    {customers.map((c: Record<string, unknown>) => (
                      <button
                        key={c.id as string}
                        type="button"
                        className="w-full text-left p-3 hover:bg-muted transition-smooth"
                        onClick={() => selectCustomer(c)}
                      >
                        <p className="font-medium">{c.name as string}</p>
                        <p className="text-sm text-muted-foreground">{c.phone as string}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nominal */}
          <div className="space-y-2">
            <Label htmlFor="nominal">Nominal</Label>
            <Input
              id="nominal"
              type="number"
              placeholder="Masukkan nominal"
              value={formData.nominal}
              onChange={(e) => setFormData((prev) => ({ ...prev, nominal: e.target.value }))}
              required
            />
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <Label>Tipe Pembayaran</Label>
            <Select
              value={formData.paymentTypeId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentTypeId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe pembayaran" />
              </SelectTrigger>
              <SelectContent>
                {paymentTypes.map((pt: Record<string, unknown>) => (
                  <SelectItem key={pt.id as string} value={pt.id as string}>
                    {pt.name as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Method */}
          <div className="space-y-2">
            <Label>Metode</Label>
            <Select
              value={formData.methodTransaction}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, methodTransaction: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="COD">COD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Marketplace */}
          <div className="space-y-2">
            <Label>Marketplace (Opsional)</Label>
            <Select
              value={formData.marketplaceId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, marketplaceId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih marketplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tanpa Marketplace</SelectItem>
                {marketplaces.map((mp: Record<string, unknown>) => (
                  <SelectItem key={mp.id as string} value={mp.id as string}>
                    {mp.name as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Partner */}
          <div className="space-y-2">
            <Label>Partner (Opsional)</Label>
            <Select
              value={formData.partnerId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, partnerId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih partner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tanpa Partner</SelectItem>
                {partners.map((p: Record<string, unknown>) => (
                  <SelectItem key={p.id as string} value={p.id as string}>
                    {p.name as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-white"
            disabled={loading || !formData.customerId}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              'Buat Transaksi'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'success':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'process':
    case 'verification':
      return 'outline';
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
}
