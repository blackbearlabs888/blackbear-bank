import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const results = {
      owner: null as unknown,
      paymentTypes: [] as unknown[],
      marketplaces: [] as unknown[],
      siteConfig: null as unknown,
    };

    // 1. Create default owner user if not exists
    const existingOwner = await db.user.findUnique({
      where: { email: "owner@blackbear.com" },
    });

    if (!existingOwner) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const owner = await db.user.create({
        data: {
          email: "owner@blackbear.com",
          password: hashedPassword,
          name: "Black Bear Owner",
          role: "OWNER",
        },
      });
      results.owner = owner;
    } else {
      results.owner = existingOwner;
    }

    // 2. Create default payment types if not exists
    const defaultPaymentTypes = [
      {
        name: "Kartu Kredit",
        type: "CC",
        threshold: 1000000,
        onlineFeePercent: 0.10,
        onlineFeeFixed: 100000,
        codFeePercent: 0.15,
        codFeeFixed: 150000,
      },
      {
        name: "Paylater Shopee",
        type: "PAYLATER",
        threshold: 1000000,
        onlineFeePercent: 0.12,
        onlineFeeFixed: 120000,
        codFeePercent: 0.17,
        codFeeFixed: 170000,
      },
      {
        name: "Paylater GoPay",
        type: "PAYLATER",
        threshold: 1000000,
        onlineFeePercent: 0.12,
        onlineFeeFixed: 120000,
        codFeePercent: 0.17,
        codFeeFixed: 170000,
      },
      {
        name: "Paylater Tokopedia",
        type: "PAYLATER",
        threshold: 1000000,
        onlineFeePercent: 0.12,
        onlineFeeFixed: 120000,
        codFeePercent: 0.17,
        codFeeFixed: 170000,
      },
    ];

    for (const pt of defaultPaymentTypes) {
      const existing = await db.paymentType.findFirst({
        where: { name: pt.name },
      });

      if (!existing) {
        const created = await db.paymentType.create({
          data: pt,
        });
        results.paymentTypes.push(created);
      } else {
        results.paymentTypes.push(existing);
      }
    }

    // 3. Create default marketplaces if not exists
    const defaultMarketplaces = [
      {
        name: "Shopee",
        feePercent: 0.03, // 3%
      },
      {
        name: "Tokopedia",
        feePercent: 0.025, // 2.5%
      },
      {
        name: "Lazada",
        feePercent: 0.03, // 3%
      },
      {
        name: "Bukalapak",
        feePercent: 0.02, // 2%
      },
    ];

    for (const mp of defaultMarketplaces) {
      const existing = await db.marketplace.findFirst({
        where: { name: mp.name },
      });

      if (!existing) {
        const created = await db.marketplace.create({
          data: mp,
        });
        results.marketplaces.push(created);
      } else {
        results.marketplaces.push(existing);
      }
    }

    // 4. Create default site config if not exists
    const existingConfig = await db.siteConfig.findFirst();

    if (!existingConfig) {
      const siteConfig = await db.siteConfig.create({
        data: {
          ownerName: "Black Bear Admin",
          ownerEmail: "admin@blackbear.com",
          siteTitle: "Black Bear - Gestun Service",
          metaDescription:
            "Layanan Gestun Terpercaya dengan harga kompetitif dan proses cepat",
          metaKeywords:
            "gestun, jual beli voucher, cashback, shopee, tokopedia, lazada",
          contactWhatsapp: "+6281234567890",
          contactEmail: "admin@blackbear.com",
          socialInstagram: "@blackbear.gestun",
        },
      });
      results.siteConfig = siteConfig;
    } else {
      results.siteConfig = existingConfig;
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      data: results,
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
