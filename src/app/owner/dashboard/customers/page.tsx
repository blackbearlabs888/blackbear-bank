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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PieChart,
  Target,
  CreditCard,
  Receipt,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CitySearch } from '@/components/ui/city-search';
import { isValidIndonesianPhone, normalizePhone } from '@/lib/customer-utils';
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

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
  topCustomers: Array<{ id: string; name: string; totalVolume: number; totalTransactions: number; label: string }>;
  growthRate: number;
  newThisMonth: number;
}

const COLORS = ['#f59e0b', '#6b7280', '#3b82f6', '#ef4444'];

export default function OwnerCustomersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [mainTab, setMainTab] = useState<'list' | 'analytics'>('list');
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
  
  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [labelFilter]);

  // Auto-refresh every 1 minute
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
    setStatsLoading(true);
    try {
      const response = await fetch('/api/customers/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
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
      <div className="container mx-auto px-3 py-4 space-y-3 pb-24 md:pb-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
        <Skeleton className="h-10 rounded-xl" />
        <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  return (
    <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span className="truncate">Customer</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Kelola data pelanggan</p>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {isRefreshing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : formatTimeAgo(lastUpdated)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Button
            onClick={() => { fetchCustomers(); fetchStats(); }}
            size="sm"
            variant="outline"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isRefreshing && "animate-spin")} />
          </Button>
          <NewCustomerDialog onCreated={() => { fetchCustomers(); fetchStats(); }} />
        </div>
      </div>

      {/* Main Tabs: Customer & Analytics */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setMainTab('list')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium transition-all",
            mainTab === 'list' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="w-4 h-4" />
          Customer
        </button>
        <button
          onClick={() => setMainTab('analytics')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium transition-all",
            mainTab === 'analytics' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      {mainTab === 'list' ? (
        <div className="space-y-3">
          {/* Filter Pills */}
          <div className="overflow-x-auto -mx-3 px-3 scrollbar-hide">
            <div className="flex gap-1.5 min-w-max pb-1">
              {[
                { value: 'all', label: 'Semua', count: totalItems },
                { value: 'VIP', label: 'VIP', count: stats?.vipCount, color: 'amber' },
                { value: 'Regular', label: 'Regular', count: stats?.regularCount, color: 'gray' },
                { value: 'New', label: 'New', count: stats?.newCount, color: 'blue' },
                { value: 'blacklist', label: 'Blacklist', count: stats?.blacklistCount, color: 'red' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setLabelFilter(tab.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap",
                    labelFilter === tab.value 
                      ? cn(
                          tab.color === 'amber' && "bg-amber-500 text-white shadow-sm",
                          tab.color === 'gray' && "bg-gray-500 text-white shadow-sm",
                          tab.color === 'blue' && "bg-blue-500 text-white shadow-sm",
                          tab.color === 'red' && "bg-red-500 text-white shadow-sm",
                          !tab.color && "bg-primary text-primary-foreground shadow-sm"
                        )
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn("ml-1", labelFilter === tab.value ? "opacity-80" : "opacity-60")}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama/no. WA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 h-9 sm:h-10 rounded-xl text-sm"
            />
          </div>

          {/* Customer List */}
          <div className="space-y-2">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 sm:h-20 rounded-xl" />)
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onUpdated={() => { fetchCustomers(); fetchStats(); }}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-xs sm:text-sm text-muted-foreground">Tidak ada customer</p>
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
      ) : (
        <CustomerAnalytics stats={stats} loading={statsLoading} />
      )}
    </div>
  );
}

// Customer Analytics Component
function CustomerAnalytics({ stats, loading }: { stats: CustomerStats | null; loading: boolean }) {
  // Prepare chart data
  const segmentData = stats ? [
    { name: 'VIP', value: stats.vipCount, color: '#f59e0b' },
    { name: 'Regular', value: stats.regularCount, color: '#6b7280' },
    { name: 'New', value: stats.newCount, color: '#3b82f6' },
    { name: 'Blacklist', value: stats.blacklistCount, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const topCustomersData = stats?.topCustomers?.slice(0, 5) || [];

  if (loading) {
    return (
      <div className="space-y-2 sm:space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 sm:h-24 rounded-lg sm:rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
          <Skeleton className="h-48 sm:h-64 rounded-lg sm:rounded-xl" />
          <Skeleton className="h-48 sm:h-64 rounded-lg sm:rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        <AnalyticsCard
          title="Total Customer"
          value={stats?.totalCustomers || 0}
          subtitle={`${stats?.newThisMonth || 0} baru bulan ini`}
          icon={<Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="primary"
          isCount
        />
        <AnalyticsCard
          title="Total Volume"
          value={stats?.totalVolume || 0}
          subtitle="dari semua customer"
          icon={<Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="green"
        />
        <AnalyticsCard
          title="Avg Transaction"
          value={stats?.avgTransactionValue || 0}
          subtitle="nilai rata-rata"
          icon={<Target className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="blue"
        />
        <AnalyticsCard
          title="Growth Rate"
          value={`${(stats?.growthRate || 0).toFixed(1)}%`}
          subtitle="pertumbuhan bulanan"
          icon={<TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="purple"
          isPercent
          change={stats?.growthRate}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        {/* Segment Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Segmentasi Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            {segmentData.length > 0 ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <ResponsiveContainer width="45%" height={140} className="sm:h-[180px]">
                  <RePieChart>
                    <Pie
                      data={segmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {segmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} customer`} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1 sm:space-y-1.5">
                  {segmentData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[140px] sm:h-[180px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Top Lokasi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            {stats?.topCities && stats.topCities.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {stats.topCities.slice(0, 5).map((city, index) => {
                  const percentage = stats.totalCustomers > 0 
                    ? (city.count / stats.totalCustomers) * 100 
                    : 0;
                  return (
                    <div key={city.city} className="flex items-center gap-2 sm:gap-3">
                      <div className={cn(
                        "w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center text-[9px] sm:text-xs font-bold flex-shrink-0",
                        index === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        index === 1 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                        index === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <span className="text-[10px] sm:text-sm font-medium truncate">{city.city}</span>
                          <span className="text-[9px] sm:text-xs text-muted-foreground">{city.count}</span>
                        </div>
                        <div className="h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[9px] sm:text-xs font-medium text-primary flex-shrink-0">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[140px] sm:h-[180px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                Belum ada data lokasi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card className="glass-card">
        <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            Top Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
          {topCustomersData.length > 0 ? (
            <div className="space-y-1.5 sm:space-y-2">
              {topCustomersData.map((customer, index) => (
                <div key={customer.id} className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-muted/30">
                  <div className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-[10px] sm:text-xs flex-shrink-0",
                    index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
                    index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                    index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] sm:text-sm font-medium truncate">{customer.name}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground">{customer.totalTransactions || 0} transaksi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] sm:text-sm font-bold text-primary">{formatCurrency(customer.totalVolume || 0)}</p>
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] h-4 sm:h-5 px-1">
                      {customer.label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
              Belum ada data customer
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Analytics Card Component
function AnalyticsCard({ title, value, subtitle, icon, color, isCount, isPercent, change }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'blue' | 'purple';
  isCount?: boolean;
  isPercent?: boolean;
  change?: number;
}) {
  const colorClasses = {
    primary: 'from-primary to-primary/70',
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-violet-600',
  };

  const bgColorClasses = {
    primary: 'bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20',
    green: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
    blue: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
    purple: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
  };

  return (
    <Card className={cn("glass-card overflow-hidden", bgColorClasses[color])}>
      <div className={cn("h-0.5 sm:h-1 bg-gradient-to-r", colorClasses[color])} />
      <CardContent className="p-2 sm:p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{title}</p>
            <p className="text-sm sm:text-lg font-bold truncate">
              {isPercent ? value : isCount ? value : formatCurrency(value as number)}
            </p>
            {subtitle && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{subtitle}</p>
            )}
            {change !== undefined && (
              <div className={cn("flex items-center gap-0.5 text-[9px] sm:text-[10px]", change >= 0 ? 'text-green-600' : 'text-red-600')}>
                {change >= 0 ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className={cn("w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Badge variant="outline" className={cn('text-[9px] sm:text-xs gap-0.5 sm:gap-1 font-medium px-1.5 sm:px-2', variant.className)}>
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
        return { label: 'Owner', icon: <Building className="w-2.5 h-2.5 sm:w-3 sm:h-3" />, className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' };
      case 'partner':
        return { label: partner?.name || 'Partner', icon: <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
      case 'public':
        return { label: 'Public', icon: <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
      default:
        return { label: addedBy, icon: <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />, className: 'bg-gray-100 text-gray-700' };
    }
  };

  const info = getAddedByInfo();

  return (
    <Badge variant="outline" className={cn('text-[8px] sm:text-[10px] gap-0.5 sm:gap-1 border-0', info.className)}>
      {info.icon}
      <span className="truncate max-w-[50px] sm:max-w-none">{info.label}</span>
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
        <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3">
          {/* Avatar */}
          <div className={cn(
            "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0",
            isBlacklisted ? "bg-red-100 dark:bg-red-900/30" : 
            customer.label === 'VIP' ? "bg-amber-100 dark:bg-amber-900/30" :
            "bg-primary/10"
          )}>
            {customer.label === 'VIP' ? (
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            ) : (
              <span className={cn(
                "font-bold text-xs sm:text-sm",
                isBlacklisted ? "text-red-600" : "text-primary"
              )}>
                {customer.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <p className="text-[11px] sm:text-sm font-medium truncate">{customer.name}</p>
              <LabelBadge label={customer.label} />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <p className="text-[10px] sm:text-xs text-muted-foreground">{customer.phone}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 sm:h-5 sm:w-5 p-0"
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
            {(customer.bankName || customer.city) && (
              <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-muted-foreground">
                {customer.city && (
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="truncate max-w-[60px] sm:max-w-none">{customer.city}</span>
                  </span>
                )}
                {customer.bankName && (
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <WalletCards className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="truncate max-w-[50px] sm:max-w-none">{customer.bankName}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="text-right hidden sm:block flex-shrink-0">
            <p className="text-xs sm:text-sm font-bold text-primary">{formatCurrency(customer.totalVolume)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{customer.totalTransactions} trx</p>
          </div>

          {/* Actions */}
          <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex-shrink-0">
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
        </div>
        
        {/* Mobile Stats Footer */}
        <div className="sm:hidden flex items-center justify-between px-2.5 py-1.5 bg-muted/30 border-t text-[9px]">
          <span className="text-muted-foreground">{formatCurrency(customer.totalVolume)} • {customer.totalTransactions} trx</span>
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
  const [activeTab, setActiveTab] = useState<'info' | 'transactions'>('info');
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Fetch transactions when tab changes
  useEffect(() => {
    if (activeTab === 'transactions' && transactions.length === 0) {
      fetchTransactions();
    }
  }, [activeTab, customer.id]);

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}/transactions?limit=20`);
      const result = await response.json();
      if (result.success) {
        setTransactions(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  };

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
    <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {customer.name}
        </DialogTitle>
        <DialogDescription>Kelola informasi customer</DialogDescription>
      </DialogHeader>

      {/* Tab Buttons */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        <button
          onClick={() => setActiveTab('info')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all",
            activeTab === 'info' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="w-3.5 h-3.5" />
          Info
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all",
            activeTab === 'transactions' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Receipt className="w-3.5 h-3.5" />
          Transaksi
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {customer.totalTransactions}
          </Badge>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto -mx-6 px-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        {activeTab === 'info' ? (
          <div className="space-y-4">
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
        ) : (
          <div className="space-y-3 pb-4">
            {transactionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => {
                const status = tx.status as string;
                const statusColors: Record<string, string> = {
                  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                  verification: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  process: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                };
                return (
                  <Card key={tx.id as string} className="glass-card overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-muted-foreground">{tx.orderId as string}</span>
                        <Badge className={cn("text-[10px]", statusColors[status] || statusColors.pending)}>
                          {status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-primary">{formatCurrency(tx.nominal as number)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Fee: {formatCurrency(tx.paymentFee as number)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs">{tx.paymentType?.name as string}</p>
                          <p className="text-[10px] text-muted-foreground">{tx.methodTransaction as string}</p>
                        </div>
                      </div>
                      {tx.partner && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-[10px] text-muted-foreground">
                            Partner: <span className="font-medium">{(tx.partner as {name: string}).name}</span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DialogContent>
  );
}

// Bank list for dropdown
const BANK_LIST = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon',
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

// New Customer Dialog

function NewCustomerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customBankName, setCustomBankName] = useState('');
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
        setFormData({ name: '', phone: '', email: '', bankName: '', bankAccount: '', bankHolder: '', city: '' });
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
      toast.error('Gagal menambahkan customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-white rounded-lg h-8 sm:h-9 px-2.5 sm:px-4 shadow-md">
          <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
          <span className="hidden sm:inline">Baru</span>
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
              <CitySearch
                value={formData.city}
                onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                placeholder="Cari kota..."
              />
            </div>
          </div>

          <Separator />

          {/* Bank Info */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Informasi Bank (Opsional)</p>
            <div className="space-y-2">
              <Label>Nama Bank</Label>
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
            </div>
            {formData.bankName === 'Lainnya' && (
              <div className="space-y-2">
                <Label>Nama Bank Lainnya</Label>
                <Input
                  placeholder="Ketik nama bank"
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}
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

// Helper functions
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
