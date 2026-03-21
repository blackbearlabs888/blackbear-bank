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
  Clock
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

export default function OrderPage() {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

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

  // Calculate fee using useMemo
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero px-4 py-8">
        <Card className="w-full max-w-md glass-card mobile-shadow text-center animate-scale-in">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6 animate-bounce-soft">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Order Berhasil!</h2>
            <p className="text-muted-foreground mb-6">
              Order Anda telah dibuat dengan ID:
            </p>
            
            <div className="bg-muted rounded-2xl p-4 mb-6 tap-highlight active-scale" onClick={() => navigator.clipboard.writeText(orderId)}>
              <p className="text-2xl font-mono font-bold text-primary">{orderId}</p>
              <p className="text-xs text-muted-foreground mt-1">Tap untuk menyalin</p>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Simpan Order ID untuk melacak status transaksi Anda
            </p>
            
            <div className="flex flex-col gap-3">
              <Button 
                asChild 
                className="mobile-btn-primary"
              >
                <Link href={`/track?orderId=${orderId}`}>
                  <Clock className="w-4 h-4 mr-2" />
                  Track Order Sekarang
                </Link>
              </Button>
              <Button 
                variant="outline" 
                asChild
                className="mobile-btn-outline"
              >
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

  const selectedPayment = paymentTypes.find((p) => p.id === formData.paymentTypeId);

  return (
    <div className="min-h-screen gradient-hero pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b ios-safe-top">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 h-14 sm:h-16">
            <Button 
              variant="ghost" 
              size="icon"
              asChild 
              className="tap-highlight rounded-xl"
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
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Quick Info */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 animate-fade-in">
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

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Customer Info Card */}
            <Card className="glass-card animate-slide-up">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Data Penerima
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nama Lengkap *</Label>
                    <Input
                      placeholder="Nama lengkap"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                      className="mobile-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">No. WhatsApp *</Label>
                    <Input
                      type="tel"
                      placeholder="08xxxxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      required
                      className="mobile-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Bank</Label>
                    <Select
                      value={formData.bank}
                      onValueChange={(value) => handleChange('bank', value)}
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
                  
                  <div className="space-y-2">
                    <Label className="text-sm">No. Rekening</Label>
                    <Input
                      placeholder="Nomor rekening"
                      value={formData.bankAccount}
                      onChange={(e) => handleChange('bankAccount', e.target.value)}
                      className="mobile-input"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nama Pemilik Rekening</Label>
                    <Input
                      placeholder="Nama di rekening"
                      value={formData.bankHolder}
                      onChange={(e) => handleChange('bankHolder', e.target.value)}
                      className="mobile-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Kota</Label>
                    <Input
                      placeholder="Kota"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="mobile-input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Info Card */}
            <Card className="glass-card animate-slide-up stagger-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Detail Transaksi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Nominal Gestun *</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rp</span>
                    <Input
                      type="number"
                      placeholder="1.000.000"
                      value={formData.nominal}
                      onChange={(e) => handleChange('nominal', e.target.value)}
                      required
                      min={10000}
                      className="mobile-input pl-14 text-lg font-semibold"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Tipe Pembayaran *</Label>
                  <Select
                    value={formData.paymentTypeId}
                    onValueChange={(value) => handleChange('paymentTypeId', value)}
                  >
                    <SelectTrigger className="mobile-input">
                      <SelectValue placeholder="Pilih tipe pembayaran" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{pt.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({pt.onlineFeePercent}% / {pt.codFeePercent}% COD)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPayment && (
                  <div className="p-4 rounded-xl bg-muted/50 space-y-2 animate-fade-in">
                    <p className="text-xs font-medium text-muted-foreground">Info Fee:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-2">Online</Badge>
                        <span className="text-muted-foreground">{selectedPayment.onlineFeePercent}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-2">COD</Badge>
                        <span className="text-muted-foreground">{selectedPayment.codFeePercent}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Threshold: {formatCurrency(selectedPayment.threshold)}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm">Metode Transaksi *</Label>
                  <RadioGroup
                    value={formData.methodTransaction}
                    onValueChange={(value) => handleChange('methodTransaction', value)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div>
                      <RadioGroupItem value="Online" id="online" className="peer sr-only" />
                      <Label
                        htmlFor="online"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-accent cursor-pointer transition-smooth tap-highlight peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      >
                        <CreditCard className="w-6 h-6 mb-2 text-muted-foreground peer-data-[state=checked]:text-primary" />
                        <span className="font-medium text-sm">Online</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="COD" id="cod" className="peer sr-only" />
                      <Label
                        htmlFor="cod"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-accent cursor-pointer transition-smooth tap-highlight peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      >
                        <Truck className="w-6 h-6 mb-2 text-muted-foreground peer-data-[state=checked]:text-primary" />
                        <span className="font-medium text-sm">COD</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Calculation Card */}
            {calculation.paymentFee > 0 && (
              <Card className="glass-card border-primary/30 bg-primary/5 animate-scale-in">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold">Kalkulasi</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Nominal</span>
                      <span className="font-medium">{formatCurrency(parseFloat(formData.nominal) || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Biaya Layanan</span>
                      <span className="font-medium text-destructive">- {formatCurrency(calculation.paymentFee)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-semibold">Total Diterima</span>
                      <span className="text-xl font-bold text-primary">{formatCurrency(calculation.totalReceived)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button - Fixed on mobile */}
            <div className="sticky bottom-20 sm:static sm:bottom-auto pt-4">
              <Button
                type="submit"
                className="w-full mobile-btn-primary shadow-xl"
                disabled={loading || !formData.paymentTypeId}
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
          </form>

          <p className="text-xs text-center text-muted-foreground">
            *Biaya ongkir marketplace & layanan tambahan tidak termasuk
          </p>
        </div>
      </div>
    </div>
  );
}
