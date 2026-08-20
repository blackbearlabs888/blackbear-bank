import { Metadata } from 'next';
import { db } from '@/lib/db';
import LandingPage from '@/components/landing/landing-page';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Layanan Pencairan Limit Kartu Kredit & Paylater Online | Black Bear',
  description: 'Layanan pencairan limit kartu kredit dan paylater secara online. Simulasi biaya tersedia di kalkulator, prosedur verifikasi data berstruktur, dan status transaksi dapat dipantau melalui sistem tracking order.',
  keywords: [
    'pencairan limit kartu kredit', 'pencairan limit paylater', 'gestun online',
    'tarik tunai kartu kredit', 'tarik tunai paylater', 'simulasi biaya gestun',
    'jasa pencairan limit', 'pencairan limit online',
    'gestun Jakarta', 'gestun Surabaya', 'gestun Bandung',
    'tarik tunai online', 'kalkulator biaya gestun',
  ],
  alternates: {
    canonical: siteUrl,
  },
};

export const revalidate = 60; // Revalidate every 60 seconds

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
      take: 20,
    });
    return faqs.map(f => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category,
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
