'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  Clock,
  Shield,
  RefreshCw,
  MessageCircle,
  Zap,
  Heart,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { trackEvent } from '@/lib/analytics/track';

export default function MaintenancePage() {
  const { config, getInitials } = useSiteConfig();
  const [countdown, setCountdown] = useState({ hours: 2, minutes: 30, seconds: 0 });
  const [logoError, setLogoError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const siteName = config.websiteTitle || 'Black Bear';

  // Fade in animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Simulate countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const waNumber = config.footerWhatsapp || '628551110023';
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo ${siteName}, saya ingin bertanya tentang status maintenance.`)}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-72 h-72 bg-primary/8 rounded-full blur-[100px] animate-pulse-soft" />
        <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-fuchsia-500/8 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/6 rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: '4s' }} />

        {/* Floating particles */}
        <div className="absolute top-[15%] left-[20%] w-1.5 h-1.5 rounded-full bg-primary/30 animate-float" />
        <div className="absolute top-[25%] right-[25%] w-1 h-1 rounded-full bg-fuchsia-400/30 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] left-[15%] w-2 h-2 rounded-full bg-purple-400/20 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[70%] right-[20%] w-1 h-1 rounded-full bg-primary/25 animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[40%] left-[60%] w-1.5 h-1.5 rounded-full bg-emerald-400/20 animate-float" style={{ animationDelay: '1.5s' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div
        className={`relative z-10 w-full max-w-lg transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5 relative">
            {/* Logo glow */}
            <div className="absolute inset-0 scale-150 blur-2xl bg-primary/15 rounded-full animate-pulse" />
            <div className="relative">
              {config.logoUrl && !logoError ? (
                <img
                  src={config.logoUrl}
                  alt={siteName}
                  className="w-16 h-16 rounded-2xl object-contain shadow-xl border border-border/30"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-primary/20">
                  <span className="text-white font-bold text-2xl">{getInitials()}</span>
                </div>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{siteName}</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <div className="relative">
                <span className="block w-2 h-2 rounded-full bg-amber-500" />
                <span className="absolute inset-0 w-2 h-2 rounded-full bg-amber-500 animate-ping opacity-75" />
              </div>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Sedang Maintenance</span>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-background/80 backdrop-blur-xl shadow-2xl shadow-black/5">
          {/* Top gradient header */}
          <div className="relative gradient-primary p-8 text-center text-white overflow-hidden">
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }} />
            <div className="relative z-10">
              {/* Animated wrench icon */}
              <div className="relative inline-flex mb-4">
                <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Wrench className="w-9 h-9" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-3 h-3" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Sedang Dalam Perbaikan</h2>
              <p className="text-white/75 text-sm leading-relaxed max-w-sm mx-auto">
                Kami sedang memperbarui sistem untuk memberikan pengalaman yang lebih baik untuk Anda.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Countdown Timer */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
                Estimasi Waktu Tersisa
              </p>
              <div className="flex justify-center gap-3">
                <div className="group relative">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-muted/80 border border-border/50 flex items-center justify-center transition-all duration-300 group-hover:border-primary/30 group-hover:bg-muted">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="block text-[10px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">Jam</span>
                </div>

                <div className="flex items-start pt-5">
                  <span className="text-lg text-muted-foreground/40 font-light animate-pulse">:</span>
                </div>

                <div className="group relative">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-muted/80 border border-border/50 flex items-center justify-center transition-all duration-300 group-hover:border-primary/30 group-hover:bg-muted">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {String(countdown.minutes).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="block text-[10px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">Menit</span>
                </div>

                <div className="flex items-start pt-5">
                  <span className="text-lg text-muted-foreground/40 font-light animate-pulse">:</span>
                </div>

                <div className="group relative">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-muted/80 border border-border/50 flex items-center justify-center transition-all duration-300 group-hover:border-primary/30 group-hover:bg-muted">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {String(countdown.seconds).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="block text-[10px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">Detik</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Status cards */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/30 transition-all duration-200 hover:bg-muted/60">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Estimasi selesai</p>
                  <p className="text-xs text-muted-foreground">2-3 jam lagi</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/30 transition-all duration-200 hover:bg-muted/60">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Data Anda aman</p>
                  <p className="text-xs text-muted-foreground">Tidak ada data yang terpengaruh</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/30 transition-all duration-200 hover:bg-muted/60">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Performa lebih baik</p>
                  <p className="text-xs text-muted-foreground">Pembaruan untuk kecepatan & stabilitas</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="w-full h-12 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-accent"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Coba Lagi
              </Button>

              <Button
                asChild
                className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-medium shadow-lg shadow-[#25D366]/20 hover:shadow-[#25D366]/30 transition-all duration-200 active:scale-[0.98]"
              >
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('click_wa', { page_path: '/maintenance', page_type: 'maintenance' })}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Hubungi via WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom status */}
        <div className="text-center mt-8 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Server sedang diperbarui</span>
          </div>
          <p className="text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground/40">
            Made with <Heart className="w-3 h-3 text-red-400 fill-red-400" /> by {siteName} Team
          </p>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-5px); }
          75% { transform: translateY(-25px) translateX(5px); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.15; }
        }
        .animate-pulse-soft {
          animation: pulse-soft 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
