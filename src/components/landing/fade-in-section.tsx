'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';

interface FadeInSectionProps {
  children: ReactNode;
  className?: string;
  /**
   * @deprecated No-op since the blank-content fix: a numeric threshold is
   * unreachable for elements taller than the viewport, so the observer now
   * always uses threshold 0 + rootMargin. Kept for API compatibility only.
   */
  threshold?: number;
  triggerOnce?: boolean;
  style?: React.CSSProperties;
}

export function FadeInSection({
  children,
  className = '',
  triggerOnce = true,
  style,
}: FadeInSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (triggerOnce) {
              observer.disconnect();
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      {
        // BUG FIX (blank content on tall elements): a numeric threshold > 0
        // can be physically unreachable for elements TALLER than the
        // viewport — the maximum achievable intersection ratio is
        // viewportHeight / elementHeight. Long article bodies (10k+ px on
        // /blog/[slug]) therefore never fired the observer and stayed at
        // opacity:0 forever ("blank body" while title/image/TOC appeared).
        //
        // threshold: 0 (any 1px intersection triggers) + a small negative
        // bottom rootMargin keeps the reveal point visually similar
        // (element starts fading in as it enters the viewport) while
        // GUARANTEEING the callback can fire, no matter how tall the
        // wrapped content is or grows later (e.g. images loading).
        threshold: 0,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [triggerOnce]);

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
