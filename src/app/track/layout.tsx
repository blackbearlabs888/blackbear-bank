import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blackbear.cc';

export const metadata: Metadata = {
  title: 'Track Order - Lacak Status Transaksi',
  description: 'Lacak status order gestun Anda secara real-time. Pantau proses verifikasi, pembayaran, dan pencairan dana tarik tunai kartu kredit dan paylater.',
  keywords: [
    'track order', 'lacak order', 'cek status', 'status transaksi',
    'lacak gestun', 'cek order', 'tracking order', 'status pembayaran',
  ],
  openGraph: {
    title: 'Track Order - Lacak Status Transaksi | Black Bear',
    description: 'Lacak status order gestun Anda secara real-time. Pantau proses verifikasi dan pencairan dana.',
    url: `${siteUrl}/track`,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Track Order - Lacak Status Transaksi | Black Bear',
    description: 'Lacak status order gestun Anda secara real-time.',
  },
  alternates: {
    canonical: `${siteUrl}/track`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
