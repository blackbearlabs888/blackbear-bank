'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Package, 
  User, 
  Phone, 
  Wallet, 
  CreditCard,
  Calendar,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Copy,
  CheckCircle2,
  MapPin,
  Building2,
  Clock,
  Check,
  X,
  Truck,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { NavbarDesktop } from '@/components/layout/navbar-desktop'
import { MobileBottomBar } from '@/components/layout/mobile-bottom-bar'
import { Footer } from '@/components/layout/footer'
import { formatCurrency, formatDateTime } from '@/lib/calculations'
import type { TransactionStatus } from '@/types'
import { cn } from '@/lib/utils'

interface OrderData {
  orderId: string
  customer: {
    name: string
    whatsapp: string
    bank: string | null
    accountNumber: string | null
    accountHolder: string | null
    city: string | null
  }
  nominal: number
  paymentType: {
    name: string
    type: string
  }
  method: string
  paymentFee: number
  totalServiceFee: number
  receivedAmount: number
  status: TransactionStatus
  partner: { name: string | null } | null
  createdAt: string
  updatedAt: string
}

// Status timeline configuration
const statusSteps: { status: TransactionStatus; label: string; icon: typeof Package }[] = [
  { status: 'PENDING', label: 'Pending', icon: Clock },
  { status: 'VERIFIED', label: 'Verified', icon: CheckCircle2 },
  { status: 'PROCESSING', label: 'Processing', icon: Truck },
  { status: 'COMPLETED', label: 'Completed', icon: Sparkles },
]

const statusOrder = ['PENDING', 'VERIFIED', 'PROCESSING', 'COMPLETED']

function TrackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  
  // Get orderId from URL params
  useEffect(() => {
    const urlOrderId = searchParams.get('orderId')
    if (urlOrderId) {
      setOrderId(urlOrderId)
      fetchOrder(urlOrderId)
    }
  }, [searchParams])
  
  // Fetch order data
  const fetchOrder = async (id: string) => {
    if (!id.trim()) return
    
    setLoading(true)
    setError(null)
    setOrder(null)
    
    try {
      const response = await fetch(`/api/orders/${id}`)
      const data = await response.json()
      
      if (!data.success) {
        setError(data.error || 'Order tidak ditemukan')
        return
      }
      
      setOrder(data.data)
    } catch (err) {
      console.error('Error fetching order:', err)
      setError('Terjadi kesalahan saat mengambil data order')
    } finally {
      setLoading(false)
    }
  }
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (orderId.trim()) {
      // Update URL
      const url = new URL(window.location.href)
      url.searchParams.set('orderId', orderId.trim())
      window.history.pushState({}, '', url)
      
      fetchOrder(orderId.trim())
    }
  }
  
  // Copy to clipboard
  const copyOrderId = () => {
    navigator.clipboard.writeText(order?.orderId || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // Get status badge variant and color
  const getStatusConfig = (status: TransactionStatus) => {
    switch (status) {
      case 'PENDING':
        return { 
          variant: 'secondary' as const, 
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          label: 'Pending',
          icon: Clock
        }
      case 'VERIFIED':
        return { 
          variant: 'secondary' as const, 
          className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          label: 'Verified',
          icon: Check
        }
      case 'PROCESSING':
        return { 
          variant: 'secondary' as const, 
          className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          label: 'Processing',
          icon: Truck
        }
      case 'COMPLETED':
        return { 
          variant: 'secondary' as const, 
          className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          label: 'Completed',
          icon: Sparkles
        }
      case 'CANCELLED':
        return { 
          variant: 'secondary' as const, 
          className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          label: 'Cancelled',
          icon: X
        }
      default:
        return { 
          variant: 'secondary' as const, 
          className: '',
          label: status,
          icon: Clock
        }
    }
  }
  
  // Get current step index
  const getCurrentStepIndex = (status: TransactionStatus) => {
    if (status === 'CANCELLED') return -1
    return statusOrder.indexOf(status)
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <NavbarDesktop currentPage="track" />
      
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container px-4 py-6 md:py-8 mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-6 md:mb-8"
          >
            <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary border-primary/20">
              <Search className="h-3 w-3 mr-1" />
              Track Order
            </Badge>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Lacak Order Anda</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Masukkan Order ID untuk melihat status transaksi
            </p>
          </motion.div>
          
          {/* Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="max-w-xl mx-auto mb-8"
          >
            <Card className={cn(
              "overflow-hidden transition-all duration-300",
              searchFocused && "ring-2 ring-primary/50 shadow-lg"
            )}>
              <CardContent className="p-4 md:p-6">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative">
                    <Search className={cn(
                      "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors",
                      searchFocused ? "text-primary" : "text-muted-foreground"
                    )} />
                    <Input
                      placeholder="Contoh: BB-ABC123-XYZ"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      className="pl-12 h-12 text-base md:text-lg"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-white h-11" 
                    disabled={loading || !orderId.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Mencari...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Lacak Order
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Loading State */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
                <p className="text-muted-foreground">Mencari order...</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Error State */}
          <AnimatePresence mode="wait">
            {error && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-xl mx-auto"
              >
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-medium">Order tidak ditemukan</span>
                    <p className="text-sm mt-1">{error}</p>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Order Details */}
          <AnimatePresence mode="wait">
            {order && !loading && (
              <motion.div
                key="order"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-2xl mx-auto space-y-4"
              >
                {/* Order ID Card */}
                <Card className="overflow-hidden">
                  <div className="gradient-primary p-4 md:p-6">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <p className="text-white/70 text-sm mb-1">Order ID</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xl md:text-2xl font-mono font-bold">
                            {order.orderId}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={copyOrderId}
                            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                          >
                            {copied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Badge className={cn("text-base px-4 py-1", getStatusConfig(order.status).className)}>
                        {getStatusConfig(order.status).label}
                      </Badge>
                    </div>
                  </div>
                </Card>
                
                {/* Status Timeline */}
                {order.status !== 'CANCELLED' && (
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        Status Pengiriman
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-6">
                      <div className="relative">
                        {/* Progress Line */}
                        <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: '0%' }}
                            animate={{ 
                              width: `${(getCurrentStepIndex(order.status) / (statusSteps.length - 1)) * 100}%` 
                            }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                          />
                        </div>
                        
                        {/* Steps */}
                        <div className="relative flex justify-between">
                          {statusSteps.map((step, index) => {
                            const currentIndex = getCurrentStepIndex(order.status)
                            const isCompleted = index <= currentIndex
                            const isCurrent = index === currentIndex
                            const Icon = step.icon
                            
                            return (
                              <div key={step.status} className="flex flex-col items-center">
                                <motion.div
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                                  className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors",
                                    isCompleted 
                                      ? "gradient-primary text-white" 
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  <Icon className="h-5 w-5" />
                                </motion.div>
                                <span className={cn(
                                  "text-xs mt-2 text-center",
                                  isCompleted ? "text-primary font-medium" : "text-muted-foreground"
                                )}>
                                  {step.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Cancelled Status */}
                {order.status === 'CANCELLED' && (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="py-6 text-center">
                      <X className="h-12 w-12 text-destructive mx-auto mb-3" />
                      <h3 className="font-semibold text-destructive mb-1">Order Dibatalkan</h3>
                      <p className="text-sm text-muted-foreground">
                        Transaksi ini telah dibatalkan
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {/* Customer Info */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Informasi Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Nama</p>
                        <p className="font-medium text-sm">{order.customer.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">WhatsApp</p>
                        <p className="font-medium text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.customer.whatsapp}
                        </p>
                      </div>
                      {order.customer.city && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Kota</p>
                          <p className="font-medium text-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {order.customer.city}
                          </p>
                        </div>
                      )}
                      {order.customer.bank && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Bank</p>
                          <p className="font-medium text-sm flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {order.customer.bank}
                          </p>
                        </div>
                      )}
                      {order.customer.accountNumber && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">No Rekening</p>
                          <p className="font-medium text-sm">{order.customer.accountNumber}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Transaction Info */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      Detail Transaksi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground text-sm">Nominal Gestun</span>
                        <span className="font-medium">{formatCurrency(order.nominal)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground text-sm">Payment Type</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {order.paymentType.type}
                          </Badge>
                          <span className="font-medium text-sm">{order.paymentType.name}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground text-sm">Method</span>
                        <Badge variant="outline" className="text-xs">
                          {order.method}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground text-sm">Total Biaya Layanan</span>
                        <span className="font-medium text-primary">{formatCurrency(order.totalServiceFee)}</span>
                      </div>
                    </div>
                    
                    {/* Total Received */}
                    <div className="flex justify-between items-center p-4 rounded-lg gradient-primary text-white">
                      <div>
                        <p className="text-white/80 text-sm">Jumlah Diterima</p>
                        <p className="text-2xl font-bold">{formatCurrency(order.receivedAmount)}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Sparkles className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Date Info */}
                <Card className="overflow-hidden">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tanggal Order</p>
                          <p className="font-medium text-sm">{formatDateTime(order.createdAt)}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/')}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Beranda
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      <Footer />
      <MobileBottomBar />
    </div>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <NavbarDesktop currentPage="track" />
        <main className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
        <MobileBottomBar />
      </div>
    }>
      <TrackContent />
    </Suspense>
  )
}
