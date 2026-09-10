import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            createdAt: true,
          },
        },
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                total: true,
              },
            },
          },
        },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(driver);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    if (driver.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Not authorized to update this driver" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updatedDriver = await prisma.driver.update({
      where: { id: params.id },
      data: {
        licenseNumber: body.licenseNumber,
        vehicleType: body.vehicleType,
        vehiclePlate: body.vehiclePlate,
        status: body.status,
        currentLat: body.currentLat,
        currentLng: body.currentLng,
        isAvailable: body.isAvailable,
        availabilityStart: body.availabilityStart,
        availabilityEnd: body.availabilityEnd,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(updatedDriver);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userRole = (session.user as any).role;

    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: {
        deliveries: {
          where: {
            status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] },
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    if (driver.deliveries.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete driver with active deliveries" },
        { status: 400 }
      );
    }

    await prisma.driver.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Driver deleted" });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
