import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Fraud Review - Owner Dashboard - Black Bear',
  description: 'Anti-fraud review queue for flagged transactions.',
  alternates: {
    canonical: `${siteUrl}/owner/dashboard/fraud-review`,
  },
  // Authenticated dashboard — must NOT be indexed.
  robots: {
    index: false,
    follow: false,
  },
};

export default function FraudReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
