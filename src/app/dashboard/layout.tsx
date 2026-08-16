import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Dashboard - Black Bear',
  description: 'Dashboard pengguna Black Bear.',
  alternates: {
    canonical: `${siteUrl}/dashboard`,
  },
  // Dashboard redirect page — must NOT be indexed.
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
