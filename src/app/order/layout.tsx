import { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blackbear.cc';

export const metadata: Metadata = {
  title: 'Order Gestun Online - Tarik Tunai Kartu Kredit & Paylater',
  description: 'Buat order tarik tunai kartu kredit, GoPay Paylater, Shopee Paylater, Akulaku dan berbagai metode pembayaran lainnya. Proses cepat 15-30 menit, aman, transparan dengan kalkulasi biaya real-time.',
  keywords: [
    'order gestun', 'tarik tunai online', 'gestun kartu kredit', 'gestun online',
    'tarik tunai paylater', 'GoPay Paylater gestun', 'Shopee Paylater gestun',
    'COD gestun', 'jasa gestun online', 'tarik dana kartu kredit',
    'pencairan kartu kredit', 'gestun BCA', 'gestun Mandiri', 'gestun BRI',
    'cara gestun online', 'order tarik tunai', 'gestun aman terpercaya',
  ],
  openGraph: {
    title: 'Order Gestun Online - Tarik Tunai Kartu Kredit & Paylater | Black Bear',
    description: 'Buat order tarik tunai kartu kredit & paylater. Proses cepat 15-30 menit, aman, dan transparan dengan kalkulasi biaya real-time.',
    url: `${siteUrl}/order`,
    type: 'website',
    locale: 'id_ID',
    siteName: 'Black Bear',
    images: [
      {
        url: `${siteUrl}/og-order.png`,
        width: 1200,
        height: 630,
        alt: 'Order Gestun Online - Tarik Tunai Kartu Kredit & Paylater',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Order Gestun Online - Tarik Tunai Kartu Kredit & Paylater | Black Bear',
    description: 'Buat order tarik tunai kartu kredit & paylater. Proses cepat, aman, dan transparan.',
    images: [`${siteUrl}/og-order.png`],
  },
  alternates: {
    canonical: `${siteUrl}/order`,
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

function OrderLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-4 animate-fade-in">
        {/* Step indicator skeleton */}
        <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-muted/30">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <Skeleton className="w-10 h-10 rounded-xl" />
              {step < 3 && <Skeleton className="w-16 h-1 rounded-full" />}
            </div>
          ))}
        </div>

        {/* Main form card skeleton */}
        <Card className="border-0 shadow-xl overflow-hidden">
          {/* Top gradient bar */}
          <Skeleton className="h-1.5 w-full rounded-none" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tip box skeleton */}
            <div className="p-3 rounded-xl bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>

            {/* Input fields skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>

            {/* Submit button skeleton */}
            <Skeleton className="h-12 w-full rounded-xl" />
          </CardContent>
        </Card>

        {/* Guide card skeleton */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-purple-500/5 to-fuchsia-500/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<OrderLoadingSkeleton />}>
      {children}
    </Suspense>
  );
}
