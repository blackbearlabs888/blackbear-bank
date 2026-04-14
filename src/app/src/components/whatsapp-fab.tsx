'use client';
import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';

export default function WhatsAppFab() {
  const { config } = useSiteConfig();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const waNumber = config.footerWhatsapp || '628551110023';
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin bertanya tentang layanan gestun.')}`;

  if (!isVisible) return null;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-50 text-white shadow-lg shadow-[#25D366]/25 hover:shadow-xl hover:shadow-[#25D366]/30 active:scale-95 transition-all duration-300 group
        bottom-20 right-4 w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center
        md:w-auto md:h-auto md:bottom-28 md:pl-4 md:pr-5 md:py-2.5 md:flex md:gap-2.5 md:rounded-full
        hover:scale-105"
      aria-label="Chat via WhatsApp"
    >
      <MessageCircle className="w-5 h-5 flex-shrink-0" />
      <span className="hidden md:block text-sm font-semibold">Chat WhatsApp</span>
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 pointer-events-none" />
    </a>
  );
}
