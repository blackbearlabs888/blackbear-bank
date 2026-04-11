'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Ban,
  Users,
  MapPin,
  Phone,
  Building,
  User,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  X,
  Crown,
  Sparkles,
  UserX,
  MoreHorizontal,
  Mail,
} from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/calculations'
import { apiFetch } from '@/lib/api'
import type { Customer, CustomerLabel, Transaction } from '@/types'

interface CustomerWithCount extends Customer {
  transactionCount?: number
  partner?: {
    id: string
    user: {
      name: string
      email: string
    }
  }
}

interface CustomerStats {
  totalContribution: number
  totalVolume: number
  totalTransactions: number
}

interface CustomerDetail extends Customer {
  stats: CustomerStats
  recentTransactions: (Transaction & {
    paymentType: { name: string }
    marketplace: { name: string } | null
    partner: { user: { name: string } } | null
  })[]
}

interface CityDistribution {
  city: string
  count: number
}

interface CustomersResponse {
  success: boolean
  data: CustomerWithCount[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  cityDistribution: CityDistribution[]
}

const LABEL_CONFIG: Record<CustomerLabel, { color: string; bgColor: string; icon: React.ElementType }> = {
  VIP: { color: 'text-amber-700', bgColor: 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 border-amber-200 dark:border-amber-800', icon: Crown },
  REGULAR: { color: 'text-blue-700', bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', icon: User },
  NEW: { color: 'text-emerald-700', bgColor: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-emerald-200 dark:border-emerald-800', icon: Sparkles },
  BLACKLIST: { color: 'text-red-700', bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800', icon: UserX },
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  VERIFIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
}

export default function OwnerCustomersPage() {
  // State
  const [customers, setCustomers] = useState<CustomerWithCount[]>([])
  const [cityDistribution, setCityDistribution] = useState<CityDistribution[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [labelFilter, setLabelFilter] = useState<string>('ALL')
  const [cityFilter, setCityFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Stats counts (calculated from API response)
  const [vipCount, setVipCount] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [blacklistCount, setBlacklistCount] = useState(0)

  // Dialogs
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithCount | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerWithCount | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    bank: '',
    accountNumber: '',
    accountHolder: '',
    city: '',
    label: 'NEW' as CustomerLabel,
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (labelFilter !== 'ALL') params.set('label', labelFilter)
      if (cityFilter !== 'ALL') params.set('city', cityFilter)
      params.set('page', page.toString())
      params.set('pageSize', '20')

      const response = await apiFetch(`/api/customers?${params.toString()}`)
      const data: CustomersResponse = await response.json()

      if (data.success) {
        setCustomers(data.data)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setCityDistribution(data.cityDistribution)
        
        // Calculate label counts from all data (approximate from current page)
        // For accurate counts, we'd need a separate API call
        setVipCount(data.data.filter(c => c.label === 'VIP').length)
        setNewCount(data.data.filter(c => c.label === 'NEW').length)
        setBlacklistCount(data.data.filter(c => c.label === 'BLACKLIST').length)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }, [search, labelFilter, cityFilter, page])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Mask WhatsApp number
  const maskWhatsApp = (wa: string) => {
    if (wa.length <= 5) return wa
    return wa.substring(0, 3) + '***' + wa.substring(wa.length - 3)
  }

  // Open detail dialog
  const openDetailDialog = async (customer: CustomerWithCount) => {
    try {
      const response = await apiFetch(`/api/customers/${customer.id}`)
      const data = await response.json()
      if (data.success) {
        setSelectedCustomer(data.data)
        setDetailDialogOpen(true)
      }
    } catch (error) {
      console.error('Error fetching customer detail:', error)
    }
  }

  // Open edit dialog
  const openEditDialog = (customer: CustomerWithCount) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      whatsapp: customer.whatsapp,
      bank: customer.bank || '',
      accountNumber: customer.accountNumber || '',
      accountHolder: customer.accountHolder || '',
      city: customer.city || '',
      label: customer.label,
    })
    setEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (customer: CustomerWithCount) => {
    setDeletingCustomer(customer)
    setDeleteDialogOpen(true)
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      whatsapp: '',
      bank: '',
      accountNumber: '',
      accountHolder: '',
      city: '',
      label: 'NEW',
    })
    setFormError('')
  }

  // Handle add customer
  const handleAddCustomer = async () => {
    setFormLoading(true)
    setFormError('')

    try {
      const response = await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!data.success) {
        setFormError(data.error || 'Gagal menambahkan customer')
        return
      }

      setAddDialogOpen(false)
      resetForm()
      fetchCustomers()
    } catch (error) {
      console.error('Error adding customer:', error)
      setFormError('Terjadi kesalahan')
    } finally {
      setFormLoading(false)
    }
  }

  // Handle edit customer
  const handleEditCustomer = async () => {
    if (!editingCustomer) return

    setFormLoading(true)
    setFormError('')

    try {
      const response = await apiFetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!data.success) {
        setFormError(data.error || 'Gagal memperbarui customer')
        return
      }

      setEditDialogOpen(false)
      resetForm()
      setEditingCustomer(null)
      fetchCustomers()
    } catch (error) {
      console.error('Error updating customer:', error)
      setFormError('Terjadi kesalahan')
    } finally {
      setFormLoading(false)
    }
  }

  // Handle delete/blacklist customer
  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return

    setFormLoading(true)

    try {
      const response = await apiFetch(`/api/customers/${deletingCustomer.id}?action=blacklist`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || 'Gagal menghapus customer')
        return
      }

      setDeleteDialogOpen(false)
      setDeletingCustomer(null)
      fetchCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('Terjadi kesalahan')
    } finally {
      setFormLoading(false)
    }
  }

  // Handle blacklist
  const handleBlacklist = async (customer: CustomerWithCount) => {
    try {
      const response = await apiFetch(`/api/customers/${customer.id}?action=blacklist`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        fetchCustomers()
      } else {
        alert(data.error || 'Gagal blacklist customer')
      }
    } catch (error) {
      console.error('Error blacklisting customer:', error)
      alert('Terjadi kesalahan')
    }
  }

  // Filter by city from heatmap
  const handleCityClick = (city: string) => {
    setCityFilter(city)
    setPage(1)
  }

  // Customer Form Component
  const CustomerForm = () => (
    <div className="space-y-6">
      {formError && (
        <div className="p-3 text-sm text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {formError}
        </div>
      )}
      
      {/* Personal Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Informasi Pribadi</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="name" className="text-sm">Nama Lengkap *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama customer"
              className="h-10"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="whatsapp" className="text-sm">No WhatsApp *</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city" className="text-sm">Kota</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Nama kota"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label" className="text-sm">Label</Label>
            <Select
              value={formData.label}
              onValueChange={(value) => setFormData({ ...formData, label: value as CustomerLabel })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
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

      <Separator />

      {/* Bank Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building className="h-4 w-4" />
          <span>Informasi Bank (Opsional)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
          <div className="space-y-2">
            <Label htmlFor="bank" className="text-sm">Nama Bank</Label>
            <Input
              id="bank"
              value={formData.bank}
              onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
              placeholder="BCA, Mandiri, dll"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber" className="text-sm">No Rekening</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="Nomor rekening"
              className="h-10"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="accountHolder" className="text-sm">Nama Pemilik Rekening</Label>
            <Input
              id="accountHolder"
              value={formData.accountHolder}
              onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
              placeholder="Nama di rekening"
              className="h-10"
            />
          </div>
        </div>
      </div>
    </div>
  )

  // Stats Card Component
  const StatsCard = ({ 
    title, 
    value, 
    icon: Icon, 
    iconBgColor, 
    iconColor,
    description 
  }: { 
    title: string
    value: number | string
    icon: React.ElementType
    iconBgColor: string
    iconColor: string
    description?: string
  }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${iconBgColor}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold truncate">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Manajemen Customer</h1>
            <p className="text-sm text-muted-foreground">
              Kelola data customer, lihat distribusi kota, dan riwayat transaksi
            </p>
          </div>
          <Button onClick={() => { resetForm(); setAddDialogOpen(true) }} className="w-full sm:w-auto h-10">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Customer
          </Button>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Total Customer"
            value={total}
            icon={Users}
            iconBgColor="bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <StatsCard
            title="Customer VIP"
            value={vipCount}
            icon={Crown}
            iconBgColor="bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
            description="Prioritas tinggi"
          />
          <StatsCard
            title="Customer Baru"
            value={newCount}
            icon={Sparkles}
            iconBgColor="bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
            description="Belum lama bergabung"
          />
          <StatsCard
            title="Blacklist"
            value={blacklistCount}
            icon={UserX}
            iconBgColor="bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30"
            iconColor="text-red-600 dark:text-red-400"
            description="Diblokir"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Heatmap Kota - Sidebar */}
          <Card className="lg:col-span-3 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-violet-500" />
                Distribusi Kota
              </CardTitle>
              <CardDescription className="text-xs">
                Klik kota untuk memfilter customer
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {cityDistribution.length === 0 ? (
                  <div className="p-6 text-center">
                    <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Belum ada data kota</p>
                  </div>
                ) : (
                  <div className="px-4 pb-4 space-y-2">
                    {cityDistribution.map((item, index) => {
                      const maxCount = Math.max(...cityDistribution.map(c => c.count))
                      const percentage = (item.count / maxCount) * 100
                      const isActive = cityFilter === item.city
                      
                      return (
                        <button
                          key={item.city || `unknown-${index}`}
                          onClick={() => handleCityClick(item.city || '')}
                          className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                            isActive
                              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-sm'
                              : 'border-border hover:border-violet-300 dark:hover:border-violet-700 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm truncate pr-2">{item.city || 'Tidak diketahui'}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {item.count}
                            </Badge>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isActive 
                                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' 
                                  : 'bg-gradient-to-r from-violet-400 to-fuchsia-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
              {cityFilter !== 'ALL' && (
                <div className="p-4 border-t bg-muted/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-9"
                    onClick={() => { setCityFilter('ALL'); setPage(1) }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reset Filter Kota
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Table */}
          <Card className="lg:col-span-9 overflow-hidden">
            <CardHeader className="pb-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, WA, kota, bank..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    className="pl-10 h-10"
                  />
                </div>
                <Select value={labelFilter} onValueChange={(v) => { setLabelFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-full sm:w-[160px] h-10">
                    <SelectValue placeholder="Filter Label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Label</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="BLACKLIST">Blacklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium">Tidak ada customer ditemukan</p>
                  <p className="text-sm text-muted-foreground mt-1">Coba ubah filter atau tambah customer baru</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold">Nama</TableHead>
                          <TableHead className="font-semibold hidden sm:table-cell">WA</TableHead>
                          <TableHead className="font-semibold hidden md:table-cell">Bank</TableHead>
                          <TableHead className="font-semibold hidden lg:table-cell">No Rek</TableHead>
                          <TableHead className="font-semibold hidden xl:table-cell">Pemilik</TableHead>
                          <TableHead className="font-semibold">Label</TableHead>
                          <TableHead className="font-semibold hidden md:table-cell">Kota</TableHead>
                          <TableHead className="font-semibold text-right w-[100px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((customer) => {
                          const labelConfig = LABEL_CONFIG[customer.label]
                          const LabelIcon = labelConfig.icon
                          
                          return (
                            <TableRow 
                              key={customer.id} 
                              className={customer.label === 'BLACKLIST' ? 'opacity-50 bg-red-50/50 dark:bg-red-900/10' : ''}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30">
                                    <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                                      {customer.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="truncate max-w-[120px] sm:max-w-none">{customer.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <span className="font-mono text-sm">{maskWhatsApp(customer.whatsapp)}</span>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="truncate max-w-[80px] block">{customer.bank || '-'}</span>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="font-mono text-sm">{customer.accountNumber || '-'}</span>
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                <span className="truncate max-w-[100px] block">{customer.accountHolder || '-'}</span>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${labelConfig.bgColor} ${labelConfig.color} border font-medium`}>
                                  <LabelIcon className="h-3 w-3 mr-1" />
                                  {customer.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="truncate max-w-[80px] block">{customer.city || '-'}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openDetailDialog(customer)}
                                    title="Detail"
                                    className="h-8 w-8"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(customer)}
                                    title="Edit"
                                    className="h-8 w-8"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {customer.label !== 'BLACKLIST' ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleBlacklist(customer)}
                                      title="Blacklist"
                                      className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                    >
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDeleteDialog(customer)}
                                      title="Hapus"
                                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground order-2 sm:order-1">
                    Menampilkan {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} dari {total} customer
                  </p>
                  <div className="flex gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-9"
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-9"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Note about quick add from landing page */}
        <Card className="bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50 dark:from-violet-900/10 dark:to-fuchsia-900/10 border-violet-200/50 dark:border-violet-800/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 shrink-0">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-violet-900 dark:text-violet-200">Penambahan Otomatis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Customer ditambahkan secara otomatis dari pesanan landing page. 
                  Ketika customer baru melakukan order melalui halaman /order, data mereka akan tersimpan otomatis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-xl">Detail Customer</DialogTitle>
            <DialogDescription>Informasi lengkap dan riwayat transaksi customer</DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="flex-1 overflow-y-auto scroll-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 opacity-80" />
                        <div>
                          <p className="text-xs opacity-90">Total Kontribusi Profit</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(selectedCustomer.stats.totalContribution)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5 opacity-80" />
                        <div>
                          <p className="text-xs opacity-90">Total Transaksi</p>
                          <p className="text-lg font-bold">{selectedCustomer.stats.totalTransactions}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-emerald-500 to-green-500 text-white border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 opacity-80" />
                        <div>
                          <p className="text-xs opacity-90">Total Volume</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(selectedCustomer.stats.totalVolume)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Personal & Bank Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4 text-violet-500" />
                        Info Pribadi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Nama</span>
                        <span className="text-sm font-medium">{selectedCustomer.name}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">WhatsApp</span>
                        <span className="text-sm font-mono">{selectedCustomer.whatsapp}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Kota</span>
                        <span className="text-sm">{selectedCustomer.city || '-'}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Label</span>
                        <Badge className={`${LABEL_CONFIG[selectedCustomer.label].bgColor} ${LABEL_CONFIG[selectedCustomer.label].color} border`}>
                          {selectedCustomer.label}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Bergabung</span>
                        <span className="text-sm">{formatDate(selectedCustomer.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building className="h-4 w-4 text-violet-500" />
                        Info Bank
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Bank</span>
                        <span className="text-sm">{selectedCustomer.bank || '-'}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">No Rekening</span>
                        <span className="text-sm font-mono">{selectedCustomer.accountNumber || '-'}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Nama Pemilik</span>
                        <span className="text-sm">{selectedCustomer.accountHolder || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction History */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Riwayat Transaksi Terbaru</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCustomer.recentTransactions.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[280px]">
                        <div className="space-y-2 pr-4">
                          {selectedCustomer.recentTransactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-muted/30 gap-3"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs sm:text-sm">{tx.orderId}</span>
                                  <Badge className={`${STATUS_COLORS[tx.status]} border text-xs`}>
                                    {tx.status}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span className="font-medium">{formatCurrency(tx.nominal)}</span>
                                  <span>•</span>
                                  <span>{tx.paymentType?.name}</span>
                                  <span>•</span>
                                  <span>{tx.method}</span>
                                </div>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(tx.receivedAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(tx.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-xl">Tambah Customer Baru</DialogTitle>
            <DialogDescription>Masukkan informasi customer baru</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scroll-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-6">
              <CustomerForm />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="h-10">
              Batal
            </Button>
            <Button onClick={handleAddCustomer} disabled={formLoading} className="h-10">
              {formLoading ? 'Menyimpan...' : 'Simpan Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-xl">Edit Customer</DialogTitle>
            <DialogDescription>Perbarui informasi customer</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scroll-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-6">
              <CustomerForm />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="h-10">
              Batal
            </Button>
            <Button onClick={handleEditCustomer} disabled={formLoading} className="h-10">
              {formLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete/Blacklist Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingCustomer?.label === 'BLACKLIST' ? 'Hapus Customer' : 'Blacklist Customer'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCustomer?.label === 'BLACKLIST'
                ? `Apakah Anda yakin ingin menghapus "${deletingCustomer?.name}" secara permanen? Tindakan ini tidak dapat dibatalkan.`
                : `Apakah Anda yakin ingin blacklist "${deletingCustomer?.name}"? Customer yang di-blacklist tidak dapat melakukan transaksi baru.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-red-600 hover:bg-red-700"
            >
              {formLoading ? 'Memproses...' : deletingCustomer?.label === 'BLACKLIST' ? 'Hapus Permanen' : 'Blacklist'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
