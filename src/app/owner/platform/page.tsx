'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  CreditCard,
  Store,
  Plus,
  Pencil,
  Trash2,
  Info,
  Calculator,
  TrendingUp,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings,
  Percent
} from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/calculations'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { PaymentType, Marketplace } from '@/types'

export default function PlatformPage() {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([])
  const [loading, setLoading] = useState(true)

  // Payment Type Form State
  const [ptDialogOpen, setPtDialogOpen] = useState(false)
  const [editingPt, setEditingPt] = useState<PaymentType | null>(null)
  const [ptForm, setPtForm] = useState({
    name: '',
    type: 'CC' as 'CC' | 'PAYLATER',
    threshold: 1000000,
    onlineFeePercent: 10,
    onlineFeeFixed: 100000,
    codFeePercent: 15,
    codFeeFixed: 150000,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  })

  // Marketplace Form State
  const [mpDialogOpen, setMpDialogOpen] = useState(false)
  const [editingMp, setEditingMp] = useState<Marketplace | null>(null)
  const [mpForm, setMpForm] = useState({
    name: '',
    feePercent: 0,
    logo: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  })

  // Collapsible sections for mobile
  const [showFeeExplanation, setShowFeeExplanation] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ptRes, mpRes] = await Promise.all([
        fetch('/api/payment-types?all=true'),
        fetch('/api/marketplaces?all=true')
      ])

      if (ptRes.ok) {
        const ptData = await ptRes.json()
        setPaymentTypes(ptData.data || [])
      }

      if (mpRes.ok) {
        const mpData = await mpRes.json()
        setMarketplaces(mpData.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Payment Type Handlers
  const resetPtForm = () => {
    setPtForm({
      name: '',
      type: 'CC',
      threshold: 1000000,
      onlineFeePercent: 10,
      onlineFeeFixed: 100000,
      codFeePercent: 15,
      codFeeFixed: 150000,
      status: 'ACTIVE'
    })
    setEditingPt(null)
  }

  const openEditPt = (pt: PaymentType) => {
    setEditingPt(pt)
    setPtForm({
      name: pt.name,
      type: pt.type,
      threshold: pt.threshold,
      onlineFeePercent: pt.onlineFeePercent * 100,
      onlineFeeFixed: pt.onlineFeeFixed,
      codFeePercent: pt.codFeePercent * 100,
      codFeeFixed: pt.codFeeFixed,
      status: pt.status
    })
    setPtDialogOpen(true)
  }

  const savePaymentType = async () => {
    try {
      const url = editingPt ? `/api/payment-types/${editingPt.id}` : '/api/payment-types'
      const method = editingPt ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ptForm)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save payment type')
      }

      toast({
        title: 'Success',
        description: editingPt ? 'Payment type updated' : 'Payment type created'
      })

      setPtDialogOpen(false)
      resetPtForm()
      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save payment type',
        variant: 'destructive'
      })
    }
  }

  const togglePtStatus = async (pt: PaymentType) => {
    try {
      const newStatus = pt.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      const res = await fetch(`/api/payment-types/${pt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Failed to update status')

      toast({
        title: 'Success',
        description: `Payment type ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`
      })

      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      })
    }
  }

  // Marketplace Handlers
  const resetMpForm = () => {
    setMpForm({
      name: '',
      feePercent: 0,
      logo: '',
      status: 'ACTIVE'
    })
    setEditingMp(null)
  }

  const openEditMp = (mp: Marketplace) => {
    setEditingMp(mp)
    setMpForm({
      name: mp.name,
      feePercent: mp.feePercent * 100,
      logo: mp.logo || '',
      status: mp.status
    })
    setMpDialogOpen(true)
  }

  const saveMarketplace = async () => {
    try {
      const url = editingMp ? `/api/marketplaces/${editingMp.id}` : '/api/marketplaces'
      const method = editingMp ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mpForm)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save marketplace')
      }

      toast({
        title: 'Success',
        description: editingMp ? 'Marketplace updated' : 'Marketplace created'
      })

      setMpDialogOpen(false)
      resetMpForm()
      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save marketplace',
        variant: 'destructive'
      })
    }
  }

  const deleteMarketplace = async (id: string) => {
    try {
      const res = await fetch(`/api/marketplaces/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete marketplace')

      toast({
        title: 'Success',
        description: 'Marketplace deleted'
      })

      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete marketplace',
        variant: 'destructive'
      })
    }
  }

  // Render Payment Type Card for Mobile
  const renderPaymentTypeCard = (pt: PaymentType) => (
    <Card key={pt.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              pt.type === 'CC' ? "bg-blue-500/10" : "bg-purple-500/10"
            )}>
              <CreditCard className={cn(
                "h-5 w-5",
                pt.type === 'CC' ? "text-blue-500" : "text-purple-500"
              )} />
            </div>
            <div>
              <p className="font-medium">{pt.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={pt.type === 'CC' ? 'default' : 'secondary'} className="text-xs">
                  {pt.type}
                </Badge>
                <Badge 
                  variant={pt.status === 'ACTIVE' ? 'default' : 'secondary'}
                  className={cn(
                    "text-xs",
                    pt.status === 'ACTIVE' 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  {pt.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditPt(pt)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => togglePtStatus(pt)}
            >
              {pt.status === 'ACTIVE' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Fee Info */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
            <p className="text-sm font-semibold">{formatPercent(pt.onlineFeePercent)}</p>
            <p className="text-xs text-muted-foreground">or {formatCurrency(pt.onlineFeeFixed)}</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs text-muted-foreground">COD</span>
            </div>
            <p className="text-sm font-semibold">{formatPercent(pt.codFeePercent)}</p>
            <p className="text-xs text-muted-foreground">or {formatCurrency(pt.codFeeFixed)}</p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Threshold</span>
          <span className="font-medium">{formatCurrency(pt.threshold)}</span>
        </div>
      </CardContent>
    </Card>
  )

  // Render Marketplace Card for Mobile
  const renderMarketplaceCard = (mp: Marketplace) => (
    <Card key={mp.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center">
              {mp.logo ? (
                <img src={mp.logo} alt={mp.name} className="h-6 w-6 rounded" />
              ) : (
                <Store className="h-5 w-5 text-violet-500" />
              )}
            </div>
            <div>
              <p className="font-medium">{mp.name}</p>
              <Badge 
                variant={mp.status === 'ACTIVE' ? 'default' : 'secondary'}
                className={cn(
                  "text-xs mt-1",
                  mp.status === 'ACTIVE' 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                {mp.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditMp(mp)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Marketplace</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{mp.name}&quot;? 
                    This action cannot be undone if the marketplace has no transactions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMarketplace(mp.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        {/* Fee Info */}
        <div className="mt-4 p-3 rounded-xl bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Platform Fee</span>
          </div>
          <span className="text-lg font-bold text-primary">{formatPercent(mp.feePercent)}</span>
        </div>
      </CardContent>
    </Card>
  )

  // Payment Type Form Component
  const PaymentTypeForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="pt-name" className="text-sm">Nama *</Label>
          <Input
            id="pt-name"
            value={ptForm.name}
            onChange={(e) => setPtForm({ ...ptForm, name: e.target.value })}
            placeholder="e.g., Kartu Kredit BCA"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pt-type" className="text-sm">Type *</Label>
          <Select value={ptForm.type} onValueChange={(v) => setPtForm({ ...ptForm, type: v as 'CC' | 'PAYLATER' })}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CC">Credit Card</SelectItem>
              <SelectItem value="PAYLATER">Paylater</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pt-threshold" className="text-sm">Threshold (Rp)</Label>
        <Input
          id="pt-threshold"
          type="number"
          value={ptForm.threshold}
          onChange={(e) => setPtForm({ ...ptForm, threshold: Number(e.target.value) })}
          placeholder="1000000"
          className="h-10"
        />
        <p className="text-xs text-muted-foreground">
          Nominal di atas threshold menggunakan fee %, di bawah menggunakan fee fixed
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Online Method Fee
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="pt-online-percent" className="text-xs">Fee % (≥ threshold)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pt-online-percent"
                type="number"
                min="0"
                max="100"
                value={ptForm.onlineFeePercent}
                onChange={(e) => setPtForm({ ...ptForm, onlineFeePercent: Number(e.target.value) })}
                className="h-10"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-online-fixed" className="text-xs">Fee Fixed (Rp)</Label>
            <Input
              id="pt-online-fixed"
              type="number"
              min="0"
              value={ptForm.onlineFeeFixed}
              onChange={(e) => setPtForm({ ...ptForm, onlineFeeFixed: Number(e.target.value) })}
              className="h-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-orange-500" />
          COD Method Fee
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="pt-cod-percent" className="text-xs">Fee % (≥ threshold)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pt-cod-percent"
                type="number"
                min="0"
                max="100"
                value={ptForm.codFeePercent}
                onChange={(e) => setPtForm({ ...ptForm, codFeePercent: Number(e.target.value) })}
                className="h-10"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-cod-fixed" className="text-xs">Fee Fixed (Rp)</Label>
            <Input
              id="pt-cod-fixed"
              type="number"
              min="0"
              value={ptForm.codFeeFixed}
              onChange={(e) => setPtForm({ ...ptForm, codFeeFixed: Number(e.target.value) })}
              className="h-10"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <Label htmlFor="pt-status" className="text-sm font-medium">Status</Label>
        <div className="flex items-center gap-2">
          <Switch
            id="pt-status"
            checked={ptForm.status === 'ACTIVE'}
            onCheckedChange={(checked) => setPtForm({ ...ptForm, status: checked ? 'ACTIVE' : 'INACTIVE' })}
          />
          <Badge variant={ptForm.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
            {ptForm.status}
          </Badge>
        </div>
      </div>
    </div>
  )

  // Marketplace Form Component
  const MarketplaceForm = () => (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="mp-name" className="text-sm">Nama *</Label>
        <Input
          id="mp-name"
          value={mpForm.name}
          onChange={(e) => setMpForm({ ...mpForm, name: e.target.value })}
          placeholder="e.g., Shopee, Tokopedia"
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mp-fee" className="text-sm">Platform Fee %</Label>
        <div className="flex items-center gap-2">
          <Input
            id="mp-fee"
            type="number"
            min="0"
            max="100"
            value={mpForm.feePercent}
            onChange={(e) => setMpForm({ ...mpForm, feePercent: Number(e.target.value) })}
            className="h-10"
          />
          <span className="text-muted-foreground">%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Fee yang dikenakan marketplace, mengurangi margin profit
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mp-logo" className="text-sm">Logo URL (optional)</Label>
        <Input
          id="mp-logo"
          value={mpForm.logo}
          onChange={(e) => setMpForm({ ...mpForm, logo: e.target.value })}
          placeholder="https://..."
          className="h-10"
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <Label htmlFor="mp-status" className="text-sm font-medium">Status</Label>
        <div className="flex items-center gap-2">
          <Switch
            id="mp-status"
            checked={mpForm.status === 'ACTIVE'}
            onCheckedChange={(checked) => setMpForm({ ...mpForm, status: checked ? 'ACTIVE' : 'INACTIVE' })}
          />
          <Badge variant={mpForm.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
            {mpForm.status}
          </Badge>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Platform & Fee</h1>
          <p className="text-sm text-muted-foreground">
            Kelola tipe pembayaran, marketplace, dan konfigurasi biaya
          </p>
        </div>

        <Tabs defaultValue="payment-types" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payment-types" className="flex items-center gap-1.5 text-xs md:text-sm">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment</span>
              <span className="sm:hidden">Payment</span>
            </TabsTrigger>
            <TabsTrigger value="marketplaces" className="flex items-center gap-1.5 text-xs md:text-sm">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Marketplace</span>
              <span className="sm:hidden">Market</span>
            </TabsTrigger>
            <TabsTrigger value="explanation" className="flex items-center gap-1.5 text-xs md:text-sm">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Info</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
          </TabsList>

          {/* Payment Types Tab */}
          <TabsContent value="payment-types" className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base md:text-lg font-semibold">Payment Types</h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Kelola tipe pembayaran dan struktur biaya
                </p>
              </div>
              <Button 
                onClick={() => setPtDialogOpen(true)}
                className="gradient-primary text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Add Payment</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>

            {/* Mobile Card List */}
            {isMobile ? (
              <div className="space-y-3">
                {paymentTypes.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Belum ada payment type</p>
                    </CardContent>
                  </Card>
                ) : (
                  paymentTypes.map(renderPaymentTypeCard)
                )}
              </div>
            ) : (
              /* Desktop Table */
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Threshold</TableHead>
                          <TableHead>Online Fee</TableHead>
                          <TableHead>COD Fee</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentTypes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No payment types found
                            </TableCell>
                          </TableRow>
                        ) : (
                          paymentTypes.map((pt) => (
                            <TableRow key={pt.id}>
                              <TableCell className="font-medium">{pt.name}</TableCell>
                              <TableCell>
                                <Badge variant={pt.type === 'CC' ? 'default' : 'secondary'}>
                                  {pt.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatCurrency(pt.threshold)}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{formatPercent(pt.onlineFeePercent)}</div>
                                  <div className="text-muted-foreground">or {formatCurrency(pt.onlineFeeFixed)}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{formatPercent(pt.codFeePercent)}</div>
                                  <div className="text-muted-foreground">or {formatCurrency(pt.codFeeFixed)}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={pt.status === 'ACTIVE' ? 'default' : 'secondary'}
                                  className={pt.status === 'ACTIVE' 
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  }
                                >
                                  {pt.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openEditPt(pt)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => togglePtStatus(pt)}>
                                    {pt.status === 'ACTIVE' ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Marketplaces Tab */}
          <TabsContent value="marketplaces" className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base md:text-lg font-semibold">Marketplaces</h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Kelola marketplace dan platform fee
                </p>
              </div>
              <Button 
                onClick={() => setMpDialogOpen(true)}
                className="gradient-primary text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Add Marketplace</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>

            {/* Mobile Card List */}
            {isMobile ? (
              <div className="space-y-3">
                {marketplaces.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Belum ada marketplace</p>
                    </CardContent>
                  </Card>
                ) : (
                  marketplaces.map(renderMarketplaceCard)
                )}
              </div>
            ) : (
              /* Desktop Table */
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Fee %</TableHead>
                        <TableHead>Logo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marketplaces.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No marketplaces found
                          </TableCell>
                        </TableRow>
                      ) : (
                        marketplaces.map((mp) => (
                          <TableRow key={mp.id}>
                            <TableCell className="font-medium">{mp.name}</TableCell>
                            <TableCell>{formatPercent(mp.feePercent)}</TableCell>
                            <TableCell>
                              {mp.logo ? (
                                <img src={mp.logo} alt={mp.name} className="h-6 w-6 rounded" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={mp.status === 'ACTIVE' ? 'default' : 'secondary'}
                                className={mp.status === 'ACTIVE' 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }
                              >
                                {mp.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEditMp(mp)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Marketplace</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete &quot;{mp.name}&quot;? 
                                        This action cannot be undone if the marketplace has no transactions.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteMarketplace(mp.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Fee Calculation Explanation Tab */}
          <TabsContent value="explanation" className="space-y-4">
            <Card>
              {isMobile ? (
                <>
                  <button
                    onClick={() => setShowFeeExplanation(!showFeeExplanation)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Metode & Perhitungan Fee
                    </CardTitle>
                    {showFeeExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showFeeExplanation && (
                    <CardContent className="pt-0 space-y-4">
                      {/* Online Method */}
                      <div className="p-4 rounded-xl border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          Online Method
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Transaksi online tanpa perjumpaan fisik
                        </p>
                        <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                          <p><strong>Jika nominal ≥ threshold:</strong></p>
                          <code className="block bg-background p-1.5 rounded text-[10px]">
                            Fee = Nominal × Online Fee %
                          </code>
                          <p><strong>Jika nominal &lt; threshold:</strong></p>
                          <code className="block bg-background p-1.5 rounded text-[10px]">
                            Fee = Online Fee Fixed
                          </code>
                        </div>
                      </div>
                      
                      {/* COD Method */}
                      <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                          <ArrowUpDown className="h-4 w-4 text-orange-500" />
                          COD Method
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Transaksi tatap muka (Cash On Delivery)
                        </p>
                        <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                          <p><strong>Jika nominal ≥ threshold:</strong></p>
                          <code className="block bg-background p-1.5 rounded text-[10px]">
                            Fee = Nominal × COD Fee %
                          </code>
                          <p><strong>Jika nominal &lt; threshold:</strong></p>
                          <code className="block bg-background p-1.5 rounded text-[10px]">
                            Fee = COD Fee Fixed
                          </code>
                        </div>
                      </div>

                      <Separator />

                      {/* Profit Distribution */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Distribusi Profit</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium">Payment Fee</p>
                            <p className="text-muted-foreground">Total biaya ke customer</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium">Platform Fee</p>
                            <p className="text-muted-foreground">Potongan marketplace</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium">Net Margin</p>
                            <p className="text-muted-foreground">Profit bersih</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium">Partner Profit</p>
                            <p className="text-muted-foreground">Bagian partner</p>
                          </div>
                        </div>
                      </div>

                      {/* Example */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20">
                        <h4 className="font-medium text-sm mb-3">Contoh Perhitungan</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-medium mb-1">Input:</p>
                            <ul className="space-y-0.5 text-muted-foreground">
                              <li>• Nominal: Rp 2.000.000</li>
                              <li>• Method: Online</li>
                              <li>• Fee: 10%</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Output:</p>
                            <ul className="space-y-0.5 text-muted-foreground">
                              <li>• Payment Fee: Rp 200.000</li>
                              <li>• Owner Profit: Rp 133.000</li>
                              <li>• Customer: Rp 1.800.000</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Metode Transaksi & Perhitungan Fee
                    </CardTitle>
                    <CardDescription>
                      Penjelasan lengkap tentang cara perhitungan biaya layanan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Method Types */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Online Method */}
                      <Card className="border-green-200 dark:border-green-900">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Online Method
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Transaksi dilakukan secara online tanpa perjumpaan fisik. 
                            Customer mentransfer nominal gestun ke rekening yang ditentukan.
                          </p>
                          <div className="bg-muted p-4 rounded-lg space-y-2">
                            <h5 className="font-medium">Rumus Perhitungan:</h5>
                            <div className="text-sm space-y-2">
                              <p><strong>Jika nominal ≥ threshold:</strong></p>
                              <code className="block bg-background p-2 rounded text-xs">
                                Biaya Layanan = Nominal × Online Fee %
                              </code>
                              <p><strong>Jika nominal &lt; threshold:</strong></p>
                              <code className="block bg-background p-2 rounded text-xs">
                                Biaya Layanan = Online Fee Fixed
                              </code>
                            </div>
                          </div>
                          <div className="text-sm">
                            <strong>Contoh:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                              <li>Threshold: Rp 1.000.000</li>
                              <li>Online Fee: 10% / Rp 100.000 fixed</li>
                              <li>Nominal Rp 2.000.000 → Fee = Rp 200.000</li>
                              <li>Nominal Rp 500.000 → Fee = Rp 100.000</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>

                      {/* COD Method */}
                      <Card className="border-orange-200 dark:border-orange-900">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <ArrowUpDown className="h-5 w-5 text-orange-500" />
                            COD Method
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Transaksi dilakukan secara tatap muka (Cash On Delivery). 
                            Partner bertemu customer untuk proses gestun.
                          </p>
                          <div className="bg-muted p-4 rounded-lg space-y-2">
                            <h5 className="font-medium">Rumus Perhitungan:</h5>
                            <div className="text-sm space-y-2">
                              <p><strong>Jika nominal ≥ threshold:</strong></p>
                              <code className="block bg-background p-2 rounded text-xs">
                                Biaya Layanan = Nominal × COD Fee %
                              </code>
                              <p><strong>Jika nominal &lt; threshold:</strong></p>
                              <code className="block bg-background p-2 rounded text-xs">
                                Biaya Layanan = COD Fee Fixed
                              </code>
                            </div>
                          </div>
                          <div className="text-sm">
                            <strong>Contoh:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                              <li>Threshold: Rp 1.000.000</li>
                              <li>COD Fee: 15% / Rp 150.000 fixed</li>
                              <li>Nominal Rp 2.000.000 → Fee = Rp 300.000</li>
                              <li>Nominal Rp 500.000 → Fee = Rp 150.000</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator />

                    {/* Profit Distribution */}
                    <div>
                      <h4 className="font-medium mb-4">Distribusi Profit</h4>
                      <div className="bg-muted p-4 rounded-lg space-y-3">
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div className="space-y-2">
                            <h5 className="font-medium">1. Payment Fee</h5>
                            <code className="block bg-background p-2 rounded text-xs">
                              Payment Fee = Hasil perhitungan di atas
                            </code>
                            <p className="text-muted-foreground">
                              Total biaya yang dibebankan ke customer
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h5 className="font-medium">2. Platform Fee (Marketplace)</h5>
                            <code className="block bg-background p-2 rounded text-xs">
                              Platform Fee = Payment Fee × Marketplace Fee %
                            </code>
                            <p className="text-muted-foreground">
                              Potongan fee untuk marketplace (jika ada)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h5 className="font-medium">3. Net Margin</h5>
                            <code className="block bg-background p-2 rounded text-xs">
                              Net Margin = Payment Fee - Platform Fee
                            </code>
                            <p className="text-muted-foreground">
                              Profit bersih sebelum dibagi ke partner
                            </p>
                          </div>
                        </div>
                        <Separator />
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <h5 className="font-medium">4. Partner Profit</h5>
                            <code className="block bg-background p-2 rounded text-xs">
                              Partner Profit = Net Margin × Commission Rate
                            </code>
                            <p className="text-muted-foreground">
                              Bagian profit untuk partner (default 30%)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h5 className="font-medium">5. Owner Profit</h5>
                            <code className="block bg-background p-2 rounded text-xs">
                              Owner Profit = Net Margin - Partner Profit
                            </code>
                            <p className="text-muted-foreground">
                              Bagian profit untuk owner
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Final Calculation */}
                    <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 p-6 rounded-lg">
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Contoh Perhitungan Lengkap
                      </h4>
                      <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div>
                          <h5 className="font-medium mb-2">Input:</h5>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• Nominal Gestun: Rp 2.000.000</li>
                            <li>• Method: Online</li>
                            <li>• Payment Type: CC (10%, threshold 1jt)</li>
                            <li>• Marketplace: Shopee (5%)</li>
                            <li>• Partner Commission: 30%</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2">Output:</h5>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• Payment Fee: Rp 200.000 (2jt × 10%)</li>
                            <li>• Platform Fee: Rp 10.000 (200rb × 5%)</li>
                            <li>• Net Margin: Rp 190.000</li>
                            <li>• Partner Profit: Rp 57.000 (190rb × 30%)</li>
                            <li>• Owner Profit: Rp 133.000</li>
                            <li>• Customer Receives: Rp 1.800.000</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Type Dialog/Drawer */}
      {isMobile ? (
        <Drawer open={ptDialogOpen} onOpenChange={(open) => { setPtDialogOpen(open); if (!open) resetPtForm() }}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader>
              <DrawerTitle>{editingPt ? 'Edit Payment Type' : 'Add Payment Type'}</DrawerTitle>
              <DrawerDescription>Konfigurasi tipe pembayaran dan struktur biaya</DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="flex-1 px-4">
              <PaymentTypeForm />
            </ScrollArea>
            <DrawerFooter>
              <Button variant="outline" onClick={() => { setPtDialogOpen(false); resetPtForm() }}>
                Cancel
              </Button>
              <Button onClick={savePaymentType} className="gradient-primary text-white">
                {editingPt ? 'Update' : 'Create'}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={ptDialogOpen} onOpenChange={(open) => { setPtDialogOpen(open); if (!open) resetPtForm() }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPt ? 'Edit Payment Type' : 'Add Payment Type'}</DialogTitle>
              <DialogDescription>Konfigurasi tipe pembayaran dan struktur biaya</DialogDescription>
            </DialogHeader>
            <PaymentTypeForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setPtDialogOpen(false); resetPtForm() }}>
                Cancel
              </Button>
              <Button onClick={savePaymentType} className="gradient-primary text-white">
                {editingPt ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Marketplace Dialog/Drawer */}
      {isMobile ? (
        <Drawer open={mpDialogOpen} onOpenChange={(open) => { setMpDialogOpen(open); if (!open) resetMpForm() }}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader>
              <DrawerTitle>{editingMp ? 'Edit Marketplace' : 'Add Marketplace'}</DrawerTitle>
              <DrawerDescription>Konfigurasi marketplace dan platform fee</DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="flex-1 px-4">
              <MarketplaceForm />
            </ScrollArea>
            <DrawerFooter>
              <Button variant="outline" onClick={() => { setMpDialogOpen(false); resetMpForm() }}>
                Cancel
              </Button>
              <Button onClick={saveMarketplace} className="gradient-primary text-white">
                {editingMp ? 'Update' : 'Create'}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={mpDialogOpen} onOpenChange={(open) => { setMpDialogOpen(open); if (!open) resetMpForm() }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMp ? 'Edit Marketplace' : 'Add Marketplace'}</DialogTitle>
              <DialogDescription>Konfigurasi marketplace dan platform fee</DialogDescription>
            </DialogHeader>
            <MarketplaceForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setMpDialogOpen(false); resetMpForm() }}>
                Cancel
              </Button>
              <Button onClick={saveMarketplace} className="gradient-primary text-white">
                {editingMp ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  )
}
