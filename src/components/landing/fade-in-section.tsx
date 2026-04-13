'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';

interface FadeInSectionProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  triggerOnce?: boolean;
  style?: React.CSSProperties;
}

export function FadeInSection({
  children,
  className = '',
  threshold = 0.1,
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
      { threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, triggerOnce]);

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
