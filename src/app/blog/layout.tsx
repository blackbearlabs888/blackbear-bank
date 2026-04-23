import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Blog - Artikel Tips & Tutorial Gestun Terbaru',
  description: 'Temukan tips, tutorial, dan informasi terbaru seputar layanan tarik tunai kartu kredit, pengelolaan paylater, dan update dari Black Bear. Panduan lengkap gestun online.',
  keywords: [
    'blog gestun', 'tips tarik tunai', 'tutorial gestun', 'artikel kartu kredit',
    'tips paylater', 'cara gestun', 'informasi tarik tunai', 'panduan gestun',
    'gestun kartu kredit BCA', 'gestun Mandiri', 'gestun BRI',
    'GoPay Paylater tips', 'Shopee Paylater tutorial',
    'cara tarik tunai online', 'panduan keuangan',
  ],
  openGraph: {
    title: 'Blog - Artikel Tips & Tutorial Gestun Terbaru | Black Bear',
    description: 'Temukan tips, tutorial, dan informasi terbaru seputar layanan tarik tunai dan gestun.',
    url: `${siteUrl}/blog`,
    type: 'website',
    locale: 'id_ID',
    siteName: 'Black Bear',
    images: [
      {
        url: `${siteUrl}/og-blog.png`,
        width: 1200,
        height: 630,
        alt: 'Blog Black Bear - Tips dan Tutorial Gestun',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog - Artikel Tips & Tutorial Gestun Terbaru | Black Bear',
    description: 'Temukan tips, tutorial, dan informasi terbaru seputar layanan tarik tunai dan gestun.',
    images: [`${siteUrl}/og-blog.png`],
  },
  alternates: {
    canonical: `${siteUrl}/blog`,
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

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
