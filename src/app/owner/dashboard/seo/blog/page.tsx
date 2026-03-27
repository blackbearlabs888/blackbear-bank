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
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Filter,
  Loader2,
  ArrowUpDown,
  Image as ImageIcon,
  Calendar,
  User,
  Tag,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  category: string;
  tags: string | null;
  author: string | null;
  viewCount: number;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORY_OPTIONS = [
  { value: 'artikel', label: 'Artikel' },
  { value: 'tips', label: 'Tips' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'berita', label: 'Berita' },
];

const emptyForm = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  featuredImage: '',
  metaTitle: '',
  metaDescription: '',
  keywords: '',
  category: 'artikel',
  tags: '',
  author: '',
  isPublished: false,
};

// Custom hook for hydration-safe state
function useAuthHydrated() {
  return useSyncExternalStore(
    useCallback((onStoreChange) => useAuthStore.subscribe(onStoreChange), []),
    () => useAuthStore.getState().hasHydrated,
    () => false
  );
}

export default function BlogManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrate } = useAuthStore();
  const hasHydrated = useAuthHydrated();
  const redirectAttempted = useRef(false);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);
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

  // Fetch posts
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchPosts();
    }
  }, [isAuthenticated, hasHydrated, user, pagination.page, categoryFilter, statusFilter]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      // Note: status filter is handled client-side since API doesn't support it

      const response = await fetch(`/api/seo/blog?${params}`);
      const result = await response.json();

      if (result.success) {
        let filteredData = result.data || [];
        
        // Client-side status filter
        if (statusFilter === 'published') {
          filteredData = filteredData.filter((p: BlogPost) => p.isPublished);
        } else if (statusFilter === 'draft') {
          filteredData = filteredData.filter((p: BlogPost) => !p.isPublished);
        }

        // Client-side search
        if (search) {
          const searchLower = search.toLowerCase();
          filteredData = filteredData.filter((p: BlogPost) =>
            p.title.toLowerCase().includes(searchLower) ||
            p.slug.toLowerCase().includes(searchLower)
          );
        }

        setPosts(filteredData);
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.totalPages || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      toast.error('Gagal memuat data blog');
    } finally {
      setLoading(false);
    }
  };

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const openCreateDialog = () => {
    setEditingPost(null);
    setFormData(emptyForm);
    setShowDialog(true);
  };

  const openEditDialog = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || '',
      featuredImage: post.featuredImage || '',
      metaTitle: post.metaTitle || '',
      metaDescription: post.metaDescription || '',
      keywords: post.keywords || '',
      category: post.category,
      tags: post.tags || '',
      author: post.author || '',
      isPublished: post.isPublished,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      toast.error('Judul, slug, dan konten wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const url = editingPost
        ? `/api/seo/blog/${editingPost.slug}`
        : '/api/seo/blog';
      const method = editingPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Blog post berhasil disimpan');
        setShowDialog(false);
        fetchPosts();
      } else {
        toast.error(result.error || 'Gagal menyimpan blog post');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPost) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/seo/blog/${deletingPost.slug}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Blog post berhasil dihapus');
        setShowDeleteDialog(false);
        setDeletingPost(null);
        fetchPosts();
      } else {
        toast.error(result.error || 'Gagal menghapus blog post');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  // Show skeleton during hydration
  if (!hasHydrated) {
    return <BlogSkeleton />;
  }

  // Don't render if not authenticated
  if (!isAuthenticated || user?.role !== 'owner') {
    return null;
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !search ||
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'published' && post.isPublished) ||
      (statusFilter === 'draft' && !post.isPublished);
    const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Manajemen Blog</h1>
          <p className="text-sm text-muted-foreground">Kelola artikel dan konten blog</p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary text-white rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Artikel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{pagination.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Eye className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Published</p>
                <p className="text-lg font-bold">{posts.filter(p => p.isPublished).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Draft</p>
                <p className="text-lg font-bold">{posts.filter(p => !p.isPublished).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Views</p>
                <p className="text-lg font-bold">{posts.reduce((acc, p) => acc + p.viewCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari judul atau slug..."
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daftar Artikel</CardTitle>
          <CardDescription className="text-xs">
            {filteredPosts.length} artikel ditemukan
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada artikel</p>
              <p className="text-xs mt-1">Klik tombol &quot;Tambah Artikel&quot; untuk membuat artikel baru</p>
            </div>
          ) : (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{post.title}</h3>
                        <Badge
                          variant={post.isPublished ? 'default' : 'secondary'}
                          className={cn(
                            "text-[10px]",
                            post.isPublished && "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          )}
                        >
                          {post.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_OPTIONS.find(c => c.value === post.category)?.label || post.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">/{post.slug}</p>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{post.excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {post.author && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {post.author}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.viewCount} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(post)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingPost(post);
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
            <DialogTitle>{editingPost ? 'Edit Artikel' : 'Tambah Artikel Baru'}</DialogTitle>
            <DialogDescription>
              {editingPost ? 'Ubah detail artikel' : 'Buat artikel baru untuk blog'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Judul *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Judul artikel"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="judul-artikel"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label>Ringkasan</Label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Ringkasan singkat artikel..."
                rows={2}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label>Konten *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Tulis konten artikel di sini..."
                rows={10}
                className="font-mono text-sm"
              />
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

            {/* Category & Author */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Author</Label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Nama penulis"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags (pisahkan dengan koma)
              </Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="tutorial, tips, panduan"
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

            {/* Publish Status */}
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label>Status Publikasi</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isPublished ? 'Artikel akan terlihat publik' : 'Artikel disimpan sebagai draft'}
                </p>
              </div>
              <Switch
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPost ? 'Simpan Perubahan' : 'Buat Artikel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Artikel?</AlertDialogTitle>
            <AlertDialogDescription>
              Artikel &quot;{deletingPost?.title}&quot; akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
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

function BlogSkeleton() {
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
