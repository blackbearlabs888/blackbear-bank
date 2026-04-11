import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - List all announcements
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // INFO or PROMO
    const status = searchParams.get("status"); // ACTIVE or INACTIVE
    const active = searchParams.get("active"); // If true, filter by status=ACTIVE and date range
    const partnerId = searchParams.get("partnerId"); // For filtering read status

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    // If active=true, filter by status=ACTIVE and current date within date range
    if (active === "true") {
      const now = new Date();
      where.status = "ACTIVE";
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    }

    const announcements = await db.announcement.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // If partnerId is provided, check read status for each announcement
    let announcementsWithReadStatus = announcements;
    if (partnerId) {
      const readStatuses = await db.announcementRead.findMany({
        where: { partnerId },
        select: { announcementId: true },
      });
      const readIds = new Set(readStatuses.map((r) => r.announcementId));

      announcementsWithReadStatus = announcements.map((a) => ({
        ...a,
        isRead: readIds.has(a.id),
      }));
    }

    return NextResponse.json({
      success: true,
      data: announcementsWithReadStatus,
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch announcements",
      },
      { status: 500 }
    );
  }
}

// POST - Create new announcement
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, type, link, startDate, endDate, status, createdBy } = body;

    // Validation
    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: "Title and description are required" },
        { status: 400 }
      );
    }

    // Validate type
    if (type && !["INFO", "PROMO"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type must be INFO or PROMO" },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Status must be ACTIVE or INACTIVE" },
        { status: 400 }
      );
    }

    // For PROMO type, link is recommended
    if (type === "PROMO" && !link) {
      console.warn("PROMO type announcement created without link");
    }

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    if (end < start) {
      return NextResponse.json(
        { success: false, error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Get user ID from createdBy or use a default
    // In production, this would come from auth session
    let userId = createdBy;
    if (!userId) {
      // Find owner user
      const owner = await db.user.findFirst({
        where: { role: "OWNER" },
      });
      userId = owner?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 400 }
      );
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        description,
        type: type || "INFO",
        link: link || null,
        status: status || "INACTIVE",
        startDate: start,
        endDate: end,
        createdBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: announcement,
      message: "Announcement created successfully",
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create announcement",
      },
      { status: 500 }
    );
  }
}
