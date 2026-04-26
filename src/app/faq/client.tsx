'use client';

import { useState } from 'react';
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
import { HelpCircle, Search, MessageCircle } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { Input } from '@/components/ui/input';

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
  pembayaran: 'Pembayaran',
  mitra: 'Mitra',
};

const categoryColors: Record<string, string> = {
  umum: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  layanan: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  pembayaran: 'bg-green-500/10 text-green-600 border-green-500/20',
  mitra: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

const categoryIcons: Record<string, string> = {
  umum: '📋',
  layanan: '🛠️',
  pembayaran: '💳',
  mitra: '🤝',
};

export default function FAQClient({ initialFaqs }: FAQClientProps) {
  const { config } = useSiteConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const siteName = config.websiteTitle || 'Black Bear';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

  // Highlight matching text in search
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    const lowerSearch = search.toLowerCase();
    return parts.map((part, i) =>
      part.toLowerCase() === lowerSearch ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5">{part}</mark> : part
    );
  };

  // Group FAQs by category
  const groupedFaqs = initialFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  // Filter FAQs based on search and category
  const filteredGroupedFaqs = Object.entries(groupedFaqs).reduce((acc, [category, faqs]) => {
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

  // Get all FAQs for JSON-LD
  const allFaqsForJsonLd = Object.values(filteredGroupedFaqs).flat();

  // Generate FAQ JSON-LD
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqsForJsonLd.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'FAQ',
        item: `${siteUrl}/faq`,
      },
    ],
  };

  const handleContactWhatsApp = () => {
    const message = `Halo, saya ingin bertanya tentang layanan ${siteName}`;
    const url = config.footerWhatsapp 
      ? `https://wa.me/${config.footerWhatsapp}?text=${encodeURIComponent(message)}`
      : null;
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

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
                <BreadcrumbPage>FAQ</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Pertanyaan Umum
            </h1>
            <p className="text-lg text-muted-foreground">
              Temukan jawaban untuk pertanyaan yang sering diajukan seputar layanan {siteName}
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-6 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari pertanyaan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Cari pertanyaan"
                />
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
                {Object.keys(categoryLabels).map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="h-8"
                  >
                    {categoryLabels[cat]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {Object.keys(filteredGroupedFaqs).length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Tidak Ditemukan</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Tidak ada pertanyaan yang sesuai dengan pencarian Anda.
                  Silakan coba kata kunci lain atau hubungi kami.
                </p>
              </div>
            ) : (
              Object.entries(filteredGroupedFaqs).map(([category, faqs]) => (
                <div key={category} className="mb-8">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{categoryIcons[category] || '📋'}</span>
                    <h2 className="text-xl font-semibold">
                      {categoryLabels[category] || category}
                    </h2>
                    <Badge variant="outline" className={categoryColors[category] || ''}>
                      {faqs.length} pertanyaan
                    </Badge>
                  </div>

                  {/* Accordion */}
                  <Card className="border-border/50">
                    <CardContent className="p-0">
                      <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                          <AccordionItem 
                            key={faq.id} 
                            value={faq.id}
                            className={index === faqs.length - 1 ? 'border-b-0' : ''}
                          >
                            <AccordionTrigger className="px-6 hover:no-underline">
                              <span className="text-left font-medium pr-4">
                                {faq.question}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 text-muted-foreground leading-relaxed">
                              {highlightText(faq.answer, searchQuery)}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/10 via-background to-purple-500/10 border-border/50">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">
                  Masih Ada Pertanyaan?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Tim kami siap membantu Anda 24/7. Jangan ragu untuk menghubungi kami.
                </p>
                {config.footerWhatsapp && (
                  <Button onClick={handleContactWhatsApp} className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Hubungi via WhatsApp
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
