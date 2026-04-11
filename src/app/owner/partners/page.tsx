'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  UserCheck,
  UserX,
  Trophy,
  Megaphone,
  Loader2,
  Users,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building2,
  Wallet,
  Star,
  Target,
  Crown,
  Award,
  Zap,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Key,
} from 'lucide-react'
import { formatCurrency, formatDate, formatNumber } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import type { Partner, PartnerTier, PartnerBadge, PartnerStatus } from '@/types'

interface PartnerWithExtras extends Partner {
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
    createdAt: string
  }
  targetProgress: number
  tierProgress: number
  calculatedTier: string
}

interface PartnerDetail extends PartnerWithExtras {
  _count?: {
    transactions: number
    customers: number
  }
  recentTransactions?: Array<{
    id: string
    orderId: string
    nominal: number
    status: string
    createdAt: string
    customer: {
      name: string
      whatsapp: string
    }
    paymentType: {
      name: string
    }
  }>
}

// Tier configuration
const tierConfig: Record<PartnerTier, { color: string; bgColor: string; minProfit: number }> = {
  Bronze: { color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30', minProfit: 0 },
  Silver: { color: 'text-gray-700', bgColor: 'bg-gray-100 dark:bg-gray-800', minProfit: 5000000 },
  Gold: { color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', minProfit: 10000000 },
  Platinum: { color: 'text-purple-700', bgColor: 'bg-purple-100 dark:bg-purple-900/30', minProfit: 25000000 },
  Diamond: { color: 'text-cyan-700', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', minProfit: 50000000 },
}

// Badge configuration
const badgeConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  Champion: { icon: <Crown className="h-3 w-3" />, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  'Top Performer': { icon: <Star className="h-3 w-3" />, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  'Rising Star': { icon: <Zap className="h-3 w-3" />, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  Veteran: { icon: <Award className="h-3 w-3" />, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
}

export default function OwnerPartnersPage() {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [partners, setPartners] = useState<PartnerWithExtras[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')

  // Mobile filter drawer
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [showGamification, setShowGamification] = useState(!isMobile)

  // Dialogs state
  const [selectedPartner, setSelectedPartner] = useState<PartnerDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [partnerToSuspend, setPartnerToSuspend] = useState<PartnerWithExtras | null>(null)
  const [editingCommission, setEditingCommission] = useState<string | null>(null)
  const [commissionValue, setCommissionValue] = useState('')

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [partnerToChangePassword, setPartnerToChangePassword] = useState<PartnerWithExtras | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Detail sheet edit state
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetValue, setTargetValue] = useState('')
  const [editingSheetCommission, setEditingSheetCommission] = useState(false)
  const [sheetCommissionValue, setSheetCommissionValue] = useState('')
  const [updating, setUpdating] = useState(false)

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    password: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    city: '',
    tier: 'Bronze' as PartnerTier,
    status: 'ACTIVE' as PartnerStatus,
    commissionRate: 30,
    targetAmount: 5000000,
  })
  const [addingPartner, setAddingPartner] = useState(false)

  // Fetch partners
  const fetchPartners = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (tierFilter !== 'all') params.append('tier', tierFilter)
      if (search) params.append('search', search)

      const response = await fetch(`/api/partners?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setPartners(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal mengambil data partner',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, tierFilter, search, toast])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  // Fetch partner detail
  const fetchPartnerDetail = async (partnerId: string) => {
    try {
      const response = await fetch(`/api/partners/${partnerId}`)
      const result = await response.json()

      if (result.success) {
        setSelectedPartner(result.data)
        setDetailOpen(true)
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal mengambil detail partner',
      })
    }
  }

  // Toggle partner status
  const togglePartnerStatus = async (partner: PartnerWithExtras) => {
    const newStatus = partner.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    try {
      const response = await fetch(`/api/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: `Partner berhasil di-${newStatus === 'ACTIVE' ? 'aktifkan' : 'suspend'}`,
        })
        fetchPartners()
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal mengubah status partner',
      })
    }
    setSuspendDialogOpen(false)
    setPartnerToSuspend(null)
  }

  // Update commission
  const updateCommission = async (partnerId: string) => {
    const commission = parseFloat(commissionValue)
    if (isNaN(commission) || commission < 0 || commission > 100) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Komisi harus antara 0-100%',
      })
      return
    }

    try {
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRate: commission }),
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'Komisi berhasil diperbarui',
        })
        fetchPartners()
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memperbarui komisi',
      })
    }
    setEditingCommission(null)
    setCommissionValue('')
  }

  // Update target amount (for detail sheet)
  const updateTarget = async () => {
    if (!selectedPartner) return
    
    const target = parseFloat(targetValue)
    if (isNaN(target) || target < 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Target harus berupa angka positif',
      })
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/partners/${selectedPartner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAmount: target }),
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'Target berhasil diperbarui',
        })
        fetchPartners()
        fetchPartnerDetail(selectedPartner.id)
        setEditingTarget(false)
        setTargetValue('')
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memperbarui target',
      })
    } finally {
      setUpdating(false)
    }
  }

  // Update commission in detail sheet
  const updateCommissionInSheet = async () => {
    if (!selectedPartner) return
    
    const commission = parseFloat(sheetCommissionValue)
    if (isNaN(commission) || commission < 0 || commission > 100) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Komisi harus antara 0-100%',
      })
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/partners/${selectedPartner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRate: commission }),
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'Komisi berhasil diperbarui',
        })
        fetchPartners()
        fetchPartnerDetail(selectedPartner.id)
        setEditingSheetCommission(false)
        setSheetCommissionValue('')
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memperbarui komisi',
      })
    } finally {
      setUpdating(false)
    }
  }

  // Override tier
  const overrideTier = async (partnerId: string, newTier: PartnerTier) => {
    try {
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: `Tier berhasil diubah ke ${newTier}`,
        })
        fetchPartners()
        if (selectedPartner?.id === partnerId) {
          fetchPartnerDetail(partnerId)
        }
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal mengubah tier',
      })
    }
  }

  // Add new partner
  const addPartner = async () => {
    if (!addForm.name || !addForm.email || !addForm.whatsapp || !addForm.password ||
        !addForm.bankName || !addForm.accountNumber || !addForm.accountHolder || !addForm.city) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Semua field wajib diisi',
      })
      return
    }

    setAddingPartner(true)
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'Partner berhasil ditambahkan',
        })
        setAddDialogOpen(false)
        setAddForm({
          name: '',
          email: '',
          whatsapp: '',
          password: '',
          bankName: '',
          accountNumber: '',
          accountHolder: '',
          city: '',
          tier: 'Bronze',
          status: 'ACTIVE',
          commissionRate: 30,
          targetAmount: 5000000,
        })
        fetchPartners()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menambahkan partner',
      })
    } finally {
      setAddingPartner(false)
    }
  }

  // Change partner password
  const changePassword = async () => {
    if (!partnerToChangePassword || !newPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Password tidak boleh kosong',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Password minimal 6 karakter',
      })
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch(`/api/partners/${partnerToChangePassword.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'Password partner berhasil diperbarui',
        })
        setPasswordDialogOpen(false)
        setPartnerToChangePassword(null)
        setNewPassword('')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengubah password',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  // Apply filters and close drawer
  const applyFilters = () => {
    fetchPartners()
    setShowFilterDrawer(false)
  }

  // Reset filters
  const resetFilters = () => {
    setStatusFilter('all')
    setTierFilter('all')
    setSearch('')
  }

  // Render partner card for mobile
  const renderPartnerCard = (partner: PartnerWithExtras) => (
    <Card 
      key={partner.id} 
      className="overflow-hidden"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={partner.user.avatar || undefined} />
            <AvatarFallback className="gradient-primary text-white text-sm">
              {partner.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium truncate">{partner.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{partner.user.email}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => fetchPartnerDetail(partner.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Lihat Detail
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setPartnerToSuspend(partner)
                      setSuspendDialogOpen(true)
                    }}
                  >
                    {partner.status === 'ACTIVE' ? (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        Suspend
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Aktifkan
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => overrideTier(partner.id, 'Gold')}>
                    <Trophy className="h-4 w-4 mr-2" />
                    Override Tier
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setPartnerToChangePassword(partner)
                      setPasswordDialogOpen(true)
                    }}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Ganti Password
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Tier & Status */}
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`${tierConfig[partner.tier as PartnerTier]?.bgColor} ${tierConfig[partner.tier as PartnerTier]?.color} border-0 text-xs`}>
                {partner.tier}
              </Badge>
              {partner.badge && (
                <Badge className={`${badgeConfig[partner.badge]?.bgColor} ${badgeConfig[partner.badge]?.color} border-0 gap-1 text-xs`}>
                  {badgeConfig[partner.badge]?.icon}
                  {partner.badge}
                </Badge>
              )}
              <Badge
                variant={partner.status === 'ACTIVE' ? 'default' : 'secondary'}
                className={cn(
                  'text-xs',
                  partner.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                )}
              >
                {partner.status}
              </Badge>
            </div>
            
            {/* Stats Row */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div>
                <span className="text-muted-foreground">Komisi: </span>
                <button
                  className="font-medium text-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingCommission(partner.id)
                    setCommissionValue(partner.commissionRate.toString())
                  }}
                >
                  {partner.commissionRate.toFixed(1)}%
                </button>
              </div>
              <div>
                <span className="text-muted-foreground">Profit: </span>
                <span className="font-medium text-green-600">{formatCurrency(partner.totalProfit)}</span>
              </div>
            </div>
            
            {/* Progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Target</span>
                <span>{partner.targetProgress.toFixed(0)}%</span>
              </div>
              <Progress value={partner.targetProgress} className="h-1.5" />
            </div>
          </div>
        </div>
        
        {/* Inline Commission Editor */}
        {editingCommission === partner.id && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              value={commissionValue}
              onChange={(e) => setCommissionValue(e.target.value)}
              className="w-20 h-8 text-sm"
            />
            <span className="text-sm">%</span>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => updateCommission(partner.id)}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => { setEditingCommission(null); setCommissionValue('') }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Add Partner Form Component
  const AddPartnerForm = () => (
    <div className="grid gap-4 py-4">
      {/* Personal Info */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Informasi Personal</h4>
        <div className="grid gap-2">
          <Label htmlFor="name" className="text-xs">Nama *</Label>
          <Input
            id="name"
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            placeholder="Nama lengkap"
            className="h-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs">Email *</Label>
            <Input
              id="email"
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              placeholder="email@example.com"
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="whatsapp" className="text-xs">No. WA *</Label>
            <Input
              id="whatsapp"
              value={addForm.whatsapp}
              onChange={(e) => setAddForm({ ...addForm, whatsapp: e.target.value })}
              placeholder="08xxx"
              className="h-10"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className="text-xs">Password *</Label>
          <Input
            id="password"
            type="password"
            value={addForm.password}
            onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
            placeholder="Minimal 6 karakter"
            className="h-10"
          />
        </div>
      </div>

      <Separator />

      {/* Location */}
      <div className="grid gap-2">
        <Label htmlFor="city" className="text-xs">Kota *</Label>
        <Input
          id="city"
          value={addForm.city}
          onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
          placeholder="Nama kota"
          className="h-10"
        />
      </div>

      <Separator />

      {/* Bank Info */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Informasi Bank</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="bankName" className="text-xs">Nama Bank *</Label>
            <Input
              id="bankName"
              value={addForm.bankName}
              onChange={(e) => setAddForm({ ...addForm, bankName: e.target.value })}
              placeholder="BCA"
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accountNumber" className="text-xs">No. Rek *</Label>
            <Input
              id="accountNumber"
              value={addForm.accountNumber}
              onChange={(e) => setAddForm({ ...addForm, accountNumber: e.target.value })}
              placeholder="123456"
              className="h-10"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="accountHolder" className="text-xs">Nama Pemilik *</Label>
          <Input
            id="accountHolder"
            value={addForm.accountHolder}
            onChange={(e) => setAddForm({ ...addForm, accountHolder: e.target.value })}
            placeholder="Nama sesuai rekening"
            className="h-10"
          />
        </div>
      </div>

      <Separator />

      {/* Settings */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Pengaturan</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label className="text-xs">Tier</Label>
            <Select
              value={addForm.tier}
              onValueChange={(value: PartnerTier) => setAddForm({ ...addForm, tier: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bronze">Bronze</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
                <SelectItem value="Diamond">Diamond</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Status</Label>
            <Select
              value={addForm.status}
              onValueChange={(value: PartnerStatus) => setAddForm({ ...addForm, status: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label className="text-xs">Komisi %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={addForm.commissionRate}
              onChange={(e) => setAddForm({ ...addForm, commissionRate: parseFloat(e.target.value) || 0 })}
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Target</Label>
            <Input
              type="number"
              value={addForm.targetAmount}
              onChange={(e) => setAddForm({ ...addForm, targetAmount: parseFloat(e.target.value) || 0 })}
              className="h-10"
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Manajemen Partner</h1>
            <p className="text-sm text-muted-foreground">Kelola partner Black Bear Gestun</p>
          </div>
          
          {isMobile ? (
            <Button 
              onClick={() => setAddDialogOpen(true)}
              className="gradient-primary gradient-primary-hover text-white w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Partner
            </Button>
          ) : (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gradient-primary-hover text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Partner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Tambah Partner Baru</DialogTitle>
                  <DialogDescription>
                    Isi data partner baru di bawah ini
                  </DialogDescription>
                </DialogHeader>
                <AddPartnerForm />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    className="gradient-primary gradient-primary-hover text-white"
                    onClick={addPartner}
                    disabled={addingPartner}
                  >
                    {addingPartner ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Partner'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Gamification Rules Card - Collapsible on Mobile */}
        <Card>
          {isMobile ? (
            <>
              <button
                onClick={() => setShowGamification(!showGamification)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Aturan Gamifikasi
                </CardTitle>
                {showGamification ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showGamification && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Tier Thresholds */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-muted-foreground">Tier Thresholds</h5>
                      <div className="space-y-1">
                        {Object.entries(tierConfig).map(([tier, config]) => (
                          <div key={tier} className="flex items-center justify-between">
                            <Badge className={`${config.bgColor} ${config.color} border-0 text-[10px]`}>
                              {tier}
                            </Badge>
                            <span className="text-muted-foreground">{formatCurrency(config.minProfit)}+</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Badge Requirements */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-muted-foreground">Badges</h5>
                      <div className="space-y-1">
                        {Object.entries(badgeConfig).map(([badge, config]) => (
                          <Badge key={badge} className={`${config.bgColor} ${config.color} border-0 gap-1 text-[10px]`}>
                            {config.icon}
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Aturan Gamifikasi
                </CardTitle>
                <CardDescription>
                  Sistem tier dan badge partner berdasarkan performa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Tier Thresholds */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm text-muted-foreground">Tier Thresholds</h5>
                    <div className="space-y-1">
                      {Object.entries(tierConfig).map(([tier, config]) => (
                        <div key={tier} className="flex items-center justify-between text-sm">
                          <Badge className={`${config.bgColor} ${config.color} border-0`}>
                            {tier}
                          </Badge>
                          <span className="text-muted-foreground">
                            {formatCurrency(config.minProfit)}+
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Badge Requirements */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm text-muted-foreground">Badge Requirements</h5>
                    <div className="space-y-1">
                      {Object.entries(badgeConfig).map(([badge, config]) => (
                        <div key={badge} className="flex items-center gap-2 text-sm">
                          <Badge className={`${config.bgColor} ${config.color} border-0 gap-1`}>
                            {config.icon}
                            {badge}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Auto-update Rules */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm text-muted-foreground">Auto-Update Rules</h5>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Tier otomatis naik berdasarkan total profit</p>
                      <p>• Badge diberikan manual oleh Owner</p>
                      <p>• Progress dihitung setiap bulan</p>
                      <p>• Ranking direset setiap awal bulan</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Filters */}
        {isMobile ? (
          <>
            {/* Mobile Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 shrink-0"
                onClick={() => setShowFilterDrawer(true)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, email, kota..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tier</SelectItem>
                    <SelectItem value="Bronze">Bronze</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                    <SelectItem value="Diamond">Diamond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Partners List/Table */}
        {isMobile ? (
          /* Mobile Card List */
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Tidak ada partner ditemukan
              </div>
            ) : (
              partners.map(renderPartnerCard)
            )}
          </div>
        ) : (
          /* Desktop Table */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daftar Partner ({partners.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : partners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Tidak ada partner ditemukan
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Tgl Bergabung</TableHead>
                        <TableHead>Target Progress</TableHead>
                        <TableHead>Tier/Badge</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Komisi %</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partners.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={partner.user.avatar || undefined} />
                                <AvatarFallback className="gradient-primary text-white text-xs">
                                  {partner.user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{partner.user.name}</p>
                                <p className="text-xs text-muted-foreground">{partner.user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(partner.user.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-32">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Target Profit</span>
                                <span>{partner.targetProgress.toFixed(1)}%</span>
                              </div>
                              <Progress value={partner.targetProgress} className="h-2" />
                              <div className="flex items-center justify-between text-xs mt-1 text-muted-foreground">
                                <span>{formatCurrency(partner.totalProfit)}</span>
                                <span>{formatCurrency(partner.targetAmount)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge className={`${tierConfig[partner.tier as PartnerTier]?.bgColor} ${tierConfig[partner.tier as PartnerTier]?.color} border-0`}>
                                {partner.tier}
                              </Badge>
                              {partner.badge && (
                                <Badge className={`${badgeConfig[partner.badge]?.bgColor} ${badgeConfig[partner.badge]?.color} border-0 gap-1`}>
                                  {badgeConfig[partner.badge]?.icon}
                                  {partner.badge}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={partner.status === 'ACTIVE' ? 'default' : 'secondary'}
                              className={partner.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }
                            >
                              {partner.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {editingCommission === partner.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={commissionValue}
                                  onChange={(e) => setCommissionValue(e.target.value)}
                                  className="w-16 h-8 text-sm"
                                />
                                <span className="text-sm">%</span>
                                <Button size="sm" variant="ghost" onClick={() => updateCommission(partner.id)}>
                                  ✓
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingCommission(null); setCommissionValue('') }}>
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="text-sm font-medium hover:text-primary cursor-pointer"
                                onClick={() => {
                                  setEditingCommission(partner.id)
                                  setCommissionValue(partner.commissionRate.toString())
                                }}
                              >
                                {partner.commissionRate.toFixed(1)}%
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => fetchPartnerDetail(partner.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Lihat Detail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPartnerToSuspend(partner)
                                    setSuspendDialogOpen(true)
                                  }}
                                >
                                  {partner.status === 'ACTIVE' ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Suspend
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Aktifkan
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => overrideTier(partner.id, 'Gold')}>
                                  <Trophy className="h-4 w-4 mr-2" />
                                  Override Tier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPartnerToChangePassword(partner)
                                    setPasswordDialogOpen(true)
                                  }}
                                >
                                  <Key className="h-4 w-4 mr-2" />
                                  Ganti Password
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Megaphone className="h-4 w-4 mr-2" />
                                  Kirim Announcement
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer open={showFilterDrawer} onOpenChange={setShowFilterDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter Partner</DrawerTitle>
            <DrawerDescription>Pilih filter untuk menyaring daftar partner</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Tier</Label>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tier</SelectItem>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                  <SelectItem value="Diamond">Diamond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={resetFilters}>
              Reset Filter
            </Button>
            <Button className="gradient-primary gradient-primary-hover text-white" onClick={applyFilters}>
              Terapkan
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Mobile Add Partner Drawer */}
      {isMobile && (
        <Drawer open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DrawerContent className="max-h-[96vh]">
            <DrawerHeader className="shrink-0">
              <DrawerTitle>Tambah Partner Baru</DrawerTitle>
              <DrawerDescription>Isi data partner baru di bawah ini</DrawerDescription>
            </DrawerHeader>
            <div 
              className="flex-1 overflow-y-auto overflow-x-hidden px-4"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              <AddPartnerForm />
            </div>
            <DrawerFooter className="shrink-0">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Batal
              </Button>
              <Button
                className="gradient-primary gradient-primary-hover text-white"
                onClick={addPartner}
                disabled={addingPartner}
              >
                {addingPartner ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Partner'
                )}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Partner Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent 
          className="w-full sm:max-w-lg overflow-y-auto"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          <SheetHeader className="shrink-0">
            <SheetTitle>Detail Partner</SheetTitle>
            <SheetDescription>
              Informasi lengkap partner
            </SheetDescription>
          </SheetHeader>
          {selectedPartner && (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 p-4">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedPartner.user.avatar || undefined} />
                    <AvatarFallback className="gradient-primary text-white text-xl">
                      {selectedPartner.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-semibold">{selectedPartner.user.name}</h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                      <Badge className={`${tierConfig[selectedPartner.tier as PartnerTier]?.bgColor} ${tierConfig[selectedPartner.tier as PartnerTier]?.color} border-0`}>
                        {selectedPartner.tier}
                      </Badge>
                      {selectedPartner.badge && (
                        <Badge className={`${badgeConfig[selectedPartner.badge]?.bgColor} ${badgeConfig[selectedPartner.badge]?.color} border-0 gap-1`}>
                          {badgeConfig[selectedPartner.badge]?.icon}
                          {selectedPartner.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Personal Info */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Informasi Personal
                  </h4>
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedPartner.user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedPartner.whatsapp}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedPartner.city}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Bank Info */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Informasi Bank
                  </h4>
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{selectedPartner.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">No. Rekening</span>
                      <span className="font-medium">{selectedPartner.accountNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pemilik Rekening</span>
                      <span className="font-medium">{selectedPartner.accountHolder}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Statistik
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total Profit</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(selectedPartner.totalProfit)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total Volume</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(selectedPartner.totalVolume)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Transaksi</p>
                        <p className="text-lg font-bold">
                          {formatNumber(selectedPartner.totalTransactions)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Customer</p>
                        <p className="text-lg font-bold">
                          {formatNumber(selectedPartner._count?.customers || 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Commission & Target */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Komisi & Target
                  </h4>
                  
                  {/* Commission Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Komisi</span>
                    {editingSheetCommission ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={sheetCommissionValue}
                          onChange={(e) => setSheetCommissionValue(e.target.value)}
                          className="w-20 h-8 text-sm"
                          placeholder="0-100"
                        />
                        <span className="text-sm">%</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          onClick={updateCommissionInSheet}
                          disabled={updating}
                        >
                          {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => {
                            setEditingSheetCommission(false)
                            setSheetCommissionValue('')
                          }}
                          disabled={updating}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm">
                          {selectedPartner.commissionRate.toFixed(1)}%
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingSheetCommission(true)
                            setSheetCommissionValue(selectedPartner.commissionRate.toString())
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Target Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Target</span>
                    {editingTarget ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          className="w-32 h-8 text-sm"
                          placeholder="Target amount"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          onClick={updateTarget}
                          disabled={updating}
                        >
                          {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => {
                            setEditingTarget(false)
                            setTargetValue('')
                          }}
                          disabled={updating}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(selectedPartner.targetAmount)}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingTarget(true)
                            setTargetValue(selectedPartner.targetAmount.toString())
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Progress Target */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress Target Profit</span>
                      <span className="font-medium">{selectedPartner.targetProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={selectedPartner.targetProgress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(selectedPartner.totalProfit)}</span>
                      <span>{formatCurrency(selectedPartner.targetAmount)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tier Progress */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Progress Tier
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tier Progress</span>
                      <span className="font-medium">{selectedPartner.tierProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={selectedPartner.tierProgress} className="h-2" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Tier otomatis:
                      </p>
                      <Badge className={`${tierConfig[selectedPartner.calculatedTier as PartnerTier]?.bgColor} ${tierConfig[selectedPartner.calculatedTier as PartnerTier]?.color} border-0`}>
                        {selectedPartner.calculatedTier}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                {selectedPartner.recentTransactions && selectedPartner.recentTransactions.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                      <h4 className="font-medium text-sm">Transaksi Terakhir</h4>
                      <div className="space-y-3">
                        {selectedPartner.recentTransactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-background border"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{tx.customer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {tx.paymentType.name} • {tx.orderId}
                              </p>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:text-right">
                              <p className="text-sm font-medium">{formatCurrency(tx.nominal)}</p>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  tx.status === 'COMPLETED'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                    : tx.status === 'PENDING'
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                                    : ''
                                }`}
                              >
                                {tx.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {partnerToSuspend?.status === 'ACTIVE' ? 'Suspend Partner' : 'Aktifkan Partner'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {partnerToSuspend?.status === 'ACTIVE'
                ? `Apakah Anda yakin ingin suspend partner ${partnerToSuspend?.user.name}? Partner tidak akan dapat mengakses sistem.`
                : `Apakah Anda yakin ingin mengaktifkan kembali partner ${partnerToSuspend?.user.name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => partnerToSuspend && togglePartnerStatus(partnerToSuspend)}
              className={partnerToSuspend?.status === 'ACTIVE'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
              }
            >
              {partnerToSuspend?.status === 'ACTIVE' ? 'Suspend' : 'Aktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ganti Password Partner</DialogTitle>
            <DialogDescription>
              Ganti password untuk {partnerToChangePassword?.user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs">Password Baru</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPasswordDialogOpen(false)
              setNewPassword('')
              setPartnerToChangePassword(null)
            }}>
              Batal
            </Button>
            <Button
              onClick={changePassword}
              disabled={changingPassword || !newPassword || newPassword.length < 6}
              className="gradient-primary gradient-primary-hover text-white"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
