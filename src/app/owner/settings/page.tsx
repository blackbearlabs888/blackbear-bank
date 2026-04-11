'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useIsMobile } from '@/hooks/use-mobile'
import { 
  User, 
  Palette, 
  Search, 
  Phone, 
  Wrench,
  Save,
  Eye,
  Instagram,
  Facebook,
  AlertTriangle,
  Globe,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type { SiteConfig, User as UserType } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function OwnerSettingsPage() {
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  
  // Site config state
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Preview visibility state for mobile
  const [showProfilePreview, setShowProfilePreview] = useState(false)
  const [showBrandPreview, setShowBrandPreview] = useState(false)
  const [showSeoPreview, setShowSeoPreview] = useState(false)
  const [showContactPreview, setShowContactPreview] = useState(false)
  const [showMaintenancePreview, setShowMaintenancePreview] = useState(false)
  
  // Profile tab state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    password: '',
    currentPassword: '',
    avatar: ''
  })
  
  // Brand Identity tab state
  const [brandForm, setBrandForm] = useState({
    brandName: '',
    logoUrl: '',
    faviconUrl: ''
  })
  
  // SEO tab state
  const [seoForm, setSeoForm] = useState({
    siteTitle: '',
    metaDescription: '',
    metaKeywords: ''
  })
  
  // Contact tab state
  const [contactForm, setContactForm] = useState({
    contactPhone: '',
    contactWhatsapp: '',
    contactEmail: '',
    socialInstagram: '',
    socialFacebook: '',
    socialTiktok: ''
  })
  
  // Maintenance tab state
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceMode: false,
    maintenanceMessage: ''
  })

  // Fetch site config
  const fetchSiteConfig = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/site-config')
      const data = await response.json()
      
      if (data.success && data.data) {
        setSiteConfig(data.data)
        
        // Initialize all forms with fetched data
        setProfileForm({
          name: data.data.ownerName || '',
          email: data.data.ownerEmail || '',
          password: '',
          currentPassword: '',
          avatar: data.data.ownerAvatar || ''
        })
        
        setBrandForm({
          brandName: data.data.brandName || 'Black Bear',
          logoUrl: data.data.logoUrl || '',
          faviconUrl: data.data.faviconUrl || ''
        })
        
        setSeoForm({
          siteTitle: data.data.siteTitle || '',
          metaDescription: data.data.metaDescription || '',
          metaKeywords: data.data.metaKeywords || ''
        })
        
        setContactForm({
          contactPhone: data.data.contactPhone || '',
          contactWhatsapp: data.data.contactWhatsapp || '',
          contactEmail: data.data.contactEmail || '',
          socialInstagram: data.data.socialInstagram || '',
          socialFacebook: data.data.socialFacebook || '',
          socialTiktok: data.data.socialTiktok || ''
        })
        
        setMaintenanceForm({
          maintenanceMode: data.data.maintenanceMode || false,
          maintenanceMessage: data.data.maintenanceMessage || ''
        })
      }
    } catch (error) {
      console.error('Error fetching site config:', error)
      toast({
        title: 'Error',
        description: 'Failed to load site configuration',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSiteConfig()
  }, [fetchSiteConfig])

  // Save profile
  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      
      const profileResponse = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email,
          avatar: profileForm.avatar,
          password: profileForm.password || undefined,
          currentPassword: profileForm.currentPassword || undefined
        })
      })
      
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        throw new Error(profileData.error || 'Failed to update profile')
      }
      
      if (profileData.data?.user) {
        setUser(profileData.data.user)
      }
      
      setProfileForm(prev => ({
        ...prev,
        password: '',
        currentPassword: ''
      }))
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      })
      
      fetchSiteConfig()
      
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Save brand identity
  const handleSaveBrand = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandForm)
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update brand identity')
      }
      
      setSiteConfig(data.data)
      
      toast({
        title: 'Success',
        description: 'Brand identity updated successfully'
      })
      
    } catch (error) {
      console.error('Error saving brand:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update brand identity',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Save SEO
  const handleSaveSeo = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seoForm)
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update SEO settings')
      }
      
      setSiteConfig(data.data)
      
      toast({
        title: 'Success',
        description: 'SEO settings updated successfully'
      })
      
    } catch (error) {
      console.error('Error saving SEO:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update SEO settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Save Contact
  const handleSaveContact = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update contact settings')
      }
      
      setSiteConfig(data.data)
      
      toast({
        title: 'Success',
        description: 'Contact settings updated successfully'
      })
      
    } catch (error) {
      console.error('Error saving contact:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update contact settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Save Maintenance
  const handleSaveMaintenance = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceForm)
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update maintenance settings')
      }
      
      setSiteConfig(data.data)
      
      toast({
        title: 'Success',
        description: 'Maintenance settings updated successfully'
      })
      
    } catch (error) {
      console.error('Error saving maintenance:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update maintenance settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Mobile-optimized tab labels
  const tabItems = [
    { value: 'profile', icon: User, label: 'Profile' },
    { value: 'brand', icon: Palette, label: 'Brand' },
    { value: 'seo', icon: Search, label: 'SEO' },
    { value: 'contact', icon: Phone, label: 'Contact' },
    { value: 'maintenance', icon: Wrench, label: 'Maintenance' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Site Configuration</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your website settings and preferences</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
          <ScrollArea className="w-full whitespace-nowrap -mx-3 px-3 md:mx-0 md:px-0">
            <TabsList className={cn(
              "inline-flex w-auto min-w-full",
              isMobile ? "grid grid-cols-5 w-full" : "grid grid-cols-5 w-full"
            )}>
              {tabItems.map((item) => (
                <TabsTrigger 
                  key={item.value} 
                  value={item.value} 
                  className="flex items-center gap-1.5 px-2 md:px-3"
                >
                  <item.icon className="h-4 w-4" />
                  <span className={cn("hidden sm:inline", isMobile && "sr-only")}>{item.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Edit Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                    Edit Profile
                  </CardTitle>
                  <CardDescription className="text-sm">Update your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Nama</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className="h-10 md:h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="h-10 md:h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="avatar" className="text-sm">Avatar Profile URL</Label>
                    <Input
                      id="avatar"
                      value={profileForm.avatar}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, avatar: e.target.value }))}
                      placeholder="https://example.com/avatar.png"
                      className="h-10 md:h-11"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={profileForm.currentPassword}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      className="h-10 md:h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={profileForm.password}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter new password"
                      className="h-10 md:h-11"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={saving}
                    className="w-full h-10 md:h-11"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview - Collapsible on Mobile */}
              <Card className={isMobile ? '' : ''}>
                {isMobile ? (
                  <>
                    <button
                      onClick={() => setShowProfilePreview(!showProfilePreview)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Eye className="h-4 w-4" />
                        Profile Preview
                      </CardTitle>
                      {showProfilePreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showProfilePreview && (
                      <CardContent className="pt-0">
                        <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-muted/30">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={profileForm.avatar || undefined} />
                            <AvatarFallback className="text-xl gradient-primary text-white">
                              {profileForm.name?.charAt(0).toUpperCase() || 'O'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold">{profileForm.name || 'Owner Name'}</h3>
                            <p className="text-sm text-muted-foreground">{profileForm.email || 'owner@email.com'}</p>
                          </div>
                          <Badge variant="secondary">OWNER</Badge>
                        </div>
                      </CardContent>
                    )}
                  </>
                ) : (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Profile Preview
                      </CardTitle>
                      <CardDescription>How your profile appears</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-muted/30">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={profileForm.avatar || undefined} />
                          <AvatarFallback className="text-2xl gradient-primary text-white">
                            {profileForm.name?.charAt(0).toUpperCase() || 'O'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <h3 className="text-xl font-semibold">{profileForm.name || 'Owner Name'}</h3>
                          <p className="text-muted-foreground">{profileForm.email || 'owner@email.com'}</p>
                        </div>
                        <Badge variant="secondary">OWNER</Badge>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Brand Identity Tab */}
          <TabsContent value="brand" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Edit Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Palette className="h-4 w-4 md:h-5 md:w-5" />
                    Brand Identity
                  </CardTitle>
                  <CardDescription className="text-sm">Configure your brand name, logo and favicon</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brandName" className="text-sm">Brand Name</Label>
                    <Input
                      id="brandName"
                      value={brandForm.brandName}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, brandName: e.target.value }))}
                      placeholder="Black Bear"
                      className="h-10 md:h-11"
                    />
                    <p className="text-xs text-muted-foreground">This name will appear in navbar, footer, and dashboard</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl" className="text-sm">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={brandForm.logoUrl}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                      className="h-10 md:h-11"
                    />
                    <p className="text-xs text-muted-foreground">Recommended: 200x60px PNG</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="faviconUrl" className="text-sm">Favicon URL</Label>
                    <Input
                      id="faviconUrl"
                      value={brandForm.faviconUrl}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, faviconUrl: e.target.value }))}
                      placeholder="https://example.com/favicon.ico"
                      className="h-10 md:h-11"
                    />
                    <p className="text-xs text-muted-foreground">Recommended: 32x32px ICO or PNG</p>
                  </div>
                  
                  <Button 
                    onClick={handleSaveBrand} 
                    disabled={saving}
                    className="w-full h-10 md:h-11"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Brand Identity'}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                {isMobile ? (
                  <>
                    <button
                      onClick={() => setShowBrandPreview(!showBrandPreview)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Eye className="h-4 w-4" />
                        Brand Preview
                      </CardTitle>
                      {showBrandPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showBrandPreview && (
                      <CardContent className="pt-0 space-y-4">
                        {/* Brand Name Preview */}
                        <div className="p-3 border rounded-lg bg-muted/30">
                          <p className="text-xs font-medium mb-2">Brand Name</p>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                              <span className="text-white font-bold text-xs">
                                {brandForm.brandName?.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) || 'BB'}
                              </span>
                            </div>
                            <span className="font-bold">{brandForm.brandName || 'Black Bear'}</span>
                          </div>
                        </div>
                        
                        {/* Navbar Preview */}
                        <div className="p-3 border rounded-lg bg-muted/30">
                          <p className="text-xs font-medium mb-2">Navbar Preview</p>
                          <div className="flex items-center gap-2 p-2 bg-background rounded border">
                            {brandForm.faviconUrl ? (
                              <img src={brandForm.faviconUrl} alt="Favicon" className="h-5 w-5 object-contain" />
                            ) : (
                              <div className="h-5 w-5 rounded gradient-primary flex items-center justify-center">
                                <span className="text-white font-bold text-[8px]">BB</span>
                              </div>
                            )}
                            <span className="font-bold text-sm">{brandForm.brandName || 'Black Bear'}</span>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </>
                ) : (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Brand Preview
                      </CardTitle>
                      <CardDescription>How your brand will appear</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Brand Name Preview */}
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <p className="text-sm font-medium mb-3">Brand Name</p>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {brandForm.brandName?.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) || 'BB'}
                              </span>
                            </div>
                            <span className="font-bold text-lg">{brandForm.brandName || 'Black Bear'}</span>
                          </div>
                        </div>
                        
                        {/* Logo Preview */}
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <p className="text-sm font-medium mb-3">Logo</p>
                          <div className="flex items-center gap-3">
                            {brandForm.logoUrl ? (
                              <img src={brandForm.logoUrl} alt="Logo" className="h-12 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            ) : (
                              <div className="h-12 px-4 rounded-lg gradient-primary flex items-center justify-center">
                                <span className="text-white font-bold text-lg">{brandForm.brandName || 'Black Bear'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Favicon Preview */}
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <p className="text-sm font-medium mb-3">Favicon</p>
                          <div className="flex items-center gap-4">
                            {brandForm.faviconUrl ? (
                              <img src={brandForm.faviconUrl} alt="Favicon" className="h-8 w-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            ) : (
                              <div className="h-8 w-8 rounded gradient-primary flex items-center justify-center">
                                <span className="text-white font-bold text-xs">
                                  {brandForm.brandName?.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) || 'BB'}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-muted-foreground">Browser Tab Icon</span>
                          </div>
                        </div>
                        
                        {/* Navbar Preview */}
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <p className="text-sm font-medium mb-3">Navbar Preview</p>
                          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                            {brandForm.faviconUrl ? (
                              <img src={brandForm.faviconUrl} alt="Favicon" className="h-6 w-6 object-contain" />
                            ) : (
                              <div className="h-6 w-6 rounded gradient-primary flex items-center justify-center">
                                <span className="text-white font-bold text-[8px]">BB</span>
                              </div>
                            )}
                            {brandForm.logoUrl ? (
                              <img src={brandForm.logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
                            ) : (
                              <span className="font-bold text-sm">{brandForm.brandName || 'Black Bear'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Edit Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Search className="h-4 w-4 md:h-5 md:w-5" />
                    SEO Tools
                  </CardTitle>
                  <CardDescription className="text-sm">Optimize your site for search engines</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteTitle" className="text-sm">Site Title</Label>
                    <Input
                      id="siteTitle"
                      value={seoForm.siteTitle}
                      onChange={(e) => setSeoForm(prev => ({ ...prev, siteTitle: e.target.value }))}
                      placeholder="Black Bear - Gestun Service"
                      className="h-10 md:h-11"
                    />
                    <p className="text-xs text-muted-foreground">Appears in browser tab and search results</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="metaDescription" className="text-sm">Meta Description</Label>
                    <Textarea
                      id="metaDescription"
                      value={seoForm.metaDescription}
                      onChange={(e) => setSeoForm(prev => ({ ...prev, metaDescription: e.target.value }))}
                      placeholder="Layanan Gestun Terpercaya dengan harga kompetitif dan proses cepat"
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">{seoForm.metaDescription.length}/160 characters recommended</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="metaKeywords" className="text-sm">Meta Keywords</Label>
                    <Input
                      id="metaKeywords"
                      value={seoForm.metaKeywords}
                      onChange={(e) => setSeoForm(prev => ({ ...prev, metaKeywords: e.target.value }))}
                      placeholder="gestun, voucher, cashback, shopee, tokopedia"
                      className="h-10 md:h-11"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated keywords</p>
                  </div>
                  
                  <Button 
                    onClick={handleSaveSeo} 
                    disabled={saving}
                    className="w-full h-10 md:h-11"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save SEO Settings'}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                {isMobile ? (
                  <>
                    <button
                      onClick={() => setShowSeoPreview(!showSeoPreview)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Eye className="h-4 w-4" />
                        SEO Preview
                      </CardTitle>
                      {showSeoPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showSeoPreview && (
                      <CardContent className="pt-0 space-y-4">
                        {/* Search Result Preview */}
                        <div className="p-3 border rounded-lg bg-white dark:bg-gray-900">
                          <p className="text-xs font-medium mb-2 text-muted-foreground">Google Search Preview</p>
                          <h3 className="text-blue-600 dark:text-blue-400 text-sm truncate">
                            {seoForm.siteTitle || 'Black Bear - Gestun Service'}
                          </h3>
                          <p className="text-green-700 dark:text-green-400 text-xs truncate">
                            https://blackbear.com
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
                            {seoForm.metaDescription || 'Layanan Gestun Terpercaya...'}
                          </p>
                        </div>
                        
                        {/* HTML Code Preview */}
                        <div className="p-3 border rounded-lg bg-muted/30">
                          <p className="text-xs font-medium mb-2">HTML Code</p>
                          <pre className="text-[10px] bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
{`<title>${seoForm.siteTitle || 'Black Bear'}</title>
<meta name="description" content="${seoForm.metaDescription?.slice(0, 50) || '...'}" />`}
                          </pre>
                        </div>
                      </CardContent>
                    )}
                  </>
                ) : (
                  <>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        HTML Meta Tags Preview
                      </CardTitle>
                      <CardDescription>How search engines see your site</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Search Result Preview */}
                      <div className="mb-6 p-4 border rounded-lg bg-white dark:bg-gray-900">
                        <p className="text-sm font-medium mb-2 text-muted-foreground">Google Search Result Preview</p>
                        <div className="space-y-1">
                          <h3 className="text-blue-600 dark:text-blue-400 text-lg hover:underline cursor-pointer truncate">
                            {seoForm.siteTitle || 'Black Bear - Gestun Service'}
                          </h3>
                          <p className="text-green-700 dark:text-green-400 text-sm truncate">
                            https://blackbear.com
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                            {seoForm.metaDescription || 'Layanan Gestun Terpercaya dengan harga kompetitif dan proses cepat'}
                          </p>
                        </div>
                      </div>
                      
                      {/* HTML Code Preview */}
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <p className="text-sm font-medium mb-3">HTML Code</p>
                        <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`<!DOCTYPE html>
<html>
<head>
  <title>${seoForm.siteTitle || 'Black Bear - Gestun Service'}</title>
  <meta name="description" content="${seoForm.metaDescription || 'Layanan Gestun Terpercaya...'}" />
  <meta name="keywords" content="${seoForm.metaKeywords || 'gestun, voucher, cashback'}" />
</head>
</html>`}
                        </pre>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Edit Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Phone className="h-4 w-4 md:h-5 md:w-5" />
                    Contact & Social Media
                  </CardTitle>
                  <CardDescription className="text-sm">Configure your contact information and social links</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone" className="text-sm">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        value={contactForm.contactPhone}
                        onChange={(e) => setContactForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="+62812345678"
                        className="h-10 md:h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contactWhatsapp" className="text-sm">WhatsApp</Label>
                      <Input
                        id="contactWhatsapp"
                        value={contactForm.contactWhatsapp}
                        onChange={(e) => setContactForm(prev => ({ ...prev, contactWhatsapp: e.target.value }))}
                        placeholder="+62812345678"
                        className="h-10 md:h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-sm">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactForm.contactEmail}
                      onChange={(e) => setContactForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="contact@blackbear.com"
                      className="h-10 md:h-11"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="socialInstagram" className="flex items-center gap-2 text-sm">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </Label>
                      <Input
                        id="socialInstagram"
                        value={contactForm.socialInstagram}
                        onChange={(e) => setContactForm(prev => ({ ...prev, socialInstagram: e.target.value }))}
                        placeholder="https://instagram.com/blackbear"
                        className="h-10 md:h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="socialFacebook" className="flex items-center gap-2 text-sm">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </Label>
                      <Input
                        id="socialFacebook"
                        value={contactForm.socialFacebook}
                        onChange={(e) => setContactForm(prev => ({ ...prev, socialFacebook: e.target.value }))}
                        placeholder="https://facebook.com/blackbear"
                        className="h-10 md:h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="socialTiktok" className="flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      TikTok
                    </Label>
                    <Input
                      id="socialTiktok"
                      value={contactForm.socialTiktok}
                      onChange={(e) => setContactForm(prev => ({ ...prev, socialTiktok: e.target.value }))}
                      placeholder="https://tiktok.com/@blackbear"
                      className="h-10 md:h-11"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSaveContact} 
                    disabled={saving}
                    className="w-full h-10 md:h-11"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Contact Settings'}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                {isMobile ? (
                  <>
                    <button
                      onClick={() => setShowContactPreview(!showContactPreview)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Eye className="h-4 w-4" />
                        Footer Preview
                      </CardTitle>
                      {showContactPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showContactPreview && (
                      <CardContent className="pt-0">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-900 text-white p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded gradient-primary flex items-center justify-center">
                                <span className="text-white font-bold text-[8px]">BB</span>
                              </div>
                              <span className="font-bold text-sm">Black Bear</span>
                            </div>
                            
                            <div className="space-y-1 text-xs text-gray-300">
                              {contactForm.contactPhone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  <span>{contactForm.contactPhone}</span>
                                </div>
                              )}
                              {contactForm.contactWhatsapp && (
                                <div className="flex items-center gap-2">
                                  <MessageCircle className="h-3 w-3" />
                                  <span>{contactForm.contactWhatsapp}</span>
                                </div>
                              )}
                              {contactForm.contactEmail && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3" />
                                  <span>{contactForm.contactEmail}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {contactForm.socialInstagram && (
                                <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center">
                                  <Instagram className="h-3 w-3" />
                                </div>
                              )}
                              {contactForm.socialFacebook && (
                                <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center">
                                  <Facebook className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            
                            <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-700">
                              © {new Date().getFullYear()} Black Bear
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
                        <Eye className="h-5 w-5" />
                        Footer Preview
                      </CardTitle>
                      <CardDescription>How your contact info appears in footer</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-900 text-white p-6 space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded gradient-primary flex items-center justify-center">
                              <span className="text-white font-bold text-xs">BB</span>
                            </div>
                            <span className="font-bold">Black Bear</span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-300">
                            {contactForm.contactPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{contactForm.contactPhone}</span>
                              </div>
                            )}
                            {contactForm.contactWhatsapp && (
                              <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                <span>{contactForm.contactWhatsapp}</span>
                              </div>
                            )}
                            {contactForm.contactEmail && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{contactForm.contactEmail}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {contactForm.socialInstagram && (
                              <a href={contactForm.socialInstagram} className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors">
                                <Instagram className="h-4 w-4" />
                              </a>
                            )}
                            {contactForm.socialFacebook && (
                              <a href={contactForm.socialFacebook} className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors">
                                <Facebook className="h-4 w-4" />
                              </a>
                            )}
                            {contactForm.socialTiktok && (
                              <a href={contactForm.socialTiktok} className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                </svg>
                              </a>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                            &copy; {new Date().getFullYear()} Black Bear. All rights reserved.
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Edit Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Wrench className="h-4 w-4 md:h-5 md:w-5" />
                    Maintenance Mode
                  </CardTitle>
                  <CardDescription className="text-sm">Control site availability and maintenance messages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenanceMode" className="text-sm font-medium">Maintenance Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        {maintenanceForm.maintenanceMode ? 'Site is currently offline' : 'Site is currently online'}
                      </p>
                    </div>
                    <Switch
                      id="maintenanceMode"
                      checked={maintenanceForm.maintenanceMode}
                      onCheckedChange={(checked) => setMaintenanceForm(prev => ({ ...prev, maintenanceMode: checked }))}
                    />
                  </div>
                  
                  {maintenanceForm.maintenanceMode && (
                    <div className="p-3 md:p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium text-sm">Warning</span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Maintenance mode is enabled. Only admins can access the site.
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceMessage" className="text-sm">Maintenance Message</Label>
                    <Textarea
                      id="maintenanceMessage"
                      value={maintenanceForm.maintenanceMessage}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                      placeholder="We're currently performing maintenance. Please check back soon!"
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">This message will be displayed to visitors during maintenance</p>
                  </div>
                  
                  <Button 
                    onClick={handleSaveMaintenance} 
                    disabled={saving}
                    className="w-full h-10 md:h-11"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Maintenance Settings'}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                {isMobile ? (
                  <>
                    <button
                      onClick={() => setShowMaintenancePreview(!showMaintenancePreview)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Eye className="h-4 w-4" />
                        Maintenance Preview
                      </CardTitle>
                      {showMaintenancePreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showMaintenancePreview && (
                      <CardContent className="pt-0">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-[250px] flex flex-col items-center justify-center p-6 text-center">
                            <div className="space-y-4 max-w-xs">
                              <div className="flex justify-center">
                                <div className="h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                  <Wrench className="h-8 w-8 text-yellow-500 animate-pulse" />
                                </div>
                              </div>
                              
                              <h2 className="text-lg font-bold text-white">Under Maintenance</h2>
                              
                              <p className="text-sm text-gray-400">
                                {maintenanceForm.maintenanceMessage || "We're currently performing maintenance. Please check back soon!"}
                              </p>
                              
                              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                <span>Maintenance in progress</span>
                              </div>
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
                        <Eye className="h-5 w-5" />
                        Maintenance Page Preview
                      </CardTitle>
                      <CardDescription>How the maintenance page will appear to visitors</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
                          <div className="space-y-6 max-w-md">
                            <div className="flex justify-center">
                              <div className="h-20 w-20 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                <Wrench className="h-10 w-10 text-yellow-500 animate-pulse" />
                              </div>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-white">Under Maintenance</h2>
                            
                            <p className="text-gray-400">
                              {maintenanceForm.maintenanceMessage || "We're currently performing maintenance. Please check back soon!"}
                            </p>
                            
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                              <span>Maintenance in progress</span>
                            </div>
                            
                            <div className="pt-4 border-t border-gray-700">
                              <div className="flex items-center justify-center gap-2">
                                <div className="h-6 w-6 rounded gradient-primary flex items-center justify-center">
                                  <span className="text-white font-bold text-[8px]">BB</span>
                                </div>
                                <span className="font-bold text-sm text-gray-400">Black Bear</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
