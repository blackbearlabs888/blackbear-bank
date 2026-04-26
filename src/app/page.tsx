import { Metadata } from 'next';
import { db } from '@/lib/db';
import LandingPage from '@/components/landing/landing-page';

export const revalidate = 60; // Revalidate every 60 seconds

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
  return {
    title: 'Black Bear - Jasa Gestun & Tarik Tunai Kartu Kredit Terpercaya',
    description: 'Layanan gestun dan tarik tunai kartu kredit & paylater terpercaya di Indonesia. Proses cepat, aman, dan fee transparan. Tersedia di 30+ kota.',
    keywords: 'gestun, tarik tunai kartu kredit, gestun kartu kredit, tarik tunai paylater, gestun aman, black bear',
    openGraph: {
      title: 'Black Bear - Jasa Gestun & Tarik Tunai Kartu Kredit Terpercaya',
      description: 'Layanan gestun dan tarik tunai kartu kredit & paylater terpercaya di Indonesia. Proses cepat, aman, dan fee transparan.',
      url: siteUrl,
      type: 'website',
    },
    alternates: {
      canonical: siteUrl,
    },
  };
}

async function getPaymentTypes() {
  try {
    const paymentTypes = await db.paymentType.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return paymentTypes.map(pt => ({
      id: pt.id,
      name: pt.name,
      logoUrl: pt.logoUrl ?? null,
      onlineFeePercent: Number(pt.onlineFeePercent),
      onlineFeeFlat: Number(pt.onlineFeeFlat),
      codFeePercent: Number(pt.codFeePercent),
      codFeeFlat: Number(pt.codFeeFlat),
      threshold: Number(pt.threshold),
      discountPercent: Number(pt.discountPercent),
      discountNominal: Number(pt.discountNominal),
      minTransaction: Number(pt.minTransaction),
    }));
  } catch {
    return [];
  }
}

async function getFaqs() {
  try {
    const faqs = await db.fAQ.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      take: 5,
    });
    return faqs.map(f => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
    }));
  } catch {
    return [];
  }
}

async function getAnnouncements() {
  try {
    const now = new Date();
    const announcements = await db.announcement.findMany({
      where: {
        isActive: true,
        type: { in: ['broadcast', 'promo', 'announcement'] },
        OR: [
          { expireDate: null },
          { expireDate: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return announcements.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      link: a.link,
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [paymentTypes, faqs, announcements] = await Promise.all([
    getPaymentTypes(),
    getFaqs(),
    getAnnouncements(),
  ]);

  return <LandingPage paymentTypes={paymentTypes} faqs={faqs} announcements={announcements} />;
}
