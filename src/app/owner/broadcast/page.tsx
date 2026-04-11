'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Megaphone,
  Tag,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Calendar,
  CalendarDays,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  Sparkles,
  Clock,
  Play,
  Square,
  AlertCircle,
  Link2,
  FileText
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/calculations'
import { useToast } from '@/hooks/use-toast'
import type { Announcement } from '@/types'

interface AnnouncementWithUser extends Announcement {
  user?: {
    id: string
    name: string
    email: string
  }
}

export default function BroadcastPage() {
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<AnnouncementWithUser[]>([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AnnouncementWithUser | null>(null)
  const [formType, setFormType] = useState<'INFO' | 'PROMO'>('INFO')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'INFO' as 'INFO' | 'PROMO',
    link: '',
    startDate: '',
    endDate: '',
    status: 'INACTIVE' as 'ACTIVE' | 'INACTIVE'
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/announcements')
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter announcements by type
  const infoAnnouncements = announcements.filter(a => a.type === 'INFO')
  const promoAnnouncements = announcements.filter(a => a.type === 'PROMO')
  const activeAnnouncements = announcements.filter(isCurrentlyActive)

  // Form Handlers
  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      type: 'INFO',
      link: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'INACTIVE'
    })
    setEditingItem(null)
    setFormErrors({})
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!form.title.trim()) {
      errors.title = 'Judul wajib diisi'
    } else if (form.title.length < 3) {
      errors.title = 'Judul minimal 3 karakter'
    }
    
    if (!form.description.trim()) {
      errors.description = 'Deskripsi wajib diisi'
    } else if (form.description.length < 10) {
      errors.description = 'Deskripsi minimal 10 karakter'
    }
    
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate)
      const end = new Date(form.endDate)
      if (end < start) {
        errors.endDate = 'Tanggal selesai harus setelah tanggal mulai'
      }
    }
    
    if (formType === 'PROMO' && form.link && !isValidUrl(form.link)) {
      errors.link = 'Format link tidak valid'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  const openEdit = (item: AnnouncementWithUser) => {
    setEditingItem(item)
    setFormType(item.type)
    setForm({
      title: item.title,
      description: item.description,
      type: item.type,
      link: item.link || '',
      startDate: new Date(item.startDate).toISOString().split('T')[0],
      endDate: new Date(item.endDate).toISOString().split('T')[0],
      status: item.status
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const openAdd = (type: 'INFO' | 'PROMO') => {
    resetForm()
    setFormType(type)
    setForm(prev => ({ ...prev, type }))
    setDialogOpen(true)
  }

  const saveAnnouncement = async () => {
    if (!validateForm()) {
      return
    }

    try {
      const url = editingItem ? `/api/announcements/${editingItem.id}` : '/api/announcements'
      const method = editingItem ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save announcement')
      }

      toast({
        title: 'Berhasil',
        description: editingItem ? 'Pengumuman berhasil diperbarui' : 'Pengumuman berhasil dibuat'
      })

      setDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyimpan pengumuman',
        variant: 'destructive'
      })
    }
  }

  const toggleStatus = async (item: AnnouncementWithUser) => {
    try {
      const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      const res = await fetch(`/api/announcements/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Failed to update status')

      toast({
        title: 'Berhasil',
        description: `Pengumuman berhasil ${newStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}`
      })

      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengubah status',
        variant: 'destructive'
      })
    }
  }

  const deleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete announcement')

      toast({
        title: 'Berhasil',
        description: 'Pengumuman berhasil dihapus'
      })

      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus pengumuman',
        variant: 'destructive'
      })
    }
  }

  // Check if announcement is currently active based on dates
  function isCurrentlyActive(item: AnnouncementWithUser) {
    if (item.status !== 'ACTIVE') return false
    const now = new Date()
    const start = new Date(item.startDate)
    const end = new Date(item.endDate)
    return now >= start && now <= end
  }

  // Get days remaining
  function getDaysRemaining(item: AnnouncementWithUser) {
    const now = new Date()
    const end = new Date(item.endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" />
              Broadcast & Announcements
            </h1>
            <p className="text-muted-foreground">
              Kelola pengumuman dan promosi untuk mitra
            </p>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                  <Megaphone className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{announcements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg shadow-sm">
                  <Play className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Live</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{activeAnnouncements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900 border-violet-200 dark:border-violet-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500 rounded-lg shadow-sm">
                  <Info className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Info</p>
                  <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{infoAnnouncements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg shadow-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Promo</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{promoAnnouncements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="announcements" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1">
            <TabsTrigger 
              value="announcements" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900 dark:data-[state=active]:text-violet-300"
            >
              <Info className="h-4 w-4" />
              <span className="font-medium">Info</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {infoAnnouncements.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="promos" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700 dark:data-[state=active]:bg-amber-900 dark:data-[state=active]:text-amber-300"
            >
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Promo</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {promoAnnouncements.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-violet-100 dark:bg-violet-900 rounded-md">
                        <Info className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      Pengumuman Info
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Informasi penting untuk semua mitra
                    </CardDescription>
                  </div>
                  <Dialog open={dialogOpen && formType === 'INFO'} onOpenChange={(open) => { 
                    if (!open) resetForm()
                    setDialogOpen(open)
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gradient-primary shrink-0" onClick={() => openAdd('INFO')}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Tambah Info
                      </Button>
                    </DialogTrigger>
                    <AnnouncementFormDialog
                      form={form}
                      setForm={setForm}
                      formType={formType}
                      editingItem={editingItem}
                      onSave={saveAnnouncement}
                      onClose={() => { setDialogOpen(false); resetForm() }}
                      formErrors={formErrors}
                    />
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <AnnouncementTable
                  items={infoAnnouncements}
                  onEdit={openEdit}
                  onToggleStatus={toggleStatus}
                  onDelete={deleteAnnouncement}
                  isCurrentlyActive={isCurrentlyActive}
                  getDaysRemaining={getDaysRemaining}
                  type="INFO"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promos Tab */}
          <TabsContent value="promos" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-md">
                        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      Promosi
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Materi promosi dengan link canva/gdrive
                    </CardDescription>
                  </div>
                  <Dialog open={dialogOpen && formType === 'PROMO'} onOpenChange={(open) => { 
                    if (!open) resetForm()
                    setDialogOpen(open)
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gradient-primary shrink-0" onClick={() => openAdd('PROMO')}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Tambah Promo
                      </Button>
                    </DialogTrigger>
                    <AnnouncementFormDialog
                      form={form}
                      setForm={setForm}
                      formType={formType}
                      editingItem={editingItem}
                      onSave={saveAnnouncement}
                      onClose={() => { setDialogOpen(false); resetForm() }}
                      formErrors={formErrors}
                    />
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <AnnouncementTable
                  items={promoAnnouncements}
                  onEdit={openEdit}
                  onToggleStatus={toggleStatus}
                  onDelete={deleteAnnouncement}
                  isCurrentlyActive={isCurrentlyActive}
                  getDaysRemaining={getDaysRemaining}
                  type="PROMO"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

// Announcement Table Component
function AnnouncementTable({
  items,
  onEdit,
  onToggleStatus,
  onDelete,
  isCurrentlyActive,
  getDaysRemaining,
  type
}: {
  items: AnnouncementWithUser[]
  onEdit: (item: AnnouncementWithUser) => void
  onToggleStatus: (item: AnnouncementWithUser) => void
  onDelete: (id: string) => void
  isCurrentlyActive: (item: AnnouncementWithUser) => boolean
  getDaysRemaining: (item: AnnouncementWithUser) => number
  type: 'INFO' | 'PROMO'
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 bg-muted rounded-full mb-4">
          {type === 'INFO' ? (
            <Info className="h-8 w-8 text-muted-foreground" />
          ) : (
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <p className="text-muted-foreground font-medium">
          Belum ada {type === 'INFO' ? 'pengumuman' : 'promosi'}
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Klik tombol &quot;Tambah {type === 'INFO' ? 'Info' : 'Promo'}&quot; untuk membuat baru
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-[500px]">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold w-[25%]">Judul</TableHead>
              <TableHead className="font-semibold w-[30%]">Deskripsi</TableHead>
              {type === 'PROMO' && (
                <TableHead className="font-semibold w-[15%]">Link</TableHead>
              )}
              <TableHead className="font-semibold w-[15%]">Periode</TableHead>
              <TableHead className="font-semibold w-[10%]">Status</TableHead>
              <TableHead className="font-semibold text-right w-[10%]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isActive = isCurrentlyActive(item)
              const daysRemaining = getDaysRemaining(item)
              
              return (
                <TableRow key={item.id} className="group hover:bg-muted/30">
                  <TableCell>
                    <div className="font-medium">{item.title}</div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  </TableCell>
                  {type === 'PROMO' && (
                    <TableCell>
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Buka Link
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{formatDate(item.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span className="ml-5">→ {formatDate(item.endDate)}</span>
                      </div>
                      {isActive && (
                        <Badge variant="outline" className={`w-fit text-xs mt-1 ${
                          daysRemaining <= 3 
                            ? 'border-red-300 text-red-600 bg-red-50 dark:bg-red-950 dark:border-red-800 dark:text-red-400' 
                            : 'border-green-300 text-green-600 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400'
                        }`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {daysRemaining} hari lagi
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge 
                      isActive={isActive} 
                      status={item.status} 
                      daysRemaining={daysRemaining}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onToggleStatus(item)}
                        title={item.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {item.status === 'ACTIVE' ? (
                          <Square className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Play className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(item)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Hapus">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-destructive" />
                              Hapus {type === 'INFO' ? 'Pengumuman' : 'Promo'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus &quot;{item.title}&quot;? 
                              Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {items.map((item) => {
          const isActive = isCurrentlyActive(item)
          const daysRemaining = getDaysRemaining(item)
          
          return (
            <Card key={item.id} className={`overflow-hidden ${isActive ? 'border-green-300 dark:border-green-800' : ''}`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <StatusBadge 
                        isActive={isActive} 
                        status={item.status} 
                        daysRemaining={daysRemaining}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(item.startDate)} - {formatDate(item.endDate)}</span>
                      </div>
                      {isActive && (
                        <Badge variant="outline" className={`text-xs ${
                          daysRemaining <= 3 
                            ? 'border-red-300 text-red-600 bg-red-50' 
                            : 'border-green-300 text-green-600 bg-green-50'
                        }`}>
                          {daysRemaining} hari lagi
                        </Badge>
                      )}
                      {type === 'PROMO' && item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(item)}
                    className="h-8"
                  >
                    {item.status === 'ACTIVE' ? (
                      <>
                        <Square className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                        Start
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(item)}
                    className="h-8"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="h-8">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus {type === 'INFO' ? 'Pengumuman' : 'Promo'}</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus &quot;{item.title}&quot;?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(item.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// Status Badge Component
function StatusBadge({ 
  isActive, 
  status, 
  daysRemaining 
}: { 
  isActive: boolean
  status: string
  daysRemaining: number
}) {
  if (isActive) {
    return (
      <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        LIVE
      </Badge>
    )
  }
  
  if (status === 'ACTIVE') {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
        <CheckCircle className="h-3 w-3 mr-1" />
        Aktif
      </Badge>
    )
  }
  
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="h-3 w-3 mr-1" />
      Nonaktif
    </Badge>
  )
}

// Form Dialog Component
function AnnouncementFormDialog({
  form,
  setForm,
  formType,
  editingItem,
  onSave,
  onClose,
  formErrors
}: {
  form: {
    title: string
    description: string
    type: 'INFO' | 'PROMO'
    link: string
    startDate: string
    endDate: string
    status: 'ACTIVE' | 'INACTIVE'
  }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
  formType: 'INFO' | 'PROMO'
  editingItem: AnnouncementWithUser | null
  onSave: () => void
  onClose: () => void
  formErrors: Record<string, string>
}) {
  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {formType === 'INFO' ? (
            <>
              <div className="p-1.5 bg-violet-100 dark:bg-violet-900 rounded-md">
                <Info className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              {editingItem ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
            </>
          ) : (
            <>
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-md">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              {editingItem ? 'Edit Promosi' : 'Tambah Promosi'}
            </>
          )}
        </DialogTitle>
        <DialogDescription>
          {formType === 'INFO' 
            ? 'Buat pengumuman informasi untuk mitra' 
            : 'Buat promosi dengan link materi'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-4">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            Informasi Dasar
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-1">
              Judul <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Masukkan judul pengumuman"
              className={formErrors.title ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {formErrors.title && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {formErrors.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-1">
              Deskripsi <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Masukkan deskripsi pengumuman"
              rows={4}
              className={formErrors.description ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {formErrors.description && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {formErrors.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {form.description.length} karakter
            </p>
          </div>
        </div>

        <Separator />

        {/* Link Section for Promo */}
        {formType === 'PROMO' && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Link2 className="h-4 w-4" />
                Link Materi
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="link">Link Canva/GDrive</Label>
                <Input
                  id="link"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                  className={formErrors.link ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {formErrors.link && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.link}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Link ke materi promosi (Canva, Google Drive, dll)
                </p>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Schedule Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Jadwal Tayang
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={formErrors.startDate ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Tanggal Selesai</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={formErrors.endDate ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            </div>
          </div>
          {formErrors.endDate && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.endDate}
            </p>
          )}
        </div>

        <Separator />

        {/* Status Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Tag className="h-4 w-4" />
            Status
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="status" className="text-base">Status Aktif</Label>
              <p className="text-xs text-muted-foreground">
                {form.status === 'ACTIVE' 
                  ? 'Pengumuman akan ditampilkan ke mitra' 
                  : 'Pengumuman tidak akan ditampilkan'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="status"
                checked={form.status === 'ACTIVE'}
                onCheckedChange={(checked) => setForm({ ...form, status: checked ? 'ACTIVE' : 'INACTIVE' })}
              />
              <Badge 
                variant={form.status === 'ACTIVE' ? 'default' : 'secondary'}
                className={form.status === 'ACTIVE' ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                {form.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button onClick={onSave} className="gradient-primary">
          {editingItem ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Simpan Perubahan
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1.5" />
              Buat Pengumuman
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
