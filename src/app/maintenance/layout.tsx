import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Maintenance - Black Bear',
  description: 'Halaman sedang dalam pemeliharaan.',
  alternates: {
    canonical: `${siteUrl}/maintenance`,
  },
  // Maintenance page — must NOT be indexed (avoids soft-404 mass indexing).
  robots: {
    index: false,
    follow: false,
  },
};

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
