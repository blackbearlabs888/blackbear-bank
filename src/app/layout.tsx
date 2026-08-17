import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { DesktopNavbar } from "@/components/shared/desktop-navbar";
import { MobileBottomNav } from "@/components/shared/mobile-nav";
import { DashboardMobileNav } from "@/components/shared/dashboard-mobile-nav";
import { ConditionalFooter } from "@/components/shared/conditional-footer";
import { MaintenanceWrapper } from "@/components/shared/maintenance-wrapper";
import PageLoader from "@/components/shared/page-loader";
import WhatsAppFab from "@/components/landing/whatsapp-fab";
import ScrollToTop from "@/components/landing/scroll-to-top";
import GlobalFloatingComponents from "@/components/shared/global-floating-components";
import { db } from "@/lib/db";
import { ServerSiteConfigProvider } from "@/lib/server-site-config";
import type { SiteConfig } from "@/hooks/use-site-config";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Generate dynamic metadata from database
export async function generateMetadata(): Promise<Metadata> {
  try {
    const profile = await db.ownerProfile.findFirst();
    
    const websiteTitle = profile?.websiteTitle || "Black Bear";
    const metaTitle = profile?.metaTitle || `${websiteTitle} - Layanan Tarik Tunai Terpercaya`;
    const metaDescription = profile?.metaDescription || "Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat dan aman. Tarik tunai kartu kredit, GoPay Paylater, Shopee Paylater, dan berbagai metode pembayaran lainnya.";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blackbear.cc";
    const logoUrl = profile?.logoUrl || `${siteUrl}/logo.png`;
    
    return {
      metadataBase: new URL(siteUrl),
      title: {
        default: metaTitle,
        template: `%s | ${websiteTitle}`,
      },
      description: metaDescription,
      keywords: [
        // Primary keywords
        "tarik tunai",
        "gestun",
        "tarik tunai kartu kredit",
        "gestun kartu kredit",
        // Secondary keywords
        "paylater",
        "GoPay Paylater",
        "Shopee Paylater",
        "Akulaku Paylater",
        "COD",
        "cash on delivery",
        // Long-tail keywords
        "jasa tarik tunai terpercaya",
        "tarik tunai online",
        "tarik tunai aman",
        "tarik tunai cepat",
        "gestun online",
        "jasa gestun profesional",
        // Location-based
        "tarik tunai Indonesia",
        "gestun Indonesia",
        // Related terms
        "kartu kredit",
        "credit card",
        "pencairan dana",
        "pinjaman online",
        "dana cepat",
      ],
      authors: [{ name: `${websiteTitle} Team`, url: siteUrl }],
      creator: websiteTitle,
      publisher: websiteTitle,
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      openGraph: {
        type: "website",
        locale: "id_ID",
        url: siteUrl,
        siteName: websiteTitle,
        title: metaTitle,
        description: metaDescription,
        images: [
          {
            url: logoUrl,
            width: 1200,
            height: 630,
            alt: `${websiteTitle} - Layanan Tarik Tunai Terpercaya`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: metaTitle,
        description: metaDescription,
        images: [logoUrl],
        creator: `@${websiteTitle.toLowerCase().replace(/\s+/g, '')}`,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      },
      alternates: {
        canonical: siteUrl,
      },
      icons: {
        icon: profile?.faviconUrl || "/logo.svg",
        apple: profile?.faviconUrl || "/logo.svg",
      },
      manifest: "/manifest.json",
      category: "finance",
    };
  } catch (error) {
    // Fallback to defaults if database fails
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blackbear.cc";
    return {
      metadataBase: new URL(siteUrl),
      title: "Black Bear - Layanan Tarik Tunai Terpercaya",
      description: "Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat dan aman.",
      keywords: ["tarik tunai", "gestun", "kartu kredit", "paylater", "COD", "online"],
      authors: [{ name: "Black Bear Team" }],
      icons: {
        icon: "/logo.svg",
      },
      verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      },
    };
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Accessibility: do NOT restrict user scaling or maximum-scale.
  // Users with low vision must be able to zoom the page on mobile.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1520" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch site config for page loader logo + server context
  let siteLogoUrl: string | null = null;
  let siteTitle: string = 'Black Bear';
  let siteConfig: SiteConfig = {
    websiteTitle: 'Black Bear',
    logoUrl: null, faviconUrl: null, metaTitle: null, metaDescription: null,
    footerEmail: null, footerWhatsapp: null, footerInstagram: null,
    footerFacebook: null, footerTiktok: null, footerYoutube: null,
    footerThreads: null, maintenanceMode: false,
  };
  try {
    const profile = await db.ownerProfile.findFirst();
    if (profile) {
      siteLogoUrl = profile.logoUrl;
      siteTitle = profile.websiteTitle || 'Black Bear';
      siteConfig = {
        websiteTitle: profile.websiteTitle || 'Black Bear',
        logoUrl: profile.logoUrl,
        faviconUrl: profile.faviconUrl,
        metaTitle: profile.metaTitle,
        metaDescription: profile.metaDescription,
        footerEmail: profile.footerEmail,
        footerWhatsapp: profile.footerWhatsapp,
        footerInstagram: profile.footerInstagram,
        footerFacebook: profile.footerFacebook,
        footerTiktok: profile.footerTiktok,
        footerYoutube: profile.footerYoutube,
        footerThreads: profile.footerThreads,
        maintenanceMode: profile.maintenanceMode,
      };
    }
  } catch {
    // Fallback to defaults
  }
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        {/* Direct GA4 + Conversion Tracking — loaded conditionally on consent.
            Must mount BEFORE ThemeProvider/children so the gtag.js Script and
            Consent Mode v2 default-denied behavior are established before any
            UI renders. No-op when env var absent or consent not granted. */}
        <AnalyticsProvider />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ServerSiteConfigProvider config={siteConfig}>
          <PageLoader logoUrl={siteLogoUrl} siteTitle={siteTitle} />
          <MaintenanceWrapper>
            <div className="min-h-screen flex flex-col">
              <DesktopNavbar />
              <main className="flex-1 pb-20 md:pb-0">
                {children}
              </main>
              <ConditionalFooter />
            </div>
            <MobileBottomNav />
            <DashboardMobileNav />
            <ScrollToTop />
            <WhatsAppFab />
            <GlobalFloatingComponents />
            <Toaster position="top-center" />
          </MaintenanceWrapper>
          </ServerSiteConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}