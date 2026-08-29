import { memo } from 'react';

// Correctness cleanup (Stream B §3.3 — Counter):
// The previous implementation started at value=0 on SSR, then ran a 2000ms
// rAF loop on hydration that called setValue() every frame (~120 re-renders
// across 3 stat cards). That produced a final→zero flash on hydration and
// high main-thread work on mobile.
//
// The counter now renders the FINAL value statically from SSR. No useState,
// no rAF, no IntersectionObserver, no direct textContent mutation. Screen
// readers read the final value exactly once (it is plain text content).
//
// The component interface (props) is preserved so the call site is unchanged.
// `duration` and `startOnView` are accepted but intentionally unused — they
// remain in the type for backwards compatibility with existing JSX.
//
// Format/suffix/label/layout are unchanged: formatter(target) is exactly
// what the animation converged to, so the visible result is identical.

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  startOnView?: boolean;
  formatter: (value: number) => string;
}

function AnimatedCounterBase({
  target,
  formatter,
}: AnimatedCounterProps) {
  return <span>{formatter(target)}</span>;
}

export const AnimatedCounter = memo(AnimatedCounterBase);
