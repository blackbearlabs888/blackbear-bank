'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowRight, 
  CreditCard, 
  Wallet, 
  Truck, 
  Shield, 
  Clock, 
  CheckCircle2,
  Search,
  Users,
  TrendingUp,
  Sparkles,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NavbarDesktop } from '@/components/layout/navbar-desktop'
import { MobileBottomBar } from '@/components/layout/mobile-bottom-bar'
import { Footer } from '@/components/layout/footer'

const services = [
  {
    icon: CreditCard,
    title: 'Tarik Tunai Kartu Kredit',
    description: 'Cairkan limit kartu kredit Anda menjadi uang tunai dengan proses cepat dan aman.',
    fee: 'Mulai 10%',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Wallet,
    title: 'Paylater Shopee/GoPay',
    description: 'Tarik saldo paylater dari berbagai platform e-commerce dengan mudah.',
    fee: 'Mulai 12%',
    color: 'from-fuchsia-500 to-pink-600',
  },
]

const features = [
  {
    icon: Clock,
    title: 'Proses Cepat',
    description: 'Transaksi diproses dalam hitungan menit',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    icon: Shield,
    title: 'Aman & Terpercaya',
    description: 'Transaksi dijamin aman dan terpercaya',
    color: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
  },
  {
    icon: Truck,
    title: 'COD Tersedia',
    description: 'Layanan COD untuk kenyamanan Anda',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
]

const stats = [
  { value: '10K+', label: 'Transaksi' },
  { value: '5K+', label: 'Customer' },
  { value: '100+', label: 'Mitra' },
  { value: '99%', label: 'Kepuasan' },
]

export default function LandingPage() {
  const [orderId, setOrderId] = useState('')

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavbarDesktop currentPage="landing" />
      
      <main className="flex-1 pb-20 md:pb-0">
        {/* Hero Section - Enhanced */}
        <section className="relative min-h-[90vh] md:min-h-[85vh] flex items-center overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-background dark:to-fuchsia-950/30" />
          
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Primary blob */}
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 dark:from-violet-500/10 dark:to-fuchsia-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/4 -left-20 w-[300px] h-[300px] bg-gradient-to-tr from-purple-400/20 to-violet-400/20 dark:from-purple-500/10 dark:to-violet-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-fuchsia-400/15 to-pink-400/15 dark:from-fuchsia-500/10 dark:to-pink-500/10 rounded-full blur-3xl" />
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0.25_290/0.05)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0.25_290/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          </div>

          <div className="container relative px-4 sm:px-6 py-12 md:py-16 lg:py-20 mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left Content */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6 md:space-y-8 text-center lg:text-left"
              >
                {/* Badge */}
                <motion.div variants={fadeInUp}>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-sm font-medium">
                    <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent font-semibold">
                      Layanan Gestun Terpercaya
                    </span>
                  </div>
                </motion.div>
                
                {/* Heading */}
                <motion.h1 
                  variants={fadeInUp}
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
                >
                  <span className="text-foreground">Tarik Tunai</span>
                  <br />
                  <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                    Cepat & Aman
                  </span>
                </motion.h1>
                
                {/* Description */}
                <motion.p 
                  variants={fadeInUp}
                  className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed"
                >
                  Layanan pencairan limit kartu kredit dan paylater dengan proses mudah, 
                  transparan, dan terpercaya di seluruh Indonesia.
                </motion.p>
                
                {/* CTA Buttons */}
                <motion.div 
                  variants={fadeInUp}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
                >
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/25 dark:shadow-violet-500/10 gap-2 h-12 px-8 text-base"
                    asChild
                  >
                    <Link href="/order">
                      Order Sekarang
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="gap-2 h-12 px-6 text-base border-violet-500/20 hover:bg-violet-500/5"
                    asChild
                  >
                    <Link href="/track">
                      <Search className="h-5 w-5" />
                      Track Order
                    </Link>
                  </Button>
                </motion.div>
                
                {/* Stats */}
                <motion.div 
                  variants={fadeInUp}
                  className="grid grid-cols-4 gap-3 sm:gap-6 pt-6 md:pt-8"
                >
                  {stats.map((stat, index) => (
                    <div
                      key={stat.label}
                      className="text-center p-2 sm:p-3 rounded-xl bg-gradient-to-b from-white/80 to-white/40 dark:from-white/5 dark:to-transparent border border-violet-500/10"
                    >
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                        {stat.value}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
              
              {/* Right Content - Enhanced Credit Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex justify-center lg:justify-end perspective-1000"
              >
                <div className="relative w-full max-w-sm sm:max-w-md">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 blur-3xl transform scale-95" />
                  
                  {/* Credit Card */}
                  <div className="relative credit-card-enhanced w-full aspect-[1.6/1] p-5 sm:p-6 md:p-8 text-white transform hover:scale-[1.02] transition-transform duration-500">
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                      <div className="absolute inset-0 shimmer" />
                    </div>
                    
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-tr from-white/15 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
                    
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      {/* Top row */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white/60 text-xs sm:text-sm tracking-wider uppercase">Black Bear</p>
                          <h3 className="text-lg sm:text-xl font-bold mt-0.5 sm:mt-1">Gestun Service</h3>
                        </div>
                        <div className="w-10 h-7 sm:w-12 sm:h-8 rounded bg-gradient-to-br from-yellow-300 to-amber-500 shadow-lg" />
                      </div>
                      
                      {/* Middle row - Card number placeholder */}
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-7 h-5 sm:w-9 sm:h-6 bg-white/15 rounded backdrop-blur-sm" />
                          ))}
                        </div>
                        <p className="text-xs sm:text-sm text-white/60 flex items-center gap-2">
                          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                          Pencairan Cepat & Aman
                        </p>
                      </div>
                      
                      {/* Bottom row */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-white/60 text-[10px] sm:text-xs">Total Transaksi</p>
                          <p className="text-xl sm:text-2xl font-bold">Rp 10.000.000</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60 text-[10px] sm:text-xs">Status</p>
                          <div className="flex items-center gap-1 text-emerald-400">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="font-medium text-sm sm:text-base">Aktif</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-transparent via-muted/30 to-transparent">
          <div className="container px-4 sm:px-6 mx-auto">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center mb-10 sm:mb-12 md:mb-16"
            >
              <motion.h2 
                variants={fadeInUp}
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4"
              >
                Layanan Tarik Tunai
              </motion.h2>
              <motion.p 
                variants={fadeInUp}
                className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base"
              >
                Pilih layanan sesuai kebutuhan Anda dengan biaya transparan dan proses yang mudah.
              </motion.p>
            </motion.div>
            
            <div className="grid md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300 cursor-pointer group border-violet-500/10 hover:border-violet-500/20 overflow-hidden">
                    <CardHeader className="p-5 sm:p-6">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                        <service.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                      </div>
                      <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg sm:text-xl">
                        {service.title}
                        <span className="text-xs sm:text-sm font-normal bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/10">
                          {service.fee}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-sm">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6 pt-0">
                      <Button 
                        variant="outline" 
                        className="w-full group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-fuchsia-600 group-hover:text-white group-hover:border-transparent transition-all duration-300" 
                        asChild
                      >
                        <Link href="/order">
                          Order Sekarang
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Track Order Section */}
        <section className="py-16 sm:py-20 md:py-24">
          <div className="container px-4 sm:px-6 mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="border-2 border-dashed border-violet-500/20 hover:border-violet-500/40 transition-colors bg-gradient-to-b from-violet-500/5 to-transparent">
                <CardHeader className="text-center p-6 sm:p-8">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
                    <Search className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">Track Order Gestun</CardTitle>
                  <CardDescription className="text-sm">
                    Masukkan Order ID untuk melihat status transaksi Anda
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 pt-0">
                  <form action="/track" className="flex flex-col sm:flex-row gap-3">
                    <Input
                      name="orderId"
                      placeholder="Contoh: BB-ABC123-XYZ"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="flex-1 h-12 border-violet-500/20 focus:border-violet-500"
                    />
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white h-12 px-6"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Cari
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="container px-4 sm:px-6 mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.1 }}
                  className="text-center p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-white/80 to-white/40 dark:from-white/5 dark:to-transparent border border-violet-500/10 hover:border-violet-500/20 transition-colors"
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${feature.color} flex items-center justify-center mx-auto mb-4`}>
                    <feature.icon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Partner Offer Section */}
        <section className="py-16 sm:py-20 md:py-24">
          <div className="container px-4 sm:px-6 mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-violet-500/10 border-violet-500/20 overflow-hidden">
                <CardContent className="p-6 sm:p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4 sm:space-y-6">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                        Penawaran Mitra Black Bear
                      </h2>
                      <p className="text-muted-foreground text-sm sm:text-base">
                        Bergabung sebagai mitra Black Bear dan dapatkan komisi menarik dari setiap transaksi. 
                        Sistem transparan dengan dashboard lengkap dan support 24/7.
                      </p>
                      <ul className="space-y-2 sm:space-y-3">
                        {[
                          'Komisi hingga 30% dari fee transaksi',
                          'Dashboard real-time untuk monitoring',
                          'Sistem tier & badge untuk mitra aktif',
                          'Support & training gratis',
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm sm:text-base">
                            <CheckCircle2 className="h-5 w-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        size="lg" 
                        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white" 
                        asChild
                      >
                        <Link href="/register">
                          Daftar Sebagai Mitra
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                    <div className="hidden md:block">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { icon: Users, value: '100+', label: 'Mitra Aktif' },
                          { icon: TrendingUp, value: '30%', label: 'Komisi' },
                          { icon: Wallet, value: '5 Juta', label: 'Target Bulanan' },
                          { icon: Shield, value: 'Aman', label: 'Transaksi' },
                        ].map((item, i) => (
                          <Card key={i} className="border-violet-500/10 bg-white/50 dark:bg-white/5">
                            <CardContent className="p-6 text-center">
                              <item.icon className="h-8 w-8 text-violet-600 dark:text-violet-400 mx-auto mb-2" />
                              <div className="text-2xl font-bold">{item.value}</div>
                              <div className="text-sm text-muted-foreground">{item.label}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomBar />
    </div>
  )
}
