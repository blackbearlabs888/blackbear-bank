'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wrench, Phone, Mail, MessageCircle, AlertTriangle } from 'lucide-react'
import type { SiteConfig } from '@/types'

export default function MaintenancePage() {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/site-config')
        const result = await response.json()
        if (result.success) {
          setConfig(result.data)
        }
      } catch (error) {
        console.error('Error fetching site config:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const maintenanceMessage = config?.maintenanceMessage ||
    "Sistem sedang dalam maintenance. Silakan coba lagi nanti."

  const contactWhatsapp = config?.contactWhatsapp
  const contactEmail = config?.contactEmail
  const contactPhone = config?.contactPhone

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Dark gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[oklch(0.15_0.05_290)] via-[oklch(0.2_0.08_300)] to-[oklch(0.15_0.06_320)]" />

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Glass card */}
        <div className="glass rounded-3xl p-8 md:p-12 shadow-2xl">
          {/* Animated wrench icon */}
          <div className="flex justify-center mb-8">
            <motion.div
              animate={{
                rotate: [0, -15, 15, -15, 15, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                <Wrench className="w-12 h-12 text-white" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 w-24 h-24 rounded-2xl gradient-primary opacity-50 blur-xl animate-pulse" />
            </motion.div>
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-6"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Under Maintenance
            </h1>
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">Sistem Sedang Diperbaiki</span>
            </div>
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 rounded-xl p-4 mb-8 border border-white/10"
          >
            <p className="text-center text-gray-200 leading-relaxed">
              {loading ? (
                <span className="animate-pulse">Memuat...</span>
              ) : (
                maintenanceMessage
              )}
            </p>
          </motion.div>

          {/* Status indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="relative">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
            </div>
            <span className="text-sm text-gray-300">Sedang dalam perbaikan</span>
          </motion.div>

          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="border-t border-white/10 pt-6"
          >
            <p className="text-center text-gray-400 text-sm mb-4">
              Untuk keadaan darurat, hubungi kami:
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              {contactWhatsapp && (
                <a
                  href={`https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">WhatsApp</span>
                </a>
              )}

              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">Telepon</span>
                </a>
              )}

              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">Email</span>
                </a>
              )}

              {!contactWhatsapp && !contactPhone && !contactEmail && (
                <p className="text-gray-500 text-sm">
                  Informasi kontak tidak tersedia
                </p>
              )}
            </div>
          </motion.div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex justify-center"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">BB</span>
              </div>
              <span className="text-gray-300 font-semibold">Black Bear Gestun</span>
            </div>
          </motion.div>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-500 text-sm mt-6"
        >
          Terima kasih atas kesabaran Anda
        </motion.p>
      </motion.div>
    </div>
  )
}
