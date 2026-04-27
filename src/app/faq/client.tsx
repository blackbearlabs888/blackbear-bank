'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { HelpCircle, Search, MessageCircle, Shield, Clock, CreditCard, TrendingUp } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isActive: boolean;
}

interface FAQClientProps {
  initialFaqs: FAQ[];
}

const categoryLabels: Record<string, string> = {
  umum: 'Umum',
  layanan: 'Layanan',
  keamanan: 'Keamanan',
  pembayaran: 'Pembayaran',
  mitra: 'Mitra',
};

const categoryColors: Record<string, string> = {
  umum: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
  layanan: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  keamanan: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  pembayaran: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
  mitra: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
};

const categoryIcons: Record<string, React.ReactNode> = {
  umum: <HelpCircle className="w-5 h-5" />,
  layanan: <CreditCard className="w-5 h-5" />,
  keamanan: <Shield className="w-5 h-5" />,
  pembayaran: <TrendingUp className="w-5 h-5" />,
  mitra: <MessageCircle className="w-5 h-5" />,
};

export default function FAQClient({ initialFaqs }: FAQClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
  const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER || '6281234567890';

  // Group FAQs by category
  const groupedFaqs = useMemo(() => {
    return initialFaqs.reduce((acc, faq) => {
      if (!acc[faq.category]) {
        acc[faq.category] = [];
      }
      acc[faq.category].push(faq);
      return acc;
    }, {} as Record<string, FAQ[]>);
  }, [initialFaqs]);

  // Filter FAQs based on search and category
  const filteredGroupedFaqs = useMemo(() => {
    return Object.entries(groupedFaqs).reduce((acc, [category, faqs]) => {
      if (selectedCategory && category !== selectedCategory) {
        return acc;
      }

      const filtered = faqs.filter(faq => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
        );
      });

      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    }, {} as Record<string, FAQ[]>);
  }, [groupedFaqs, selectedCategory, searchQuery]);

  // Count total FAQs per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(groupedFaqs).forEach(([cat, faqs]) => {
      counts[cat] = faqs.length;
    });
    return counts;
  }, [groupedFaqs]);

  // FAQs for JSON-LD
  const allFaqsForJsonLd = Object.values(filteredGroupedFaqs).flat();
  const activeCategories = Object.keys(groupedFaqs);

  const handleContactWhatsApp = () => {
    const message = 'Halo, saya ingin bertanya tentang layanan Black Bear';
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: allFaqsForJsonLd.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
              { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${siteUrl}/faq` },
            ],
          }),
        }}
      />

      {/* Hero Section */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5" />
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>FAQ</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Pertanyaan Umum
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Temukan jawaban untuk pertanyaan yang sering diajukan seputar layanan kami
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>{initialFaqs.length} Pertanyaan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                <span>{activeCategories.length} Kategori</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter — sticky */}
      <section className="py-6 border-b sticky top-16 z-10 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari pertanyaan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap justify-center">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="h-8"
              >
                Semua
              </Button>
              {activeCategories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="h-8"
                >
                  {categoryLabels[cat] || cat}
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {categoryCounts[cat] || 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {initialFaqs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <HelpCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Belum Ada FAQ</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Pertanyaan umum belum tersedia saat ini. Silakan hubungi kami untuk informasi lebih lanjut.
                </p>
                <Button onClick={handleContactWhatsApp} className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Hubungi via WhatsApp
                </Button>
              </div>
            ) : Object.keys(filteredGroupedFaqs).length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Tidak Ditemukan</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Tidak ada pertanyaan yang sesuai dengan pencarian &quot;{searchQuery}&quot;.
                  Silakan coba kata kunci lain.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                >
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(filteredGroupedFaqs).map(([category, faqs]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${categoryColors[category] || 'bg-muted'}`}>
                        {categoryIcons[category] || <HelpCircle className="w-5 h-5" />}
                      </div>
                      <h2 className="text-xl font-semibold">
                        {categoryLabels[category] || category}
                      </h2>
                      <Badge variant="outline" className={`ml-auto ${categoryColors[category] || ''}`}>
                        {faqs.length} pertanyaan
                      </Badge>
                    </div>

                    {/* Accordion */}
                    <Card className="border-border/50 shadow-sm">
                      <CardContent className="p-0">
                        <Accordion type="single" collapsible className="w-full">
                          {faqs.map((faq, index) => (
                            <AccordionItem
                              key={faq.id}
                              value={faq.id}
                              className={index === faqs.length - 1 ? 'border-b-0' : ''}
                            >
                              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors text-left">
                                <span className="font-medium pr-4 text-sm sm:text-base">
                                  {faq.question}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="px-5 pb-5 text-muted-foreground leading-relaxed text-sm sm:text-base">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 border-border/50 shadow-sm">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  Masih Ada Pertanyaan?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Tim kami siap membantu Anda 24/7. Jangan ragu untuk menghubungi kami via WhatsApp.
                </p>
                <Button onClick={handleContactWhatsApp} size="lg" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Hubungi via WhatsApp
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
