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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Trophy,
  TrendingUp,
  ChevronRight,
  Crown,
  Star,
  UserPlus,
  Loader2,
  Medal,
  Target,
  Settings,
  Key,
  Building2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  BarChart3,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
} from 'lucide-react';
import { formatCurrency, formatDate, formatShortDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  city: string;
  commission: number;
  target: number;
  tier: string;
  badge: string;
  status: string;
  totalProfit: number;
  totalVolume: number;
  totalTransactions: number;
  notes: string | null;
  joinedAt: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
  rankingHistory?: Array<{
    id: string;
    month: string;
    profit: number;
    volume: number;
    transactions: number;
    rank: number | null;
    badge: string | null;
  }>;
  _count?: {
    transactions: number;
    customers: number;
  };
  monthlyStats?: {
    volume: number;
    profit: number;
    transactions: number;
  };
}

export default function OwnerPartnersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
      fetchPartners();
    }
  }, [isAuthenticated, hasHydrated, user]);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners');
      const result = await response.json();
      if (result.success) {
        setPartners(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      toast.error('Gagal memuat data partner');
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = partners.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(searchLower) ||
      p.email?.toLowerCase().includes(searchLower) ||
      p.city?.toLowerCase().includes(searchLower)
    );
  });

  const activePartners = partners.filter((p) => p.status === 'active');
  const totalVolume = partners.reduce((sum, p) => sum + (p.totalVolume || 0), 0);
  const totalProfit = partners.reduce((sum, p) => sum + (p.totalProfit || 0), 0);

  // Sort partners by profit for top ranking
  const topPartners = [...partners]
    .sort((a, b) => (b.totalProfit || 0) - (a.totalProfit || 0))
    .slice(0, 5);

  // Count partners by tier
  const tierCounts = {
    Bronze: partners.filter((p) => p.tier === 'Bronze').length,
    Silver: partners.filter((p) => p.tier === 'Silver').length,
    Gold: partners.filter((p) => p.tier === 'Gold').length,
    Platinum: partners.filter((p) => p.tier === 'Platinum').length,
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
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
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
          <h1 className="text-xl sm:text-2xl font-bold">Partner</h1>
          <p className="text-sm text-muted-foreground">Kelola mitra aktif</p>
        </div>
        <NewPartnerDialog onCreated={fetchPartners} />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Partner Aktif</p>
                <p className="text-lg font-bold">{activePartners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Volume</p>
                <p className="text-sm font-bold">{formatCurrency(totalVolume)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className="text-sm font-bold">{formatCurrency(totalProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Transaksi</p>
                <p className="text-lg font-bold">
                  {partners.reduce((sum, p) => sum + (p.totalTransactions || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Partners Card */}
      <Card className="glass-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Top Partner (by Profit)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {topPartners.length > 0 ? (
            <div className="space-y-2">
              {topPartners.map((partner, index) => (
                <TopPartnerItem key={partner.id} partner={partner} rank={index + 1} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada data partner
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tier Statistics Card */}
      <Card className="glass-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Medal className="w-5 h-5 text-primary" />
            Statistik Tier
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <TierBadge tier="Bronze" count={tierCounts.Bronze} color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" />
            <TierBadge tier="Silver" count={tierCounts.Silver} color="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" />
            <TierBadge tier="Gold" count={tierCounts.Gold} color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" />
            <TierBadge tier="Platinum" count={tierCounts.Platinum} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" />
          </div>
          <div className="mt-3 h-4 rounded-full overflow-hidden flex">
            {Object.entries(tierCounts).map(([tier, count]) => {
              const total = Object.values(tierCounts).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const colors: Record<string, string> = {
                Bronze: 'bg-orange-400',
                Silver: 'bg-gray-400',
                Gold: 'bg-yellow-400',
                Platinum: 'bg-purple-400',
              };
              return percentage > 0 ? (
                <div
                  key={tier}
                  className={cn(colors[tier], 'h-full')}
                  style={{ width: `${percentage}%` }}
                />
              ) : null;
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, email, atau kota partner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Partner List */}
      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : filteredPartners.length > 0 ? (
          filteredPartners.map((partner, index) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              rank={index + 1}
              onUpdate={fetchPartners}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada partner ditemukan</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Top Partner Item Component
function TopPartnerItem({ partner, rank }: { partner: Partner; rank: number }) {
  const getRankStyle = (rank: number) => {
    if (rank === 1) return { icon: Crown, class: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
    if (rank === 2) return { icon: Trophy, class: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/50' };
    if (rank === 3) return { icon: Medal, class: 'text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    return { icon: Star, class: 'text-muted-foreground', bg: 'bg-muted/50' };
  };

  const style = getRankStyle(rank);
  const RankIcon = style.icon;

  return (
    <div className={cn('flex items-center gap-3 p-2 rounded-lg', style.bg)}>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', style.class)}>
        <RankIcon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{partner.name}</p>
          <Badge variant="outline" className="text-[10px]">{partner.tier}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{partner.totalTransactions} transaksi</p>
      </div>
      <p className="text-sm font-bold text-primary">{formatCurrency(partner.totalProfit)}</p>
    </div>
  );
}

// Tier Badge Component
function TierBadge({ tier, count, color }: { tier: string; count: number; color: string }) {
  return (
    <div className={cn('px-3 py-1.5 rounded-full flex items-center gap-2', color)}>
      <span className="text-sm font-medium">{tier}</span>
      <span className="text-sm font-bold">{count}</span>
    </div>
  );
}

// Partner Card Component with Progress Bar
function PartnerCard({
  partner,
  rank,
  onUpdate,
}: {
  partner: Partner;
  rank: number;
  onUpdate: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Crown, class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    if (rank === 2) return { icon: Trophy, class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
    if (rank === 3) return { icon: Star, class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    return null;
  };

  const badge = getRankBadge(rank);

  // Calculate progress based on profit (not volume)
  const progress = partner.target > 0 ? Math.min(100, (partner.totalProfit / partner.target) * 100) : 0;
  const progressColor = progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-400';

  const isSuspended = partner.status === 'suspended';

  return (
    <>
      <Card className={cn('glass-card overflow-hidden tap-highlight active-scale', isSuspended && 'opacity-60')}>
        <CardContent className="p-0">
          <div
            className="flex items-center gap-3 p-3 cursor-pointer"
            onClick={() => setShowDetail(true)}
          >
            {/* Rank */}
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold',
                badge ? badge.class : 'bg-muted text-muted-foreground'
              )}
            >
              {badge ? <badge.icon className="w-5 h-5" /> : rank}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{partner.name}</p>
                <Badge variant="outline" className="text-[10px]">{partner.tier}</Badge>
                {isSuspended && (
                  <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{partner.city}</p>

              {/* Progress Bar */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Target Progress</span>
                  <span className="font-medium">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full transition-all duration-300', progressColor)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex flex-col items-end gap-1">
              <p className="text-sm font-bold text-primary">{formatCurrency(partner.totalProfit)}</p>
              <p className="text-xs text-muted-foreground">{partner.totalTransactions} transaksi</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEdit(true);
                }}
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <PartnerDetailDialog
        partner={partner}
        open={showDetail}
        onOpenChange={setShowDetail}
        onEdit={() => {
          setShowDetail(false);
          setShowEdit(true);
        }}
      />

      {/* Edit Dialog */}
      <EditPartnerDialog
        partner={partner}
        open={showEdit}
        onOpenChange={setShowEdit}
        onSuccess={() => {
          onUpdate();
        }}
      />
    </>
  );
}

// Partner Detail Dialog
function PartnerDetailDialog({
  partner,
  open,
  onOpenChange,
  onEdit,
}: {
  partner: Partner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  const [detailedPartner, setDetailedPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && partner.id) {
      fetchPartnerDetail();
    }
  }, [open, partner.id]);

  const fetchPartnerDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/partners/${partner.id}`);
      const result = await response.json();
      if (result.success) {
        setDetailedPartner(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch partner detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const data = detailedPartner || partner;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Detail Partner
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {data.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{data.name}</h3>
                  <Badge variant="outline">{data.tier}</Badge>
                  {data.status === 'suspended' && (
                    <Badge variant="destructive">Suspended</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{data.email}</p>
              </div>
            </div>

            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm">Informasi Kontak</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{data.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{data.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{data.city}</span>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm">Informasi Rekening</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{data.bankName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{data.bankAccount}</p>
                    <p className="text-xs text-muted-foreground">a.n. {data.bankHolder}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm">Statistik</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total Volume</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(data.totalVolume)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total Profit</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(data.totalProfit)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Transaksi</p>
                    <p className="text-lg font-bold">{data.totalTransactions}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Komisi</p>
                    <p className="text-lg font-bold">{data.commission}%</p>
                  </div>
                </div>

                {/* Monthly Stats */}
                {detailedPartner?.monthlyStats && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Bulan Ini</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="text-sm font-medium">{formatCurrency(detailedPartner.monthlyStats.volume)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Profit</p>
                        <p className="text-sm font-medium">{formatCurrency(detailedPartner.monthlyStats.profit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Transaksi</p>
                        <p className="text-sm font-medium">{detailedPartner.monthlyStats.transactions}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Target Progress */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Target Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target Bulanan</span>
                    <span className="font-medium">{formatCurrency(data.target)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profit Saat Ini</span>
                    <span className="font-medium">{formatCurrency(data.totalProfit)}</span>
                  </div>
                  <Progress
                    value={data.target > 0 ? Math.min(100, (data.totalProfit / data.target) * 100) : 0}
                    className="h-3"
                  />
                  <p className="text-right text-sm font-medium">
                    {data.target > 0 ? ((data.totalProfit / data.target) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {data.notes && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm">Catatan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Joined Date */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Bergabung: {formatShortDate(data.joinedAt)}</span>
            </div>

            {/* Edit Button */}
            <Button
              className="w-full gradient-primary text-white"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Partner
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Edit Partner Dialog
function EditPartnerDialog({
  partner,
  open,
  onOpenChange,
  onSuccess,
}: {
  partner: Partner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tier: partner.tier,
    target: partner.target.toString(),
    status: partner.status,
    notes: partner.notes || '',
    commission: partner.commission.toString(),
  });
  const [newPassword, setNewPassword] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
      tier: partner.tier,
      target: partner.target.toString(),
      status: partner.status,
      notes: partner.notes || '',
      commission: partner.commission.toString(),
    });
    setNewPassword(null);
  }, [partner, open]);

  const handleGeneratePassword = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatePassword: true }),
      });

      const result = await response.json();
      if (result.success) {
        setNewPassword(result.newPassword);
        toast.success('Password baru berhasil dibuat');
      } else {
        toast.error(result.error || 'Gagal membuat password');
      }
    } catch (err) {
      console.error('Failed to generate password:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: formData.tier,
          target: parseFloat(formData.target),
          status: formData.status,
          notes: formData.notes,
          commission: parseFloat(formData.commission),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Partner berhasil diperbarui');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || 'Gagal memperbarui partner');
      }
    } catch (err) {
      console.error('Failed to update partner:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Edit Partner
          </DialogTitle>
          <DialogDescription>
            Edit pengaturan untuk {partner.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password Section */}
          <div className="space-y-3 p-3 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Password</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Generate Random
              </Button>
            </div>
            {newPassword && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Password baru:</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold">{newPassword}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      toast.success('Password disalin ke clipboard');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2">
              {formData.status === 'active' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <Label className="text-sm font-medium">
                Status: {formData.status === 'active' ? 'Aktif' : 'Suspended'}
              </Label>
            </div>
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, status: checked ? 'active' : 'suspended' }))
              }
            />
          </div>

          {/* Tier & Commission */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select
                value={formData.tier}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Komisi (%)</Label>
              <Input
                type="number"
                value={formData.commission}
                onChange={(e) => setFormData((prev) => ({ ...prev, commission: e.target.value }))}
              />
            </div>
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label>Target Bulanan</Label>
            <Input
              type="number"
              value={formData.target}
              onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              placeholder="Tambahkan catatan tentang partner ini..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-primary text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// New Partner Dialog
function NewPartnerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    city: '',
    tier: 'Bronze',
    commission: '30',
    target: '5000000',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          commission: parseInt(formData.commission),
          target: parseInt(formData.target),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        setFormData({
          name: '',
          email: '',
          phone: '',
          bankName: '',
          bankAccount: '',
          bankHolder: '',
          city: '',
          tier: 'Bronze',
          commission: '30',
          target: '5000000',
        });
        toast.success('Partner berhasil dibuat');
      } else {
        toast.error(result.error || 'Gagal membuat partner');
      }
    } catch (err) {
      console.error('Failed to create partner:', err);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partner Baru</DialogTitle>
          <DialogDescription>Tambahkan mitra baru ke sistem</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                placeholder="Nama partner"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>No. WhatsApp *</Label>
              <Input
                placeholder="08xxx"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="email@contoh.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Kota *</Label>
            <Input
              placeholder="Kota domisili"
              value={formData.city}
              onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Informasi Rekening</p>
            <div className="space-y-2">
              <Label>Nama Bank *</Label>
              <Input
                placeholder="contoh: BCA, Mandiri, BRI"
                value={formData.bankName}
                onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>No. Rekening *</Label>
                <Input
                  placeholder="1234567890"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bankAccount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nama di Rekening *</Label>
                <Input
                  placeholder="Nama pemilik"
                  value={formData.bankHolder}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bankHolder: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select
                value={formData.tier}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Komisi (%)</Label>
              <Input
                type="number"
                placeholder="30"
                value={formData.commission}
                onChange={(e) => setFormData((prev) => ({ ...prev, commission: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Input
                type="number"
                placeholder="5000000"
                value={formData.target}
                onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-white h-11 rounded-xl"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Partner'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
