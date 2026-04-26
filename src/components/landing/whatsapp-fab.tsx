'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Clock, Send, X } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { useCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';
import { cn } from '@/lib/utils';

export default function WhatsAppFab() {
  const { config } = useSiteConfig();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const cookieBannerVisible = useCookieBannerVisible();

  // Hide on dashboard/owner/partner/auth pages
  const isHiddenPage =
    pathname?.startsWith('/owner/') ||
    pathname?.startsWith('/partner/') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/maintenance');

  useEffect(() => {
    if (isHiddenPage) return;
    const timer = setTimeout(() => {
      setIsVisible(true);
      setShowTooltip(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [isHiddenPage]);

  // Auto-hide tooltip after 5s
  useEffect(() => {
    if (!showTooltip) return;
    const timer = setTimeout(() => setShowTooltip(false), 5000);
    return () => clearTimeout(timer);
  }, [showTooltip]);

  // Hide tooltip on scroll
  useEffect(() => {
    if (!showTooltip) return;
    const onScroll = () => setShowTooltip(false);
    window.addEventListener('scroll', onScroll, { passive: true, once: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showTooltip]);

  // Close popover on click outside
  useEffect(() => {
    if (!popoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setPopoverOpen(false);
      }
    };
    // Delay to avoid immediate close from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popoverOpen]);

  // Close popover on scroll
  useEffect(() => {
    if (!popoverOpen) return;
    const onScroll = () => setPopoverOpen(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [popoverOpen]);

  // Close popover on escape key
  useEffect(() => {
    if (!popoverOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [popoverOpen]);

  const waNumber = config.footerWhatsapp || '628551110023';
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin bertanya tentang layanan gestun.')}`;

  const togglePopover = useCallback(() => {
    setPopoverOpen(prev => !prev);
    setShowTooltip(false);
  }, []);

  if (!isVisible || isHiddenPage) return null;

  // Cookie banner only renders on public pages, so only offset on those pages
  const isPublicPage = pathname === '/' || pathname === '/faq' || pathname?.startsWith('/blog') || pathname?.startsWith('/lokasi');
  const shouldOffsetCookie = cookieBannerVisible && isPublicPage;

  // Dynamic positioning: above cookie banner when visible, normal when hidden
  const fabBottom = shouldOffsetCookie
    ? 'bottom-[16rem]'
    : 'bottom-24';

  const fabBottomMd = shouldOffsetCookie
    ? 'md:bottom-[12rem]'
    : 'md:bottom-6';

  return (
    <div
      className={`fixed z-[61] right-4 sm:right-5 md:right-6 ${fabBottom} ${fabBottomMd}`}
    >
      {/* Popover panel — absolute positioned above the button, never shifts the FAB */}
      <div
        ref={popoverRef}
        className={cn(
          'absolute bottom-full right-0 mb-3 md:mb-4',
          'transition-all duration-300 origin-bottom-right',
          popoverOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-90 translate-y-2 pointer-events-none'
        )}
      >
        {/* Mobile popover */}
        <div className="md:hidden w-[280px] bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/15 overflow-hidden">
          {/* Header with WhatsApp green gradient */}
          <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 pt-4 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">Black Bear Support</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-[10px] text-white/80">Online sekarang</span>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); }}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                aria-label="Tutup"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-3.5">
            <p className="text-[13px] text-foreground font-medium mb-1.5">
              Halo! 👋 Ada yang bisa kami bantu?
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Tim kami siap membantu Anda 24/7 untuk pertanyaan seputar layanan gestun, tarik tunai, dan pembayaran.
            </p>
          </div>

          {/* Footer */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg">
                <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Respons cepat &lt; 5 menit</span>
              </div>
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-11 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl font-semibold text-sm shadow-lg shadow-[#25D366]/25 transition-all duration-200 active:scale-[0.97]"
              onClick={() => setPopoverOpen(false)}
            >
              <Send className="w-4 h-4" />
              Chat WhatsApp
            </a>
          </div>
        </div>

        {/* Desktop popover */}
        <div className="hidden md:block w-[300px] bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/15 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-5 pt-5 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white text-[15px] font-semibold leading-tight">Black Bear Support</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-xs text-white/80 font-medium">Online sekarang</span>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); }}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm text-foreground font-medium mb-2">
              Halo! 👋 Ada yang bisa kami bantu?
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tim kami siap membantu Anda 24/7 untuk pertanyaan seputar layanan gestun, tarik tunai kartu kredit & paylater, serta info pembayaran.
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Respons cepat &lt; 5 menit</span>
              </div>
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full h-12 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl font-semibold text-sm shadow-lg shadow-[#25D366]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#25D366]/30 active:scale-[0.97]"
              onClick={() => setPopoverOpen(false)}
            >
              <Send className="w-4.5 h-4.5" />
              Chat via WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Mobile auto-show tooltip — only shows before user interacts */}
      <div className={cn(
        'absolute bottom-full right-0 mb-3 md:hidden transition-all duration-300',
        showTooltip && !popoverOpen && !shouldOffsetCookie
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2 pointer-events-none'
      )}>
        <div className="bg-white dark:bg-zinc-800 text-foreground px-4 py-2.5 rounded-xl shadow-xl border border-border/50">
          <p className="text-sm font-medium whitespace-nowrap">💬 Ada yang bisa kami bantu?</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">Klik untuk chat WhatsApp</p>
          {/* Arrow */}
          <div className="absolute top-full right-5 w-3 h-3 bg-white dark:bg-zinc-800 border-b border-r border-border/50 rotate-45 -mt-1.5" />
        </div>
      </div>

      {/* WhatsApp Button */}
      <div className="group/whatsapp relative">
        {/* Desktop hover hint (subtle, below the popover) */}
        <div className={cn(
          'hidden md:block absolute bottom-full right-0 mb-2.5 transition-all duration-200 pointer-events-none',
          popoverOpen ? 'opacity-0 translate-y-1' : 'opacity-0 group-hover/whatsapp:opacity-100 translate-y-1 group-hover/whatsapp:translate-y-0'
        )}>
          <div className="bg-gray-900 text-white rounded-lg px-3 py-1.5 shadow-lg text-center whitespace-nowrap">
            <p className="text-[11px] font-medium">Chat via WhatsApp</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">● Online sekarang</p>
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
          </div>
        </div>

        <a
          ref={buttonRef}
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // On mobile: open popover instead of navigating directly
            // (user can click the CTA button inside popover to go to WA)
            if (window.innerWidth < 768) {
              e.preventDefault();
              togglePopover();
            } else {
              // Desktop: navigate directly to WhatsApp
              setShowTooltip(false);
            }
          }}
          onMouseEnter={() => setShowTooltip(false)}
          className="relative text-white shadow-lg shadow-[#25D366]/25 hover:shadow-xl hover:shadow-[#25D366]/30 active:scale-95 transition-all duration-300
            w-[52px] h-[52px] md:w-14 md:h-14 rounded-full bg-[#25D366] flex items-center justify-center
            hover:scale-110"
          aria-label="Chat via WhatsApp"
        >
          <MessageCircle className="w-6 h-6 flex-shrink-0" />
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 pointer-events-none" />
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-10 pointer-events-none" style={{ animationDelay: '1s' }} />
        </a>
      </div>
    </div>
  );
}
