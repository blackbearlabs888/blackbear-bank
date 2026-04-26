import { Metadata } from 'next';
import { db } from '@/lib/db';
import FAQClient from './client';

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
  
  return {
    title: 'FAQ - Pertanyaan Umum Seputar Layanan Tarik Tunai',
    description: 'Temukan jawaban untuk pertanyaan umum seputar layanan tarik tunai, gestun kartu kredit, paylater, dan layanan Black Bear lainnya.',
    keywords: 'FAQ, pertanyaan umum, tarik tunai, gestun, kartu kredit, paylater, black bear',
    openGraph: {
      title: 'FAQ - Pertanyaan Umum | Black Bear',
      description: 'Temukan jawaban untuk pertanyaan umum seputar layanan tarik tunai, gestun kartu kredit, paylater, dan layanan Black Bear lainnya.',
      url: `${siteUrl}/faq`,
      type: 'website',
    },
    alternates: {
      canonical: `${siteUrl}/faq`,
    },
  };
}

export default async function FAQPage() {
  // Fetch FAQs server-side for SEO using direct DB call
  let faqs: Array<{
    id: string;
    question: string;
    answer: string;
    category: string;
    order: number;
    isActive: boolean;
  }> = [];
  
  try {
    const result = await db.fAQ.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    faqs = result.map(f => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category,
      order: f.order,
      isActive: f.isActive,
    }));
  } catch (error) {
    console.error('Failed to fetch FAQs:', error);
  }

  return <FAQClient initialFaqs={faqs} />;
}
