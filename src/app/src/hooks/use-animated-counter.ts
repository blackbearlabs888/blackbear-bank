'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAnimatedCounterOptions {
  target: number;
  duration?: number;
  startOnView?: boolean;
}

export function useAnimatedCounter({
  target,
  duration = 2000,
  startOnView = false,
}: UseAnimatedCounterOptions) {
  const [value, setValue] = useState(0);
  const hasStarted = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const startAnimation = useCallback(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const currentValue = Math.floor(target * easedProgress);

      setValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  const counterRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!startOnView || !node) {
        if (!startOnView) {
          // Schedule animation start asynchronously to avoid setState in render
          requestAnimationFrame(() => startAnimation());
        }
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startAnimation();
              observerRef.current?.disconnect();
            }
          });
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(node);
    },
    [startOnView, startAnimation]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { counterRef, value };
}
