'use client';

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';

const fakeTransactions = [
  { name: 'R*** dari Jakarta', amount: 'Rp 5.000.000', time: '2 menit lalu' },
  { name: 'A*** dari Surabaya', amount: 'Rp 3.200.000', time: '5 menit lalu' },
  { name: 'S*** dari Bandung', amount: 'Rp 8.500.000', time: '8 menit lalu' },
  { name: 'D*** dari Semarang', amount: 'Rp 2.100.000', time: '12 menit lalu' },
  { name: 'C*** dari Medan', amount: 'Rp 10.000.000', time: '15 menit lalu' },
  { name: 'F*** dari Bekasi', amount: 'Rp 4.700.000', time: '18 menit lalu' },
  { name: 'W*** dari Tangerang', amount: 'Rp 6.300.000', time: '22 menit lalu' },
  { name: 'J*** dari Depok', amount: 'Rp 1.800.000', time: '25 menit lalu' },
  { name: 'K*** dari Yogyakarta', amount: 'Rp 7.400.000', time: '28 menit lalu' },
  { name: 'P*** dari Malang', amount: 'Rp 9.115.000', time: '30 menit lalu' },
  { name: 'R*** dari Jakarta', amount: 'Rp 5.000.000', time: '1 menit lalu' },
  { name: 'A*** dari Surabaya', amount: 'Rp 3.200.000', time: '2 menit lalu' },
  { name: 'T*** dari Palangkaraya', amount: 'Rp 6.700.000', time: '6 menit lalu' },
  { name: 'V*** dari Bontang', amount: 'Rp 2.100.000', time: '11 menit lalu' },
  { name: 'M*** dari Samarinda', amount: 'Rp 9.600.000', time: '13 menit lalu' },
  { name: 'F*** dari Palangkaraya', amount: 'Rp 4.700.000', time: '17 menit lalu' },
  { name: 'W*** dari Tangerang', amount: 'Rp 1.320.000', time: '19 menit lalu' },
  { name: 'K*** dari Palangkaraya', amount: 'Rp 3.070.000', time: '32 menit lalu' },
  { name: 'U*** dari Sampit', amount: 'Rp 4.400.000', time: '8 menit lalu' },
  { name: 'S*** dari Palangkaraya', amount: 'Rp 3.120.000', time: '12 menit lalu' },
];

function TickerItem({ tx, separator }: { tx: typeof fakeTransactions[0]; separator: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 sm:px-5 py-2.5 whitespace-nowrap">
      {separator && <span className="text-white/10 text-sm">|</span>}
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
      <span className="text-xs text-white/80">{tx.name}</span>
      <span className="text-xs text-white/40">—</span>
      <span className="text-xs font-medium text-white/90">{tx.amount}</span>
      <span className="text-xs text-white/40">—</span>
      <span className="text-[11px] text-white/40">{tx.time}</span>
    </div>
  );
}

export default function LiveActivityFeed() {
  // Double items for seamless loop
  const doubled = useMemo(() => [...fakeTransactions, ...fakeTransactions], []);

  return (
    <div className="relative overflow-hidden bg-gray-900 dark:bg-gray-950 border-y border-white/5">
      {/* LIVE badge — absolute positioned so it floats above the ticker */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-3 md:px-4 bg-gradient-to-r from-gray-900 via-gray-900/95 to-transparent dark:from-gray-950 dark:via-gray-950/95">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Single CSS ticker for both mobile & desktop */}
      <div className="overflow-hidden pl-[72px] md:pl-[80px]">
        <div
          className="flex w-max will-change-transform"
          style={{ animation: 'scroll-left 60s linear infinite' }}
        >
          {doubled.map((tx, i) => (
            <TickerItem key={i} tx={tx} separator={i > 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
