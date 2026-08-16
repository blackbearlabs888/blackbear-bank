import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Daftar Mitra - Black Bear',
  description: 'Pendaftaran mitra Black Bear.',
  alternates: {
    canonical: `${siteUrl}/register`,
  },
  // Registration page — must NOT be indexed.
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
