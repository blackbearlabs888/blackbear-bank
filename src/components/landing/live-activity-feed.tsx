'use client';

import { useEffect, useRef, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';

const fakeTransactions = [
  { name: 'R*** dari Jakarta', amount: 'Rp 5.000.000', time: '2 menit lalu' },
  { name: 'A*** dari Surabaya', amount: 'Rp 3.200.000', time: '5 menit lalu' },
  { name: 'S*** dari Bandung', amount: 'Rp 8.500.000', time: '8 menit lalu' },
  { name: 'D*** dari Semarang', amount: 'Rp 2.100.000', time: '12 menit lalu' },
  { name: 'M*** dari Medan', amount: 'Rp 10.000.000', time: '15 menit lalu' },
  { name: 'F*** dari Bekasi', amount: 'Rp 4.700.000', time: '18 menit lalu' },
  { name: 'W*** dari Tangerang', amount: 'Rp 6.300.000', time: '22 menit lalu' },
  { name: 'J*** dari Depok', amount: 'Rp 1.800.000', time: '25 menit lalu' },
  { name: 'K*** dari Yogyakarta', amount: 'Rp 7.400.000', time: '28 menit lalu' },
  { name: 'P*** dari Malang', amount: 'Rp 9.100.000', time: '30 menit lalu' },
];

export default function LiveActivityFeed() {
  const desktopRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  // Desktop: update DOM directly, bypass React state for performance
  useEffect(() => {
    const interval = setInterval(() => {
      offsetRef.current = (offsetRef.current + 1) % fakeTransactions.length;
      const el = desktopRef.current;
      if (!el) return;

      // Build HTML directly — no React re-render, no setState
      const items: string[] = [];
      for (let i = 0; i < 4; i++) {
        const tx = fakeTransactions[(offsetRef.current + i) % fakeTransactions.length];
        items.push(
          `<div class="flex items-center gap-2 whitespace-nowrap">` +
            (i > 0 ? '<span class="text-white/10 text-sm">|</span>' : '') +
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400 flex-shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
            `<span class="text-xs text-white/80">${tx.name}</span>` +
            '<span class="text-xs text-white/40">—</span>' +
            `<span class="text-xs font-medium text-white/90">${tx.amount}</span>` +
            '<span class="text-xs text-white/40">—</span>' +
            `<span class="text-[11px] text-white/40">${tx.time}</span>` +
          '</div>'
        );
      }
      el.innerHTML = items.join('');
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Build mobile ticker items once — never re-renders
  const mobileTickerHTML = useMemo(() => {
    const items = fakeTransactions;
    const doubled = [...items, ...items];
    return doubled.map((tx, i) => (
      <div
        key={i}
        className="flex items-center gap-2 px-5 py-2.5 whitespace-nowrap"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span className="text-xs text-white/80">{tx.name}</span>
        <span className="text-xs text-white/40">—</span>
        <span className="text-xs font-medium text-white/90">{tx.amount}</span>
        <span className="text-xs text-white/40">—</span>
        <span className="text-[11px] text-white/40">{tx.time}</span>
      </div>
    ));
  }, []);

  return (
    <div className="relative overflow-hidden bg-gray-900 dark:bg-gray-950 border-y border-white/5">
      {/* LIVE badge */}
      <div className="flex items-center gap-2 px-3 md:px-4">
        <div className="relative flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">Live</span>
        </div>
        <span className="text-white/10 text-sm">|</span>
      </div>

      {/* Mobile: pure CSS ticker — no JS re-renders */}
      <div className="md:hidden overflow-hidden">
        <div
          className="flex w-max will-change-transform"
          style={{ animation: 'scroll-left 45s linear infinite' }}
        >
          {mobileTickerHTML}
        </div>
      </div>

      {/* Desktop: direct DOM manipulation — zero React re-renders */}
      <div
        ref={desktopRef}
        className="hidden md:flex items-center justify-center gap-6 px-6 py-3 overflow-hidden min-w-0"
      >
        {/* Initial render from JS, then updated via innerHTML */}
        {fakeTransactions.slice(0, 4).map((tx, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap">
            {i > 0 && <span className="text-white/10 text-sm">|</span>}
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-white/80">{tx.name}</span>
            <span className="text-xs text-white/40">—</span>
            <span className="text-xs font-medium text-white/90">{tx.amount}</span>
            <span className="text-xs text-white/40">—</span>
            <span className="text-[11px] text-white/40">{tx.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
