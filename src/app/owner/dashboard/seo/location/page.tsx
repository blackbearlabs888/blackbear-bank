'use client';

import { useEffect, useState, useRef, useSyncExternalStore, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Image as ImageIcon,
  Globe,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content: string | null;
  featuredImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  content: '',
  featuredImage: '',
  metaTitle: '',
  metaDescription: '',
  keywords: '',
  isActive: true,
};

// Custom hook for hydration-safe state
function useAuthHydrated() {
  return useSyncExternalStore(
    useCallback((onStoreChange) => useAuthStore.subscribe(onStoreChange), []),
    () => useAuthStore.getState().hasHydrated,
    () => false
  );
}

export default function LocationManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrate } = useAuthStore();
  const hasHydrated = useAuthHydrated();
  const redirectAttempted = useRef(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const slugManuallyEdited = useRef(false);

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

  // Fetch locations
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchLocations();
    }
  }, [isAuthenticated, hasHydrated, user]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/seo/location');
      const result = await response.json();

      if (result.success) {
        setLocations(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      toast.error('Gagal memuat data lokasi');
    } finally {
      setLoading(false);
    }
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      // Auto-generate slug from name unless user has manually edited it (or we're editing an existing location)
      slug: (slugManuallyEdited.current || editingLocation) ? prev.slug : generateSlug(name),
    }));
  };

  const handleSlugChange = (slug: string) => {
    slugManuallyEdited.current = true;
    setFormData(prev => ({ ...prev, slug }));
  };

  const openCreateDialog = () => {
    setEditingLocation(null);
    setFormData(emptyForm);
    slugManuallyEdited.current = false;
    setShowDialog(true);
  };

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    slugManuallyEdited.current = true; // Editing existing location, don't auto-generate slug
    setFormData({
      name: location.name,
      slug: location.slug,
      description: location.description || '',
      content: location.content || '',
      featuredImage: location.featuredImage || '',
      metaTitle: location.metaTitle || '',
      metaDescription: location.metaDescription || '',
      keywords: location.keywords || '',
      isActive: location.isActive,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Nama dan slug wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const url = editingLocation
        ? `/api/seo/location/${editingLocation.slug}`
        : '/api/seo/location';
      const method = editingLocation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Location berhasil disimpan');
        setShowDialog(false);
        fetchLocations();
      } else {
        toast.error(result.error || 'Gagal menyimpan location');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/seo/location/${deletingLocation.slug}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Location berhasil dihapus');
        setShowDeleteDialog(false);
        setDeletingLocation(null);
        fetchLocations();
      } else {
        toast.error(result.error || 'Gagal menghapus location');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  // Sync locations from partners
  const handleSyncFromPartners = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/seo/location/sync', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        fetchLocations();
      } else {
        toast.error(result.error || 'Gagal sync lokasi');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Terjadi kesalahan saat sync');
    } finally {
      setSyncing(false);
    }
  };

  // Filter locations
  const filteredLocations = locations.filter(location => {
    return !search ||
      location.name.toLowerCase().includes(search.toLowerCase()) ||
      location.slug.toLowerCase().includes(search.toLowerCase());
  });

  // Show skeleton during hydration
  if (!hasHydrated) {
    return <LocationSkeleton />;
  }

  // Don't render if not authenticated
  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  const activeCount = locations.filter(l => l.isActive).length;
  const inactiveCount = locations.filter(l => !l.isActive).length;

  return (
    <div className="min-h-screen bg-background dashboard-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">SEO</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Manajemen Lokasi</h1>
          <p className="text-xs text-muted-foreground">Kelola halaman lokasi untuk SEO</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleSyncFromPartners} 
            disabled={syncing}
            className="rounded-xl"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync dari Partner
          </Button>
          <Button onClick={openCreateDialog} className="gradient-primary text-white rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Lokasi
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-xl dash-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{locations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl dash-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktif</p>
                <p className="text-lg font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl dash-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <XCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nonaktif</p>
                <p className="text-lg font-bold">{inactiveCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl dash-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SEO Pages</p>
                <p className="text-lg font-bold">{locations.filter(l => l.content).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau slug lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Locations List */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daftar Lokasi</CardTitle>
          <CardDescription className="text-xs">
            {filteredLocations.length} lokasi ditemukan
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada lokasi</p>
              <p className="text-xs mt-1">Klik tombol &quot;Tambah Lokasi&quot; untuk membuat lokasi baru</p>
            </div>
          ) : (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredLocations.map((location) => (
                <div
                  key={location.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors",
                    !location.isActive && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{location.name}</h3>
                        {location.isActive ? (
                          <Badge className="bg-green-500/10 text-green-600 text-[10px]">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Nonaktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">/{location.slug}</p>
                      {location.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{location.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {location.featuredImage && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Ada gambar
                          </span>
                        )}
                        {location.content && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Ada konten
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(location)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingLocation(location);
                          setShowDeleteDialog(true);
                        }}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}</DialogTitle>
            <DialogDescription>
              {editingLocation ? 'Ubah detail lokasi' : 'Buat halaman lokasi baru untuk SEO'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lokasi *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Jakarta"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="jakarta"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Deskripsi Singkat</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi singkat tentang lokasi..."
                rows={2}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label>Konten Halaman</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Konten lengkap halaman lokasi (Markdown/HTML)..."
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Gunakan Markdown atau HTML untuk konten halaman
              </p>
            </div>

            {/* Featured Image */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Featured Image URL
              </Label>
              <Input
                value={formData.featuredImage}
                onChange={(e) => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* SEO Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Pengaturan SEO
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Meta Title</Label>
                    <span className="text-xs text-muted-foreground">{formData.metaTitle?.length || 0}/60</span>
                  </div>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                    placeholder="Title untuk SEO (max 60 karakter)"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Meta Description</Label>
                    <span className="text-xs text-muted-foreground">{formData.metaDescription?.length || 0}/160</span>
                  </div>
                  <Textarea
                    value={formData.metaDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                    placeholder="Deskripsi untuk SEO (max 160 karakter)"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Keywords (pisahkan dengan koma)</Label>
                  <Input
                    value={formData.keywords}
                    onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label>Status Aktif</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isActive ? 'Halaman lokasi akan terlihat' : 'Halaman lokasi disembunyikan'}
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                size="md"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingLocation ? 'Simpan Perubahan' : 'Buat Lokasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Lokasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Lokasi &quot;{deletingLocation?.name}&quot; akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}

function LocationSkeleton() {
  return (
    <div className="min-h-screen bg-background dashboard-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-16" />
      <Skeleton className="h-64" />
      </div>
    </div>
  );
}
