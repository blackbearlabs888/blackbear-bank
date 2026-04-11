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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  Loader2,
  GripVertical,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_OPTIONS = [
  { value: 'umum', label: 'Umum', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'layanan', label: 'Layanan', color: 'bg-green-500/10 text-green-600' },
  { value: 'pembayaran', label: 'Pembayaran', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'mitra', label: 'Mitra', color: 'bg-purple-500/10 text-purple-600' },
];

const emptyForm = {
  question: '',
  answer: '',
  category: 'umum',
  order: 0,
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

export default function FAQManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrate } = useAuthStore();
  const hasHydrated = useAuthHydrated();
  const redirectAttempted = useRef(false);

  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState(emptyForm);

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

  // Fetch FAQs
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchFaqs();
    }
  }, [isAuthenticated, hasHydrated, user]);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/seo/faq');
      const result = await response.json();

      if (result.success) {
        setFaqs(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
      toast.error('Gagal memuat data FAQ');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingFaq(null);
    setFormData({
      ...emptyForm,
      order: faqs.length,
    });
    setShowDialog(true);
  };

  const openEditDialog = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order: faq.order,
      isActive: faq.isActive,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.question || !formData.answer) {
      toast.error('Pertanyaan dan jawaban wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const url = editingFaq
        ? `/api/seo/faq/${editingFaq.id}`
        : '/api/seo/faq';
      const method = editingFaq ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'FAQ berhasil disimpan');
        setShowDialog(false);
        fetchFaqs();
      } else {
        toast.error(result.error || 'Gagal menyimpan FAQ');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFaq) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/seo/faq/${deletingFaq.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'FAQ berhasil dihapus');
        setShowDeleteDialog(false);
        setDeletingFaq(null);
        fetchFaqs();
      } else {
        toast.error(result.error || 'Gagal menghapus FAQ');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (faq: FAQ, direction: 'up' | 'down') => {
    const currentIndex = faqs.findIndex(f => f.id === faq.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= faqs.length) return;

    const targetFaq = faqs[newIndex];

    // Swap orders
    setSaving(true);
    try {
      // Update current FAQ
      await fetch(`/api/seo/faq/${faq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: targetFaq.order }),
      });

      // Update target FAQ
      await fetch(`/api/seo/faq/${targetFaq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: faq.order }),
      });

      fetchFaqs();
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('Gagal mengubah urutan');
    } finally {
      setSaving(false);
    }
  };

  // Group FAQs by category
  const groupedFaqs = (category: string) => {
    return filteredFaqs.filter(faq => faq.category === category);
  };

  // Filter FAQs
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = !search ||
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || faq.category === categoryFilter;
    const matchesActive = activeFilter === 'all' ||
      (activeFilter === 'active' && faq.isActive) ||
      (activeFilter === 'inactive' && !faq.isActive);
    return matchesSearch && matchesCategory && matchesActive;
  });

  // Show skeleton during hydration
  if (!hasHydrated) {
    return <FAQSkeleton />;
  }

  // Don't render if not authenticated
  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Manajemen FAQ</h1>
          <p className="text-sm text-muted-foreground">Kelola pertanyaan yang sering diajukan</p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary text-white rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          Tambah FAQ
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <HelpCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{faqs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {CATEGORY_OPTIONS.map(cat => (
          <Card key={cat.value} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", cat.color)}>
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{cat.label}</p>
                  <p className="text-lg font-bold">{faqs.filter(f => f.category === cat.value).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari pertanyaan atau jawaban..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {CATEGORY_OPTIONS.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* FAQs Grouped by Category */}
      {loading ? (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredFaqs.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada FAQ</p>
            <p className="text-xs mt-1">Klik tombol &quot;Tambah FAQ&quot; untuk membuat FAQ baru</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {CATEGORY_OPTIONS.map(cat => {
            const categoryFaqs = groupedFaqs(cat.value);
            if (categoryFaqs.length === 0 && categoryFilter !== 'all') return null;

            return (
              <Card key={cat.value} className="glass-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", cat.color)}>
                        {cat.label}
                      </Badge>
                      <CardTitle className="text-base">{categoryFaqs.length} FAQ</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {categoryFaqs.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Tidak ada FAQ dalam kategori ini
                    </div>
                  ) : (
                    <div className="divide-y">
                      {categoryFaqs.map((faq, index) => (
                        <div
                          key={faq.id}
                          className={cn(
                            "p-4 hover:bg-muted/50 transition-colors",
                            !faq.isActive && "opacity-60"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={index === 0 || saving}
                                onClick={() => handleReorder(faq, 'up')}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={index === categoryFaqs.length - 1 || saving}
                                onClick={() => handleReorder(faq, 'down')}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium">{faq.question}</h3>
                                    {faq.isActive ? (
                                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(faq)}
                                    className="h-8 w-8"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setDeletingFaq(faq);
                                      setShowDeleteDialog(true);
                                    }}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Tambah FAQ Baru'}</DialogTitle>
            <DialogDescription>
              {editingFaq ? 'Ubah detail pertanyaan' : 'Buat pertanyaan baru untuk FAQ'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Question */}
            <div className="space-y-2">
              <Label>Pertanyaan *</Label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Tulis pertanyaan di sini..."
              />
            </div>

            {/* Answer */}
            <div className="space-y-2">
              <Label>Jawaban *</Label>
              <Textarea
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="Tulis jawaban di sini..."
                rows={6}
              />
            </div>

            {/* Order */}
            <div className="space-y-2">
              <Label>Urutan</Label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Nomor urutan untuk menentukan posisi FAQ (lebih kecil = lebih awal)
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label>Status Aktif</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isActive ? 'FAQ akan ditampilkan' : 'FAQ disembunyikan'}
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingFaq ? 'Simpan Perubahan' : 'Buat FAQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              FAQ &quot;{deletingFaq?.question}&quot; akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
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
  );
}

function FAQSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-16" />
      <Skeleton className="h-64" />
    </div>
  );
}
