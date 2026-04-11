'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { StatsCard } from '@/components/shared/stats-card'
import { LoadingSpinner } from '@/components/shared/loading'
import { EmptyTransactions } from '@/components/shared/empty-state'
import { useAuthStore, useIsPartner } from '@/store/auth'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatCurrency, formatDateTime, formatRelativeTime, calculateTransactionFees } from '@/lib/calculations'
import { apiFetch } from '@/lib/api'
import type { Customer, PaymentType, Marketplace, Transaction, CustomerLabel } from '@/types'
import {
  Plus,
  Search,
  ShoppingCart,
  Calculator,
  User,
  Eye,
  Phone,
  Building,
  CreditCard,
  TrendingUp,
  Wallet,
  Package,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Hash,
  Banknote,
  Calendar,
  ChevronRight,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TransactionDetail extends Transaction {
  customer: Customer
  paymentType: PaymentType
  marketplace?: Marketplace | null
}

// Status badge configurations with distinct colors
const statusConfig = {
  PENDING: { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
    label: 'Menunggu'
  },
  VERIFIED: { 
    bg: 'bg-teal-500/10', 
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/20',
    dot: 'bg-teal-500',
    label: 'Terverifikasi'
  },
  PROCESSING: { 
    bg: 'bg-violet-500/10', 
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20',
    dot: 'bg-violet-500',
    label: 'Diproses'
  },
  COMPLETED: { 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
    label: 'Selesai'
  },
  CANCELLED: { 
    bg: 'bg-rose-500/10', 
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500',
    label: 'Dibatalkan'
  },
}

export default function PartnerTransactionsPage() {
  const { partner } = useAuthStore()
  const isPartner = useIsPartner()
  const isMobile = useIsMobile()

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([])
  const [transactions, setTransactions] = useState<TransactionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)

  // Stats
  const [stats, setStats] = useState({
    totalProfit: 0,
    totalTransactions: 0,
    totalVolume: 0,
    pending: 0,
  })

  // Form states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [customerMode, setCustomerMode] = useState<'search' | 'new'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Transaction form
  const [formData, setFormData] = useState({
    nominal: '',
    paymentTypeId: '',
    marketplaceId: '',
    method: 'ONLINE' as 'ONLINE' | 'COD',
  })

  // New customer form
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    whatsapp: '',
    bank: '',
    accountNumber: '',
    accountHolder: '',
    city: '',
    label: 'REGULAR' as CustomerLabel,
  })

  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState<Customer | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  // Calculations
  const [calculations, setCalculations] = useState({
    paymentFee: 0,
    platformFee: 0,
    netMargin: 0,
    partnerProfit: 0,
    ownerProfit: 0,
    totalServiceFee: 0,
    receivedAmount: 0,
  })

  // Detail sheet
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!partner?.id) return

      try {
        // Fetch payment types
        const ptRes = await apiFetch('/api/payment-types')
        const ptData = await ptRes.json()
        if (ptData.success) {
          setPaymentTypes(ptData.data)
        }

        // Fetch marketplaces
        const mpRes = await apiFetch('/api/marketplaces')
        const mpData = await mpRes.json()
        if (mpData.success) {
          setMarketplaces(mpData.data)
        }

        // Fetch partner's customers (only their own customers, not all)
        const custRes = await apiFetch(`/api/customers`)
        const custData = await custRes.json()
        if (custData.success) {
          setCustomers(custData.data)
        }

        setDataLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Gagal memuat data')
        setDataLoading(false)
      }
    }

    fetchData()
  }, [partner?.id])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!partner?.id) return

    setLoading(true)
    try {
      const response = await apiFetch(`/api/transactions?partnerId=${partner.id}&days=30`)
      const data = await response.json()

      if (data.success) {
        setTransactions(data.data)

        // Calculate stats
        const completed = data.data.filter((t: Transaction) => t.status === 'COMPLETED')
        const pending = data.data.filter((t: Transaction) => t.status === 'PENDING')

        setStats({
          totalProfit: completed.reduce((sum: number, t: Transaction) => sum + t.partnerProfit, 0),
          totalTransactions: data.total,
          totalVolume: completed.reduce((sum: number, t: Transaction) => sum + t.nominal, 0),
          pending: pending.length,
        })
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Gagal memuat transaksi')
    } finally {
      setLoading(false)
    }
  }, [partner?.id])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Search customers - Partner can search ALL customers in transaction form
  const searchCustomers = async (query: string) => {
    if (!query.trim() || !partner?.id) {
      setSearchResults([])
      return
    }

    try {
      // Use searchAll=true to allow partner to search all customers by name/phone
      const response = await apiFetch(
        `/api/customers?search=${encodeURIComponent(query)}&searchAll=true`
      )
      const data = await response.json()
      if (data.success) {
        setSearchResults(data.data.slice(0, 5)) // Limit to 5 results
      }
    } catch (error) {
      console.error('Error searching customers:', error)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Check for duplicate customer when adding new customer
  useEffect(() => {
    if (customerMode !== 'new' || !partner?.id) {
      setDuplicateWarning(null)
      return
    }

    const checkDuplicate = async () => {
      const name = newCustomerData.name.trim()
      const whatsapp = newCustomerData.whatsapp.trim().replace(/[\s-]/g, '')

      if (!name && !whatsapp) {
        setDuplicateWarning(null)
        return
      }

      setCheckingDuplicate(true)
      try {
        // Search by name or whatsapp - use searchAll=true to check across ALL customers
        const params = new URLSearchParams()
        if (name) params.append('search', name)
        if (whatsapp) params.append('whatsapp', whatsapp)
        params.append('searchAll', 'true') // Check across ALL customers for duplicates

        const response = await apiFetch(`/api/customers?${params.toString()}`)
        const data = await response.json()

        if (data.success && data.data.length > 0) {
          // Check for exact match on whatsapp
          const exactMatch = data.data.find((c: Customer) => 
            c.whatsapp.replace(/[\s-]/g, '') === whatsapp
          )
          if (exactMatch) {
            setDuplicateWarning(exactMatch)
          } else {
            // Check for name match
            const nameMatch = data.data.find((c: Customer) => 
              c.name.toLowerCase() === name.toLowerCase()
            )
            setDuplicateWarning(nameMatch || null)
          }
        } else {
          setDuplicateWarning(null)
        }
      } catch (error) {
        console.error('Error checking duplicates:', error)
      } finally {
        setCheckingDuplicate(false)
      }
    }

    const timer = setTimeout(checkDuplicate, 500)
    return () => clearTimeout(timer)
  }, [newCustomerData.name, newCustomerData.whatsapp, customerMode, partner?.id])

  // Calculate fees in real-time using the standard calculation function
  useEffect(() => {
    const nominal = parseFloat(formData.nominal) || 0
    const paymentType = paymentTypes.find((pt) => pt.id === formData.paymentTypeId)
    const marketplace = marketplaces.find((mp) => mp.id === formData.marketplaceId)

    if (nominal > 0 && paymentType && partner) {
      // Use the standard calculation function to ensure consistency with backend
      const calculation = calculateTransactionFees(
        nominal,
        paymentType,
        marketplace || null,
        formData.method as 'ONLINE' | 'COD',
        partner.commissionRate
      )

      setCalculations({
        paymentFee: calculation.paymentFee,
        platformFee: calculation.platformFee,
        netMargin: calculation.netMargin,
        partnerProfit: calculation.partnerProfit,
        ownerProfit: calculation.ownerProfit,
        totalServiceFee: calculation.totalServiceFee,
        receivedAmount: calculation.receivedAmount,
      })
    } else {
      setCalculations({
        paymentFee: 0,
        platformFee: 0,
        netMargin: 0,
        partnerProfit: 0,
        ownerProfit: 0,
        totalServiceFee: 0,
        receivedAmount: 0,
      })
    }
  }, [formData, paymentTypes, marketplaces, partner])

  // Handle form reset
  const resetForm = () => {
    setCustomerMode('search')
    setSearchQuery('')
    setSearchResults([])
    setSelectedCustomer(null)
    setDuplicateWarning(null)
    setFormData({
      nominal: '',
      paymentTypeId: '',
      marketplaceId: '',
      method: 'ONLINE',
    })
    setNewCustomerData({
      name: '',
      whatsapp: '',
      bank: '',
      accountNumber: '',
      accountHolder: '',
      city: '',
      label: 'REGULAR',
    })
  }

  // Handle submit transaction
  const handleSubmit = async () => {
    // Validation
    if (customerMode === 'search' && !selectedCustomer) {
      toast.error('Pilih customer terlebih dahulu')
      return
    }

    if (customerMode === 'new') {
      if (!newCustomerData.name || !newCustomerData.whatsapp) {
        toast.error('Nama dan No WhatsApp wajib diisi')
        return
      }

      const waRegex = /^08[0-9]{8,12}$/
      if (!waRegex.test(newCustomerData.whatsapp.replace(/[\s-]/g, ''))) {
        toast.error('Format No WhatsApp tidak valid')
        return
      }

      if (newCustomerData.bank && (!newCustomerData.accountNumber || !newCustomerData.accountHolder)) {
        toast.error('Jika mengisi Bank, No Rekening dan Nama Pemilik wajib diisi')
        return
      }
    }

    if (!formData.nominal || parseFloat(formData.nominal) <= 0) {
      toast.error('Nominal harus lebih dari 0')
      return
    }

    if (!formData.paymentTypeId) {
      toast.error('Pilih tipe pembayaran')
      return
    }

    setFormLoading(true)
    try {
      const payload: Record<string, unknown> = {
        nominal: parseFloat(formData.nominal),
        paymentTypeId: formData.paymentTypeId,
        marketplaceId: formData.marketplaceId || null,
        method: formData.method,
        partnerId: partner?.id,
        source: 'PARTNER', // Mark as created by partner - status will be PENDING
      }

      if (customerMode === 'search') {
        payload.customerId = selectedCustomer?.id
      } else {
        payload.newCustomer = {
          ...newCustomerData,
          whatsapp: newCustomerData.whatsapp.replace(/[\s-]/g, ''),
          partnerId: partner?.id,
        }
      }

      const response = await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Transaksi berhasil dibuat', {
          description: 'Menunggu verifikasi dari owner'
        })
        setShowAddDialog(false)
        resetForm()
        fetchTransactions()
      } else {
        toast.error(data.error || 'Gagal membuat transaksi')
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      toast.error('Gagal membuat transaksi')
    } finally {
      setFormLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-muted" />
              <div className="h-12 w-12 rounded-full border-4 border-t-teal-500 animate-spin absolute inset-0" />
            </div>
            <p className="text-sm text-muted-foreground">Memuat data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-violet-500 p-4 sm:p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="text-white">
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                  Transaksi Saya
                </h1>
                <p className="text-sm sm:text-base text-white/80 mt-1">
                  Kelola transaksi customer Anda
                </p>
              </div>
              <Button 
                onClick={() => setShowAddDialog(true)} 
                className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm min-h-[44px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Transaksi Baru
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Modern Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white/80">Profit Saya</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{formatCurrency(stats.totalProfit)}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-500 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white/80">Total Transaksi</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{stats.totalTransactions}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white/80">Total Volume</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{formatCurrency(stats.totalVolume)}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white/80">Pending</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{stats.pending}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-muted" />
                <div className="h-12 w-12 rounded-full border-4 border-t-teal-500 animate-spin absolute inset-0" />
              </div>
              <p className="text-sm text-muted-foreground">Memuat transaksi...</p>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
                  <ShoppingCart className="h-8 w-8 text-teal-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Belum ada transaksi</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Buat transaksi baru untuk memulai
                </p>
                <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Transaksi Baru
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-2 p-4 sm:p-6 bg-gradient-to-r from-muted/50 to-muted/30">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-500" />
                Riwayat Transaksi
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">30 hari terakhir</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[400px] sm:max-h-[500px]">
                <div className="divide-y">
                  <AnimatePresence mode="popLayout">
                    {transactions.map((tx, index) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.99]"
                        onClick={() => {
                          setSelectedTransaction(tx)
                          setShowDetailSheet(true)
                        }}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold truncate text-sm sm:text-base">{tx.customer?.name}</p>
                              <Badge 
                                className={cn(
                                  'text-[10px] sm:text-xs font-medium border',
                                  statusConfig[tx.status as keyof typeof statusConfig]?.bg,
                                  statusConfig[tx.status as keyof typeof statusConfig]?.text,
                                  statusConfig[tx.status as keyof typeof statusConfig]?.border
                                )}
                              >
                                <span className={cn('w-1.5 h-1.5 rounded-full mr-1', statusConfig[tx.status as keyof typeof statusConfig]?.dot)} />
                                {tx.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-0.5">
                              <span className="font-mono text-[10px] sm:text-xs flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {tx.orderId}
                              </span>
                              <span className="hidden sm:inline flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {tx.paymentType?.name}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm sm:text-base">{formatCurrency(tx.nominal)}</p>
                          <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                            <TrendingUp className="h-3 w-3" />
                            +{formatCurrency(tx.partnerProfit)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 hidden sm:block" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Add Transaction Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) resetForm()
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                Transaksi Baru
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Buat transaksi baru untuk customer
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
              {/* Customer Selection */}
              <div className="space-y-3 sm:space-y-4">
                <Label className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-teal-500" />
                  Pilih Customer
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={customerMode === 'search' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "flex-1 min-h-[40px] text-xs sm:text-sm",
                      customerMode === 'search' && "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                    )}
                    onClick={() => setCustomerMode('search')}
                  >
                    <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                    Cari
                  </Button>
                  <Button
                    type="button"
                    variant={customerMode === 'new' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "flex-1 min-h-[40px] text-xs sm:text-sm",
                      customerMode === 'new' && "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                    )}
                    onClick={() => setCustomerMode('new')}
                  >
                    <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                    Baru
                  </Button>
                </div>

                {/* Duplicate Warning */}
                {duplicateWarning && customerMode === 'new' && (
                  <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-amber-700 dark:text-amber-300 text-sm">
                            Customer serupa sudah ada
                          </p>
                          <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 mt-1">
                            <span className="font-medium">{duplicateWarning.name}</span> - {duplicateWarning.whatsapp}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-2 bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs h-8"
                            onClick={() => {
                              setSelectedCustomer(duplicateWarning)
                              setCustomerMode('search')
                              setDuplicateWarning(null)
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Gunakan
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {customerMode === 'search' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari nama atau No WA..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 sm:h-11"
                      />
                    </div>

                    {searchResults.length > 0 && (
                      <div className="border rounded-xl divide-y overflow-hidden">
                        {searchResults.map((customer) => (
                          <div
                            key={customer.id}
                            className={cn(
                              "p-3 cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted/70",
                              selectedCustomer?.id === customer.id && "bg-teal-500/10"
                            )}
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">{customer.whatsapp}</p>
                              </div>
                              {selectedCustomer?.id === customer.id && (
                                <div className="h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center">
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedCustomer && (
                      <Card className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-teal-500/30">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                              <User className="h-4 w-4 text-teal-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{selectedCustomer.name}</p>
                              <p className="text-xs text-muted-foreground">{selectedCustomer.whatsapp}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 border rounded-xl bg-muted/30">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="new-name" className="text-xs sm:text-sm">Nama *</Label>
                      <Input
                        id="new-name"
                        value={newCustomerData.name}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                        placeholder="Nama customer"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="new-wa" className="text-xs sm:text-sm">No WhatsApp *</Label>
                      <Input
                        id="new-wa"
                        value={newCustomerData.whatsapp}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, whatsapp: e.target.value })}
                        placeholder="08xxxxxxxxxx"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="new-bank" className="text-xs sm:text-sm">Bank</Label>
                      <Input
                        id="new-bank"
                        value={newCustomerData.bank}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, bank: e.target.value })}
                        placeholder="BCA, Mandiri, dll"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="new-acc" className="text-xs sm:text-sm">No Rekening</Label>
                      <Input
                        id="new-acc"
                        value={newCustomerData.accountNumber}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, accountNumber: e.target.value })}
                        placeholder="1234567890"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="new-holder" className="text-xs sm:text-sm">Nama Pemilik</Label>
                      <Input
                        id="new-holder"
                        value={newCustomerData.accountHolder}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, accountHolder: e.target.value })}
                        placeholder="Nama di rekening"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="new-city" className="text-xs sm:text-sm">Kota</Label>
                      <Input
                        id="new-city"
                        value={newCustomerData.city}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                        placeholder="Jakarta"
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Transaction Details */}
              <div className="space-y-3 sm:space-y-4">
                <Label className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-teal-500" />
                  Detail Transaksi
                </Label>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="nominal" className="text-xs sm:text-sm">Nominal Transaksi *</Label>
                  <Input
                    id="nominal"
                    type="number"
                    value={formData.nominal}
                    onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                    placeholder="Masukkan nominal"
                    className="h-10 sm:h-11"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Tipe Pembayaran *</Label>
                    <Select
                      value={formData.paymentTypeId}
                      onValueChange={(value) => setFormData({ ...formData, paymentTypeId: value })}
                    >
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Pilih tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTypes.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id}>
                            {pt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Platform</Label>
                    <Select
                      value={formData.marketplaceId}
                      onValueChange={(value) => setFormData({ ...formData, marketplaceId: value })}
                    >
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Opsional" />
                      </SelectTrigger>
                      <SelectContent>
                        {marketplaces.map((mp) => (
                          <SelectItem key={mp.id} value={mp.id}>
                            {mp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Metode *</Label>
                  <RadioGroup
                    value={formData.method}
                    onValueChange={(value: 'ONLINE' | 'COD') => setFormData({ ...formData, method: value })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2 min-h-[44px]">
                      <RadioGroupItem value="ONLINE" id="online" />
                      <Label htmlFor="online" className="text-sm cursor-pointer">Online</Label>
                    </div>
                    <div className="flex items-center space-x-2 min-h-[44px]">
                      <RadioGroupItem value="COD" id="cod" />
                      <Label htmlFor="cod" className="text-sm cursor-pointer">COD</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Calculation Preview */}
              {parseFloat(formData.nominal) > 0 && formData.paymentTypeId && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-gradient-to-br from-teal-500/5 to-emerald-500/5 border-teal-500/20">
                    <CardHeader className="pb-2 p-3 sm:p-4">
                      <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-teal-500" />
                        Kalkulasi Fee
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3 sm:p-4 pt-0">
                      <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment Fee</span>
                          <span className="font-medium">{formatCurrency(calculations.paymentFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform Fee</span>
                          <span className="font-medium">{formatCurrency(calculations.platformFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net Margin</span>
                          <span className="font-medium">{formatCurrency(calculations.netMargin)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Fee</span>
                          <span className="font-medium">{formatCurrency(calculations.totalServiceFee)}</span>
                        </div>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <Card className="bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border-teal-500/20">
                          <CardContent className="p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Profit Anda</p>
                            <p className="text-base sm:text-lg font-bold text-teal-600 dark:text-teal-400">
                              {formatCurrency(calculations.partnerProfit)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              @ {((partner?.commissionRate || 0) * 100).toFixed(0)}%
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
                          <CardContent className="p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Diterima Customer</p>
                            <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(calculations.receivedAmount)}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto min-h-[44px]">
                Batal
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={formLoading} 
                className="w-full sm:w-auto min-h-[44px] bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
              >
                {formLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Buat Transaksi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Detail Sheet - Enhanced Mobile UX */}
        <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
          <SheetContent 
            className="sm:max-w-md overflow-y-auto scroll-touch" 
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <SheetHeader className="pb-2">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                Detail Transaksi
              </SheetTitle>
              <SheetDescription className="text-sm">
                Informasi lengkap transaksi
              </SheetDescription>
            </SheetHeader>

            {selectedTransaction && (
              <div className="space-y-4 mt-4 pb-8">
                {/* Status Badge - Prominent */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <Badge 
                    className={cn(
                      'text-xs font-semibold border px-3 py-1',
                      statusConfig[selectedTransaction.status as keyof typeof statusConfig]?.bg,
                      statusConfig[selectedTransaction.status as keyof typeof statusConfig]?.text,
                      statusConfig[selectedTransaction.status as keyof typeof statusConfig]?.border
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full mr-1.5', statusConfig[selectedTransaction.status as keyof typeof statusConfig]?.dot)} />
                    {statusConfig[selectedTransaction.status as keyof typeof statusConfig]?.label || selectedTransaction.status}
                  </Badge>
                </div>

                {/* Order ID Card - Enhanced */}
                <Card className="bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border-teal-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <Hash className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Order ID</p>
                        <p className="font-mono font-bold text-lg">{selectedTransaction.orderId}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Info - Enhanced with Actions */}
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="h-12 bg-gradient-to-r from-teal-500 to-emerald-500" />
                  <CardContent className="p-4 space-y-3 -mt-6">
                    <div className="flex items-end gap-3">
                      <div className="h-12 w-12 rounded-xl bg-white dark:bg-card border-4 border-white dark:border-card shadow-lg flex items-center justify-center">
                        <User className="h-6 w-6 text-teal-600" />
                      </div>
                      <div className="flex-1 pb-1">
                        <p className="font-semibold text-lg">{selectedTransaction.customer?.name}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm pt-2">
                      <a 
                        href={`https://wa.me/62${selectedTransaction.customer?.whatsapp?.slice(1)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] p-2 -mx-2 rounded-lg hover:bg-muted/50 active:bg-muted/70"
                      >
                        <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-green-600" />
                        </div>
                        <span>{selectedTransaction.customer?.whatsapp}</span>
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </a>
                      {selectedTransaction.customer?.bank && (
                        <div className="flex items-center gap-2 text-muted-foreground p-2 -mx-2">
                          <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Building className="h-4 w-4 text-violet-600" />
                          </div>
                          <span>{selectedTransaction.customer.bank}</span>
                        </div>
                      )}
                      {selectedTransaction.customer?.accountNumber && (
                        <div className="flex items-center gap-2 text-muted-foreground p-2 -mx-2">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-amber-600" />
                          </div>
                          <span>{selectedTransaction.customer.accountNumber}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Fee Breakdown - Enhanced Visual */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-2 p-4 bg-gradient-to-r from-muted/50 to-muted/30">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-teal-500" />
                      Rincian Fee
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {/* Nominal */}
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Nominal Gestun</span>
                      <span className="font-bold text-lg">{formatCurrency(selectedTransaction.nominal)}</span>
                    </div>
                    
                    {/* Payment Details */}
                    <div className="grid grid-cols-2 gap-3 py-2">
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Tipe Pembayaran</p>
                        <p className="font-semibold text-sm">{selectedTransaction.paymentType?.name}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Metode</p>
                        <p className="font-semibold text-sm">{selectedTransaction.method}</p>
                      </div>
                    </div>

                    {selectedTransaction.marketplace && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Platform</p>
                        <p className="font-semibold text-sm">{selectedTransaction.marketplace.name}</p>
                      </div>
                    )}

                    <div className="h-px bg-border" />

                    {/* Fee Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Fee</span>
                        <span className="font-medium">{formatCurrency(selectedTransaction.paymentFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform Fee</span>
                        <span className="font-medium">{formatCurrency(selectedTransaction.platformFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net Margin</span>
                        <span className="font-medium">{formatCurrency(selectedTransaction.netMargin)}</span>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Results */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border-teal-500/20">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground">Profit Anda</p>
                          <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                            +{formatCurrency(selectedTransaction.partnerProfit)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground">Diterima Customer</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(selectedTransaction.receivedAmount)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                {/* Timestamp */}
                <Card className="bg-muted/50 border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dibuat</p>
                        <p className="font-medium">{formatDateTime(selectedTransaction.createdAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  )
}
