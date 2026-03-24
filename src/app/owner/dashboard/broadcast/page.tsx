'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { SimplePagination } from '@/components/ui/pagination';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  Loader2,
  ExternalLink,
  Clock,
  Tag,
  Radio,
  FileText,
  Send,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Timer,
  Sparkles,
  Zap,
  RefreshCw,
  TrendingUp,
  BarChart3,
  PieChart,
  MessageSquare,
  Megaphone,
  Percent,
} from 'lucide-react';
import { formatDate, formatShortDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface Announcement {
  id: string;
  title: string;
  description: string;
  type: 'promo' | 'broadcast' | 'announcement';
  link: string | null;
  isActive: boolean;
  startDate: string | null;
  expireDate: string | null;
  createdAt: string;
}

type TabType = 'promo' | 'broadcast' | 'announcement';

interface StatusInfo {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  color: string;
  icon: React.ElementType;
  countdown?: string;
  isExpired?: boolean;
  isScheduled?: boolean;
}

const COLORS = ['#8b5cf6', '#a855f7', '#d946ef'];

const getStatusInfo = (announcement: Announcement): StatusInfo => {
  const now = new Date();
  const startDate = announcement.startDate ? new Date(announcement.startDate) : null;
  const expireDate = announcement.expireDate ? new Date(announcement.expireDate) : null;

  if (!announcement.isActive) {
    return { label: 'Nonaktif', variant: 'secondary', color: 'text-muted-foreground', icon: Pause };
  }

  if (startDate && startDate > now) {
    const diff = startDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { 
      label: 'Terjadwal', 
      variant: 'outline', 
      color: 'text-amber-600',
      icon: Timer,
      countdown: days > 0 ? `${days}h ${hours}j` : `${hours}j`,
      isScheduled: true,
    };
  }

  if (expireDate && expireDate < now) {
    return { label: 'Kedaluwarsa', variant: 'destructive', color: 'text-destructive', icon: AlertCircle, isExpired: true };
  }

  let countdown: string | undefined;
  if (expireDate) {
    const diff = expireDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    countdown = days > 0 ? `${days}h ${hours}j tersisa` : hours > 0 ? `${hours}j tersisa` : '< 1j tersisa';
  }

  return { label: 'Aktif', variant: 'default', color: 'text-primary', icon: CheckCircle2, countdown };
};

export default function OwnerBroadcastPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('promo');
  const [mainTab, setMainTab] = useState<'list' | 'analytics'>('list');
  const redirectAttempted = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !redirectAttempted.current) {
      redirectAttempted.current = true;
      if (!isAuthenticated) router.replace('/login');
      else if (user?.role !== 'owner') router.replace('/partner/dashboard');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') fetchAnnouncements();
  }, [isAuthenticated, hasHydrated, user]);

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      refreshIntervalRef.current = setInterval(() => {
        fetchAnnouncements(true);
      }, 60000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, hasHydrated, user]);

  const fetchAnnouncements = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch('/api/announcements');
      const result = await response.json();
      if (result.success) {
        setAnnouncements(result.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const toggleAnnouncement = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(isActive ? 'Dinonaktifkan' : 'Diaktifkan');
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isActive: !isActive } : a));
      }
    } catch (err) {
      console.error('Failed to toggle:', err);
      toast.error('Gagal mengubah status');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const response = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('Dihapus');
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Gagal menghapus');
    }
  };

  const filteredAnnouncements = announcements.filter(a => 
    a.type === activeTab && (
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const promoActive = announcements.filter(a => a.type === 'promo' && a.isActive).length;
  const broadcastActive = announcements.filter(a => a.type === 'broadcast' && a.isActive).length;
  const infoActive = announcements.filter(a => a.type === 'announcement' && a.isActive).length;
  const totalActive = promoActive + broadcastActive + infoActive;

  const stats = {
    total: announcements.length,
    active: announcements.filter(a => a.isActive).length,
    scheduled: announcements.filter(a => {
      const status = getStatusInfo(a);
      return status.isScheduled;
    }).length,
    expired: announcements.filter(a => {
      const status = getStatusInfo(a);
      return status.isExpired;
    }).length,
    promoCount: announcements.filter(a => a.type === 'promo').length,
    broadcastCount: announcements.filter(a => a.type === 'broadcast').length,
    infoCount: announcements.filter(a => a.type === 'announcement').length,
  };

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

  if (!isAuthenticated || user?.role !== 'owner') return null;

  return (
    <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 space-y-3 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span className="truncate">Broadcast</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Kelola promo, broadcast & pengumuman</p>
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
            onClick={() => fetchAnnouncements()}
            size="sm"
            variant="outline"
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isRefreshing && "animate-spin")} />
          </Button>
          <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/30 border-violet-200 text-violet-700 text-[10px] sm:text-xs px-2 sm:px-2.5">
            <Zap className="w-3 h-3 mr-1" />
            {totalActive} Aktif
          </Badge>
        </div>
      </div>

      {/* Main Tabs: List & Analytics */}
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
          <MessageSquare className="w-4 h-4" />
          List
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
          {/* Type Filter Pills */}
          <div className="overflow-x-auto -mx-3 px-3 scrollbar-hide">
            <div className="flex gap-1.5 min-w-max pb-1">
              {[
                { value: 'promo' as TabType, label: 'Promo', count: stats.promoCount, activeCount: promoActive, color: 'violet' },
                { value: 'broadcast' as TabType, label: 'Broadcast', count: stats.broadcastCount, activeCount: broadcastActive, color: 'purple' },
                { value: 'announcement' as TabType, label: 'Info', count: stats.infoCount, activeCount: infoActive, color: 'fuchsia' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1",
                    activeTab === tab.value 
                      ? cn(
                          tab.color === 'violet' && "bg-violet-500 text-white shadow-sm",
                          tab.color === 'purple' && "bg-purple-500 text-white shadow-sm",
                          tab.color === 'fuchsia' && "bg-fuchsia-500 text-white shadow-sm"
                        )
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                  {tab.activeCount > 0 && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full",
                      activeTab === tab.value ? "bg-white/20" : "bg-muted"
                    )}>
                      {tab.activeCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Add */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <Input
                placeholder={`Cari ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-9 sm:h-10 rounded-xl text-sm"
              />
            </div>
            <CreateDialog type={activeTab} onCreated={fetchAnnouncements} />
          </div>

          {/* Running Text Preview */}
          {activeTab === 'announcement' && infoActive > 0 && (
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-2 border border-violet-200 dark:border-violet-800 overflow-hidden">
              <div className="text-[10px] text-violet-600 mb-1 font-medium flex items-center">
                <Play className="w-3 h-3 mr-1" />Preview Running Text
              </div>
              <div className="overflow-hidden">
                <div className="animate-marquee whitespace-nowrap text-xs text-violet-700">
                  {announcements.filter(a => a.type === 'announcement' && a.isActive).map(a => a.description).join(' | ')}
                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div className="space-y-2">
            {loading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : filteredAnnouncements.length > 0 ? (
              filteredAnnouncements.map((item) => (
                <BroadcastCard
                  key={item.id}
                  item={item}
                  onToggle={toggleAnnouncement}
                  onDelete={deleteAnnouncement}
                  onUpdated={fetchAnnouncements}
                />
              ))
            ) : (
              <div className="text-center py-12">
                {activeTab === 'promo' && <Tag className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground opacity-30" />}
                {activeTab === 'broadcast' && <Radio className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground opacity-30" />}
                {activeTab === 'announcement' && <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground opacity-30" />}
                <p className="text-xs sm:text-sm text-muted-foreground">Belum ada {activeTab}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <BroadcastAnalytics announcements={announcements} stats={stats} />
      )}

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 15s linear infinite;
          padding-right: 2rem;
        }
      `}</style>
    </div>
  );
}

// Broadcast Analytics Component
function BroadcastAnalytics({ announcements, stats }: { announcements: Announcement[]; stats: Record<string, number> }) {
  // Prepare chart data
  const typeData = [
    { name: 'Promo', value: stats.promoCount, color: '#8b5cf6' },
    { name: 'Broadcast', value: stats.broadcastCount, color: '#a855f7' },
    { name: 'Info', value: stats.infoCount, color: '#d946ef' },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: 'Aktif', value: stats.active, color: '#22c55e' },
    { name: 'Terjadwal', value: stats.scheduled, color: '#f59e0b' },
    { name: 'Kedaluwarsa', value: stats.expired, color: '#ef4444' },
    { name: 'Nonaktif', value: stats.total - stats.active - stats.scheduled - stats.expired, color: '#6b7280' },
  ].filter(d => d.value > 0);

  // Monthly data simulation
  const monthlyData = [
    { month: 'Jan', promo: 2, broadcast: 1, info: 3 },
    { month: 'Feb', promo: 3, broadcast: 2, info: 2 },
    { month: 'Mar', promo: 1, broadcast: 3, info: 4 },
    { month: 'Apr', promo: 4, broadcast: 2, info: 1 },
    { month: 'Mei', promo: 2, broadcast: 1, info: 3 },
    { month: 'Jun', promo: 3, broadcast: 2, info: 2 },
  ];

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        <AnalyticsCard
          title="Total Item"
          value={stats.total}
          subtitle={`${stats.active} aktif`}
          icon={<MessageSquare className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="primary"
          isCount
        />
        <AnalyticsCard
          title="Promo"
          value={stats.promoCount}
          subtitle={`${announcements.filter(a => a.type === 'promo' && a.isActive).length} aktif`}
          icon={<Percent className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="violet"
          isCount
        />
        <AnalyticsCard
          title="Broadcast"
          value={stats.broadcastCount}
          subtitle={`${announcements.filter(a => a.type === 'broadcast' && a.isActive).length} aktif`}
          icon={<Radio className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="purple"
          isCount
        />
        <AnalyticsCard
          title="Info"
          value={stats.infoCount}
          subtitle={`${announcements.filter(a => a.type === 'announcement' && a.isActive).length} aktif`}
          icon={<FileText className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          color="fuchsia"
          isCount
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        {/* Type Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Distribusi Tipe
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            {typeData.length > 0 ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <ResponsiveContainer width="45%" height={140} className="sm:h-[180px]">
                  <RePieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} item`} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1 sm:space-y-1.5">
                  {typeData.map((item) => (
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

        {/* Status Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
            {statusData.length > 0 ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <ResponsiveContainer width="45%" height={140} className="sm:h-[180px]">
                  <RePieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} item`} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1 sm:space-y-1.5">
                  {statusData.map((item) => (
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
      </div>

      {/* Monthly Trend */}
      <Card className="glass-card">
        <CardHeader className="pb-1.5 sm:pb-2 pt-2.5 sm:pt-3 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            Tren Bulanan
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2.5 sm:px-4 pb-2.5 sm:pb-3">
          <ResponsiveContainer width="100%" height={160} className="sm:h-[200px]">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" width={25} />
              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
              <Bar dataKey="promo" fill="#8b5cf6" radius={[2, 2, 0, 0]} name="Promo" />
              <Bar dataKey="broadcast" fill="#a855f7" radius={[2, 2, 0, 0]} name="Broadcast" />
              <Bar dataKey="info" fill="#d946ef" radius={[2, 2, 0, 0]} name="Info" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Analytics Card Component
function AnalyticsCard({ title, value, subtitle, icon, color, isCount }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'violet' | 'purple' | 'fuchsia';
  isCount?: boolean;
}) {
  const colorClasses = {
    primary: 'from-primary to-primary/70',
    violet: 'from-violet-500 to-violet-600',
    purple: 'from-purple-500 to-purple-600',
    fuchsia: 'from-fuchsia-500 to-fuchsia-600',
  };

  const bgColorClasses = {
    primary: 'bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20',
    violet: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
    purple: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
    fuchsia: 'bg-gradient-to-br from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20',
  };

  return (
    <Card className={cn("glass-card overflow-hidden", bgColorClasses[color])}>
      <div className={cn("h-0.5 sm:h-1 bg-gradient-to-r", colorClasses[color])} />
      <CardContent className="p-2 sm:p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{title}</p>
            <p className="text-sm sm:text-lg font-bold truncate">{isCount ? value : value}</p>
            {subtitle && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{subtitle}</p>
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

// Broadcast Card Component
function BroadcastCard({ item, onToggle, onDelete, onUpdated }: {
  item: Announcement;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onUpdated: () => void;
}) {
  const status = getStatusInfo(item);
  const StatusIcon = status.icon;

  const typeConfig = {
    promo: { icon: Tag, gradient: 'from-violet-500 to-purple-600', color: 'violet' },
    broadcast: { icon: Radio, gradient: 'from-purple-500 to-fuchsia-600', color: 'purple' },
    announcement: { icon: FileText, gradient: 'from-fuchsia-500 to-pink-600', color: 'fuchsia' },
  };

  const config = typeConfig[item.type];
  const TypeIcon = config.icon;

  return (
    <Card className={cn(
      "glass-card overflow-hidden active-scale cursor-pointer hover:shadow-md transition-all tap-highlight",
      item.isActive && !status.isExpired && !status.isScheduled && "border-violet-300 dark:border-violet-700"
    )}>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 p-2 sm:gap-2.5 sm:p-2.5">
          {/* Icon */}
          <div className={cn(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-gradient-to-br flex-shrink-0",
            item.isActive && !status.isExpired ? config.gradient : "from-gray-400 to-gray-500"
          )}>
            <TypeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] sm:text-xs font-medium truncate">{item.title}</p>
              <Badge variant={status.variant} className="text-[8px] sm:text-[9px] h-4 sm:h-5 px-1 sm:px-1.5 shrink-0">
                <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                {status.label}
              </Badge>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between px-2 sm:px-2.5 py-1.5 bg-muted/30 border-t text-[9px] sm:text-[10px]">
          <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
            {status.countdown && !status.isScheduled && (
              <span className="text-violet-600 flex items-center gap-0.5">
                <Timer className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {status.countdown}
              </span>
            )}
            {status.isScheduled && status.countdown && (
              <span className="text-amber-600 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {status.countdown}
              </span>
            )}
            {item.type === 'promo' && item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-violet-600 flex items-center gap-0.5 hover:underline" onClick={(e) => e.stopPropagation()}>
                <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Link
              </a>
            )}
            {item.startDate && item.expireDate && (
              <span className="flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {formatShortDate(item.startDate)} - {formatShortDate(item.expireDate)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <span className="text-muted-foreground">{formatDate(item.createdAt)}</span>
            <Switch
              checked={item.isActive}
              onCheckedChange={() => onToggle(item.id, item.isActive)}
              className="scale-[0.6] sm:scale-[0.65]"
            />
            <EditDialog announcement={item} onUpdated={onUpdated} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6 text-destructive hover:bg-destructive/10 p-0">
                  <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-xs p-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm">Hapus?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">&quot;{item.title}&quot; akan dihapus permanen.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-8 text-xs">Batal</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-white h-8 text-xs" onClick={() => onDelete(item.id)}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Time ago formatter
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}

// Create Dialog
function CreateDialog({ type, onCreated }: { type: TabType; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    startDate: '',
    expireDate: '',
    isActive: true,
  });

  const resetForm = () => setFormData({ title: '', description: '', link: '', startDate: '', expireDate: '', isActive: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        type,
        isActive: formData.isActive,
      };
      if (type === 'promo') {
        payload.link = formData.link;
        if (formData.startDate) payload.startDate = formData.startDate;
        if (formData.expireDate) payload.expireDate = formData.expireDate;
      }
      if (type === 'broadcast') {
        payload.startDate = formData.startDate;
        payload.expireDate = formData.expireDate;
      }
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Berhasil dibuat');
        setOpen(false);
        resetForm();
        onCreated();
      } else {
        toast.error(result.error || 'Gagal membuat');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const titles = { promo: 'Promo Baru', broadcast: 'Broadcast Baru', announcement: 'Pengumuman Baru' };
  const descs = { promo: 'Buat promo untuk dikirim ke partner', broadcast: 'Buat broadcast dengan periode waktu', announcement: 'Buat pengumuman running text' };
  const gradientClasses = {
    promo: 'from-violet-500 to-purple-600',
    broadcast: 'from-purple-500 to-fuchsia-600',
    announcement: 'from-fuchsia-500 to-pink-600',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className={cn("gradient-primary text-white rounded-lg h-8 sm:h-9 px-2.5 sm:px-3 shadow-md", gradientClasses[type])}>
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
          <span className="hidden sm:inline">Baru</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-base">{titles[type]}</DialogTitle>
          <DialogDescription className="text-xs">{descs[type]}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Judul *</Label>
            <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} required className="h-9 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs">Deskripsi *</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} required className="text-sm mt-1" />
          </div>
          {type === 'promo' && (
            <>
              <div>
                <Label className="text-xs">Link (G.Drive/Canva) *</Label>
                <Input type="url" value={formData.link} onChange={(e) => setFormData(p => ({ ...p, link: e.target.value }))} required className="h-9 text-sm mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tanggal Mulai</Label>
                  <Input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Tanggal Selesai</Label>
                  <Input type="datetime-local" value={formData.expireDate} onChange={(e) => setFormData(p => ({ ...p, expireDate: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
              </div>
            </>
          )}
          {type === 'broadcast' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tanggal Mulai *</Label>
                <Input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} required className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Tanggal Selesai *</Label>
                <Input type="datetime-local" value={formData.expireDate} onChange={(e) => setFormData(p => ({ ...p, expireDate: e.target.value }))} required className="h-9 text-sm mt-1" />
              </div>
            </div>
          )}
          {type === 'announcement' && (
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-2.5 border border-violet-200 dark:border-violet-800">
              <div className="flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-violet-700">Running Text</p>
                  <p className="text-[10px] text-violet-600 mt-0.5">Pengumuman akan ditampilkan sebagai teks berjalan di dashboard partner</p>
                </div>
              </div>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Aktifkan sekarang</Label>
            <Switch checked={formData.isActive} onCheckedChange={(c) => setFormData(p => ({ ...p, isActive: c }))} />
          </div>
          <Button type="submit" className={cn("w-full text-white h-10 rounded-lg", gradientClasses[type])} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            Simpan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Dialog
function EditDialog({ announcement, onUpdated }: { announcement: Announcement; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: announcement.title,
    description: announcement.description,
    link: announcement.link || '',
    startDate: announcement.startDate ? new Date(announcement.startDate).toISOString().slice(0, 16) : '',
    expireDate: announcement.expireDate ? new Date(announcement.expireDate).toISOString().slice(0, 16) : '',
    isActive: announcement.isActive,
  });

  useEffect(() => {
    setFormData({
      title: announcement.title,
      description: announcement.description,
      link: announcement.link || '',
      startDate: announcement.startDate ? new Date(announcement.startDate).toISOString().slice(0, 16) : '',
      expireDate: announcement.expireDate ? new Date(announcement.expireDate).toISOString().slice(0, 16) : '',
      isActive: announcement.isActive,
    });
  }, [announcement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        isActive: formData.isActive,
      };
      if (announcement.type === 'promo') {
        payload.link = formData.link;
        if (formData.startDate) payload.startDate = formData.startDate;
        if (formData.expireDate) payload.expireDate = formData.expireDate;
      }
      if (announcement.type === 'broadcast') {
        payload.startDate = formData.startDate;
        payload.expireDate = formData.expireDate;
      }
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Berhasil diperbarui');
        setOpen(false);
        onUpdated();
      } else {
        toast.error(result.error || 'Gagal memperbarui');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6 p-0">
          <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-base">Edit {announcement.type}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Judul *</Label>
            <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} required className="h-9 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs">Deskripsi *</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} required className="text-sm mt-1" />
          </div>
          {announcement.type === 'promo' && (
            <>
              <div>
                <Label className="text-xs">Link *</Label>
                <Input type="url" value={formData.link} onChange={(e) => setFormData(p => ({ ...p, link: e.target.value }))} required className="h-9 text-sm mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tanggal Mulai</Label>
                  <Input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Tanggal Selesai</Label>
                  <Input type="datetime-local" value={formData.expireDate} onChange={(e) => setFormData(p => ({ ...p, expireDate: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
              </div>
            </>
          )}
          {announcement.type === 'broadcast' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tanggal Mulai *</Label>
                <Input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} required className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Tanggal Selesai *</Label>
                <Input type="datetime-local" value={formData.expireDate} onChange={(e) => setFormData(p => ({ ...p, expireDate: e.target.value }))} required className="h-9 text-sm mt-1" />
              </div>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Aktif</Label>
            <Switch checked={formData.isActive} onCheckedChange={(c) => setFormData(p => ({ ...p, isActive: c }))} />
          </div>
          <Button type="submit" className="w-full bg-violet-500 hover:bg-violet-600 text-white h-10 rounded-lg" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Simpan Perubahan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
