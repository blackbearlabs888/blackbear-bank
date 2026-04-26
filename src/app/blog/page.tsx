'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Calendar, Eye, Search, Filter, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { SimplePagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';

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
  content?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const categories = [
  { value: '', label: 'Semua' },
  { value: 'artikel', label: 'Artikel' },
  { value: 'tips', label: 'Tips' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'berita', label: 'Berita' },
];

const categoryColors: Record<string, string> = {
  artikel: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
  tips: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
  tutorial: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
  berita: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
};

const getReadingTime = (content: string) => {
  // If content has HTML or substantial text, use word count
  const cleaned = content.replace(/<[^>]*>/g, '').trim();
  if (cleaned.length > 100) {
    const words = cleaned.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }
  // Fallback: character-based estimate from excerpt
  return Math.max(1, Math.ceil(content.length / 1000));
};

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [fetchError, setFetchError] = useState(false);

  const fetchPosts = useCallback(async (page: number = 1) => {
    setLoading(true);
    setFetchError(false);
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
        // Client-side search filter for simplicity
        let filteredPosts = result.data;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
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
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  const handlePageChange = (page: number) => {
    fetchPosts(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const siteName = config.websiteTitle || 'Black Bear';

  return (
    <div className="min-h-screen bg-background">
      {/* Error Banner */}
      {fetchError && !loading && (
        <div className="bg-destructive/5 border-b border-destructive/20">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-destructive flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Gagal memuat artikel. Periksa koneksi internet Anda.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPosts(pagination.page)}
              className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Blog</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Blog <span className="text-primary">{siteName}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Temukan tips, tutorial, dan informasi terbaru seputar layanan tarik tunai, 
              pengelolaan keuangan, dan update dari {siteName}.
            </p>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-6 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari artikel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Cari artikel blog"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className="h-8"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-20 mb-4" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              {/* Empty state illustration */}
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
                <div className="relative">
                  <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="w-2.5 h-2.5 text-primary/40" />
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Belum Ada Artikel</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {searchQuery || selectedCategory
                  ? 'Tidak ditemukan artikel yang sesuai dengan filter Anda.'
                  : 'Artikel akan segera hadir. Silakan kembali lagi nanti.'}
              </p>
              {(searchQuery || selectedCategory) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                  className="rounded-xl"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Featured Post Hero */}
              {posts.length > 0 && (
                <div className="mb-8 animate-fade-in">
                  <Link href={`/blog/${posts[0].slug}`} className="group block relative overflow-hidden rounded-2xl">
                    <div className="aspect-[21/9] relative">
                      {posts[0].featuredImage ? (
                        <img src={posts[0].featuredImage} alt={posts[0].title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
                          <span className="text-6xl font-bold text-primary/30">{posts[0].title.charAt(0)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                        <Badge variant="secondary" className="mb-3">Featured</Badge>
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{posts[0].title}</h2>
                        <p className="text-white/70 line-clamp-2 max-w-2xl">{posts[0].excerpt}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-white/60">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{posts[0].publishedAt ? formatDate(posts[0].publishedAt) : formatDate(posts[0].createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{getReadingTime(posts[0].content || posts[0].excerpt || '')} menit</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{posts[0].viewCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Remaining Posts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.slice(1).map((post, index) => (
                  <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}>
                  <Link href={`/blog/${post.slug}`} className="group block h-full">
                    <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 motion-safe:hover:-translate-y-1">
                      {/* Featured Image */}
                      <div className="relative h-48 bg-muted overflow-hidden">
                        {post.featuredImage ? (
                          <img
                            src={post.featuredImage}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
                            <span className="text-4xl font-bold text-primary/30">
                              {post.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <Badge className={categoryColors[post.category] || ''}>
                            {post.category}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-6 flex flex-col">
                        <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h2>
                        
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                            {post.excerpt}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {post.publishedAt
                                ? formatDate(post.publishedAt)
                                : formatDate(post.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{getReadingTime(post.content || post.excerpt || '')} menit</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{post.viewCount}</span>
                          </div>
                        </div>

                        {/* Read More Button */}
                        <div className="flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-1 group-hover:translate-x-0">
                          <span>Baca Selengkapnya</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-12">
                  <SimplePagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* JSON-LD for Blog Listing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
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
