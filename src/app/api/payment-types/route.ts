import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - List all payment types (optionally filter by status)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("all") === "true";

    const paymentTypes = await db.paymentType.findMany({
      where: includeInactive ? {} : { status: "ACTIVE" },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: paymentTypes,
    });
  } catch (error) {
    console.error("Error fetching payment types:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payment types",
      },
      { status: 500 }
    );
  }
}

// POST - Create new payment type
export async function POST(request: Request) {
  try {
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

    // Validation
    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: "Name and type are required" },
        { status: 400 }
      );
    }

    if (!["CC", "PAYLATER"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type must be CC or PAYLATER" },
        { status: 400 }
      );
    }

    // Validate fee percentages (0-100)
    const onlinePercent = Number(onlineFeePercent) || 0;
    const codPercent = Number(codFeePercent) || 0;

    if (onlinePercent < 0 || onlinePercent > 100) {
      return NextResponse.json(
        { success: false, error: "Online fee percent must be between 0-100" },
        { status: 400 }
      );
    }

    if (codPercent < 0 || codPercent > 100) {
      return NextResponse.json(
        { success: false, error: "COD fee percent must be between 0-100" },
        { status: 400 }
      );
    }

    // Validate fixed fees (positive number)
    const onlineFixed = Number(onlineFeeFixed) || 0;
    const codFixed = Number(codFeeFixed) || 0;

    if (onlineFixed < 0) {
      return NextResponse.json(
        { success: false, error: "Online fixed fee must be a positive number" },
        { status: 400 }
      );
    }

    if (codFixed < 0) {
      return NextResponse.json(
        { success: false, error: "COD fixed fee must be a positive number" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await db.paymentType.findFirst({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Payment type with this name already exists" },
        { status: 400 }
      );
    }

    const paymentType = await db.paymentType.create({
      data: {
        name,
        type,
        threshold: Number(threshold) || 1000000,
        onlineFeePercent: onlinePercent / 100, // Store as decimal
        onlineFeeFixed: onlineFixed,
        codFeePercent: codPercent / 100, // Store as decimal
        codFeeFixed: codFixed,
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      data: paymentType,
      message: "Payment type created successfully",
    });
  } catch (error) {
    console.error("Error creating payment type:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create payment type",
      },
      { status: 500 }
    );
  }
}
