'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  ShoppingBag,
  BarChart3,
  Plus,
  Search,
  UserPlus,
  Eye,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  CreditCard,
  Wallet,
  Store,
  User,
  Clock,
  ArrowLeftRight,
  Trash2
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { LoadingSpinner } from '@/components/shared/loading'
import { FloatingActionButton } from '@/components/shared/mobile-components'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useIsOwner } from '@/store/auth'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  formatCurrency,
  formatNumber,
  formatDateTime,
  formatRelativeTime,
  calculateTransactionFees,
  validateWhatsApp,
  formatWhatsApp
} from '@/lib/calculations'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import type {
  Customer,
  PaymentType,
  Marketplace,
  Partner,
  Transaction,
  CustomerLabel,
  TransactionMethod,
  TransactionStatus,
  FeeCalculation
} from '@/types'

// Status configuration
const STATUS_CONFIG: Record<TransactionStatus, { label: string; color: string; bgColor: string; dotColor: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-300', dotColor: 'bg-yellow-500' },
  VERIFIED: { label: 'Verified', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300', dotColor: 'bg-blue-500' },
  PROCESSING: { label: 'Processing', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-300', dotColor: 'bg-purple-500' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100 border-green-300', dotColor: 'bg-green-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100 border-red-300', dotColor: 'bg-red-500' }
}

// Label configuration
const LABEL_CONFIG: Record<CustomerLabel, { label: string; color: string }> = {
  VIP: { label: 'VIP', color: 'bg-yellow-500 text-white' },
  REGULAR: { label: 'Regular', color: 'bg-blue-500 text-white' },
  NEW: { label: 'New', color: 'bg-green-500 text-white' },
  BLACKLIST: { label: 'Blacklist', color: 'bg-red-500 text-white' }
}

// Status transitions for owner
const STATUS_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING: ['VERIFIED', 'CANCELLED'],
  VERIFIED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
}

interface TransactionStats {
  totalProfit: number
  totalTransactions: number
  totalVolume: number
}

interface TransactionWithRelations extends Transaction {
  customer: Customer
  partner?: (Partner & { user?: { name: string } }) | null
  paymentType: PaymentType
  marketplace?: Marketplace | null
}

export default function OwnerTransactionsPage() {
  const router = useRouter()
  const isOwner = useIsOwner()
  const isMobile = useIsMobile()

  // Data states
  const [stats, setStats] = useState<TransactionStats>({ totalProfit: 0, totalTransactions: 0, totalVolume: 0 })
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([])
  const [partners, setPartners] = useState<(Partner & { user?: { name: string } })[]>([])

  // UI states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithRelations | null>(null)
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<TransactionStatus | null>(null)
  const [statusUpdateMarketplaceId, setStatusUpdateMarketplaceId] = useState<string>('')
  const [statusUpdateFeePreview, setStatusUpdateFeePreview] = useState<FeeCalculation | null>(null)

  // Form states
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Mobile specific
  const [mobileSearch, setMobileSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [startY, setStartY] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    whatsapp: '',
    bank: '',
    accountNumber: '',
    accountHolder: '',
    city: '',
    label: 'NEW' as CustomerLabel
  })

  // Transaction form
  const [transactionForm, setTransactionForm] = useState({
    nominal: 0,
    paymentTypeId: '',
    marketplaceId: 'none',
    method: 'ONLINE' as TransactionMethod,
    partnerId: 'none'
  })

  // Calculated fees
  const [feeCalculation, setFeeCalculation] = useState<FeeCalculation | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize] = useState(10)

  // Fetch initial data
  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    try {
      const [transactionsRes, paymentTypesRes, marketplacesRes, partnersRes] = await Promise.all([
        apiFetch(`/api/transactions?days=7&page=${currentPage}&pageSize=${pageSize}`),
        apiFetch('/api/payment-types'),
        apiFetch('/api/marketplaces'),
        apiFetch('/api/partners?status=ACTIVE')
      ])

      const transactionsData = await transactionsRes.json()
      const paymentTypesData = await paymentTypesRes.json()
      const marketplacesData = await marketplacesRes.json()
      const partnersData = await partnersRes.json()

      if (transactionsData.success) {
        setTransactions(transactionsData.data)
        setTotalPages(transactionsData.totalPages)
        const totalProfit = transactionsData.data.reduce((sum: number, t: Transaction) => sum + (t.status === 'COMPLETED' ? t.ownerProfit : 0), 0)
        const totalVolume = transactionsData.data.reduce((sum: number, t: Transaction) => sum + t.nominal, 0)
        setStats({
          totalProfit,
          totalTransactions: transactionsData.total,
          totalVolume
        })
      }

      if (paymentTypesData.success) setPaymentTypes(paymentTypesData.data)
      if (marketplacesData.success) setMarketplaces(marketplacesData.data)
      if (partnersData.success) setPartners(partnersData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [currentPage, pageSize])

  useEffect(() => {
    if (!isOwner) {
      router.push('/login')
      return
    }
    fetchData()
  }, [isOwner, router, fetchData])

  // Search customers
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await apiFetch(`/api/customers?search=${encodeURIComponent(query)}&pageSize=10`)
      const data = await response.json()
      if (data.success) {
        setSearchResults(data.data)
      }
    } catch (error) {
      console.error('Error searching customers:', error)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchCustomers(searchQuery)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, searchCustomers])

  // Calculate fees when form changes
  useEffect(() => {
    const calculateFees = () => {
      if (!transactionForm.nominal || !transactionForm.paymentTypeId) {
        setFeeCalculation(null)
        return
      }

      const paymentType = paymentTypes.find(pt => pt.id === transactionForm.paymentTypeId)
      if (!paymentType) {
        setFeeCalculation(null)
        return
      }

      const marketplace = transactionForm.marketplaceId === 'none' 
        ? null 
        : marketplaces.find(m => m.id === transactionForm.marketplaceId) || null
      const partner = transactionForm.partnerId === 'none'
        ? null
        : partners.find(p => p.id === transactionForm.partnerId)
      // commissionRate is returned as percentage (30 for 30%), convert to decimal (0.3)
      const partnerRate = partner ? partner.commissionRate / 100 : 0

      const calculation = calculateTransactionFees(
        transactionForm.nominal,
        paymentType,
        marketplace,
        transactionForm.method,
        partnerRate
      )

      setFeeCalculation(calculation)
    }

    calculateFees()
  }, [transactionForm, paymentTypes, marketplaces, partners])

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedCustomer && !isManualEntry) {
      alert('Pilih customer atau isi data customer baru')
      return
    }

    if (isManualEntry) {
      if (!newCustomer.name.trim()) {
        alert('Nama customer harus diisi')
        return
      }
      if (!validateWhatsApp(newCustomer.whatsapp)) {
        alert('Format WhatsApp tidak valid (08xxx)')
        return
      }
    }

    if (!transactionForm.nominal || transactionForm.nominal <= 0) {
      alert('Nominal harus lebih dari 0')
      return
    }

    if (!transactionForm.paymentTypeId) {
      alert('Pilih tipe pembayaran')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        customerId: !isManualEntry ? selectedCustomer?.id : undefined,
        newCustomer: isManualEntry ? {
          name: newCustomer.name,
          whatsapp: formatWhatsApp(newCustomer.whatsapp),
          bank: newCustomer.bank || null,
          accountNumber: newCustomer.accountNumber || null,
          accountHolder: newCustomer.accountHolder || null,
          city: newCustomer.city || null,
          label: newCustomer.label
        } : undefined,
        nominal: transactionForm.nominal,
        paymentTypeId: transactionForm.paymentTypeId,
        marketplaceId: transactionForm.marketplaceId === 'none' ? null : transactionForm.marketplaceId,
        method: transactionForm.method,
        partnerId: transactionForm.partnerId === 'none' ? null : transactionForm.partnerId
      }

      const response = await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        setShowAddDialog(false)
        resetForm()
        fetchData()
      } else {
        alert(data.error || 'Gagal membuat transaksi')
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      alert('Terjadi kesalahan saat membuat transaksi')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle status update
  const handleStatusUpdate = async (status: TransactionStatus) => {
    if (!selectedTransaction) return

    try {
      // Include marketplaceId when transitioning from PENDING to VERIFIED
      const payload: Record<string, unknown> = { status }
      if (selectedTransaction.status === 'PENDING' && status === 'VERIFIED' && statusUpdateMarketplaceId) {
        payload.marketplaceId = statusUpdateMarketplaceId
      }

      const response = await apiFetch(`/api/transactions/${selectedTransaction.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        // Update the transaction in the list with the new data
        setTransactions(prev =>
          prev.map(t => t.id === selectedTransaction.id ? { ...t, ...data.data } : t)
        )
        setSelectedTransaction({ ...selectedTransaction, ...data.data })
        setStatusUpdateDialog(null)
        setStatusUpdateMarketplaceId('')
        setStatusUpdateFeePreview(null)
      } else {
        alert(data.error || 'Gagal mengupdate status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Terjadi kesalahan saat mengupdate status')
    }
  }

  // Calculate fee preview when marketplace changes during status update
  useEffect(() => {
    if (
      statusUpdateDialog === 'VERIFIED' &&
      selectedTransaction?.status === 'PENDING' &&
      statusUpdateMarketplaceId
    ) {
      const marketplace = statusUpdateMarketplaceId === 'none' || statusUpdateMarketplaceId === selectedTransaction.marketplaceId
        ? selectedTransaction.marketplace
        : marketplaces.find(m => m.id === statusUpdateMarketplaceId) || null

      const partnerRate = selectedTransaction.partner?.commissionRate || 0
      const paymentType = selectedTransaction.paymentType

      const calculation = calculateTransactionFees(
        selectedTransaction.nominal,
        paymentType,
        marketplace,
        selectedTransaction.method as 'ONLINE' | 'COD',
        partnerRate
      )
      setStatusUpdateFeePreview(calculation)
    } else {
      setStatusUpdateFeePreview(null)
    }
  }, [statusUpdateDialog, statusUpdateMarketplaceId, selectedTransaction, marketplaces])

  // Reset form
  const resetForm = () => {
    setIsManualEntry(false)
    setSearchQuery('')
    setSearchResults([])
    setSelectedCustomer(null)
    setNewCustomer({
      name: '',
      whatsapp: '',
      bank: '',
      accountNumber: '',
      accountHolder: '',
      city: '',
      label: 'NEW'
    })
    setTransactionForm({
      nominal: 0,
      paymentTypeId: '',
      marketplaceId: 'none',
      method: 'ONLINE',
      partnerId: 'none'
    })
    setFeeCalculation(null)
  }

  // View transaction detail
  const viewTransactionDetail = (transaction: TransactionWithRelations) => {
    setSelectedTransaction(transaction)
    setShowDetailSheet(true)
  }

  // Pull to refresh handlers (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - startY
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(80, diff * 0.5))
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      await fetchData(true)
    }
    setPullDistance(0)
    setStartY(0)
  }

  // Render status timeline (compact for mobile)
  const renderStatusTimeline = (status: TransactionStatus, compact = false) => {
    const statuses: TransactionStatus[] = ['PENDING', 'VERIFIED', 'PROCESSING', 'COMPLETED']
    const currentIndex = statuses.indexOf(status)

    if (compact) {
      // Compact timeline for mobile
      return (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {statuses.map((s, index) => {
            const isCompleted = index <= currentIndex && status !== 'CANCELLED'
            const isCurrent = index === currentIndex

            return (
              <div key={s} className="flex items-center">
                <div className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-medium border-2 shrink-0',
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent && status === 'CANCELLED' ? 'bg-red-500 border-red-500 text-white' :
                  isCurrent ? 'bg-primary border-primary text-white' :
                  'bg-muted border-muted-foreground/30 text-muted-foreground'
                )}>
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                {index < statuses.length - 1 && (
                  <div className={cn(
                    'w-4 h-0.5',
                    isCompleted && index < currentIndex ? 'bg-green-500' : 'bg-muted-foreground/30'
                  )} />
                )}
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map((s, index) => {
          const isCompleted = index <= currentIndex && status !== 'CANCELLED'
          const isCurrent = index === currentIndex
          const config = STATUS_CONFIG[s]

          return (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium border-2',
                isCompleted ? 'bg-green-500 border-green-500 text-white' :
                isCurrent && status === 'CANCELLED' ? 'bg-red-500 border-red-500 text-white' :
                'bg-muted border-muted-foreground/30 text-muted-foreground'
              )}>
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={cn(
                'text-xs font-medium',
                isCurrent ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {config.label}
              </span>
              {index < statuses.length - 1 && (
                <div className={cn(
                  'w-6 h-0.5',
                  isCompleted && index < currentIndex ? 'bg-green-500' : 'bg-muted-foreground/30'
                )} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Filter transactions for mobile search
  const filteredTransactions = isMobile && mobileSearch
    ? transactions.filter(t => 
        t.customer.name.toLowerCase().includes(mobileSearch.toLowerCase()) ||
        t.orderId.toLowerCase().includes(mobileSearch.toLowerCase())
      )
    : transactions

  // Loading State
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className={cn(
          "flex items-center justify-center min-h-[60vh]",
          isMobile ? "p-4" : ""
        )}>
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  // MOBILE VIEW
  if (isMobile) {
    return (
      <DashboardLayout>
        <div 
          ref={containerRef}
          className="h-[calc(100vh-60px)] overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull to refresh indicator */}
          <div
            className="flex items-center justify-center transition-all duration-200"
            style={{ height: pullDistance, opacity: pullDistance / 60 }}
          >
            <RefreshCw className={cn('h-6 w-6 text-primary', (isRefreshing || pullDistance > 60) && 'animate-spin')} />
          </div>

          {/* Mobile Header */}
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold">Transaksi</h1>
                <p className="text-xs text-muted-foreground">7 hari terakhir</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="h-9 w-9"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>

          <div className="p-4 pb-24 space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white shadow-sm">
                <p className="text-[10px] text-white/80">Profit</p>
                <p className="text-sm font-bold mt-0.5 truncate">{formatCurrency(stats.totalProfit)}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-3 text-white shadow-sm">
                <p className="text-[10px] text-white/80">Transaksi</p>
                <p className="text-sm font-bold mt-0.5">{formatNumber(stats.totalTransactions)}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 p-3 text-white shadow-sm">
                <p className="text-[10px] text-white/80">Volume</p>
                <p className="text-sm font-bold mt-0.5 truncate">{formatCurrency(stats.totalVolume)}</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau ID order..."
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>

            {/* Transaction List */}
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">Belum ada transaksi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => {
                  const statusConfig = STATUS_CONFIG[transaction.status]
                  return (
                    <div
                      key={transaction.id}
                      onClick={() => viewTransactionDetail(transaction)}
                      className="bg-card rounded-xl border p-4 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              #{transaction.orderId.slice(-8)}
                            </span>
                            <div className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)} />
                          </div>
                          <p className="font-medium truncate">{transaction.customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {transaction.paymentType.name} • {transaction.method}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{formatCurrency(transaction.nominal)}</p>
                          <p className="text-xs text-emerald-600 font-medium">
                            +{formatCurrency(transaction.ownerProfit)}
                          </p>
                          <Badge className={cn('mt-1 text-[10px] px-2 py-0.5 border', statusConfig.bgColor, statusConfig.color)}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      {transaction.partner && (
                        <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Partner: {transaction.partner.user?.name}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="h-10 px-4"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage}/{totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="h-10 px-4"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* FAB */}
          <FloatingActionButton
            onClick={() => setShowAddDialog(true)}
            icon={<Plus className="h-6 w-6" />}
          />
        </div>

        {/* Mobile Add Transaction Drawer */}
        <Drawer open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm() }}>
          <DrawerContent className="max-h-[96vh]">
            <DrawerHeader className="border-b px-4 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-lg">Tambah Transaksi</DrawerTitle>
                <DrawerClose className="rounded-sm opacity-70 hover:opacity-100">
                  <X className="h-5 w-5" />
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div 
              className="flex-1 overflow-y-auto overflow-x-hidden p-4"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              <div className="space-y-6 pb-4">
                {/* Customer Selection Toggle */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Customer</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={!isManualEntry ? 'default' : 'outline'}
                      size="sm"
                      className={cn('h-11', !isManualEntry && 'gradient-primary')}
                      onClick={() => setIsManualEntry(false)}
                    >
                      <Search className="h-4 w-4 mr-1.5" />
                      Cari
                    </Button>
                    <Button
                      type="button"
                      variant={isManualEntry ? 'default' : 'outline'}
                      size="sm"
                      className={cn('h-11', isManualEntry && 'gradient-primary')}
                      onClick={() => { setIsManualEntry(true); setSelectedCustomer(null) }}
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Baru
                    </Button>
                  </div>
                </div>

                {/* Search Existing Customer */}
                {!isManualEntry && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari nama atau WA..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>

                    {selectedCustomer && (
                      <div className="p-3 rounded-xl border-2 border-primary bg-primary/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{selectedCustomer.name}</p>
                              <p className="text-xs text-muted-foreground">{selectedCustomer.whatsapp}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCustomer(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {searchResults.length > 0 && !selectedCustomer && (
                      <div className="border rounded-xl divide-y max-h-48 overflow-y-auto">
                        {searchResults.map((customer) => (
                          <button
                            key={customer.id}
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                            onClick={() => { setSelectedCustomer(customer); setSearchQuery(''); setSearchResults([]) }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-sm">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">{customer.whatsapp}</p>
                              </div>
                            </div>
                            <Badge className={LABEL_CONFIG[customer.label].color}>
                              {LABEL_CONFIG[customer.label].label}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* New Customer Form */}
                {isManualEntry && (
                  <div className="space-y-4 p-4 border rounded-xl bg-muted/30">
                    <h4 className="text-sm font-medium">Data Customer Baru</h4>
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nama *</Label>
                          <Input
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            placeholder="Nama"
                            className="h-10 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">No WA *</Label>
                          <Input
                            value={newCustomer.whatsapp}
                            onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp: e.target.value })}
                            placeholder="08xxx"
                            className="h-10 mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Bank</Label>
                          <Input
                            value={newCustomer.bank}
                            onChange={(e) => setNewCustomer({ ...newCustomer, bank: e.target.value })}
                            placeholder="BCA"
                            className="h-10 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">No Rek</Label>
                          <Input
                            value={newCustomer.accountNumber}
                            onChange={(e) => setNewCustomer({ ...newCustomer, accountNumber: e.target.value })}
                            placeholder="123456"
                            className="h-10 mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Nama Pemilik</Label>
                        <Input
                          value={newCustomer.accountHolder}
                          onChange={(e) => setNewCustomer({ ...newCustomer, accountHolder: e.target.value })}
                          placeholder="Nama di rekening"
                          className="h-10 mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Kota</Label>
                          <Input
                            value={newCustomer.city}
                            onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                            placeholder="Jakarta"
                            className="h-10 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Label</Label>
                          <Select
                            value={newCustomer.label}
                            onValueChange={(value: CustomerLabel) => setNewCustomer({ ...newCustomer, label: value })}
                          >
                            <SelectTrigger className="h-10 mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NEW">New</SelectItem>
                              <SelectItem value="REGULAR">Regular</SelectItem>
                              <SelectItem value="VIP">VIP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Transaction Fields */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Detail Transaksi</h4>

                  <div>
                    <Label className="text-xs">Nominal *</Label>
                    <Input
                      type="number"
                      value={transactionForm.nominal || ''}
                      onChange={(e) => setTransactionForm({ ...transactionForm, nominal: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-11 mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Payment Type *</Label>
                      <Select
                        value={transactionForm.paymentTypeId}
                        onValueChange={(value) => setTransactionForm({ ...transactionForm, paymentTypeId: value })}
                      >
                        <SelectTrigger className="h-11 mt-1">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTypes.map((pt) => (
                            <SelectItem key={pt.id} value={pt.id}>
                              <div className="flex items-center gap-2">
                                {pt.type === 'CC' ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                                {pt.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Platform</Label>
                      <Select
                        value={transactionForm.marketplaceId}
                        onValueChange={(value) => setTransactionForm({ ...transactionForm, marketplaceId: value })}
                      >
                        <SelectTrigger className="h-11 mt-1">
                          <SelectValue placeholder="Opsional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tanpa</SelectItem>
                          {marketplaces.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4" />
                                {m.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Method</Label>
                      <Select
                        value={transactionForm.method}
                        onValueChange={(value: TransactionMethod) => setTransactionForm({ ...transactionForm, method: value })}
                      >
                        <SelectTrigger className="h-11 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ONLINE">Online</SelectItem>
                          <SelectItem value="COD">COD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Partner</Label>
                      <Select
                        value={transactionForm.partnerId}
                        onValueChange={(value) => setTransactionForm({ ...transactionForm, partnerId: value })}
                      >
                        <SelectTrigger className="h-11 mt-1">
                          <SelectValue placeholder="Opsional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tanpa</SelectItem>
                          {partners.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.user?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Fee Calculation */}
                {feeCalculation && (
                  <div className="space-y-3">
                    <Separator />
                    <h4 className="text-sm font-medium">Kalkulasi</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-[10px] text-muted-foreground">Payment Fee</p>
                        <p className="text-sm font-semibold">{formatCurrency(feeCalculation.paymentFee)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-[10px] text-muted-foreground">Platform Fee</p>
                        <p className="text-sm font-semibold">{formatCurrency(feeCalculation.platformFee)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-[10px] text-muted-foreground">Net Margin</p>
                        <p className="text-sm font-semibold">{formatCurrency(feeCalculation.netMargin)}</p>
                      </div>
                      {transactionForm.partnerId && transactionForm.partnerId !== 'none' && (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <p className="text-[10px] text-muted-foreground">Partner</p>
                          <p className="text-sm font-semibold text-blue-600">{formatCurrency(feeCalculation.partnerProfit)}</p>
                        </div>
                      )}
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] text-muted-foreground">Owner Profit</p>
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(feeCalculation.ownerProfit)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-[10px] text-muted-foreground">Diterima</p>
                        <p className="text-sm font-semibold text-primary">{formatCurrency(feeCalculation.receivedAmount)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DrawerFooter className="border-t px-4 py-3 shrink-0">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !feeCalculation || (!selectedCustomer && !isManualEntry)}
                className="h-12 gradient-primary"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Simpan Transaksi
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="h-12">
                Batal
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Mobile Transaction Detail Drawer */}
        <Drawer open={showDetailSheet} onOpenChange={setShowDetailSheet}>
          <DrawerContent className="max-h-[96vh]">
            <DrawerHeader className="border-b px-4 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DrawerTitle className="text-lg">Detail Transaksi</DrawerTitle>
                  <DrawerDescription className="text-xs font-mono">
                    #{selectedTransaction?.orderId}
                  </DrawerDescription>
                </div>
                <DrawerClose className="rounded-sm opacity-70 hover:opacity-100">
                  <X className="h-5 w-5" />
                </DrawerClose>
              </div>
            </DrawerHeader>

            {selectedTransaction && (
              <div 
                className="flex-1 overflow-y-auto overflow-x-hidden p-4"
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain'
                }}
              >
                <div className="space-y-6 pb-4">
                  {/* Status Timeline */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-2">
                      {renderStatusTimeline(selectedTransaction.status, true)}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{selectedTransaction.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedTransaction.customer.whatsapp}</p>
                      </div>
                      <Badge className={LABEL_CONFIG[selectedTransaction.customer.label].color}>
                        {LABEL_CONFIG[selectedTransaction.customer.label].label}
                      </Badge>
                    </div>
                    {selectedTransaction.customer.bank && (
                      <div className="pt-3 border-t text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bank</span>
                          <span>{selectedTransaction.customer.bank}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rekening</span>
                          <span className="font-mono">{selectedTransaction.customer.accountNumber}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transaction Details */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Nominal</span>
                      <span className="font-semibold">{formatCurrency(selectedTransaction.nominal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Payment</span>
                      <span className="text-sm">{selectedTransaction.paymentType.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Method</span>
                      <span className="text-sm">{selectedTransaction.method}</span>
                    </div>
                    {selectedTransaction.marketplace && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Platform</span>
                        <span className="text-sm">{selectedTransaction.marketplace.name}</span>
                      </div>
                    )}
                    {selectedTransaction.partner && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Partner</span>
                        <span className="text-sm">{selectedTransaction.partner.user?.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Fee Calculation */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <h4 className="text-sm font-medium">Kalkulasi Biaya</h4>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Payment Fee</span>
                      <span className="text-sm">{formatCurrency(selectedTransaction.paymentFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Platform Fee</span>
                      <span className="text-sm">{formatCurrency(selectedTransaction.platformFee)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Net Margin</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedTransaction.netMargin)}</span>
                    </div>
                    {selectedTransaction.partner && (
                      <div className="flex justify-between text-blue-600">
                        <span className="text-sm">Partner Profit</span>
                        <span className="text-sm">{formatCurrency(selectedTransaction.partnerProfit)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span className="text-sm">Owner Profit</span>
                      <span className="text-sm">{formatCurrency(selectedTransaction.ownerProfit)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Diterima Customer</span>
                      <span className="text-sm text-primary">{formatCurrency(selectedTransaction.receivedAmount)}</span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Dibuat: {formatDateTime(selectedTransaction.createdAt)}</p>
                    <p>Diperbarui: {formatDateTime(selectedTransaction.updatedAt)}</p>
                  </div>

                  {/* Status Update Actions */}
                  {STATUS_TRANSITIONS[selectedTransaction.status].length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Update Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {STATUS_TRANSITIONS[selectedTransaction.status].map((status) => (
                          <Button
                            key={status}
                            variant="outline"
                            size="sm"
                            className="h-11"
                            onClick={() => setStatusUpdateDialog(status)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1.5" />
                            {STATUS_CONFIG[status].label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DrawerContent>
        </Drawer>

        {/* Status Update Confirmation */}
        <AlertDialog open={!!statusUpdateDialog} onOpenChange={() => { setStatusUpdateDialog(null); setStatusUpdateMarketplaceId(''); setStatusUpdateFeePreview(null) }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Update Status</AlertDialogTitle>
              <AlertDialogDescription>
                Ubah status ke <span className="font-medium">{statusUpdateDialog && STATUS_CONFIG[statusUpdateDialog].label}</span>?
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Platform selector when transitioning from PENDING to VERIFIED */}
            {statusUpdateDialog === 'VERIFIED' && selectedTransaction?.status === 'PENDING' && (
              <div className="space-y-3 py-2">
                <Label className="text-sm font-medium">Platform (Opsional)</Label>
                <Select
                  value={statusUpdateMarketplaceId}
                  onValueChange={setStatusUpdateMarketplaceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih platform jika ada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={selectedTransaction.marketplaceId || 'none'}>
                      {selectedTransaction.marketplace?.name || 'Tanpa Platform'} (Saat ini)
                    </SelectItem>
                    {marketplaces
                      .filter(m => m.id !== selectedTransaction.marketplaceId)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Fee Preview */}
                {statusUpdateFeePreview && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                    <p className="font-medium text-xs text-muted-foreground">Preview Kalkulasi:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground text-xs">Platform Fee:</span>
                        <p className="font-medium">{formatCurrency(statusUpdateFeePreview.platformFee)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Owner Profit:</span>
                        <p className="font-medium text-emerald-600">{formatCurrency(statusUpdateFeePreview.ownerProfit)}</p>
                      </div>
                    </div>
                    {selectedTransaction.partner && (
                      <div>
                        <span className="text-muted-foreground text-xs">Partner Profit:</span>
                        <p className="font-medium text-blue-600">{formatCurrency(statusUpdateFeePreview.partnerProfit)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setStatusUpdateMarketplaceId(''); setStatusUpdateFeePreview(null) }}>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => statusUpdateDialog && handleStatusUpdate(statusUpdateDialog)}>
                Ya, Update
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    )
  }

  // DESKTOP VIEW
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Transaksi</h1>
            <p className="text-muted-foreground">Kelola transaksi gestun</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Transaksi
          </Button>
        </div>

        {/* Stats Cards Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500 text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalProfit)}</p>
                  <p className="text-xs text-muted-foreground">7 hari terakhir</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-violet-500 text-white">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Transaksi</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totalTransactions)}</p>
                  <p className="text-xs text-muted-foreground">7 hari terakhir</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-fuchsia-500 text-white">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-2xl font-bold text-fuchsia-600">{formatCurrency(stats.totalVolume)}</p>
                  <p className="text-xs text-muted-foreground">7 hari terakhir</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terbaru (7 Hari Terakhir)</CardTitle>
            <CardDescription>Daftar transaksi dalam 7 hari terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada transaksi</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Transaksi Baru
                </Button>
              </div>
            ) : (
              <>
                <ScrollArea className="rounded-md border">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr_100px] gap-4 p-4 bg-muted/50 font-medium text-sm border-b">
                      <div>ID Order</div>
                      <div>Nama Customer</div>
                      <div>Nominal</div>
                      <div>Profit</div>
                      <div>Status</div>
                      <div className="text-right">Aksi</div>
                    </div>
                    {transactions.map((transaction) => {
                      const statusConfig = STATUS_CONFIG[transaction.status]
                      return (
                        <div
                          key={transaction.id}
                          className="grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr_100px] gap-4 p-4 items-center border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-mono text-sm truncate">{transaction.orderId}</div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{transaction.customer.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{transaction.customer.whatsapp}</p>
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold">{formatCurrency(transaction.nominal)}</p>
                            <p className="text-xs text-muted-foreground">{transaction.paymentType.name}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-green-600">{formatCurrency(transaction.ownerProfit)}</p>
                            {transaction.partner && (
                              <p className="text-xs text-muted-foreground">Mitra: {formatCurrency(transaction.partnerProfit)}</p>
                            )}
                          </div>
                          <div>
                            <Badge className={cn('border', statusConfig.bgColor, statusConfig.color)}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewTransactionDetail(transaction)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detail
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Halaman {currentPage} dari {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Tambah Transaksi Baru</DialogTitle>
            <DialogDescription>Masukkan data transaksi gestun baru</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6 pr-4">
            {/* Customer Selection Toggle */}
            <div className="space-y-4">
              <Label>Customer</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isManualEntry ? 'default' : 'outline'}
                  className={cn('flex-1', !isManualEntry && 'gradient-primary')}
                  onClick={() => setIsManualEntry(false)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Cari Customer
                </Button>
                <Button
                  type="button"
                  variant={isManualEntry ? 'default' : 'outline'}
                  className={cn('flex-1', isManualEntry && 'gradient-primary')}
                  onClick={() => { setIsManualEntry(true); setSelectedCustomer(null) }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Customer Baru
                </Button>
              </div>
            </div>

            {/* Search Existing Customer */}
            {!isManualEntry && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau WhatsApp..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {selectedCustomer && (
                  <Card className="border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{selectedCustomer.name}</p>
                            <p className="text-sm text-muted-foreground">{selectedCustomer.whatsapp}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={LABEL_CONFIG[selectedCustomer.label].color}>
                            {LABEL_CONFIG[selectedCustomer.label].label}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {searchResults.length > 0 && !selectedCustomer && (
                  <ScrollArea className="h-48 rounded-md border">
                    <div className="p-2 space-y-2">
                      {searchResults.map((customer) => (
                        <div
                          key={customer.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => { setSelectedCustomer(customer); setSearchQuery(''); setSearchResults([]) }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">{customer.whatsapp}</p>
                            </div>
                          </div>
                          <Badge className={LABEL_CONFIG[customer.label].color}>
                            {LABEL_CONFIG[customer.label].label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* New Customer Form */}
            {isManualEntry && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Data Customer Baru</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama *</Label>
                    <Input id="name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Nama lengkap" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">No WA *</Label>
                    <Input id="whatsapp" value={newCustomer.whatsapp} onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp: e.target.value })} placeholder="08xxx" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank">Bank</Label>
                    <Input id="bank" value={newCustomer.bank} onChange={(e) => setNewCustomer({ ...newCustomer, bank: e.target.value })} placeholder="BCA, BNI, dll" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">No Rekening</Label>
                    <Input id="accountNumber" value={newCustomer.accountNumber} onChange={(e) => setNewCustomer({ ...newCustomer, accountNumber: e.target.value })} placeholder="Nomor rekening" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountHolder">Nama Pemilik</Label>
                    <Input id="accountHolder" value={newCustomer.accountHolder} onChange={(e) => setNewCustomer({ ...newCustomer, accountHolder: e.target.value })} placeholder="Nama di rekening" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Kota</Label>
                    <Input id="city" value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} placeholder="Kota" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="label">Label</Label>
                    <Select value={newCustomer.label} onValueChange={(value: CustomerLabel) => setNewCustomer({ ...newCustomer, label: value })}>
                      <SelectTrigger><SelectValue placeholder="Pilih label" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="REGULAR">Regular</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                        <SelectItem value="BLACKLIST">Blacklist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Fields */}
            <div className="space-y-4">
              <Separator />
              <h4 className="font-medium">Detail Transaksi</h4>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nominal">Nominal Transaksi *</Label>
                  <Input id="nominal" type="number" value={transactionForm.nominal || ''} onChange={(e) => setTransactionForm({ ...transactionForm, nominal: parseFloat(e.target.value) || 0 })} placeholder="Masukkan nominal" />
                </div>

                <div className="space-y-2">
                  <Label>Payment Type *</Label>
                  <Select value={transactionForm.paymentTypeId} onValueChange={(value) => setTransactionForm({ ...transactionForm, paymentTypeId: value })}>
                    <SelectTrigger><SelectValue placeholder="Pilih payment type" /></SelectTrigger>
                    <SelectContent>
                      {paymentTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          <div className="flex items-center gap-2">
                            {pt.type === 'CC' ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                            {pt.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={transactionForm.marketplaceId} onValueChange={(value) => setTransactionForm({ ...transactionForm, marketplaceId: value })}>
                    <SelectTrigger><SelectValue placeholder="Pilih platform (opsional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa Platform</SelectItem>
                      {marketplaces.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2"><Store className="h-4 w-4" />{m.name}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Method</Label>
                  <RadioGroup value={transactionForm.method} onValueChange={(value: TransactionMethod) => setTransactionForm({ ...transactionForm, method: value })} className="flex gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="ONLINE" id="online" /><Label htmlFor="online">Online</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="COD" id="cod" /><Label htmlFor="cod">COD</Label></div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Partner (Opsional)</Label>
                  <Select value={transactionForm.partnerId} onValueChange={(value) => setTransactionForm({ ...transactionForm, partnerId: value })}>
                    <SelectTrigger><SelectValue placeholder="Pilih partner (opsional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa Partner</SelectItem>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.user?.name || 'Unknown'} ({p.tier})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Real-time Calculation Display */}
            {feeCalculation && (
              <div className="space-y-4">
                <Separator />
                <h4 className="font-medium">Kalkulasi Biaya</h4>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Payment Fee</p><p className="text-lg font-semibold">{formatCurrency(feeCalculation.paymentFee)}</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Platform Fee</p><p className="text-lg font-semibold">{formatCurrency(feeCalculation.platformFee)}</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Net Margin</p><p className="text-lg font-semibold">{formatCurrency(feeCalculation.netMargin)}</p></div>
                  {transactionForm.partnerId && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"><p className="text-sm text-muted-foreground">Partner Profit</p><p className="text-lg font-semibold text-blue-600">{formatCurrency(feeCalculation.partnerProfit)}</p></div>
                  )}
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20"><p className="text-sm text-muted-foreground">Owner Profit</p><p className="text-lg font-semibold text-green-600">{formatCurrency(feeCalculation.ownerProfit)}</p></div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20"><p className="text-sm text-muted-foreground">Total Diterima Customer</p><p className="text-lg font-semibold text-primary">{formatCurrency(feeCalculation.receivedAmount)}</p></div>
                </div>
              </div>
            )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !feeCalculation} className="gradient-primary">
              {isSubmitting ? (
                <><LoadingSpinner size="sm" className="mr-2" />Menyimpan...</>
              ) : (
                <><Check className="h-4 w-4 mr-2" />Simpan Transaksi</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Sheet */}
      <Drawer open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="border-b px-6 py-4">
            <DrawerTitle className="text-lg">Detail Transaksi</DrawerTitle>
            <DrawerDescription className="font-mono">{selectedTransaction?.orderId}</DrawerDescription>
          </DrawerHeader>

          {selectedTransaction && (
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6 pb-4">
                {/* Status Timeline */}
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <div className="mt-2">{renderStatusTimeline(selectedTransaction.status)}</div>
                </div>

                {/* Customer Info */}
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Customer</Label>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{selectedTransaction.customer.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedTransaction.customer.whatsapp}</p>
                        </div>
                        <Badge className={LABEL_CONFIG[selectedTransaction.customer.label].color}>
                          {LABEL_CONFIG[selectedTransaction.customer.label].label}
                        </Badge>
                      </div>
                      {selectedTransaction.customer.bank && (
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p><span className="text-muted-foreground">Bank:</span> {selectedTransaction.customer.bank}</p>
                          <p><span className="text-muted-foreground">Rekening:</span> {selectedTransaction.customer.accountNumber}</p>
                          <p><span className="text-muted-foreground">Pemilik:</span> {selectedTransaction.customer.accountHolder}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction Details */}
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Detail Transaksi</Label>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between"><span className="text-muted-foreground">Nominal</span><span className="font-semibold">{formatCurrency(selectedTransaction.nominal)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Payment Type</span><span>{selectedTransaction.paymentType.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{selectedTransaction.method}</span></div>
                      {selectedTransaction.marketplace && <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span>{selectedTransaction.marketplace.name}</span></div>}
                      {selectedTransaction.partner && <div className="flex justify-between"><span className="text-muted-foreground">Partner</span><span>{selectedTransaction.partner.user?.name || 'Unknown'}</span></div>}
                    </CardContent>
                  </Card>
                </div>

                {/* Fee Calculation */}
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Kalkulasi Biaya</Label>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between"><span className="text-muted-foreground">Payment Fee</span><span>{formatCurrency(selectedTransaction.paymentFee)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Platform Fee</span><span>{formatCurrency(selectedTransaction.platformFee)}</span></div>
                      <Separator />
                      <div className="flex justify-between"><span className="text-muted-foreground">Net Margin</span><span className="font-medium">{formatCurrency(selectedTransaction.netMargin)}</span></div>
                      {selectedTransaction.partner && <div className="flex justify-between text-blue-600"><span>Partner Profit</span><span>{formatCurrency(selectedTransaction.partnerProfit)}</span></div>}
                      <div className="flex justify-between text-green-600 font-medium"><span>Owner Profit</span><span>{formatCurrency(selectedTransaction.ownerProfit)}</span></div>
                      <Separator />
                      <div className="flex justify-between font-semibold"><span>Diterima Customer</span><span className="text-primary">{formatCurrency(selectedTransaction.receivedAmount)}</span></div>
                    </CardContent>
                  </Card>
                </div>

                {/* Timestamp */}
                <div className="text-sm text-muted-foreground">
                  <p>Dibuat: {formatDateTime(selectedTransaction.createdAt)}</p>
                  <p>Diperbarui: {formatDateTime(selectedTransaction.updatedAt)}</p>
                </div>

                {/* Actions */}
                {STATUS_TRANSITIONS[selectedTransaction.status].length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Update Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_TRANSITIONS[selectedTransaction.status].map((status) => (
                        <Button key={status} variant="outline" onClick={() => setStatusUpdateDialog(status)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {STATUS_CONFIG[status].label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DrawerContent>
      </Drawer>

      {/* Status Update Confirmation */}
      <AlertDialog open={!!statusUpdateDialog} onOpenChange={() => { setStatusUpdateDialog(null); setStatusUpdateMarketplaceId(''); setStatusUpdateFeePreview(null) }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Update Status</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengubah status menjadi{' '}
              <span className="font-medium">{statusUpdateDialog && STATUS_CONFIG[statusUpdateDialog].label}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Platform selector when transitioning from PENDING to VERIFIED */}
          {statusUpdateDialog === 'VERIFIED' && selectedTransaction?.status === 'PENDING' && (
            <div className="space-y-3 py-2">
              <Label className="text-sm font-medium">Platform (Opsional)</Label>
              <Select
                value={statusUpdateMarketplaceId}
                onValueChange={setStatusUpdateMarketplaceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih platform jika ada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={selectedTransaction.marketplaceId || 'none'}>
                    {selectedTransaction.marketplace?.name || 'Tanpa Platform'} (Saat ini)
                  </SelectItem>
                  {marketplaces
                    .filter(m => m.id !== selectedTransaction.marketplaceId)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Fee Preview */}
              {statusUpdateFeePreview && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                  <p className="font-medium text-xs text-muted-foreground">Preview Kalkulasi:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground text-xs">Platform Fee:</span>
                      <p className="font-medium">{formatCurrency(statusUpdateFeePreview.platformFee)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Owner Profit:</span>
                      <p className="font-medium text-emerald-600">{formatCurrency(statusUpdateFeePreview.ownerProfit)}</p>
                    </div>
                  </div>
                  {selectedTransaction.partner && (
                    <div>
                      <span className="text-muted-foreground text-xs">Partner Profit:</span>
                      <p className="font-medium text-blue-600">{formatCurrency(statusUpdateFeePreview.partnerProfit)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setStatusUpdateMarketplaceId(''); setStatusUpdateFeePreview(null) }}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => statusUpdateDialog && handleStatusUpdate(statusUpdateDialog)}>
              Ya, Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
