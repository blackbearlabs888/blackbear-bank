import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - List all marketplaces (optionally filter by status)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("all") === "true";

    const marketplaces = await db.marketplace.findMany({
      where: includeInactive ? {} : { status: "ACTIVE" },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: marketplaces,
    });
  } catch (error) {
    console.error("Error fetching marketplaces:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch marketplaces",
      },
      { status: 500 }
    );
  }
}

// POST - Create new marketplace
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, feePercent, logo, status } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate fee percentage (0-100)
    const fee = Number(feePercent) || 0;
    if (fee < 0 || fee > 100) {
      return NextResponse.json(
        { success: false, error: "Fee percent must be between 0-100" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await db.marketplace.findFirst({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Marketplace with this name already exists" },
        { status: 400 }
      );
    }

    const marketplace = await db.marketplace.create({
      data: {
        name,
        feePercent: fee / 100, // Store as decimal
        logo: logo || null,
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      data: marketplace,
      message: "Marketplace created successfully",
    });
  } catch (error) {
    console.error("Error creating marketplace:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create marketplace",
      },
      { status: 500 }
    );
  }
}
