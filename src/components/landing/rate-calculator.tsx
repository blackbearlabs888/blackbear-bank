'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, ArrowRight, Wallet, Info, RotateCcw, CreditCard, Sparkles } from 'lucide-react';
import { FadeInSection } from '@/components/landing/fade-in-section';
import Link from 'next/link';
// Shared fee calculation source — the SAME function used by owner/partner
// transaction create, public order create, PATCH, preview, and Telegram
// /nominal. Browser-safe (fee.ts imports toNumber from '@/lib/number-utils',
// which has no @prisma/client dependency). No 6th formula in this component.
import { calculateTransaction } from '@/lib/transaction/fee';
// GA4 direct conversion tracking — browser-only, consent-gated, PII-stripped.
import { trackEvent } from '@/lib/analytics/track';
import { amountBucket } from '@/lib/analytics/buckets';

interface PaymentTypeOption {
  id: string;
  name: string;
  logoUrl?: string | null;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  discountPercent: number;
  discountNominal: number;
  minTransaction: number;
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

  const useDropdown = paymentTypes.length > 3;

  const hasDiscount = (pt: PaymentTypeOption) =>
    pt.discountPercent > 0 || pt.discountNominal > 0;

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
    // GA4 conversion: fire use_calculator after the user explicitly clicks
    // "Hitung Estimasi" (NOT on input change — input changes set
    // isCalculated=false above). The calculator computes BOTH Online and
    // COD for the same nominal + payment type, so service_type is omitted
    // (the event represents a single calculator use, not a single method).
    // amount_bucket is bucketed (privacy-safe) — never the exact nominal.
    if (effectiveSelectedType && amount) {
      const nominal = Number(amount.replace(/\D/g, ''));
      trackEvent('use_calculator', {
        page_path: '/',
        page_type: 'landing',
        provider: effectiveSelectedType.name,
        amount_bucket: amountBucket(nominal),
      });
    }
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
    const pt = effectiveSelectedType;

    // Use the shared fee calculation source (src/lib/transaction/fee.ts).
    // This is the SAME function used by owner/partner transaction create,
    // public order create, PATCH, preview, and Telegram /nominal. No 6th
    // formula. Business contract enforced by calculateGrossPaymentFee
    // inside fee.ts:
    //   nominal <  threshold -> flat fee ONLY
    //   nominal >= threshold -> percentage fee ONLY
    // (Never percentage + flat.)
    const onlineCalc = calculateTransaction({
      nominal,
      paymentType: pt,
      marketplace: null,
      partner: null,
      methodTransaction: 'Online',
    });
    const codCalc = calculateTransaction({
      nominal,
      paymentType: pt,
      marketplace: null,
      partner: null,
      methodTransaction: 'COD',
    });

    // Discount label — reflects the CONFIGURED discount, matching
    // calculateTransaction priority: percent takes precedence over nominal.
    // (calculateTransaction applies EITHER percent OR nominal, never both.)
    let discountLabel = '';
    if (pt.discountPercent > 0) {
      discountLabel = `${pt.discountPercent}%`;
    } else if (pt.discountNominal > 0) {
      discountLabel = `Rp${formatCurrency(pt.discountNominal)}`;
    }

    // meetsMinTransaction drives the "tambah nominal untuk hemat" hint.
    // Uses pt.minTransaction (active config) — NOT a hardcoded threshold.
    const meetsMinTransaction = pt.minTransaction <= 0 || nominal >= pt.minTransaction;

    return {
      nominal,
      // Gross fee (before discount) — strikethrough when discount applies.
      onlineFee: onlineCalc.originalFee,
      codFee: codCalc.originalFee,
      // Gross receive (before discount) — strikethrough when discount applies.
      onlineReceive: nominal - onlineCalc.originalFee,
      codReceive: nominal - codCalc.originalFee,
      meetsMinTransaction,
      hasDiscount: hasDiscount(pt),
      discountLabel,
      // Discount amounts from the shared calculator.
      onlineDiscountAmount: onlineCalc.discountAmount,
      codDiscountAmount: codCalc.discountAmount,
      // Net fee (after discount) — what the customer actually pays.
      onlineDiscountedFee: onlineCalc.paymentFee,
      codDiscountedFee: codCalc.paymentFee,
      // Net receive (after discount) — what the customer actually receives.
      // totalReceived = nominal - paymentFee (guaranteed by calculateTransaction).
      onlineDiscountedReceive: onlineCalc.totalReceived,
      codDiscountedReceive: codCalc.totalReceived,
      minTransaction: pt.minTransaction,
    };
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

                  {useDropdown ? (
                    /* Dropdown for >3 payment types */
                    <Select
                      value={effectiveSelectedType?.id ?? ''}
                      onValueChange={(val) => {
                        const pt = paymentTypes.find((p) => p.id === val) ?? null;
                        setSelectedType(pt);
                        setIsCalculated(false);
                        setShowResults(false);
                      }}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl border-2 border-border/60 bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder="Pilih jenis pembayaran..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 overflow-y-auto">
                        {paymentTypes.map((pt) => {
                          const isSelected = effectiveSelectedType?.id === pt.id;
                          const discount = hasDiscount(pt);
                          return (
                            <SelectItem
                              key={pt.id}
                              value={pt.id}
                              className={`py-2.5 cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                  {pt.logoUrl ? (
                                    <img
                                      src={pt.logoUrl}
                                      alt={pt.name}
                                      width={16}
                                      height={16}
                                      loading="lazy"
                                      className="w-4 h-4 object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <CreditCard className={`w-3.5 h-3.5 text-muted-foreground ${pt.logoUrl ? 'hidden' : ''}`} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium truncate">{pt.name}</span>
                                    {discount && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold whitespace-nowrap">
                                        <Sparkles className="w-2.5 h-2.5" />
                                        Diskon
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground leading-tight">
                                    Online {pt.onlineFeePercent}% · minimum fee Rp{formatCurrency(pt.onlineFeeFlat)} · COD {pt.codFeePercent}% · minimum fee Rp{formatCurrency(pt.codFeeFlat)}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    /* Button style for ≤3 payment types */
                    <div className="flex flex-wrap gap-2">
                      {paymentTypes.map((pt) => {
                        const isSelected = selectedType?.id === pt.id;
                        const discount = hasDiscount(pt);
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
                            <span className="relative flex items-center gap-1.5">
                              {pt.name}
                              {discount && (
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  <Sparkles className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
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

                    {/* Discount recommendation when min not met */}
                    {results.hasDiscount && !results.meetsMinTransaction && (
                      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                        <span className="text-base leading-none mt-0.5">💡</span>
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                          Tambah nominal ke{' '}
                          <span className="font-bold">Rp{formatCurrency(results.minTransaction)}</span>{' '}
                          untuk hemat{' '}
                          <span className="font-bold">
                            Rp{formatCurrency(Math.max(results.onlineDiscountAmount, results.codDiscountAmount))}
                          </span>{' '}
                          lebih banyak!
                        </p>
                      </div>
                    )}

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
                            {results.hasDiscount && results.meetsMinTransaction ? (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-muted-foreground line-through text-xs">
                                  Rp{formatCurrency(results.onlineFee)}
                                </span>
                                <span className="font-semibold text-destructive">
                                  -Rp{formatCurrency(results.onlineDiscountedFee)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-semibold text-destructive">-Rp{formatCurrency(results.onlineFee)}</span>
                            )}
                          </div>

                          {/* Discount row for online */}
                          {results.hasDiscount && results.meetsMinTransaction && results.onlineDiscountAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                Diskon {results.discountLabel}
                              </span>
                              <span className="font-semibold text-emerald-500">
                                +Rp{formatCurrency(results.onlineDiscountAmount)}
                              </span>
                            </div>
                          )}

                          <div className="h-px bg-border/50" />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Dana Diterima</span>
                            <span className="font-bold text-emerald-500">
                              {results.hasDiscount && results.meetsMinTransaction && results.onlineDiscountAmount > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground line-through">
                                    Rp{formatCurrency(results.onlineReceive)}
                                  </span>
                                  Rp{formatCurrency(results.onlineDiscountedReceive)}
                                </div>
                              ) : (
                                `Rp${formatCurrency(results.onlineReceive)}`
                              )}
                            </span>
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
                            {results.hasDiscount && results.meetsMinTransaction ? (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-muted-foreground line-through text-xs">
                                  Rp{formatCurrency(results.codFee)}
                                </span>
                                <span className="font-semibold text-destructive">
                                  -Rp{formatCurrency(results.codDiscountedFee)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-semibold text-destructive">-Rp{formatCurrency(results.codFee)}</span>
                            )}
                          </div>

                          {/* Discount row for COD */}
                          {results.hasDiscount && results.meetsMinTransaction && results.codDiscountAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                Diskon {results.discountLabel}
                              </span>
                              <span className="font-semibold text-emerald-500">
                                +Rp{formatCurrency(results.codDiscountAmount)}
                              </span>
                            </div>
                          )}

                          <div className="h-px bg-border/50" />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Dana Diterima</span>
                            <span className="font-bold text-emerald-500">
                              {results.hasDiscount && results.meetsMinTransaction && results.codDiscountAmount > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground line-through">
                                    Rp{formatCurrency(results.codReceive)}
                                  </span>
                                  Rp{formatCurrency(results.codDiscountedReceive)}
                                </div>
                              ) : (
                                `Rp${formatCurrency(results.codReceive)}`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Discount savings summary */}
                    {results.hasDiscount && results.meetsMinTransaction && (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                        <span className="text-base leading-none mt-0.5">⭐</span>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
                          Hemat lebih banyak dengan diskon! Anda menghemat hingga{' '}
                          <span className="font-bold">
                            Rp{formatCurrency(Math.max(results.onlineDiscountAmount, results.codDiscountAmount))}
                          </span>{' '}
                          dari biaya fee.
                        </p>
                      </div>
                    )}

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
