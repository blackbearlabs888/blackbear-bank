'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseScrollFadeInOptions {
  threshold?: number;
  triggerOnce?: boolean;
}

export function useScrollFadeIn({
  threshold = 0.1,
  triggerOnce = true,
}: UseScrollFadeInOptions = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
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
  }, [node, threshold, triggerOnce]);

  const fadeRef = useCallback((element: HTMLDivElement | null) => {
    setNode(element);
  }, []);

  return { fadeRef, isVisible };
}
