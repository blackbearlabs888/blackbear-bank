'use client';
import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { useCookieBannerVisible } from '@/hooks/use-cookie-banner-visible';

export default function WhatsAppFab() {
  const { config } = useSiteConfig();
  const [isVisible, setIsVisible] = useState(false);
  const cookieBannerVisible = useCookieBannerVisible();

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const waNumber = config.footerWhatsapp || '628551110023';
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin bertanya tentang layanan gestun.')}`;

  // Hide when cookie banner is visible to avoid overlap
  const shouldShow = isVisible && !cookieBannerVisible;
  if (!shouldShow) return null;

  return (
    <div className="fixed z-50
      bottom-20 right-4
      md:bottom-28 md:right-6
      group/whatsapp">
      {/* Tooltip - Desktop only */}
      <div className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/whatsapp:opacity-100 translate-y-1 group-hover/whatsapp:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap">
        <div className="bg-gray-900 text-white rounded-lg px-3 py-2 shadow-lg text-center">
          <p className="text-xs font-medium">Chat via WhatsApp</p>
          <p className="text-[10px] text-emerald-400 mt-0.5">● Online sekarang</p>
        </div>
        {/* Arrow */}
        <div className="flex justify-center">
          <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
        </div>
      </div>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white shadow-lg shadow-[#25D366]/25 hover:shadow-xl hover:shadow-[#25D366]/30 active:scale-95 transition-all duration-300
          w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center
          md:w-auto md:h-auto md:pl-4 md:pr-5 md:py-2.5 md:flex md:gap-2.5 md:rounded-full
          hover:scale-105"
        aria-label="Chat via WhatsApp"
      >
        <MessageCircle className="w-5 h-5 flex-shrink-0" />
        <span className="hidden md:block text-sm font-semibold">Chat WhatsApp</span>
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 pointer-events-none hidden motion-safe:block" />
      </a>
    </div>
  );
}
