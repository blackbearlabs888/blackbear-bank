'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimplePagination } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
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
  Copy,
  Check,
  Star,
  Crown,
  Ban,
  Activity,
  BarChart3,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatDateAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CitySearch } from '@/components/ui/city-search';
import { isValidIndonesianPhone, normalizePhone } from '@/lib/customer-utils';
import AnalyticsBubbleMap from '@/components/map/analytics-bubble-map';

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
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 pb-20 md:pb-6 max-w-4xl">
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
    <div className="min-h-screen bg-background dashboard-mesh">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Customer</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Customer</h1>
          <p className="text-xs text-muted-foreground">Database pelanggan Anda</p>
        </div>
        <div className="flex-shrink-0">
          <NewCustomerDialog onCreated={() => { fetchCustomers(); fetchStats(); }} />
        </div>
      </div>

      {/* Summary Card */}
      <div className="rounded-xl dash-card overflow-hidden p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Total Customer</p>
              <p className="text-base sm:text-lg font-bold text-foreground tracking-tight">{stats?.totalCustomers || totalItems}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Total Volume</p>
              <p className="text-base sm:text-lg font-bold text-foreground tracking-tight">{formatCurrency(stats?.totalVolume || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">VIP Customer</p>
              <p className="text-base sm:text-lg font-bold text-foreground tracking-tight">{stats?.vipCount || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Avg Trx Value</p>
              <p className="text-base sm:text-lg font-bold text-foreground tracking-tight">{formatCurrency(stats?.avgTransactionValue || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Location & Segmentation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Locations Card */}
        <div className="rounded-xl dash-card overflow-hidden">
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Top Lokasi
            </h3>
          </div>
          <div className="px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2">
            {stats?.topCities && stats.topCities.length > 0 ? (
              <AnalyticsBubbleMap topCities={stats.topCities} accentColor="#8b5cf6" />
            ) : (
              <div className="h-[140px] sm:h-[180px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                Belum ada data lokasi
              </div>
            )}
          </div>
        </div>

        {/* Customer Segmentation */}
        <div className="rounded-xl dash-card overflow-hidden">
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Segmentasi Customer
            </h3>
          </div>
          <div className="px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4 sm:pt-2">
            <div className="flex flex-wrap gap-2 mb-3 hide-scrollbar overflow-x-auto">
              <SegmentBadge label="VIP" count={stats?.vipCount || 0} color="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" icon={Crown} />
              <SegmentBadge label="Regular" count={stats?.regularCount || 0} color="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" icon={Users} />
              <SegmentBadge label="New" count={stats?.newCount || 0} color="bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400" icon={Star} />
              <SegmentBadge label="Blacklist" count={stats?.blacklistCount || 0} color="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" icon={Ban} />
            </div>
            
            {/* Progress bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-muted hide-scrollbar">
              {stats && stats.totalCustomers > 0 && (
                <>
                  {stats.vipCount > 0 && (
                    <div className="bg-amber-400 h-full" style={{ width: `${(stats.vipCount / stats.totalCustomers) * 100}%` }} />
                  )}
                  {stats.regularCount > 0 && (
                    <div className="bg-gray-400 h-full" style={{ width: `${(stats.regularCount / stats.totalCustomers) * 100}%` }} />
                  )}
                  {stats.newCount > 0 && (
                    <div className="bg-violet-400 h-full" style={{ width: `${(stats.newCount / stats.totalCustomers) * 100}%` }} />
                  )}
                  {stats.blacklistCount > 0 && (
                    <div className="bg-red-400 h-full" style={{ width: `${(stats.blacklistCount / stats.totalCustomers) * 100}%` }} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, no. WA, atau kota..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9 text-xs rounded-lg"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{totalItems} customer</p>
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
        <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1 hide-scrollbar">
            <div className="p-5 space-y-4">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
  </div>
</div>
  );
}

// Segment Badge Component
function SegmentBadge({ label, count, color, icon: Icon }: { label: string; count: number; color: string; icon: React.ElementType }) {
  return (
    <div className={cn('px-2 py-0.5 rounded-full flex items-center gap-1.5', color)}>
      <Icon className="w-3 h-3" />
      <span className="text-[9px] sm:text-[10px] font-medium">{label}</span>
      <span className="text-[9px] sm:text-[10px] font-bold">{count}</span>
    </div>
  );
}

// Label Badge Component
function LabelBadge({ label }: { label: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    VIP: {
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200',
      icon: <Crown className="w-3 h-3" />,
    },
    Regular: {
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200',
      icon: <Users className="w-3 h-3" />,
    },
    New: {
      className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border-violet-200',
      icon: <Star className="w-3 h-3" />,
    },
    Blacklist: {
      className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200',
      icon: <Ban className="w-3 h-3" />,
    },
  };

  const variant = variants[label] || variants.Regular;

  return (
    <Badge variant="outline" className={cn('text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full gap-1 font-medium', variant.className)}>
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
      className={cn("rounded-xl border border-border/60 shadow-none bg-card overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors", isBlacklisted && "opacity-60")}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3">
          {/* Avatar */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            isBlacklisted ? "bg-red-100 dark:bg-red-900/20" : 
            customer.label === 'VIP' ? "bg-amber-100 dark:bg-amber-900/20" :
            "bg-primary/10 dark:bg-primary/20"
          )}>
            {customer.label === 'VIP' ? (
              <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <span className={cn(
                "font-bold",
                isBlacklisted ? "text-red-600 dark:text-red-400" : "text-primary"
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
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
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
      case 'vip': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200';
      case 'new': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border-violet-200';
      case 'blacklist': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200';
    }
  };

  const isBlacklisted = customer.label === 'Blacklist';

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="flex items-center gap-3.5">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0",
          isBlacklisted ? "bg-red-500 text-white" :
          customer.label === 'VIP' ? "bg-amber-500 text-white" :
          "bg-primary text-primary-foreground"
        )}>
          <span className="font-bold text-lg">
            {customer.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base truncate">{customer.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={cn('text-[9px] px-2 py-0.5 rounded-full border', getLabelColor(customer.label))}>
              {customer.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateAgo(customer.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-primary/5 dark:bg-primary/10 p-3 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">Total Volume</p>
          <p className="text-base font-bold text-primary mt-0.5">{formatCompactCurrency(customer.totalVolume)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">Total Transaksi</p>
          <p className="text-base font-bold mt-0.5">{customer.totalTransactions}</p>
        </div>
      </div>

      {/* Info Rows */}
      <div className="rounded-xl border border-border/50 divide-y divide-border/50 overflow-hidden">
        {/* Phone / WhatsApp */}
        <div className="flex items-center gap-3 px-3.5 py-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-emerald-500">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium">WhatsApp</p>
            <p className="text-sm font-mono font-medium">{customer.phone}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => copyToClipboard(customer.phone, 'phone')}
              className="flex items-center justify-center w-7 h-7 hover:bg-muted rounded-md transition-colors"
              title="Salin No. WA"
            >
              {copiedField === 'phone' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
            <a
              href={`https://wa.me/${customer.phone.replace(/^0/, '62')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-7 h-7 hover:bg-emerald-500/10 rounded-md transition-colors"
              title="Buka WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            </a>
          </div>
        </div>

        {/* City */}
        {customer.city && (
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Kota</p>
              <p className="text-xs font-medium truncate">{customer.city}</p>
            </div>
          </div>
        )}

        {/* Bank */}
        {(customer.bankName || customer.bankAccount || customer.bankHolder) && (
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Bank</p>
              <p className="text-xs font-medium truncate">
                {[customer.bankName, customer.bankHolder && `a.n ${customer.bankHolder}`].filter(Boolean).join(' · ')}
              </p>
              {customer.bankAccount && (
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{customer.bankAccount}</p>
              )}
            </div>
            {customer.bankAccount && (
              <button
                type="button"
                onClick={() => copyToClipboard(customer.bankAccount!, 'bank')}
                className="flex items-center justify-center w-7 h-7 hover:bg-muted rounded-md transition-colors flex-shrink-0"
                title="Salin No. Rekening"
              >
                {copiedField === 'bank' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        {customer.notes && (
          <div className="flex items-start gap-3 px-3.5 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Catatan</p>
              <p className="text-xs mt-0.5 leading-relaxed">{customer.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <Button variant="outline" onClick={onClose} className="w-full rounded-xl h-9 text-xs font-medium">
        Tutup
      </Button>
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

    // Validate phone number
    if (!isValidIndonesianPhone(formData.phone)) {
      toast.error('Format nomor WA tidak valid. Gunakan format 08xxx');
      return;
    }

    setLoading(true);

    try {
      const bankNameToSubmit = formData.bankName === 'Lainnya' ? customBankName : formData.bankName;

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: normalizePhone(formData.phone),
          bankName: bankNameToSubmit,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        setFormData({ name: '', phone: '', bankName: '', bankAccount: '', bankHolder: '', city: '', notes: '' });
        setCustomBankName('');
        if (result.isExisting) {
          toast.info(result.message || 'Customer sudah ada, data diperbarui');
        } else {
          toast.success('Customer berhasil ditambahkan');
        }
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
        <Button size="sm" className="bg-primary text-primary-foreground rounded-lg h-9 px-4 text-xs font-medium hover:bg-primary/90">
          <UserPlus className="w-4 h-4 mr-1" />
          Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Customer Baru
          </DialogTitle>
          <DialogDescription>Tambahkan pelanggan baru ke sistem</DialogDescription>
        </DialogHeader>
        <form id="partner-customer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="px-5 py-4 space-y-4">
            {/* Basic Info - Grid */}
            <div className="space-y-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Informasi Dasar</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nama <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Nama lengkap"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">No. WhatsApp <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="08xxx"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Lokasi / Kota</Label>
                  <CitySearch
                    value={formData.city}
                    onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                    placeholder="Cari kota..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Catatan</Label>
                  <Input
                    placeholder="Catatan tambahan..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Bank Info */}
            <div className="space-y-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Informasi Bank <span className="normal-case tracking-normal text-muted-foreground/60">(Opsional)</span>
              </p>
              <div className="space-y-2">
                <Select
                  value={formData.bankName}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, bankName: value }));
                    if (value !== 'Lainnya') {
                      setCustomBankName('');
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs rounded-lg">
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
                    className="h-9 text-xs rounded-lg"
                  />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Nomor Rekening"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                    className="h-9 text-xs rounded-lg"
                  />
                  <Input
                    placeholder="Nama Pemilik Rekening"
                    value={formData.bankHolder}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankHolder: e.target.value }))}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
        <div className="px-5 pb-5 pt-2 border-t border-border/50 bg-background">
          <Button type="submit" form="partner-customer-form" className="w-full bg-primary text-primary-foreground h-10 rounded-xl text-xs font-semibold hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Simpan Customer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
