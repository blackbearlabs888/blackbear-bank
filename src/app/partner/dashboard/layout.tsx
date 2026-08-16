import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Partner Dashboard - Black Bear',
  description: 'Dashboard partner Black Bear.',
  alternates: {
    canonical: `${siteUrl}/partner/dashboard`,
  },
  // Authenticated dashboard — must NOT be indexed.
  robots: {
    index: false,
    follow: false,
  },
};

export default function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
