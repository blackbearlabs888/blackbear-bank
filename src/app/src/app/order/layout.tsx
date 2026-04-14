import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blackbear.cc';

export const metadata: Metadata = {
  title: 'Order Gestun - Tarik Tunai Kartu Kredit & Paylater',
  description: 'Buat order tarik tunai kartu kredit, GoPay Paylater, Shopee Paylater, dan berbagai metode pembayaran lainnya. Proses cepat, aman, dan transparan dengan kalkulasi biaya real-time.',
  keywords: [
    'order gestun', 'tarik tunai', 'gestun kartu kredit', 'gestun online',
    'tarik tunai paylater', 'GoPay Paylater', 'Shopee Paylater', 'COD gestun',
    'jasa gestun', 'tarik dana kartu kredit', 'pencairan kartu kredit',
  ],
  openGraph: {
    title: 'Order Gestun - Tarik Tunai Kartu Kredit & Paylater | Black Bear',
    description: 'Buat order tarik tunai kartu kredit & paylater. Proses cepat, aman, dan transparan dengan kalkulasi biaya real-time.',
    url: `${siteUrl}/order`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Order Gestun - Tarik Tunai Kartu Kredit & Paylater | Black Bear',
    description: 'Buat order tarik tunai kartu kredit & paylater. Proses cepat dan aman.',
  },
  alternates: {
    canonical: `${siteUrl}/order`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
