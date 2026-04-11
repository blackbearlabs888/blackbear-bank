import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST - Mark announcement as read
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { announcementId, partnerId } = body;

    if (!announcementId || !partnerId) {
      return NextResponse.json(
        { success: false, error: "Announcement ID and Partner ID are required" },
        { status: 400 }
      );
    }

    // Check if already marked as read
    const existingRead = await db.announcementRead.findUnique({
      where: {
        announcementId_partnerId: {
          announcementId,
          partnerId,
        },
      },
    });

    if (existingRead) {
      return NextResponse.json({
        success: true,
        message: "Already marked as read",
        data: existingRead,
      });
    }

    // Create read status
    const readStatus = await db.announcementRead.create({
      data: {
        announcementId,
        partnerId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Announcement marked as read",
      data: readStatus,
    });
  } catch (error) {
    console.error("Error marking announcement as read:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to mark announcement as read",
      },
      { status: 500 }
    );
  }
}

// POST - Mark all announcements as read for a partner
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { partnerId } = body;

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: "Partner ID is required" },
        { status: 400 }
      );
    }

    // Get all active announcements
    const now = new Date();
    const activeAnnouncements = await db.announcement.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: { id: true },
    });

    // Get existing read statuses
    const existingReads = await db.announcementRead.findMany({
      where: { partnerId },
      select: { announcementId: true },
    });
    const existingIds = new Set(existingReads.map((r) => r.announcementId));

    // Create read statuses for unread announcements
    const toCreate = activeAnnouncements
      .filter((a) => !existingIds.has(a.id))
      .map((a) => ({
        announcementId: a.id,
        partnerId,
      }));

    if (toCreate.length > 0) {
      await db.announcementRead.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${toCreate.length} announcements marked as read`,
    });
  } catch (error) {
    console.error("Error marking all announcements as read:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to mark all announcements as read",
      },
      { status: 500 }
    );
  }
}
