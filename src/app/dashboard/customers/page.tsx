'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Users, DollarSign, ShoppingBag, Loader2, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CustomersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState('all');
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
      fetchCustomers();
    }
  }, [isAuthenticated, hasHydrated, labelFilter]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (labelFilter !== 'all') {
        params.append('label', labelFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c: Record<string, unknown>) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (c.name as string)?.toLowerCase().includes(searchLower) ||
      (c.phone as string)?.includes(searchLower) ||
      (c.city as string)?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading || !hasHydrated || loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">Kelola semua customer</p>
        </div>
        <NewCustomerDialog onCreated={fetchCustomers} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customer</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
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
                  {formatCurrency(customers.reduce((sum, c) => sum + ((c.totalVolume as number) || 0), 0))}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                <p className="text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + ((c.totalTransactions as number) || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
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
                placeholder="Cari nama, no. WA, atau kota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Label</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Blacklist">Blacklist</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Kota</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Transaksi</TableHead>
                  <TableHead>Bergabung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer: Record<string, unknown>) => (
                    <TableRow key={customer.id as string}>
                      <TableCell>
                        <p className="font-medium">{customer.name as string}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{customer.phone as string}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{customer.bankName as string}</p>
                          <p className="text-xs text-muted-foreground">{customer.bankAccount as string}</p>
                        </div>
                      </TableCell>
                      <TableCell>{customer.city as string}</TableCell>
                      <TableCell>
                        <Badge variant={getLabelVariant(customer.label as string)}>
                          {customer.label as string}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(customer.totalVolume as number)}</TableCell>
                      <TableCell>{customer.totalTransactions as number}</TableCell>
                      <TableCell className="text-sm">{formatDate(customer.createdAt as string)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Tidak ada customer ditemukan
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

function NewCustomerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    city: '',
    label: 'Regular',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        setFormData({
          name: '',
          phone: '',
          bankName: '',
          bankAccount: '',
          bankHolder: '',
          city: '',
          label: 'Regular',
        });
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const banks = ['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon', 'Lainnya'];
  const labels = ['VIP', 'Regular', 'New', 'Blacklist'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Customer Baru</DialogTitle>
          <DialogDescription>Buat customer baru</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>No. WA *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                required
                placeholder="08xxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bank</Label>
              <Select
                value={formData.bankName}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, bankName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>No. Rek</Label>
              <Input
                value={formData.bankAccount}
                onChange={(e) => setFormData((prev) => ({ ...prev, bankAccount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Pemilik</Label>
              <Input
                value={formData.bankHolder}
                onChange={(e) => setFormData((prev) => ({ ...prev, bankHolder: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kota</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Select
                value={formData.label}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, label: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {labels.map((label) => (
                    <SelectItem key={label} value={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              'Tambah Customer'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getLabelVariant(label: string) {
  switch (label) {
    case 'VIP':
      return 'default';
    case 'Blacklist':
      return 'destructive';
    case 'New':
      return 'secondary';
    default:
      return 'outline';
  }
}
