'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuthStore, useIsPartner } from '@/store/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useIsMobile } from '@/hooks/use-mobile'
import { apiFetch } from '@/lib/api'
import { 
  User, 
  Mail, 
  Lock, 
  Image as ImageIcon, 
  Save, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronUp,
  Shield,
  Check,
  Sparkles,
  Loader2,
  Settings,
  KeyRound,
  Crown,
  Award,
  Star,
  CreditCard,
  MapPin,
  Phone,
} from 'lucide-react'
import type { User as UserType, Partner } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// Tier badge configurations
const tierConfig = {
  'Bronze': { 
    gradient: 'from-amber-600 to-orange-600',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    icon: Award
  },
  'Silver': { 
    gradient: 'from-slate-400 to-gray-500',
    bg: 'bg-slate-500/10',
    text: 'text-slate-500 dark:text-slate-400',
    icon: Award
  },
  'Gold': { 
    gradient: 'from-yellow-500 to-amber-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-600 dark:text-yellow-400',
    icon: Star
  },
  'Platinum': { 
    gradient: 'from-cyan-500 to-teal-500',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    icon: Crown
  },
  'Diamond': { 
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    icon: Crown
  }
}

export default function PartnerSettingsPage() {
  const router = useRouter()
  const { user, partner, token, setUser, setPartner } = useAuthStore()
  const isPartner = useIsPartner()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Preview visibility state for mobile
  const [showPreview, setShowPreview] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!token) return
    
    try {
      setLoading(true)
      const response = await apiFetch('/api/auth/profile')
      
      const data = await response.json()
      
      if (data.success && data.data) {
        setFormData({
          name: data.data.user.name || '',
          email: data.data.user.email || '',
          avatar: data.data.user.avatar || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [token, toast])

  useEffect(() => {
    if (!isPartner) {
      router.push('/login')
      return
    }
    
    fetchProfile()
  }, [isPartner, router, fetchProfile])

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Nama tidak boleh kosong'
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email tidak boleh kosong'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid'
    }
    
    // Password validation (only if trying to change password)
    if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Password saat ini diperlukan'
      }
      
      if (!formData.newPassword) {
        newErrors.newPassword = 'Password baru diperlukan'
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password minimal 6 karakter'
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Konfirmasi password diperlukan'
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Password tidak cocok'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save profile
  const handleSaveProfile = async () => {
    if (!validateForm() || !token) return
    
    try {
      setSaving(true)
      
      const updateData: {
        name?: string
        email?: string
        avatar?: string
        password?: string
        currentPassword?: string
      } = {
        name: formData.name,
        email: formData.email,
        avatar: formData.avatar || null
      }
      
      // Include password change if provided
      if (formData.newPassword && formData.currentPassword) {
        updateData.password = formData.newPassword
        updateData.currentPassword = formData.currentPassword
      }
      
      const response = await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile')
      }
      
      // Update auth store
      if (data.data?.user) {
        setUser(data.data.user)
      }
      if (data.data?.partner) {
        setPartner(data.data.partner)
      }
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
      
      toast({
        title: 'Berhasil',
        description: 'Profile berhasil diperbarui'
      })
      
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyimpan profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Get tier config
  const getTierConfig = (tier: string) => {
    return tierConfig[tier as keyof typeof tierConfig] || tierConfig['Bronze']
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-muted" />
              <div className="h-12 w-12 rounded-full border-4 border-t-teal-500 animate-spin absolute inset-0" />
            </div>
            <p className="text-sm text-muted-foreground">Memuat profil...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const TierIcon = partner ? getTierConfig(partner.tier).icon : Award

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-violet-500 p-4 sm:p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative">
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
              Pengaturan Akun
            </h1>
            <p className="text-sm sm:text-base text-white/80 mt-1">
              Kelola informasi profil dan keamanan akun Anda
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Edit Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-muted/30">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  Edit Profil
                </CardTitle>
                <CardDescription className="text-sm">Perbarui informasi akun Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-teal-500" />
                    Nama Lengkap
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nama lengkap Anda"
                    className="h-10 md:h-11"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
                
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-teal-500" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="h-10 md:h-11"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                
                {/* Avatar URL */}
                <div className="space-y-2">
                  <Label htmlFor="avatar" className="text-sm flex items-center gap-2">
                    <ImageIcon className="h-3.5 w-3.5 text-teal-500" />
                    URL Foto Profil
                  </Label>
                  <Input
                    id="avatar"
                    value={formData.avatar}
                    onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                    placeholder="https://example.com/avatar.png"
                    className="h-10 md:h-11"
                  />
                  <p className="text-xs text-muted-foreground">Masukkan URL gambar untuk foto profil Anda</p>
                </div>
                
                <Separator />
                
                {/* Password Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div className="h-6 w-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <KeyRound className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    Ubah Password
                  </div>
                  <p className="text-xs text-muted-foreground">Kosongkan jika tidak ingin mengubah password</p>
                  
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm">Password Saat Ini</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Masukkan password saat ini"
                        className="h-10 md:h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <p className="text-xs text-destructive">{errors.currentPassword}</p>
                    )}
                  </div>
                  
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm">Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Masukkan password baru"
                        className="h-10 md:h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-xs text-destructive">{errors.newPassword}</p>
                    )}
                  </div>
                  
                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm">Konfirmasi Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Konfirmasi password baru"
                        className="h-10 md:h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Save Button */}
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving}
                  className="w-full h-10 md:h-11 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Preview - Collapsible on Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg overflow-hidden">
              {isMobile ? (
                <>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors bg-gradient-to-r from-muted/50 to-muted/30"
                  >
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                      Preview Profil
                    </CardTitle>
                    {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showPreview && (
                    <CardContent className="pt-0">
                      <div className="flex flex-col items-center space-y-4 p-4 border rounded-xl bg-gradient-to-br from-muted/30 to-muted/10">
                        <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                          <AvatarImage src={formData.avatar || undefined} />
                          <AvatarFallback className="text-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white">
                            {formData.name?.charAt(0).toUpperCase() || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold">{formData.name || 'Nama Partner'}</h3>
                          <p className="text-sm text-muted-foreground">{formData.email || 'email@example.com'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0">PARTNER</Badge>
                          {partner && (
                            <Badge className={cn('text-xs border', getTierConfig(partner.tier).bg, getTierConfig(partner.tier).text)}>
                              <TierIcon className="h-3 w-3 mr-1" />
                              {partner.tier}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Account Info */}
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Status Akun</p>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              {partner?.status || 'AKTIF'}
                            </p>
                          </div>
                        </div>
                        
                        {partner && (
                          <>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                              <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <CreditCard className="h-4 w-4 text-violet-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Komisi</p>
                                <p className="text-sm font-medium">{(partner.commissionRate * 100).toFixed(0)}%</p>
                              </div>
                            </div>
                            
                            {partner.bank && (
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                                <div className="h-8 w-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                                  <CreditCard className="h-4 w-4 text-teal-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground">Bank</p>
                                  <p className="text-sm font-medium">{partner.bank} - {partner.accountNumber}</p>
                                </div>
                              </div>
                            )}
                            
                            {partner.city && (
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                  <MapPin className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground">Lokasi</p>
                                  <p className="text-sm font-medium">{partner.city}</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                          <div className="h-8 w-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                            <Lock className="h-4 w-4 text-rose-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Password</p>
                            <p className="text-sm font-medium">••••••••</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </>
              ) : (
                <>
                  <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                      Preview Profil
                    </CardTitle>
                    <CardDescription>Bagaimana profil Anda akan terlihat</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col items-center space-y-4 p-6 border rounded-xl bg-gradient-to-br from-muted/30 to-muted/10">
                      <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                        <AvatarImage src={formData.avatar || undefined} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white">
                          {formData.name?.charAt(0).toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <h3 className="text-xl font-semibold">{formData.name || 'Nama Partner'}</h3>
                        <p className="text-muted-foreground">{formData.email || 'email@example.com'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0">PARTNER</Badge>
                        {partner && (
                          <Badge className={cn('text-xs border', getTierConfig(partner.tier).bg, getTierConfig(partner.tier).text)}>
                            <TierIcon className="h-3 w-3 mr-1" />
                            {partner.tier}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Account Info */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Status Akun</p>
                          <p className="font-medium flex items-center gap-1">
                            <Check className="h-4 w-4 text-emerald-500" />
                            {partner?.status || 'AKTIF'}
                          </p>
                        </div>
                      </div>
                      
                      {partner && (
                        <>
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                            <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                              <CreditCard className="h-5 w-5 text-violet-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">Komisi</p>
                              <p className="font-medium">{(partner.commissionRate * 100).toFixed(0)}%</p>
                            </div>
                          </div>
                          
                          {partner.bank && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                              <div className="h-10 w-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                                <CreditCard className="h-5 w-5 text-teal-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Bank</p>
                                <p className="font-medium">{partner.bank} - {partner.accountNumber}</p>
                              </div>
                            </div>
                          )}
                          
                          {partner.city && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <MapPin className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Lokasi</p>
                                <p className="font-medium">{partner.city}</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                        <div className="h-10 w-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                          <Lock className="h-5 w-5 text-rose-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Password</p>
                          <p className="font-medium">••••••••</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
