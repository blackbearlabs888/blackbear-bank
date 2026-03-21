'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimplePagination } from '@/components/ui/pagination';
import {
  Users,
  Search,
  UserPlus,
  ChevronRight,
  Wallet,
  Loader2,
  MapPin,
  Building2,
  Phone,
  Calendar,
  TrendingUp,
  ShoppingBag,
  ArrowLeft,
  Copy,
  Check,
  Star,
  Award,
  Edit,
  X,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  phone: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  city?: string;
  label: string;
  totalVolume: number;
  totalTransactions: number;
  notes?: string;
  createdAt: string;
}

export default function PartnerCustomersPage() {
  const router = useRouter();
  const { user, partner, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'partner') {
      fetchCustomers();
    }
  }, [isAuthenticated, hasHydrated, user, currentPage]);

  // Window focus revalidation
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'partner') {
        fetchCustomers();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, hasHydrated, user]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      
      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalItems(result.pagination.totalItems);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(searchLower) ||
      c.city?.toLowerCase().includes(searchLower)
    );
  });

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailOpen(true);
  };

  if (isLoading || !hasHydrated) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'partner') {
    return null;
  }

  const totalVolume = customers.reduce((sum, c) => sum + (c.totalVolume || 0), 0);
  const totalTransactions = customers.reduce((sum, c) => sum + (c.totalTransactions || 0), 0);

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header with gradient */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Customer</h1>
          <p className="text-sm text-muted-foreground">Database pelanggan Anda</p>
        </div>
        <NewCustomerDialog onCreated={fetchCustomers} />
      </div>

      {/* Stats Card - Enhanced */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card overflow-hidden">
          <div className="h-1 gradient-primary" />
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-blue-500" />
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Volume</p>
                <p className="text-sm font-bold">{formatCurrency(totalVolume)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-green-500" />
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Trx</p>
                <p className="text-lg font-bold">{totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, no. WA, atau kota..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => (
            <CustomerCard 
              key={customer.id} 
              customer={customer} 
              onClick={() => openCustomerDetail(customer)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada customer ditemukan</p>
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

      {/* Customer Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Detail Customer
            </DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <CustomerDetailView 
              customer={selectedCustomer} 
              onClose={() => setDetailOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerCard({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  const hasBankInfo = customer.bankName || customer.bankAccount || customer.bankHolder;
  
  const getLabelColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'vip': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'new': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'blacklist': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  return (
    <Card 
      className="glass-card tap-highlight active-scale cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-lg">
              {customer.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{customer.name}</p>
              <Badge className={cn('text-[10px]', getLabelColor(customer.label))}>
                {customer.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {customer.phone}
            </p>
            {customer.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {customer.city}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-primary">{formatCurrency(customer.totalVolume)}</p>
            <p className="text-xs text-muted-foreground">{customer.totalTransactions} trx</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerDetailView({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getLabelColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'vip': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200';
      case 'new': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
      case 'blacklist': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-2xl">
            {customer.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">{customer.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn('text-xs', getLabelColor(customer.label))}>
              {customer.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Kontak
        </h4>
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">No. WhatsApp</p>
                <p className="font-medium">{customer.phone}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard(customer.phone, 'phone')}
              >
                {copiedField === 'phone' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location */}
      {customer.city && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Lokasi
          </h4>
          <Card className="glass-card">
            <CardContent className="p-3">
              <p className="font-medium">{customer.city}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bank Info */}
      {(customer.bankName || customer.bankAccount || customer.bankHolder) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Informasi Bank
          </h4>
          <Card className="glass-card">
            <CardContent className="p-3 space-y-3">
              {customer.bankName && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Nama Bank</p>
                    <p className="font-medium">{customer.bankName}</p>
                  </div>
                </div>
              )}
              {customer.bankHolder && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pemilik Rekening</p>
                    <p className="font-medium">{customer.bankHolder}</p>
                  </div>
                </div>
              )}
              {customer.bankAccount && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Nomor Rekening</p>
                    <p className="font-medium font-mono">{customer.bankAccount}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(customer.bankAccount!, 'bank')}
                  >
                    {copiedField === 'bank' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statistics */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Statistik
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Card className="glass-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Volume</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(customer.totalVolume)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Transaksi</p>
              <p className="text-lg font-bold">{customer.totalTransactions}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Catatan</h4>
          <Card className="glass-card">
            <CardContent className="p-3">
              <p className="text-sm">{customer.notes}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Member Since */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Sejak {formatDate(customer.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button variant="outline" asChild className="rounded-xl">
          <a 
            href={`https://wa.me/${customer.phone.replace(/^0/, '62')}`} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Phone className="w-4 h-4 mr-2" />
            WhatsApp
          </a>
        </Button>
        <Button variant="outline" onClick={onClose} className="rounded-xl">
          <X className="w-4 h-4 mr-2" />
          Tutup
        </Button>
      </div>
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
    notes: '',
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
        setFormData({ name: '', phone: '', bankName: '', bankAccount: '', bankHolder: '', city: '', notes: '' });
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-white rounded-xl h-10 px-4">
          <UserPlus className="w-4 h-4 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Customer Baru
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Nama lengkap"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>No. WhatsApp <span className="text-destructive">*</span></Label>
            <Input
              placeholder="08xxx"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
              className="rounded-xl"
            />
          </div>
          
          <div className="p-3 bg-muted/50 rounded-xl space-y-3">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Info Bank (Opsional)
            </p>
            <Input
              placeholder="Nama Bank (cth: BCA, Mandiri)"
              value={formData.bankName}
              onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
              className="rounded-xl"
            />
            <Input
              placeholder="Nomor Rekening"
              value={formData.bankAccount}
              onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
              className="rounded-xl"
            />
            <Input
              placeholder="Nama Pemilik Rekening"
              value={formData.bankHolder}
              onChange={(e) => setFormData(prev => ({ ...prev, bankHolder: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Lokasi / Kota</Label>
            <Input
              placeholder="Jakarta, Bandung, dll"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Catatan</Label>
            <Input
              placeholder="Catatan tambahan..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          <Button type="submit" className="w-full gradient-primary text-white h-11 rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Simpan Customer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
