'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Wallet,
  Truck,
  Shield,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Star,
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';

const features = [
  {
    icon: CreditCard,
    title: 'Kartu Kredit',
    description: 'Tarik tunai dari semua jenis kartu kredit',
    color: 'bg-violet-500',
  },
  {
    icon: Wallet,
    title: 'Paylater',
    description: 'GoPay, Shopee, Akulaku & lainnya',
    color: 'bg-fuchsia-500',
  },
  {
    icon: Truck,
    title: 'COD & Online',
    description: 'Pilih metode sesuai kebutuhan',
    color: 'bg-purple-500',
  },
  {
    icon: Shield,
    title: 'Aman & Cepat',
    description: 'Proses transparan & real-time',
    color: 'bg-indigo-500',
  },
];

const steps = [
  {
    step: 1,
    title: 'Buat Order',
    description: 'Isi nominal & data rekening tujuan',
    icon: CreditCard,
  },
  {
    step: 2,
    title: 'Verifikasi',
    description: 'Tim kami proses order Anda',
    icon: Clock,
  },
  {
    step: 3,
    title: 'Dana Dikirim',
    description: 'Langsung ke rekening Anda',
    icon: Wallet,
  },
];

const partnerBenefits = [
  'Komisi hingga 30% dari setiap transaksi',
  'Dashboard real-time untuk monitoring',
  'Tier & Badge dengan reward menarik',
  'Support tim profesional',
  'Target bulanan dengan bonus',
];

export default function LandingPage() {
  const { config, getInitials } = useSiteConfig();
  const [logoError, setLogoError] = useState(false);
  
  const siteName = config.websiteTitle || 'Black Bear';

  return (
    <div className="gradient-hero">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute top-40 -right-40 w-80 h-80 bg-fuchsia-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl -translate-x-1/2" />
        </div>

        <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <Badge 
              variant="secondary" 
              className="mb-4 sm:mb-6 px-4 py-1.5 text-sm animate-fade-in"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Layanan Tarik Tunai Terpercaya
            </Badge>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight animate-slide-up">
              Butuh Dana Cepat?
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
                {siteName} Solusinya
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto animate-slide-up stagger-1">
              {config.metaDescription || 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat, aman, dan transparan.'}
            </p>
            
            {/* CTA Cards - Mobile optimized */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center mb-8 sm:mb-12 animate-slide-up stagger-2">
              <Card className="w-full sm:w-auto sm:min-w-[280px] glass-card hover:shadow-xl transition-smooth cursor-pointer group active-scale tap-highlight">
                <Link href="/order">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg flex-shrink-0">
                        <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg">Order Sekarang</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">Tarik tunai instan</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-smooth flex-shrink-0" />
                    </div>
                  </CardContent>
                </Link>
              </Card>

              <Card className="w-full sm:w-auto sm:min-w-[280px] glass-card hover:shadow-xl transition-smooth cursor-pointer group active-scale tap-highlight">
                <Link href="/track">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg">Track Order</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">Cek status transaksi</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-smooth flex-shrink-0" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 text-muted-foreground animate-fade-in stagger-3">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs sm:text-sm">Aman 100%</span>
              </div>
              <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs sm:text-sm">Proses Cepat</span>
              </div>
              <div className="w-1 h-1 bg-muted-foreground/30 rounded-full hidden sm:block" />
              <div className="items-center gap-1.5 hidden sm:flex">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-xs sm:text-sm">Terpercaya</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Layanan Kami</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Berbagai pilihan layanan tarik tunai untuk memenuhi kebutuhan Anda
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="glass-card hover:shadow-xl transition-smooth group active-scale tap-highlight animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${feature.color} flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-smooth`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base lg:text-lg mb-1 sm:mb-2">{feature.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Cara Kerja</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Proses mudah dan cepat dalam 3 langkah
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div 
                    key={index} 
                    className="relative text-center animate-slide-up"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="relative inline-block">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-xl">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                        {step.step}
                      </div>
                    </div>
                    <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{step.description}</p>
                    
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Partner Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-primary/5 via-purple-500/5 to-fuchsia-500/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <Badge variant="secondary" className="mb-3 sm:mb-4">
                <Users className="w-3 h-3 mr-1" />
                Program Mitra
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                Bergabung Sebagai Mitra {siteName}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">
                Dapatkan penghasilan tambahan dengan menjadi mitra {siteName}. 
                Sistem komisi transparan dengan dashboard real-time.
              </p>
              
              <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                {partnerBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" className="gradient-primary text-white h-12 sm:h-auto active-scale tap-highlight">
                <Link href="/register">
                  Daftar Mitra Sekarang
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="order-1 lg:order-2">
              <Card className="glass-card overflow-hidden mobile-shadow">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-primary/10 to-fuchsia-500/10 p-6 sm:p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-xl">
                        {config.logoUrl && !logoError ? (
                          <img 
                            src={config.logoUrl} 
                            alt={siteName}
                            className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                            onError={() => setLogoError(true)}
                          />
                        ) : (
                          <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        )}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Mitra Dashboard</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm mb-6">
                        Kelola transaksi dan pantau profit Anda
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-background/80 rounded-xl p-3 sm:p-4">
                          <p className="text-xl sm:text-2xl font-bold text-primary">30%</p>
                          <p className="text-xs text-muted-foreground">Komisi Default</p>
                        </div>
                        <div className="bg-background/80 rounded-xl p-3 sm:p-4">
                          <p className="text-xl sm:text-2xl font-bold text-primary">5jt</p>
                          <p className="text-xs text-muted-foreground">Target Bulanan</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <Card className="glass-card overflow-hidden mobile-shadow">
            <CardContent className="p-0">
              <div className="gradient-primary p-6 sm:p-8 md:p-12 text-center text-white">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">
                  Siap Untuk Memulai?
                </h2>
                <p className="text-white/80 mb-6 max-w-xl mx-auto text-sm sm:text-base">
                  Order sekarang dan dapatkan dana Anda dalam waktu singkat. 
                  Proses mudah, aman, dan transparan.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 h-12 sm:h-auto active-scale">
                    <Link href="/order">
                      Order Sekarang
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/20 h-12 sm:h-auto active-scale">
                    <Link href="/track">
                      Track Order
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Notes */}
      <section className="py-4 sm:py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            *Biaya ongkir marketplace & layanan tambahan tidak termasuk
          </p>
        </div>
      </section>
    </div>
  );
}
