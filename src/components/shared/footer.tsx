'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, ArrowUp, Heart, ExternalLink, Shield, Zap, Clock } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { cn } from '@/lib/utils';

// Social Icon Components
function SocialIcon({ href, icon, label, hoverColor }: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  hoverColor: string;
}) {
  if (!href) return null;
  
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "w-10 h-10 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 flex items-center justify-center transition-all duration-300",
        "hover:scale-110 hover:shadow-lg active:scale-95",
        hoverColor
      )}
      aria-label={label}
    >
      {icon}
    </a>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068V12c.015-4.55 1.5-8.15 4.396-10.702C8.379-.785 11.633-.09 11.765-.06l.056.012.093.027c1.256.315 2.55.402 3.78.255a10.27 10.27 0 0 1 3.318.15c.052.013.104.027.155.043.137.043.31.108.486.207.335.188.613.458.814.791.227.377.328.797.294 1.216a2.17 2.17 0 0 1-.63 1.428 2.21 2.21 0 0 1-1.455.622 2.26 2.26 0 0 1-.292-.01l-.07-.01a7.98 7.98 0 0 0-1.945-.175 7.2 7.2 0 0 0-2.443.417c-.89.333-1.637.856-2.212 1.55-.605.73-.967 1.6-1.075 2.59a6.14 6.14 0 0 0 .198 2.263c.23.81.635 1.51 1.204 2.08.55.548 1.21.94 1.96 1.164a5.32 5.32 0 0 0 2.352.13c.79-.12 1.5-.418 2.1-.885.596-.463 1.05-1.07 1.35-1.804.317-.77.42-1.622.304-2.532a6.61 6.61 0 0 0-.51-1.883l-.03-.065a.84.84 0 0 1 .037-.78.87.87 0 0 1 .668-.423.89.89 0 0 1 .777.3l.024.03c.59.73 1.032 1.575 1.313 2.51.275.915.38 1.86.312 2.812a8.1 8.1 0 0 1-.632 2.618 7.58 7.58 0 0 1-1.49 2.263 7.78 7.78 0 0 1-2.228 1.627c-.86.442-1.78.723-2.735.837a9.35 9.35 0 0 1-1.474.06z"/>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="18" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white"/>
    </svg>
  );
}

export function Footer() {
  const { config, getInitials } = useSiteConfig();
  const [logoError, setLogoError] = useState(false);
  
  const siteName = config.websiteTitle || 'Black Bear';
  const whatsapp = config.footerWhatsapp;
  const instagram = config.footerInstagram;
  const facebook = config.footerFacebook;
  const tiktok = config.footerTiktok;
  const youtube = config.footerYoutube;
  const threads = config.footerThreads;

  const hasSocials = whatsapp || instagram || facebook || tiktok || youtube || threads;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-background via-muted/30 to-muted/50 border-t mt-auto">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Link href="/" className="flex items-center gap-3 tap-highlight group">
              {config.logoUrl && !logoError ? (
                <img 
                  src={config.logoUrl} 
                  alt={siteName}
                  className="w-10 h-10 rounded-xl object-contain transition-transform group-hover:scale-110"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                  <span className="text-white font-bold text-sm">{getInitials()}</span>
                </div>
              )}
              <div>
                <span className="font-bold text-lg">{siteName}</span>
                <p className="text-[10px] text-muted-foreground">Gestun Management System</p>
              </div>
            </Link>
            
            {/* Trust badges */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-green-600" />
                <span>Aman & Terpercaya</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Proses Cepat</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <nav className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <Link 
                href="/order" 
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
              >
                Order
              </Link>
              <Link 
                href="/track" 
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
              >
                Track
              </Link>
              <Link 
                href="/register" 
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
              >
                Mitra
              </Link>
              <Link 
                href="/blog" 
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
              >
                Blog
              </Link>
              <Link 
                href="/faq" 
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
              >
                FAQ
              </Link>
              <Link 
                href="/lokasi" 
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
              >
                Lokasi
              </Link>
            </div>
            
            {/* Operating hours */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Clock className="w-3 h-3" />
              <span>Senin - Sabtu: 09:00 - 21:00 WIB</span>
            </div>
          </nav>

          {/* Socials & Contact */}
          <div className="flex flex-col items-center md:items-end gap-3">
            {hasSocials && (
              <div className="flex items-center gap-2">
                <SocialIcon 
                  href={whatsapp ? `https://wa.me/${whatsapp}` : undefined} 
                  icon={<MessageCircle className="w-4.5 h-4.5" />} 
                  label="WhatsApp"
                  hoverColor="hover:text-green-600 hover:bg-green-500/10 hover:border-green-500/30"
                />
                <SocialIcon 
                  href={instagram} 
                  icon={<InstagramIcon />} 
                  label="Instagram"
                  hoverColor="hover:text-pink-600 hover:bg-pink-500/10 hover:border-pink-500/30"
                />
                <SocialIcon 
                  href={facebook} 
                  icon={<FacebookIcon />} 
                  label="Facebook"
                  hoverColor="hover:text-blue-600 hover:bg-blue-500/10 hover:border-blue-500/30"
                />
                <SocialIcon 
                  href={tiktok} 
                  icon={<TikTokIcon />} 
                  label="TikTok"
                  hoverColor="hover:text-black dark:hover:text-white hover:bg-muted"
                />
                <SocialIcon 
                  href={youtube} 
                  icon={<YoutubeIcon />} 
                  label="YouTube"
                  hoverColor="hover:text-red-600 hover:bg-red-500/10 hover:border-red-500/30"
                />
                <SocialIcon 
                  href={threads} 
                  icon={<ThreadsIcon />} 
                  label="Threads"
                  hoverColor="hover:text-black dark:hover:text-white hover:bg-muted"
                />
              </div>
            )}
            
            {/* WhatsApp CTA */}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors border border-green-500/20"
              >
                <MessageCircle className="w-4 h-4" />
                Hubungi Kami
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-dashed border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              © {currentYear} <span className="font-medium text-foreground">{siteName}</span>. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              Crafted with <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" /> in Indonesia
            </p>
          </div>
        </div>
      </div>
      
      {/* Scroll to top - mobile only */}
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
      className="fixed bottom-20 right-4 w-12 h-12 rounded-xl gradient-primary text-white shadow-lg flex items-center justify-center tap-highlight active-scale z-40 md:hidden hover:opacity-90 transition-opacity"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
