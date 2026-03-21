'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Megaphone,
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  Loader2,
  Bell,
  BellOff,
  ExternalLink,
  Clock,
  Tag,
  Radio,
  FileText,
  Send,
  Play,
  Pause,
  TrendingUp,
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
    // Scheduled - calculate time until start
    const diff = startDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const countdown = days > 0 ? `${days}h ${hours}j` : `${hours}j`;
    
    return { 
      label: 'Terjadwal', 
      variant: 'outline', 
      color: 'text-amber-600',
      icon: Timer,
      countdown,
      isScheduled: true,
    };
  }

  if (expireDate && expireDate < now) {
    return { 
      label: 'Kedaluwarsa', 
      variant: 'destructive', 
      color: 'text-destructive',
      icon: AlertCircle,
      isExpired: true,
    };
  }

  // Active - calculate time remaining
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
    color: 'text-primary',
    icon: CheckCircle2,
    countdown,
  };
};

// Running Text Preview Component
function RunningTextPreview({ text }: { text: string }) {
  return (
    <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3 border border-violet-200 dark:border-violet-800 overflow-hidden">
      <div className="text-xs text-violet-600 dark:text-violet-400 mb-1.5 font-medium flex items-center gap-1">
        <Play className="w-3 h-3" />
        Preview Running Text
      </div>
      <div className="overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-sm text-violet-700 dark:text-violet-300">
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
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
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

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Broadcast</h1>
          <p className="text-sm text-muted-foreground">Kelola promo, broadcast & pengumuman</p>
        </div>
        <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300">
          <Zap className="w-3 h-3 mr-1" />
          {totalActive} Aktif
        </Badge>
      </div>

      {/* Active Broadcasts Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
          color="purple"
          isActive={activeTab === 'broadcast'}
          onClick={() => setActiveTab('broadcast')}
        />
        <SummaryCard
          title="Pengumuman"
          count={announcementCount}
          icon={FileText}
          color="fuchsia"
          isActive={activeTab === 'announcement'}
          onClick={() => setActiveTab('announcement')}
        />
      </div>

      {/* Expired Warning */}
      {expiredCount > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {expiredCount} item sudah kedaluwarsa
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Perpanjang atau nonaktifkan item yang sudah tidak relevan
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-11">
          <TabsTrigger value="promo" className="gap-1.5">
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline">Promo</span>
            {promoCount > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-violet-500 text-white">{promoCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5">
            <Radio className="w-4 h-4" />
            <span className="hidden sm:inline">Broadcast</span>
            {broadcastCount > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-purple-500 text-white">{broadcastCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="announcement" className="gap-1.5">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Pengumuman</span>
            {announcementCount > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-fuchsia-500 text-white">{announcementCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Content per tab */}
        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {/* Search & Add */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Cari ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
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
          <ScrollArea className="max-h-[calc(100vh-420px)]">
            <div className="space-y-2 pr-2">
              {loading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
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
                <div className="text-center py-12 text-muted-foreground">
                  {activeTab === 'promo' && <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />}
                  {activeTab === 'broadcast' && <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />}
                  {activeTab === 'announcement' && <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />}
                  <p className="text-sm">Belum ada {activeTab}</p>
                  <p className="text-xs mt-1">Klik tombol + untuk menambah baru</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
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
  color: 'violet' | 'purple' | 'fuchsia';
  isActive: boolean;
  onClick: () => void;
}) {
  const colorClasses = {
    violet: {
      bg: 'bg-violet-100 dark:bg-violet-900/30',
      icon: 'bg-violet-500',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-300 dark:border-violet-700',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      icon: 'bg-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-300 dark:border-purple-700',
    },
    fuchsia: {
      bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
      icon: 'bg-fuchsia-500',
      text: 'text-fuchsia-600 dark:text-fuchsia-400',
      border: 'border-fuchsia-300 dark:border-fuchsia-700',
    },
  };

  const colors = colorClasses[color];

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all tap-highlight active-scale",
        isActive && `border-2 ${colors.border} ${colors.bg}`
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn(
            "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center",
            colors.icon
          )}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <p className={cn("text-xl sm:text-2xl font-bold", colors.text)}>{count}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{title}</p>
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
      "glass-card tap-highlight active-scale transition-all",
      announcement.isActive && !status.isExpired && !status.isScheduled && "border-violet-300 dark:border-violet-700"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            announcement.isActive && !status.isExpired 
              ? "bg-violet-100 dark:bg-violet-900/30" 
              : "bg-muted"
          )}>
            {announcement.type === 'promo' && <Tag className={cn("w-5 h-5", status.color)} />}
            {announcement.type === 'broadcast' && <Radio className={cn("w-5 h-5", status.color)} />}
            {announcement.type === 'announcement' && <FileText className={cn("w-5 h-5", status.color)} />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{announcement.title}</p>
              <Badge variant={status.variant} className="text-[10px] gap-1">
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {announcement.description}
            </p>
            
            {/* Status info - countdown or expired badge */}
            {status.countdown && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400">
                  <Timer className="w-3 h-3 mr-1" />
                  {status.countdown}
                </Badge>
              </div>
            )}

            {status.isExpired && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="destructive" className="text-[10px]">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Sudah tidak aktif
                </Badge>
              </div>
            )}

            {status.isScheduled && status.countdown && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                  <Clock className="w-3 h-3 mr-1" />
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
                className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 mt-2 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Lihat Link
              </a>
            )}

            {/* Date range for promo and broadcast */}
            {(announcement.type === 'promo' || announcement.type === 'broadcast') && announcement.startDate && announcement.expireDate && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{formatShortDate(announcement.startDate)} - {formatShortDate(announcement.expireDate)}</span>
              </div>
            )}
            
            {/* Running text preview for announcement */}
            {announcement.type === 'announcement' && announcement.isActive && !status.isExpired && (
              <div className="mt-2 bg-violet-50 dark:bg-violet-950/30 rounded-md px-2 py-1.5 border border-violet-100 dark:border-violet-900">
                <p className="text-xs text-violet-700 dark:text-violet-300 truncate">
                  📢 {announcement.description}
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Dibuat: {formatDate(announcement.createdAt)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              <EditDialog announcement={announcement} onUpdated={onUpdated} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus {announcement.type}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan. &quot;{announcement.title}&quot; akan dihapus secara permanen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        // Include dates for promo too
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
      case 'promo': return 'Buat promo yang akan dikirim ke partner';
      case 'broadcast': return 'Buat broadcast dengan periode waktu';
      case 'announcement': return 'Buat pengumuman running text di dashboard partner';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-10 w-10 bg-violet-500 hover:bg-violet-600 text-white rounded-xl">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Judul *</Label>
            <Input
              placeholder="Judul"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Deskripsi *</Label>
            <Textarea
              placeholder="Isi deskripsi..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              required
            />
          </div>

          {type === 'promo' && (
            <>
              <div className="space-y-2">
                <Label>Link (G.Drive/Canva) *</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={formData.link}
                  onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Input
                    type="datetime-local"
                    value={formData.expireDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expireDate: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}

          {type === 'broadcast' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal Mulai *</Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai *</Label>
                <Input
                  type="datetime-local"
                  value={formData.expireDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expireDate: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}

          {type === 'announcement' && (
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3 border border-violet-200 dark:border-violet-800">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Running Text</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                    Pengumuman akan ditampilkan sebagai teks berjalan di dashboard partner
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <Label>Aktifkan sekarang</Label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>

          {/* Push Notification Placeholder */}
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Push Notification</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kirim notifikasi ke semua partner saat simpan
                </p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 h-8 text-xs"
                  disabled
                >
                  <Send className="w-3 h-3 mr-1" />
                  Segera Hadir
                </Button>
              </div>
            </div>
          </div>
          
          <Button type="submit" className="w-full bg-violet-500 hover:bg-violet-600 text-white h-11 rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Simpan
          </Button>
        </form>
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
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {announcement.type}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Judul *</Label>
            <Input
              placeholder="Judul"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Deskripsi *</Label>
            <Textarea
              placeholder="Isi deskripsi..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              required
            />
          </div>

          {announcement.type === 'promo' && (
            <>
              <div className="space-y-2">
                <Label>Link (G.Drive/Canva) *</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={formData.link}
                  onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Input
                    type="datetime-local"
                    value={formData.expireDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expireDate: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}

          {announcement.type === 'broadcast' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal Mulai *</Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai *</Label>
                <Input
                  type="datetime-local"
                  value={formData.expireDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expireDate: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}

          {announcement.type === 'announcement' && (
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3 border border-violet-200 dark:border-violet-800">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Running Text Preview</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 line-clamp-2">
                    📢 {formData.description || 'Isi deskripsi...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <Label>Aktif</Label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>

          {/* Push Notification Placeholder */}
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Push Notification</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kirim notifikasi ke semua partner
                </p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 h-8 text-xs"
                  disabled
                >
                  <Send className="w-3 h-3 mr-1" />
                  Segera Hadir
                </Button>
              </div>
            </div>
          </div>
          
          <Button type="submit" className="w-full bg-violet-500 hover:bg-violet-600 text-white h-11 rounded-xl" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan Perubahan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
