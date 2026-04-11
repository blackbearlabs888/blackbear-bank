'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, User, Mail, Lock, Shield, Users, ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/hooks/use-toast'
import { NavbarDesktop } from '@/components/layout/navbar-desktop'
import { Footer } from '@/components/layout/footer'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email/Username wajib diisi')
    .refine(
      (val) => {
        // Check if it's a valid email or just a username
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(val) || val.length >= 3
      },
      { message: 'Format email tidak valid atau username minimal 3 karakter' }
    ),
  password: z
    .string()
    .min(6, 'Password minimal 6 karakter'),
  role: z.enum(['OWNER', 'PARTNER'], {
    required_error: 'Pilih role terlebih dahulu',
  }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'PARTNER',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Login gagal')
      }

      // Update auth store
      login(result.data.user, result.data.token, result.data.partner)

      toast({
        title: 'Login berhasil',
        description: `Selamat datang, ${result.data.user.name}!`,
      })

      // Redirect based on role
      const redirectPath = data.role === 'OWNER' ? '/owner/dashboard' : '/partner/dashboard'
      router.push(redirectPath)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login gagal',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedRole = form.watch('role')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavbarDesktop />

      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="overflow-hidden border-0 shadow-xl">
            {/* Header with gradient */}
            <div className="gradient-primary p-6 md:p-8 text-center text-white">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-white font-bold text-2xl">BB</span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold mb-1"
              >
                Selamat Datang
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-sm"
              >
                Masuk ke akun Black Bear Gestun Anda
              </motion.p>
            </div>

            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Role Selector */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Login sebagai</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-3">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => field.onChange('OWNER')}
                              className={cn(
                                "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                                field.value === 'OWNER'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-input hover:border-primary/50 bg-background'
                              )}
                            >
                              {field.value === 'OWNER' && (
                                <motion.div
                                  layoutId="role-indicator"
                                  className="absolute top-2 right-2"
                                >
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                </motion.div>
                              )}
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center",
                                field.value === 'OWNER' ? "gradient-primary text-white" : "bg-muted"
                              )}>
                                <Shield className="h-6 w-6" />
                              </div>
                              <div className="text-center">
                                <span className="font-medium text-sm">Owner</span>
                                <p className="text-xs text-muted-foreground">Full Access</p>
                              </div>
                            </motion.button>
                            
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => field.onChange('PARTNER')}
                              className={cn(
                                "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                                field.value === 'PARTNER'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-input hover:border-primary/50 bg-background'
                              )}
                            >
                              {field.value === 'PARTNER' && (
                                <motion.div
                                  layoutId="role-indicator"
                                  className="absolute top-2 right-2"
                                >
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                </motion.div>
                              )}
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center",
                                field.value === 'PARTNER' ? "gradient-primary text-white" : "bg-muted"
                              )}>
                                <Users className="h-6 w-6" />
                              </div>
                              <div className="text-center">
                                <span className="font-medium text-sm">Partner</span>
                                <p className="text-xs text-muted-foreground">Mitra</p>
                              </div>
                            </motion.button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email/Username */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email / Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Masukkan email atau username"
                              {...field}
                              disabled={isLoading}
                              className="pl-10 h-11"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password */}
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
                              placeholder="Masukkan password"
                              {...field}
                              disabled={isLoading}
                              className="pl-10 pr-10 h-11"
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
                              <span className="sr-only">
                                {showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                              </span>
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full gradient-primary text-white h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        Masuk
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>

            <Separator />

            <CardFooter className="flex flex-col gap-3 py-4">
              <p className="text-sm text-muted-foreground text-center">
                Belum punya akun?{' '}
                <Link href="/register" className="text-primary font-medium hover:underline">
                  Daftar sebagai Mitra
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
            Dengan login, Anda menyetujui{' '}
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
