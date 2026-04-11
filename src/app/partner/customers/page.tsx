'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDebounce } from '@/hooks/use-debounce'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/loading'
import { useAuthStore } from '@/store/auth'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/calculations'
import { apiFetch } from '@/lib/api'
import type { Customer, CustomerLabel } from '@/types'
import {
  Search,
  UserPlus,
  Eye,
  Phone,
  Building,
  CreditCard,
  MapPin,
  Calendar,
  History,
  X,
  User,
  Users,
  Sparkles,
  Crown,
  Star,
  UserCheck,
  ChevronRight,
  Loader2,
  TrendingUp,
  Wallet,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Label badge configurations with distinct colors
const labelConfig = {
  VIP: { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    icon: Crown
  },
  REGULAR: { 
    bg: 'bg-teal-500/10', 
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/20',
    icon: UserCheck
  },
  NEW: { 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    icon: Star
  },
  BLACKLIST: { 
    bg: 'bg-rose-500/10', 
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
    icon: X
  },
}

// Status badge colors for transactions
const statusConfig = {
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  VERIFIED: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
  PROCESSING: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  CANCELLED: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
}

export default function PartnerCustomersPage() {
  const { partner } = useAuthStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [labelFilter, setLabelFilter] = useState<string>('ALL')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [customerStats, setCustomerStats] = useState<{
    total: number
    vip: number
    regular: number
    new: number
  }>({ total: 0, vip: 0, regular: 0, new: 0 })

  // Form state for new customer
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    bank: '',
    accountNumber: '',
    accountHolder: '',
    city: '',
    label: 'REGULAR' as CustomerLabel,
  })
  const [formLoading, setFormLoading] = useState(false)

  // Customer transaction history
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Fetch customers - Partner can only see customers they added
  const fetchCustomers = useCallback(async () => {
    if (!partner?.id) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      // No searchAll parameter - partner can only see their own customers
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (labelFilter && labelFilter !== 'ALL') params.append('label', labelFilter)

      const response = await apiFetch(`/api/customers?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setCustomers(data.data)
        // Calculate stats
        const total = data.total
        const vip = data.data.filter((c: Customer) => c.label === 'VIP').length
        const regular = data.data.filter((c: Customer) => c.label === 'REGULAR').length
        const newCount = data.data.filter((c: Customer) => c.label === 'NEW').length
        setCustomerStats({ total, vip, regular, new: newCount })
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Gagal memuat data customer')
    } finally {
      setLoading(false)
    }
  }, [partner?.id, debouncedSearch, labelFilter])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Fetch customer detail with transactions
  const fetchCustomerDetail = async (customerId: string) => {
    setLoadingTransactions(true)
    try {
      const response = await apiFetch(`/api/customers/${customerId}`)
      const data = await response.json()

      if (data.success) {
        setCustomerTransactions(data.data.recentTransactions || [])
      }
    } catch (error) {
      console.error('Error fetching customer detail:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  // Handle view customer detail
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailSheet(true)
    fetchCustomerDetail(customer.id)
  }

  // Handle add customer
  const handleAddCustomer = async () => {
    if (!formData.name || !formData.whatsapp) {
      toast.error('Nama dan No WhatsApp wajib diisi')
      return
    }

    // Validate WhatsApp format
    const waRegex = /^08[0-9]{8,12}$/
    if (!waRegex.test(formData.whatsapp.replace(/[\s-]/g, ''))) {
      toast.error('Format No WhatsApp tidak valid (contoh: 08xxxxxxxxxx)')
      return
    }

    // Validate bank info if provided
    if (formData.bank && (!formData.accountNumber || !formData.accountHolder)) {
      toast.error('Jika mengisi Bank, No Rekening dan Nama Pemilik wajib diisi')
      return
    }

    setFormLoading(true)
    try {
      const response = await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          partnerId: partner?.id, // Auto-link to partner
          whatsapp: formData.whatsapp.replace(/[\s-]/g, ''),
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Customer berhasil ditambahkan')
        setShowAddDialog(false)
        setFormData({
          name: '',
          whatsapp: '',
          bank: '',
          accountNumber: '',
          accountHolder: '',
          city: '',
          label: 'REGULAR',
        })
        fetchCustomers()
      } else {
        toast.error(data.error || 'Gagal menambahkan customer')
      }
    } catch (error) {
      console.error('Error adding customer:', error)
      toast.error('Gagal menambahkan customer')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-teal-500 p-4 sm:p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="text-white">
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  Customer Saya
                </h1>
                <p className="text-sm sm:text-base text-white/80 mt-1">
                  Kelola daftar customer Anda
                </p>
              </div>
              <Button 
                onClick={() => setShowAddDialog(true)} 
                className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm min-h-[44px]"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Tambah Customer
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
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-500 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white/80">Total Customer</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{customerStats.total}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
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
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white/80">VIP</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{customerStats.vip}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Crown className="h-5 w-5 sm:h-6 sm:w-6" />
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
                    <p className="text-xs sm:text-sm font-medium text-white/80">Regular</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{customerStats.regular}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />
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
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-green-500 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white/80">Baru</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{customerStats.new}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Star className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau No WA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 sm:h-11"
                />
              </div>
              <Select value={labelFilter} onValueChange={setLabelFilter}>
                <SelectTrigger className="w-full sm:w-40 h-10 sm:h-11">
                  <SelectValue placeholder="Label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Label</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="REGULAR">Regular</SelectItem>
                  <SelectItem value="NEW">Baru</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customer List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-muted" />
                <div className="h-12 w-12 rounded-full border-4 border-t-violet-500 animate-spin absolute inset-0" />
              </div>
              <p className="text-sm text-muted-foreground">Memuat customer...</p>
            </div>
          </div>
        ) : customers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Belum ada customer</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Tambahkan customer baru untuk memulai
                </p>
                <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Tambah Customer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-2 p-4 sm:p-6 bg-gradient-to-r from-muted/50 to-muted/30">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-500" />
                Daftar Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto scroll-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="divide-y">
                  <AnimatePresence mode="popLayout">
                    {customers.map((customer, index) => {
                      const LabelIcon = labelConfig[customer.label]?.icon || User
                      return (
                        <motion.div
                          key={customer.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.99]"
                          onClick={() => handleViewCustomer(customer)}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold truncate text-sm sm:text-base">{customer.name}</p>
                                <Badge 
                                  className={cn(
                                    'text-[10px] sm:text-xs font-medium border',
                                    labelConfig[customer.label]?.bg,
                                    labelConfig[customer.label]?.text,
                                    labelConfig[customer.label]?.border
                                  )}
                                >
                                  <LabelIcon className="h-2.5 w-2.5 mr-1" />
                                  {customer.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.whatsapp}
                                </span>
                                {customer.bank && (
                                  <span className="hidden sm:flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {customer.bank}
                                  </span>
                                )}
                                {customer.city && (
                                  <span className="hidden sm:flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {customer.city}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-[44px] px-3 hidden sm:flex"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewCustomer(customer)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detail
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground sm:hidden" />
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Customer Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-white" />
                </div>
                Tambah Customer Baru
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Customer akan otomatis terhubung dengan akun mitra Anda
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="name" className="text-xs sm:text-sm flex items-center gap-2">
                  <User className="h-3 w-3 text-violet-500" />
                  Nama *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama lengkap customer"
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="whatsapp" className="text-xs sm:text-sm flex items-center gap-2">
                  <Phone className="h-3 w-3 text-violet-500" />
                  No WhatsApp *
                </Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="bank" className="text-xs sm:text-sm flex items-center gap-2">
                    <Building className="h-3 w-3 text-violet-500" />
                    Bank
                  </Label>
                  <Input
                    id="bank"
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    placeholder="BCA, Mandiri, dll"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="accountNumber" className="text-xs sm:text-sm flex items-center gap-2">
                    <CreditCard className="h-3 w-3 text-violet-500" />
                    No Rekening
                  </Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="1234567890"
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="accountHolder" className="text-xs sm:text-sm">Nama Pemilik Rekening</Label>
                <Input
                  id="accountHolder"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                  placeholder="Nama sesuai rekening"
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="city" className="text-xs sm:text-sm flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-violet-500" />
                    Kota
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Jakarta"
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="label" className="text-xs sm:text-sm">Label</Label>
                  <Select
                    value={formData.label}
                    onValueChange={(value: CustomerLabel) =>
                      setFormData({ ...formData, label: value })
                    }
                  >
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="NEW">Baru</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto min-h-[44px]">
                Batal
              </Button>
              <Button 
                onClick={handleAddCustomer} 
                disabled={formLoading} 
                className="w-full sm:w-auto min-h-[44px] bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                {formLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Customer Detail Sheet - Enhanced Mobile Layout */}
        <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
          <SheetContent 
            className="sm:max-w-md overflow-y-auto scroll-touch" 
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <SheetHeader className="pb-2">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <User className="h-5 w-5 text-white" />
                </div>
                Detail Customer
              </SheetTitle>
              <SheetDescription className="text-sm">
                Informasi lengkap customer
              </SheetDescription>
            </SheetHeader>

            {selectedCustomer && (
              <div className="space-y-4 mt-4 pb-8">
                {/* Customer Profile Card - Enhanced */}
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="h-20 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 relative">
                    {/* Decorative circles */}
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
                    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                  </div>
                  <CardContent className="p-4 space-y-3 -mt-10 relative">
                    <div className="flex items-end gap-3">
                      <div className="h-16 w-16 rounded-2xl bg-white dark:bg-card border-4 border-white dark:border-card shadow-xl flex items-center justify-center">
                        <User className="h-8 w-8 text-violet-600" />
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-xl">{selectedCustomer.name}</h3>
                        </div>
                        <Badge 
                          className={cn(
                            'mt-1 text-xs font-semibold border',
                            labelConfig[selectedCustomer.label]?.bg,
                            labelConfig[selectedCustomer.label]?.text,
                            labelConfig[selectedCustomer.label]?.border
                          )}
                        >
                          {selectedCustomer.label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Actions - Touch Friendly */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-3 space-y-1">
                    <a 
                      href={`https://wa.me/62${selectedCustomer.whatsapp?.slice(1)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 -mx-1 rounded-xl hover:bg-muted/50 active:bg-muted/70 transition-colors min-h-[52px]"
                    >
                      <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">WhatsApp</p>
                        <p className="font-semibold">{selectedCustomer.whatsapp}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </a>
                    
                    {selectedCustomer.city && (
                      <div className="flex items-center gap-3 p-3 -mx-1 rounded-xl">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Lokasi</p>
                          <p className="font-semibold">{selectedCustomer.city}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bank Info - Card Layout */}
                {selectedCustomer.bank && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2 p-4 bg-gradient-to-r from-muted/50 to-muted/30">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building className="h-4 w-4 text-violet-500" />
                        Informasi Bank
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                          <Building className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Nama Bank</p>
                          <p className="font-semibold">{selectedCustomer.bank}</p>
                        </div>
                      </div>
                      {selectedCustomer.accountNumber && (
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-teal-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">No. Rekening</p>
                            <p className="font-semibold font-mono">{selectedCustomer.accountNumber}</p>
                          </div>
                        </div>
                      )}
                      {selectedCustomer.accountHolder && (
                        <div className="p-3 rounded-xl bg-muted/50">
                          <p className="text-xs text-muted-foreground">Atas Nama</p>
                          <p className="font-semibold">{selectedCustomer.accountHolder}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Stats - Enhanced Visual */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg overflow-hidden">
                    <CardContent className="p-3 text-center relative">
                      <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                      <p className="text-[10px] text-white/80">Transaksi</p>
                      <p className="text-xl font-bold mt-0.5">{selectedCustomer.totalTransactions}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-0 shadow-lg overflow-hidden">
                    <CardContent className="p-3 text-center relative">
                      <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                      <p className="text-[10px] text-white/80">Volume</p>
                      <p className="text-sm font-bold mt-0.5 truncate">{formatCurrency(selectedCustomer.totalVolume)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg overflow-hidden">
                    <CardContent className="p-3 text-center relative">
                      <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                      <p className="text-[10px] text-white/80">Kontribusi</p>
                      <p className="text-sm font-bold mt-0.5 truncate">{formatCurrency(selectedCustomer.totalContribution)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction History - Enhanced */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-2 p-4 bg-gradient-to-r from-muted/50 to-muted/30">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4 text-violet-500" />
                      Riwayat Transaksi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    {loadingTransactions ? (
                      <div className="flex justify-center py-8">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full border-4 border-muted" />
                          <div className="h-10 w-10 rounded-full border-4 border-t-violet-500 animate-spin absolute inset-0" />
                        </div>
                      </div>
                    ) : customerTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                          <History className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                      </div>
                    ) : (
                      <div 
                        className="max-h-64 overflow-y-auto scroll-touch space-y-2" 
                        style={{ WebkitOverflowScrolling: 'touch' }}
                      >
                        {customerTransactions.map((tx) => (
                          <div 
                            key={tx.id} 
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                                <Hash className="h-4 w-4 text-violet-600" />
                              </div>
                              <div>
                                <p className="text-sm font-mono font-medium">{tx.orderId.slice(-10)}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatDateTime(tx.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">
                                {formatCurrency(tx.nominal)}
                              </p>
                              <Badge 
                                className={cn(
                                  'text-[10px] mt-0.5',
                                  statusConfig[tx.status as keyof typeof statusConfig]?.bg,
                                  statusConfig[tx.status as keyof typeof statusConfig]?.text
                                )}
                              >
                                {tx.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Join Date */}
                <Card className="bg-muted/30 border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bergabung sejak</p>
                        <p className="font-medium">{formatDate(selectedCustomer.createdAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Info Note */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Eye className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sebagai mitra, Anda tidak dapat mengedit atau menghapus data customer. Silakan hubungi owner untuk perubahan data.
                  </p>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  )
}
