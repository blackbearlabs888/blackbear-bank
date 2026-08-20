'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  CreditCard,
  Shield,
  Clock,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Wallet,
  Calculator,
  MapPin,
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { trackEvent } from '@/lib/analytics/track';

const RateCalculator = dynamic(
  () => import('@/components/landing/rate-calculator'),
  {
    loading: () => (
      <div className="py-12 md:py-16">
        <div className="max-w-2xl mx-auto h-96 rounded-2xl bg-muted/50 animate-pulse" />
      </div>
    ),
    ssr: false,
  },
);

interface PaymentTypeOption {
  id: string;
  name: string;
  logoUrl: string | null;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  discountPercent: number;
  discountNominal: number;
  minTransaction: number;
}

interface PencairanKartuKreditClientProps {
  paymentTypes: PaymentTypeOption[];
  palangkaRayaActive: boolean;
  canonicalUrl: string;
}

// Pillar-specific informational FAQs derived from this page's own alur /
// persyaratan / ketentuan sections. NOT invented claims about Visa/Mastercard
// support, required documents, minimum limits, or duration estimates.
const pillarFaqs: Array<{ question: string; answer: string }> = [
  {
    question: 'Apa itu layanan pencairan limit kartu kredit online?',
    answer:
      'Layanan pencairan limit kartu kredit online memungkinkan Anda mengajukan pencairan dana dari limit kartu kredit Anda melalui proses online, dengan biaya yang ditampilkan di kalkulator sebelum Anda melanjutkan.',
  },
  {
    question: 'Bagaimana alur verifikasi data berjalan?',
    answer:
      'Setiap permintaan melewati prosedur verifikasi data berstruktur sebelum diproses lebih lanjut. Estimasi waktu akan diberikan setelah verifikasi data selesai, dan dana ditransfer ke rekening yang Anda tentukan.',
  },
  {
    question: 'Di mana saya bisa melihat simulasi biaya sebelum melanjutkan?',
    answer:
      'Simulasi biaya tersedia di kalkulator biaya pada halaman ini. Pilih metode pencairan dan masukkan nominal untuk melihat rincian komponen biaya secara terbuka.',
  },
  {
    question: 'Apakah status transaksi bisa dipantau setelah pengajuan?',
    answer:
      'Ya. Setiap transaksi dapat dipantau melalui sistem tracking order. Anda dapat mengikuti status pengajuan dari awal hingga selesai di halaman /track.',
  },
];

export default function PencairanKartuKreditClient({
  paymentTypes,
  palangkaRayaActive,
  canonicalUrl,
}: PencairanKartuKreditClientProps) {
  const { config } = useSiteConfig();
  const waUrl = config.footerWhatsapp
    ? `https://wa.me/${config.footerWhatsapp}`
    : '#';
  const pagePath = '/pencairan-kartu-kredit';

  // SEO Batch 1 QA correction #3: pillar FAQ section now renders ONLY the
  // pillar-specific `pillarFaqs` array below. Generic DB FAQs (all categories)
  // are no longer appended — they were duplicating /faq content.

  // Find kartu kredit payment type to expose business rules (minTransaction,
  // threshold, discount) — derived from existing config, NOT invented.
  const kartuKreditPt = paymentTypes.find(
    (pt) => pt.name.toLowerCase().includes('kartu kredit') || pt.name.toLowerCase().includes('kartu'),
  );
  const hasBusinessRules = Boolean(
    kartuKreditPt && (kartuKreditPt.minTransaction > 0 || kartuKreditPt.threshold > 0),
  );

  return (
    <main className="flex-1">
      {/* ==================== BREADCRUMB ==================== */}
      <nav
        aria-label="Breadcrumb"
        className="border-b border-border/40 bg-muted/20"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Pencairan Limit Kartu Kredit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="relative py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5 text-primary text-sm font-medium">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Layanan Pencairan Limit Kartu Kredit</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Layanan Pencairan Limit Kartu Kredit Online
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Ajukan pencairan dana dari limit kartu kredit Anda melalui proses
              online. Simulasi biaya tersedia di kalkulator, prosedur verifikasi
              data berstruktur, dan status transaksi dapat dipantau melalui
              sistem tracking order.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button asChild size="lg" className="gradient-primary text-white rounded-xl h-12 px-6">
                <Link href="/order">
                  <ArrowRight className="w-4 h-4" />
                  Ajukan Pencairan
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-xl h-12 px-6"
              >
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('click_wa', {
                      page_path: pagePath,
                      page_type: 'pencairan_kartu_kredit',
                    })
                  }
                >
                  <MessageCircle className="w-4 h-4" />
                  Tanyakan via WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PENGANTAR LAYANAN ==================== */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Tentang Layanan
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Layanan ini memfasilitasi pencairan dana dari limit kartu kredit
            Anda melalui proses online. Setiap pengajuan melewati prosedur
            verifikasi data berstruktur sebelum diproses lebih lanjut, dengan
            status yang dapat dipantau melalui sistem tracking order.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Biaya layanan ditampilkan secara terbuka di kalkulator biaya
            sebelum Anda melanjutkan. Komponen biaya dapat dilihat di awal
            sehingga Anda mengetahui nominal yang akan diterima.
          </p>
        </div>
      </section>

      {/* ==================== ALUR VERIFIKASI ==================== */}
      <section className="py-10 md:py-14 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Alur Verifikasi
            </h2>
            <p className="text-muted-foreground">
              Tahapan yang dilewati setiap pengajuan pencairan limit kartu
              kredit.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: 1,
                icon: FileText,
                title: 'Pengajuan',
                description:
                  'Anda mengajukan pencairan melalui halaman /order dan mengisi data yang dibutuhkan.',
              },
              {
                step: 2,
                icon: Shield,
                title: 'Verifikasi Data',
                description:
                  'Tim kami memverifikasi data yang Anda berikan sebelum proses pencairan dilanjutkan.',
              },
              {
                step: 3,
                icon: Wallet,
                title: 'Pencairan',
                description:
                  'Setelah verifikasi selesai, dana ditransfer ke rekening yang Anda tentukan.',
              },
            ].map((item) => (
              <Card key={item.step} className="border-border/50 py-0 gap-0">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      TAHAP {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PERSYARATAN (dari business rule existing) ==================== */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Persyaratan
          </h2>
          {hasBusinessRules && kartuKreditPt ? (
            <ul className="space-y-3 mt-4">
              {kartuKreditPt.minTransaction > 0 && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    Nilai transaksi minimum berdasarkan konfigurasi metode
                    pembayaran aktif (lihat detail di kalkulator biaya).
                  </span>
                </li>
              )}
              {kartuKreditPt.threshold > 0 && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    Threshold diskon berlaku sesuai konfigurasi metode
                    pembayaran aktif.
                  </span>
                </li>
              )}
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  Data yang valid untuk keperluan verifikasi sebagaimana
                  dijelaskan pada tahap Verifikasi Data.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  Rekening atas nama pemohon untuk menerima pencairan dana.
                </span>
              </li>
            </ul>
          ) : (
            <p className="text-muted-foreground leading-relaxed mt-4">
              Persyaratan mengikuti konfigurasi metode pembayaran aktif.
              Detail nilai minimum dan threshold dapat dilihat di kalkulator
              biaya pada halaman ini. Data yang valid untuk keperluan verifikasi
              serta rekening atas nama pemohon menjadi dasar pemrosesan
              pengajuan.
            </p>
          )}
        </div>
      </section>

      {/* ==================== SIMULASI BIAYA (shared calculator) ==================== */}
      <section
        id="simulasi-biaya"
        className="py-10 md:py-14 bg-muted/20 border-y border-border/40"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/15 bg-primary/5 text-primary text-xs font-medium mb-3">
              <Calculator className="w-3.5 h-3.5" />
              <span>Simulasi Biaya Transparan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Simulasi Biaya Pencairan Kartu Kredit
            </h2>
            <p className="text-muted-foreground">
              Gunakan kalkulator untuk melihat rincian komponen biaya sebelum
              Anda melanjutkan. Formula biaya mengikuti konfigurasi metode
              pembayaran aktif.
            </p>
          </div>
          <RateCalculator paymentTypes={paymentTypes} />
        </div>
      </section>

      {/* ==================== LAYANAN ONLINE & LOKASI ==================== */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/50 py-0 gap-0">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Layanan Online</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pengajuan pencairan limit kartu kredit dapat dilakukan
                  sepenuhnya melalui alur online di halaman /order. Tidak perlu
                  datang ke lokasi fisik untuk memulai pengajuan.
                </p>
                <Button asChild variant="outline" size="sm" className="rounded-lg">
                  <Link href="/order">
                    Mulai Pengajuan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/50 py-0 gap-0">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Layanan di Lokasi</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Layanan tersedia di kota-kota dengan mitra aktif. Daftar
                  lokasi lengkap dapat dilihat di halaman /lokasi.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link href="/lokasi">
                      Lihat Daftar Lokasi
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                  {palangkaRayaActive && (
                    <Button asChild variant="ghost" size="sm" className="rounded-lg justify-start">
                      <Link href="/lokasi/palangka-raya">
                        Layanan di Palangka Raya
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className="py-10 md:py-14 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              FAQ Pencairan Limit Kartu Kredit
            </h2>
            <p className="text-muted-foreground">
              Pertanyaan yang sering diajukan seputar layanan pencairan limit
              kartu kredit.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {pillarFaqs.map((faq, i) => (
              <Card
                key={`${faq.question.slice(0, 40)}-${i}`}
                className="border-border/50 py-0 gap-0 mb-2"
              >
                <AccordionItem value={`item-${i + 1}`} className="border-none">
                  <AccordionTrigger className="text-left text-sm font-medium hover:text-primary hover:no-underline transition-colors duration-200 py-4 px-5 gap-3">
                    <span className="leading-snug">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed px-5 pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Siap Mengajukan Pencairan?
          </h2>
          <p className="text-muted-foreground mb-6">
            Mulai pengajuan melalui halaman /order atau tanyakan detail lebih
            lanjut via WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gradient-primary text-white rounded-xl h-12 px-6">
              <Link href="/order">
                <ArrowRight className="w-4 h-4" />
                Ajukan di /order
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl h-12 px-6">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent('click_wa', {
                    page_path: pagePath,
                    page_type: 'pencairan_kartu_kredit',
                  })
                }
              >
                <MessageCircle className="w-4 h-4" />
                Tanyakan via WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ==================== INTERNAL LINK KE /pencairan-paylater ==================== */}
      <section className="py-10 md:py-14 bg-muted/20 border-t border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <Card className="border-border/50 py-0 gap-0">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-base">
                  Lihat juga layanan pencairan lainnya
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pelajari layanan pencairan limit paylater online.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-lg flex-shrink-0">
                <Link href="/pencairan-paylater">
                  Pencairan Limit Paylater
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
