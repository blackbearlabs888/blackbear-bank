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
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function PartnerSettingsPage() {
  const router = useRouter();
  const { user, partner, isAuthenticated, isLoading, hasHydrated, hydrate, logout, setPartner, setUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
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
      setBankName(partner.bankName || '');
      setBankAccount(partner.bankAccount || '');
      setBankHolder(partner.bankHolder || '');
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
      toast({
        title: 'Error',
        description: 'Semua field harus diisi',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Password baru tidak cocok',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password minimal 6 karakter',
        variant: 'destructive',
      });
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
        toast({
          title: 'Berhasil!',
          description: 'Password berhasil diubah',
        });
        setPasswordOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengubah password',
        variant: 'destructive',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Avatar change handler
  const handleAvatarChange = async () => {
    if (!avatarUrl.trim()) {
      toast({
        title: 'Error',
        description: 'URL avatar tidak boleh kosong',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL format
    try {
      new URL(avatarUrl);
    } catch {
      toast({
        title: 'Error',
        description: 'URL tidak valid',
        variant: 'destructive',
      });
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
        toast({
          title: 'Berhasil!',
          description: 'Avatar berhasil diubah',
        });
        setUser({ ...user!, avatar: avatarUrl });
        setAvatarOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengubah avatar',
        variant: 'destructive',
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  // Location change handler
  const handleLocationChange = async () => {
    if (!city.trim()) {
      toast({
        title: 'Error',
        description: 'Kota tidak boleh kosong',
        variant: 'destructive',
      });
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
        toast({
          title: 'Berhasil!',
          description: 'Lokasi berhasil diubah',
        });
        setPartner({ ...partner!, city });
        setLocationOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengubah lokasi',
        variant: 'destructive',
      });
    } finally {
      setLocationLoading(false);
    }
  };

  // Bank change handler
  const handleBankChange = async () => {
    if (!bankName.trim() || !bankAccount.trim() || !bankHolder.trim()) {
      toast({
        title: 'Error',
        description: 'Semua field bank harus diisi',
        variant: 'destructive',
      });
      return;
    }

    setBankLoading(true);
    try {
      const response = await fetch('/api/partner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName,
          bankAccount,
          bankHolder,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Berhasil!',
          description: 'Info bank berhasil diubah',
        });
        setPartner({ 
          ...partner!, 
          bankName, 
          bankAccount, 
          bankHolder 
        });
        setBankOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengubah info bank',
        variant: 'destructive',
      });
    } finally {
      setBankLoading(false);
    }
  };

  if (isLoading || !hasHydrated) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
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
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Kelola profil & preferensi</p>
      </div>

      {/* Profile Card */}
      <Card className="glass-card overflow-hidden">
        <div className="h-1 gradient-primary" />
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={`${user.name}'s avatar`}
                  className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">
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
                <Badge className="gradient-primary text-white text-xs">{partner?.tier}</Badge>
                <Badge variant="outline" className="text-xs">{partner?.commission}% Komisi</Badge>
              </div>
            </div>
          </div>

          {/* Target Progress */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Progress Target</span>
              </div>
              <span className="text-sm font-bold">{progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{formatCurrency(partner?.totalProfit || 0)}</span>
              <span>Target: {formatCurrency(partner?.target || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info - Read Only */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>Email dan nama tidak dapat diubah</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="font-medium truncate">{user?.email}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Nama</Label>
              <p className="font-medium truncate">{user?.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings List */}
      <div className="space-y-2">
        {/* Password */}
        <Card className="glass-card tap-highlight active-scale cursor-pointer" onClick={() => setPasswordOpen(true)}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-red-600" />
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
        <Card className="glass-card tap-highlight active-scale cursor-pointer" onClick={() => setAvatarOpen(true)}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
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
        <Card className="glass-card tap-highlight active-scale cursor-pointer" onClick={() => setLocationOpen(true)}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
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
        <Card className="glass-card tap-highlight active-scale cursor-pointer" onClick={() => setBankOpen(true)}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-600" />
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
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Mode Gelap</p>
                  <p className="text-xs text-muted-foreground">Ubah tampilan</p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logout */}
      <Card className="glass-card border-destructive/20">
        <CardContent className="p-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 text-destructive tap-highlight active-scale"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
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

      {/* Password Change Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Ubah Password
            </DialogTitle>
            <DialogDescription>
              Masukkan password lama dan password baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Password Saat Ini</Label>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="pr-10 rounded-xl"
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
              <Label>Password Baru</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Konfirmasi Password</Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setPasswordOpen(false)} 
                className="flex-1 rounded-xl"
              >
                Batal
              </Button>
              <Button 
                className="flex-1 gradient-primary text-white rounded-xl"
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

      {/* Avatar Change Dialog */}
      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Ganti Avatar
            </DialogTitle>
            <DialogDescription>
              Masukkan URL gambar untuk avatar Anda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label>URL Gambar</Label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Gunakan URL gambar dari Google Drive, Imgur, atau hosting lainnya
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setAvatarOpen(false)} 
                className="flex-1 rounded-xl"
              >
                Batal
              </Button>
              <Button 
                className="flex-1 gradient-primary text-white rounded-xl"
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

      {/* Location Change Dialog */}
      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Ganti Lokasi
            </DialogTitle>
            <DialogDescription>
              Perbarui kota atau lokasi Anda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kota / Lokasi</Label>
              <CitySearch
                value={city}
                onChange={(value) => setCity(value)}
                placeholder="Cari kota..."
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setLocationOpen(false)} 
                className="flex-1 rounded-xl"
              >
                Batal
              </Button>
              <Button 
                className="flex-1 gradient-primary text-white rounded-xl"
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

      {/* Bank Change Dialog */}
      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Info Bank Pencairan
            </DialogTitle>
            <DialogDescription>
              Rekening untuk pencairan komisi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Bank</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="BCA, Mandiri, BNI, dll"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor Rekening</Label>
              <Input
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="1234567890"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Pemilik Rekening</Label>
              <Input
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="Nama sesuai rekening"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setBankOpen(false)} 
                className="flex-1 rounded-xl"
              >
                Batal
              </Button>
              <Button 
                className="flex-1 gradient-primary text-white rounded-xl"
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
  );
}
