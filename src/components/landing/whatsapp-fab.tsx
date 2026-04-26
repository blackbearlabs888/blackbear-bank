'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { useCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';

export default function WhatsAppFab() {
  const { config } = useSiteConfig();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
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

  const waNumber = config.footerWhatsapp || '628551110023';
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin bertanya tentang layanan gestun.')}`;

  if (!isVisible || isHiddenPage) return null;

  // Cookie banner only renders on public pages, so only offset on those pages
  const isPublicPage = pathname === '/' || pathname === '/faq' || pathname?.startsWith('/blog') || pathname?.startsWith('/lokasi');
  const shouldOffsetCookie = cookieBannerVisible && isPublicPage;

  // Dynamic positioning: above cookie banner when visible, normal when hidden
  // Mobile: nav is ~82px (70px bar + ~12px home indicator), FAB is 52px
  const fabBottom = shouldOffsetCookie
    ? 'bottom-[16rem]'     // above cookie banner on mobile
    : 'bottom-24';          // above mobile nav (~96px clears ~82px nav)

  // Desktop: FAB is 56px (md:w-14 md:h-14), cookie card is ~148px
  const fabBottomMd = shouldOffsetCookie
    ? 'md:bottom-[12rem]'   // above cookie banner card on desktop
    : 'md:bottom-6';        // normal desktop

  return (
    <div
      className={`fixed z-[61] right-4 sm:right-5 md:right-6 ${fabBottom} ${fabBottomMd}`}
    >
      {/* Auto-show tooltip (mobile only) */}
      {showTooltip && !shouldOffsetCookie && (
        <div className="animate-fade-in md:hidden bg-white dark:bg-zinc-800 text-foreground px-3.5 py-2 rounded-xl shadow-xl border border-border/50 text-sm font-medium max-w-[200px] mb-2">
          💬 Ada yang bisa kami bantu?
          <p className="text-[10px] text-muted-foreground mt-0.5 font-normal">Klik untuk chat WhatsApp</p>
          <div className="absolute top-full right-5 w-3 h-3 bg-white dark:bg-zinc-800 border-b border-r border-border/50 rotate-45 -mt-1.5" />
        </div>
      )}

      {/* WhatsApp Button */}
      <div className="group/whatsapp relative">
        {/* Hover tooltip - Desktop only */}
        <div className="hidden md:block absolute bottom-full right-0 mb-2.5 opacity-0 group-hover/whatsapp:opacity-100 translate-y-1 group-hover/whatsapp:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap">
          <div className="bg-gray-900 text-white rounded-lg px-3 py-1.5 shadow-lg text-center">
            <p className="text-[11px] font-medium">Chat via WhatsApp</p>
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
            w-[52px] h-[52px] md:w-14 md:h-14 rounded-full bg-[#25D366] flex items-center justify-center
            hover:scale-110"
          aria-label="Chat via WhatsApp"
          onMouseEnter={() => setShowTooltip(false)}
        >
          <MessageCircle className="w-6 h-6 flex-shrink-0" />
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 pointer-events-none" />
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-10 pointer-events-none" style={{ animationDelay: '1s' }} />
        </a>
      </div>
    </div>
  );
}
