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
  Wallet,
  Shield,
  Clock,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  CreditCard,
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

interface PencairanPaylaterClientProps {
  paymentTypes: PaymentTypeOption[];
  palangkaRayaActive: boolean;
  canonicalUrl: string;
}

// Pillar-specific informational FAQs derived from this page's own alur /
// ketentuan akun / transparansi biaya sections. NOT invented claims about
// specific provider support, required documents, minimum limits, or duration.
const pillarFaqs: Array<{ question: string; answer: string }> = [
  {
    question: 'Apa itu layanan pencairan limit paylater online?',
    answer:
      'Layanan pencairan limit paylater online memungkinkan Anda mengajukan pencairan dana dari limit paylater Anda melalui proses online, dengan biaya yang ditampilkan di kalkulator sebelum Anda melanjutkan.',
  },
  {
    question: 'Provider paylater mana saja yang aktif terdaftar?',
    answer:
      'Daftar provider paylater aktif terdaftar ditampilkan pada kalkulator biaya di halaman ini. Provider berasal dari konfigurasi metode pembayaran yang aktif dan publik — tidak di-hardcode.',
  },
  {
    question: 'Apa ketentuan akun yang perlu saya ketahui?',
    answer:
      'Akun paylater Anda harus aktif dan dapat diakses untuk verifikasi. Setiap pengajuan melewati prosedur verifikasi data berstruktur sebelum diproses lebih lanjut. Estimasi waktu akan diberikan setelah verifikasi data selesai.',
  },
  {
    question: 'Apakah biaya ditampilkan sebelum saya melanjutkan?',
    answer:
      'Ya. Simulasi biaya tersedia di kalkulator biaya pada halaman ini. Pilih provider paylater aktif dan masukkan nominal untuk melihat rincian komponen biaya secara terbuka.',
  },
];

export default function PencairanPaylaterClient({
  paymentTypes,
  palangkaRayaActive,
  canonicalUrl,
}: PencairanPaylaterClientProps) {
  const { config } = useSiteConfig();
  const waUrl = config.footerWhatsapp
    ? `https://wa.me/${config.footerWhatsapp}`
    : '#';
  const pagePath = '/pencairan-paylater';

  // SEO Batch 1 QA correction #3: pillar FAQ section now renders ONLY the
  // pillar-specific `pillarFaqs` array below. Generic DB FAQs (all categories)
  // are no longer appended — they were duplicating /faq content.

  // Provider aktif & publik — berasal dari PaymentType config (filter name
  // mengandung "paylater"). Tidak di-hardcode. Jika kosong, tampilkan teks
  // netral sesuai pedoman ("jika tidak tersedia, gunakan penjelasan netral").
  const paylaterProviders = paymentTypes.filter((pt) =>
    pt.name.toLowerCase().includes('paylater'),
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
                <BreadcrumbPage>Pencairan Limit Paylater</BreadcrumbPage>
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
              <Wallet className="w-3.5 h-3.5" />
              <span>Layanan Pencairan Limit Paylater</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Layanan Pencairan Limit Paylater Online
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Ajukan pencairan dana dari limit paylater Anda melalui proses
              online. Provider berasal dari konfigurasi metode pembayaran aktif,
              biaya ditampilkan di kalkulator, dan status transaksi dapat
              dipantau melalui sistem tracking order.
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
                      page_type: 'pencairan_paylater',
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

      {/* ==================== PENGANTAR ==================== */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Tentang Layanan
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Layanan ini memfasilitasi pencairan dana dari limit paylater Anda
            melalui proses online. Setiap pengajuan melewati prosedur verifikasi
            data berstruktur sebelum diproses lebih lanjut, dengan status yang
            dapat dipantau melalui sistem tracking order.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Biaya layanan ditampilkan secara terbuka di kalkulator biaya
            sebelum Anda melanjutkan. Komponen biaya dapat dilihat di awal
            sehingga Anda mengetahui nominal yang akan diterima.
          </p>
        </div>
      </section>

      {/* ==================== PROVIDER AKTIF ==================== */}
      <section className="py-10 md:py-14 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Provider Aktif
            </h2>
            <p className="text-muted-foreground">
              Provider berasal dari konfigurasi metode pembayaran yang aktif
              dan publik.
            </p>
          </div>
          {paylaterProviders.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {paylaterProviders.map((provider) => (
                <Card key={provider.id} className="border-border/50 py-0 gap-0">
                  <CardContent className="p-4 flex items-center gap-3">
                    {provider.logoUrl ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-background/50 border border-border/30 flex items-center justify-center flex-shrink-0">
                        <img
                          src={provider.logoUrl}
                          alt={provider.name}
                          width={40}
                          height={40}
                          loading="lazy"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">Provider aktif</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/50 py-0 gap-0 max-w-2xl mx-auto">
              <CardContent className="p-6 text-center">
                <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Belum ada provider paylater yang aktif terdaftar saat ini.
                  Silakan tanyakan ketersediaan provider terbaru melalui
                  WhatsApp.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ==================== ALUR VERIFIKASI ==================== */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Alur Verifikasi
            </h2>
            <p className="text-muted-foreground">
              Tahapan yang dilewati setiap pengajuan pencairan limit paylater.
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
                  'Tim kami memverifikasi data dan akun paylater Anda sebelum proses pencairan dilanjutkan.',
              },
              {
                step: 3,
                icon: CreditCard,
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

      {/* ==================== KETENTUAN AKUN ==================== */}
      <section className="py-10 md:py-14 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Ketentuan Akun
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                Akun paylater Anda harus aktif dan dapat diakses untuk
                keperluan verifikasi.
              </span>
            </li>
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
        </div>
      </section>

      {/* ==================== TRANSPARANSI BIAYA + SHARED CALCULATOR ==================== */}
      <section
        id="simulasi-biaya"
        className="py-10 md:py-14"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/15 bg-primary/5 text-primary text-xs font-medium mb-3">
              <Calculator className="w-3.5 h-3.5" />
              <span>Transparansi Biaya</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Simulasi Biaya Pencairan Paylater
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

      {/* ==================== FAQ ==================== */}
      <section className="py-10 md:py-14 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              FAQ Pencairan Limit Paylater
            </h2>
            <p className="text-muted-foreground">
              Pertanyaan yang sering diajukan seputar layanan pencairan limit
              paylater.
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
                    page_type: 'pencairan_paylater',
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

      {/* ==================== INTERNAL LINK KE /pencairan-kartu-kredit + /lokasi ==================== */}
      <section className="py-10 md:py-14 bg-muted/20 border-t border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-3">
          <Card className="border-border/50 py-0 gap-0">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-base">
                  Lihat juga layanan pencairan lainnya
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pelajari layanan pencairan limit kartu kredit online.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-lg flex-shrink-0">
                <Link href="/pencairan-kartu-kredit">
                  Pencairan Limit Kartu Kredit
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/50 py-0 gap-0">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-base">
                  Layanan tersedia di berbagai lokasi
                </h3>
                <p className="text-sm text-muted-foreground">
                  Daftar lokasi dengan mitra aktif dapat dilihat di /lokasi.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                <Button asChild variant="outline" size="sm" className="rounded-lg">
                  <Link href="/lokasi">
                    <MapPin className="w-3.5 h-3.5" />
                    Lihat Daftar Lokasi
                  </Link>
                </Button>
                {palangkaRayaActive && (
                  <Button asChild variant="ghost" size="sm" className="rounded-lg">
                    <Link href="/lokasi/palangka-raya">
                      Palangka Raya
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
