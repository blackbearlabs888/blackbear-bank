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
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const banks = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon', 
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasHydrated, setUser, setPartner, hydrate } = useAuthStore();
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
      // New registrations are always partners
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
      
      // Use replace to avoid back button issues
      // New registrations are always partners
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
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl animate-pulse">
            <span className="text-white font-bold text-2xl">BB</span>
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

        <Card className="glass-card mobile-shadow">
          <CardHeader className="text-center space-y-3 pt-6 sm:pt-8">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-2xl sm:text-3xl">BB</span>
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl">Daftar Mitra</CardTitle>
              <CardDescription className="text-sm">Bergabung dengan Black Bear Partner</CardDescription>
            </div>
            
            {/* Benefits - mobile optimized */}
            <div className="flex justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>Komisi 30%</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>Target 5jt</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center">
                    <span className="text-white text-xs">1</span>
                  </div>
                  Data Pribadi
                </h3>
                
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

                {/* Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

              {/* Bank Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center">
                    <span className="text-white text-xs">2</span>
                  </div>
                  Data Bank
                </h3>
                
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  <Label className="text-sm">Kota *</Label>
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

              <Button
                type="submit"
                className="w-full mobile-btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Daftar Sekarang'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
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
