'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, User, Building2, Loader2, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/hooks/use-site-config';

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
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-xl animate-pulse">
            <span className="text-white font-bold text-2xl">{getInitials()}</span>
          </div>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Button 
          variant="ghost" 
          asChild 
          className="mb-4 -ml-2 tap-highlight"
        >
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Link>
        </Button>

        <Card className="glass-card mobile-shadow overflow-hidden">
          {/* Gradient Header */}
          <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500" />
          
          <CardHeader className="text-center space-y-4 pt-6 sm:pt-8">
            {/* Logo */}
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-xl">
              {config.logoUrl && !logoError ? (
                <img 
                  src={config.logoUrl} 
                  alt={siteName}
                  className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-white font-bold text-xl sm:text-2xl">{getInitials()}</span>
              )}
            </div>
            
            <div>
              <CardTitle className="text-xl sm:text-2xl">Selamat Datang</CardTitle>
              <CardDescription className="text-sm">Login ke akun {siteName} Anda</CardDescription>
            </div>

            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Login Aman & Terenkripsi</span>
            </div>
          </CardHeader>
          
          <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setRole('partner')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all duration-300 tap-highlight active-scale',
                  role === 'partner'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-muted hover:border-primary/50'
                )}
              >
                <Building2 className={cn(
                  'w-7 h-7 mx-auto mb-2 transition-colors',
                  role === 'partner' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <p className={cn(
                  'font-medium text-sm transition-colors',
                  role === 'partner' ? 'text-primary' : 'text-muted-foreground'
                )}>Partner</p>
              </button>
              
              <button
                type="button"
                onClick={() => setRole('owner')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all duration-300 tap-highlight active-scale',
                  role === 'owner'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-muted hover:border-primary/50'
                )}
              >
                <User className={cn(
                  'w-7 h-7 mx-auto mb-2 transition-colors',
                  role === 'owner' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <p className={cn(
                  'font-medium text-sm transition-colors',
                  role === 'owner' ? 'text-primary' : 'text-muted-foreground'
                )}>Owner</p>
              </button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email / Username</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mobile-input"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mobile-input pr-12"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent tap-highlight"
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

              <Button
                type="submit"
                className="w-full mobile-btn-primary h-12 sm:h-14 text-base"
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
                  </>
                )}
              </Button>
            </form>

            {role === 'partner' && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum punya akun?{' '}
                  <Link href="/register" className="text-primary font-semibold hover:underline tap-highlight">
                    Daftar Sekarang
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
