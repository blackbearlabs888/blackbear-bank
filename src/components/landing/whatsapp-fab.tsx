'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, ArrowUp } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { useCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';

export default function WhatsAppFab() {
  const { config } = useSiteConfig();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const cookieBannerVisible = useCookieBannerVisible();

  // Hide on dashboard/owner/partner pages
  const isDashboardPage =
    pathname?.startsWith('/owner/') ||
    pathname?.startsWith('/partner/') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/maintenance');

  useEffect(() => {
    if (isDashboardPage) return;
    const timer = setTimeout(() => {
      setIsVisible(true);
      setShowTooltip(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isDashboardPage]);

  // Back to top scroll detection
  useEffect(() => {
    if (isDashboardPage) return;
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDashboardPage]);

  // Auto-hide tooltip
  useEffect(() => {
    if (!showTooltip) return;
    const timer = setTimeout(() => setShowTooltip(false), 6000);
    return () => clearTimeout(timer);
  }, [showTooltip]);

  const waNumber = config.footerWhatsapp || '628551110023';
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin bertanya tentang layanan gestun.')}`;

  const shouldShow = isVisible && !cookieBannerVisible && !isDashboardPage;
  if (!shouldShow) return null;

  return (
    <div className="fixed z-50
      bottom-20 right-4
      md:bottom-8 md:right-6
      flex flex-col items-end gap-3">
      
      {/* Auto-show tooltip */}
      {showTooltip && (
        <div className="animate-fade-in bg-white dark:bg-zinc-800 text-foreground px-4 py-2.5 rounded-xl shadow-xl border border-border/50 text-sm font-medium max-w-[220px] relative">
          💬 Ada yang bisa kami bantu?
          <p className="text-xs text-muted-foreground mt-1 font-normal">Klik untuk chat WhatsApp</p>
          <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white dark:bg-zinc-800 border-r border-t border-border/50 rotate-45" />
        </div>
      )}

      {/* WhatsApp Button */}
      <div className="group/whatsapp relative">
        {/* Hover tooltip - Desktop only */}
        <div className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/whatsapp:opacity-100 translate-y-1 group-hover/whatsapp:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap">
          <div className="bg-gray-900 text-white rounded-lg px-3 py-2 shadow-lg text-center">
            <p className="text-xs font-medium">Chat via WhatsApp</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">● Online sekarang</p>
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
          </div>
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative text-white shadow-lg shadow-[#25D366]/25 hover:shadow-xl hover:shadow-[#25D366]/30 active:scale-95 transition-all duration-300
            w-10 h-10 md:w-14 md:h-14 rounded-full bg-[#25D366] flex items-center justify-center
            hover:scale-110"
          aria-label="Chat via WhatsApp"
          onMouseEnter={() => setShowTooltip(false)}
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 pointer-events-none" />
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-10 pointer-events-none" style={{ animationDelay: '1s' }} />
        </a>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-background/90 backdrop-blur-sm border border-border/60 text-muted-foreground shadow-lg hover:text-primary hover:border-primary/30 hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 ${
          showBackToTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Kembali ke atas"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
}
