'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, User, Mail, Phone, Building2, CreditCard, MapPin, ArrowRight, ArrowLeft, Check, Lock, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/hooks/use-toast'
import { NavbarDesktop } from '@/components/layout/navbar-desktop'
import { Footer } from '@/components/layout/footer'
import { cn } from '@/lib/utils'

const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama lengkap wajib diisi')
    .min(3, 'Nama minimal 3 karakter'),
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  whatsapp: z
    .string()
    .min(1, 'No. WhatsApp wajib diisi')
    .regex(/^08\d{8,12}$/, 'Format WhatsApp tidak valid (contoh: 08xxxxxxxxxx)'),
  password: z
    .string()
    .min(6, 'Password minimal 6 karakter'),
  confirmPassword: z
    .string()
    .min(1, 'Konfirmasi password wajib diisi'),
  bankName: z
    .string()
    .min(1, 'Nama bank wajib diisi'),
  accountNumber: z
    .string()
    .min(1, 'No. rekening wajib diisi')
    .regex(/^\d+$/, 'No. rekening harus berupa angka'),
  accountHolder: z
    .string()
    .min(1, 'Nama pemilik rekening wajib diisi'),
  city: z
    .string()
    .min(1, 'Kota wajib diisi'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

// Steps configuration
const steps = [
  { id: 1, title: 'Informasi Pribadi', description: 'Data diri Anda', icon: User },
  { id: 2, title: 'Keamanan', description: 'Password akun', icon: Lock },
  { id: 3, title: 'Informasi Bank', description: 'Data rekening', icon: Building2 },
]

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      whatsapp: '',
      password: '',
      confirmPassword: '',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      city: '',
    },
  })

  // Watch form values for progress calculation
  const formValues = form.watch()
  
  // Calculate step completion
  const getStepCompletion = (stepId: number) => {
    switch (stepId) {
      case 1:
        return {
          name: formValues.name.length >= 3,
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email),
          whatsapp: /^08\d{8,12}$/.test(formValues.whatsapp),
        }
      case 2:
        return {
          password: formValues.password.length >= 6,
          confirmPassword: formValues.confirmPassword.length >= 6 && formValues.password === formValues.confirmPassword,
        }
      case 3:
        return {
          bankName: formValues.bankName.length >= 1,
          accountNumber: /^\d+$/.test(formValues.accountNumber),
          accountHolder: formValues.accountHolder.length >= 1,
          city: formValues.city.length >= 1,
        }
      default:
        return {}
    }
  }
  
  // Calculate overall progress
  const calculateProgress = () => {
    const allSteps = [1, 2, 3]
    let completed = 0
    let total = 0
    
    allSteps.forEach(stepId => {
      const completion = getStepCompletion(stepId)
      total += Object.keys(completion).length
      completed += Object.values(completion).filter(Boolean).length
    })
    
    return Math.round((completed / total) * 100)
  }
  
  // Check if current step is valid
  const isStepValid = (stepId: number) => {
    const completion = getStepCompletion(stepId)
    return Object.values(completion).every(Boolean)
  }

  // Navigation handlers
  const nextStep = () => {
    if (currentStep < 3 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          whatsapp: data.whatsapp,
          password: data.password,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountHolder: data.accountHolder,
          city: data.city,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Registrasi gagal')
      }

      // Update auth store
      login(result.data.user, result.data.token, result.data.partner)

      toast({
        title: 'Registrasi berhasil',
        description: 'Selamat datang! Akun mitra Anda telah dibuat.',
      })

      // Redirect to partner dashboard
      router.push('/partner/dashboard')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Registrasi gagal',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const progress = calculateProgress()

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavbarDesktop />

      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          <Card className="overflow-hidden border-0 shadow-xl">
            {/* Header with gradient */}
            <div className="gradient-primary p-6 text-center text-white">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-3"
              >
                <span className="text-white font-bold text-xl">BB</span>
              </motion.div>
              <h2 className="text-xl font-bold mb-1">Daftar Mitra</h2>
              <p className="text-white/80 text-sm">
                Bergabung menjadi mitra Black Bear Gestun
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="px-6 pt-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-medium text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
              
              {/* Step Indicators */}
              <div className="flex items-center justify-between mt-4 mb-2">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  const isActive = currentStep === step.id
                  const isCompleted = isStepValid(step.id)
                  
                  return (
                    <div key={step.id} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (step.id < currentStep || isStepValid(step.id)) {
                            setCurrentStep(step.id)
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center",
                          (step.id < currentStep || isStepValid(step.id)) && "cursor-pointer"
                        )}
                      >
                        <motion.div
                          animate={{ scale: isActive ? 1.1 : 1 }}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                            isActive && "ring-2 ring-primary ring-offset-2",
                            isCompleted
                              ? "gradient-primary text-white"
                              : isActive
                              ? "bg-primary text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </motion.div>
                        <span className={cn(
                          "text-xs mt-1.5 font-medium",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}>
                          {step.title}
                        </span>
                      </button>
                      
                      {index < steps.length - 1 && (
                        <div className={cn(
                          "w-12 h-0.5 mx-2 mb-6",
                          isStepValid(step.id) ? "bg-primary" : "bg-muted"
                        )} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <AnimatePresence mode="wait" custom={currentStep}>
                    {/* Step 1: Personal Information */}
                    {currentStep === 1 && (
                      <motion.div
                        key="step1"
                        custom={1}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">Informasi Pribadi</h3>
                            <p className="text-xs text-muted-foreground">Lengkapi data diri Anda</p>
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nama Lengkap</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Masukkan nama lengkap"
                                    {...field}
                                    disabled={isLoading}
                                    className="pl-10"
                                  />
                                  {field.value.length >= 3 && (
                                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="email"
                                    placeholder="contoh@email.com"
                                    {...field}
                                    disabled={isLoading}
                                    className="pl-10"
                                  />
                                  {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value) && (
                                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="whatsapp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>No. WhatsApp</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="08xxxxxxxxxx"
                                    {...field}
                                    disabled={isLoading}
                                    className="pl-10"
                                  />
                                  {/^08\d{8,12}$/.test(field.value) && (
                                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    )}

                    {/* Step 2: Security */}
                    {currentStep === 2 && (
                      <motion.div
                        key="step2"
                        custom={2}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Lock className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">Keamanan</h3>
                            <p className="text-xs text-muted-foreground">Buat password untuk akun Anda</p>
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Minimal 6 karakter"
                                    {...field}
                                    disabled={isLoading}
                                    className="pl-10 pr-10"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                              {field.value.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  <div className={cn(
                                    "h-1 flex-1 rounded-full transition-colors",
                                    field.value.length >= 6 ? "bg-green-500" : "bg-yellow-500"
                                  )} />
                                  <div className={cn(
                                    "h-1 flex-1 rounded-full transition-colors",
                                    field.value.length >= 8 ? "bg-green-500" : "bg-muted"
                                  )} />
                                  <div className={cn(
                                    "h-1 flex-1 rounded-full transition-colors",
                                    field.value.length >= 10 ? "bg-green-500" : "bg-muted"
                                  )} />
                                </div>
                              )}
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Konfirmasi Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Ulangi password"
                                    {...field}
                                    disabled={isLoading}
                                    className="pl-10 pr-10"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                              {field.value.length > 0 && field.value === formValues.password && (
                                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                                  <Check className="h-3 w-3" />
                                  Password cocok
                                </p>
                              )}
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    )}

                    {/* Step 3: Bank Information */}
                    {currentStep === 3 && (
                      <motion.div
                        key="step3"
                        custom={3}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">Informasi Bank</h3>
                            <p className="text-xs text-muted-foreground">Data rekening untuk pencairan</p>
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nama Bank</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Contoh: BCA, Mandiri, BRI"
                                    {...field}
                                    disabled={isLoading}
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="accountNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>No. Rekening</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Masukkan nomor rekening"
                                    {...field}
                                    disabled={isLoading}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="accountHolder"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pemilik Rekening</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Nama di rekening"
                                    {...field}
                                    disabled={isLoading}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kota</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Masukkan kota"
                                    {...field}
                                    disabled={isLoading}
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 pt-4">
                    {currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Sebelumnya
                      </Button>
                    )}
                    
                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={isLoading || !isStepValid(currentStep)}
                        className="gradient-primary text-white flex-1"
                      >
                        Selanjutnya
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isLoading || !isStepValid(currentStep)}
                        className="gradient-primary text-white flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Daftar Sekarang
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 py-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </CardFooter>
          </Card>
          
          {/* Additional info */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-muted-foreground mt-4"
          >
            Dengan mendaftar, Anda menyetujui{' '}
            <Link href="#" className="underline hover:text-foreground">
              Syarat & Ketentuan
            </Link>{' '}
            kami
          </motion.p>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
