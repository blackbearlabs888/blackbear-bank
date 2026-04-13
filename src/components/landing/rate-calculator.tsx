'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, ArrowRight, Wallet, Info, RotateCcw } from 'lucide-react';
import { FadeInSection } from '@/components/landing/fade-in-section';
import Link from 'next/link';

interface PaymentTypeOption {
  id: string;
  name: string;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
}

interface RateCalculatorProps {
  paymentTypes: PaymentTypeOption[];
}

export default function RateCalculator({ paymentTypes }: RateCalculatorProps) {
  const [selectedType, setSelectedType] = useState<PaymentTypeOption | null>(null);
  const effectiveSelectedType = selectedType ?? (paymentTypes.length > 0 ? paymentTypes[0] : null);
  const [amount, setAmount] = useState<string>('1000000');
  const [isCalculated, setIsCalculated] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const parseAmount = (val: string) => {
    const num = val.replace(/\D/g, '');
    return num ? parseInt(num, 10) : 0;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID').format(val);
  };

  const handleAmountChange = (val: string) => {
    const formatted = val.replace(/\D/g, '');
    setAmount(formatted);
    setIsCalculated(false);
    setShowResults(false);
  };

  const calculate = () => {
    setIsCalculated(true);
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      setShowResults(true);
    });
  };

  const reset = useCallback(() => {
    setSelectedType(null);
    setAmount('1000000');
    setIsCalculated(false);
    setShowResults(false);
  }, []);

  const getResults = () => {
    if (!effectiveSelectedType || !amount) return null;

    const nominal = parseAmount(amount);
    const onlineFee = Math.max(
      Math.floor(nominal * (effectiveSelectedType.onlineFeePercent / 100)) + effectiveSelectedType.onlineFeeFlat,
      0
    );
    const codFee = Math.max(
      Math.floor(nominal * (effectiveSelectedType.codFeePercent / 100)) + effectiveSelectedType.codFeeFlat,
      0
    );
    const onlineReceive = nominal - onlineFee;
    const codReceive = nominal - codFee;

    return { nominal, onlineFee, codFee, onlineReceive, codReceive };
  };

  const results = getResults();

  return (
    <section className="relative py-12 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          {/* Section Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5 text-primary text-sm font-medium mb-4">
              <Calculator className="w-3.5 h-3.5" />
              <span>Simulasi</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Kalkulator{' '}
              <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                Rate Gestun
              </span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Hitung estimasi biaya dan dana yang Anda terima secara realtime.
            </p>
          </div>

          {/* Calculator Card */}
          <div className="max-w-2xl mx-auto relative">
            {/* Subtle glow behind card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/8 via-fuchsia-500/6 to-purple-500/8 rounded-3xl blur-2xl pointer-events-none" />
            <Card className="relative border-border/50 overflow-hidden">
              {/* Shimmer gradient top border */}
              <div className="h-[3px] w-full overflow-hidden">
                <div className="shimmer-gradient-bar h-full w-full" />
              </div>
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Payment Type Selector */}
                <div className="space-y-2.5">
                  <label className="text-sm font-semibold text-foreground">
                    Pilih Jenis Pembayaran
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {paymentTypes.map((pt) => {
                      const isSelected = selectedType?.id === pt.id;
                      return (
                        <button
                          key={pt.id}
                          onClick={() => {
                            setSelectedType(pt);
                            setIsCalculated(false);
                            setShowResults(false);
                          }}
                          className={`relative px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                            isSelected
                              ? 'gradient-primary text-white border-transparent shadow-md'
                              : 'border-border/60 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
                          }`}
                        >
                          {/* Glow effect for selected button */}
                          {isSelected && (
                            <span className="absolute inset-0 rounded-xl shadow-[0_0_12px_2px_var(--color-primary)/30] pointer-events-none" />
                          )}
                          <span className="relative">{pt.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2.5">
                  <label className="text-sm font-semibold text-foreground">
                    Nominal Transaksi
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount ? formatCurrency(parseAmount(amount)) : ''}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="Masukkan nominal..."
                      className="w-full h-13 pl-12 pr-4 text-lg font-semibold rounded-xl border-2 border-border/60 bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[500000, 1000000, 2000000, 5000000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setAmount(String(preset));
                          setIsCalculated(false);
                          setShowResults(false);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-primary transition-all"
                      >
                        {preset >= 1000000 ? `${preset / 1000000}jt` : `${preset / 1000}rb`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculate + Reset Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={calculate}
                    className="flex-1 gradient-primary text-white rounded-xl h-12 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Calculator className="w-4 h-4" />
                    Hitung Estimasi
                  </Button>
                  <Button
                    onClick={reset}
                    variant="outline"
                    className="rounded-xl h-12 px-4 text-sm font-medium border-border/60 hover:bg-accent transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                    aria-label="Reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Results */}
                {isCalculated && results && (
                  <div className={`space-y-3 ${showResults ? 'animate-result-reveal' : 'opacity-0'}`}>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
                      <Info className="w-4 h-4 text-primary flex-shrink-0" />
                      <p className="text-xs text-primary/80 font-medium">
                        Estimasi berdasarkan rate {effectiveSelectedType?.name}
                      </p>
                    </div>

                    {/* Mobile: stack vertically, Desktop: side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Online */}
                      <div className="space-y-3 rounded-xl border border-border/50 bg-background p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calculator className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Online</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Biaya Fee</span>
                            <span className="font-semibold text-destructive">-{formatCurrency(results.onlineFee)}</span>
                          </div>
                          <div className="h-px bg-border/50" />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Dana Diterima</span>
                            <span className="font-bold text-emerald-500">{formatCurrency(results.onlineReceive)}</span>
                          </div>
                        </div>
                      </div>

                      {/* COD */}
                      <div className="space-y-3 rounded-xl border border-border/50 bg-background p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-fuchsia-500" />
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">COD</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Biaya Fee</span>
                            <span className="font-semibold text-destructive">-{formatCurrency(results.codFee)}</span>
                          </div>
                          <div className="h-px bg-border/50" />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Dana Diterima</span>
                            <span className="font-bold text-emerald-500">{formatCurrency(results.codReceive)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <Button
                      asChild
                      className="w-full gradient-primary text-white rounded-xl h-12 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Link href="/order">
                        <Wallet className="w-4 h-4" />
                        Order Sekarang
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
