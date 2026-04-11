import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/maintenance/status
 * Returns maintenance mode status - used by middleware
 * This is a lightweight endpoint that only returns maintenance status
 */
export async function GET() {
  try {
    const siteConfig = await db.siteConfig.findFirst();

    return NextResponse.json({
      success: true,
      data: {
        maintenanceMode: siteConfig?.maintenanceMode ?? false,
        maintenanceMessage: siteConfig?.maintenanceMessage ?? null,
      },
    });
  } catch (error) {
    console.error("Error checking maintenance status:", error);
    // Default to false on error to avoid blocking all traffic
    return NextResponse.json({
      success: true,
      data: {
        maintenanceMode: false,
        maintenanceMessage: null,
      },
    });
  }
}
