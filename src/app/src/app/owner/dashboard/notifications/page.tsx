'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Bell,
  UserPlus,
  ShoppingCart,
  MessageSquare,
  Calendar,
  Search,
  ChevronRight,
  User,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  CheckCheck,
  ExternalLink,
  Send,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { SimplePagination } from '@/components/ui/pagination';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  partnerId?: string;
  transactionId?: string;
  createdAt: string;
  readAt?: string;
}

interface NotificationData {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

const ITEMS_PER_PAGE = 15;

const TYPE_CONFIG: Record<string, { color: string; icon: React.ElementType; bgColor: string }> = {
  new_partner: {
    color: 'text-green-600',
    icon: UserPlus,
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  new_order: {
    color: 'text-violet-600',
    icon: ShoppingCart,
    bgColor: 'bg-violet-100 dark:bg-violet-900/30'
  },
  transaction_update: {
    color: 'text-blue-600',
    icon: AlertCircle,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  broadcast: {
    color: 'text-purple-600',
    icon: MessageSquare,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  partner_message: {
    color: 'text-amber-600',
    icon: MessageSquare,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
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
      fetchAllNotifications();
    }
  }, [isAuthenticated, hasHydrated, user, currentPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isAuthenticated && hasHydrated && user?.role === 'owner') {
        setCurrentPage(1);
        fetchAllNotifications();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchAllNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/notifications?${params.toString()}`);

      if (!response.ok) {
        console.error('API error:', response.status);
        setLoading(false);
        return;
      }

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

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        console.error('Mark as read error:', response.status);
        return;
      }

      fetchAllNotifications();
      window.dispatchEvent(new CustomEvent('notification-count-update'));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!response.ok) {
        console.error('Mark all as read error:', response.status);
        return;
      }

      fetchAllNotifications();
      window.dispatchEvent(new CustomEvent('notification-count-update'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
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

  // Separate partner messages from other notifications
  const partnerMessages = data?.notifications?.filter(n => n.type === 'partner_message') || [];
  const otherNotifications = data?.notifications?.filter(n => n.type !== 'partner_message') || [];

  // Filter by search
  const filteredPartnerMessages = searchQuery
    ? partnerMessages.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : partnerMessages;

  const filteredOtherNotifications = searchQuery
    ? otherNotifications.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : otherNotifications;

  const totalUnread = data?.unreadCount || 0;
  const partnerMessageUnread = partnerMessages.filter(n => !n.isRead).length;

  if (isLoading || !hasHydrated) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-10 rounded-xl" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/owner/dashboard')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold">Notifikasi</h1>
              <p className="text-[10px] text-muted-foreground">
                {totalUnread} belum dibaca
              </p>
            </div>
          </div>
          {totalUnread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-8"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Tandai semua dibaca
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari notifikasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 sm:h-10 text-sm"
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="glass-card">
            <CardContent className="p-2 sm:p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Total</p>
                  <p className="text-sm sm:text-base font-bold">{data?.notifications?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-2 sm:p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Pesan Partner</p>
                  <p className="text-sm sm:text-base font-bold">{partnerMessages.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-2 sm:p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Partner Baru</p>
                  <p className="text-sm sm:text-base font-bold">
                    {otherNotifications.filter(n => n.type === 'new_partner').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Partner Messages Section */}
        {filteredPartnerMessages.length > 0 && (
          <Card className="glass-card border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-1.5 sm:pb-2 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                  Pesan dari Partner
                  {partnerMessageUnread > 0 && (
                    <Badge className="h-4 px-1.5 text-[9px] bg-amber-500 text-white">
                      {partnerMessageUnread} baru
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 space-y-1.5 sm:space-y-2">
              {filteredPartnerMessages.map((notification) => {
                const config = TYPE_CONFIG[notification.type];
                const Icon = config.icon;
                const notifData = notification.data as Record<string, unknown> | null;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-colors border cursor-pointer",
                      notification.isRead
                        ? "bg-muted/20 hover:bg-muted/30 border-transparent"
                        : "bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        config.bgColor
                      )}>
                        <Icon className={cn("w-4 h-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className={cn(
                            "text-xs sm:text-sm truncate",
                            !notification.isRead && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <Badge className="h-4 px-1 text-[9px] bg-amber-500 text-white">Baru</Badge>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mb-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {formatDateAgo(notification.createdAt)}
                          </span>
                          {notifData?.nominal && (
                            <span className="text-[9px] sm:text-[10px] font-semibold text-primary">
                              {formatCurrency(notifData.nominal as number)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] gap-1 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!notification.isRead) markAsRead(notification.id);
                          if (notification.transactionId) {
                            router.push(`/owner/dashboard/transactions?highlight=${notification.transactionId}`);
                          }
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Lihat
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Other Notifications */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-primary" />
              Notifikasi Sistem
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : filteredOtherNotifications.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {filteredOtherNotifications.map((notification) => {
                  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.broadcast;
                  const Icon = config.icon;

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-colors border cursor-pointer",
                        notification.isRead
                          ? "bg-muted/20 hover:bg-muted/30 border-transparent"
                          : "bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/30 border-violet-200 dark:border-violet-800"
                      )}
                      onClick={() => {
                        if (!notification.isRead) markAsRead(notification.id);
                        if (notification.type === 'new_partner') {
                          router.push('/owner/dashboard/partners');
                        } else if ((notification.type === 'new_order' || notification.type === 'transaction_update') && notification.transactionId) {
                          router.push(`/owner/dashboard/transactions?highlight=${notification.transactionId}`);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                          config.bgColor
                        )}>
                          <Icon className={cn("w-4 h-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <p className={cn(
                              "text-xs sm:text-sm truncate",
                              !notification.isRead && "font-semibold"
                            )}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <Badge className="h-4 px-1 text-[9px] bg-violet-500 text-white">Baru</Badge>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mb-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {formatDateAgo(notification.createdAt)}
                            </span>
                            {notification.data?.nominal && (
                              <span className="text-[9px] sm:text-[10px] font-semibold text-primary">
                                {formatCurrency(notification.data.nominal as number)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground">Tidak ada notifikasi</p>
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
    </div>
  );
}
