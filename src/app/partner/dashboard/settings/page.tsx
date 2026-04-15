'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CitySearch } from '@/components/ui/city-search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Moon,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Target,
  Wallet,
  User,
  Lock,
  Image as ImageIcon,
  MapPin,
  Building2,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function PartnerSettingsPage() {
  const router = useRouter();
  const { user, partner, isAuthenticated, isLoading, hasHydrated, hydrate, logout, setPartner, setUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const redirectAttempted = useRef(false);

  // Password change state
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Avatar change state
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Location change state
  const [locationOpen, setLocationOpen] = useState(false);
  const [city, setCity] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  // Bank change state
  const [bankOpen, setBankOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [customBankName, setCustomBankName] = useState('');

  const banks = [
    'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon',
    'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
  ];

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
    // Initialize form values from partner data
    if (partner) {
      setCity(partner.city || '');
      setBankAccount(partner.bankAccount || '');
      setBankHolder(partner.bankHolder || '');

      // Check if partner's bank is in the list
      const currentBank = partner.bankName || '';
      if (banks.includes(currentBank)) {
        setSelectedBank(currentBank);
        setBankName(currentBank);
        setCustomBankName('');
      } else if (currentBank.startsWith('Lainnya:')) {
        setSelectedBank('Lainnya');
        setCustomBankName(currentBank.replace('Lainnya: ', ''));
        setBankName(currentBank);
      } else {
        setSelectedBank('Lainnya');
        setCustomBankName(currentBank);
        setBankName(currentBank);
      }
    }
    if (user) {
      setAvatarUrl(user.avatar || '');
    }
  }, [partner, user]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Password change handler
  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Semua field harus diisi');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Password baru tidak cocok');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/partner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Password berhasil diubah');
        setPasswordOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Avatar change handler
  const handleAvatarChange = async () => {
    if (!avatarUrl.trim()) {
      toast.error('URL avatar tidak boleh kosong');
      return;
    }

    // Validate URL format
    try {
      new URL(avatarUrl);
    } catch {
      toast.error('URL tidak valid');
      return;
    }

    setAvatarLoading(true);
    try {
      const response = await fetch('/api/partner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Avatar berhasil diubah');
        setUser({ ...user!, avatar: avatarUrl });
        setAvatarOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah avatar');
    } finally {
      setAvatarLoading(false);
    }
  };

  // Location change handler
  const handleLocationChange = async () => {
    if (!city.trim()) {
      toast.error('Kota tidak boleh kosong');
      return;
    }

    setLocationLoading(true);
    try {
      const response = await fetch('/api/partner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Lokasi berhasil diubah');
        setPartner({ ...partner!, city });
        setLocationOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah lokasi');
    } finally {
      setLocationLoading(false);
    }
  };

  // Bank change handler
  const handleBankChange = async () => {
    const finalBankName = selectedBank === 'Lainnya' ? customBankName.trim() : selectedBank;

    if (!finalBankName || !bankAccount.trim() || !bankHolder.trim()) {
      toast.error('Semua field bank harus diisi');
      return;
    }

    if (selectedBank === 'Lainnya' && !customBankName.trim()) {
      toast.error('Nama bank harus diisi');
      return;
    }

    setBankLoading(true);
    try {
      const response = await fetch('/api/partner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: finalBankName,
          bankAccount,
          bankHolder,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Info bank berhasil diubah');
        setPartner({ 
          ...partner!, 
          bankName: finalBankName, 
          bankAccount, 
          bankHolder 
        });
        setBankOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah info bank');
    } finally {
      setBankLoading(false);
    }
  };

  if (isLoading || !hasHydrated) {
    return (
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 pb-20 md:pb-6 max-w-4xl">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'partner') {
    return null;
  }

  const progressPercent = Math.min(((partner?.totalProfit || 0) / (partner?.target || 1)) * 100, 100);

  return (
    <div className="min-h-screen bg-background dashboard-mesh">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Pengaturan</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-xs text-muted-foreground">Kelola profil & preferensi</p>
      </div>

      {/* ── Profile Card ── */}
      <Card className="rounded-xl border border-border/60 shadow-none bg-card overflow-hidden">
        <div className="h-1 bg-primary" />
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={`${user.name}'s avatar`}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-2xl">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <button
                onClick={() => setAvatarOpen(true)}
                className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ImageIcon className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user?.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-primary text-primary-foreground text-xs">{partner?.tier}</Badge>
                <Badge variant="outline" className="text-xs">{partner?.commission}% Komisi</Badge>
              </div>
            </div>
          </div>

          {/* Target Progress */}
          <div className="mt-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium">Progress Target</span>
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{formatCurrency(partner?.totalProfit || 0)}</span>
              <span>Target: {formatCurrency(partner?.target || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section: Account Info ── */}
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Informasi Akun</p>

      <Card className="rounded-xl border border-border/60 shadow-none bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Email dan nama tidak dapat diubah</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
              <p className="font-medium truncate mt-0.5">{user?.email}</p>
            </div>
            <div>
              <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nama</Label>
              <p className="font-medium truncate mt-0.5">{user?.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section: Settings ── */}
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Pengaturan</p>

      <div className="space-y-3">
        {/* Password */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card tap-highlight active-scale cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setPasswordOpen(true)}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ubah Password</p>
                  <p className="text-xs text-muted-foreground">Ganti password akun</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Avatar */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card tap-highlight active-scale cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setAvatarOpen(true)}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ganti Avatar</p>
                  <p className="text-xs text-muted-foreground">Ubah foto profil via URL</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card tap-highlight active-scale cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setLocationOpen(true)}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ganti Lokasi</p>
                  <p className="text-xs text-muted-foreground">{partner?.city || 'Belum diatur'}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Bank Info */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card tap-highlight active-scale cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setBankOpen(true)}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Info Bank</p>
                  <p className="text-xs text-muted-foreground">{partner?.bankName} • {partner?.bankAccount}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="rounded-xl border border-border/60 shadow-none bg-card">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Mode Gelap</p>
                  <p className="text-xs text-muted-foreground">Ubah tampilan</p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                size="md"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section: Account ── */}
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Akun</p>

      {/* Logout */}
      <Card className="rounded-xl border border-destructive/20 shadow-none bg-card">
        <CardContent className="p-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 text-destructive tap-highlight active-scale hover:bg-destructive/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Keluar</p>
              <p className="text-xs text-muted-foreground">Logout dari akun</p>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground pt-4">
        Black Bear v1.0.0
      </p>

      {/* ── Password Change Dialog ── */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
              Ubah Password
            </DialogTitle>
            <DialogDescription>
              Masukkan password lama dan password baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Password Saat Ini</Label>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="pr-10 h-9 text-xs rounded-lg"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Password Baru</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="h-9 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Konfirmasi Password</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="h-9 text-xs rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setPasswordOpen(false)} 
                className="flex-1 rounded-lg h-9 text-xs font-medium"
              >
                Batal
              </Button>
              <Button 
                className="flex-1 rounded-xl h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handlePasswordChange}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Avatar Change Dialog ── */}
      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Ganti Avatar
            </DialogTitle>
            <DialogDescription>
              Masukkan URL gambar untuk avatar Anda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Preview */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">URL Gambar</Label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="h-9 text-xs rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Gunakan URL gambar dari Google Drive, Imgur, atau hosting lainnya
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setAvatarOpen(false)} 
                className="flex-1 rounded-lg h-9 text-xs font-medium"
              >
                Batal
              </Button>
              <Button 
                className="flex-1 rounded-xl h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleAvatarChange}
                disabled={avatarLoading}
              >
                {avatarLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Location Change Dialog ── */}
      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Ganti Lokasi
            </DialogTitle>
            <DialogDescription>
              Perbarui kota atau lokasi Anda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Kota / Lokasi</Label>
              <CitySearch
                value={city}
                onChange={(value) => setCity(value)}
                placeholder="Cari kota..."
                className="h-9 text-xs rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setLocationOpen(false)} 
                className="flex-1 rounded-lg h-9 text-xs font-medium"
              >
                Batal
              </Button>
              <Button 
                className="flex-1 rounded-xl h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleLocationChange}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bank Change Dialog ── */}
      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Info Bank Pencairan
            </DialogTitle>
            <DialogDescription>
              Rekening untuk pencairan komisi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Nama Bank</Label>
              {selectedBank === 'Lainnya' ? (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      placeholder="Masukkan nama bank"
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg"
                    onClick={() => {
                      setSelectedBank('');
                      setCustomBankName('');
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Select
                  value={selectedBank}
                  onValueChange={(value) => {
                    setSelectedBank(value);
                    if (value !== 'Lainnya') {
                      setCustomBankName('');
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue placeholder="Pilih bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nomor Rekening</Label>
              <Input
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="1234567890"
                className="h-9 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nama Pemilik Rekening</Label>
              <Input
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="Nama sesuai rekening"
                className="h-9 text-xs rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setBankOpen(false)} 
                className="flex-1 rounded-lg h-9 text-xs font-medium"
              >
                Batal
              </Button>
              <Button 
                className="flex-1 rounded-xl h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleBankChange}
                disabled={bankLoading}
              >
                {bankLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  </div>
</div>
  );
}
