import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH - Update marketplace
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, feePercent, logo, status } = body;

    // Check if marketplace exists
    const existing = await db.marketplace.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Marketplace not found" },
        { status: 404 }
      );
    }

    // Validate fee percentage (0-100)
    if (feePercent !== undefined) {
      const fee = Number(feePercent);
      if (fee < 0 || fee > 100) {
        return NextResponse.json(
          { success: false, error: "Fee percent must be between 0-100" },
          { status: 400 }
        );
      }
    }

    // Validate status
    if (status && !["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Status must be ACTIVE or INACTIVE" },
        { status: 400 }
      );
    }

    // Check for duplicate name if changing name
    if (name && name !== existing.name) {
      const duplicate = await db.marketplace.findFirst({
        where: { name, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Marketplace with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (feePercent !== undefined) updateData.feePercent = Number(feePercent) / 100;
    if (logo !== undefined) updateData.logo = logo || null;
    if (status !== undefined) updateData.status = status;

    const marketplace = await db.marketplace.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: marketplace,
      message: "Marketplace updated successfully",
    });
  } catch (error) {
    console.error("Error updating marketplace:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update marketplace",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete marketplace (soft delete by setting status to INACTIVE)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if marketplace exists
    const existing = await db.marketplace.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Marketplace not found" },
        { status: 404 }
      );
    }

    // Check if marketplace has transactions
    const transactionsCount = await db.transaction.count({
      where: { marketplaceId: id },
    });

    if (transactionsCount > 0) {
      // Soft delete - set status to INACTIVE
      await db.marketplace.update({
        where: { id },
        data: { status: "INACTIVE" },
      });

      return NextResponse.json({
        success: true,
        message: "Marketplace deactivated (has associated transactions)",
      });
    }

    // Hard delete if no transactions
    await db.marketplace.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Marketplace deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting marketplace:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete marketplace",
      },
      { status: 500 }
    );
  }
}
