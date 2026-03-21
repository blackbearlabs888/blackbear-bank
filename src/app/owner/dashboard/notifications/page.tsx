'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Bell,
  MessageSquare,
  Calendar,
  Search,
  ChevronRight,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { SimplePagination } from '@/components/ui/pagination';
import Link from 'next/link';

interface Notification {
  id: string;
  orderId: string;
  partnerName?: string;
  customerName: string;
  notes: string | null;
  nominal: number;
  status: string;
  updatedAt: string;
  createdAt: string;
}

interface NotificationData {
  notifications: Notification[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

const ITEMS_PER_PAGE = 15;

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  verification: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle },
  process: { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Clock },
  success: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
};

export default function OwnerNotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [data, setData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const redirectAttempted = useRef(false);

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
      fetchNotifications();
    }
  }, [isAuthenticated, hasHydrated, user, currentPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isAuthenticated && hasHydrated && user?.role === 'owner') {
        setCurrentPage(1);
        fetchNotifications();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/notifications?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDateAgo = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return formatDate(dateStr);
  };

  const extractMessage = (notes: string | null): string => {
    if (!notes) return 'Tidak ada pesan';
    const lines = notes.split('\n');
    const lastLine = lines[lines.length - 1];
    return lastLine?.replace(/\[.*?\]\s*/, '') || 'Tidak ada pesan';
  };

  if (isLoading || !hasHydrated) {
    return (
      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4 pb-20 md:pb-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/owner/dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Notifikasi Partner</h1>
          <p className="text-xs text-muted-foreground">Semua pesan dari partner</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari order ID, partner, customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 sm:h-11"
        />
      </div>

      {/* Stats Summary */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card className="glass-card">
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                  <p className="text-base sm:text-lg font-bold">{data.pagination.totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
                  <p className="text-base sm:text-lg font-bold">
                    {data.notifications.filter(n => n.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Verifikasi</p>
                  <p className="text-base sm:text-lg font-bold">
                    {data.notifications.filter(n => n.status === 'verification').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Sukses</p>
                  <p className="text-base sm:text-lg font-bold">
                    {data.notifications.filter(n => n.status === 'success').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications List */}
      <Card className="glass-card">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Semua Notifikasi
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">
            Pesan dari partner terkait transaksi mereka
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : data?.notifications && data.notifications.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {data.notifications.map((notification) => {
                const statusConfig = STATUS_CONFIG[notification.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Link
                    key={notification.id}
                    href={`/owner/dashboard/transactions?highlight=${notification.id}`}
                    className="block"
                  >
                    <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium text-sm sm:text-base truncate">
                              {notification.partnerName || 'Partner'}
                            </p>
                            <Badge variant="outline" className="text-[10px] sm:text-xs font-mono">
                              {notification.orderId}
                            </Badge>
                            <Badge className={cn('text-[10px]', statusConfig.color)}>
                              {notification.status}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                            {extractMessage(notification.notes)}
                          </p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {notification.customerName}
                            </span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateAgo(notification.updatedAt)}
                            </span>
                            <span className="text-[10px] sm:text-xs font-semibold text-primary">
                              {formatCurrency(notification.nominal)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
            </div>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <SimplePagination
              currentPage={data.pagination.currentPage}
              totalPages={data.pagination.totalPages}
              totalItems={data.pagination.totalItems}
              itemsPerPage={data.pagination.itemsPerPage}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
