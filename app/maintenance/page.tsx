'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Wrench,
  Clock,
  Shield,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';

export default function MaintenancePage() {
  const { config, getInitials } = useSiteConfig();
  const [countdown, setCountdown] = useState({ hours: 2, minutes: 30, seconds: 0 });
  const [logoError, setLogoError] = useState(false);

  const siteName = config.websiteTitle || 'Black Bear';

  // Simulate countdown (this would be replaced with actual maintenance end time)
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            {config.logoUrl && !logoError ? (
              <img
                src={config.logoUrl}
                alt={siteName}
                className="w-16 h-16 rounded-2xl object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl">
                <span className="text-white font-bold text-2xl">{getInitials()}</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold">{siteName}</h1>
        </div>

        {/* Main Card */}
        <Card className="glass-card border-primary/20 overflow-hidden">
          <CardContent className="p-0">
            {/* Header with gradient */}
            <div className="gradient-primary p-6 text-center text-white">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">Sedang Dalam Perbaikan</h2>
              <p className="text-white/80 text-sm">
                Kami sedang melakukan pemeliharaan sistem untuk memberikan layanan yang lebih baik.
              </p>
            </div>

            {/* Countdown */}
            <div className="p-6">
              <div className="flex justify-center gap-4 mb-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-primary">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Jam</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-primary">
                      {String(countdown.minutes).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Menit</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-primary">
                      {String(countdown.seconds).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Detik</span>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Estimasi selesai: 2-3 jam lagi
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Data Anda tetap aman dan terlindungi
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Coba Lagi
                </Button>

                {config.footerWhatsapp && (
                  <Button
                    asChild
                    className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                  >
                    <a
                      href={`https://wa.me/${config.footerWhatsapp}?text=${encodeURIComponent(`Halo ${siteName}, saya ingin bertanya tentang status maintenance.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Hubungi Kami
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
