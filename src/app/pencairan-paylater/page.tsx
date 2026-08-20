import { Metadata } from 'next';
import { db } from '@/lib/db';
import { safeJsonLd } from '@/lib/json-ld-safe';
import { isPalangkaRayaEligible } from '@/lib/location-eligibility';
import PencairanPaylaterClient from './client';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';
const routePath = '/pencairan-paylater';
const canonicalUrl = `${siteUrl}${routePath}`;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Jasa Pencairan Limit Paylater Online',
  description:
    'Layanan pencairan limit paylater online dengan provider yang aktif terdaftar, simulasi biaya transparan, dan prosedur verifikasi data berstruktur. Pelajari alur, ketentuan akun, dan estimasi biaya sebelum melanjutkan.',
  keywords: [
    'pencairan limit paylater',
    'jasa pencairan limit paylater',
    'pencairan limit paylater online',
    'simulasi biaya pencairan paylater',
    'gestun paylater online',
    'tarik tunai paylater',
    'kalkulator biaya paylater',
  ],
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: 'website',
    title: 'Jasa Pencairan Limit Paylater Online',
    description:
      'Layanan pencairan limit paylater online dengan provider yang aktif terdaftar dan prosedur verifikasi data berstruktur.',
    url: canonicalUrl,
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jasa Pencairan Limit Paylater Online',
    description:
      'Layanan pencairan limit paylater online dengan provider yang aktif terdaftar dan prosedur verifikasi data berstruktur.',
  },
};

interface PaymentTypeOption {
  id: string;
  name: string;
  logoUrl: string | null;
  onlineFeePercent: number;
  onlineFeeFlat: number;
  codFeePercent: number;
  codFeeFlat: number;
  threshold: number;
  discountPercent: number;
  discountNominal: number;
  minTransaction: number;
}

async function getPaymentTypes(): Promise<PaymentTypeOption[]> {
  try {
    const paymentTypes = await db.paymentType.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return paymentTypes.map((pt) => ({
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

// SEO Batch 1 QA correction #3: removed `getFaqs()` — pillar pages now render
// ONLY their pillar-specific `pillarFaqs` array (defined in client.tsx).
// Generic DB FAQs (all categories) are no longer appended, so the pillar FAQ
// section does not duplicate /faq content.
// SEO Batch 1 QA correction #4: removed local `getPalangkaRayaActive()`
// (isActive-only check). Replaced with `isPalangkaRayaEligible()` from
// `@/lib/location-eligibility`, which mirrors the sitemap rule exactly:
// active location AND ≥1 active partner serving that city.

export default async function PencairanPaylaterPage() {
  const [paymentTypes, palangkaRayaActive] = await Promise.all([
    getPaymentTypes(),
    isPalangkaRayaEligible(),
  ]);

  // Service schema — top-level Service with embedded provider Organization.
  // No AggregateRating / Review / Offer / FinancialProduct per SEO Batch 1
  // content guardrails.
  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${canonicalUrl}#service`,
    name: 'Layanan Pencairan Limit Paylater Online',
    description:
      'Layanan pencairan limit paylater secara online dari provider yang aktif terdaftar, dengan simulasi biaya transparan, prosedur verifikasi data berstruktur, dan status transaksi yang dapat dipantau melalui sistem tracking order.',
    serviceType: 'Pencairan Limit Paylater',
    url: canonicalUrl,
    areaServed: { '@type': 'Country', name: 'Indonesia' },
    provider: {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Black Bear',
      url: siteUrl,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Pencairan Limit Paylater',
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <PencairanPaylaterClient
        paymentTypes={paymentTypes}
        palangkaRayaActive={palangkaRayaActive}
        canonicalUrl={canonicalUrl}
      />
    </>
  );
}
