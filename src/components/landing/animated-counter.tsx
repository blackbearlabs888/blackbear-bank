'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  startOnView?: boolean;
  formatter: (value: number) => string;
}

export function AnimatedCounter({
  target,
  duration = 2000,
  startOnView = false,
  formatter,
}: AnimatedCounterProps) {
  const [value, setValue] = useState(0);
  const hasStarted = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const startAnimation = () => {
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
  };

  useEffect(() => {
    if (!startOnView) {
      startAnimation();
    }
  }, [startOnView]);

  useEffect(() => {
    if (!startOnView || !elementRef.current) return;

    const node = elementRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAnimation();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [startOnView]);

  return (
    <span ref={elementRef}>{formatter(value)}</span>
  );
}
