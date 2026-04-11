import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH - Update announcement
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, type, link, startDate, endDate, status } = body;

    // Check if announcement exists
    const existing = await db.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Announcement not found" },
        { status: 404 }
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

    // Validate dates if both provided
    const start = startDate ? new Date(startDate) : existing.startDate;
    const end = endDate ? new Date(endDate) : existing.endDate;

    if (end < start) {
      return NextResponse.json(
        { success: false, error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (link !== undefined) updateData.link = link || null;
    if (startDate !== undefined) updateData.startDate = start;
    if (endDate !== undefined) updateData.endDate = end;
    if (status !== undefined) updateData.status = status;

    const announcement = await db.announcement.update({
      where: { id },
      data: updateData,
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
      message: "Announcement updated successfully",
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update announcement",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete announcement
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if announcement exists
    const existing = await db.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Announcement not found" },
        { status: 404 }
      );
    }

    await db.announcement.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete announcement",
      },
      { status: 500 }
    );
  }
}
