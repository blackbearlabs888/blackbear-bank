'use client'

import Link from 'next/link'
import { Instagram, Facebook, Phone, Mail, MapPin, MessageCircle } from 'lucide-react'
import { useSiteConfig } from '@/hooks/use-maintenance'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { config: siteConfig } = useSiteConfig()
  
  const brandName = siteConfig?.brandName || 'Black Bear'
  const brandInitials = brandName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
  
  const contactPhone = siteConfig?.contactPhone
  const contactWhatsapp = siteConfig?.contactWhatsapp
  const contactEmail = siteConfig?.contactEmail
  const socialInstagram = siteConfig?.socialInstagram
  const socialFacebook = siteConfig?.socialFacebook
  const socialTiktok = siteConfig?.socialTiktok

  return (
    <footer className="w-full border-t bg-muted/30 mt-auto">
      <div className="container px-4 py-8 mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              {siteConfig?.logoUrl ? (
                <img 
                  src={siteConfig.logoUrl} 
                  alt={brandName} 
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{brandInitials}</span>
                </div>
              )}
              <span className="font-bold text-lg">{brandName}</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Layanan gestun terpercaya dengan proses cepat dan aman. Tarik tunai kartu kredit dan paylater dengan mudah.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Layanan</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/order" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Order Gestun
              </Link>
              <Link href="/track" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Track Order
              </Link>
              <Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Daftar Mitra
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">Kontak</h3>
            <div className="space-y-2">
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" />
                  <span>{contactPhone}</span>
                </a>
              )}
              {contactWhatsapp && (
                <a href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  <span>{contactWhatsapp}</span>
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" />
                  <span>{contactEmail}</span>
                </a>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Indonesia</span>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="font-semibold">Ikuti Kami</h3>
            <div className="flex items-center gap-4">
              {socialInstagram && (
                <a 
                  href={socialInstagram.startsWith('http') ? socialInstagram : `https://instagram.com/${socialInstagram.replace('@', '')}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {socialFacebook && (
                <a 
                  href={socialFacebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {contactWhatsapp && (
                <a 
                  href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
              {socialTiktok && (
                <a 
                  href={socialTiktok} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {brandName}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Biaya ongkir marketplace & layanan tambahan tidak termasuk dalam kalkulasi.
          </p>
        </div>
      </div>
    </footer>
  )
}
