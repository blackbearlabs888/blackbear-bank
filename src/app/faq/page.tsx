import { Metadata } from 'next';
import FAQClient from './client';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'FAQ - Pertanyaan Umum Seputar Layanan Gestun & Tarik Tunai',
    description: 'Temukan jawaban untuk pertanyaan umum seputar layanan tarik tunai, gestun kartu kredit, paylater, proses transaksi, dan layanan Black Bear lainnya.',
    keywords: [
      'FAQ gestun', 'pertanyaan umum gestun', 'cara tarik tunai',
      'gestun kartu kredit', 'gestun paylater', 'apakah gestun aman',
      'berapa biaya gestun', 'berapa lama proses gestun',
      'cara order gestun', 'cara menjadi mitra gestun',
      'metode pembayaran gestun', 'gestun BCA', 'gestun Mandiri',
    ],
    openGraph: {
      title: 'FAQ - Pertanyaan Umum Seputar Layanan Gestun & Tarik Tunai | Black Bear',
      description: 'Temukan jawaban untuk pertanyaan umum seputar layanan tarik tunai, gestun kartu kredit, paylater, dan layanan Black Bear lainnya.',
      url: `${siteUrl}/faq`,
      type: 'website',
      locale: 'id_ID',
      siteName: 'Black Bear',
      images: [
        {
          url: `${siteUrl}/og-faq.png`,
          width: 1200,
          height: 630,
          alt: 'FAQ - Pertanyaan Umum Black Bear Gestun',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'FAQ - Pertanyaan Umum Seputar Layanan Gestun | Black Bear',
      description: 'Temukan jawaban untuk pertanyaan umum seputar layanan tarik tunai dan gestun.',
      images: [`${siteUrl}/og-faq.png`],
    },
    alternates: {
      canonical: `${siteUrl}/faq`,
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
}

export default async function FAQPage() {
  // Fetch FAQs server-side for SEO
  let faqs: Array<{
    id: string;
    question: string;
    answer: string;
    category: string;
    order: number;
    isActive: boolean;
  }> = [];
  
  try {
    const response = await fetch(
      `http://localhost:3000/api/seo/faq?public=true`,
      { cache: 'no-store' }
    );
    const result = await response.json();

    if (result.success && result.data) {
      faqs = result.data;
    }
  } catch (error) {
    console.error('Failed to fetch FAQs:', error);
  }

  return <FAQClient initialFaqs={faqs} />;
}
