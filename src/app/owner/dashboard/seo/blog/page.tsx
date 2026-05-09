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
import * as DialogPrimitive from '@radix-ui/react-dialog';
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
import dynamic from 'next/dynamic';
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
  ScanEye,
  X,
  Clock,
  Maximize2,
  Minimize2,
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

const RichTextEditor = dynamic(() => import('@/components/shared/rich-text-editor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
  ),
});

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
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    setIsFullscreen(false);
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
    setIsFullscreen(false);
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
    <div className="min-h-screen bg-background dashboard-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-medium">SEO</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Manajemen Blog</h1>
          <p className="text-xs text-muted-foreground">Kelola artikel dan konten blog</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary text-primary-foreground rounded-xl h-10 text-xs font-semibold hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Artikel
        </Button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-xl dash-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                <FileText className="w-4 h-4 text-primary dark:text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-lg font-bold">{pagination.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl dash-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20">
                <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Published</p>
                <p className="text-lg font-bold">{posts.filter(p => p.isPublished).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl dash-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Draft</p>
                <p className="text-lg font-bold">{posts.filter(p => !p.isPublished).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl dash-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10 dark:bg-violet-500/20">
                <Eye className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Views</p>
                <p className="text-lg font-bold">{posts.reduce((acc, p) => acc + p.viewCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <Card className="rounded-xl dash-card overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari judul atau slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9 text-xs rounded-lg"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs rounded-lg">
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
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs rounded-lg">
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

      {/* ── Posts List ── */}
      <Card className="rounded-xl dash-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daftar Artikel</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
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
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Featured Image Thumbnail */}
                    <div className="hidden sm:block w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {post.featuredImage ? (
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10 dark:from-primary/20 dark:to-violet-500/20">
                          <FileText className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{post.title}</h3>
                        <Badge
                          variant={post.isPublished ? 'default' : 'secondary'}
                          className={cn(
                            "text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full",
                            post.isPublished && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                          )}
                        >
                          {post.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                          {CATEGORY_OPTIONS.find(c => c.value === post.category)?.label || post.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">/{post.slug}</p>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPreviewPost(post);
                          setShowPreviewDialog(true);
                        }}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Preview"
                      >
                        <ScanEye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(post)}
                        className="h-8 w-8 rounded-lg hover:bg-muted/30 transition-colors"
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
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
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

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setIsFullscreen(false); setShowDialog(open); }}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "p-0 gap-0 overflow-hidden flex flex-col transition-all duration-300",
            !isFullscreen && "max-w-3xl max-h-[85vh]"
          )}
          style={isFullscreen ? { width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', borderRadius: 0 } : undefined}
        >
          <DialogHeader className="px-6 pt-6 pb-0 flex flex-row items-start justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle>{editingPost ? 'Edit Artikel' : 'Tambah Artikel Baru'}</DialogTitle>
              <DialogDescription>
                {editingPost ? 'Ubah detail artikel' : 'Buat artikel baru untuk blog'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-3 mt-0.5">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <DialogPrimitive.Close
                data-slot="dialog-close"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          </DialogHeader>

          <div className={cn("flex-1 overflow-y-auto px-6 py-4 space-y-4", isFullscreen && "max-w-4xl mx-auto w-full")}>
            {/* Title & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Judul *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Judul artikel"
                  className="h-9 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="judul-artikel"
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label className="text-xs">Ringkasan</Label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Ringkasan singkat artikel..."
                rows={2}
                className="text-xs rounded-lg"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label className="text-xs">Konten *</Label>
              <RichTextEditor
                content={formData.content}
                onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                placeholder="Tulis konten artikel di sini... Gunakan toolbar untuk memformat."
              />
            </div>

            {/* Featured Image */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" />
                Featured Image URL
              </Label>
              <Input
                value={formData.featuredImage}
                onChange={(e) => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="h-9 text-xs rounded-lg"
              />
            </div>

            {/* Category & Author */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-lg">
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
                <Label className="text-xs">Author</Label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Nama penulis"
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" />
                Tags (pisahkan dengan koma)
              </Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="tutorial, tips, panduan"
                className="h-9 text-xs rounded-lg"
              />
            </div>

            {/* SEO Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Pengaturan SEO
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Meta Title</Label>
                    <span className="text-[10px] text-muted-foreground">{formData.metaTitle?.length || 0}/60</span>
                  </div>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                    placeholder="Title untuk SEO (max 60 karakter)"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Meta Description</Label>
                    <span className="text-[10px] text-muted-foreground">{formData.metaDescription?.length || 0}/160</span>
                  </div>
                  <Textarea
                    value={formData.metaDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                    placeholder="Deskripsi untuk SEO (max 160 karakter)"
                    rows={2}
                    className="text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Keywords (pisahkan dengan koma)</Label>
                  <Input
                    value={formData.keywords}
                    onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="keyword1, keyword2, keyword3"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Publish Status */}
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label className="text-xs">Status Publikasi</Label>
                <p className="text-[10px] text-muted-foreground">
                  {formData.isPublished ? 'Artikel akan terlihat publik' : 'Artikel disimpan sebagai draft'}
                </p>
              </div>
              <Switch
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))}
                size="md"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-lg h-9 text-xs font-medium">
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground rounded-lg h-9 px-4 text-xs font-semibold hover:bg-primary/90">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPost ? 'Simpan Perubahan' : 'Buat Artikel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Blog Preview Dialog ── */}
      <BlogPreviewDialog
        post={previewPost}
        open={showPreviewDialog}
        onOpenChange={(open) => {
          setShowPreviewDialog(open);
          if (!open) setPreviewPost(null);
        }}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md max-h-[85vh] p-0 gap-0 overflow-hidden">
          <AlertDialogHeader className="px-6 pt-6">
            <AlertDialogTitle>Hapus Artikel?</AlertDialogTitle>
            <AlertDialogDescription>
              Artikel &quot;{deletingPost?.title}&quot; akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 py-4">
            <AlertDialogCancel className="rounded-lg h-9 text-xs font-medium">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg h-9 px-4 text-xs font-semibold"
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

function BlogSkeleton() {
  return (
    <div className="min-h-screen bg-background dashboard-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-8">
      <Skeleton className="h-8 w-48" />
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

// Blog Preview Dialog Component
function BlogPreviewDialog({
  post,
  open,
  onOpenChange,
}: {
  post: BlogPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!post) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blackbear.cc';
  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const tags = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  const categoryColors: Record<string, string> = {
    artikel: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    tips: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    tutorial: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    berita: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden p-0 gap-0 flex flex-col">
        {/* Preview Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ScanEye className="w-4 h-4 text-primary dark:text-primary" />
            <DialogTitle className="text-sm font-medium">Preview Artikel</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={post.isPublished ? 'default' : 'secondary'}
              className={cn(
                "text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full",
                post.isPublished && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {post.isPublished ? 'Published' : 'Draft'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1 rounded-lg"
              asChild
            >
              <a href={postUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="w-3 h-3" />
                Buka di Browser
              </a>
            </Button>
          </div>
        </div>

        {/* Preview Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div className="relative py-8 md:py-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-violet-500/5 dark:from-primary/10 dark:to-violet-500/10" />
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl mx-auto">
                {/* Category Badge */}
                <Badge className={cn("mb-3 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full", categoryColors[post.category] || '')}>
                  {CATEGORY_OPTIONS.find(c => c.value === post.category)?.label || post.category}
                </Badge>

                {/* Title */}
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 leading-tight tracking-tight">
                  {post.title}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {post.author && (
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span>{post.author}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {post.publishedAt
                        ? formatDate(post.publishedAt)
                        : formatDate(post.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{post.viewCount} views</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="px-4 pb-6">
              <div className="max-w-3xl mx-auto">
                <div className="relative rounded-xl overflow-hidden bg-muted">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-auto max-h-[350px] object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <div className="px-4 pb-4">
              <div className="max-w-3xl mx-auto">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/60">
                  <p className="text-sm italic text-muted-foreground leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Article Content */}
          <div className="px-4 py-6">
            <div className="max-w-3xl mx-auto">
              <div
                className="prose prose-sm sm:prose dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:tracking-tight
                  prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                  prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2
                  prose-p:text-muted-foreground prose-p:leading-relaxed
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-foreground
                  prose-ul:my-3 prose-ol:my-3
                  prose-li:text-muted-foreground
                  prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r-lg
                  prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded text-sm
                  prose-pre:bg-muted prose-pre:border prose-pre:text-sm
                  prose-img:rounded-xl prose-img:shadow-lg
                "
                dangerouslySetInnerHTML={{ __html: post.content.includes('<') ? post.content : post.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br />').replace(/^/, '<p>').replace(/$/, '</p>') }}
              />
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="px-4 pb-6">
              <div className="max-w-3xl mx-auto">
                <div className="border-t pt-6">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                        <Tag className="w-2.5 h-2.5 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEO Info */}
          <div className="px-4 pb-6">
            <div className="max-w-3xl mx-auto">
              <div className="border-t pt-6">
                <p className="text-[10px] font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  SEO Preview
                </p>
                <div className="bg-muted/30 rounded-lg p-4 border border-border/60 space-y-1.5">
                  {/* Google Search Preview */}
                  <div className="space-y-1">
                    <p className="text-base text-violet-700 dark:text-violet-400 truncate leading-snug hover:underline cursor-pointer">
                      {post.metaTitle || post.title}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-500 truncate">
                      {siteUrl}/blog/{post.slug}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {post.metaDescription || post.excerpt || post.content.substring(0, 160)}
                    </p>
                  </div>
                  {/* Keywords */}
                  {post.keywords && (
                    <div className="flex items-center gap-1.5 pt-2 border-t mt-2">
                      <span className="text-[10px] text-muted-foreground">Keywords:</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{post.keywords}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
