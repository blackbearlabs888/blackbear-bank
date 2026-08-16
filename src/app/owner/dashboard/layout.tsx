import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Owner Dashboard - Black Bear',
  description: 'Dashboard owner Black Bear.',
  alternates: {
    canonical: `${siteUrl}/owner/dashboard`,
  },
  // Authenticated dashboard — must NOT be indexed.
  robots: {
    index: false,
    follow: false,
  },
};

export default function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
