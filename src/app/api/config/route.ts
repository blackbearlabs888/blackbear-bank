import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Public endpoint to fetch owner profile config (no auth required)
// This returns website configuration for public use (navbar, footer, metadata)
export async function GET() {
  try {
    // Get owner profile
    const profile = await db.ownerProfile.findFirst();

    if (!profile) {
      // Return default config if no profile exists
      return NextResponse.json({
        success: true,
        data: {
          websiteTitle: 'Black Bear',
          logoUrl: null,
          faviconUrl: null,
          metaTitle: null,
          metaDescription: null,
          footerWhatsapp: null,
          footerInstagram: null,
          footerFacebook: null,
          maintenanceMode: false,
        },
      });
    }

    // Return only public-safe fields
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
    console.error('Get public config error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
