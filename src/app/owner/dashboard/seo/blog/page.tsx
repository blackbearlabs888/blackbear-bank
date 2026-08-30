'use client';

import { useEffect, useState, useRef, useSyncExternalStore, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import dynamic from 'next/dynamic';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Loader2,
  Image as ImageIcon,
  Calendar,
  User,
  Tag,
  Globe,
  ScanEye,
  X,
  AlertTriangle,
  Check,
  Clock,
  Maximize2,
  Minimize2,
  TrendingUp,
  BarChart3,
  MoreHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Copy,
  ExternalLink,
  FileOutput,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';

// ── Types ──────────────────────────────────────────────────────────
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

type SortField = 'title' | 'createdAt' | 'viewCount' | 'category';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';

// ── Constants ──────────────────────────────────────────────────────
const RichTextEditor = dynamic(() => import('@/components/shared/rich-text-editor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
  ),
});

const CATEGORY_OPTIONS = [
  { value: 'artikel', label: 'Artikel', color: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' },
  { value: 'tips', label: 'Tips', color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { value: 'tutorial', label: 'Tutorial', color: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
  { value: 'berita', label: 'Berita', color: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
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

const STATUS_TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
] as const;

// ── Helpers ────────────────────────────────────────────────────────
function useAuthHydrated() {
  return useSyncExternalStore(
    useCallback((onStoreChange) => useAuthStore.subscribe(onStoreChange), []),
    () => useAuthStore.getState().hasHydrated,
    () => false
  );
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateFull(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Cover image guidance: the public blog hero previews covers with a
// center crop at 3:1 (desktop) / 21:9 (mobile). Uploading at the
// recommended 3:1 dimensions means NOTHING gets cropped on publish.
const COVER_RECOMMENDED = { width: 1600, height: 540 };

function formatRatio(ratio: number): string {
  const commons: Array<[string, number]> = [
    ['3:1', 3],
    ['16:9', 16 / 9],
    ['16:10', 1.6],
    ['3:2', 1.5],
    ['4:3', 4 / 3],
    ['1:1', 1],
    ['4:5', 0.8],
    ['9:16', 9 / 16],
    ['21:9', 21 / 9],
  ];
  for (const [label, value] of commons) {
    if (Math.abs(ratio - value) / value < 0.03) return label;
  }
  return `${ratio.toFixed(2)} : 1`;
}

function timeAgo(date: string) {
  const now = new Date().getTime();
  const then = new Date(date).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}h lalu`;
  const months = Math.floor(days / 30);
  return `${months}bl lalu`;
}

// ── Main Component ─────────────────────────────────────────────────
export default function BlogManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrate } = useAuthStore();
  const hasHydrated = useAuthHydrated();
  const redirectAttempted = useRef(false);

  // Data state
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editorTab, setEditorTab] = useState<'content' | 'media' | 'seo' | 'publish'>('content');

  // Detected natural dimensions of the cover image URL (anti-crop guidance)
  const [coverMeta, setCoverMeta] = useState<{ w: number; h: number } | null>(null);
  const coverRatio = coverMeta ? coverMeta.w / coverMeta.h : null;
  // Blog hero crops at 3:1 — accept a small tolerance band around it
  const coverRatioGood = coverRatio !== null && coverRatio >= 2.7 && coverRatio <= 3.3;

  // ── Auth ──
  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (hasHydrated && !redirectAttempted.current) {
      redirectAttempted.current = true;
      if (!isAuthenticated) router.replace('/login');
      else if (user?.role !== 'owner') router.replace('/partner/dashboard');
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // ── Fetch ──
  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchPosts();
    }
  }, [isAuthenticated, hasHydrated, user, pagination.page, categoryFilter]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/seo/blog?${params}`);
      const result = await response.json();

      if (result.success) {
        setPosts(result.data || []);
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

  // ── Derived data ──
  const stats = useMemo(() => {
    const published = posts.filter(p => p.isPublished);
    const drafts = posts.filter(p => !p.isPublished);
    const totalViews = posts.reduce((acc, p) => acc + p.viewCount, 0);
    const topPost = [...posts].sort((a, b) => b.viewCount - a.viewCount)[0];
    return { published: published.length, drafts: drafts.length, totalViews, topPost, total: pagination.total };
  }, [posts, pagination.total]);

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Status filter
    if (statusFilter === 'published') result = result.filter(p => p.isPublished);
    else if (statusFilter === 'draft') result = result.filter(p => !p.isPublished);

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.author && p.author.toLowerCase().includes(q)) ||
        (p.tags && p.tags.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'viewCount': cmp = a.viewCount - b.viewCount; break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [posts, search, statusFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── CRUD handlers ──
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
    setEditorTab('content');
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
    setEditorTab('content');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      toast.error('Judul, slug, dan konten wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const url = editingPost ? `/api/seo/blog/${editingPost.slug}` : '/api/seo/blog';
      const method = editingPost ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(getErrorMessage(result.message, 'Blog post berhasil disimpan'));
        setShowDialog(false);
        fetchPosts();
      } else {
        toast.error(getErrorMessage(result.error, 'Gagal memproses data blog'));
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
      const response = await fetch(`/api/seo/blog/${deletingPost.slug}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success(getErrorMessage(result.message, 'Blog post berhasil dihapus'));
        setShowDeleteDialog(false);
        setDeletingPost(null);
        fetchPosts();
      } else {
        toast.error(getErrorMessage(result.error, 'Gagal memproses data blog'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const copySlug = (slug: string) => {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blackbear.cc'}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link berhasil disalin');
  };

  // ── Render guards ──
  if (!hasHydrated) return <CommandCenterSkeleton />;
  if (!isAuthenticated || user?.role !== 'owner') return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* ══════ HEADER ══════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-fuchsia-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Blog Command Center
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono rounded-md">
                  v2.0
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kelola, pantau, dan optimasi semua artikel kamu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Live</span>
            </div>
            <Button onClick={openCreateDialog} className="bg-gradient-to-r from-primary to-fuchsia-600 text-white rounded-xl h-10 text-xs font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5">
              <Plus className="w-4 h-4 mr-1.5" />
              Artikel Baru
            </Button>
          </div>
        </div>

        {/* ══════ STATS GRID ══════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            label="Total Artikel"
            value={stats.total}
            icon={<FileText className="w-4 h-4" />}
            iconBg="bg-violet-500/10 dark:bg-violet-500/20"
            iconColor="text-violet-600 dark:text-violet-400"
            ring="ring-violet-500/20 dark:ring-violet-500/10"
          />
          <StatCard
            label="Published"
            value={stats.published}
            icon={<Globe className="w-4 h-4" />}
            iconBg="bg-emerald-500/10 dark:bg-emerald-500/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
            ring="ring-emerald-500/20 dark:ring-emerald-500/10"
            sublabel={stats.total > 0 ? `${Math.round((stats.published / stats.total) * 100)}%` : undefined}
          />
          <StatCard
            label="Draft"
            value={stats.drafts}
            icon={<Clock className="w-4 h-4" />}
            iconBg="bg-amber-500/10 dark:bg-amber-500/20"
            iconColor="text-amber-600 dark:text-amber-400"
            ring="ring-amber-500/20 dark:ring-amber-500/10"
          />
          <StatCard
            label="Total Views"
            value={formatNumber(stats.totalViews)}
            icon={<TrendingUp className="w-4 h-4" />}
            iconBg="bg-rose-500/10 dark:bg-rose-500/20"
            iconColor="text-rose-600 dark:text-rose-400"
            ring="ring-rose-500/20 dark:ring-rose-500/10"
            sublabel={stats.topPost ? `Top: ${stats.topPost.title.slice(0, 20)}...` : undefined}
          />
        </div>

        {/* ══════ CONTROL BAR ══════ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Status tabs */}
          <div className="flex items-center bg-muted/60 dark:bg-muted/40 rounded-xl p-1 gap-0.5">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200',
                  statusFilter === tab.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {tab.value === 'all' ? posts.length : tab.value === 'published' ? stats.published : stats.drafts}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Cari judul, slug, author, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl border-muted-foreground/20 bg-muted/40 focus:bg-background transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs rounded-xl border-muted-foreground/20 bg-muted/40 focus:bg-background transition-colors">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {CATEGORY_OPTIONS.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-xs rounded-xl border-muted-foreground/20 bg-muted/40 hover:bg-background transition-colors gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Urutkan</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => handleSort('createdAt')} className="text-xs gap-2">
                Terbaru {sortField === 'createdAt' && (sortDir === 'desc' ? <ArrowDown className="w-3 h-3 ml-auto" /> : <ArrowUp className="w-3 h-3 ml-auto" />)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('title')} className="text-xs gap-2">
                Judul A-Z {sortField === 'title' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-auto" /> : <ArrowDown className="w-3 h-3 ml-auto" />)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('viewCount')} className="text-xs gap-2">
                Paling Banyak Dibaca {sortField === 'viewCount' && (sortDir === 'desc' ? <ArrowDown className="w-3 h-3 ml-auto" /> : <ArrowUp className="w-3 h-3 ml-auto" />)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('category')} className="text-xs gap-2">
                Kategori {sortField === 'category' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-auto" /> : <ArrowDown className="w-3 h-3 ml-auto" />)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex items-center bg-muted/60 dark:bg-muted/40 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══════ CONTENT ══════ */}
        {loading ? (
          <ContentSkeleton viewMode={viewMode} />
        ) : filteredPosts.length === 0 ? (
          <EmptyState hasSearch={!!search} onCreate={openCreateDialog} />
        ) : viewMode === 'table' ? (
          <TableView
            posts={filteredPosts}
            onPreview={(p) => { setPreviewPost(p); setShowPreviewDialog(true); }}
            onEdit={openEditDialog}
            onDelete={(p) => { setDeletingPost(p); setShowDeleteDialog(true); }}
            onCopySlug={copySlug}
          />
        ) : (
          <GridView
            posts={filteredPosts}
            onPreview={(p) => { setPreviewPost(p); setShowPreviewDialog(true); }}
            onEdit={openEditDialog}
            onDelete={(p) => { setDeletingPost(p); setShowDeleteDialog(true); }}
            onCopySlug={copySlug}
          />
        )}

        {/* Result footer */}
        {!loading && filteredPosts.length > 0 && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>
              Menampilkan {filteredPosts.length} dari {stats.total} artikel
              {search && ` untuk "${search}"`}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Data diperbarui {timeAgo(new Date().toISOString())}
            </span>
          </div>
        )}
      </div>

      {/* ══════ DIALOGS ══════ */}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setIsFullscreen(false); setShowDialog(open); }}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "p-0 gap-0 overflow-hidden flex flex-col transition-all duration-300",
            !isFullscreen && "max-w-4xl max-h-[90vh]"
          )}
          style={isFullscreen ? { width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', borderRadius: 0 } : undefined}
        >
          {/* Dialog Header */}
          <DialogHeader className="px-5 pt-5 pb-0 flex flex-row items-start justify-between border-b pb-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-fuchsia-600 flex items-center justify-center">
                  {editingPost ? <Pencil className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <span>{editingPost ? 'Edit Artikel' : 'Artikel Baru'}</span>
                  <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                    {editingPost ? `Editing: ${editingPost.title.slice(0, 30)}` : 'Buat konten berkualitas untuk blog kamu'}
                  </p>
                </div>
              </DialogTitle>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-3">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
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

          {/* Tab navigation */}
          <div className="px-5 pt-3 flex items-center gap-1 border-b">
            {[
              { id: 'content' as const, label: 'Konten', icon: <FileText className="w-3.5 h-3.5" /> },
              { id: 'media' as const, label: 'Media & Info', icon: <ImageIcon className="w-3.5 h-3.5" /> },
              { id: 'seo' as const, label: 'SEO', icon: <Globe className="w-3.5 h-3.5" /> },
              { id: 'publish' as const, label: 'Publikasi', icon: <Globe className="w-3.5 h-3.5" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setEditorTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-t-lg border-b-2 transition-all -mb-px',
                  editorTab === tab.id
                    ? 'border-primary text-foreground bg-muted/30'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className={cn("flex-1 overflow-y-auto px-5 py-5 space-y-4", isFullscreen && "max-w-5xl mx-auto w-full")}>
            {editorTab === 'content' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Judul <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Judul artikel yang menarik..."
                      className="h-10 text-sm rounded-xl font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Slug <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-mono">/blog/</span>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="judul-artikel"
                        className="pl-14 h-10 text-xs rounded-xl font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Ringkasan</Label>
                  <Textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                    placeholder="Ringkasan singkat yang muncul di listing..."
                    rows={2}
                    className="text-xs rounded-xl resize-none"
                  />
                  <div className="flex justify-end">
                    <span className="text-[10px] text-muted-foreground">{formData.excerpt.length}/300 karakter</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Konten <span className="text-destructive">*</span></Label>
                  <RichTextEditor
                    content={formData.content}
                    onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                    placeholder="Tulis konten artikel di sini... Gunakan toolbar untuk memformat."
                  />
                </div>
              </>
            )}

            {editorTab === 'media' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Featured Image URL
                  </Label>
                  <Input
                    value={formData.featuredImage}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, featuredImage: e.target.value }));
                      setCoverMeta(null);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="h-10 text-xs rounded-xl"
                  />

                  {/* Rekomendasi dimensi cover (anti-crop) */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 space-y-1">
                    <p className="text-[11px] font-medium flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-primary" />
                      Rekomendasi cover:{' '}
                      <span className="font-mono text-primary">
                        {COVER_RECOMMENDED.width} × {COVER_RECOMMENDED.height} px
                      </span>{' '}
                      (rasio 3:1)
                    </p>
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      Hero blog menampilkan cover dengan crop 3:1 (desktop) / 21:9 (mobile).
                      Upload dengan rasio 3:1 agar tidak ter-crop. Minimal 1200 × 400 px, format JPG/WebP.
                    </p>
                  </div>

                  {formData.featuredImage && (
                    <div className="space-y-2 mt-2">
                      <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden bg-muted">
                        <img
                          src={formData.featuredImage}
                          alt="Preview cover"
                          className="w-full h-full object-cover"
                          onLoad={(e) => setCoverMeta({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                          onError={() => setCoverMeta(null)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, featuredImage: '' }));
                            setCoverMeta(null);
                          }}
                          aria-label="Hapus featured image"
                          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {coverMeta && coverRatio !== null && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px]">
                          <span className="text-muted-foreground">
                            Dimensi asli: <span className="font-mono text-foreground">{coverMeta.w} × {coverMeta.h} px</span>
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            Rasio: <span className="font-mono text-foreground">{formatRatio(coverRatio)}</span>
                          </span>
                          {coverRatioGood ? (
                            <Badge className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3 h-3" />
                              Pas — tidak akan ter-crop
                            </Badge>
                          ) : (
                            <Badge className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              Akan ter-crop di hero — ideal rasio 3:1
                            </Badge>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground">
                        Preview di atas = tampilan persis di hero blog (crop bagian tengah 3:1).
                        Pembaca tetap bisa klik gambar di blog untuk melihat versi ukuran penuh.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Kategori</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Author</Label>
                    <Input
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                      placeholder="Nama penulis"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Tags
                  </Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="tutorial, tips, panduan (pisahkan dengan koma)"
                    className="h-10 text-xs rounded-xl"
                  />
                  {formData.tags && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {formData.tags.split(',').map((tag, i) => {
                        const t = tag.trim();
                        return t ? (
                          <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0 rounded-full">{t}</Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {editorTab === 'seo' && (
              <div className="space-y-4">
                <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold">Preview Google Search</span>
                  </div>
                  <div className="space-y-1.5 max-w-lg">
                    <p className="text-blue-600 dark:text-blue-400 text-[15px] font-medium truncate hover:underline cursor-pointer">
                      {formData.metaTitle || formData.title || 'Judul Artikel'} — Blackbear
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-500 text-xs truncate">
                      www.blackbear.cc/blog/{formData.slug || 'slug-artikel'}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {formData.metaDescription || formData.excerpt || 'Deskripsi artikel akan muncul di sini...'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Meta Title</Label>
                    <span className={cn(
                      "text-[10px] font-mono",
                      (formData.metaTitle?.length || 0) > 60 ? "text-amber-500" : "text-muted-foreground"
                    )}>
                      {formData.metaTitle?.length || 0}/60
                    </span>
                  </div>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                    placeholder={formData.title || 'Title untuk SEO (max 60 karakter)'}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Meta Description</Label>
                    <span className={cn(
                      "text-[10px] font-mono",
                      (formData.metaDescription?.length || 0) > 160 ? "text-amber-500" : "text-muted-foreground"
                    )}>
                      {formData.metaDescription?.length || 0}/160
                    </span>
                  </div>
                  <Textarea
                    value={formData.metaDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                    placeholder={formData.excerpt || 'Deskripsi untuk SEO (max 160 karakter)'}
                    rows={3}
                    className="text-xs rounded-xl resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Keywords</Label>
                  <Input
                    value={formData.keywords}
                    onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="keyword1, keyword2, keyword3"
                    className="h-10 text-xs rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground">Pisahkan dengan koma. Keywords membantu search engine memahami konten.</p>
                </div>
              </div>
            )}

            {editorTab === 'publish' && (
              <div className="space-y-5">
                <div className="bg-muted/40 rounded-xl p-5 border border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        formData.isPublished
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Status Publikasi</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formData.isPublished
                            ? 'Artikel akan terlihat publik di halaman blog'
                            : 'Artikel disimpan sebagai draft, hanya terlihat oleh admin'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.isPublished}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))}
                      size="lg"
                    />
                  </div>

                  {formData.isPublished && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 rounded-lg px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Artikel akan langsung tayang setelah disimpan
                    </div>
                  )}
                </div>

                {editingPost && (
                  <div className="grid grid-cols-2 gap-3">
                    <InfoBlock label="Dibuat" value={formatDateFull(editingPost.createdAt)} />
                    <InfoBlock label="Diperbarui" value={formatDateFull(editingPost.updatedAt)} />
                    {editingPost.publishedAt && <InfoBlock label="Dipublikasi" value={formatDateFull(editingPost.publishedAt)} />}
                    {editingPost.featuredImage && <InfoBlock label="Views" value={`${editingPost.viewCount} kali`}><Eye className="w-3.5 h-3.5" /></InfoBlock>}
                  </div>
                )}

                <div className="rounded-xl border border-dashed border-muted-foreground/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Checklist Sebelum Publish
                  </div>
                  <div className="space-y-2">
                    <CheckItem label="Judul & slug sudah diisi" done={!!formData.title && !!formData.slug} />
                    <CheckItem label="Konten minimal 100 karakter" done={formData.content.length >= 100} />
                    <CheckItem label="Featured image sudah ditambahkan" done={!!formData.featuredImage} />
                    {formData.featuredImage && (
                      <CheckItem
                        label={`Rasio cover sesuai rekomendasi 3:1 (mis. ${COVER_RECOMMENDED.width} × ${COVER_RECOMMENDED.height} px)`}
                        done={coverRatioGood}
                      />
                    )}
                    <CheckItem label="Ringkasan/excerpt ditambahkan" done={!!formData.excerpt} />
                    <CheckItem label="Meta title & description diisi" done={!!formData.metaTitle && !!formData.metaDescription} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-5 py-3.5 border-t bg-muted/20 flex items-center justify-between">
            <div className="text-[10px] text-muted-foreground hidden sm:block">
              {editingPost ? `ID: ${editingPost.id.slice(0, 8)}...` : 'Konten baru'}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl h-9 text-xs font-medium px-4">
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.title || !formData.slug || !formData.content}
                className="bg-gradient-to-r from-primary to-fuchsia-600 text-white rounded-xl h-9 px-5 text-xs font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {editingPost ? 'Simpan Perubahan' : 'Buat & Simpan'}
              </Button>
            </div>
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

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <AlertDialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle className="text-base">Hapus Artikel?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-0.5">
                  Artikel &quot;{deletingPost?.title}&quot; akan dihapus permanen.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 py-4 flex-row gap-2 sm:justify-end">
            <AlertDialogCancel className="rounded-xl h-9 text-xs font-medium flex-1 sm:flex-none">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-9 px-5 text-xs font-semibold flex-1 sm:flex-none"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sub Components ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  ring,
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  ring: string;
  sublabel?: string;
}) {
  return (
    <Card className={cn(
      "rounded-2xl border-border/40 overflow-hidden transition-all duration-300 hover:shadow-md",
      ring
    )}>
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
            iconBg
          )}>
            <div className={iconColor}>{icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl sm:text-2xl font-bold tracking-tight leading-none">{value}</p>
            <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
          </div>
          {sublabel && (
            <div className="flex-shrink-0 px-2 py-0.5 rounded-full bg-muted/60">
              <span className="text-[10px] font-semibold text-muted-foreground">{sublabel}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
        {children}
        {label}
      </div>
      <p className="text-xs font-medium">{value}</p>
    </div>
  );
}

function CheckItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs", done ? "text-foreground" : "text-muted-foreground")}>
      <div className={cn(
        "w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors",
        done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30"
      )}>
        {done && <span className="text-[8px]">✓</span>}
      </div>
      {label}
    </div>
  );
}

// ── Table View ─────────────────────────────────────────────────────
function TableView({
  posts,
  onPreview,
  onEdit,
  onDelete,
  onCopySlug,
}: {
  posts: BlogPost[];
  onPreview: (p: BlogPost) => void;
  onEdit: (p: BlogPost) => void;
  onDelete: (p: BlogPost) => void;
  onCopySlug: (slug: string) => void;
}) {
  return (
    <>
      {/* ── Mobile: Card list ── */}
      <div className="md:hidden space-y-2">
        {posts.map((post, idx) => (
          <Card
            key={post.id}
            className="rounded-2xl border-border/40 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer animate-fade-in active:scale-[0.98]"
            style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
            onClick={() => onPreview(post)}
          >
            <div className="flex gap-3 p-3">
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                {post.featuredImage ? (
                  <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-fuchsia-500/10">
                    <FileText className="w-5 h-5 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold flex-shrink-0",
                      post.isPublished
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}>
                      <div className="w-1 h-1 rounded-full bg-current" />
                      {post.isPublished ? 'Live' : 'Draft'}
                    </span>
                    <Badge className={cn("text-[8px] px-1.5 py-0 rounded-full", CATEGORY_OPTIONS.find(c => c.value === post.category)?.color)}>
                      {CATEGORY_OPTIONS.find(c => c.value === post.category)?.label || post.category}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-[13px] leading-tight truncate">{post.title}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">/blog/{post.slug}</p>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" />{formatNumber(post.viewCount)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" />{formatDate(post.createdAt)}
                    </span>
                    {post.author && (
                      <span className="flex items-center gap-0.5 truncate max-w-[60px]">
                        <User className="w-2.5 h-2.5" />{post.author}
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(post); }} className="text-xs gap-2">
                        <ScanEye className="w-3.5 h-3.5" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(post); }} className="text-xs gap-2">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopySlug(post.slug); }} className="text-xs gap-2">
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="text-xs gap-2">
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="w-3.5 h-3.5" /> Buka
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onDelete(post); }}
                        className="text-xs gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Desktop: Table ── */}
      <Card className="hidden md:block rounded-xl border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Artikel</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Kategori</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[10px] hidden lg:table-cell">Author</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Views</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[10px] hidden lg:table-cell">Tanggal</th>
                <th className="text-right px-3 py-3 font-medium text-muted-foreground uppercase tracking-wider text-[10px] w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {posts.map((post, idx) => (
                <tr
                  key={post.id}
                  className="hover:bg-muted/20 transition-colors group cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  onClick={() => onPreview(post)}
                >
                  {/* Article info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {post.featuredImage ? (
                          <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-fuchsia-500/10">
                            <FileText className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate max-w-[250px] lg:max-w-[350px]">{post.title}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px] lg:max-w-[300px] mt-0.5">
                          /blog/{post.slug}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3">
                    <Badge variant="secondary" className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium", CATEGORY_OPTIONS.find(c => c.value === post.category)?.color)}>
                      {CATEGORY_OPTIONS.find(c => c.value === post.category)?.label || post.category}
                    </Badge>
                  </td>

                  {/* Author */}
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <span className="text-muted-foreground">{post.author || '-'}</span>
                  </td>

                  {/* Views */}
                  <td className="px-3 py-3 text-center">
                    <span className="font-mono font-medium">{formatNumber(post.viewCount)}</span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold",
                      post.isPublished
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        post.isPublished ? "bg-emerald-500" : "bg-amber-500"
                      )} />
                      {post.isPublished ? 'Live' : 'Draft'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-3 text-muted-foreground hidden lg:table-cell">
                    {formatDate(post.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(post); }} className="text-xs gap-2">
                          <ScanEye className="w-3.5 h-3.5" /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(post); }} className="text-xs gap-2">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopySlug(post.slug); }} className="text-xs gap-2">
                          <Copy className="w-3.5 h-3.5" /> Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="text-xs gap-2">
                          <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-3.5 h-3.5" /> Buka di Browser
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); onDelete(post); }}
                          className="text-xs gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ── Grid View ──────────────────────────────────────────────────────
function GridView({
  posts,
  onPreview,
  onEdit,
  onDelete,
  onCopySlug,
}: {
  posts: BlogPost[];
  onPreview: (p: BlogPost) => void;
  onEdit: (p: BlogPost) => void;
  onDelete: (p: BlogPost) => void;
  onCopySlug: (slug: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
      {posts.map((post, idx) => (
        <Card
          key={post.id}
          className="rounded-2xl border-border/40 overflow-hidden hover:shadow-md transition-all duration-300 group cursor-pointer animate-fade-in active:scale-[0.98]"
          style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
          onClick={() => onPreview(post)}
        >
          {/* ── Mobile: Horizontal compact layout ── */}
          <div className="sm:hidden">
            <div className="flex gap-3 p-3">
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                {post.featuredImage ? (
                  <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-fuchsia-500/10">
                    <FileText className="w-6 h-6 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold flex-shrink-0",
                      post.isPublished
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}>
                      <div className="w-1 h-1 rounded-full bg-current" />
                      {post.isPublished ? 'Live' : 'Draft'}
                    </span>
                    <Badge className={cn("text-[8px] px-1.5 py-0 rounded-full", CATEGORY_OPTIONS.find(c => c.value === post.category)?.color)}>
                      {CATEGORY_OPTIONS.find(c => c.value === post.category)?.label || post.category}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-[13px] leading-tight truncate">{post.title}</h3>
                  {post.excerpt && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{post.excerpt}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" />{formatNumber(post.viewCount)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" />{formatDate(post.createdAt)}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(post); }} className="text-xs gap-2">
                        <ScanEye className="w-3.5 h-3.5" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(post); }} className="text-xs gap-2">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopySlug(post.slug); }} className="text-xs gap-2">
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onDelete(post); }}
                        className="text-xs gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* ── Desktop/Tablet: Vertical card layout ── */}
          <div className="hidden sm:block">
            {/* Thumbnail */}
            <div className="relative h-36 bg-muted overflow-hidden">
              {post.featuredImage ? (
                <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-fuchsia-500/10">
                  <FileText className="w-10 h-10 text-muted-foreground/20" />
                </div>
              )}
              {/* Status overlay */}
              <div className="absolute top-2.5 left-2.5">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold backdrop-blur-sm",
                  post.isPublished
                    ? "bg-emerald-500/90 text-white"
                    : "bg-amber-500/90 text-white"
                )}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  {post.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              {/* Category */}
              <div className="absolute top-2.5 right-2.5">
                <Badge className={cn("text-[9px] px-2 py-0.5 rounded-full backdrop-blur-sm", CATEGORY_OPTIONS.find(c => c.value === post.category)?.color)}>
                  {CATEGORY_OPTIONS.find(c => c.value === post.category)?.label || post.category}
                </Badge>
              </div>
            </div>

            <CardContent className="p-4">
              <h3 className="font-semibold text-sm truncate mb-1">{post.title}</h3>
              {post.excerpt && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{post.excerpt}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(post.viewCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(post.createdAt)}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(post); }} className="text-xs gap-2">
                      <ScanEye className="w-3.5 h-3.5" /> Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(post); }} className="text-xs gap-2">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopySlug(post.slug); }} className="text-xs gap-2">
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(post); }}
                      className="text-xs gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {post.author && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                  <User className="w-3 h-3" />
                  {post.author}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────
function EmptyState({ hasSearch, onCreate }: { hasSearch: boolean; onCreate: () => void }) {
  return (
    <Card className="rounded-xl border-border/50">
      <CardContent className="py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/60 mx-auto mb-4 flex items-center justify-center">
          <FileOutput className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <h3 className="font-semibold text-sm mb-1">
          {hasSearch ? 'Tidak ada hasil' : 'Belum ada artikel'}
        </h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
          {hasSearch
            ? 'Coba ubah kata kunci pencarian atau filter yang aktif'
            : 'Mulai buat artikel pertama kamu untuk meningkatkan SEO dan engagement'}
        </p>
        {!hasSearch && (
          <Button onClick={onCreate} size="sm" className="rounded-xl text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Buat Artikel Pertama
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Skeletons ──────────────────────────────────────────────────────
function CommandCenterSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function ContentSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'table') {
    return (
      <Card className="rounded-xl border-border/50">
        <div className="p-4 space-y-0">
          <Skeleton className="h-8 w-full mb-0 rounded-lg" />
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-none" />
          ))}
        </div>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="rounded-xl border-border/50 overflow-hidden">
          <Skeleton className="h-36" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Blog Preview Dialog ────────────────────────────────────────────
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ScanEye className="w-4 h-4 text-primary" />
            <DialogTitle className="text-sm font-medium">Preview Artikel</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={post.isPublished ? 'default' : 'secondary'}
              className={cn(
                "text-[9px] px-2 py-0.5 rounded-full",
                post.isPublished && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {post.isPublished ? 'Published' : 'Draft'}
            </Badge>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 rounded-lg" asChild>
              <a href={postUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="w-3 h-3" />
                Buka di Browser
              </a>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero */}
          <div className="relative py-8 md:py-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-fuchsia-500/5 dark:from-primary/10 dark:to-fuchsia-500/10" />
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl mx-auto">
                <Badge className={cn("mb-3 text-[9px] px-2 py-0.5 rounded-full", CATEGORY_OPTIONS.find(c => c.value === post.category)?.color)}>
                  {CATEGORY_OPTIONS.find(c => c.value === post.category)?.label || post.category}
                </Badge>
                <h1 className="text-2xl md:text-3xl font-bold mb-3 leading-tight tracking-tight">{post.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {post.author && (
                    <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{post.author}</div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {post.publishedAt ? formatDateFull(post.publishedAt) : formatDateFull(post.createdAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {post.viewCount} views
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
                  <img src={post.featuredImage} alt={post.title} className="w-full h-auto max-h-[350px] object-cover" />
                </div>
              </div>
            </div>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <div className="px-4 pb-4">
              <div className="max-w-3xl mx-auto">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/60">
                  <p className="text-sm italic text-muted-foreground leading-relaxed">{post.excerpt}</p>
                </div>
              </div>
            </div>
          )}

          {/* Article Body */}
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
                  prose-ul:my-3 prose-ol:my-3 prose-li:text-muted-foreground
                  prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r-lg
                  prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded text-sm
                  prose-pre:bg-muted prose-pre:border prose-pre:text-sm
                  prose-img:rounded-xl prose-img:shadow-lg"
                dangerouslySetInnerHTML={{ __html: post.content.includes('<') ? post.content : post.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br />').replace(/^/, '<p>').replace(/$/, '</p>') }}
              />
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="px-4 pb-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEO Info */}
          <div className="px-4 pb-8">
            <div className="max-w-3xl mx-auto">
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                {post.metaTitle && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <span className="text-muted-foreground uppercase tracking-wider text-[9px] font-medium">Meta Title</span>
                    <p className="mt-1 font-medium">{post.metaTitle}</p>
                  </div>
                )}
                {post.metaDescription && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <span className="text-muted-foreground uppercase tracking-wider text-[9px] font-medium">Meta Description</span>
                    <p className="mt-1">{post.metaDescription}</p>
                  </div>
                )}
                {post.keywords && (
                  <div className="bg-muted/30 rounded-lg p-3 sm:col-span-2">
                    <span className="text-muted-foreground uppercase tracking-wider text-[9px] font-medium">Keywords</span>
                    <p className="mt-1">{post.keywords}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
