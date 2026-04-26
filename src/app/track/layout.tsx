import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Track Order - Lacak Status Transaksi Gestun Real-Time',
  description: 'Lacak status order gestun Anda secara real-time. Pantau proses verifikasi, pembayaran, dan pencairan dana tarik tunai kartu kredit dan paylater. Cek status transaksi BB-XXXXXX.',
  keywords: [
    'track order', 'lacak order', 'cek status transaksi', 'status gestun',
    'lacak gestun', 'cek order gestun', 'tracking order', 'status pembayaran',
    'lacak status tarik tunai', 'cek status pencairan dana',
    'monitor transaksi gestun', 'lacak BB', 'status order gestun online',
  ],
  openGraph: {
    title: 'Track Order - Lacak Status Transaksi Gestun Real-Time | Black Bear',
    description: 'Lacak status order gestun Anda secara real-time. Pantau proses verifikasi dan pencairan dana tarik tunai.',
    url: `${siteUrl}/track`,
    type: 'website',
    locale: 'id_ID',
    siteName: 'Black Bear',
    images: [
      {
        url: `${siteUrl}/og-track.png`,
        width: 1200,
        height: 630,
        alt: 'Track Order - Lacak Status Transaksi Gestun Real-Time',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Track Order - Lacak Status Transaksi Gestun Real-Time | Black Bear',
    description: 'Lacak status order gestun Anda secara real-time. Pantau proses verifikasi dan pencairan dana.',
    images: [`${siteUrl}/og-track.png`],
  },
  alternates: {
    canonical: `${siteUrl}/track`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
