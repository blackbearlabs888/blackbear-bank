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
      footerEmail,
      footerWhatsapp,
      footerInstagram,
      footerFacebook,
      footerTiktok,
      footerYoutube,
      footerThreads,
      maintenanceMode,
    } = body;

    // Get existing profile
    let profile = await db.ownerProfile.findFirst();

    // Build update data for OwnerProfile
    const profileUpdateData: Record<string, unknown> = {};
    
    if (name !== undefined) profileUpdateData.name = name;
    if (avatar !== undefined) profileUpdateData.avatar = avatar || null;
    if (websiteTitle !== undefined) profileUpdateData.websiteTitle = websiteTitle;
    if (logoUrl !== undefined) profileUpdateData.logoUrl = logoUrl || null;
    if (faviconUrl !== undefined) profileUpdateData.faviconUrl = faviconUrl || null;
    if (metaTitle !== undefined) profileUpdateData.metaTitle = metaTitle || null;
    if (metaDescription !== undefined) profileUpdateData.metaDescription = metaDescription || null;
    if (footerWhatsapp !== undefined) profileUpdateData.footerWhatsapp = footerWhatsapp || null;
    if (footerEmail !== undefined) profileUpdateData.footerEmail = footerEmail || null;
    if (footerInstagram !== undefined) profileUpdateData.footerInstagram = footerInstagram || null;
    if (footerFacebook !== undefined) profileUpdateData.footerFacebook = footerFacebook || null;
    if (footerTiktok !== undefined) profileUpdateData.footerTiktok = footerTiktok || null;
    if (footerYoutube !== undefined) profileUpdateData.footerYoutube = footerYoutube || null;
    if (footerThreads !== undefined) profileUpdateData.footerThreads = footerThreads || null;
    if (maintenanceMode !== undefined) profileUpdateData.maintenanceMode = maintenanceMode;

    // Build update data for User table
    const userUpdateData: Record<string, unknown> = {};
    
    // Update user name and avatar in User table as well
    if (name !== undefined) userUpdateData.name = name;
    if (avatar !== undefined) userUpdateData.avatar = avatar || null;

    // Update User table if there are changes
    if (Object.keys(userUpdateData).length > 0) {
      await db.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });
    }

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
          footerEmail: footerEmail || null,
          footerWhatsapp: footerWhatsapp || null,
          footerInstagram: footerInstagram || null,
          footerFacebook: footerFacebook || null,
          footerTiktok: footerTiktok || null,
          footerYoutube: footerYoutube || null,
          footerThreads: footerThreads || null,
          maintenanceMode: maintenanceMode || false,
        },
      });
    } else {
      // Update existing profile
      profile = await db.ownerProfile.update({
        where: { id: profile.id },
        data: profileUpdateData,
      });
    }

    // Return profile with updated user data
    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        // Return updated values
        name: name || user.name,
        avatar: avatar || null,
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
