'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  CreditCard, Wallet, Truck, Shield, Clock, Users, ArrowRight,
  Zap, Star, TrendingUp, MessageCircle, Wifi,
  Smartphone, HelpCircle, Banknote, CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { OrganizationJsonLd, FAQJsonLd } from '@/components/seo/json-ld';
import TestimonialsSection from '@/components/testimonials-section';
import { formatCurrency } from '@/lib/utils';

export default function HomePage() {
  const { config, getInitials } = useSiteConfig();
  const [logoError, setLogoError] = useState(false);

  const [paymentTypes, setPaymentTypes] = useState<Array<{
    id: string;
    name: string;
    onlineFeePercent: number;
    onlineFeeFlat: number;
    codFeePercent: number;
    codFeeFlat: number;
    threshold: number;
  }>>([]);

  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([]);

  useEffect(() => {
    fetch('/api/payment-types')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setPaymentTypes(data.data.filter((pt: any) => pt.isActive));
        }
      })
      .catch(() => {});

    fetch('/api/seo/faq')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setFaqs(data.data.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  const getPaymentIcon = (index: number) => {
    const icons = [CreditCard, Wallet, Smartphone];
    return icons[index % icons.length];
  };

  return (
    <>
      <OrganizationJsonLd />
      <FAQJsonLd />

      <div className="relative">

        {/* ==================== HERO SECTION (Full Screen) ==================== */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background gradient blobs */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-1/4 w-[600px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-[100px]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Text Content */}
              <div className="text-center lg:text-left space-y-7">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5 text-primary text-sm font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Layanan Gestun #1 Terpercaya</span>
                </div>

                {/* Heading */}
                <div className="space-y-5">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                    Tarik Tunai{' '}
                    <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">
                      Cepat & Aman
                    </span>
                  </h1>
                  <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed">
                    Layanan gestun profesional untuk Kartu Kredit & Paylater. Proses instan, rate bersaing, dan 100% aman.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="gradient-primary text-white rounded-xl h-12 px-8 text-sm font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Link href="/order">
                      <Zap className="w-4 h-4" />
                      Order Sekarang
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-xl h-12 px-8 text-sm font-medium border-border/60 hover:bg-accent transition-all duration-300"
                  >
                    <Link href="/track">
                      <Truck className="w-4 h-4" />
                      Track Order
                    </Link>
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-3 pt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>100% Aman</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Proses 15-30 menit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>4.9/5 Rating</span>
                  </div>
                </div>
              </div>

              {/* Right: Hero Card (visible on all screens) */}
              <div className="flex justify-center">
                <div className="relative w-full max-w-[380px]">
                  {/* Glow */}
                  <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 via-fuchsia-500/10 to-purple-500/20 rounded-3xl blur-2xl" />

                  {/* Card */}
                  <div className="relative credit-card w-full aspect-[1.6/1] rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 dark:from-gray-800 dark:via-gray-700 dark:to-gray-900 p-6 sm:p-8 shadow-2xl border border-white/10 overflow-hidden">
                    {/* Shine */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                      <div className="credit-card-shine" />
                    </div>

                    {/* Chip */}
                    <div className="relative credit-chip w-11 h-8 rounded-md mt-1" />

                    {/* Logo */}
                    <div className="relative flex justify-end mt-[-2rem]">
                      {config.logoUrl && !logoError ? (
                        <img
                          src={config.logoUrl}
                          alt={config.websiteTitle}
                          className="w-10 h-10 rounded-lg object-contain"
                          onError={() => setLogoError(true)}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{getInitials()}</span>
                        </div>
                      )}
                    </div>

                    {/* Card number */}
                    <div className="relative mt-6 sm:mt-8 flex gap-3 sm:gap-4 text-white/60 text-sm sm:text-base tracking-[0.18em] font-mono">
                      <span>••••</span><span>••••</span><span>••••</span><span>••••</span>
                    </div>

                    {/* Details */}
                    <div className="relative mt-4 sm:mt-5 flex justify-between items-end">
                      <div>
                        <p className="text-white/30 text-[9px] sm:text-[10px] uppercase tracking-wider">Card Holder</p>
                        <p className="text-white text-xs sm:text-sm font-medium mt-0.5 truncate max-w-[120px] sm:max-w-none">{config.websiteTitle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/30 text-[9px] sm:text-[10px] uppercase tracking-wider">Gestun</p>
                        <p className="text-primary text-xs sm:text-sm font-bold mt-0.5">PREMIUM</p>
                      </div>
                    </div>
                  </div>

                  {/* Floating badges */}
                  <div className="absolute -top-3 -right-3 w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-bounce-soft">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-bounce-soft" style={{ animationDelay: '1s' }}>
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== STATS SECTION ==================== */}
        <section className="relative pb-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { value: '10K+', label: 'Transaksi', icon: CreditCard },
                  { value: '99%', label: 'Sukses Rate', icon: TrendingUp },
                  { value: '24/7', label: 'Support', icon: Clock },
                  { value: '5★', label: 'Rating', icon: Star },
                ].map((stat, i) => (
                  <Card key={i} className="border-border/50 bg-background/80 backdrop-blur-sm py-0 gap-0">
                    <CardContent className="flex items-center gap-3 p-4 md:p-5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <stat.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xl md:text-2xl font-bold tracking-tight">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== PAYMENT TYPES SECTION ==================== */}
        {paymentTypes.length > 0 && (
          <section className="relative py-20 md:py-24" id="payment-types">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              {/* Section Header */}
              <div className="text-center mb-14">
                <p className="text-sm font-medium text-primary mb-3">Jenis Pembayaran</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Metode Pembayaran Tersedia
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Berbagai pilihan pembayaran dengan rate kompetitif.
                </p>
              </div>

              {/* Payment Type Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                {paymentTypes.map((pt, index) => {
                  const Icon = getPaymentIcon(index);
                  return (
                    <Card
                      key={pt.id}
                      className="group border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-md py-0 gap-0 bg-background"
                    >
                      <CardContent className="p-6 space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{pt.name}</h3>
                            {pt.threshold > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Min. {formatCurrency(pt.threshold)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-muted/50 p-3 text-center space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                              <Wifi className="w-3 h-3" />
                              <span>Online</span>
                            </div>
                            <p className="text-lg font-bold text-primary">
                              {pt.onlineFeePercent}%
                            </p>
                            {pt.onlineFeeFlat > 0 && (
                              <p className="text-[10px] text-muted-foreground">+ {formatCurrency(pt.onlineFeeFlat)}</p>
                            )}
                          </div>
                          <div className="rounded-xl bg-muted/50 p-3 text-center space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                              <Banknote className="w-3 h-3" />
                              <span>COD</span>
                            </div>
                            <p className="text-lg font-bold text-fuchsia-500">
                              {pt.codFeePercent}%
                            </p>
                            {pt.codFeeFlat > 0 && (
                              <p className="text-[10px] text-muted-foreground">+ {formatCurrency(pt.codFeeFlat)}</p>
                            )}
                          </div>
                        </div>

                        <Button
                          asChild
                          variant="outline"
                          className="w-full rounded-xl group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300"
                          size="sm"
                        >
                          <Link href="/order">
                            Gestun Sekarang
                            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ==================== SERVICES / FEATURES SECTION (3 Grid) ==================== */}
        <section className="relative py-20 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-sm font-medium text-primary mb-3">Layanan Kami</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Layanan Lengkap untuk Anda
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Kami menyediakan berbagai layanan gestun dengan proses cepat dan aman.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {[
                {
                  icon: CreditCard,
                  title: 'Kartu Kredit',
                  description: 'Gestun semua jenis kartu kredit. Visa, Mastercard, JCB. Rate terbaik dan proses cepat.',
                },
                {
                  icon: Wallet,
                  title: 'Paylater',
                  description: 'Tarik dana dari GoPay Paylater, Shopee Paylater, Akulaku, dan paylater lainnya.',
                },
                {
                  icon: Shield,
                  title: 'Aman & Terpercaya',
                  description: 'Transaksi dilindungi dengan sistem tracking real-time. Ribuan pelanggan puas.',
                },
              ].map((feature, i) => (
                <Card
                  key={i}
                  className="group border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300 py-0 gap-0 bg-background"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-300">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== HOW IT WORKS — Number Pipeline ==================== */}
        <section className="relative py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-sm font-medium text-primary mb-3">Cara Kerja</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Semudah 3 Langkah
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Proses gestun yang simpel dan transparan. Dana cair dalam hitungan menit.
              </p>
            </div>

            {/* Pipeline */}
            <div className="max-w-3xl mx-auto">
              {/* Desktop: horizontal pipeline */}
              <div className="hidden md:flex items-start justify-between gap-0 relative">
                {/* Connecting line behind */}
                <div className="absolute top-10 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-gradient-to-r from-primary/40 via-fuchsia-500/40 to-primary/40" />

                {[
                  { step: 1, icon: CreditCard, title: 'Buat Order', description: 'Pilih jenis pembayaran, masukkan nominal, dan submit order melalui website.' },
                  { step: 2, icon: MessageCircle, title: 'Verifikasi', description: 'Tim kami akan memverifikasi data dan menghubungi Anda via WhatsApp.' },
                  { step: 3, icon: Wallet, title: 'Dana Diterima', description: 'Setelah verifikasi, dana langsung ditransfer ke rekening Anda.' },
                ].map((item) => (
                  <div key={item.step} className="flex-1 flex flex-col items-center text-center relative z-10">
                    {/* Step circle */}
                    <div className="w-20 h-20 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center relative">
                      <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <item.icon className="w-6 h-6 text-white" />
                      </div>
                      {/* Number badge */}
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-primary text-primary text-xs font-bold flex items-center justify-center">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold mt-5 mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mobile: vertical pipeline */}
              <div className="md:hidden relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-8 bottom-8 w-px bg-gradient-to-b from-primary/40 via-fuchsia-500/40 to-primary/40" />

                {[
                  { step: 1, icon: CreditCard, title: 'Buat Order', description: 'Pilih jenis pembayaran, masukkan nominal, dan submit order melalui website.' },
                  { step: 2, icon: MessageCircle, title: 'Verifikasi', description: 'Tim kami akan memverifikasi data dan menghubungi Anda via WhatsApp.' },
                  { step: 3, icon: Wallet, title: 'Dana Diterima', description: 'Setelah verifikasi, dana langsung ditransfer ke rekening Anda.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-5 py-6 relative">
                    {/* Circle on the line */}
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                          <item.icon className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Step {item.step}</span>
                      </div>
                      <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== TESTIMONIALS SECTION ==================== */}
        <TestimonialsSection />

        {/* ==================== FAQ SECTION ==================== */}
        {faqs.length > 0 && (
          <section className="relative py-20 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-14">
                <p className="text-sm font-medium text-primary mb-3">FAQ</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Pertanyaan yang Sering Diajukan
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Temukan jawaban untuk pertanyaan umum tentang layanan kami.
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <Card className="border-border/50 bg-background py-0 gap-0">
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      {faqs.map((faq) => (
                        <AccordionItem
                          key={faq.id}
                          value={faq.id}
                          className="border-b last:border-b-0 border-border/50 px-6"
                        >
                          <AccordionTrigger className="text-left text-sm md:text-base font-medium hover:text-primary hover:no-underline transition-colors duration-200 py-5">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* ==================== PARTNER SECTION ==================== */}
        <section className="relative py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left: Content */}
              <div className="space-y-6">
                <p className="text-sm font-medium text-primary">Program Mitra</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Bergabung Menjadi{' '}
                  <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                    Mitra Kami
                  </span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Dapatkan penghasilan tambahan dengan menjadi mitra. Komisi menarik dan dukungan penuh dari tim kami.
                </p>

                <div className="space-y-4 pt-2">
                  {[
                    'Komisi hingga 30% dari setiap transaksi',
                    'Dashboard real-time untuk monitoring',
                    'Support tim profesional 24/7',
                    'Sistem aman dan transparan',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm font-medium">{text}</span>
                    </div>
                  ))}
                </div>

                <Button
                  asChild
                  size="lg"
                  className="gradient-primary text-white rounded-xl h-12 px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-2"
                >
                  <Link href="/register">
                    <Users className="w-4 h-4" />
                    Daftar Menjadi Mitra
                  </Link>
                </Button>
              </div>

              {/* Right: Visual Card */}
              <div className="hidden lg:block">
                <Card className="border-border/50 bg-muted/30 overflow-hidden py-0 gap-0">
                  <CardContent className="p-8 space-y-6">
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Mitra Premium</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Nikmati semua keuntungan sebagai mitra premium kami. Semakin banyak transaksi, semakin besar komisi Anda.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Komisi', value: '30%' },
                        { label: 'Support', value: '24/7' },
                        { label: 'Payout', value: 'H+1' },
                      ].map((stat, i) => (
                        <div key={i} className="text-center p-4 rounded-xl bg-background border border-border/50">
                          <p className="text-xl font-bold text-primary">{stat.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== CTA SECTION ==================== */}
        <section className="relative py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl gradient-primary p-12 md:p-20 text-center">
              {/* Subtle decorations */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-fuchsia-400/10 rounded-full blur-3xl" />

              <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                  Siap Tarik Tunai Kartu Kredit Anda?
                </h2>
                <p className="text-white/75 text-lg leading-relaxed">
                  Proses cepat, rate terbaik, dan dana langsung cair. Ribuan pelanggan telah membuktikan.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-gray-900 hover:bg-white/90 rounded-xl h-12 px-8 text-sm font-medium shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Link href="/order">
                      <Zap className="w-4 h-4" />
                      Order Sekarang
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/25 text-white hover:bg-white/10 hover:text-white rounded-xl h-12 px-8 text-sm font-medium backdrop-blur-sm transition-all duration-300"
                  >
                    <Link href="/track">
                      <Truck className="w-4 h-4" />
                      Track Order
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FOOTER NOTE ==================== */}
        <section className="relative py-10 border-t border-border/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex flex-col items-center gap-3">
              {config.logoUrl && !logoError ? (
                <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center p-1 dark:bg-transparent dark:border-transparent">
                  <img
                    src={config.logoUrl}
                    alt={config.websiteTitle}
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{getInitials()}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} {config.websiteTitle}. Semua hak dilindungi.
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Layanan tarik tunai kartu kredit & paylater terpercaya di Indonesia.
              </p>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
