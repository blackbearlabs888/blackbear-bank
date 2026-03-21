import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch public site configuration (no authentication required)
export async function GET() {
  try {
    // Get owner profile for site config
    const profile = await db.ownerProfile.findFirst();

    if (!profile) {
      // Return default config if no profile exists
      return NextResponse.json({
        success: true,
        data: {
          websiteTitle: 'Black Bear',
          logoUrl: null,
          faviconUrl: null,
          metaTitle: 'Black Bear - Layanan Tarik Tunai Terpercaya',
          metaDescription: 'Layanan tarik tunai profesional untuk Kartu Kredit & Paylater dengan proses cepat dan aman.',
          footerWhatsapp: null,
          footerInstagram: null,
          footerFacebook: null,
          maintenanceMode: false,
        },
      });
    }

    // Return only public fields
    return NextResponse.json({
      success: true,
      data: {
        websiteTitle: profile.websiteTitle,
        logoUrl: profile.logoUrl,
        faviconUrl: profile.faviconUrl,
        metaTitle: profile.metaTitle,
        metaDescription: profile.metaDescription,
        footerWhatsapp: profile.footerWhatsapp,
        footerInstagram: profile.footerInstagram,
        footerFacebook: profile.footerFacebook,
        maintenanceMode: profile.maintenanceMode,
      },
    });
  } catch (error) {
    console.error('Get site config error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
