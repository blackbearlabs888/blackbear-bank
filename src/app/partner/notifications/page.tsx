'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Bell,
  Info,
  Tag,
  ExternalLink,
  Calendar,
  Clock,
  Check,
  CheckCheck,
  X,
  Sparkles,
  Megaphone,
  ChevronRight,
  Gift,
  Zap,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useAuthStore, useIsPartner } from '@/store/auth'
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/calculations'
import { apiFetch } from '@/lib/api'
import type { Announcement } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Enhanced status badge component
function StatusBadge({ 
  isLive, 
  isExpired, 
  daysRemaining 
}: { 
  isLive: boolean
  isExpired: boolean
  daysRemaining: string 
}) {
  if (isExpired) {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
        <X className="h-3 w-3 mr-1" />
        Berakhir
      </Badge>
    )
  }
  
  if (isLive) {
    return (
      <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 text-xs animate-pulse">
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        Aktif
      </Badge>
    )
  }
  
  return (
    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
      <Clock className="h-3 w-3 mr-1" />
      {daysRemaining}
    </Badge>
  )
}

export default function PartnerNotificationsPage() {
  const router = useRouter()
  const { partner } = useAuthStore()
  const isPartner = useIsPartner()
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [showNewAnnouncementModal, setShowNewAnnouncementModal] = useState(false)
  const [markingRead, setMarkingRead] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'info' | 'promo'>('all')

  useEffect(() => {
    if (!isPartner) {
      router.push('/login')
      return
    }
  }, [isPartner, router])

  useEffect(() => {
    fetchAnnouncements()
  }, [partner?.id])

  // Show modal for new unread announcements
  useEffect(() => {
    if (announcements.length > 0 && !loading) {
      const unreadAnnouncements = announcements.filter((a) => !a.isRead)
      if (unreadAnnouncements.length > 0 && !showNewAnnouncementModal) {
        setShowNewAnnouncementModal(true)
      }
    }
  }, [announcements, loading])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        active: 'true',
        partnerId: partner?.id || '',
      })
      const response = await apiFetch(`/api/announcements?${params}`)
      const data = await response.json()
      if (data.success) {
        setAnnouncements(data.data)
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
      toast.error('Gagal memuat notifikasi')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (announcementId: string) => {
    if (!partner?.id) return

    try {
      const response = await apiFetch('/api/announcements/read', {
        method: 'POST',
        body: JSON.stringify({
          announcementId,
          partnerId: partner.id,
        }),
      })

      if (response.ok) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === announcementId ? { ...a, isRead: true } : a))
        )
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!partner?.id) return

    try {
      setMarkingRead(true)
      const response = await apiFetch('/api/announcements/read', {
        method: 'PUT',
        body: JSON.stringify({ partnerId: partner.id }),
      })

      if (response.ok) {
        setAnnouncements((prev) => prev.map((a) => ({ ...a, isRead: true })))
        toast.success('Semua notifikasi ditandai sudah dibaca')
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Gagal menandai notifikasi')
    } finally {
      setMarkingRead(false)
    }
  }

  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    if (!announcement.isRead) {
      markAsRead(announcement.id)
    }
  }

  const handleCloseNewAnnouncementModal = () => {
    if (selectedAnnouncement && !selectedAnnouncement.isRead) {
      markAsRead(selectedAnnouncement.id)
    }
    setShowNewAnnouncementModal(false)
    setSelectedAnnouncement(null)
  }

  const unreadCount = announcements.filter((a) => !a.isRead).length
  const infoAnnouncements = announcements.filter((a) => a.type === 'INFO')
  const promoAnnouncements = announcements.filter((a) => a.type === 'PROMO')

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date()
  }

  const isLive = (announcement: Announcement) => {
    const now = new Date()
    const start = new Date(announcement.startDate)
    const end = new Date(announcement.endDate)
    return announcement.status === 'ACTIVE' && now >= start && now <= end
  }

  const getDaysRemaining = (endDate: string) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffMs = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return 'Berakhir'
    if (diffDays === 1) return '1 hari'
    return `${diffDays} hari`
  }

  // Filter announcements based on active tab
  const filteredAnnouncements = activeTab === 'all' 
    ? announcements 
    : announcements.filter(a => a.type === (activeTab === 'info' ? 'INFO' : 'PROMO'))

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24 md:pb-0">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-4 sm:p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                  <h1 className="text-xl sm:text-2xl font-bold">Notifikasi</h1>
                  {unreadCount > 0 && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      {unreadCount} baru
                    </Badge>
                  )}
                </div>
                <p className="text-sm sm:text-base text-white/80">
                  Pengumuman dan promo terbaru dari Black Bear
                </p>
              </div>
              {unreadCount > 0 && (
                <Button 
                  onClick={markAllAsRead} 
                  disabled={markingRead} 
                  className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm min-h-[44px]"
                >
                  {markingRead ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4 mr-2" />
                  )}
                  Tandai Semua Dibaca
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg overflow-hidden">
              <CardContent className="p-3 sm:p-4 relative">
                <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-4 w-4" />
                  <p className="text-[10px] sm:text-xs text-white/80">Total</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{announcements.length}</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white border-0 shadow-lg overflow-hidden">
              <CardContent className="p-3 sm:p-4 relative">
                <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4" />
                  <p className="text-[10px] sm:text-xs text-white/80">Info</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{infoAnnouncements.length}</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white border-0 shadow-lg overflow-hidden">
              <CardContent className="p-3 sm:p-4 relative">
                <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="h-4 w-4" />
                  <p className="text-[10px] sm:text-xs text-white/80">Promo</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{promoAnnouncements.length}</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tab Filter - Mobile Friendly */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: 'all', label: 'Semua', count: announcements.length },
            { key: 'info', label: 'Info', count: infoAnnouncements.length },
            { key: 'promo', label: 'Promo', count: promoAnnouncements.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] touch-target',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted active:bg-muted/70'
              )}
            >
              {tab.label}
              <span className={cn(
                'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
                activeTab === tab.key ? 'bg-white/20' : 'bg-muted'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Unread Banner */}
        {unreadCount > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 animate-pulse">
                      <Bell className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm sm:text-base">
                        {unreadCount} notifikasi belum dibaca
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Ketuk untuk membaca atau tandai semua dibaca
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={markAllAsRead} 
                    disabled={markingRead} 
                    className="min-h-[44px] w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  >
                    {markingRead ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4 mr-2" />
                    )}
                    Tandai Dibaca
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Announcements List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-muted" />
              <div className="h-12 w-12 rounded-full border-4 border-t-amber-500 animate-spin absolute inset-0" />
            </div>
            <p className="text-sm text-muted-foreground mt-4">Memuat notifikasi...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Tidak ada notifikasi</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {activeTab === 'all' 
                    ? 'Belum ada pengumuman atau promo saat ini'
                    : `Belum ada ${activeTab === 'info' ? 'pengumuman info' : 'promo'} saat ini`
                  }
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredAnnouncements.map((announcement, index) => {
                const isUnread = !announcement.isRead
                const live = isLive(announcement)
                const expired = isExpired(announcement.endDate)
                
                return (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleAnnouncementClick(announcement)}
                    className="cursor-pointer"
                  >
                    <Card className={cn(
                      'transition-all duration-200 active:scale-[0.99] overflow-hidden',
                      isUnread 
                        ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent shadow-lg shadow-amber-500/5' 
                        : 'hover:shadow-md hover:border-border/80'
                    )}>
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={cn(
                            'flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center',
                            announcement.type === 'PROMO' 
                              ? 'bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20' 
                              : 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20'
                          )}>
                            {announcement.type === 'PROMO' ? (
                              <Tag className={cn(
                                'h-6 w-6',
                                isUnread ? 'text-fuchsia-600' : 'text-muted-foreground'
                              )} />
                            ) : (
                              <Info className={cn(
                                'h-6 w-6',
                                isUnread ? 'text-teal-600' : 'text-muted-foreground'
                              )} />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                )}
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    'text-[10px]',
                                    announcement.type === 'PROMO' 
                                      ? 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20' 
                                      : 'bg-teal-500/10 text-teal-600 border-teal-500/20'
                                  )}
                                >
                                  {announcement.type}
                                </Badge>
                                {live && (
                                  <Badge className="bg-emerald-500 text-[10px] text-white border-0 animate-pulse">
                                    LIVE
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {formatRelativeTime(announcement.createdAt)}
                              </span>
                            </div>
                            
                            <h3 className="font-semibold text-sm sm:text-base line-clamp-1 mb-1">
                              {announcement.title}
                            </h3>
                            
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                              {announcement.description}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(announcement.endDate)}</span>
                              </div>
                              <StatusBadge 
                                isLive={live}
                                isExpired={expired}
                                daysRemaining={getDaysRemaining(announcement.endDate)}
                              />
                            </div>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog
          open={!!selectedAnnouncement}
          onOpenChange={(open) => !open && setSelectedAnnouncement(null)}
        >
          <DialogContent className="max-w-lg">
            {selectedAnnouncement && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      'p-2 rounded-xl',
                      selectedAnnouncement.type === 'PROMO' 
                        ? 'bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20' 
                        : 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20'
                    )}>
                      {selectedAnnouncement.type === 'PROMO' ? (
                        <Tag className="h-5 w-5 text-fuchsia-600" />
                      ) : (
                        <Info className="h-5 w-5 text-teal-600" />
                      )}
                    </div>
                    <Badge 
                      className={cn(
                        selectedAnnouncement.type === 'PROMO' 
                          ? 'bg-fuchsia-500' 
                          : 'bg-teal-500',
                        'text-white border-0'
                      )}
                    >
                      {selectedAnnouncement.type}
                    </Badge>
                    {isLive(selectedAnnouncement) && (
                      <Badge className="bg-emerald-500 text-white border-0">LIVE</Badge>
                    )}
                  </div>
                  <DialogTitle className="text-xl">
                    {selectedAnnouncement.title}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(selectedAnnouncement.startDate)} -{' '}
                    {formatDate(selectedAnnouncement.endDate)}
                  </DialogDescription>
                </DialogHeader>

                <Separator />

                <div className="space-y-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[300px] overflow-y-auto scroll-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {selectedAnnouncement.description}
                  </div>

                  {selectedAnnouncement.type === 'PROMO' && selectedAnnouncement.link && (
                    <div className="pt-2">
                      <a
                        href={selectedAnnouncement.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Lihat Detail Promo
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground border-t">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(selectedAnnouncement.createdAt)}
                    </span>
                    {selectedAnnouncement.isRead && (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Check className="h-3.5 w-3.5" />
                        Sudah dibaca
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setSelectedAnnouncement(null)}>
                    Tutup
                  </Button>
                  {selectedAnnouncement.link && (
                    <Button asChild>
                      <a
                        href={selectedAnnouncement.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Buka Link
                      </a>
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* New Announcement Modal */}
        <Dialog
          open={showNewAnnouncementModal && announcements.filter((a) => !a.isRead).length > 0}
          onOpenChange={handleCloseNewAnnouncementModal}
        >
          <DialogContent className="max-w-lg">
            {announcements.filter((a) => !a.isRead)[0] && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 animate-pulse">
                      <Megaphone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Pengumuman Baru!</p>
                      <p className="text-xs text-muted-foreground">Black Bear Gestun</p>
                    </div>
                  </div>
                  <DialogTitle className="text-xl">
                    {announcements.filter((a) => !a.isRead)[0].title}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 text-sm">
                    <Badge 
                      className={cn(
                        announcements.filter((a) => !a.isRead)[0].type === 'PROMO' 
                          ? 'bg-fuchsia-500' 
                          : 'bg-teal-500',
                        'text-white border-0'
                      )}
                    >
                      {announcements.filter((a) => !a.isRead)[0].type}
                    </Badge>
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(announcements.filter((a) => !a.isRead)[0].startDate)} -{' '}
                    {formatDate(announcements.filter((a) => !a.isRead)[0].endDate)}
                  </DialogDescription>
                </DialogHeader>

                <Separator />

                <div className="space-y-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[250px] overflow-y-auto scroll-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {announcements.filter((a) => !a.isRead)[0].description}
                  </div>

                  {announcements.filter((a) => !a.isRead)[0].type === 'PROMO' &&
                    announcements.filter((a) => !a.isRead)[0].link && (
                      <div className="pt-2">
                        <a
                          href={announcements.filter((a) => !a.isRead)[0].link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Lihat Detail Promo
                        </a>
                      </div>
                    )}
                </div>

                <div className="flex justify-between gap-2 mt-4">
                  <Button
                    variant="ghost"
                    onClick={handleCloseNewAnnouncementModal}
                    className="min-h-[44px]"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Tutup
                  </Button>
                  {announcements.filter((a) => !a.isRead)[0].link && (
                    <Button asChild className="min-h-[44px]">
                      <a
                        href={announcements.filter((a) => !a.isRead)[0].link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Buka Link
                      </a>
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
