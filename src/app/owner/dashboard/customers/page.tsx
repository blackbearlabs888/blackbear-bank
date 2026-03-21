'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SimplePagination } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Search,
  UserPlus,
  ChevronRight,
  Phone,
  Mail,
  Wallet,
  Loader2,
  MapPin,
  Crown,
  Star,
  UserX,
  MoreVertical,
  Trash2,
  Edit,
  Ban,
  FileText,
  Award,
  Filter,
  User,
  Building,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  Zap,
  RefreshCw,
  Calendar,
  BarChart3,
  Target,
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const redirectAttempted = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => {
        fetchCustomers(true);
        fetchStats();
      }, 60000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, hasHydrated, user, currentPage, labelFilter]);
  
  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [labelFilter]);

  // Window focus revalidation for real-time data
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

  const fetchCustomers = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
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
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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

  // Filter customers based on search only (label is filtered server-side)
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
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Customer
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground">Database pelanggan</p>
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
        <NewCustomerDialog onCreated={() => { fetchCustomers(); fetchStats(); }} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                <p className="text-base sm:text-lg font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600" />
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Volume</p>
                <p className="text-xs sm:text-base font-bold">{formatCurrency(stats?.totalVolume || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">VIP</p>
                <p className="text-base sm:text-lg font-bold">{stats?.vipCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">New</p>
                <p className="text-base sm:text-lg font-bold">{stats?.newCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segmentation */}
      <Card className="glass-card">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Segmentasi Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" /> VIP
                  </span>
                  <span className="text-xs font-medium">{stats?.vipCount || 0}</span>
                </div>
                <Progress value={(stats?.vipCount || 0) / Math.max(totalItems, 1) * 100} className="h-2 [&>div]:bg-amber-500" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-500" /> Regular
                  </span>
                  <span className="text-xs font-medium">{stats?.regularCount || 0}</span>
                </div>
                <Progress value={(stats?.regularCount || 0) / Math.max(totalItems, 1) * 100} className="h-2 [&>div]:bg-gray-400" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs flex items-center gap-1">
                    <Star className="w-3 h-3 text-blue-500" /> New
                  </span>
                  <span className="text-xs font-medium">{stats?.newCount || 0}</span>
                </div>
                <Progress value={(stats?.newCount || 0) / Math.max(totalItems, 1) * 100} className="h-2 [&>div]:bg-blue-500" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs flex items-center gap-1">
                    <Ban className="w-3 h-3 text-red-500" /> Blacklist
                  </span>
                  <span className="text-xs font-medium">{stats?.blacklistCount || 0}</span>
                </div>
                <Progress value={(stats?.blacklistCount || 0) / Math.max(totalItems, 1) * 100} className="h-2 [&>div]:bg-red-500" />
              </div>
            </div>
          </div>
          
          {/* Top Cities */}
          {stats?.topCities && stats.topCities.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Top Lokasi
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.topCities.slice(0, 5).map((city) => (
                  <Badge key={city.city} variant="outline" className="text-[10px]">
                    {city.city} ({city.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex gap-1.5 sm:gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama/no. WA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 sm:pl-10 h-9 sm:h-11 text-sm rounded-xl"
          />
        </div>
        <Select value={labelFilter} onValueChange={setLabelFilter}>
          <SelectTrigger className="w-[100px] sm:w-[130px] h-9 sm:h-11 text-xs sm:text-sm rounded-xl">
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
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
      <div className="space-y-1.5 sm:space-y-2">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {totalItems} customer
          {labelFilter !== 'all' && ` (${labelFilter})`}
        </p>

        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 sm:h-20 rounded-xl" />)
        ) : filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onUpdated={() => { fetchCustomers(); fetchStats(); }}
              showActions
            />
          ))
        ) : (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-30" />
            <p className="text-xs sm:text-sm">Tidak ada customer ditemukan</p>
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

// Label Badge Component
function LabelBadge({ label }: { label: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    VIP: {
      className: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 dark:from-amber-900/30 dark:to-yellow-900/30 dark:text-amber-400 border-amber-200',
      icon: <Crown className="w-3 h-3" />,
    },
    Regular: {
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200',
      icon: <User className="w-3 h-3" />,
    },
    New: {
      className: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-400 border-blue-200',
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
  showActions = false,
  isBlacklisted = false,
}: {
  customer: Customer;
  onUpdated: () => void;
  showActions?: boolean;
  isBlacklisted?: boolean;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
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

  // Calculate customer tier progress (for VIP/Regular)
  const getTierProgress = () => {
    if (customer.label === 'VIP') return 100;
    if (customer.totalVolume >= 10000000) return 100; // 10M = VIP threshold
    return (customer.totalVolume / 10000000) * 100;
  };

  return (
    <Card className={cn(
      "glass-card tap-highlight overflow-hidden",
      isBlacklisted && "opacity-75"
    )}>
      {/* Gradient accent based on label */}
      <div className={cn(
        "h-1",
        customer.label === 'VIP' && "bg-gradient-to-r from-amber-400 to-yellow-500",
        customer.label === 'New' && "bg-gradient-to-r from-blue-400 to-indigo-500",
        customer.label === 'Regular' && "bg-gradient-to-r from-gray-300 to-gray-400",
        customer.label === 'Blacklist' && "bg-gradient-to-r from-red-400 to-red-500"
      )} />
      <CardContent className="p-2 sm:p-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0",
            isBlacklisted ? "bg-red-100 dark:bg-red-900/30" : 
            customer.label === 'VIP' ? "bg-gradient-to-br from-amber-400 to-yellow-500" :
            "bg-violet-100 dark:bg-violet-900/30"
          )}>
            {customer.label === 'VIP' ? (
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <span className={cn(
                "font-bold text-sm sm:text-base",
                isBlacklisted ? "text-red-600" : "text-violet-600"
              )}>
                {customer.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <p className="font-medium truncate text-sm sm:text-base">{customer.name}</p>
              <LabelBadge label={customer.label} />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap mt-0.5">
              <p className="text-[10px] sm:text-xs text-muted-foreground">{customer.phone}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                onClick={handleCopyPhone}
              >
                {copied ? (
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600" />
                ) : (
                  <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                )}
              </Button>
              <AddedByBadge addedBy={customer.addedBy} partner={customer.partner} />
            </div>
            {/* Bank Info */}
            {(customer.bankName || customer.bankAccount || customer.bankHolder) && (
              <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">
                <Wallet className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="truncate">
                  {customer.bankName}
                  {customer.bankAccount && ` - ${customer.bankAccount}`}
                  {customer.bankHolder && ` (${customer.bankHolder})`}
                </span>
              </div>
            )}
            {customer.notes && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-0.5 sm:mr-1" />
                {customer.notes}
              </p>
            )}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold">{formatCurrency(customer.totalVolume)}</p>
            <p className="text-xs text-muted-foreground">{customer.totalTransactions} trx</p>
            {customer.label !== 'VIP' && customer.label !== 'Blacklist' && (
              <div className="mt-1 w-16">
                <Progress value={getTierProgress()} className="h-1" />
                <p className="text-[9px] text-muted-foreground mt-0.5">to VIP</p>
              </div>
            )}
          </div>
          {showActions && (
            <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg">
                  <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
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
          )}
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
  const [deleteLoading, setDeleteLoading] = useState(false);
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
    setDeleteLoading(true);
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
      setDeleteLoading(false);
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
          <User className="w-5 h-5 text-violet-600" />
          {customer.name}
        </DialogTitle>
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
              className="h-6 w-6 p-0 ml-auto hover:bg-violet-100 dark:hover:bg-violet-900/30"
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
                <UserX className="w-4 h-4 mr-2" />
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
                disabled={deleteLoading || customer.totalTransactions > 0}
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DialogContent>
  );
}

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
        <Button size="sm" className="gradient-primary text-white rounded-xl h-10 px-4 shadow-md">
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
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Simpan
          </Button>
        </form>
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
