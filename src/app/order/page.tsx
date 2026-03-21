'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  Info,
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/hooks/use-site-config';

interface PaymentType {
  id: string;
  name: string;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
}

const banks = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon', 
  'Panin', 'OCBC NISP', 'Jenius', 'Seabank', 'Bank Jago', 'Lainnya'
];

// Step Indicator Component
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-2">
          <div 
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm transition-all",
              currentStep > index 
                ? "bg-green-500 text-white" 
                : currentStep === index 
                  ? "gradient-primary text-white" 
                  : "bg-muted text-muted-foreground"
            )}
          >
            {currentStep > index ? (
              <Check className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          <span className={cn(
            "text-xs sm:text-sm font-medium hidden sm:block",
            currentStep === index ? "text-primary" : "text-muted-foreground"
          )}>
            {step}
          </span>
          {index < steps.length - 1 && (
            <div className={cn(
              "w-6 sm:w-12 h-0.5 rounded-full",
              currentStep > index ? "bg-green-500" : "bg-muted"
            )} />
          )}
        </div>
      ))}
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

  return (
    <Card className="glass-card animate-slide-up overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Data Penerima
        </CardTitle>
        <CardDescription className="text-xs">
          Informasi untuk mengirim dana
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Nama Lengkap *</Label>
            <Input
              placeholder="Nama lengkap"
              value={formData.name}
              onChange={(e) => onChange('name', e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">No. WhatsApp *</Label>
            <Input
              type="tel"
              placeholder="08xxxxxxxxxx"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Bank</Label>
            <Select
              value={formData.bank}
              onValueChange={(value) => onChange('bank', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Pilih bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank) => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">No. Rekening</Label>
            <Input
              placeholder="Nomor rekening"
              value={formData.bankAccount}
              onChange={(e) => onChange('bankAccount', e.target.value)}
              className="h-11"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Nama di Rekening</Label>
            <Input
              placeholder="Nama pemilik rekening"
              value={formData.bankHolder}
              onChange={(e) => onChange('bankHolder', e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Kota</Label>
            <Input
              placeholder="Kota domisili"
              value={formData.city}
              onChange={(e) => onChange('city', e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="w-full gradient-primary text-white h-12"
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

  return (
    <Card className="glass-card animate-slide-up overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-fuchsia-500 to-pink-500" />
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Detail Transaksi
        </CardTitle>
        <CardDescription className="text-xs">
          Pilih nominal dan metode pembayaran
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nominal */}
        <div className="space-y-2">
          <Label className="text-sm">Nominal Gestun *</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Rp</span>
            <Input
              type="number"
              placeholder="1.000.000"
              value={formData.nominal}
              onChange={(e) => onChange('nominal', e.target.value)}
              min={10000}
              className="h-14 pl-14 text-lg font-semibold"
              inputMode="numeric"
            />
          </div>
          <p className="text-xs text-muted-foreground">Minimal Rp 10.000</p>
        </div>

        {/* Payment Type */}
        <div className="space-y-2">
          <Label className="text-sm">Tipe Pembayaran *</Label>
          <Select
            value={formData.paymentTypeId}
            onValueChange={(value) => onChange('paymentTypeId', value)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Pilih tipe pembayaran" />
            </SelectTrigger>
            <SelectContent>
              {paymentTypes.map((pt) => (
                <SelectItem key={pt.id} value={pt.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{pt.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pt.onlineFeePercent}% / {pt.codFeePercent}% COD)
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Type Info */}
        {selectedPayment && (
          <div className="p-3 rounded-xl bg-muted/50 border animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-background/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs">Online</span>
                </div>
                <span className="text-sm font-semibold">{selectedPayment.onlineFeePercent}%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-background/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs">COD</span>
                </div>
                <span className="text-sm font-semibold">{selectedPayment.codFeePercent}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Threshold: {formatCurrency(selectedPayment.threshold)}
            </p>
          </div>
        )}

        {/* Method */}
        <div className="space-y-2">
          <Label className="text-sm">Metode Transaksi *</Label>
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
                  "flex flex-col items-center justify-center rounded-xl border-2 p-4 cursor-pointer transition-all",
                  formData.methodTransaction === 'Online'
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <CreditCard className={cn(
                  "w-6 h-6 mb-2",
                  formData.methodTransaction === 'Online' ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="font-medium text-sm">Online</span>
                <span className="text-xs text-muted-foreground">Via link</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="COD" id="cod" className="peer sr-only" />
              <Label
                htmlFor="cod"
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 p-4 cursor-pointer transition-all",
                  formData.methodTransaction === 'COD'
                    ? "border-amber-500 bg-amber-500/5"
                    : "border-muted hover:border-amber-500/50"
                )}
              >
                <Truck className={cn(
                  "w-6 h-6 mb-2",
                  formData.methodTransaction === 'COD' ? "text-amber-500" : "text-muted-foreground"
                )} />
                <span className="font-medium text-sm">COD</span>
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
            className="flex-1 h-12"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <Button
            type="button"
            onClick={onNext}
            disabled={!isValid}
            className="flex-1 gradient-primary text-white h-12"
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
  onBack,
  onSubmit 
}: { 
  formData: Record<string, string>;
  paymentTypes: PaymentType[];
  calculation: { paymentFee: number; totalReceived: number };
  loading: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const paymentType = paymentTypes.find((p) => p.id === formData.paymentTypeId);
  const nominal = parseFloat(formData.nominal) || 0;
  const feePercent = formData.methodTransaction === 'Online' 
    ? paymentType?.onlineFeePercent 
    : paymentType?.codFeePercent;

  return (
    <div className="space-y-4">
      {/* Calculation Card */}
      <Card className="glass-card animate-slide-up overflow-hidden border-primary/30">
        <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500" />
        <CardContent className="pt-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">Kalkulasi</p>
              <p className="text-xs text-muted-foreground">Estimasi dana yang akan diterima</p>
            </div>
            {feePercent !== undefined && (
              <Badge variant="outline" className="ml-auto">
                Fee: {feePercent}%
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Nominal</span>
              <span className="font-semibold text-lg">{formatCurrency(nominal)}</span>
            </div>
            <div className="flex justify-between py-2 bg-red-500/5 -mx-3 px-3 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-muted-foreground">Biaya Layanan</span>
              </div>
              <span className="font-semibold text-red-500">- {formatCurrency(calculation.paymentFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between py-3 bg-gradient-to-r from-primary/10 to-fuchsia-500/10 -mx-3 px-3 rounded-xl">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="font-semibold">Total Diterima</span>
              </div>
              <span className="text-2xl font-bold text-primary">{formatCurrency(calculation.totalReceived)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="glass-card">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">Ringkasan Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>{formData.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{formData.city || '-'}</span>
          </div>
          {formData.bank && (
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span>{formData.bank} - {formData.bankAccount} a.n {formData.bankHolder}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <WalletCards className="w-4 h-4 text-muted-foreground" />
            <span>{paymentType?.name} ({formData.methodTransaction})</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 gradient-primary text-white h-12"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Memproses...
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
  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero px-4 py-8">
      <Card className="w-full max-w-md glass-card text-center animate-scale-in overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
        <CardContent className="pt-8 pb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Order Berhasil!</h2>
          <p className="text-muted-foreground mb-6">Simpan Order ID Anda:</p>
          
          <div 
            className="bg-muted rounded-2xl p-4 mb-6 cursor-pointer tap-highlight active-scale hover:bg-muted/80 transition-colors"
            onClick={() => navigator.clipboard.writeText(orderId)}
          >
            <p className="text-2xl font-mono font-bold text-primary">{orderId}</p>
            <p className="text-xs text-muted-foreground mt-1">Tap untuk menyalin</p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button asChild className="gradient-primary text-white h-12">
              <Link href={`/track?orderId=${orderId}`}>
                <Clock className="w-4 h-4 mr-2" />
                Track Order Sekarang
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-12">
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

export default function OrderPage() {
  const { config } = useSiteConfig();
  const [currentStep, setCurrentStep] = useState(0);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const steps = ['Data Penerima', 'Detail Transaksi', 'Kalkulasi'];

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bank: '',
    bankAccount: '',
    bankHolder: '',
    nominal: '',
    paymentTypeId: '',
    methodTransaction: 'Online' as 'Online' | 'COD',
    city: '',
  });

  // Fetch payment types
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
  }, []);

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

      const fee = nominal >= paymentType.threshold 
        ? nominal * (feePercent / 100) 
        : feeFlat;

      return {
        paymentFee: fee,
        totalReceived: nominal - fee,
      };
    }
    return { paymentFee: 0, totalReceived: 0 };
  }, [formData.nominal, formData.paymentTypeId, formData.methodTransaction, paymentTypes]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          nominal: parseFloat(formData.nominal),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Gagal membuat order');
        setLoading(false);
        return;
      }

      setOrderId(data.data.orderId);
      setSuccess(true);
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  // Success Screen
  if (success) {
    return <SuccessScreen orderId={orderId} />;
  }

  const siteName = config.websiteTitle || 'Black Bear';

  return (
    <div className="min-h-screen gradient-hero pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 h-14 sm:h-16">
            <Button 
              variant="ghost" 
              size="icon"
              asChild 
              className="rounded-xl"
            >
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold text-base sm:text-lg">Order Gestun</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Buat order tarik tunai baru</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} steps={steps} />

          {/* Quick Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-fuchsia-500/5 border border-primary/20 animate-fade-in">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-sm">Proses Cepat & Aman</p>
              <p className="text-xs text-muted-foreground">Dana dikirim langsung ke rekening Anda</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="animate-fade-in">
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
              onBack={() => setCurrentStep(1)}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
