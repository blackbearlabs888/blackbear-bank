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
import { db } from "@/lib/db";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Generate dynamic metadata from database
export async function generateMetadata(): Promise<Metadata> {
  try {
    const profile = await db.ownerProfile.findFirst();
    
    const websiteTitle = profile?.websiteTitle || "Black Bear";
    const metaTitle = profile?.metaTitle || `${websiteTitle} - Layanan Tarik Tunai Terpercaya`;
    const metaDescription = profile?.metaDescription || "Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat dan aman.";
    
    return {
      title: {
        default: metaTitle,
        template: `%s | ${websiteTitle}`,
      },
      description: metaDescription,
      keywords: ["tarik tunai", "gestun", "kartu kredit", "paylater", "COD", "online"],
      authors: [{ name: `${websiteTitle} Team` }],
      icons: {
        icon: profile?.faviconUrl || "/logo.svg",
      },
    };
  } catch (error) {
    // Fallback to defaults if database fails
    return {
      title: "Black Bear - Layanan Tarik Tunai Terpercaya",
      description: "Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat dan aman.",
      keywords: ["tarik tunai", "gestun", "kartu kredit", "paylater", "COD", "online"],
      authors: [{ name: "Black Bear Team" }],
      icons: {
        icon: "/logo.svg",
      },
    };
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1520" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
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
            <Toaster position="top-center" />
          </MaintenanceWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
