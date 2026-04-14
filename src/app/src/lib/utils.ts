import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Compact format for mobile - shows shorter numbers like 1.5jt, 500rb
export function formatCompactCurrency(value: number): string {
  if (value >= 1000000000000) {
    // Triliun (trillion)
    return `Rp ${(value / 1000000000000).toFixed(1).replace(/\.0$/, '')}T`;
  }
  if (value >= 1000000000) {
    // Miliar (billion)
    return `Rp ${(value / 1000000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1000000) {
    // Juta (million)
    return `Rp ${(value / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
  }
  if (value >= 1000) {
    // Ribu (thousand)
    return `Rp ${(value / 1000).toFixed(0)}rb`;
  }
  return `Rp ${value}`;
}

// Precise format for mobile - ensures full number visibility
export function formatPreciseCurrency(value: number): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  
  // For mobile, we want to ensure the number is readable
  // Rp 1.500.000 instead of Rp1.500.000
  return formatted;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
  }).format(new Date(date));
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}j lalu`;
  return `${Math.floor(diffInSeconds / 86400)}h lalu`;
}

export function formatDateAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
  return formatShortDate(date);
}
