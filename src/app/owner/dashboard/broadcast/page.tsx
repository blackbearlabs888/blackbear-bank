'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { formatDate, formatShortDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

const TAB_CONFIG: { value: TabType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'promo', label: 'Promo', icon: Tag, color: 'bg-violet-500' },
  { value: 'broadcast', label: 'Broadcast', icon: Radio, color: 'bg-emerald-500' },
  { value: 'announcement', label: 'Info', icon: FileText, color: 'bg-amber-500' },
];

const getStatusInfo = (announcement: Announcement): StatusInfo => {
  const now = new Date();
  const startDate = announcement.startDate ? new Date(announcement.startDate) : null;
  const expireDate = announcement.expireDate ? new Date(announcement.expireDate) : null;

  if (!announcement.isActive) {
    return {
      label: 'Nonaktif',
      variant: 'secondary',
      color: 'text-muted-foreground',
      icon: Pause,
    };
  }

  if (startDate && startDate > now) {
    const diff = startDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const countdown = days > 0 ? `${days}h ${hours}j` : `${hours}j`;

    return {
      label: 'Terjadwal',
      variant: 'outline',
      color: 'text-amber-600 dark:text-amber-400',
      icon: Timer,
      countdown,
      isScheduled: true,
    };
  }

  if (expireDate && expireDate < now) {
    return {
      label: 'Kedaluwarsa',
      variant: 'destructive',
      color: 'text-destructive dark:text-red-400',
      icon: AlertCircle,
      isExpired: true,
    };
  }

  let countdown: string | undefined;
  if (expireDate) {
    const diff = expireDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) {
      countdown = `${days}h ${hours}j tersisa`;
    } else if (hours > 0) {
      countdown = `${hours}j tersisa`;
    } else {
      countdown = '< 1j tersisa';
    }
  }

  return {
    label: 'Aktif',
    variant: 'default',
    color: 'text-primary dark:text-primary',
    icon: CheckCircle2,
    countdown,
  };
};

// Running Text Preview Component
function RunningTextPreview({ text }: { text: string }) {
  return (
    <div className="bg-violet-50 dark:bg-violet-950/20 rounded-xl p-3 border border-violet-200 dark:border-violet-800/60 overflow-hidden">
      <div className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mb-1.5 flex items-center gap-1">
        <Play className="w-3 h-3" />
        Preview Running Text
      </div>
      <div className="overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-xs text-violet-700 dark:text-violet-300">
          📢 {text} 📢 {text} 📢 {text} 📢 {text} 📢 {text}
        </div>
      </div>
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function OwnerBroadcastPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('promo');
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
      fetchAnnouncements();
    }
  }, [isAuthenticated, hasHydrated, user]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/announcements');
      const result = await response.json();
      if (result.success) {
        setAnnouncements(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
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
        setAnnouncements(prev =>
          prev.map(a => a.id === id ? { ...a, isActive: !isActive } : a)
        );
      }
    } catch (err) {
      console.error('Failed to toggle announcement:', err);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const filteredByTab = announcements.filter(a => a.type === activeTab);

  const filteredAnnouncements = filteredByTab.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading || !hasHydrated) {
    return (
      <div className="min-h-screen bg-background dashboard-mesh">
        <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
          <Skeleton className="h-8 w-36" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-10 rounded-xl" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  // Calculate counts for summary
  const promoCount = announcements.filter(a => a.type === 'promo' && a.isActive).length;
  const broadcastCount = announcements.filter(a => a.type === 'broadcast' && a.isActive).length;
  const announcementCount = announcements.filter(a => a.type === 'announcement' && a.isActive).length;
  const totalActive = promoCount + broadcastCount + announcementCount;

  // Get expired count
  const expiredCount = announcements.filter(a => {
    if (!a.expireDate) return false;
    return new Date(a.expireDate) < new Date();
  }).length;

  // Tab count map for badges
  const tabCounts: Record<TabType, number> = {
    promo: promoCount,
    broadcast: broadcastCount,
    announcement: announcementCount,
  };

  return (
    <div className="min-h-screen bg-background dashboard-mesh">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Broadcast</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Broadcast</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">Kelola promo, broadcast & pengumuman</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
            <Zap className="w-3 h-3 mr-1" />
            {totalActive} Aktif
          </Badge>
        </div>
      </div>

      {/* ── Active Broadcasts Summary - Compact Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          title="Promo"
          count={promoCount}
          icon={Tag}
          color="violet"
          isActive={activeTab === 'promo'}
          onClick={() => setActiveTab('promo')}
        />
        <SummaryCard
          title="Broadcast"
          count={broadcastCount}
          icon={Radio}
          color="emerald"
          isActive={activeTab === 'broadcast'}
          onClick={() => setActiveTab('broadcast')}
        />
        <SummaryCard
          title="Info"
          count={announcementCount}
          icon={FileText}
          color="amber"
          isActive={activeTab === 'announcement'}
          onClick={() => setActiveTab('announcement')}
        />
      </div>

      {/* ── Expired Warning ── */}
      {expiredCount > 0 && (
        <Card className="rounded-xl border border-amber-200 dark:border-amber-800/60 border-border/60 shadow-none bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 truncate">
                {expiredCount} item sudah kedaluwarsa
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Segmented Control Tabs ── */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
        {TAB_CONFIG.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.value;
          const count = tabCounts[tab.value];
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              <TabIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {count > 0 && (
                <span className={cn(
                  'tabular-nums text-[9px] sm:text-[10px] min-w-[16px] text-center px-1 rounded-full',
                  isActive ? 'bg-muted text-muted-foreground' : 'bg-muted'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="space-y-4">
        {/* Search & Add */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={`Cari ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs rounded-lg"
            />
          </div>
          <CreateDialog type={activeTab} onCreated={fetchAnnouncements} />
        </div>

        {/* Running Text Preview for Announcement Tab */}
        {activeTab === 'announcement' && announcementCount > 0 && (
          <RunningTextPreview
            text={announcements
              .filter(a => a.type === 'announcement' && a.isActive)
              .map(a => a.description)
              .join(' | ')}
          />
        )}

        {/* List */}
        <div className="space-y-3 max-h-[50vh] sm:max-h-[calc(100vh-400px)] overflow-y-auto overflow-x-hidden overscroll-contain pr-0.5">
          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onToggle={toggleAnnouncement}
                onDelete={deleteAnnouncement}
                onUpdated={fetchAnnouncements}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {activeTab === 'promo' && <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />}
              {activeTab === 'broadcast' && <Radio className="w-10 h-10 mx-auto mb-2 opacity-30" />}
              {activeTab === 'announcement' && <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />}
              <p className="text-xs">Belum ada {activeTab}</p>
              <p className="text-[10px] mt-1">Klik tombol + untuk menambah baru</p>
            </div>
          )}
        </div>
      </div>
  </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  count,
  icon: Icon,
  color,
  isActive,
  onClick,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  color: 'violet' | 'emerald' | 'amber';
  isActive: boolean;
  onClick: () => void;
}) {
  const colorClasses = {
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-950/20',
      icon: 'bg-violet-500',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-300 dark:border-violet-700',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      icon: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-300 dark:border-emerald-700',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      icon: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-300 dark:border-amber-700',
    },
  };

  const colors = colorClasses[color];

  return (
    <Card
      className={cn(
        "rounded-xl border shadow-none bg-card cursor-pointer hover:bg-muted/30 transition-colors",
        isActive && `border-2 ${colors.border} ${colors.bg}`,
        !isActive && "border-border/60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
            colors.icon
          )}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className={cn("text-lg sm:text-xl font-bold leading-tight", colors.text)}>{count}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight truncate">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Announcement Card Component
function AnnouncementCard({
  announcement,
  onToggle,
  onDelete,
  onUpdated,
}: {
  announcement: Announcement;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onUpdated: () => void;
}) {
  const status = getStatusInfo(announcement);
  const StatusIcon = status.icon;

  return (
    <Card className={cn(
      "rounded-xl border border-border/60 shadow-none bg-card overflow-hidden hover:bg-muted/30 transition-colors",
      announcement.isActive && !status.isExpired && !status.isScheduled && "border-violet-300 dark:border-violet-700/60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 min-w-0 max-w-full">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
            announcement.isActive && !status.isExpired
              ? "bg-violet-50 dark:bg-violet-950/20"
              : "bg-muted dark:bg-muted/50"
          )}>
            {announcement.type === 'promo' && <Tag className={cn("w-4 h-4", status.color)} />}
            {announcement.type === 'broadcast' && <Radio className={cn("w-4 h-4", status.color)} />}
            {announcement.type === 'announcement' && <FileText className={cn("w-4 h-4", status.color)} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium text-sm truncate">{announcement.title}</p>
              <Badge variant={status.variant} className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full gap-0.5 h-5">
                <StatusIcon className="w-2.5 h-2.5" />
                {status.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {announcement.description}
            </p>

            {/* Status info - countdown or expired badge */}
            {status.countdown && (
              <div className="flex items-center gap-1.5 mt-2">
                <Badge variant="outline" className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/60 text-violet-600 dark:text-violet-400 h-5">
                  <Timer className="w-2.5 h-2.5 mr-0.5" />
                  {status.countdown}
                </Badge>
              </div>
            )}

            {status.isExpired && (
              <div className="flex items-center gap-1.5 mt-2">
                <Badge variant="destructive" className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full h-5">
                  <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                  Sudah tidak aktif
                </Badge>
              </div>
            )}

            {status.isScheduled && status.countdown && (
              <div className="flex items-center gap-1.5 mt-2">
                <Badge variant="outline" className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 h-5">
                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                  Mulai dalam {status.countdown}
                </Badge>
              </div>
            )}

            {/* Type-specific info */}
            {announcement.type === 'promo' && announcement.link && (
              <a
                href={announcement.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 mt-2 hover:underline"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Lihat Link
              </a>
            )}

            {/* Date range for promo and broadcast */}
            {(announcement.type === 'promo' || announcement.type === 'broadcast') && announcement.startDate && announcement.expireDate && (
              <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                <Calendar className="w-2.5 h-2.5" />
                <span>{formatShortDate(announcement.startDate)} - {formatShortDate(announcement.expireDate)}</span>
              </div>
            )}

            {/* Running text preview for announcement */}
            {announcement.type === 'announcement' && announcement.isActive && !status.isExpired && (
              <div className="mt-2 bg-violet-50 dark:bg-violet-950/20 rounded-lg px-2 py-1 border border-violet-100 dark:border-violet-900/60">
                <p className="text-[10px] text-violet-700 dark:text-violet-300 truncate">
                  📢 {announcement.description}
                </p>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              {formatDate(announcement.createdAt)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-0.5">
              <EditDialog announcement={announcement} onUpdated={onUpdated} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive dark:text-red-400 hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-sm rounded-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base">Hapus {announcement.type}?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      Tindakan ini tidak dapat dibatalkan. &quot;{announcement.title}&quot; akan dihapus secara permanen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-9 rounded-lg text-xs font-medium">Batal</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 rounded-lg text-xs font-medium"
                      onClick={() => onDelete(announcement.id)}
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <Switch
              checked={announcement.isActive}
              onCheckedChange={() => onToggle(announcement.id, announcement.isActive)}
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Create Dialog Component
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      link: '',
      startDate: '',
      expireDate: '',
      isActive: true,
    });
  };

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
        setOpen(false);
        resetForm();
        onCreated();
      } else {
        alert(result.error || 'Gagal membuat');
      }
    } catch (err) {
      console.error('Failed to create:', err);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'promo': return 'Promo Baru';
      case 'broadcast': return 'Broadcast Baru';
      case 'announcement': return 'Pengumuman Baru';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'promo': return 'Buat promo untuk dikirim ke partner';
      case 'broadcast': return 'Buat broadcast dengan periode waktu';
      case 'announcement': return 'Buat pengumuman running text';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-9 w-9 p-0 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden rounded-xl">
        <div className="overflow-y-auto max-h-[85vh]">
          <div className="p-4 sm:p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base">{getTitle()}</DialogTitle>
              <DialogDescription className="text-xs">{getDescription()}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Judul *</Label>
                <Input
                  placeholder="Judul"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Deskripsi *</Label>
                <Textarea
                  placeholder="Isi deskripsi..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  required
                  className="text-xs rounded-lg"
                />
              </div>

              {type === 'promo' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Link (G.Drive/Canva) *</Label>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={formData.link}
                      onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                      required
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tanggal Mulai</Label>
                      <Input
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tanggal Selesai</Label>
                      <Input
                        type="datetime-local"
                        value={formData.expireDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, expireDate: e.target.value }))}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                  </div>
                </>
              )}

              {type === 'broadcast' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tanggal Mulai *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tanggal Selesai *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.expireDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expireDate: e.target.value }))}
                      required
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                </div>
              )}

              {type === 'announcement' && (
                <div className="bg-violet-50 dark:bg-violet-950/20 rounded-xl p-3 border border-violet-200 dark:border-violet-800/60">
                  <div className="flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-violet-700 dark:text-violet-300">Running Text</p>
                      <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5">
                        Pengumuman akan ditampilkan sebagai teks berjalan di dashboard partner
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <Label className="text-xs">Aktifkan sekarang</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  size="md"
                />
              </div>

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-xl text-xs font-semibold" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                Simpan
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Dialog Component
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
        setOpen(false);
        onUpdated();
      } else {
        alert(result.error || 'Gagal memperbarui');
      }
    } catch (err) {
      console.error('Failed to update:', err);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted/30 transition-colors">
          <Edit className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden rounded-xl">
        <div className="overflow-y-auto max-h-[85vh]">
          <div className="p-4 sm:p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base">Edit {announcement.type}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Judul *</Label>
                <Input
                  placeholder="Judul"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Deskripsi *</Label>
                <Textarea
                  placeholder="Isi deskripsi..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  required
                  className="text-xs rounded-lg"
                />
              </div>

              {announcement.type === 'promo' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Link (G.Drive/Canva) *</Label>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={formData.link}
                      onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                      required
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tanggal Mulai</Label>
                      <Input
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tanggal Selesai</Label>
                      <Input
                        type="datetime-local"
                        value={formData.expireDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, expireDate: e.target.value }))}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                  </div>
                </>
              )}

              {announcement.type === 'broadcast' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tanggal Mulai *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tanggal Selesai *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.expireDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expireDate: e.target.value }))}
                      required
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                </div>
              )}

              {announcement.type === 'announcement' && (
                <div className="bg-violet-50 dark:bg-violet-950/20 rounded-xl p-3 border border-violet-200 dark:border-violet-800/60">
                  <div className="flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-violet-700 dark:text-violet-300">Preview</p>
                      <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5 line-clamp-2">
                        📢 {formData.description || 'Isi deskripsi...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <Label className="text-xs">Aktif</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  size="md"
                />
              </div>

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-xl text-xs font-semibold" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Simpan Perubahan
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
