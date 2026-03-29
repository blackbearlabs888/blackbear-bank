'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CreditCard,
  Wallet,
  Truck,
  Shield,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  Zap,
  Star,
  TrendingUp,
  MessageCircle,
  Wifi,
  HelpCircle as HelpCircleIcon,
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { OrganizationJsonLd, FAQJsonLd } from '@/components/seo/json-ld';
import TestimonialsSection from '@/components/testimonials-section';

const features = [
  {
    icon: CreditCard,
    title: 'Kartu Kredit',
    description: 'Tarik tunai dari semua jenis kartu kredit dengan proses cepat',
  },
  {
    icon: Wallet,
    title: 'Paylater',
    description: 'GoPay, Shopee, Akulaku & berbagai platform paylater',
  },
  {
    icon: Truck,
    title: 'COD & Online',
    description: 'Pilih metode transaksi sesuai kebutuhan Anda',
  },
  {
    icon: Shield,
    title: 'Aman & Terpercaya',
    description: 'Proses transparan dengan tracking real-time',
  },
];

const steps = [
  {
    step: '01',
    title: 'Buat Order',
    description: 'Isi nominal dan data rekening tujuan Anda',
  },
  {
    step: '02',
    title: 'Verifikasi',
    description: 'Tim kami memverifikasi dan memproses order',
  },
  {
    step: '03',
    title: 'Dana Diterima',
    description: 'Dana langsung ditransfer ke rekening Anda',
  },
];

const partnerBenefits = [
  { icon: TrendingUp, text: 'Komisi hingga 30% dari setiap transaksi' },
  { icon: Star, text: 'Tier & Badge dengan reward menarik' },
  { icon: Zap, text: 'Target bulanan dengan bonus' },
  { icon: Users, text: 'Support tim profesional' },
];

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// Credit Card Visual Component - More Compact
function CreditCardVisual({ siteName, getInitials, logoUrl, logoError, setLogoError }: { 
  siteName: string; 
  getInitials: () => string;
  logoUrl: string | null;
  logoError: boolean;
  setLogoError: (error: boolean) => void;
}) {
  return (
    <div className="relative w-full max-w-[280px] sm:max-w-[320px] mx-auto">
      {/* Glow Effect */}
      <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-xl opacity-50" />
      
      {/* Card */}
      <div className="relative aspect-[1.586/1] rounded-xl overflow-hidden shadow-xl">
        {/* Card Background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #1a1a2e 60%, #2d1b4e 100%)',
          }}
        />
        
        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(45deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.1) 50%, rgba(217, 70, 239, 0.15) 100%)',
          }}
        />
        
        {/* Shine Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            style={{
              animation: 'shine 3s ease-in-out infinite',
            }}
          />
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 h-full p-4 flex flex-col justify-between">
          {/* Top Row */}
          <div className="flex items-start justify-between">
            {/* Chip */}
            <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 flex items-center justify-center">
              <div className="w-5 h-4 border border-amber-700/30 rounded-sm" />
            </div>
            {/* Contactless Icon */}
            <Wifi className="w-4 h-4 text-white/50 rotate-90" />
          </div>
          
          {/* Card Number */}
          <div className="my-2">
            <p className="text-white text-sm tracking-[0.2em] font-mono drop-shadow-lg">
              •••• •••• •••• ••••
            </p>
          </div>
          
          {/* Bottom Row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/40 text-[8px] uppercase tracking-wider mb-0.5">
                Card Holder
              </p>
              <p className="text-white text-xs font-medium tracking-wide">
                VALUED CUSTOMER
              </p>
            </div>
            <div className="text-right">
              {/* Logo or Initials */}
              <div className="flex items-center gap-1.5 justify-end">
                {logoUrl && !logoError ? (
                  <img 
                    src={logoUrl} 
                    alt={siteName}
                    className="w-6 h-6 object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">{getInitials()}</span>
                  </div>
                )}
                <span className="text-white font-bold text-sm tracking-tight">
                  {siteName}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -bottom-8 -right-8 w-20 h-20 rounded-full bg-primary/10 blur-lg" />
        <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-purple-500/10 blur-lg" />
      </div>
      
      {/* Floating Elements */}
      <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-primary/20 blur-md animate-pulse" />
      <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-purple-500/20 blur-md animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

// Animated Background Component - Simplified
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.12), transparent),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168, 85, 247, 0.08), transparent)
          `,
        }}
      />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* Floating orbs - reduced */}
      <div className="absolute top-1/4 left-[10%] w-48 h-48 bg-primary/15 rounded-full blur-[60px] animate-float-slow" />
      <div className="absolute top-1/2 right-[5%] w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] animate-float-medium" />
    </div>
  );
}

export default function LandingPage() {
  const { config, getInitials } = useSiteConfig();
  const [logoError, setLogoError] = useState(false);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  
  const siteName = config.websiteTitle || 'Black Bear';

  // Fetch FAQs
  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await fetch('/api/seo/faq?public=true&limit=5');
        const result = await response.json();
        if (result.success && result.data) {
          setFaqs(result.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
      }
    };
    fetchFAQs();
  }, []);

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <OrganizationJsonLd />
      <FAQJsonLd />
      
      <div className="min-h-screen bg-background relative">
        {/* Animated Background */}
        <AnimatedBackground />
        
        {/* Hero Section - Compact */}
        <header className="relative py-8 sm:py-12 lg:py-16 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
              {/* Left Content */}
              <div className="flex-1 max-w-xl text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  <span>Layanan Tarik Tunai Terpercaya</span>
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight tracking-tight">
                  Butuh Dana Cepat?
                  <br />
                  <span className="text-primary">{siteName} Solusinya</span>
                </h1>

                {/* Description */}
                <p className="text-sm sm:text-base text-muted-foreground mb-5 leading-relaxed">
                  {config.metaDescription || 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat, aman, dan transparan.'}
                </p>

                {/* CTA Buttons */}
                <nav className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center lg:justify-start mb-5" aria-label="Main actions">
                  <Button asChild size="default" className="h-10 px-5 text-sm">
                    <Link href="/order">
                      Order Sekarang
                      <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="default" variant="outline" className="h-10 px-5 text-sm">
                    <Link href="/track">
                      <Clock className="w-4 h-4 mr-1.5" aria-hidden="true" />
                      Track Order
                    </Link>
                  </Button>
                </nav>

                {/* Trust Indicators */}
                <ul className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-muted-foreground" aria-label="Trust indicators">
                  <li className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                    <span>Aman 100%</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    <span>Proses Cepat</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span>Terpercaya</span>
                  </li>
                </ul>
              </div>

              {/* Right Content - Credit Card */}
              <div className="flex-1 flex justify-center items-center" role="img" aria-label="Credit card illustration">
                <CreditCardVisual 
                  siteName={siteName} 
                  getInitials={getInitials}
                  logoUrl={config.logoUrl}
                  logoError={logoError}
                  setLogoError={setLogoError}
                />
              </div>
            </div>
          </div>
        </header>

      {/* Stats Section - Compact */}
      <section className="relative py-6 sm:py-8 border-y bg-muted/30 backdrop-blur-sm z-10" aria-label="Statistics">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {[
              { value: '10K+', label: 'Transaksi' },
              { value: '99%', label: 'Sukses Rate' },
              { value: '24/7', label: 'Support' },
              { value: '5★', label: 'Rating' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section - Compact */}
      <section className="relative py-10 sm:py-12 lg:py-16 z-10" aria-labelledby="services-heading">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 id="services-heading" className="text-xl sm:text-2xl font-bold mb-2">Layanan Kami</h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
              Pilih layanan tarik tunai yang sesuai dengan kebutuhan Anda
            </p>
          </div>

          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto" role="list">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <li key={index}>
                  <Card 
                    className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 group h-full"
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base mb-1">{feature.title}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* How It Works Section - Compact */}
      <section className="relative py-10 sm:py-12 lg:py-16 bg-muted/30 backdrop-blur-sm z-10" aria-labelledby="how-it-works-heading">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 id="how-it-works-heading" className="text-xl sm:text-2xl font-bold mb-2">Cara Kerja</h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
              Hanya 3 langkah sederhana untuk mendapatkan dana Anda
            </p>
          </div>

          <ol className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {steps.map((step, index) => (
              <li key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary/20 mb-2" aria-hidden="true">{step.step}</div>
                <h3 className="text-base sm:text-lg font-semibold mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section - Compact */}
      <section className="relative py-10 sm:py-12 lg:py-16 bg-muted/30 backdrop-blur-sm z-10" aria-labelledby="faq-heading">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                <HelpCircleIcon className="w-3 h-3" aria-hidden="true" />
                <span>FAQ</span>
              </div>
              <h2 id="faq-heading" className="text-xl sm:text-2xl font-bold mb-2">
                Pertanyaan Umum
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
                Temukan jawaban untuk pertanyaan yang sering diajukan
              </p>
            </div>

            {faqs.length > 0 ? (
              <>
                <Card className="border-border/50">
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      {faqs.map((faq, index) => (
                        <AccordionItem 
                          key={faq.id} 
                          value={faq.id}
                          className={index === faqs.length - 1 ? 'border-b-0' : ''}
                        >
                          <AccordionTrigger className="px-4 text-sm hover:no-underline">
                            <span className="text-left font-medium pr-4">
                              {faq.question}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 text-xs text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
                <div className="text-center mt-4">
                  <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                    <Link href="/faq">
                      Lihat Semua FAQ
                      <ArrowRight className="w-3 h-3 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm mb-3">
                  Belum ada FAQ tersedia
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/faq">
                    Kunjungi Halaman FAQ
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Partner Section - Compact */}
      <section className="relative py-10 sm:py-12 lg:py-16 z-10" aria-labelledby="partner-heading">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
              {/* Content */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                  <Users className="w-3 h-3" aria-hidden="true" />
                  <span>Program Mitra</span>
                </div>
                <h2 id="partner-heading" className="text-xl sm:text-2xl font-bold mb-2">
                  Bergabung Sebagai Mitra {siteName}
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm mb-5 leading-relaxed">
                  Dapatkan penghasilan tambahan dengan menjadi mitra {siteName}. 
                  Sistem komisi transparan dengan dashboard real-time untuk memantau profit Anda.
                </p>
                
                <ul className="space-y-2 sm:space-y-3 mb-5" role="list">
                  {partnerBenefits.map((benefit, index) => {
                    const BenefitIcon = benefit.icon;
                    return (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BenefitIcon className="w-4 h-4 text-primary" aria-hidden="true" />
                        </div>
                        <span>{benefit.text}</span>
                      </li>
                    );
                  })}
                </ul>

                <Button asChild size="default" className="h-10 px-5 text-sm">
                  <Link href="/register">
                    Daftar Mitra Sekarang
                    <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              {/* Card */}
              <aside className="lg:pl-4">
                <Card className="border-border/50 overflow-hidden">
                  <CardContent className="p-5 sm:p-6">
                    <div className="text-center">
                      {/* Logo */}
                      <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
                        {config.logoUrl && !logoError ? (
                          <img 
                            src={config.logoUrl} 
                            alt={siteName}
                            className="w-7 h-7 object-contain"
                            onError={() => setLogoError(true)}
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">{getInitials()}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold mb-1">Mitra Dashboard</h3>
                      <p className="text-muted-foreground text-xs mb-5">
                        Kelola transaksi dan pantau profit Anda
                      </p>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xl font-bold text-primary">30%</p>
                          <p className="text-[10px] text-muted-foreground">Komisi Default</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xl font-bold text-primary">5jt</p>
                          <p className="text-[10px] text-muted-foreground">Target Bulanan</p>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="pt-4 border-t flex items-center justify-center gap-4">
                        {config.footerWhatsapp && (
                          <a 
                            href={`https://wa.me/${config.footerWhatsapp}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                            aria-label="Contact via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            WhatsApp
                          </a>
                        )}
                        {config.footerEmail && (
                          <a 
                            href={`mailto:${config.footerEmail}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                            aria-label="Contact via Email"
                          >
                            Contact
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Compact */}
      <section className="relative py-12 sm:py-16 overflow-hidden z-10">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-purple-600/90 to-fuchsia-600/90 dark:from-primary/80 dark:via-purple-700/80 dark:to-fuchsia-700/80" />
          
          {/* Dark mode overlay */}
          <div className="absolute inset-0 bg-black/0 dark:bg-black/30" />
          
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-5 dark:opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '30px 30px',
            }}
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto">
            {/* Main Content Card */}
            <div className="relative bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 p-5 sm:p-8 shadow-xl">
              
              <div className="relative">
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm text-white text-xs font-medium mb-4">
                  <Zap className="w-3 h-3" />
                  Proses Cepat & Aman
                </div>
                
                {/* Heading */}
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 leading-tight">
                  Siap Untuk Memulai?
                </h2>
                <p className="text-sm sm:text-base text-white/80 dark:text-white/70 mb-5 max-w-lg">
                  Order sekarang dan dapatkan dana Anda dalam waktu singkat. Proses mudah, transparan, dan aman.
                </p>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-5">
                  <Button 
                    asChild 
                    size="default" 
                    className="h-10 px-5 text-sm bg-white text-primary hover:bg-white/90 shadow-lg shadow-black/20"
                  >
                    <Link href="/order">
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Order Sekarang
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button 
                    asChild 
                    size="default" 
                    variant="outline" 
                    className="h-10 px-5 text-sm border-2 border-white/30 dark:border-white/20 text-white hover:bg-white/10 dark:hover:bg-white/5"
                  >
                    <Link href="/track">
                      <Clock className="w-4 h-4 mr-1.5" />
                      Track Order
                    </Link>
                  </Button>
                </div>
                
                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-white/20 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-white/80 dark:text-white/70">
                    <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-white/10 flex items-center justify-center">
                      <Shield className="w-3 h-3" />
                    </div>
                    <span className="text-xs">100% Aman</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/80 dark:text-white/70">
                    <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-white/10 flex items-center justify-center">
                      <Zap className="w-3 h-3" />
                    </div>
                    <span className="text-xs">Proses Cepat</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/80 dark:text-white/70">
                    <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-white/10 flex items-center justify-center">
                      <Star className="w-3 h-3" />
                    </div>
                    <span className="text-xs">Terpercaya</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating stat cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
              <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 dark:border-white/5">
                <p className="text-lg sm:text-xl font-bold text-white">10K+</p>
                <p className="text-[10px] sm:text-xs text-white/70 dark:text-white/60">Transaksi</p>
              </div>
              <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 dark:border-white/5">
                <p className="text-lg sm:text-xl font-bold text-white">99%</p>
                <p className="text-[10px] sm:text-xs text-white/70 dark:text-white/60">Sukses Rate</p>
              </div>
              <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 dark:border-white/5">
                <p className="text-lg sm:text-xl font-bold text-white">24/7</p>
                <p className="text-[10px] sm:text-xs text-white/70 dark:text-white/60">Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <section className="relative py-4 z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[10px] text-muted-foreground">
            *Biaya ongkir marketplace & layanan tambahan tidak termasuk
          </p>
        </div>
      </section>

      {/* Shine Animation Style */}
      <style jsx global>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(12deg); }
          50%, 100% { transform: translateX(200%) skewX(12deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-15px) translateX(5px); }
        }
        
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(-10px); }
        }
        
        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }
        
        .animate-float-medium {
          animation: float-medium 15s ease-in-out infinite;
        }
      `}</style>
      </div>
    </>
  );
}