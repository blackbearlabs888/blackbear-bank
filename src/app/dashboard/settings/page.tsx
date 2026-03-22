'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Palette, Globe, Phone, Wrench, Loader2, Save } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const redirectAttempted = useRef(false);

  const [maintenance, setMaintenance] = useState(false);

  // Use user data directly for initial profile values - update via useMemo to avoid setState in effect
  const profileValues = {
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
  };
  
  const [profile, setProfile] = useState(profileValues);

  const [brand, setBrand] = useState({
    websiteTitle: 'Black Bear',
    logoUrl: '',
    faviconUrl: '',
  });

  const [seo, setSeo] = useState({
    metaTitle: '',
    metaDescription: '',
  });

  const [contact, setContact] = useState({
    whatsapp: '',
    instagram: '',
    facebook: '',
  });

  useEffect(() => {
    if (!hasHydrated) {
      hydrate();
    }
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !isAuthenticated && !redirectAttempted.current) {
      redirectAttempted.current = true;
      router.replace('/login');
    }
  }, [hasHydrated, isLoading, isAuthenticated, router]);

  if (isLoading || !hasHydrated) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleSave = async () => {
    setLoading(true);
    // Simulate save
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Site Configuration</h1>
          <p className="text-muted-foreground">Pengaturan website dan profil</p>
        </div>
        <Button onClick={handleSave} className="gradient-primary text-white" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Simpan
        </Button>
      </div>

      {saved && (
        <Alert className="bg-green-100 dark:bg-green-900/30 border-green-500">
          <AlertDescription>Pengaturan berhasil disimpan!</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="brand">
            <Palette className="w-4 h-4 mr-2" />
            Brand
          </TabsTrigger>
          <TabsTrigger value="seo">
            <Globe className="w-4 h-4 mr-2" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Phone className="w-4 h-4 mr-2" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Wrench className="w-4 h-4 mr-2" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Ubah data profil Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Avatar URL</Label>
                <Input
                  value={profile.avatar}
                  onChange={(e) => setProfile((prev) => ({ ...prev, avatar: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              
              {profile.avatar && (
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <div className="w-20 h-20 rounded-full bg-muted overflow-hidden">
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Pengaturan logo dan identitas brand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Website</Label>
                <Input
                  value={brand.websiteTitle}
                  onChange={(e) => setBrand((prev) => ({ ...prev, websiteTitle: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={brand.logoUrl}
                    onChange={(e) => setBrand((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Favicon URL</Label>
                  <Input
                    value={brand.faviconUrl}
                    onChange={(e) => setBrand((prev) => ({ ...prev, faviconUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                  {brand.logoUrl ? (
                    <img src={brand.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                      <span className="text-white font-bold text-sm">BB</span>
                    </div>
                  )}
                  <span className="font-bold text-lg">{brand.websiteTitle}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Pengaturan SEO untuk website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input
                  value={seo.metaTitle}
                  onChange={(e) => setSeo((prev) => ({ ...prev, metaTitle: e.target.value }))}
                  placeholder="Black Bear - Layanan Tarik Tunai"
                />
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Input
                  value={seo.metaDescription}
                  onChange={(e) => setSeo((prev) => ({ ...prev, metaDescription: e.target.value }))}
                  placeholder="Layanan tarik tunai profesional..."
                />
              </div>
              
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">Preview (Search Result):</p>
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-primary text-lg mb-1">
                    {seo.metaTitle || 'Black Bear - Layanan Tarik Tunai'}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400 mb-1">
                    https://blackbear.id
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {seo.metaDescription || 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat, aman, dan transparan.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Contact & Social Media</CardTitle>
              <CardDescription>Kontak dan sosial media di footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>No. WhatsApp</Label>
                <Input
                  value={contact.whatsapp}
                  onChange={(e) => setContact((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input
                    value={contact.instagram}
                    onChange={(e) => setContact((prev) => ({ ...prev, instagram: e.target.value }))}
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Facebook</Label>
                  <Input
                    value={contact.facebook}
                    onChange={(e) => setContact((prev) => ({ ...prev, facebook: e.target.value }))}
                    placeholder="username"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>Aktifkan mode maintenance untuk menonaktifkan website sementara</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Website akan menampilkan halaman maintenance
                  </p>
                </div>
                <Switch
                  checked={maintenance}
                  onCheckedChange={setMaintenance}
                />
              </div>
              
              <div>
                <Badge variant={maintenance ? 'destructive' : 'default'}>
                  Status: {maintenance ? 'Maintenance Active' : 'Website Online'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
