import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET owner profile
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    // Get the first (and should be only) owner profile
    let profile = await db.ownerProfile.findFirst();

    // Create default profile if doesn't exist
    if (!profile) {
      profile = await db.ownerProfile.create({
        data: {
          name: user.name || 'Owner',
          email: user.email || 'owner@example.com',
          websiteTitle: 'Black Bear',
        },
      });
    }

    // Return profile with user data merged
    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        email: user.email || '',
        avatar: profile.avatar || user.avatar || null,
      },
    });
  } catch (error) {
    console.error('Get owner profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PATCH update owner profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      avatar,
      websiteTitle,
      logoUrl,
      faviconUrl,
      metaTitle,
      metaDescription,
      footerWhatsapp,
      footerInstagram,
      footerFacebook,
      maintenanceMode,
    } = body;

    // Get existing profile
    let profile = await db.ownerProfile.findFirst();

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar || null;
    if (websiteTitle !== undefined) updateData.websiteTitle = websiteTitle;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (faviconUrl !== undefined) updateData.faviconUrl = faviconUrl || null;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle || null;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription || null;
    if (footerWhatsapp !== undefined) updateData.footerWhatsapp = footerWhatsapp || null;
    if (footerInstagram !== undefined) updateData.footerInstagram = footerInstagram || null;
    if (footerFacebook !== undefined) updateData.footerFacebook = footerFacebook || null;
    if (maintenanceMode !== undefined) updateData.maintenanceMode = maintenanceMode;

    if (!profile) {
      // Create new profile
      profile = await db.ownerProfile.create({
        data: {
          name: name || user.name || 'Owner',
          email: user.email || 'owner@example.com',
          avatar: avatar || null,
          websiteTitle: websiteTitle || 'Black Bear',
          logoUrl: logoUrl || null,
          faviconUrl: faviconUrl || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          footerWhatsapp: footerWhatsapp || null,
          footerInstagram: footerInstagram || null,
          footerFacebook: footerFacebook || null,
          maintenanceMode: maintenanceMode || false,
        },
      });
    } else {
      // Update existing profile
      profile = await db.ownerProfile.update({
        where: { id: profile.id },
        data: updateData,
      });
    }

    // Return profile with user data
    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        email: user.email || '',
      },
      message: 'Profil berhasil diperbarui',
    });
  } catch (error) {
    console.error('Update owner profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
