'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Calendar,
  Eye,
  Search,
  Clock,
  TrendingUp,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { safeJsonLd } from '@/lib/json-ld-safe';
import { SimplePagination } from '@/components/ui/pagination';
import { FadeInSection } from '@/components/landing/fade-in-section';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: string;
  tags: string | null;
  author: string | null;
  viewCount: number;
  publishedAt: Date | string | null;
  createdAt: Date | string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const categories = [
  { value: '', label: 'Semua', icon: BookOpen },
  { value: 'artikel', label: 'Artikel', icon: Sparkles },
  { value: 'tips', label: 'Tips', icon: TrendingUp },
  { value: 'tutorial', label: 'Tutorial', icon: BookOpen },
  { value: 'berita', label: 'Berita', icon: Eye },
];

const categoryConfig: Record<string, { color: string; dot: string }> = {
  artikel: { color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  tips: { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  tutorial: { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  berita: { color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
};

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function estimateReadTime(content?: string | null, excerpt?: string | null): number {
  const text = content || excerpt || '';
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function BlogListingPage() {
  const { config } = useSiteConfig();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [logoError, setLogoError] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPosts = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        public: 'true',
        page: page.toString(),
        limit: '9',
      });

      if (selectedCategory) {
        params.set('category', selectedCategory);
      }

      const response = await fetch(`/api/seo/blog?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        let filteredPosts = result.data;
        if (debouncedSearch) {
          const query = debouncedSearch.toLowerCase();
          filteredPosts = filteredPosts.filter((post: BlogPost) =>
            post.title.toLowerCase().includes(query) ||
            (post.excerpt && post.excerpt.toLowerCase().includes(query))
          );
        }
        setPosts(filteredPosts);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  const handlePageChange = (page: number) => {
    fetchPosts(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  const siteName = config.websiteTitle || 'Black Bear';
  const featuredPost = posts.length > 0 ? posts[0] : null;
  const restPosts = posts.length > 1 ? posts.slice(1) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute top-10 left-[10%] w-72 h-72 bg-primary/8 rounded-full blur-[100px] animate-pulse-soft" />
        <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-fuchsia-500/8 rounded-full blur-[120px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[150px]" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-8">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="text-sm hover:text-primary transition-colors">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-medium">Blog</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="max-w-3xl">
            {/* Logo + Title */}
            <div className="flex items-center gap-3 mb-6">
              {config.logoUrl && !logoError ? (
                <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-black/30 backdrop-blur-sm border border-border/40 flex items-center justify-center p-1.5 shadow-sm">
                  <img
                    src={config.logoUrl}
                    alt={siteName}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="text-white font-bold text-sm">{siteName.substring(0, 2).toUpperCase()}</span>
                </div>
              )}
              <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-3 h-3 mr-1" />
                Blog & Artikel
              </Badge>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 tracking-tight">
              Wawasan{' '}
              <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-primary bg-clip-text text-transparent">
                Terbaru
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Tips, tutorial, dan informasi terbaru seputar layanan tarik tunai, pengelolaan keuangan, dan update dari {siteName}.
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari artikel, tips, tutorial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border/60 bg-card/50 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground bg-muted/80 rounded-md px-2 py-0.5 transition-colors"
                >
                  Esc
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.value;
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`
                      inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                      transition-all duration-200 active:scale-95 border
                      ${isActive
                        ? 'gradient-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground hover:bg-muted/50'
                      }
                    `}
                  >
                    <CatIcon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          {loading ? (
            <BlogSkeleton />
          ) : posts.length === 0 ? (
            <EmptyState searchQuery={debouncedSearch} selectedCategory={selectedCategory} />
          ) : (
            <>
              {/* Featured Post (first post) */}
              {featuredPost && !debouncedSearch && !selectedCategory && posts.length > 2 && (
                <FadeInSection className="mb-10">
                  <Link href={`/blog/${featuredPost.slug}`} className="group block">
                    <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-4 sm:p-6 md:p-8 rounded-2xl border border-border/40 bg-card/50 hover:bg-card transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 overflow-hidden">
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                      
                      {/* Content */}
                      <div className="relative z-10 flex flex-col justify-center order-2 lg:order-1">
                        <div className="flex items-center gap-2.5 mb-4">
                          <Badge className={`border text-xs font-medium ${categoryConfig[featuredPost.category]?.color || ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${categoryConfig[featuredPost.category]?.dot || 'bg-primary'}`} />
                            {featuredPost.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors duration-300 leading-tight">
                          {featuredPost.title}
                        </h2>
                        {featuredPost.excerpt && (
                          <p className="text-muted-foreground mb-5 line-clamp-2 md:line-clamp-3 leading-relaxed">
                            {featuredPost.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {featuredPost.author && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                                <span className="text-[8px] text-white font-bold">
                                  {featuredPost.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-foreground/80">{featuredPost.author}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{featuredPost.publishedAt ? formatDate(featuredPost.publishedAt) : formatDate(featuredPost.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{estimateReadTime(featuredPost.excerpt)} menit</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{featuredPost.viewCount}</span>
                          </div>
                        </div>
                        <div className="mt-5">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all duration-300">
                            Baca selengkapnya
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>

                      {/* Image */}
                      <div className="relative z-10 order-1 lg:order-2">
                        <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-muted">
                          {featuredPost.featuredImage ? (
                            <img
                              src={featuredPost.featuredImage}
                              alt={featuredPost.title}
                              width={1200}
                              height={750}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-fuchsia-500/15">
                              <span className="text-6xl md:text-8xl font-black text-primary/20">
                                {featuredPost.title.charAt(0)}
                              </span>
                            </div>
                          )}
                          {/* Overlay gradient on mobile */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent lg:hidden" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </FadeInSection>
              )}

              {/* Articles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(featuredPost && !debouncedSearch && !selectedCategory && posts.length > 2 ? restPosts : posts).map((post, index) => (
                  <FadeInSection key={post.id} className={`opacity-0`} style={{ animationDelay: `${index * 80}ms` }}>
                    <Link href={`/blog/${post.slug}`} className="group block h-full">
                      <div className="h-full rounded-xl border border-border/40 bg-card/50 hover:bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
                        {/* Image */}
                        <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                          {post.featuredImage ? (
                            <img
                              src={post.featuredImage}
                              alt={post.title}
                              width={1200}
                              height={750}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-fuchsia-500/10">
                              <span className="text-5xl font-black text-primary/15">
                                {post.title.charAt(0)}
                              </span>
                            </div>
                          )}
                          {/* Category Badge */}
                          <div className="absolute top-3 left-3">
                            <Badge className={`border backdrop-blur-sm bg-background/80 text-xs font-medium ${categoryConfig[post.category]?.color || ''}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${categoryConfig[post.category]?.dot || 'bg-primary'}`} />
                              {post.category}
                            </Badge>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                          <h3 className="text-base font-semibold mb-2 group-hover:text-primary transition-colors duration-200 line-clamp-2 leading-snug">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                              {post.excerpt}
                            </p>
                          )}

                          {/* Meta */}
                          <div className="flex items-center justify-between pt-3 border-t border-border/30">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{estimateReadTime(post.excerpt)} mnt</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                <span>{post.viewCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </FadeInSection>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <FadeInSection className="mt-12">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Menampilkan {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} artikel
                    </p>
                    <SimplePagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                      showInfo={false}
                    />
                  </div>
                </FadeInSection>
              )}
            </>
          )}
        </div>
      </section>

      {/* JSON-LD for Blog Listing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: `Blog ${siteName}`,
            description: `Artikel, tips, dan tutorial dari ${siteName}`,
            url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc'}/blog`,
            publisher: {
              '@type': 'Organization',
              name: siteName,
              logo: {
                '@type': 'ImageObject',
                url: config.logoUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc'}/logo.png`,
              },
            },
          }),
        }}
      />
    </div>
  );
}

function EmptyState({ searchQuery, selectedCategory }: { searchQuery: string; selectedCategory: string }) {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center">
        <Search className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Artikel Tidak Ditemukan</h3>
      <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
        {searchQuery || selectedCategory
          ? 'Tidak ditemukan artikel yang sesuai dengan filter Anda. Coba ubah kata kunci atau kategori.'
          : 'Belum ada artikel yang dipublikasikan. Silakan kembali lagi nanti.'}
      </p>
      {(searchQuery || selectedCategory) && (
        <p className="text-xs text-muted-foreground mt-2">
          Filter: {selectedCategory && <Badge variant="secondary" className="text-xs mx-1">{selectedCategory}</Badge>}
          {searchQuery && <span className="mx-1">&quot;{searchQuery}&quot;</span>}
        </p>
      )}
    </div>
  );
}

function BlogSkeleton() {
  return (
    <div className="space-y-6">
      {/* Featured skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 rounded-2xl border border-border/30 bg-card/30">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="aspect-[16/10] rounded-xl" />
      </div>

      {/* Grid skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/30 bg-card/30 overflow-hidden">
            <Skeleton className="aspect-[16/10] w-full" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between pt-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
