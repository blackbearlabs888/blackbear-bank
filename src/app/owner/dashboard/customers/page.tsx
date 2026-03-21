'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { SimplePagination } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Wallet,
  Loader2,
  MapPin,
  Crown,
  Star,
  MoreVertical,
  Trash2,
  Edit,
  Ban,
  FileText,
  Filter,
  User,
  Building,
  Copy,
  Check,
  Activity,
  Sparkles,
  WalletCards,
  BarChart3,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Partner {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  city?: string;
  label: string;
  totalVolume: number;
  totalTransactions: number;
  partnerId?: string;
  addedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  partner?: Partner;
  _count?: {
    transactions: number;
  };
}

interface CustomerStats {
  totalCustomers: number;
  totalVolume: number;
  vipCount: number;
  newCount: number;
  regularCount: number;
  blacklistCount: number;
  avgTransactionValue: number;
  topCities: Array<{ city: string; count: number; volume: number }>;
  growthRate: number;
}

export default function OwnerCustomersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('all');
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
      } else if (user?.role !== 'owner') {
        router.replace('/partner/dashboard');
      }
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchCustomers();
      fetchStats();
    }
  }, [isAuthenticated, hasHydrated, user, currentPage, labelFilter]);
  
  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [labelFilter]);

  // Window focus revalidation
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && user?.role === 'owner') {
        fetchCustomers();
        fetchStats();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, user]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      if (labelFilter !== 'all') {
        params.append('label', labelFilter === 'blacklist' ? 'Blacklist' : labelFilter);
      }
      
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

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/customers/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Filter customers based on search only
  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(searchLower)
    );
  });

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
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Customer</h1>
          <p className="text-sm text-muted-foreground">Kelola data pelanggan</p>
        </div>
        <NewCustomerDialog onCreated={() => { fetchCustomers(); fetchStats(); }} />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{stats?.totalCustomers || totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Volume</p>
                <p className="text-sm font-bold">{formatCurrency(stats?.totalVolume || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">VIP</p>
                <p className="text-lg font-bold">{stats?.vipCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Trx</p>
                <p className="text-sm font-bold">{formatCurrency(stats?.avgTransactionValue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location & Segmentation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Locations Card */}
        <Card className="glass-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Top Lokasi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats?.topCities && stats.topCities.length > 0 ? (
              <div className="space-y-2">
                {stats.topCities.map((city, index) => {
                  const percentage = stats.totalCustomers > 0 
                    ? (city.count / stats.totalCustomers) * 100 
                    : 0;
                  return (
                    <div key={city.city} className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        index === 1 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                        index === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{city.city}</span>
                          <span className="text-xs text-muted-foreground">{city.count} customer</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-primary">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada data lokasi
              </p>
            )}
          </CardContent>
        </Card>

        {/* Customer Segmentation */}
        <Card className="glass-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Segmentasi Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <SegmentBadge label="VIP" count={stats?.vipCount || 0} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" icon={Crown} />
              <SegmentBadge label="Regular" count={stats?.regularCount || 0} color="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" icon={User} />
              <SegmentBadge label="New" count={stats?.newCount || 0} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" icon={Star} />
              <SegmentBadge label="Blacklist" count={stats?.blacklistCount || 0} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" icon={Ban} />
            </div>
            
            {/* Progress bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-muted">
              {stats && stats.totalCustomers > 0 && (
                <>
                  {stats.vipCount > 0 && (
                    <div className="bg-amber-400 h-full" style={{ width: `${(stats.vipCount / stats.totalCustomers) * 100}%` }} />
                  )}
                  {stats.regularCount > 0 && (
                    <div className="bg-gray-400 h-full" style={{ width: `${(stats.regularCount / stats.totalCustomers) * 100}%` }} />
                  )}
                  {stats.newCount > 0 && (
                    <div className="bg-blue-400 h-full" style={{ width: `${(stats.newCount / stats.totalCustomers) * 100}%` }} />
                  )}
                  {stats.blacklistCount > 0 && (
                    <div className="bg-red-400 h-full" style={{ width: `${(stats.blacklistCount / stats.totalCustomers) * 100}%` }} />
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama/no. WA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <Select value={labelFilter} onValueChange={setLabelFilter}>
          <SelectTrigger className="w-[130px] h-11">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="blacklist">Blacklist</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {totalItems} customer{labelFilter !== 'all' && ` (${labelFilter})`}
        </p>

        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onUpdated={() => { fetchCustomers(); fetchStats(); }}
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
    </div>
  );
}

// Segment Badge Component
function SegmentBadge({ label, count, color, icon: Icon }: { label: string; count: number; color: string; icon: React.ElementType }) {
  return (
    <div className={cn('px-3 py-1.5 rounded-full flex items-center gap-2', color)}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-bold">{count}</span>
    </div>
  );
}

// Label Badge Component
function LabelBadge({ label }: { label: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    VIP: {
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200',
      icon: <Crown className="w-3 h-3" />,
    },
    Regular: {
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200',
      icon: <User className="w-3 h-3" />,
    },
    New: {
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
      icon: <Star className="w-3 h-3" />,
    },
    Blacklist: {
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200',
      icon: <Ban className="w-3 h-3" />,
    },
  };

  const variant = variants[label] || variants.Regular;

  return (
    <Badge variant="outline" className={cn('text-xs gap-1 font-medium', variant.className)}>
      {variant.icon}
      {label}
    </Badge>
  );
}

// Added By Badge Component
function AddedByBadge({ addedBy, partner }: { addedBy: string; partner?: Partner }) {
  const getAddedByInfo = () => {
    switch (addedBy) {
      case 'owner':
        return { label: 'Owner', icon: <Building className="w-3 h-3" />, className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' };
      case 'partner':
        return { label: partner?.name || 'Partner', icon: <Users className="w-3 h-3" />, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
      case 'public':
        return { label: 'Public', icon: <User className="w-3 h-3" />, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
      default:
        return { label: addedBy, icon: <User className="w-3 h-3" />, className: 'bg-gray-100 text-gray-700' };
    }
  };

  const info = getAddedByInfo();

  return (
    <Badge variant="outline" className={cn('text-[10px] gap-1 border-0', info.className)}>
      {info.icon}
      {info.label}
    </Badge>
  );
}

// Customer Card Component
function CustomerCard({
  customer,
  onUpdated,
}: {
  customer: Customer;
  onUpdated: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isBlacklisted = customer.label === 'Blacklist';

  const handleCopyPhone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(customer.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy phone:', err);
    }
  };

  return (
    <Card className={cn("glass-card overflow-hidden tap-highlight active-scale", isBlacklisted && "opacity-60")}>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3">
          {/* Avatar */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            isBlacklisted ? "bg-red-100 dark:bg-red-900/30" : 
            customer.label === 'VIP' ? "bg-amber-100 dark:bg-amber-900/30" :
            "bg-primary/10"
          )}>
            {customer.label === 'VIP' ? (
              <Crown className="w-5 h-5 text-amber-600" />
            ) : (
              <span className={cn(
                "font-bold",
                isBlacklisted ? "text-red-600" : "text-primary"
              )}>
                {customer.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{customer.name}</p>
              <LabelBadge label={customer.label} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{customer.phone}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={handleCopyPhone}
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </Button>
              <AddedByBadge addedBy={customer.addedBy} partner={customer.partner} />
            </div>
            {(customer.bankName || customer.city) && (
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {customer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {customer.city}
                  </span>
                )}
                {customer.bankName && (
                  <span className="flex items-center gap-1">
                    <WalletCards className="w-3 h-3" />
                    {customer.bankName}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-primary">{formatCurrency(customer.totalVolume)}</p>
            <p className="text-xs text-muted-foreground">{customer.totalTransactions} trx</p>
          </div>

          {/* Actions */}
          <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <CustomerActionsDialogContent
              customer={customer}
              onUpdated={() => {
                onUpdated();
                setActionsOpen(false);
              }}
              onClose={() => setActionsOpen(false)}
            />
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// Customer Actions Dialog Content
function CustomerActionsDialogContent({
  customer,
  onUpdated,
  onClose,
}: {
  customer: Customer;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(customer.label);
  const [notes, setNotes] = useState(customer.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(customer.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy phone:', err);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, notes }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Customer berhasil diperbarui');
        onUpdated();
      } else {
        setError(result.error || 'Gagal memperbarui customer');
      }
    } catch (err) {
      console.error('Failed to update customer:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Customer berhasil dihapus');
        onUpdated();
      } else {
        setError(result.error || 'Gagal menghapus customer');
      }
    } catch (err) {
      console.error('Failed to delete customer:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleBlacklistToggle = async () => {
    const newLabel = customer.label === 'Blacklist' ? 'Regular' : 'Blacklist';
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(newLabel === 'Blacklist' ? 'Customer ditambahkan ke blacklist' : 'Customer dihapus dari blacklist');
        onUpdated();
      } else {
        setError(result.error || 'Gagal mengubah status blacklist');
      }
    } catch (err) {
      console.error('Failed to toggle blacklist:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {customer.name}
        </DialogTitle>
        <DialogDescription>Kelola informasi customer</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Customer Info */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{customer.phone}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 ml-auto"
              onClick={handleCopyPhone}
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </Button>
          </div>
          {customer.city && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{customer.city}</span>
            </div>
          )}
          {(customer.bankName || customer.bankAccount) && (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {customer.bankName}
                {customer.bankAccount && ` - ${customer.bankAccount}`}
                {customer.bankHolder && ` a.n ${customer.bankHolder}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{formatCurrency(customer.totalVolume)} ({customer.totalTransactions} trx)</span>
          </div>
        </div>

        <Separator />

        {/* Change Label */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Label / Tier
          </Label>
          <Select value={label} onValueChange={setLabel}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIP">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-600" />
                  VIP
                </div>
              </SelectItem>
              <SelectItem value="Regular">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-600" />
                  Regular
                </div>
              </SelectItem>
              <SelectItem value="New">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  New
                </div>
              </SelectItem>
              <SelectItem value="Blacklist">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-600" />
                  Blacklist
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Catatan
          </Label>
          <Textarea
            placeholder="Tambahkan catatan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleUpdate}
            className="w-full gradient-primary text-white h-11 rounded-xl"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
            Simpan Perubahan
          </Button>

          <Button
            variant="outline"
            onClick={handleBlacklistToggle}
            className={cn(
              "w-full h-11 rounded-xl",
              customer.label === 'Blacklist' && "text-green-600 border-green-200 hover:bg-green-50"
            )}
            disabled={loading}
          >
            {customer.label === 'Blacklist' ? (
              <>
                <User className="w-4 h-4 mr-2" />
                Hapus dari Blacklist
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 mr-2" />
                Tambah ke Blacklist
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Delete Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus Customer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Customer?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini tidak dapat dibatalkan. Customer <strong>{customer.name}</strong> akan dihapus secara permanen.
                {customer.totalTransactions > 0 && (
                  <span className="block mt-2 text-amber-600">
                    Customer ini memiliki {customer.totalTransactions} transaksi dan tidak dapat dihapus.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={loading || customer.totalTransactions > 0}
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DialogContent>
  );
}

// New Customer Dialog
function NewCustomerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    city: '',
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
        setFormData({ name: '', phone: '', email: '', bankName: '', bankAccount: '', bankHolder: '', city: '' });
        toast.success('Customer berhasil ditambahkan');
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
      toast.error('Gagal menambahkan customer');
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
            <Sparkles className="w-4 h-4 text-primary" />
            Customer Baru
          </DialogTitle>
          <DialogDescription>Tambahkan pelanggan baru ke sistem</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Informasi Dasar</p>
            <div className="space-y-2">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Nama lengkap"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>No. WA <span className="text-red-500">*</span></Label>
              <Input
                placeholder="08xxx"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Opsional)</Label>
              <Input
                type="email"
                placeholder="email@contoh.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Lokasi / Kota (Opsional)</Label>
              <Input
                placeholder="Contoh: Jakarta, Bandung"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>

          <Separator />

          {/* Bank Info */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Informasi Bank (Opsional)</p>
            <div className="space-y-2">
              <Label>Nama Bank</Label>
              <Input
                placeholder="Contoh: BCA, BRI, Mandiri"
                value={formData.bankName}
                onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor Rekening</Label>
              <Input
                placeholder="Nomor rekening"
                value={formData.bankAccount}
                onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Pemilik Rekening</Label>
              <Input
                placeholder="Nama di rekening"
                value={formData.bankHolder}
                onChange={(e) => setFormData(prev => ({ ...prev, bankHolder: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>

          <Button type="submit" className="w-full gradient-primary text-white h-11 rounded-xl" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Simpan Customer
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
