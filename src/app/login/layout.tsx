import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Login - Masuk ke Dashboard',
  description: 'Login ke dashboard Black Bear untuk mengelola transaksi, pantau order, dan kelola keuangan gestun Anda. Akses cepat dan aman untuk owner dan partner.',
  keywords: ['login', 'masuk', 'dashboard', 'black bear', 'gestun', 'tarik tunai'],
  openGraph: {
    title: 'Login - Masuk ke Dashboard | Black Bear',
    description: 'Login ke dashboard Black Bear untuk mengelola transaksi, pantau order, dan kelola keuangan gestun Anda.',
    url: `${siteUrl}/login`,
    type: 'website',
    locale: 'id_ID',
    siteName: 'Black Bear',
  },
  twitter: {
    card: 'summary',
    title: 'Login - Masuk ke Dashboard | Black Bear',
    description: 'Login ke dashboard Black Bear untuk mengelola transaksi dan keuangan gestun Anda.',
  },
  alternates: {
    canonical: `${siteUrl}/login`,
  },
  // Auth page — must NOT be indexed.
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
