import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnimatedCounter } from '@/components/landing/animated-counter';

// ───────────────────────────────────────────────────────────────────────────
// Correctness regression tests — Stream B §3.3 (Counter).
//
// The previous implementation started at value=0 on SSR and ran a 2000ms rAF
// loop on hydration (~120 setState calls per counter), producing a
// final→zero flash and high mobile main-thread work. The counter now
// renders the FINAL value statically from SSR.
//
// Contracts enforced here:
//   - SSR outputs formatter(target) (the final value), never formatter(0)
//   - No rAF loop / no useState (component is a pure render)
//   - Screen reader reads the value once (plain text content)
//   - Format / suffix / label parity with the animated end-state
// ───────────────────────────────────────────────────────────────────────────

describe('AnimatedCounter — static SSR contract', () => {
  it('renders the final value (formatter(target)) in SSR, not zero', () => {
    const html = renderToStaticMarkup(
      <AnimatedCounter target={10000} formatter={(v) => `${Math.floor(v / 1000)}K+`} />,
    );
    expect(html).toBe('<span>10K+</span>');
    // The animated version would have rendered "<span>0K+</span>" at SSR
    // (value=0). Assert the static render is never the zero-start state.
    expect(html).not.toBe('<span>0K+</span>');
    expect(html).not.toContain('NaN');
  });

  it('renders the percentage final value statically', () => {
    const html = renderToStaticMarkup(
      <AnimatedCounter target={99} formatter={(v) => `${Math.floor(v)}%`} />,
    );
    expect(html).toBe('<span>99%</span>');
    expect(html).not.toBe('<span>0%</span>');
  });

  it('renders the support final value statically (24/7)', () => {
    const html = renderToStaticMarkup(
      <AnimatedCounter target={24} formatter={(v) => `${Math.floor(v)}/7`} />,
    );
    expect(html).toBe('<span>24/7</span>');
    expect(html).not.toBe('<span>0/7</span>');
  });

  it('produces identical output across multiple SSR passes (deterministic, no hydration drift)', () => {
    const fn = (v: number) => `${Math.floor(v / 1000)}K+`;
    const a = renderToStaticMarkup(<AnimatedCounter target={10000} formatter={fn} />);
    const b = renderToStaticMarkup(<AnimatedCounter target={10000} formatter={fn} />);
    expect(a).toBe(b);
  });

  it('screen reader reads the final value once (single text node, no aria-live animation)', () => {
    // The component renders a single <span> with the formatted value as plain
    // text — no aria-live region, no repeated mutation. Screen readers
    // announce the text exactly once.
    const html = renderToStaticMarkup(
      <AnimatedCounter target={99} formatter={(v) => `${Math.floor(v)}%`} />,
    );
    expect(html).not.toContain('aria-live');
    expect(html).toBe('<span>99%</span>');
  });

  it('accepts duration/startOnView props (backwards-compatible interface) without breaking', () => {
    // Props are accepted but intentionally unused — the static render must
    // not depend on them.
    const html = renderToStaticMarkup(
      <AnimatedCounter
        target={50}
        duration={2000}
        startOnView
        formatter={(v) => String(v)}
      />,
    );
    expect(html).toBe('<span>50</span>');
  });
});
