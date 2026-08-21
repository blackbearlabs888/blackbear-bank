'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calculator, 
  CreditCard, 
  Truck, 
  Loader2,
  CheckCircle2,
  Sparkles,
  Shield,
  Clock,
  Wallet,
  TrendingDown,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  User,
  MapPin,
  Check,
  Building,
  WalletCards,
  Zap,
  Star,
  Globe,
  Phone,
  Search,
  Package,
  RefreshCw,
  Info,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Link2,
  Send,
  Banknote,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/hooks/use-site-config';
import { CitySearch } from '@/components/ui/city-search';
import { calculateTransaction } from '@/lib/transaction/fee';
import { Suspense } from 'react';
import { trackEvent } from '@/lib/analytics/track';
import { amountBucket } from '@/lib/analytics/buckets';

interface PaymentType {
  id: string;
  name: string;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  discountPercent?: number;
  discountNominal?: number;
  minTransaction?: number;
}

const banks = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon', 
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

// Pre-computed particle positions to avoid hydration mismatch & re-render jitter
const particles = [
  { left: 12, top: 8, dur: 7, delay: 0 },
  { left: 45, top: 15, dur: 9, delay: 1.2 },
  { left: 78, top: 22, dur: 6, delay: 2.5 },
  { left: 23, top: 38, dur: 11, delay: 0.8 },
  { left: 67, top: 45, dur: 8, delay: 3.1 },
  { left: 5, top: 55, dur: 10, delay: 1.5 },
  { left: 88, top: 60, dur: 7.5, delay: 4 },
  { left: 34, top: 72, dur: 9.5, delay: 0.3 },
  { left: 56, top: 80, dur: 6.5, delay: 2.8 },
  { left: 91, top: 90, dur: 8.5, delay: 1.8 },
  { left: 15, top: 48, dur: 12, delay: 3.5 },
  { left: 72, top: 5, dur: 8, delay: 0.5 },
  { left: 38, top: 62, dur: 7, delay: 2.2 },
  { left: 82, top: 35, dur: 10, delay: 1.8 },
  { left: 50, top: 28, dur: 9, delay: 4.2 },
  { left: 8, top: 85, dur: 11, delay: 0.7 },
  { left: 60, top: 55, dur: 6, delay: 3.8 },
  { left: 95, top: 42, dur: 8, delay: 1.1 },
  { left: 28, top: 18, dur: 10, delay: 2.9 },
  { left: 42, top: 92, dur: 7, delay: 0.4 },
];

// Animated Background Component
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 dark:from-gray-950 dark:via-violet-950/20 dark:to-fuchsia-950/20" />
      
      {/* Mesh Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-violet-400/30 to-fuchsia-400/30 dark:from-violet-600/20 dark:to-fuchsia-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-400/30 to-rose-400/30 dark:from-pink-600/20 dark:to-rose-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-fuchsia-500/10 dark:from-primary/5 dark:to-fuchsia-500/5 rounded-full blur-3xl" />
      
      {/* Floating Particles (pre-computed, no Math.random) */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20 dark:bg-primary/10 will-change-transform"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `float ${p.dur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

// Step Indicator Component
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="relative p-2.5 sm:p-4 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10">
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div 
                className={cn(
                  "relative flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-xl font-semibold text-sm transition-all duration-500",
                  currentStep > index 
                    ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30" 
                    : currentStep === index 
                      ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg shadow-primary/30 scale-110" 
                      : "bg-muted/50 text-muted-foreground"
                )}
              >
                {currentStep > index ? (
                  <Check className="w-5 h-5" />
                ) : (
                  index + 1
                )}
                {currentStep === index && (
                  <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                currentStep === index ? "text-primary" : "text-muted-foreground"
              )}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="relative w-6 sm:w-16 h-1 rounded-full bg-muted/50 overflow-hidden">
                <div 
                  className={cn(
                    "absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-fuchsia-500 transition-all duration-500",
                    currentStep > index ? "w-full" : "w-0"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Panduan Gestun (Expandable Guide)
function GestunGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const gestunSteps = [
    {
      icon: <User className="w-4 h-4" />,
      title: 'Isi data penerima',
      desc: 'Nama, no HP, dan rekening bank tujuan',
    },
    {
      icon: <CreditCard className="w-4 h-4" />,
      title: 'Pilih nominal & tipe',
      desc: 'Pilih nominal gestun dan tipe pembayaran',
    },
    {
      icon: <ClipboardList className="w-4 h-4" />,
      title: 'Submit order',
      desc: 'Tunggu admin memverifikasi order Anda',
    },
    {
      icon: <Link2 className="w-4 h-4" />,
      title: 'Link pembayaran',
      desc: 'Admin akan memberikan link pembayaran',
    },
    {
      icon: <Wallet className="w-4 h-4" />,
      title: 'Lakukan pembayaran',
      desc: 'Bayar via link menggunakan kartu kredit/paylater',
    },
    {
      icon: <Send className="w-4 h-4" />,
      title: 'Dana dikirim',
      desc: 'Dana ditransfer ke rekening Anda',
    },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/5 via-purple-500/5 to-fuchsia-500/5 backdrop-blur-xl animate-fade-in">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-2.5 sm:p-4 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
          <Info className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Panduan Gestun</p>
          <p className="text-xs text-muted-foreground">Apa itu gestun & cara kerjanya</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-black/20 flex items-center justify-center flex-shrink-0">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in">
          {/* Apa itu Gestun */}
          <div className="p-2.5 rounded-xl bg-white/50 dark:bg-black/20 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold">Apa itu Gestun?</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Gestun (Gesek Tunai)</span> adalah layanan tarik tunai dari kartu kredit atau paylater. Anda melakukan pembayaran via link yang diberikan admin, kemudian dana dikirim ke rekening Anda.
            </p>
          </div>

          {/* Cara Kerja Gestun */}
          <div className="p-2.5 rounded-xl bg-white/50 dark:bg-black/20 border border-primary/10">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Cara Kerja Gestun
            </p>
            <div className="space-y-0">
              {gestunSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-fuchsia-500/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    {index < gestunSteps.length - 1 && (
                      <div className="w-px h-full min-h-[24px] bg-gradient-to-b from-primary/30 to-transparent" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Catatan Penting */}
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Catatan Penting</p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-none">
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                Pastikan data rekening bank yang Anda masukkan sudah benar
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                Proses gestun menggunakan metode pembayaran kartu kredit atau paylater yang Anda pilih
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                Biaya layanan akan dipotong dari nominal gestun
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 1: Recipient Data
function StepRecipient({ 
  formData, 
  onChange,
  onNext 
}: { 
  formData: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}) {
  const isValid = formData.name && formData.phone;
  const [searchPhone, setSearchPhone] = useState('');
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<{ recognized: boolean } | null>(null);

  // Lookup returning customer. Per Phase 1.2 closure, the public lookup
  // endpoint returns ONLY `{ recognized: boolean }` — no PII is exposed, so
  // there is nothing to auto-fill. The user types their data manually. The
  // indicator just acknowledges that the phone is recognised so the user
  // knows their previous order is on file.
  const handleLookupCustomer = async () => {
    const phone = searchPhone.trim() || formData.phone.trim();
    if (!phone || phone.length < 10) {
      setLookupError('Masukkan nomor WhatsApp yang valid');
      return;
    }

    setLoadingLookup(true);
    setLookupError('');
    setFoundCustomer(null);

    try {
      const response = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();

      if (data.success && data.data) {
        // Only the existence signal is returned — no PII, no auto-fill.
        setFoundCustomer({ recognized: !!data.data.recognized });
      } else {
        setLookupError('Terjadi kesalahan. Silakan isi data manual.');
      }
    } catch {
      setLookupError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoadingLookup(false);
    }
  };

  return (
    <Card className="glass-card animate-slide-up overflow-hidden border-0 shadow-2xl shadow-primary/5">
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <User className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Data Penerima</CardTitle>
            <CardDescription>Informasi untuk mengirim dana</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Step Tip */}
        <div className="flex items-start gap-3 p-2 sm:p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 animate-fade-in">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">Tips Langkah 1</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pastikan nomor WhatsApp aktif untuk menerima notifikasi dan data rekening bank valid untuk menerima dana.
            </p>
          </div>
        </div>

        {/* Returning Customer Section */}
        <div className="p-2.5 sm:p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Sudah Pernah Order?</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Masukkan nomor WhatsApp untuk mengisi otomatis data penerima
          </p>
          <div className="flex gap-2">
            <Input
              type="tel"
              placeholder="08xxx atau 628xxx"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="h-10 flex-1 text-sm rounded-lg bg-white/50 dark:bg-black/20 border-2 focus:border-blue-500"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLookupCustomer}
              disabled={loadingLookup}
              className="h-10 px-4 rounded-lg border-blue-500/50 hover:bg-blue-500/10"
            >
              {loadingLookup ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : foundCustomer ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {lookupError && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{lookupError}</p>
          )}
          {foundCustomer && (
            <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
              <Check className="w-3 h-3" />
              {foundCustomer.recognized
                ? 'Nomor dikenali — silakan isi data penerima di bawah ini.'
                : 'Nomor belum terdaftar — silakan isi data penerima di bawah ini.'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">atau isi manual</span>
          <Separator className="flex-1" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Nama Lengkap *
            </Label>
            <Input
              placeholder="Nama lengkap"
              value={formData.name}
              onChange={(e) => onChange('name', e.target.value.slice(0, 100))}
              className="h-10 sm:h-11 rounded-xl bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              No. WhatsApp *
            </Label>
            <Input
              type="tel"
              placeholder="08xxx atau 628xxx"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value.replace(/[^0-9]/g, '').slice(0, 15))}
              className="h-10 sm:h-11 rounded-xl bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
              maxLength={15}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-muted/30 border border-dashed">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Building className="w-3.5 h-3.5" />
            Informasi Bank (Opsional)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Bank</Label>
            {formData.bank === 'Lainnya' ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nama bank"
                  value={formData.bankCustom || ''}
                  onChange={(e) => onChange('bankCustom', e.target.value)}
                  className="h-11 rounded-xl bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange('bank', '');
                    onChange('bankCustom', '');
                  }}
                  className="h-11 px-3 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Select
                value={formData.bank}
                onValueChange={(value) => onChange('bank', value)}
              >
                <SelectTrigger className="h-11 rounded-xl bg-white/50 dark:bg-black/20 border-2">
                  <SelectValue placeholder="Pilih bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">No. Rekening</Label>
            <Input
              placeholder="Nomor rekening"
              value={formData.bankAccount}
              onChange={(e) => onChange('bankAccount', e.target.value.replace(/[^0-9]/g, '').slice(0, 20))}
              className="h-11 rounded-xl bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
              inputMode="numeric"
              maxLength={20}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Nama di Rekening</Label>
            <Input
              placeholder="Nama pemilik rekening"
              value={formData.bankHolder}
              onChange={(e) => onChange('bankHolder', e.target.value.slice(0, 100))}
              className="h-11 rounded-xl bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Kota</Label>
            <CitySearch
              value={formData.city}
              onChange={(value) => onChange('city', value)}
              placeholder="Cari kota domisili..."
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="w-full h-10 sm:h-12 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 hover:from-primary/90 hover:to-fuchsia-500/90 text-white shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          Lanjutkan
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

// Step 2: Transaction Details
function StepTransaction({ 
  formData, 
  paymentTypes,
  onChange,
  onBack,
  onNext 
}: { 
  formData: Record<string, string>;
  paymentTypes: PaymentType[];
  onChange: (field: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const selectedPayment = paymentTypes.find((p) => p.id === formData.paymentTypeId);
  const isValid = formData.nominal && formData.paymentTypeId;

  // Sort payment types: ones with active discounts first
  const sortedPaymentTypes = useMemo(() => {
    return [...paymentTypes].sort((a, b) => {
      const aDiscount = (a.discountPercent > 0 || a.discountNominal > 0) ? 0 : 1;
      const bDiscount = (b.discountPercent > 0 || b.discountNominal > 0) ? 0 : 1;
      return aDiscount - bDiscount;
    });
  }, [paymentTypes]);

  // Get payment types with active discounts for recommendation bar
  const discountedPaymentTypes = useMemo(() => {
    return paymentTypes.filter((pt) => pt.discountPercent > 0 || pt.discountNominal > 0);
  }, [paymentTypes]);

  return (
    <Card className="glass-card animate-slide-up overflow-hidden border-0 shadow-2xl shadow-primary/5">
      <div className="h-1.5 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500" />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
            <CreditCard className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Detail Transaksi</CardTitle>
            <CardDescription>Pilih nominal dan metode pembayaran</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {discountedPaymentTypes.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Promo Aktif!</p>
              <p className="text-[11px] text-muted-foreground">
                {discountedPaymentTypes.map(pt => pt.name).join(', ')} sedang diskon
              </p>
            </div>
          </div>
        )}

        {/* Step Tip */}
        <div className="flex items-start gap-3 p-2 sm:p-3 rounded-xl bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/20 animate-fade-in">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/20 flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-400 mb-0.5">Tips Langkah 2</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pilih tipe pembayaran sesuai kartu yang Anda miliki (kartu kredit/paylater). Fee akan otomatis dihitung berdasarkan nominal.
            </p>
          </div>
        </div>

        {/* Nominal */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
            Nominal Gestun *
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">Rp</span>
            <Input
              type="number"
              placeholder="1.000.000"
              value={formData.nominal}
              onChange={(e) => onChange('nominal', e.target.value)}
              min={10000}
              className="h-12 sm:h-16 pl-14 pr-4 text-xl font-bold rounded-xl bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
              inputMode="numeric"
            />
          </div>
          <p className="text-xs text-muted-foreground">Minimal Rp 10.000</p>
        </div>

        {/* Payment Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipe Pembayaran *</Label>
          <Select
            value={formData.paymentTypeId}
            onValueChange={(value) => onChange('paymentTypeId', value)}
          >
            <SelectTrigger className="h-11 rounded-xl bg-white/50 dark:bg-black/20 border-2">
              <SelectValue placeholder="Pilih tipe pembayaran" />
            </SelectTrigger>
            <SelectContent>
              {sortedPaymentTypes.map((pt) => (
                <SelectItem key={pt.id} value={pt.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{pt.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pt.onlineFeePercent}% / {pt.codFeePercent}% COD)
                    </span>
                    {(pt.discountPercent > 0 || pt.discountNominal > 0) && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">⭐ Diskon</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Type Info */}
        {selectedPayment && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary/5 to-fuchsia-500/5 border border-primary/20 animate-fade-in space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Online</span>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedPayment.onlineFeePercent}%</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">COD</span>
                </div>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{selectedPayment.codFeePercent}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Threshold: {formatCurrency(selectedPayment.threshold)}
            </p>
            {/* Discount Info */}
            {(selectedPayment.discountPercent > 0 || selectedPayment.discountNominal > 0) && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Promo Diskon</span>
                </div>
                {selectedPayment.discountPercent > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Diskon {selectedPayment.discountPercent}% dari biaya layanan</p>
                )}
                {selectedPayment.discountNominal > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Potongan biaya {formatCurrency(selectedPayment.discountNominal)}</p>
                )}
                {selectedPayment.minTransaction > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">Minimal transaksi {formatCurrency(selectedPayment.minTransaction)}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Method */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Metode Transaksi *</Label>
          <RadioGroup
            value={formData.methodTransaction}
            onValueChange={(value) => onChange('methodTransaction', value)}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <RadioGroupItem value="Online" id="online" className="peer sr-only" />
              <Label
                htmlFor="online"
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 p-2.5 sm:p-5 cursor-pointer transition-all",
                  formData.methodTransaction === 'Online'
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                    : "border-muted bg-white/30 dark:bg-black/10 hover:border-primary/50"
                )}
              >
                <Globe className={cn(
                  "w-5 h-5 sm:w-8 sm:h-8 mb-1.5",
                  formData.methodTransaction === 'Online' ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="font-semibold">Online</span>
                <span className="text-xs text-muted-foreground">Via link</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="COD" id="cod" className="peer sr-only" />
              <Label
                htmlFor="cod"
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 p-2.5 sm:p-5 cursor-pointer transition-all",
                  formData.methodTransaction === 'COD'
                    ? "border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/20"
                    : "border-muted bg-white/30 dark:bg-black/10 hover:border-amber-500/50"
                )}
              >
                <Truck className={cn(
                  "w-5 h-5 sm:w-8 sm:h-8 mb-1.5",
                  formData.methodTransaction === 'COD' ? "text-amber-500" : "text-muted-foreground"
                )} />
                <span className="font-semibold">COD</span>
                <span className="text-xs text-muted-foreground">Cash on Delivery</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 h-10 sm:h-12 rounded-xl"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <Button
            type="button"
            onClick={onNext}
            disabled={!isValid}
            className="flex-1 h-10 sm:h-12 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 hover:from-primary/90 hover:to-fuchsia-500/90 text-white shadow-lg shadow-primary/30"
          >
            Lanjutkan
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 3: Calculation Summary
function StepCalculation({ 
  formData, 
  paymentTypes,
  calculation,
  loading,
  partnerInfo,
  onBack,
  onSubmit,
  submitCooldown
}: { 
  formData: Record<string, string>;
  paymentTypes: PaymentType[];
  calculation: { paymentFee: number; totalReceived: number; originalFee: number; discountAmount: number; appliedDiscountPercent: number; hasDiscount: boolean; meetsMin: boolean; ptMinTransaction: number };
  loading: boolean;
  partnerInfo: { id: string; name: string; tier: string } | null;
  onBack: () => void;
  onSubmit: () => void;
  submitCooldown: number;
}) {
  const paymentType = paymentTypes.find((p) => p.id === formData.paymentTypeId);
  const nominal = parseFloat(formData.nominal) || 0;
  const feePercent = formData.methodTransaction === 'Online' 
    ? paymentType?.onlineFeePercent 
    : paymentType?.codFeePercent;

  return (
    <div className="space-y-4">
      {/* Step Tip */}
      <div className="flex items-start gap-3 p-2 sm:p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20 animate-fade-in">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-0.5">Tips Langkah 3</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Periksa kembali nominal dan biaya layanan. Setelah order dibuat, tim kami akan segera memproses dan mengirimkan link pembayaran.
          </p>
        </div>
      </div>

      {/* Calculation Card */}
      <Card className="glass-card animate-slide-up overflow-hidden border-0 shadow-2xl shadow-primary/10">
        <div className="h-1.5 bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500" />
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shadow-lg shadow-primary/30">
              <Calculator className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-base">Kalkulasi</p>
              <p className="text-sm text-muted-foreground">Estimasi dana yang akan diterima</p>
            </div>
            {feePercent !== undefined && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Fee: {feePercent}%
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">Nominal</span>
              <span className="font-bold text-lg sm:text-xl">{formatCurrency(nominal)}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 sm:py-3 sm:px-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-xl border border-red-500/20">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                <span className="text-muted-foreground">Biaya Layanan</span>
              </div>
              <div className="text-right">
                {calculation.hasDiscount && (
                  <span className="block text-xs text-muted-foreground line-through">{formatCurrency(calculation.originalFee)}</span>
                )}
                <span className="font-bold text-red-500 text-base sm:text-lg">- {formatCurrency(calculation.paymentFee)}</span>
              </div>
            </div>
            {calculation.hasDiscount && (
              <div className="flex justify-between items-center py-2 px-3 sm:py-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium text-sm">Diskon {calculation.appliedDiscountPercent.toFixed(1)}%</span>
                </div>
                <span className="font-bold text-emerald-600 text-base sm:text-lg">+ {formatCurrency(calculation.discountAmount)}</span>
              </div>
            )}
            {!calculation.meetsMin && calculation.ptMinTransaction > 0 && (() => {
              const pt = paymentTypes.find((p) => p.id === formData.paymentTypeId);
              if (!pt) return null;
              // P0 hotfix: use the shared calculateTransaction to compute the
              // actual discount at minTransaction — mirrors percent-or-nominal
              // exclusivity (never sums both). Previously this inline block
              // subtracted BOTH discountPercent AND discountNominal, diverging
              // from calculateTransaction and producing wrong potentialSavings.
              const calcAtMin = calculateTransaction({
                nominal: calculation.ptMinTransaction,
                paymentType: pt as unknown as Parameters<typeof calculateTransaction>[0]['paymentType'],
                marketplace: null,
                partner: null,
                methodTransaction: formData.methodTransaction === 'COD' ? 'COD' : 'Online',
              });
              const extraNeeded = calculation.ptMinTransaction - nominal;
              const potentialSavings = calcAtMin.discountAmount;
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Tambah nominal minimal <strong>{formatCurrency(calculation.ptMinTransaction)}</strong> untuk mendapat diskon</span>
                  </div>
                  {extraNeeded > 0 && potentialSavings > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Tambah nominal ke <strong>{formatCurrency(calculation.ptMinTransaction)}</strong> untuk hemat <strong>{formatCurrency(potentialSavings)}</strong> lebih banyak!</span>
                    </div>
                  )}
                </div>
              );
            })()}
            <Separator />
            <div className="flex justify-between items-center py-3 px-3 sm:py-4 sm:px-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-fuchsia-500/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="font-semibold">Total Diterima</span>
              </div>
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                {formatCurrency(calculation.totalReceived)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="glass-card border-0 shadow-xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Ringkasan Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{formData.name}</span>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{formData.city || '-'}</span>
          </div>
          {(formData.bank || formData.bankCustom) && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span>{formData.bank === 'Lainnya' ? formData.bankCustom : formData.bank} - {formData.bankAccount} a.n {formData.bankHolder}</span>
            </div>
          )}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
            <WalletCards className="w-4 h-4 text-muted-foreground" />
            <span>{paymentType?.name} ({formData.methodTransaction})</span>
          </div>
          {partnerInfo && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">Via {partnerInfo.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-10 sm:h-12 rounded-xl"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading || submitCooldown > 0}
          className="flex-1 h-10 sm:h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Memproses...
            </>
          ) : submitCooldown > 0 ? (
            <>
              <Clock className="w-5 h-5 mr-2" />
              Tunggu {submitCooldown}s
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 mr-2" />
              Buat Order
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Dengan membuat order, Anda menyetujui syarat dan ketentuan yang berlaku
      </p>
    </div>
  );
}

// Success Screen
function SuccessScreen({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <AnimatedBackground />
      <Card className="w-full max-w-md glass-card text-center animate-scale-in overflow-hidden border-0 shadow-2xl">
        <div className="h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />
        <CardContent className="pt-10 pb-8">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl animate-pulse opacity-50" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-xl shadow-green-500/30">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Order Berhasil!</h2>
          <p className="text-muted-foreground mb-6">Simpan Order ID Anda:</p>
          
          <div 
            className="relative group cursor-pointer"
            onClick={handleCopy}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-fuchsia-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-gradient-to-r from-muted to-muted/50 rounded-2xl p-5 hover:from-primary/5 hover:to-fuchsia-500/5 transition-colors">
              <p className="text-2xl font-mono font-bold bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">{orderId}</p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">Disalin!</span>
                  </>
                ) : (
                  <>
                    <span>Tap untuk menyalin</span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          {/* Next Steps */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 border border-emerald-500/20 animate-fade-in">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-500" />
              Langkah Selanjutnya:
            </p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-white">1</span>
                </div>
                <p className="text-xs text-muted-foreground">Tim kami akan memverifikasi order Anda</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-white">2</span>
                </div>
                <p className="text-xs text-muted-foreground">Link pembayaran akan dikirim melalui halaman track order</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-white">3</span>
                </div>
                <p className="text-xs text-muted-foreground">Lakukan pembayaran menggunakan kartu kredit/paylater yang Anda pilih</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-white">4</span>
                </div>
                <p className="text-xs text-muted-foreground">Dana akan dikirim ke rekening Anda setelah pembayaran dikonfirmasi</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <Button asChild className="h-12 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 hover:from-primary/90 hover:to-fuchsia-500/90 text-white shadow-lg shadow-primary/30">
              <Link href={`/track?orderId=${orderId}`}>
                <Clock className="w-4 h-4 mr-2" />
                Track Order Sekarang
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-12 rounded-xl">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrderPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <OrderPage />
    </Suspense>
  );
}

function OrderPage() {
  const { config } = useSiteConfig();
  const [currentStep, setCurrentStep] = useState(0);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Security: Honeypot & Cooldown
  const [honeypotValue, setHoneypotValue] = useState('');
  const [submitCooldown, setSubmitCooldown] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  // GA4 conversion dedup guard — prevents duplicate generate_lead events
  // if the success branch is entered twice (defence-in-depth even though
  // submit cooldown + idempotency key already prevent duplicate orders).
  const hasFiredLeadRef = useRef(false);

  // Partner referral from URL
  const [partnerInfo, setPartnerInfo] = useState<{ id: string; name: string; tier: string } | null>(null);
  const [partnerWarning, setPartnerWarning] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const partnerIdFromUrl = searchParams.get('partnerId');

  const steps = ['Data Penerima', 'Detail Transaksi', 'Kalkulasi'];

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bank: '',
    bankCustom: '',
    bankAccount: '',
    bankHolder: '',
    nominal: '',
    paymentTypeId: '',
    methodTransaction: 'Online' as 'Online' | 'COD',
    city: '',
  });

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  // Fetch payment types + partner info
  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const response = await fetch('/api/payment-types?activeOnly=true');
        const data = await response.json();
        if (data.success) {
          setPaymentTypes(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch payment types:', err);
      }
    };
    fetchPaymentTypes();

    // Fetch partner info from URL param using public endpoint
    if (partnerIdFromUrl) {
      fetch(`/api/partners/${partnerIdFromUrl}/public`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setPartnerInfo({
              id: data.data.id,
              name: data.data.name,
              tier: data.data.tier,
            });
          } else if (data.error && data.data) {
            // Partner exists but not active
            setPartnerWarning(data.error);
          } else if (data.error) {
            // Partner not found or invalid
            setPartnerWarning(data.error);
          }
        })
        .catch(() => {/* non-critical */});
    }
  }, [partnerIdFromUrl]);

  // Calculate fee
  const calculation = useMemo(() => {
    const nominal = parseFloat(formData.nominal) || 0;
    const paymentType = paymentTypes.find((p) => p.id === formData.paymentTypeId);

    if (nominal > 0 && paymentType) {
      const feePercent = formData.methodTransaction === 'Online' 
        ? paymentType.onlineFeePercent 
        : paymentType.codFeePercent;
      const feeFlat = formData.methodTransaction === 'Online' 
        ? paymentType.onlineFeeFlat 
        : paymentType.codFeeFlat;

      const originalFee = nominal >= paymentType.threshold 
        ? nominal * (feePercent / 100) 
        : feeFlat;

      // Apply discount from payment type
      const ptDiscountPercent = paymentType.discountPercent || 0;
      const ptDiscountNominal = paymentType.discountNominal || 0;
      const ptMinTransaction = paymentType.minTransaction || 0;
      const meetsMin = ptMinTransaction <= 0 || nominal >= ptMinTransaction;

      let discountAmount = 0;
      let appliedDiscountPercent = 0;
      if (meetsMin && (ptDiscountPercent > 0 || ptDiscountNominal > 0)) {
        if (ptDiscountPercent > 0) {
          discountAmount = originalFee * (ptDiscountPercent / 100);
          appliedDiscountPercent = ptDiscountPercent;
        } else if (ptDiscountNominal > 0) {
          discountAmount = Math.min(ptDiscountNominal, originalFee);
          appliedDiscountPercent = originalFee > 0 ? (discountAmount / originalFee) * 100 : 0;
        }
      }

      const paymentFee = Math.max(0, originalFee - discountAmount);

      return {
        paymentFee,
        originalFee,
        discountAmount,
        appliedDiscountPercent,
        totalReceived: nominal - paymentFee,
        hasDiscount: discountAmount > 0,
        meetsMin,
        ptMinTransaction,
      };
    }
    return { paymentFee: 0, originalFee: 0, discountAmount: 0, appliedDiscountPercent: 0, totalReceived: 0, hasDiscount: false, meetsMin: true, ptMinTransaction: 0 };
  }, [formData.nominal, formData.paymentTypeId, formData.methodTransaction, paymentTypes]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError('');

    // Security: Cooldown check
    if (submitCooldown > 0) {
      setError(`Tunggu ${submitCooldown} detik sebelum submit ulang`);
      return;
    }

    // Security: Enhanced client-side validation
    if (!formData.name || formData.name.trim().length < 2) {
      setError('Nama minimal 2 karakter');
      setCurrentStep(0);
      return;
    }
    if (formData.name.length > 100) {
      setError('Nama maksimal 100 karakter');
      setCurrentStep(0);
      return;
    }
    if (!formData.phone || !/^(62|08)[0-9]{8,13}$/.test(formData.phone)) {
      setError('Format nomor WhatsApp tidak valid (contoh: 08xxx atau 628xxx)');
      setCurrentStep(0);
      return;
    }
    if (formData.bankAccount && (formData.bankAccount.length < 5 || formData.bankAccount.length > 20)) {
      setError('Nomor rekening harus 5-20 digit');
      setCurrentStep(0);
      return;
    }

    const nominal = parseFloat(formData.nominal);
    if (isNaN(nominal) || nominal < 10000) {
      setError('Minimal nominal Rp 10.000');
      setCurrentStep(1);
      return;
    }
    if (nominal > 100000000) {
      setError('Maksimal nominal Rp 100.000.000');
      setCurrentStep(1);
      return;
    }

    // Determine the actual bank value
    const actualBank = formData.bank === 'Lainnya' ? formData.bankCustom : formData.bank;

    setLoading(true);

    // ── Phase 2: Generate idempotency key for this submission attempt ──
    // The key is held in-memory only (NOT localStorage/sessionStorage) and
    // sent as a header. If the network retries, the same key + payload
    // returns the same transaction instead of creating a duplicate.
    const idempotencyKey = (crypto as Crypto).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          ...formData,
          bank: actualBank,
          nominal,
          partnerId: partnerInfo?.id || undefined,
          // Honeypot field - bots will fill this
          website: honeypotValue,
        }),
      });

      const data = await response.json();

      // Handle rate limit (429)
      if (response.status === 429) {
        setError(data.error || 'Terlalu banyak request. Tunggu beberapa saat.');
        setLoading(false);
        return;
      }

      if (!response.ok || !data.success) {
        setError(data.error || 'Gagal membuat order');
        setLoading(false);
        return;
      }

      // GA4 conversion: fire generate_lead DIRECTLY after server confirms
      // success (per owner directive — NOT via useEffect) so the event
      // is sent before the success-screen redirect takes over.
      // Skip honeypot submissions (bot-filled the hidden website field).
      // Skip the server-side honeypot sentinel orderId 'BB-PENDING'.
      // Only allowlisted params pass (PII stripped by trackEvent).
      const isHoneypot =
        !!honeypotValue || data.data?.orderId === 'BB-PENDING';
      if (!isHoneypot && !hasFiredLeadRef.current) {
        hasFiredLeadRef.current = true;
        const pt = paymentTypes.find((p) => p.id === formData.paymentTypeId);
        trackEvent('generate_lead', {
          page_path: '/order',
          page_type: 'order_form',
          service_type: formData.methodTransaction, // 'Online' | 'COD' — normalized inside trackEvent
          provider: pt?.name, // payment type name (NOT customer bank / bank holder)
          city: formData.city,
          amount_bucket: amountBucket(nominal), // bucketed — NEVER exact nominal
        });
      }

      setOrderId(data.data.orderId);
      setSuccess(true);

      // Start cooldown timer (30 seconds)
      setSubmitCooldown(30);
      cooldownTimerRef.current = setInterval(() => {
        setSubmitCooldown(prev => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  // Success Screen
  if (success) {
    return <SuccessScreen orderId={orderId} />;
  }

  return (
    <div className="min-h-screen pb-8">
      <AnimatedBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 h-16 sm:h-20">
            <Button 
              variant="ghost" 
              size="icon"
              asChild 
              className="rounded-xl bg-white/50 dark:bg-black/20"
            >
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg sm:text-xl">Order Gestun</h1>
                <span className="text-sm font-bold bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent hidden sm:inline">BlackBear</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {partnerInfo ? `Order via ${partnerInfo.name}` : 'Buat order tarik tunai baru'}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-fuchsia-500/10 border border-primary/20">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Proses Cepat</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-lg mx-auto space-y-4 sm:space-y-5">
          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} steps={steps} />

          {/* Panduan Gestun */}
          <GestunGuide />

          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-3 py-1 animate-fade-in">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-xl bg-green-500/10 flex items-center justify-center mb-1.5">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground">Aman<br/><span className="text-foreground/80">100%</span></p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-1.5">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground">Cepat<br/><span className="text-foreground/80">Real-time</span></p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center mb-1.5">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground">24/7<br/><span className="text-foreground/80">Support</span></p>
            </div>
          </div>

          {/* Partner Referral Banner */}
          {partnerInfo && (
            <Card className="glass-card animate-fade-in overflow-hidden border-primary/20">
              <div className="h-1 bg-gradient-to-r from-cyan-500 via-primary to-violet-500" />
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-base sm:text-lg font-bold text-white">{partnerInfo.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Order via Partner</p>
                    <p className="text-xs text-muted-foreground">
                      Transaksi Anda akan dilayani oleh <span className="text-primary font-medium">{partnerInfo.name}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 h-auto">{partnerInfo.tier}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Partner Warning (inactive/suspended/not found) */}
          {partnerWarning && !partnerInfo && (
            <Alert className="animate-fade-in rounded-xl border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                {partnerWarning}. Order tetap bisa dilanjutkan tanpa atribusi partner.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="animate-fade-in rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          {currentStep === 0 && (
            <StepRecipient 
              formData={formData}
              onChange={handleChange}
              onNext={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 1 && (
            <StepTransaction 
              formData={formData}
              paymentTypes={paymentTypes}
              onChange={handleChange}
              onBack={() => setCurrentStep(0)}
              onNext={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 2 && (
            <StepCalculation 
              formData={formData}
              paymentTypes={paymentTypes}
              calculation={calculation}
              loading={loading}
              partnerInfo={partnerInfo}
              onBack={() => setCurrentStep(1)}
              onSubmit={handleSubmit}
              submitCooldown={submitCooldown}
            />
          )}

          {/* Honeypot field - hidden from real users, bots will fill it */}
          <div
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}
            tabIndex={-1}
            autoComplete="off"
          >
            <label htmlFor="website">Jangan isi field ini</label>
            <input
              type="text"
              id="website"
              name="website"
              value={honeypotValue}
              onChange={(e) => setHoneypotValue(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
