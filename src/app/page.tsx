'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';

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

// Credit Card Visual Component
function CreditCardVisual({ siteName, getInitials, logoUrl, logoError, setLogoError }: { 
  siteName: string; 
  getInitials: () => string;
  logoUrl: string | null;
  logoError: boolean;
  setLogoError: (error: boolean) => void;
}) {
  return (
    <div className="relative w-full max-w-[380px] mx-auto">
      {/* Glow Effect */}
      <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl opacity-60" />
      
      {/* Card */}
      <div className="relative aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl">
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
        
        {/* Card Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="none">
            <defs>
              <pattern id="cardPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cardPattern)" />
          </svg>
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 h-full p-6 flex flex-col justify-between">
          {/* Top Row */}
          <div className="flex items-start justify-between">
            {/* Chip */}
            <div className="w-12 h-9 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 flex items-center justify-center">
              <div className="w-8 h-6 border border-amber-700/30 rounded-sm" />
            </div>
            {/* Contactless Icon */}
            <div className="flex items-center gap-0.5 text-white/50">
              <Wifi className="w-5 h-5 rotate-90" />
            </div>
          </div>
          
          {/* Card Number */}
          <div className="my-4">
            <p className="text-white text-xl tracking-[0.25em] font-mono drop-shadow-lg">
              •••• •••• •••• ••••
            </p>
          </div>
          
          {/* Bottom Row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
                Card Holder
              </p>
              <p className="text-white text-base font-medium tracking-wide">
                VALUED CUSTOMER
              </p>
            </div>
            <div className="text-right">
              {/* Logo or Initials */}
              <div className="flex items-center gap-2 justify-end">
                {logoUrl && !logoError ? (
                  <img 
                    src={logoUrl} 
                    alt={siteName}
                    className="w-8 h-8 object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{getInitials()}</span>
                  </div>
                )}
                <span className="text-white font-bold text-lg tracking-tight">
                  {siteName}
                </span>
              </div>
              <p className="text-white/40 text-[10px] mt-1">
                Premium Card
              </p>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-primary/10 blur-xl" />
        <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-purple-500/10 blur-xl" />
      </div>
      
      {/* Floating Elements */}
      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-primary/20 blur-lg animate-pulse" />
      <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full bg-purple-500/20 blur-lg animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

export default function LandingPage() {
  const { config, getInitials } = useSiteConfig();
  const [logoError, setLogoError] = useState(false);
  
  const siteName = config.websiteTitle || 'Black Bear';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            {/* Left Content */}
            <div className="flex-1 max-w-xl text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Layanan Tarik Tunai Terpercaya
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
                Butuh Dana Cepat?
                <br />
                <span className="text-primary">{siteName} Solusinya</span>
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                {config.metaDescription || 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat, aman, dan transparan.'}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Button asChild size="lg" className="h-14 px-8 text-base">
                  <Link href="/order">
                    Order Sekarang
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base">
                  <Link href="/track">
                    <Clock className="w-5 h-5 mr-2" />
                    Track Order
                  </Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <span>Aman 100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>Proses Cepat</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span>Terpercaya</span>
                </div>
              </div>
            </div>

            {/* Right Content - Credit Card */}
            <div className="flex-1 flex justify-center items-center">
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
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: '10K+', label: 'Transaksi' },
              { value: '99%', label: 'Sukses Rate' },
              { value: '24/7', label: 'Support' },
              { value: '5★', label: 'Rating' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Layanan Kami</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Pilih layanan tarik tunai yang sesuai dengan kebutuhan Anda
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Cara Kerja</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Hanya 3 langkah sederhana untuk mendapatkan dana Anda
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="text-5xl font-bold text-primary/20 mb-4">{step.step}</div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partner Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Content */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Users className="w-4 h-4" />
                  Program Mitra
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Bergabung Sebagai Mitra {siteName}
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Dapatkan penghasilan tambahan dengan menjadi mitra {siteName}. 
                  Sistem komisi transparan dengan dashboard real-time untuk memantau profit Anda.
                </p>
                
                <ul className="space-y-4 mb-8">
                  {partnerBenefits.map((benefit, index) => {
                    const BenefitIcon = benefit.icon;
                    return (
                      <li key={index} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BenefitIcon className="w-5 h-5 text-primary" />
                        </div>
                        <span>{benefit.text}</span>
                      </li>
                    );
                  })}
                </ul>

                <Button asChild size="lg" className="h-14 px-8 text-base">
                  <Link href="/register">
                    Daftar Mitra Sekarang
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>

              {/* Card */}
              <div className="lg:pl-8">
                <Card className="border-border/50 overflow-hidden">
                  <CardContent className="p-8">
                    <div className="text-center">
                      {/* Logo */}
                      <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
                        {config.logoUrl && !logoError ? (
                          <img 
                            src={config.logoUrl} 
                            alt={siteName}
                            className="w-10 h-10 object-contain"
                            onError={() => setLogoError(true)}
                          />
                        ) : (
                          <span className="text-white font-bold text-2xl">{getInitials()}</span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Mitra Dashboard</h3>
                      <p className="text-muted-foreground text-sm mb-8">
                        Kelola transaksi dan pantau profit Anda
                      </p>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-muted/50 rounded-xl p-4">
                          <p className="text-3xl font-bold text-primary">30%</p>
                          <p className="text-sm text-muted-foreground">Komisi Default</p>
                        </div>
                        <div className="bg-muted/50 rounded-xl p-4">
                          <p className="text-3xl font-bold text-primary">5jt</p>
                          <p className="text-sm text-muted-foreground">Target Bulanan</p>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="pt-6 border-t flex items-center justify-center gap-6">
                        {config.footerWhatsapp && (
                          <a 
                            href={`https://wa.me/${config.footerWhatsapp}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </a>
                        )}
                        {config.footerEmail && (
                          <a 
                            href={`mailto:${config.footerEmail}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            Contact
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Siap Untuk Memulai?
            </h2>
            <p className="text-lg opacity-90 mb-8">
              Order sekarang dan dapatkan dana Anda dalam waktu singkat
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                variant="secondary" 
                className="h-14 px-8 text-base"
              >
                <Link href="/order">
                  Order Sekarang
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="outline" 
                className="h-14 px-8 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="/track">
                  Track Order
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <section className="py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
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
      `}</style>
    </div>
  );
}
