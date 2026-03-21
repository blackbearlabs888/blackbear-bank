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
          footerEmail: null,
          footerWhatsapp: null,
          footerInstagram: null,
          footerFacebook: null,
          footerTiktok: null,
          footerYoutube: null,
          footerThreads: null,
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
        footerEmail: profile.footerEmail,
        footerWhatsapp: profile.footerWhatsapp,
        footerInstagram: profile.footerInstagram,
        footerFacebook: profile.footerFacebook,
        footerTiktok: profile.footerTiktok,
        footerYoutube: profile.footerYoutube,
        footerThreads: profile.footerThreads,
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
