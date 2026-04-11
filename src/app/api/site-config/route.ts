import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SiteConfig } from "@/types";

// Define update data type
interface SiteConfigUpdateData {
  ownerName?: string;
  ownerEmail?: string;
  ownerAvatar?: string | null;
  brandName?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  siteTitle?: string;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  contactEmail?: string | null;
  socialInstagram?: string | null;
  socialFacebook?: string | null;
  socialTiktok?: string | null;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
}

export async function GET() {
  try {
    // Get the first (and only) site config
    let siteConfig = await db.siteConfig.findFirst();

    // Create default site config if not exists
    if (!siteConfig) {
      siteConfig = await db.siteConfig.create({
        data: {
          ownerName: "Black Bear Admin",
          ownerEmail: "admin@blackbear.com",
          brandName: "Black Bear",
          siteTitle: "Black Bear - Gestun Service",
          metaDescription: "Layanan Gestun Terpercaya dengan harga kompetitif dan proses cepat",
          metaKeywords: "gestun, jual beli voucher, cashback, shopee, tokopedia, lazada",
          contactWhatsapp: "+6281234567890",
          contactEmail: "admin@blackbear.com",
          socialInstagram: "@blackbear.gestun",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: siteConfig,
    });
  } catch (error) {
    console.error("Error fetching site config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch site config",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    // Get existing site config
    let siteConfig = await db.siteConfig.findFirst();
    
    // Create default if not exists
    if (!siteConfig) {
      siteConfig = await db.siteConfig.create({
        data: {
          ownerName: "Black Bear Admin",
          ownerEmail: "admin@blackbear.com",
          brandName: "Black Bear",
          siteTitle: "Black Bear - Gestun Service",
        },
      });
    }

    // Build update data
    const updateData: SiteConfigUpdateData = {};
    
    // Profile fields
    if (body.ownerName !== undefined) updateData.ownerName = body.ownerName;
    if (body.ownerEmail !== undefined) updateData.ownerEmail = body.ownerEmail;
    if (body.ownerAvatar !== undefined) updateData.ownerAvatar = body.ownerAvatar;
    
    // Brand Identity fields
    if (body.brandName !== undefined) updateData.brandName = body.brandName;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
    if (body.faviconUrl !== undefined) updateData.faviconUrl = body.faviconUrl;
    
    // SEO fields
    if (body.siteTitle !== undefined) updateData.siteTitle = body.siteTitle;
    if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription;
    if (body.metaKeywords !== undefined) updateData.metaKeywords = body.metaKeywords;
    
    // Contact fields
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone;
    if (body.contactWhatsapp !== undefined) updateData.contactWhatsapp = body.contactWhatsapp;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail;
    if (body.socialInstagram !== undefined) updateData.socialInstagram = body.socialInstagram;
    if (body.socialFacebook !== undefined) updateData.socialFacebook = body.socialFacebook;
    if (body.socialTiktok !== undefined) updateData.socialTiktok = body.socialTiktok;
    
    // Maintenance fields
    if (body.maintenanceMode !== undefined) updateData.maintenanceMode = body.maintenanceMode;
    if (body.maintenanceMessage !== undefined) updateData.maintenanceMessage = body.maintenanceMessage;

    // Update site config
    const updatedSiteConfig = await db.siteConfig.update({
      where: { id: siteConfig.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedSiteConfig,
      message: "Site configuration updated successfully",
    });
  } catch (error) {
    console.error("Error updating site config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update site config",
      },
      { status: 500 }
    );
  }
}
