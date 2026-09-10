import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "DRIVER" && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    if (userRole === "DRIVER") {
      const driver = await prisma.driver.findUnique({
        where: { userId },
      });
      if (!driver || delivery.driverId !== driver.id) {
        return NextResponse.json(
          { error: "Not authorized to update this delivery location" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { latitude, longitude, speed, heading } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    const [location] = await prisma.$transaction([
      prisma.deliveryLocation.create({
        data: {
          deliveryId: params.id,
          latitude,
          longitude,
          speed: speed ?? null,
          heading: heading ?? null,
        },
      }),
      prisma.delivery.update({
        where: { id: params.id },
        data: {
          currentLat: latitude,
          currentLng: longitude,
        },
      }),
    ]);

    return NextResponse.json({
      message: "Location updated",
      location: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        speed: location.speed,
        heading: location.heading,
      },
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    if (userRole === "CUSTOMER") {
      const order = await prisma.order.findUnique({
        where: { id: delivery.orderId },
        select: { userId: true },
      });
      if (order?.userId !== userId) {
        return NextResponse.json(
          { error: "Not authorized" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "100")));

    const locations = await prisma.deliveryLocation.findMany({
      where: { deliveryId: params.id },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json({
      deliveryId: params.id,
      currentLocation: {
        lat: delivery.currentLat,
        lng: delivery.currentLng,
      },
      route: locations.map((loc) => ({
        lat: loc.latitude,
        lng: loc.longitude,
        timestamp: loc.timestamp,
        speed: loc.speed,
        heading: loc.heading,
      })),
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
