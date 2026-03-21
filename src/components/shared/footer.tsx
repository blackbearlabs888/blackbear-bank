'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, Instagram, Facebook, ArrowUp, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSiteConfig } from '@/hooks/use-site-config';

export function Footer() {
  const { config, getInitials } = useSiteConfig();
  const [logoError, setLogoError] = useState(false);
  
  // Use config values with fallbacks
  const siteName = config.websiteTitle || 'Black Bear';
  const whatsapp = config.footerWhatsapp;
  const instagram = config.footerInstagram;
  const facebook = config.footerFacebook;

  return (
    <footer className="bg-muted/30 border-t mt-auto">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 tap-highlight">
              {config.logoUrl && !logoError ? (
                <img 
                  src={config.logoUrl} 
                  alt={siteName}
                  className="w-9 h-9 rounded-xl object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">{getInitials()}</span>
                </div>
              )}
              <span className="font-bold text-lg">{siteName}</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Layanan tarik tunai terpercaya untuk Kartu Kredit & Paylater dengan proses cepat dan aman.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Layanan</h4>
            <nav className="flex flex-col gap-2">
              <Link 
                href="/order" 
                className="text-sm text-muted-foreground hover:text-primary transition-smooth tap-highlight py-1"
              >
                Order Gestun
              </Link>
              <Link 
                href="/track" 
                className="text-sm text-muted-foreground hover:text-primary transition-smooth tap-highlight py-1"
              >
                Track Order
              </Link>
              <Link 
                href="/register" 
                className="text-sm text-muted-foreground hover:text-primary transition-smooth tap-highlight py-1"
              >
                Daftar Mitra
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Kontak</h4>
            <div className="flex flex-col gap-2">
              {whatsapp && (
                <a 
                  href={`https://wa.me/${whatsapp}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-smooth tap-highlight py-1"
                >
                  <MessageCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{whatsapp}</span>
                </a>
              )}
              {!whatsapp && (
                <a 
                  href="https://wa.me/6281234567890" 
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-smooth tap-highlight py-1"
                >
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>081234567890</span>
                </a>
              )}
              <a 
                href={`mailto:info@${siteName.toLowerCase().replace(/\s+/g, '')}.id`} 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-smooth tap-highlight py-1"
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">info@{siteName.toLowerCase().replace(/\s+/g, '')}.id</span>
              </a>
            </div>
          </div>

          {/* Social */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Follow Us</h4>
            <div className="flex gap-3">
              {whatsapp && (
                <a 
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-green-600 hover:bg-green-500/10 transition-smooth tap-highlight active-scale"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
              {instagram && (
                <a 
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-pink-600 hover:bg-pink-500/10 transition-smooth tap-highlight active-scale"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {facebook && (
                <a 
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-smooth tap-highlight active-scale"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {!whatsapp && !instagram && !facebook && (
                <p className="text-sm text-muted-foreground">Belum ada tautan</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              *Biaya ongkir marketplace & layanan tambahan tidak termasuk
            </p>
          </div>
        </div>
      </div>
      
      {/* Scroll to top button - mobile only */}
      <ScrollToTop />
    </footer>
  );
}

function ScrollToTop() {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-4 w-12 h-12 rounded-full gradient-primary text-white shadow-lg flex items-center justify-center tap-highlight active-scale z-40 md:hidden"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
