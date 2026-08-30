'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  /**
   * Full list of zoomable image URLs (e.g. every image in the article body).
   * Pass a single-element array for a standalone image such as the cover.
   */
  images: string[];
  /** Index of the currently opened image; `null` = lightbox closed. */
  index: number | null;
  /** Alt text / caption shown in the top bar. */
  alt?: string;
  onClose: () => void;
  /** Optional navigation callback; omitted -> single-image mode (no arrows). */
  onNavigate?: (index: number) => void;
}

/**
 * Full-screen image viewer ("klik untuk perbesar").
 *
 * Shows the image at its NATURAL aspect ratio (object-contain, never
 * cropped) so readers can always inspect the uncropped version of an
 * image that the blog layout previews with a cover crop.
 *
 * Interaction model:
 *  - Click backdrop / X button / Esc  -> close
 *  - Arrow keys, arrow buttons, swipe -> previous / next image
 *  - Body scroll is locked while open
 */
export function ImageLightbox({
  images,
  index,
  alt = '',
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const isOpen = index !== null && images.length > 0;
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const swiped = useRef(false);

  const canNavigate = images.length > 1 && typeof onNavigate === 'function';

  const go = useCallback(
    (dir: -1 | 1) => {
      if (index === null || !onNavigate || images.length < 2) return;
      onNavigate((index + dir + images.length) % images.length);
    },
    [index, images.length, onNavigate]
  );

  // Keyboard navigation + body scroll lock while open
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };

    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, go]);

  // Swipe support (mobile) — a swipe must NOT be treated as a backdrop tap
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 48) {
      swiped.current = true;
      go(delta < 0 ? 1 : -1);
    }
  };

  const handleBackdropClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onClose();
  };

  const safeIndex =
    index === null ? 0 : Math.min(Math.max(index, 0), Math.max(images.length - 1, 0));
  const currentSrc = isOpen ? images[safeIndex] : null;

  return (
    <AnimatePresence>
      {isOpen && currentSrc && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
          onClick={handleBackdropClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label="Gambar diperbesar"
        >
          {/* Top bar: caption + counter + close */}
          <div
            className="flex items-start justify-between gap-4 px-4 py-3 sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1">
              {alt && (
                <p className="truncate text-xs text-white/80 sm:text-sm">{alt}</p>
              )}
              {canNavigate && (
                <p className="mt-0.5 text-[11px] text-white/40">
                  {safeIndex + 1} / {images.length}
                </p>
              )}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Tutup tampilan gambar"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image area — natural ratio, object-contain: NEVER cropped */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-2 sm:px-16">
            <motion.img
              key={currentSrc}
              src={currentSrc}
              alt={alt}
              initial={{ opacity: 0, scale: 0.965 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl select-none"
            />

            {canNavigate && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  aria-label="Gambar sebelumnya"
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:left-3"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  aria-label="Gambar berikutnya"
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-3"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Bottom hint */}
          <div
            className="pb-4 text-center text-[11px] text-white/40 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {canNavigate ? (
              <span className="hidden sm:inline">
                Gunakan tombol ← → untuk berpindah gambar · klik area gelap untuk menutup
              </span>
            ) : (
              <span>Klik area gelap atau tekan Esc untuk menutup</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
