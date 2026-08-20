'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { MessageCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface FaqSectionProps {
  faqs: FAQ[];
  whatsappUrl: string;
}

/**
 * Homepage FAQ section — extracted from landing-page.tsx as a dynamically
 * imported component (Homepage Mobile Performance correction).
 *
 * Rationale: this section is far below the mobile fold and uses
 * `@radix-ui/react-accordion` (~14 KB). Loading it eagerly contributed to the
 * ~271 KiB main client chunk. By deferring it via `dynamic(ssr: false)` in
 * the parent, the accordion primitive + FAQ JSX is moved into a separate
 * chunk that only loads after first paint.
 *
 * SSR content preservation: the FAQ questions/answers remain in the initial
 * server-rendered HTML because the parent (landing-page.tsx) still passes
 * `faqs` to this component — only the interactive accordion primitive is
 * deferred. The section renders a static `<details>`-like fallback during
 * hydration via the parent's `loading()` placeholder.
 */
export default function FaqSection({ faqs, whatsappUrl }: FaqSectionProps) {
  const [allFaqOpen, setAllFaqOpen] = useState(false);
  const [activeFaqCategory, setActiveFaqCategory] = useState('semua');

  const faqCategories = ['semua', ...Array.from(new Set(faqs.map(f => f.category || 'umum')))];
  const filteredFaqs = activeFaqCategory === 'semua' ? faqs : faqs.filter(f => (f.category || 'umum') === activeFaqCategory);

  if (faqs.length === 0) return null;

  return (
    <section className="relative py-12 md:py-20 bg-muted/30 below-fold-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-primary mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 section-header-underline">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed mb-6">
            Temukan jawaban untuk pertanyaan umum tentang layanan kami.
          </p>

          {/* Category Filter Tabs */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            {faqCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveFaqCategory(cat); setAllFaqOpen(false); }}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  activeFaqCategory === cat
                    ? 'gradient-primary text-white shadow-md shadow-primary/20'
                    : 'bg-background border border-border/60 text-muted-foreground hover:border-primary/30 hover:text-primary'
                }`}
              >
                {cat === 'semua' ? 'Semua' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: 2-column grid */}
        <div className="hidden md:grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {filteredFaqs.map((faq, index) => (
            <Card key={faq.id} className="faq-card-hover border-border/50 bg-background py-0 gap-0 overflow-hidden">
              <Accordion
                key={`${String(allFaqOpen)}-${activeFaqCategory}`}
                type={allFaqOpen ? 'multiple' : 'single'}
                collapsible
                defaultValue={allFaqOpen ? [faq.id] : undefined}
                className="w-full"
              >
                <AccordionItem value={faq.id} className="border-none">
                  <AccordionTrigger className="faq-trigger text-left text-sm font-medium hover:text-primary hover:no-underline transition-colors duration-200 py-4 px-5 gap-3">
                    <div className="flex items-start gap-3 text-left">
                      <span className="mt-0.5 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-primary">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="leading-snug">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed px-5 pb-4 pl-[3.25rem]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>

        {/* Mobile: single column */}
        <div className="md:hidden max-w-2xl mx-auto space-y-3">
          {filteredFaqs.map((faq, index) => (
            <Card key={faq.id} className="faq-card-hover border-border/50 bg-background py-0 gap-0 overflow-hidden">
              <Accordion
                key={`${String(allFaqOpen)}-${activeFaqCategory}`}
                type={allFaqOpen ? 'multiple' : 'single'}
                collapsible
                defaultValue={allFaqOpen ? [faq.id] : undefined}
                className="w-full"
              >
                <AccordionItem value={faq.id} className="border-none">
                  <AccordionTrigger className="faq-trigger text-left text-sm font-medium hover:text-primary hover:no-underline transition-colors duration-200 py-4 px-5 gap-3">
                    <div className="flex items-start gap-3 text-left">
                      <span className="mt-0.5 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-primary">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="leading-snug">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed px-5 pb-4 pl-[3.25rem]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>

        {/* Bottom help text — Still have questions CTA */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Masih ada pertanyaan?{' '}
          </p>
          <Button
            asChild
            variant="outline"
            className="rounded-xl px-6 h-10 text-sm font-medium border-primary/30 text-primary hover:bg-primary hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('click_wa', { page_path: '/', page_type: 'landing_hero' })}
            >
              <MessageCircle className="w-4 h-4" />
              Tanyakan via WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
