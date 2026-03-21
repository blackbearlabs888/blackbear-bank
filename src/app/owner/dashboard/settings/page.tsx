'use client';

import { useEffect, useState, useRef, useSyncExternalStore, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Search,
  Share2,
  Shield,
  LogOut,
  Loader2,
  Save,
  Moon,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Instagram,
  Facebook,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  Monitor,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { invalidateSiteConfigCache } from '@/hooks/use-site-config';

interface OwnerProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  websiteTitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  footerWhatsapp: string | null;
  footerInstagram: string | null;
  footerFacebook: string | null;
  maintenanceMode: boolean;
}

// Custom hook for hydration-safe state
function useAuthHydrated() {
  return useSyncExternalStore(
    useCallback((onStoreChange) => useAuthStore.subscribe(onStoreChange), []),
    () => useAuthStore.getState().hasHydrated,
    () => false
  );
}

export default function OwnerSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrate, logout } = useAuthStore();
  const hasHydrated = useAuthHydrated();
  const { theme, setTheme } = useTheme();
  const redirectAttempted = useRef(false);

  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [logoError, setLogoError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
    websiteTitle: 'Black Bear',
    logoUrl: '',
    faviconUrl: '',
    metaTitle: '',
    metaDescription: '',
    footerWhatsapp: '',
    footerInstagram: '',
    footerFacebook: '',
    maintenanceMode: false,
  });

  // Trigger hydration on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Handle redirects after hydration
  useEffect(() => {
    if (hasHydrated && !redirectAttempted.current) {
      redirectAttempted.current = true;
      
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.role !== 'owner') {
        router.replace('/partner/dashboard');
      }
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // Fetch profile data
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchProfile();
    }
  }, [isAuthenticated, hasHydrated, user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/owner/profile');
      const result = await response.json();
      if (result.success && result.data) {
        setProfile(result.data);
        setFormData({
          name: result.data.name || '',
          email: result.data.email || '',
          avatar: result.data.avatar || '',
          websiteTitle: result.data.websiteTitle || 'Black Bear',
          logoUrl: result.data.logoUrl || '',
          faviconUrl: result.data.faviconUrl || '',
          metaTitle: result.data.metaTitle || '',
          metaDescription: result.data.metaDescription || '',
          footerWhatsapp: result.data.footerWhatsapp || '',
          footerInstagram: result.data.footerInstagram || '',
          footerFacebook: result.data.footerFacebook || '',
          maintenanceMode: result.data.maintenanceMode || false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/owner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Pengaturan berhasil disimpan');
        if (result.data) {
          setProfile(result.data);
        }
        // Invalidate cache so other components get fresh data
        invalidateSiteConfigCache();
      } else {
        toast.error(result.error || 'Gagal menyimpan pengaturan');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset error states when URL changes
    if (field === 'logoUrl') setLogoError(false);
    if (field === 'faviconUrl') setFaviconError(false);
    if (field === 'avatar') setAvatarError(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // Get initials from website title
  const getInitials = (title: string) => {
    const words = title.split(' ').filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return title.substring(0, 2).toUpperCase();
  };

  // Show skeleton during hydration
  if (!hasHydrated) {
    return <SettingsSkeleton />;
  }

  // Don't render if not authenticated
  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Kelola konfigurasi website</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gradient-primary text-white rounded-xl h-10 px-4"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Simpan
        </Button>
      </div>

      {/* Profile Card */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage 
                src={profile?.avatar || user?.avatar} 
                onError={() => setAvatarError(true)}
              />
              <AvatarFallback className="gradient-primary text-white text-lg font-bold">
                {profile?.name?.charAt(0) || user?.name?.charAt(0) || 'O'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{profile?.name || user?.name}</p>
              <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
              <span className="text-xs text-primary font-medium">Owner</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-12">
          <TabsTrigger value="profile" className="flex-col gap-1 py-2">
            <User className="w-4 h-4" />
            <span className="text-[10px]">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="website" className="flex-col gap-1 py-2">
            <Globe className="w-4 h-4" />
            <span className="text-[10px]">Website</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex-col gap-1 py-2">
            <Search className="w-4 h-4" />
            <span className="text-[10px]">SEO</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex-col gap-1 py-2">
            <Share2 className="w-4 h-4" />
            <span className="text-[10px]">Sosial</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex-col gap-1 py-2">
            <Shield className="w-4 h-4" />
            <span className="text-[10px]">Sistem</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Profil Owner</CardTitle>
              <CardDescription className="text-xs">Informasi pemilik website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar Preview */}
              <div className="space-y-3">
                <Label className="text-sm">Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarImage 
                        src={formData.avatar || undefined}
                        onError={() => setAvatarError(true)}
                      />
                      <AvatarFallback className="gradient-primary text-white text-xl font-bold">
                        {formData.name?.charAt(0)?.toUpperCase() || 'O'}
                      </AvatarFallback>
                    </Avatar>
                    {formData.avatar && !avatarError && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      value={formData.avatar}
                      onChange={(e) => handleChange('avatar', e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      URL gambar avatar owner
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm">Nama Lengkap</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nama owner"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Email owner"
                  className="h-11"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Website Tab */}
        <TabsContent value="website" className="space-y-4 mt-4">
          {/* Live Preview Card */}
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Preview</CardTitle>
              </div>
              <CardDescription className="text-xs">Tampilan website Anda</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Browser Tab Preview */}
              <div className="bg-muted/50 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-background rounded-lg px-3 py-1.5 flex items-center gap-2">
                    {formData.faviconUrl && !faviconError ? (
                      <img 
                        src={formData.faviconUrl} 
                        alt="favicon" 
                        className="w-3.5 h-3.5 object-contain"
                        onError={() => setFaviconError(true)}
                      />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-sm gradient-primary flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">
                          {getInitials(formData.websiteTitle)}
                        </span>
                      </div>
                    )}
                    <span className="text-xs truncate max-w-[200px]">
                      {formData.metaTitle || formData.websiteTitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navbar Preview */}
              <div className="bg-background border rounded-xl p-3">
                <div className="flex items-center gap-2">
                  {formData.logoUrl && !logoError ? (
                    <img 
                      src={formData.logoUrl} 
                      alt="logo" 
                      className="w-9 h-9 rounded-xl object-contain"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm">
                        {getInitials(formData.websiteTitle)}
                      </span>
                    </div>
                  )}
                  <span className="font-bold text-lg">{formData.websiteTitle}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pengaturan Website</CardTitle>
              <CardDescription className="text-xs">Konfigurasi tampilan website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Judul Website</Label>
                <Input
                  value={formData.websiteTitle}
                  onChange={(e) => handleChange('websiteTitle', e.target.value)}
                  placeholder="Black Bear"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Nama yang ditampilkan di header dan tab browser</p>
              </div>

              {/* Logo URL with Preview */}
              <div className="space-y-3">
                <Label className="text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  URL Logo
                </Label>
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30 flex-shrink-0">
                    {formData.logoUrl && !logoError ? (
                      <img 
                        src={formData.logoUrl} 
                        alt="Logo preview" 
                        className="w-12 h-12 object-contain rounded-lg"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={formData.logoUrl}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Kosongkan untuk gunakan inisial
                    </p>
                  </div>
                </div>
              </div>

              {/* Favicon URL with Preview */}
              <div className="space-y-3">
                <Label className="text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  URL Favicon
                </Label>
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30 flex-shrink-0">
                    {formData.faviconUrl && !faviconError ? (
                      <img 
                        src={formData.faviconUrl} 
                        alt="Favicon preview" 
                        className="w-8 h-8 object-contain"
                        onError={() => setFaviconError(true)}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-sm gradient-primary flex items-center justify-center">
                        <span className="text-white font-bold text-[8px]">
                          {getInitials(formData.websiteTitle)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={formData.faviconUrl}
                      onChange={(e) => handleChange('faviconUrl', e.target.value)}
                      placeholder="https://example.com/favicon.ico"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ikon di tab browser (16x16 atau 32x32 px)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pengaturan SEO</CardTitle>
              <CardDescription className="text-xs">Optimasi mesin pencari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Meta Title</Label>
                  <span className="text-xs text-muted-foreground">
                    {formData.metaTitle?.length || 0}/60
                  </span>
                </div>
                <Input
                  value={formData.metaTitle}
                  onChange={(e) => handleChange('metaTitle', e.target.value)}
                  placeholder="Black Bear - Layanan Tarik Tunai Terpercaya"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Judul halaman untuk SEO</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Meta Description</Label>
                  <span className="text-xs text-muted-foreground">
                    {formData.metaDescription?.length || 0}/160
                  </span>
                </div>
                <Textarea
                  value={formData.metaDescription}
                  onChange={(e) => handleChange('metaDescription', e.target.value)}
                  placeholder="Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat dan aman."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Deskripsi halaman untuk SEO</p>
              </div>

              {/* SEO Preview */}
              <div className="mt-4 p-4 rounded-xl bg-white dark:bg-muted/30 border">
                <div className="flex items-center gap-1.5 mb-3">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Google Search Preview</span>
                </div>
                <div className="space-y-1.5">
                  {/* Meta Title */}
                  <p className="text-blue-600 dark:text-blue-400 text-lg font-medium truncate hover:underline cursor-pointer">
                    {formData.metaTitle || `${formData.websiteTitle} - Layanan Tarik Tunai Terpercaya`}
                  </p>
                  {/* URL */}
                  <div className="flex items-center gap-1.5">
                    {formData.faviconUrl && !faviconError ? (
                      <img 
                        src={formData.faviconUrl} 
                        alt="favicon" 
                        className="w-4 h-4 object-contain rounded-sm"
                        onError={() => setFaviconError(true)}
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-sm gradient-primary flex items-center justify-center">
                        <span className="text-white font-bold text-[6px]">
                          {getInitials(formData.websiteTitle)}
                        </span>
                      </div>
                    )}
                    <p className="text-emerald-700 dark:text-emerald-400 text-xs truncate">
                      {formData.websiteTitle.toLowerCase().replace(/\s+/g, '')}.id
                    </p>
                    <span className="text-muted-foreground text-xs">›</span>
                  </div>
                  {/* Meta Description */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 leading-relaxed">
                    {formData.metaDescription || 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat dan aman.'}
                  </p>
                </div>
                {/* Character count indicators */}
                <div className="mt-3 pt-3 border-t flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      (formData.metaTitle?.length || 0) <= 60 ? "bg-green-500" : "bg-amber-500"
                    )} />
                    <span className="text-[10px] text-muted-foreground">
                      Title: {formData.metaTitle?.length || 0}/60
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      (formData.metaDescription?.length || 0) <= 160 ? "bg-green-500" : "bg-amber-500"
                    )} />
                    <span className="text-[10px] text-muted-foreground">
                      Desc: {formData.metaDescription?.length || 0}/160
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="space-y-4 mt-4">
          {/* Footer Preview Card */}
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Preview Footer</CardTitle>
              </div>
              <CardDescription className="text-xs">Tampilan footer website</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mock Footer Preview */}
              <div className="bg-muted/30 rounded-xl p-4 border">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {/* Brand Section */}
                  <div className="col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 mb-2">
                      {formData.logoUrl && !logoError ? (
                        <img 
                          src={formData.logoUrl} 
                          alt="logo" 
                          className="w-6 h-6 rounded-lg object-contain"
                          onError={() => setLogoError(true)}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center">
                          <span className="text-white font-bold text-[8px]">
                            {getInitials(formData.websiteTitle)}
                          </span>
                        </div>
                      )}
                      <span className="font-semibold text-sm">{formData.websiteTitle}</span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-[10px]">
                      {formData.metaDescription?.substring(0, 60) || 'Layanan tarik tunai terpercaya...'}
                    </p>
                  </div>
                  
                  {/* Social Section */}
                  <div className="text-right">
                    <p className="font-medium mb-2 text-[10px]">Follow Us</p>
                    <div className="flex gap-2 justify-end">
                      {formData.footerWhatsapp ? (
                        <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Smartphone className="w-3 h-3 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                          <Smartphone className="w-3 h-3 text-muted-foreground/50" />
                        </div>
                      )}
                      {formData.footerInstagram ? (
                        <div className="w-6 h-6 rounded-lg bg-pink-500/10 flex items-center justify-center">
                          <Instagram className="w-3 h-3 text-pink-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                          <Instagram className="w-3 h-3 text-muted-foreground/50" />
                        </div>
                      )}
                      {formData.footerFacebook ? (
                        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Facebook className="w-3 h-3 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                          <Facebook className="w-3 h-3 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Bottom */}
                <div className="mt-4 pt-3 border-t flex justify-between items-center">
                  <p className="text-[9px] text-muted-foreground">
                    © {new Date().getFullYear()} {formData.websiteTitle}
                  </p>
                  <div className="flex gap-2">
                    {formData.footerWhatsapp && (
                      <a 
                        href={`https://wa.me/${formData.footerWhatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-primary hover:underline"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tautan Sosial</CardTitle>
              <CardDescription className="text-xs">Kontak dan media sosial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  WhatsApp
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.footerWhatsapp}
                    onChange={(e) => handleChange('footerWhatsapp', e.target.value)}
                    placeholder="628123456789"
                    className="h-11 flex-1"
                  />
                  {formData.footerWhatsapp && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 flex-shrink-0"
                      asChild
                    >
                      <a 
                        href={`https://wa.me/${formData.footerWhatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Nomor WhatsApp (format: kode negara + nomor)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.footerInstagram}
                    onChange={(e) => handleChange('footerInstagram', e.target.value)}
                    placeholder="https://instagram.com/username"
                    className="h-11 flex-1"
                  />
                  {formData.footerInstagram && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 flex-shrink-0"
                      asChild
                    >
                      <a 
                        href={formData.footerInstagram}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">URL profil Instagram</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.footerFacebook}
                    onChange={(e) => handleChange('footerFacebook', e.target.value)}
                    placeholder="https://facebook.com/username"
                    className="h-11 flex-1"
                  />
                  {formData.footerFacebook && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 flex-shrink-0"
                      asChild
                    >
                      <a 
                        href={formData.footerFacebook}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">URL profil Facebook</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pengaturan Sistem</CardTitle>
              <CardDescription className="text-xs">Konfigurasi lanjutan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Maintenance Mode */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    formData.maintenanceMode ? "bg-destructive/10" : "bg-muted"
                  )}>
                    <AlertCircle className={cn(
                      "w-5 h-5",
                      formData.maintenanceMode ? "text-destructive" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Mode Maintenance</p>
                    <p className="text-xs text-muted-foreground">
                      Sembunyikan website dari publik
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.maintenanceMode}
                  onCheckedChange={(checked) => handleChange('maintenanceMode', checked)}
                />
              </div>

              {/* Dark Mode */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Mode Gelap</p>
                    <p className="text-xs text-muted-foreground">
                      Tampilan aplikasi gelap
                    </p>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="glass-card border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-destructive">Zona Berbahaya</CardTitle>
              <CardDescription className="text-xs">Aksi yang tidak dapat dibatalkan</CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-smooth tap-highlight"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-destructive">Keluar</p>
                  <p className="text-xs text-muted-foreground">Logout dari akun owner</p>
                </div>
              </button>
            </CardContent>
          </Card>

          {/* Version Info */}
          <div className="text-center text-xs text-muted-foreground pt-4">
            {formData.websiteTitle} v1.0.0 • Owner Panel
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
