import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH - Update payment type
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      type,
      threshold,
      onlineFeePercent,
      onlineFeeFixed,
      codFeePercent,
      codFeeFixed,
      status,
    } = body;

    // Check if payment type exists
    const existing = await db.paymentType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Payment type not found" },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type && !["CC", "PAYLATER"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type must be CC or PAYLATER" },
        { status: 400 }
      );
    }

    // Validate fee percentages (0-100)
    if (onlineFeePercent !== undefined) {
      const percent = Number(onlineFeePercent);
      if (percent < 0 || percent > 100) {
        return NextResponse.json(
          { success: false, error: "Online fee percent must be between 0-100" },
          { status: 400 }
        );
      }
    }

    if (codFeePercent !== undefined) {
      const percent = Number(codFeePercent);
      if (percent < 0 || percent > 100) {
        return NextResponse.json(
          { success: false, error: "COD fee percent must be between 0-100" },
          { status: 400 }
        );
      }
    }

    // Validate fixed fees (positive number)
    if (onlineFeeFixed !== undefined && Number(onlineFeeFixed) < 0) {
      return NextResponse.json(
        { success: false, error: "Online fixed fee must be a positive number" },
        { status: 400 }
      );
    }

    if (codFeeFixed !== undefined && Number(codFeeFixed) < 0) {
      return NextResponse.json(
        { success: false, error: "COD fixed fee must be a positive number" },
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

    // Check for duplicate name if changing name
    if (name && name !== existing.name) {
      const duplicate = await db.paymentType.findFirst({
        where: { name, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Payment type with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (threshold !== undefined) updateData.threshold = Number(threshold);
    if (onlineFeePercent !== undefined) updateData.onlineFeePercent = Number(onlineFeePercent) / 100;
    if (onlineFeeFixed !== undefined) updateData.onlineFeeFixed = Number(onlineFeeFixed);
    if (codFeePercent !== undefined) updateData.codFeePercent = Number(codFeePercent) / 100;
    if (codFeeFixed !== undefined) updateData.codFeeFixed = Number(codFeeFixed);
    if (status !== undefined) updateData.status = status;

    const paymentType = await db.paymentType.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: paymentType,
      message: "Payment type updated successfully",
    });
  } catch (error) {
    console.error("Error updating payment type:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update payment type",
      },
      { status: 500 }
    );
  }
}
