'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimplePagination } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Search,
  UserPlus,
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
  Crown,
  Edit,
  X,
  Activity,
  Ban,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatDate, formatDateAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CitySearch } from '@/components/ui/city-search';

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

interface CustomerStats {
  totalCustomers: number;
  totalVolume: number;
  vipCount: number;
  newCount: number;
  regularCount: number;
  blacklistCount: number;
  avgTransactionValue: number;
  topCities: Array<{ city: string; count: number; volume: number }>;
}

export default function PartnerCustomersPage() {
  const router = useRouter();
  const { user, partner, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
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
      fetchStats();
    }
  }, [isAuthenticated, hasHydrated, user, currentPage]);

  // Window focus revalidation
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && hasHydrated && user?.role === 'partner') {
        fetchCustomers();
        fetchStats();
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

  if (!isAuthenticated || user?.role !== 'partner') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header with gradient */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Customer</h1>
          <p className="text-sm text-muted-foreground">Database pelanggan Anda</p>
        </div>
        <NewCustomerDialog onCreated={() => { fetchCustomers(); fetchStats(); }} />
      </div>

      {/* Stats Overview - Same as Owner */}
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

      {/* Location & Segmentation Cards - Same as Owner */}
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
              <SegmentBadge label="Regular" count={stats?.regularCount || 0} color="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" icon={Users} />
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
        <p className="text-xs text-muted-foreground">{totalItems} customer</p>
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
            <DialogDescription>Informasi lengkap customer</DialogDescription>
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
      icon: <Users className="w-3 h-3" />,
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

function CustomerCard({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  const [copied, setCopied] = useState(false);

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

  const isBlacklisted = customer.label === 'Blacklist';

  return (
    <Card 
      className={cn("glass-card overflow-hidden tap-highlight active-scale cursor-pointer", isBlacklisted && "opacity-60")}
      onClick={onClick}
    >
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
                    <Building2 className="w-3 h-3" />
                    {customer.bankName}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-primary">{formatCompactCurrency(customer.totalVolume)}</p>
            <p className="text-xs text-muted-foreground">{customer.totalTransactions} trx</p>
          </div>
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
      case 'vip': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200';
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
              <p className="text-lg font-bold text-primary">{formatCompactCurrency(customer.totalVolume)}</p>
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
          <span>Sejak {formatDateAgo(customer.createdAt)}</span>
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

// Bank list for dropdown
const BANK_LIST = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon',
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

function NewCustomerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customBankName, setCustomBankName] = useState('');
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
      const bankNameToSubmit = formData.bankName === 'Lainnya' ? customBankName : formData.bankName;
      
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          bankName: bankNameToSubmit,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        setFormData({ name: '', phone: '', bankName: '', bankAccount: '', bankHolder: '', city: '', notes: '' });
        setCustomBankName('');
        toast.success('Customer berhasil ditambahkan');
      } else {
        toast.error(result.error || 'Gagal menambahkan customer');
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
      toast.error('Terjadi kesalahan');
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
            <Select
              value={formData.bankName}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, bankName: value }));
                if (value !== 'Lainnya') {
                  setCustomBankName('');
                }
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Pilih bank" />
              </SelectTrigger>
              <SelectContent>
                {BANK_LIST.map((bank) => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.bankName === 'Lainnya' && (
              <Input
                placeholder="Ketik nama bank"
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                className="rounded-xl"
              />
            )}
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
            <CitySearch
              value={formData.city}
              onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
              placeholder="Cari kota..."
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
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Simpan Customer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
