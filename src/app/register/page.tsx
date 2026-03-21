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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, User, CreditCard, MapPin, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/hooks/use-site-config';

const banks = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon', 
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

const benefits = [
  { icon: CreditCard, text: 'Komisi 30%' },
  { icon: User, text: 'Target 5jt' },
  { icon: Shield, text: 'Aman & Terpercaya' },
];

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

  // Don't render register form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero px-4 py-6 sm:py-12">
      <div className="w-full max-w-lg mx-auto">
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
              <CardTitle className="text-xl sm:text-2xl">Daftar Mitra</CardTitle>
              <CardDescription className="text-sm">Bergabung dengan {siteName}</CardDescription>
            </div>

            {/* Benefits */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="px-3 py-1.5 text-xs sm:text-sm gap-1.5"
                  >
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    {benefit.text}
                  </Badge>
                );
              })}
            </div>
          </CardHeader>
          
          <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Data Pribadi</h3>
                    <p className="text-xs text-muted-foreground">Informasi akun Anda</p>
                  </div>
                </div>
                
                <div className="space-y-3 pl-11">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Nama Lengkap *</Label>
                    <Input
                      id="name"
                      placeholder="Nama lengkap Anda"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                      className="mobile-input"
                      autoComplete="name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@contoh.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        required
                        className="mobile-input"
                        autoComplete="email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">No. WhatsApp *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="08xxxxxxxxxx"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        required
                        className="mobile-input"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* Password Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 6 karakter"
                          value={formData.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          required
                          minLength={6}
                          className="mobile-input pr-12"
                          autoComplete="new-password"
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm">Konfirmasi *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Ulangi password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleChange('confirmPassword', e.target.value)}
                          required
                          minLength={6}
                          className="mobile-input pr-12"
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent tap-highlight"
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

              <Separator />

              {/* Bank Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Data Bank</h3>
                    <p className="text-xs text-muted-foreground">Untuk transfer komisi</p>
                  </div>
                </div>
                
                <div className="space-y-3 pl-11">
                  <div className="space-y-2">
                    <Label className="text-sm">Nama Bank *</Label>
                    <Select
                      value={formData.bankName}
                      onValueChange={(value) => handleChange('bankName', value)}
                    >
                      <SelectTrigger className="mobile-input">
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
                      <Label className="text-sm">No. Rekening *</Label>
                      <Input
                        placeholder="Nomor rekening"
                        value={formData.bankAccount}
                        onChange={(e) => handleChange('bankAccount', e.target.value)}
                        required
                        className="mobile-input"
                        inputMode="numeric"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Nama Pemilik *</Label>
                      <Input
                        placeholder="Nama di rekening"
                        value={formData.bankHolder}
                        onChange={(e) => handleChange('bankHolder', e.target.value)}
                        required
                        className="mobile-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Kota *
                    </Label>
                    <Input
                      placeholder="Kota domisili"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      required
                      className="mobile-input"
                      autoComplete="address-level2"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full mobile-btn-primary h-12 sm:h-14 text-base mt-6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Daftar Sekarang
                  </>
                )}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-primary font-semibold hover:underline tap-highlight">
                  Login Disini
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
