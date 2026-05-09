'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  User,
  ArrowLeft,
  Share2,
  Link2,
  Check,
  MessageCircle,
  Clock,
  ArrowRight,
  BookOpen,
  ChevronLeft,
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { toast } from 'sonner';
import { FadeInSection } from '@/components/landing/fade-in-section';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: string;
  tags: string | null;
  author: string | null;
  viewCount: number;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: string;
  author: string | null;
  viewCount: number;
  publishedAt: Date | string | null;
  createdAt: Date | string;
}

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

function estimateReadTime(content: string): number {
  const text = content.replace(/<[^>]*>/g, '');
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Extract headings from HTML content for TOC
function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const regex = /<h([2-3])[^>]*>(.*?)<\/h\1>/gi;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text) {
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      headings.push({ id, text, level: parseInt(match[1]) });
    }
  }
  return headings;
}

// Process content into properly formatted HTML with guaranteed paragraph spacing
function markdownToHtml(content: string): string {
  let html = content;

  // Already has HTML tags (from Tiptap editor)
  if (/<h[1-6][^>]*>/i.test(html) || /<p[^>]*>/i.test(html)) {
    // Ensure paragraphs have explicit spacing via data attributes
    html = html.replace(/<p>/g, '<p data-blog-p>');
    html = html.replace(/<p\s+([^>]*)>/g, '<p $1 data-blog-p>');
    return addHeadingIds(html);
  }

  // Has some inline HTML tags (bold, italic, links, etc.) but no block tags
  // This means content is plain text with possible inline formatting
  if (/<(strong|em|a|br|code|span|b|i|u|mark)[^>]*>/i.test(html)) {
    // Split by newlines to create paragraphs
    const blocks = html.split(/\n+/);
    html = blocks
      .map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        return `<p data-blog-p>${trimmed}</p>`;
      })
      .filter(Boolean)
      .join('\n');
    return addHeadingIds(html);
  }

  // Convert markdown-style formatting to HTML
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks (```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Inline code (`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes (>)
  html = html.replace(/^> (.+)$/gm, '<blockquote><p data-blog-p>$1</p></blockquote>');

  // Unordered lists (- or *)
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists (1. 2. etc)
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Horizontal rules (--- or ***)
  html = html.replace(/^-{3,}$|^\*{3,}$/gm, '<hr />');

  // Paragraphs: split by double newlines, wrap in <p>
  const blocks = html.split(/\n{2,}/);
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // Already a block element
    if (/^<(h[1-6]|ul|ol|li|pre|blockquote|hr|div)/i.test(trimmed)) return trimmed;
    // Convert single newlines to <br> within paragraphs
    return `<p data-blog-p>${trimmed.replace(/\n/g, '<br />')}</p>`;
  }).join('\n');

  // Add heading IDs
  return addHeadingIds(html);
}

// Add IDs to headings in HTML
function addHeadingIds(html: string): string {
  return html.replace(/<h([2-3])([^>]*)>(.*?)<\/h\1>/gi, (_match, level, attrs, content) => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `<h${level} id="${id}"${attrs}>${content}</h${level}>`;
  });
}

interface BlogDetailClientProps {
  post: BlogPost;
}

export default function BlogDetailClient({ post }: BlogDetailClientProps) {
  const { config } = useSiteConfig();
  const [copied, setCopied] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [activeHeading, setActiveHeading] = useState('');

  const siteName = config.websiteTitle || 'Black Bear';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
  const postUrl = `${siteUrl}/blog/${post.slug}`;

  const tags = useMemo(() => post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [], [post.tags]);
  const processedContent = useMemo(() => markdownToHtml(post.content), [post.content]);
  const headings = useMemo(() => extractHeadings(processedContent), [processedContent]);
  const readingTime = useMemo(() => estimateReadTime(post.content), [post.content]);

  // Fetch related posts
  useEffect(() => {
    async function fetchRelated() {
      try {
        const params = new URLSearchParams({
          public: 'true',
          limit: '3',
          category: post.category,
        });
        const response = await fetch(`/api/seo/blog?${params.toString()}`);
        const result = await response.json();
        if (result.success && result.data) {
          setRelatedPosts(result.data.filter((p: BlogPost) => p.id !== post.id).slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to fetch related posts:', err);
      }
    }
    fetchRelated();
  }, [post.category, post.id]);

  // Track active heading for TOC
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    const timer = setTimeout(() => {
      headings.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [headings]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success('Link berhasil disalin!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin link');
    }
  };

  const handleShareWhatsApp = () => {
    const text = `${post.title}\n\nBaca selengkapnya di: ${postUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Generate JSON-LD for Article
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || post.content.substring(0, 160),
    image: post.featuredImage || undefined,
    author: { '@type': 'Person', name: post.author || siteName },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: config.logoUrl || `${siteUrl}/logo.png`,
      },
    },
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: new Date(post.updatedAt).toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    articleSection: post.category,
    keywords: post.keywords || tags.join(', '),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute top-0 right-[15%] w-96 h-96 bg-primary/8 rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-0 left-[10%] w-72 h-72 bg-fuchsia-500/8 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '1.5s' }} />

        <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-8 pb-6">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="text-sm hover:text-primary transition-colors">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/blog" className="text-sm hover:text-primary transition-colors">Blog</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-medium max-w-[200px] sm:max-w-[350px] truncate">{post.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Featured Image (full width) */}
        {post.featuredImage && (
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="relative aspect-[21/9] md:aspect-[3/1] rounded-2xl overflow-hidden bg-muted max-w-5xl mx-auto shadow-2xl shadow-black/10">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-6 pb-10 md:pb-14">
          <div className="max-w-3xl mx-auto text-center">
            {/* Category */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <Badge className={`border text-xs font-medium ${categoryConfig[post.category]?.color || ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${categoryConfig[post.category]?.dot || 'bg-primary'}`} />
                {post.category}
              </Badge>
              {tags.length > 0 && (
                <span className="text-xs text-muted-foreground">dalam {tags[0]}</span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 leading-tight tracking-tight">
              {post.title}
            </h1>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {post.author && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-sm">
                    <span className="text-[10px] text-white font-bold">
                      {post.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground text-sm leading-tight">{post.author}</p>
                  </div>
                </div>
              )}
              <span className="hidden sm:block text-border">|</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}</span>
              </div>
              <span className="hidden sm:block text-border">|</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{readingTime} menit baca</span>
              </div>
              <span className="hidden sm:block text-border">|</span>
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>{post.viewCount} views</span>
              </div>
            </div>

            {/* Share Buttons (hero) */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="gap-2 rounded-full text-xs font-medium border-border/50 hover:border-green-500/30 hover:bg-green-500/5 hover:text-green-600"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2 rounded-full text-xs font-medium border-border/50"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-500" /> Disalin</>
                ) : (
                  <><Link2 className="w-3.5 h-3.5" /> Salin Link</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Article Body + Sidebar Layout */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto flex gap-10 lg:gap-14">
            {/* Article Content */}
            <article className="flex-1 min-w-0">
              <FadeInSection>
                <div
                  className="prose prose-lg dark:prose-invert max-w-none
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:scroll-mt-24
                    prose-h3:text-lg md:prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:scroll-mt-24
                    prose-p:text-muted-foreground prose-p:leading-[1.8] prose-p:text-[15px]
                    prose-a:text-primary prose-a:underline decoration-primary/30 hover:prose-a:decoration-primary
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-ul:my-5 prose-ol:my-5
                    prose-li:text-muted-foreground prose-li:leading-[1.7]
                    prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-xl prose-blockquote:my-6
                    prose-blockquote p:text-foreground/80 prose-blockquote p:italic
                    prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl prose-pre:shadow-sm
                    prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                    prose-hr:border-border/30 prose-hr:my-10
                    blog-prose-fallback
                  "
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
              </FadeInSection>

              {/* Tags */}
              {tags.length > 0 && (
                <FadeInSection className="mt-10">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground">Tags:</span>
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs font-medium rounded-full px-3 py-1 bg-muted/60 hover:bg-muted transition-colors cursor-default">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </FadeInSection>
              )}

              {/* Share CTA Card */}
              <FadeInSection className="mt-10">
                <div className="rounded-2xl border border-border/40 bg-gradient-to-r from-primary/5 via-card to-fuchsia-500/5 p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
                        <Share2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Bagikan Artikel Ini</h3>
                        <p className="text-xs text-muted-foreground">Bantu teman Anda menemukan artikel bermanfaat ini</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleShareWhatsApp} className="gap-2 rounded-xl shadow-sm shadow-primary/10">
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </Button>
                      <Button variant="outline" onClick={handleCopyLink} className="gap-2 rounded-xl">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
                        {copied ? 'Disalin!' : 'Salin Link'}
                      </Button>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            </article>

            {/* Sticky Sidebar - Desktop only */}
            {headings.length > 0 && (
              <aside className="hidden lg:block w-56 flex-shrink-0">
                <div className="sticky top-24">
                  <FadeInSection>
                    <div className="rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Daftar Isi
                      </h4>
                      <nav className="space-y-1 max-h-[60vh] overflow-y-auto scrollbar-thin">
                        {headings.map(({ id, text, level }) => (
                          <a
                            key={id}
                            href={`#${id}`}
                            className={`
                              block text-xs leading-relaxed py-1 px-2 rounded-lg transition-all duration-200
                              ${activeHeading === id
                                ? 'text-primary font-medium bg-primary/8 border-l-2 border-primary pl-2'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 pl-3'
                              }
                              ${level === 3 ? 'ml-3' : ''}
                            `}
                          >
                            {text}
                          </a>
                        ))}
                      </nav>
                    </div>
                  </FadeInSection>
                </div>
              </aside>
            )}
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-10 md:py-14 border-t border-border/30">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <FadeInSection>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">Artikel Terkait</h2>
                    <p className="text-sm text-muted-foreground mt-1">Baca artikel lainnya yang mungkin menarik</p>
                  </div>
                  <Link href="/blog" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all">
                    Semua Artikel <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </FadeInSection>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {relatedPosts.map((relatedPost, index) => (
                  <FadeInSection key={relatedPost.id} style={{ animationDelay: `${index * 100}ms` }}>
                    <Link href={`/blog/${relatedPost.slug}`} className="group block h-full">
                      <div className="h-full rounded-xl border border-border/40 bg-card/50 hover:bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
                        <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                          {relatedPost.featuredImage ? (
                            <img
                              src={relatedPost.featuredImage}
                              alt={relatedPost.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-fuchsia-500/10">
                              <span className="text-4xl font-black text-primary/15">{relatedPost.title.charAt(0)}</span>
                            </div>
                          )}
                          <div className="absolute top-2.5 left-2.5">
                            <Badge className={`border backdrop-blur-sm bg-background/80 text-[10px] font-medium ${categoryConfig[relatedPost.category]?.color || ''}`}>
                              <span className={`w-1 h-1 rounded-full mr-1 ${categoryConfig[relatedPost.category]?.dot || 'bg-primary'}`} />
                              {relatedPost.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-sm font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {relatedPost.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{relatedPost.publishedAt ? formatDate(relatedPost.publishedAt) : formatDate(relatedPost.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{relatedPost.viewCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </FadeInSection>
                ))}
              </div>

              {/* Mobile back to blog link */}
              <div className="mt-8 text-center sm:hidden">
                <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <ChevronLeft className="w-4 h-4" />
                  Lihat Semua Artikel
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Back to Blog */}
      <section className="py-8 border-t border-border/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <Button asChild variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground rounded-xl -ml-2">
              <Link href="/blog">
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Blog
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
