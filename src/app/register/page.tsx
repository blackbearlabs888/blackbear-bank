'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, User, CreditCard, 
  MapPin, Shield, Sparkles, Zap, Star, TrendingUp, Wallet, Lock,
  Mail, Phone, Building2, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/hooks/use-site-config';

const banks = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon', 
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

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
      
      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <FloatingParticle
          key={i}
          delay={i * 0.8}
          duration={8 + Math.random() * 4}
          size={4 + Math.random() * 8}
          left={10 + (i * 12)}
        />
      ))}
      
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

// Step indicator component
function StepIndicator({ step, title, isActive, isCompleted }: { step: number; title: string; isActive: boolean; isCompleted: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
        isCompleted ? "bg-primary text-white" : 
        isActive ? "bg-primary text-white shadow-lg shadow-primary/30" : 
        "bg-muted text-muted-foreground"
      )}>
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          step
        )}
      </div>
      <span className={cn(
        "font-medium transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}>
        {title}
      </span>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasHydrated, setUser, setPartner, hydrate } = useAuthStore();
  const { config, getInitials } = useSiteConfig();
  const hasRedirected = useRef(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    city: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);

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
      router.replace('/partner/dashboard');
    }
  }, [hasHydrated, isAuthenticated, router, loading]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    if (!/^08[0-9]{8,12}$/.test(formData.phone)) {
      setError('Format nomor WhatsApp tidak valid (contoh: 08xxx)');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Registrasi gagal');
        setLoading(false);
        return;
      }

      setUser(data.user);
      setPartner(data.partner);
      router.replace('/partner/dashboard');
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  // Calculate step completion
  const personalInfoComplete = formData.name && formData.email && formData.phone && formData.password && formData.confirmPassword;
  const bankInfoComplete = formData.bankName && formData.bankAccount && formData.bankHolder && formData.city;

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

  // Don't render register form if already authenticated
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
              Bergabung<br />
              <span className="text-white/80">Sebagai Mitra</span>
            </h2>
            <p className="text-white/60 text-lg max-w-md">
              Dapatkan penghasilan tambahan dengan sistem komisi transparan dan dukungan tim profesional.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4 max-w-lg">
            <FeatureCard 
              icon={TrendingUp}
              title="Komisi Hingga 30%"
              description="Dapatkan komisi menarik dari setiap transaksi yang Anda proses"
            />
            <FeatureCard 
              icon={Star}
              title="Tier & Badge System"
              description="Naik level dan dapatkan reward eksklusif berdasarkan performa"
            />
            <FeatureCard 
              icon={Shield}
              title="Support Profesional"
              description="Tim support siap membantu Anda 24/7 untuk kelancaran bisnis"
            />
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden absolute top-0 left-0 right-0 z-20">
        <div className="h-32 bg-gradient-to-b from-primary/10 to-transparent" />
      </div>

      {/* Right Side / Mobile - Register Form */}
      <div className={cn(
        "w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-4 sm:p-6 relative z-10",
        "lg:p-8 xl:p-12"
      )}>
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-primary/25 mb-4">
              {config.logoUrl && !logoError ? (
                <img 
                  src={config.logoUrl} 
                  alt={siteName}
                  className="w-9 h-9 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-white font-bold text-xl">{getInitials()}</span>
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
            
            <CardContent className="p-6 sm:p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Daftar Mitra</h2>
                <p className="text-muted-foreground">Bergabung dengan {siteName}</p>
              </div>

              {/* Benefits badges */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <Badge variant="secondary" className="px-3 py-1.5 gap-1.5 rounded-full">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  Komisi 30%
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 gap-1.5 rounded-full">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Target 5jt
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 gap-1.5 rounded-full">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Aman
                </Badge>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-5 rounded-xl border-destructive/50 bg-destructive/5">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info Section */}
                <div className="space-y-4">
                  <StepIndicator 
                    step={1} 
                    title="Data Pribadi" 
                    isActive={true} 
                    isCompleted={!!personalInfoComplete}
                  />
                  
                  <div className="pl-11 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Nama Lengkap
                      </Label>
                      <Input
                        id="name"
                        placeholder="Nama lengkap Anda"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                        className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                        autoComplete="name"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@contoh.com"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          required
                          className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                          autoComplete="email"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          No. WhatsApp
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="08xxxxxxxxxx"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          required
                          className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    {/* Password Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min. 6 karakter"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            required
                            minLength={6}
                            className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors pr-12"
                            autoComplete="new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-muted rounded-lg tap-highlight"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Eye className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          Konfirmasi
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Ulangi password"
                            value={formData.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            required
                            minLength={6}
                            className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors pr-12"
                            autoComplete="new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-muted rounded-lg tap-highlight"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Eye className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-border/50" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-card text-xs text-muted-foreground">Data Bank</span>
                  </div>
                </div>

                {/* Bank Info Section */}
                <div className="space-y-4">
                  <StepIndicator 
                    step={2} 
                    title="Data Bank" 
                    isActive={!!personalInfoComplete} 
                    isCompleted={!!bankInfoComplete}
                  />
                  
                  <div className="pl-11 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        Nama Bank
                      </Label>
                      <Select
                        value={formData.bankName}
                        onValueChange={(value) => handleChange('bankName', value)}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors">
                          <SelectValue placeholder="Pilih bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((bank) => (
                            <SelectItem key={bank} value={bank}>
                              {bank}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">No. Rekening</Label>
                        <Input
                          placeholder="Nomor rekening"
                          value={formData.bankAccount}
                          onChange={(e) => handleChange('bankAccount', e.target.value)}
                          required
                          className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                          inputMode="numeric"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Nama Pemilik</Label>
                        <Input
                          placeholder="Nama di rekening"
                          value={formData.bankHolder}
                          onChange={(e) => handleChange('bankHolder', e.target.value)}
                          required
                          className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        Kota
                      </Label>
                      <Input
                        placeholder="Kota domisili"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        required
                        className="h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                        autoComplete="address-level2"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Daftar Sekarang
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Sudah punya akun?{' '}
                  <Link href="/login" className="text-primary font-semibold hover:underline tap-highlight inline-flex items-center gap-1">
                    Login Disini
                    <ArrowLeft className="w-3 h-3 rotate-180" />
                  </Link>
                </p>
              </div>

              {/* Trust Badge */}
              <div className="mt-6 pt-6 border-t border-dashed border-border/50">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>Data Anda aman dan terenkripsi</span>
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
