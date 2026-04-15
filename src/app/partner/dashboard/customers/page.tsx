'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  TrendingUp,
  ArrowRight,
  ShieldCheck,
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

// Label config
const LABEL_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; dotClass: string }> = {
  VIP: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    icon: Crown,
    dotClass: 'bg-amber-400',
  },
  New: {
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800/50',
    icon: Star,
    dotClass: 'bg-violet-400',
  },
  Regular: {
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800/30',
    border: 'border-gray-200 dark:border-gray-700',
    icon: Users,
    dotClass: 'bg-gray-400',
  },
  Blacklist: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/50',
    icon: Ban,
    dotClass: 'bg-red-400',
  },
};

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
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
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

  const total = stats?.totalCustomers || 0;

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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Database Customer</h1>
            <p className="text-xs text-muted-foreground">Kelola dan pantau pelanggan Anda</p>
          </div>
          <div className="flex-shrink-0">
            <NewCustomerDialog onCreated={() => { fetchCustomers(); fetchStats(); }} />
          </div>
        </div>

        {/* Summary Stats - 2x2 grid with accent cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Customer</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">{stats?.totalCustomers || totalItems}</p>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Volume</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">{formatCompactCurrency(stats?.totalVolume || 0)}</p>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">VIP Customer</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">{stats?.vipCount || 0}</p>
                  {total > 0 && (
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">{((stats?.vipCount || 0) / total * 100).toFixed(0)}% dari total</p>
                  )}
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Trx Value</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">{formatCompactCurrency(stats?.avgTransactionValue || 0)}</p>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location & Segmentation - side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Top Locations */}
          <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500" />
            <CardHeader className="pb-1 sm:pb-2 px-3.5 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                Distribusi Lokasi
              </CardTitle>
              <CardDescription className="text-[10px]">Sebaran customer berdasarkan kota</CardDescription>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              {stats?.topCities && stats.topCities.length > 0 ? (
                <AnalyticsBubbleMap topCities={stats.topCities} accentColor="#8b5cf6" />
              ) : (
                <div className="aspect-[1.5] flex items-center justify-center text-muted-foreground text-xs rounded-lg bg-muted/20">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>Belum ada data lokasi</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Segmentation */}
          <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-violet-500 to-cyan-500" />
            <CardHeader className="pb-1 sm:pb-2 px-3.5 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                Segmentasi Customer
              </CardTitle>
              <CardDescription className="text-[10px]">Berdasarkan aktivitas & volume transaksi</CardDescription>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 space-y-4">
              {/* Segment list */}
              <div className="space-y-2.5">
                {(['VIP', 'Regular', 'New', 'Blacklist'] as const).map((label) => {
                  const config = LABEL_CONFIG[label];
                  const count = label === 'VIP' ? (stats?.vipCount || 0) 
                    : label === 'Regular' ? (stats?.regularCount || 0)
                    : label === 'New' ? (stats?.newCount || 0)
                    : (stats?.blacklistCount || 0);
                  const pct = total > 0 ? (count / total * 100) : 0;
                  const Icon = config.icon;

                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', config.dotClass)} />
                          <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-muted-foreground" />
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{count}</span>
                          <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', config.dotClass)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stacked bar overview */}
              <div className="h-2.5 rounded-full overflow-hidden flex bg-muted/50">
                {total > 0 && (
                  <>
                    {stats?.vipCount > 0 && (
                      <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${(stats.vipCount / total) * 100}%` }} />
                    )}
                    {stats?.regularCount > 0 && (
                      <div className="bg-gray-400 h-full transition-all duration-500" style={{ width: `${(stats.regularCount / total) * 100}%` }} />
                    )}
                    {stats?.newCount > 0 && (
                      <div className="bg-violet-400 h-full transition-all duration-500" style={{ width: `${(stats.newCount / total) * 100}%` }} />
                    )}
                    {stats?.blacklistCount > 0 && (
                      <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${(stats.blacklistCount / total) * 100}%` }} />
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
            className="pl-10 h-10 text-xs rounded-xl bg-card border-border/60"
          />
        </div>

        {/* Customer List */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500" />
          <CardHeader className="pb-2 px-3.5 sm:px-4 pt-3 sm:pt-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  Daftar Customer
                </CardTitle>
                <CardDescription className="text-[10px] mt-0.5">{totalItems} customer terdaftar</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
            {loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : filteredCustomers.length > 0 ? (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <CustomerCard 
                    key={customer.id} 
                    customer={customer} 
                    onClick={() => openCustomerDetail(customer)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs">{searchQuery ? 'Tidak ada customer yang cocok' : 'Belum ada customer terdaftar'}</p>
              </div>
            )}
          </CardContent>
        </Card>

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
                  <DialogDescription>Informasi lengkap pelanggan</DialogDescription>
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

function CustomerCard({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  const [copied, setCopied] = useState(false);
  const isBlacklisted = customer.label === 'Blacklist';
  const config = LABEL_CONFIG[customer.label] || LABEL_CONFIG.Regular;
  const Icon = config.icon;

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
    <div
      className={cn(
        "flex items-stretch rounded-xl border bg-card shadow-none overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-border active-scale",
        isBlacklisted && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Left accent bar */}
      <div className={cn('w-[3px] flex-shrink-0 rounded-l-xl', config.dotClass)} />

      <div className="flex-1 min-w-0 p-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            config.bg
          )}>
            <Icon className={cn('w-5 h-5', config.color)} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate">{customer.name}</p>
              <Badge className={cn('text-[9px] px-1.5 py-0 rounded-full border font-medium', config.bg, config.color, config.border)}>
                {customer.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-muted-foreground font-mono">{customer.phone}</p>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="flex items-center justify-center w-5 h-5 hover:bg-muted rounded transition-colors"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2.5 mt-1 text-[11px] text-muted-foreground">
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
          </div>

          {/* Right stats + arrow */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-primary">{formatCompactCurrency(customer.totalVolume)}</p>
              <p className="text-[10px] text-muted-foreground">{customer.totalTransactions} trx</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerDetailView({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const config = LABEL_CONFIG[customer.label] || LABEL_CONFIG.Regular;
  const isBlacklisted = customer.label === 'Blacklist';
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="flex items-center gap-3.5 p-4 rounded-xl bg-muted/30 border border-border/40">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0",
          isBlacklisted ? "bg-red-500 text-white" :
          customer.label === 'VIP' ? "bg-amber-500 text-white" :
          "bg-primary text-primary-foreground"
        )}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base truncate">{customer.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn('text-[9px] px-2 py-0.5 rounded-full border font-medium', config.bg, config.color, config.border)}>
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
        <div className="rounded-xl border border-border/50 p-3 text-center bg-primary/5">
          <p className="text-[10px] text-muted-foreground font-medium">Total Volume</p>
          <p className="text-base font-bold text-primary mt-0.5">{formatCompactCurrency(customer.totalVolume)}</p>
        </div>
        <div className="rounded-xl border border-border/50 p-3 text-center bg-muted/30">
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
      <Button variant="outline" onClick={onClose} className="w-full rounded-xl h-10 text-xs font-medium">
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
        <Button size="sm" className="bg-primary text-primary-foreground rounded-xl h-9 px-4 text-xs font-medium hover:bg-primary/90">
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
            {/* Basic Info */}
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
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">No. WhatsApp <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="08xxx"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    className="h-9 text-xs rounded-xl"
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
                    className="h-9 text-xs rounded-xl"
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
                  <SelectTrigger className="h-9 text-xs rounded-xl">
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
                    className="h-9 text-xs rounded-xl"
                  />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Nomor Rekening"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                    className="h-9 text-xs rounded-xl"
                  />
                  <Input
                    placeholder="Nama Pemilik Rekening"
                    value={formData.bankHolder}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankHolder: e.target.value }))}
                    className="h-9 text-xs rounded-xl"
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
