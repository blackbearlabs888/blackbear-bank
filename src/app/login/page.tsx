'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, EyeOff, User, Building2, Loader2, ArrowLeft, Shield, 
  Sparkles, Star, TrendingUp, Wallet, ChevronRight,
  Lock, Mail, CheckCircle2, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/hooks/use-site-config';

// Floating particle component
function FloatingParticle({ delay, duration, size, left }: { delay: number; duration: number; size: number; left: number }) {
  return (
    <div
      className="absolute rounded-full bg-primary/20 animate-float-up"
      style={{
        width: size,
        height: size,
        left: `${left}%`,
        bottom: '-10%',
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

// Animated background
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient base */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 70% 40%, rgba(139, 92, 246, 0.15), transparent),
            radial-gradient(ellipse 60% 50% at 30% 80%, rgba(168, 85, 247, 0.1), transparent)
          `,
        }}
      />
      
      {/* Floating particles - useMemo to prevent hydration mismatch */}
      {useMemo(() =>
        [...Array(8)].map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 0.8}
            duration={8 + (i * 0.47)}
            size={4 + (i * 0.93)}
            left={10 + (i * 12)}
          />
        ))
      , [])}
      
      {/* Decorative orbs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

// Feature card for desktop sidebar
function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-white/60">{description}</p>
      </div>
    </div>
  );
}

// Password strength utilities
function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return Math.min(strength, 4);
}

function getPasswordStrengthLabel(password: string): string {
  const strength = getPasswordStrength(password);
  if (strength <= 1) return 'Lemah — tambahkan huruf besar & angka';
  if (strength === 2) return 'Cukup — tambahkan karakter spesial';
  if (strength === 3) return 'Kuat — password Anda aman';
  return 'Sangat kuat — excellent!';
}

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, setUser, setPartner, hydrate } = useAuthStore();
  const { config, getInitials } = useSiteConfig();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'partner'>('partner');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);
  const hasRedirected = useRef(false);

  const siteName = config.websiteTitle || 'Black Bear';

  // Run hydration on mount
  useEffect(() => {
    if (!hasHydrated) {
      hydrate();
    }
  }, [hasHydrated, hydrate]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (hasHydrated && isAuthenticated && !hasRedirected.current && !loading) {
      hasRedirected.current = true;
      if (user?.role === 'owner') {
        router.replace('/owner/dashboard');
      } else {
        router.replace('/partner/dashboard');
      }
    }
  }, [hasHydrated, isAuthenticated, user, router, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Login gagal');
        setLoading(false);
        return;
      }

      setUser(data.user);
      setPartner(data.partner);
      
      if (data.user.role === 'owner') {
        router.replace('/owner/dashboard');
      } else {
        router.replace('/partner/dashboard');
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  // Show loading while hydrating auth state
  if (isLoading || !hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-2xl shadow-primary/30 animate-pulse">
            <span className="text-white font-bold text-2xl">{getInitials()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Memuat...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Desktop Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-fuchsia-600" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-2xl">
              {config.logoUrl && !logoError ? (
                <img 
                  src={config.logoUrl} 
                  alt={siteName}
                  className="w-10 h-10 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-white font-bold text-xl">{getInitials()}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{siteName}</h1>
              <p className="text-white/60 text-sm">Gestun Management System</p>
            </div>
          </div>

          {/* Hero Text */}
          <div className="mb-12">
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Kelola Bisnis<br />
              <span className="text-white/80">Lebih Mudah</span>
            </h2>
            <p className="text-white/60 text-lg max-w-md">
              Dashboard lengkap untuk mengelola transaksi, partner, dan keuangan gestun Anda.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 max-w-lg">
            <FeatureCard 
              icon={TrendingUp}
              title="Dashboard Real-time"
              description="Pantau performa bisnis secara real-time dengan visualisasi data yang intuitif"
            />
            <FeatureCard 
              icon={Wallet}
              title="Kelola Transaksi"
              description="Proses transaksi dengan mudah dan lacak status secara otomatis"
            />
            <FeatureCard 
              icon={Star}
              title="Sistem Partner"
              description="Kelola partner dengan sistem komisi dan target yang transparan"
            />
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden absolute top-0 left-0 right-0 z-20">
        <div className="h-32 bg-gradient-to-b from-primary/10 to-transparent" />
      </div>

      {/* Right Side / Mobile - Login Form */}
      <div className={cn(
        "w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-4 sm:p-6 relative z-10",
        "lg:p-8 xl:p-12"
      )}>
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-primary/25 mb-4">
              {config.logoUrl && !logoError ? (
                <img 
                  src={config.logoUrl} 
                  alt={siteName}
                  className="w-9 h-9 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-white font-bold text-lg">{getInitials()}</span>
              )}
            </div>
            <h1 className="text-xl font-bold">{siteName}</h1>
          </div>

          {/* Back button - Mobile only */}
          <Button 
            variant="ghost" 
            asChild 
            className="mb-4 -ml-2 tap-highlight lg:hidden"
          >
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Home
            </Link>
          </Button>

          <Card className={cn(
            "border-0 shadow-2xl shadow-black/5 bg-background/80 backdrop-blur-xl",
            "rounded-3xl overflow-hidden",
            hasHydrated && "animate-in fade-in slide-in-from-bottom-4 duration-500"
          )}>
            {/* Gradient accent line */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500" />
            
            <CardContent className="p-4 sm:p-8">
              {/* Header */}
              <div className="text-center mb-5">
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Selamat Datang!</h2>
                <p className="text-sm sm:text-muted-foreground">Login untuk melanjutkan ke dashboard</p>
              </div>

              {/* Role Selector */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setRole('partner')}
                  className={cn(
                    'relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 tap-highlight active-scale overflow-hidden group',
                    role === 'partner'
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  )}
                >
                  {role === 'partner' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5" />
                  )}
                  <div className="relative">
                    <Building2 className={cn(
                      'w-5 h-5 sm:w-7 sm:h-7 mx-auto mb-1 sm:mb-2 transition-all duration-300',
                      role === 'partner' ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-primary/70'
                    )} />
                    <p className={cn(
                      'font-semibold text-sm transition-colors',
                      role === 'partner' ? 'text-primary' : 'text-muted-foreground'
                    )}>Partner</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Mitra Bisnis</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={cn(
                    'relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 tap-highlight active-scale overflow-hidden group',
                    role === 'owner'
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  )}
                >
                  {role === 'owner' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5" />
                  )}
                  <div className="relative">
                    <User className={cn(
                      'w-5 h-5 sm:w-7 sm:h-7 mx-auto mb-1 sm:mb-2 transition-all duration-300',
                      role === 'owner' ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-primary/70'
                    )} />
                    <p className={cn(
                      'font-semibold text-sm transition-colors',
                      role === 'owner' ? 'text-primary' : 'text-muted-foreground'
                    )}>Owner</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Admin Pemilik</p>
                  </div>
                </button>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-5 rounded-xl border-destructive/50 bg-destructive/5">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email / Username
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="text"
                      placeholder="Email atau username"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 sm:h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors pl-4"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-11 sm:h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors pr-12"
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 hover:bg-muted rounded-lg tap-highlight"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Eye className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => {
                          const isActive = getPasswordStrength(password) >= level;
                          const color = level <= 1 ? 'bg-destructive' : level <= 2 ? 'bg-orange-500' : level <= 3 ? 'bg-amber-500' : 'bg-emerald-500';
                          return (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                isActive ? color : 'bg-muted'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {getPasswordStrengthLabel(password)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Login sebagai {role === 'owner' ? 'Owner' : 'Partner'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Register Link */}
              {role === 'partner' && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Belum punya akun?{' '}
                    <Link href="/register" className="text-primary font-semibold hover:underline tap-highlight inline-flex items-center gap-1">
                      Daftar Sekarang
                      <ArrowLeft className="w-3 h-3 rotate-180" />
                    </Link>
                  </p>
                </div>
              )}

              {/* Trust Badge */}
              <div className="mt-4 pt-4 border-t border-dashed border-border/50">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>Login aman dengan enkripsi SSL</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back button - Desktop */}
          <Button 
            variant="ghost" 
            asChild 
            className="mt-4 mx-auto hidden lg:flex tap-highlight"
          >
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Home
            </Link>
          </Button>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx global>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up linear infinite;
        }
      `}</style>
    </div>
  );
}
