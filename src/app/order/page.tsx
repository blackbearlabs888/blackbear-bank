'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, 
  User, 
  Phone, 
  Building2, 
  Wallet, 
  Calculator,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Hash,
  MapPin,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { NavbarDesktop } from '@/components/layout/navbar-desktop'
import { MobileBottomBar } from '@/components/layout/mobile-bottom-bar'
import { Footer } from '@/components/layout/footer'
import { formatCurrency, validateWhatsApp } from '@/lib/calculations'
import type { PaymentType, TransactionMethod } from '@/types'
import { cn } from '@/lib/utils'

interface PaymentTypeResponse {
  id: string
  name: string
  type: string
  threshold: number
  onlineFeePercent: number
  onlineFeeFixed: number
  codFeePercent: number
  codFeeFixed: number
}

export default function OrderPage() {
  const router = useRouter()
  
  // Form state
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [bank, setBank] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [nominal, setNominal] = useState('')
  const [paymentTypeId, setPaymentTypeId] = useState('')
  const [method, setMethod] = useState<TransactionMethod>('ONLINE')
  const [city, setCity] = useState('')
  
  // UI state
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPaymentTypes, setLoadingPaymentTypes] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ orderId: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showBankSection, setShowBankSection] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    customer: true,
    bank: false,
    transaction: true
  })
  
  // Fetch payment types
  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const response = await fetch('/api/payment-types')
        const data = await response.json()
        if (data.success) {
          setPaymentTypes(data.data)
        }
      } catch (err) {
        console.error('Error fetching payment types:', err)
      } finally {
        setLoadingPaymentTypes(false)
      }
    }
    
    fetchPaymentTypes()
  }, [])
  
  // Get selected payment type
  const selectedPaymentType = paymentTypes.find(pt => pt.id === paymentTypeId)
  
  // Calculate fees
  const calculateFees = useCallback(() => {
    const nominalValue = parseFloat(nominal) || 0
    if (!selectedPaymentType || nominalValue <= 0) {
      return { totalBiayaLayanan: 0, totalDiterimaCustomer: 0 }
    }
    
    const threshold = selectedPaymentType.threshold
    let totalBiayaLayanan = 0
    
    if (method === 'ONLINE') {
      if (nominalValue >= threshold) {
        totalBiayaLayanan = nominalValue * selectedPaymentType.onlineFeePercent
      } else {
        totalBiayaLayanan = selectedPaymentType.onlineFeeFixed
      }
    } else {
      // COD
      if (nominalValue >= threshold) {
        totalBiayaLayanan = nominalValue * selectedPaymentType.codFeePercent
      } else {
        totalBiayaLayanan = selectedPaymentType.codFeeFixed
      }
    }
    
    const totalDiterimaCustomer = nominalValue - totalBiayaLayanan
    
    return { totalBiayaLayanan, totalDiterimaCustomer }
  }, [nominal, selectedPaymentType, method])
  
  const { totalBiayaLayanan, totalDiterimaCustomer } = calculateFees()
  
  // Form validation
  const isFormValid = () => {
    if (!name.trim()) return false
    if (!validateWhatsApp(whatsapp)) return false
    if (!nominal || parseFloat(nominal) <= 0) return false
    if (!paymentTypeId) return false
    
    // If bank is filled, account number and holder are required
    if (bank.trim()) {
      if (!accountNumber.trim() || !accountHolder.trim()) return false
    }
    
    return true
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!isFormValid()) {
      setError('Mohon lengkapi semua field yang diperlukan')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          bank: bank.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          accountHolder: accountHolder.trim() || undefined,
          nominal: parseFloat(nominal),
          paymentTypeId,
          method,
          city: city.trim() || undefined
        })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        setError(data.error || 'Terjadi kesalahan saat membuat order')
        return
      }
      
      setSuccess({ orderId: data.data.orderId })
    } catch (err) {
      console.error('Error creating order:', err)
      setError('Terjadi kesalahan saat membuat order')
    } finally {
      setLoading(false)
    }
  }
  
  // Copy order ID
  const copyOrderId = () => {
    navigator.clipboard.writeText(success?.orderId || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // Success State
  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavbarDesktop currentPage="order" />
        
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="w-full max-w-md"
          >
            <Card className="overflow-hidden border-0 shadow-xl">
              {/* Success Header */}
              <div className="gradient-primary p-8 text-center text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold mb-2"
                >
                  Order Berhasil!
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-white/80 text-sm"
                >
                  Transaksi Anda sedang diproses
                </motion.p>
              </div>
              
              <CardContent className="pt-6 pb-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-sm text-muted-foreground mb-3">
                    Order ID Anda:
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-3">
                      <span className="text-xl font-mono font-bold text-primary">
                        {success.orderId}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={copyOrderId}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => router.push(`/track?orderId=${success.orderId}`)}
                      className="gradient-primary text-white w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Lihat Status Order
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSuccess(null)
                        setName('')
                        setWhatsapp('')
                        setBank('')
                        setAccountNumber('')
                        setAccountHolder('')
                        setNominal('')
                        setPaymentTypeId('')
                        setCity('')
                      }}
                      className="w-full"
                    >
                      Buat Order Baru
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                    <Info className="h-3 w-3" />
                    Simpan Order ID untuk melacak status transaksi
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        
        <Footer />
        <MobileBottomBar />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <NavbarDesktop currentPage="order" />
      
      <main className="flex-1 pb-28 md:pb-0">
        <div className="container px-4 py-6 md:py-8 mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-6 md:mb-8"
          >
            <Badge variant="secondary" className="mb-3 gradient-primary text-white border-0">
              <CreditCard className="h-3 w-3 mr-1" />
              New Order
            </Badge>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Order Gestun</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Isi form di bawah untuk membuat order baru
            </p>
          </motion.div>
          
          <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-6">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="lg:col-span-3 space-y-4"
            >
              {/* Customer Info Section */}
              <Card className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSections(prev => ({ ...prev, customer: !prev.customer }))}
                  className="w-full"
                >
                  <CardHeader className="bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        Informasi Customer
                        <span className="text-xs text-destructive font-normal">*</span>
                      </CardTitle>
                      {expandedSections.customer ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </button>
                <AnimatePresence>
                  {expandedSections.customer && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-4 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-1">
                              Nama <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="name"
                                placeholder="Nama lengkap"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="whatsapp" className="flex items-center gap-1">
                              No WhatsApp <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="whatsapp"
                                placeholder="08xxxxxxxxxx"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                className={cn("pl-10", whatsapp && !validateWhatsApp(whatsapp) && "border-destructive")}
                              />
                            </div>
                            {whatsapp && !validateWhatsApp(whatsapp) && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Format tidak valid
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Kota</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="city"
                              placeholder="Jakarta, Bandung, dll"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
              
              {/* Bank Info Section */}
              <Card className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSections(prev => ({ ...prev, bank: !prev.bank }))}
                  className="w-full"
                >
                  <CardHeader className="bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        Rekening Bank
                        <Badge variant="outline" className="text-xs font-normal">Opsional</Badge>
                      </CardTitle>
                      {expandedSections.bank ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </button>
                <AnimatePresence>
                  {expandedSections.bank && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-4 space-y-4">
                        <Alert className="bg-primary/5 border-primary/20">
                          <Info className="h-4 w-4 text-primary" />
                          <AlertDescription className="text-xs">
                            Isi rekening bank untuk mempermudah proses pencairan dana
                          </AlertDescription>
                        </Alert>
                        <div className="grid sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bank">Bank</Label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="bank"
                                placeholder="BCA, Mandiri, dll"
                                value={bank}
                                onChange={(e) => setBank(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accountNumber">
                              No Rekening {bank && <span className="text-destructive">*</span>}
                            </Label>
                            <div className="relative">
                              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="accountNumber"
                                placeholder="1234567890"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accountHolder">
                              Pemilik Rekening {bank && <span className="text-destructive">*</span>}
                            </Label>
                            <Input
                              id="accountHolder"
                              placeholder="Nama di rekening"
                              value={accountHolder}
                              onChange={(e) => setAccountHolder(e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
              
              {/* Transaction Info Section */}
              <Card className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSections(prev => ({ ...prev, transaction: !prev.transaction }))}
                  className="w-full"
                >
                  <CardHeader className="bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-4 w-4 text-primary" />
                        </div>
                        Detail Transaksi
                        <span className="text-xs text-destructive font-normal">*</span>
                      </CardTitle>
                      {expandedSections.transaction ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </button>
                <AnimatePresence>
                  {expandedSections.transaction && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-4 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="nominal" className="flex items-center gap-1">
                              Nominal Gestun <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                              <Input
                                id="nominal"
                                type="number"
                                placeholder="1.000.000"
                                value={nominal}
                                onChange={(e) => setNominal(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            {nominal && parseFloat(nominal) > 0 && (
                              <p className="text-xs text-muted-foreground">
                                = {formatCurrency(parseFloat(nominal))}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="paymentType" className="flex items-center gap-1">
                              Payment Type <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={paymentTypeId}
                              onValueChange={setPaymentTypeId}
                              disabled={loadingPaymentTypes}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={loadingPaymentTypes ? "Loading..." : "Pilih payment type"} />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentTypes.map((pt) => (
                                  <SelectItem key={pt.id} value={pt.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{pt.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {pt.type}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <Label className="flex items-center gap-1">
                            Method <span className="text-destructive">*</span>
                          </Label>
                          <RadioGroup
                            value={method}
                            onValueChange={(value) => setMethod(value as TransactionMethod)}
                            className="grid grid-cols-2 gap-3"
                          >
                            <div
                              className={cn(
                                "flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                                method === 'ONLINE'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-input hover:border-primary/50'
                              )}
                              onClick={() => setMethod('ONLINE')}
                            >
                              <RadioGroupItem value="ONLINE" id="online" />
                              <Label htmlFor="online" className="cursor-pointer font-medium">
                                Online
                              </Label>
                            </div>
                            <div
                              className={cn(
                                "flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                                method === 'COD'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-input hover:border-primary/50'
                              )}
                              onClick={() => setMethod('COD')}
                            >
                              <RadioGroupItem value="COD" id="cod" />
                              <Label htmlFor="cod" className="cursor-pointer font-medium">
                                COD
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {error && (
                  <div className="px-6 pb-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {/* Submit Button - Desktop */}
                <div className="hidden lg:block p-6 pt-0">
                  <Separator className="mb-4" />
                  <Button
                    type="submit"
                    form="order-form"
                    className="w-full gradient-primary text-white h-12 text-base"
                    disabled={loading || !isFormValid()}
                    onClick={handleSubmit}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Buat Order
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
            
            {/* Calculation Preview - Desktop */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="hidden lg:block lg:col-span-2"
            >
              <Card className="sticky top-20 overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calculator className="h-4 w-4 text-primary" />
                    </div>
                    Kalkulasi
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Nominal */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Nominal Gestun</span>
                    <span className="font-medium">{formatCurrency(parseFloat(nominal) || 0)}</span>
                  </div>
                  
                  {/* Payment Type Info */}
                  {selectedPaymentType && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Payment Type</span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedPaymentType.name}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-medium">{method}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Threshold</span>
                        <span className="font-medium">{formatCurrency(selectedPaymentType.threshold)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Fee Rate</span>
                        <span className="font-medium">
                          {method === 'ONLINE' 
                            ? `${(selectedPaymentType.onlineFeePercent * 100).toFixed(0)}% / ${formatCurrency(selectedPaymentType.onlineFeeFixed)}`
                            : `${(selectedPaymentType.codFeePercent * 100).toFixed(0)}% / ${formatCurrency(selectedPaymentType.codFeeFixed)}`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Total Biaya Layanan */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Total Biaya Layanan</span>
                    <span className="font-medium text-primary">{formatCurrency(totalBiayaLayanan)}</span>
                  </div>
                  
                  {/* Total Diterima Customer */}
                  <div className="flex justify-between items-center p-4 rounded-lg gradient-primary text-white">
                    <span className="font-medium">Jumlah Diterima</span>
                    <span className="text-xl font-bold">{formatCurrency(totalDiterimaCustomer)}</span>
                  </div>
                  
                  {/* Notes */}
                  <Alert className="bg-muted/30 border-none">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Biaya ongkir marketplace & layanan tambahan tidak termasuk
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
      
      {/* Mobile Calculation Bar & Submit Button */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-background border-t">
        <div className="container px-4 py-3 mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Jumlah Diterima</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(totalDiterimaCustomer)}</p>
            </div>
            <Button
              type="submit"
              form="order-form"
              className="gradient-primary text-white"
              disabled={loading || !isFormValid()}
              onClick={handleSubmit}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Buat Order
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
          {selectedPaymentType && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {selectedPaymentType.name}
              </Badge>
              <span>•</span>
              <span>Fee: {formatCurrency(totalBiayaLayanan)}</span>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
      <MobileBottomBar />
    </div>
  )
}
