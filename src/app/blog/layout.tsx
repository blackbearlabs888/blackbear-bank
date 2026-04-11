import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blackbear.cc';

export const metadata: Metadata = {
  title: 'Blog - Artikel Tips & Tutorial Gestun',
  description: 'Temukan tips, tutorial, dan informasi terbaru seputar layanan tarik tunai kartu kredit, pengelolaan paylater, dan update dari Black Bear.',
  keywords: [
    'blog gestun', 'tips tarik tunai', 'tutorial gestun', 'artikel kartu kredit',
    'tips paylater', 'cara gestun', 'informasi tarik tunai', 'panduan gestun',
  ],
  openGraph: {
    title: 'Blog - Artikel Tips & Tutorial Gestun | Black Bear',
    description: 'Temukan tips, tutorial, dan informasi terbaru seputar layanan tarik tunai dan gestun.',
    url: `${siteUrl}/blog`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog - Artikel Tips & Tutorial Gestun | Black Bear',
    description: 'Temukan tips, tutorial, dan informasi terbaru seputar layanan tarik tunai dan gestun.',
  },
  alternates: {
    canonical: `${siteUrl}/blog`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
