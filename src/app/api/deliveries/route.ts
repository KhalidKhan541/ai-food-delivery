import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      config.pagination.maxPageSize,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20"))
    );
    const status = searchParams.get("status");

    const where: any = {};

    if (userRole === "DRIVER") {
      const driver = await prisma.driver.findUnique({
        where: { userId },
      });
      if (driver) {
        where.driverId = driver.id;
      }
    } else if (userRole === "RESTAURANT_OWNER") {
      const restaurant = await prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (restaurant) {
        where.order = { restaurantId: restaurant.id };
      }
    } else if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    if (status) {
      where.status = status;
    }

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              deliveryAddress: true,
              specialInstructions: true,
              createdAt: true,
            },
          },
          driver: {
            select: {
              id: true,
              rating: true,
              vehicleType: true,
              vehiclePlate: true,
              user: {
                select: {
                  name: true,
                  phone: true,
                  image: true,
                },
              },
            },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    return NextResponse.json({
      data: deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
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

export async function POST(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userRole = (session.user as any).role;

    if (!["ADMIN"].includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const delivery = await prisma.delivery.create({
      data: {
        orderId: body.orderId,
        driverId: body.driverId,
        pickupLat: body.pickupLat,
        pickupLng: body.pickupLng,
        dropoffLat: body.dropoffLat,
        dropoffLng: body.dropoffLng,
        distance: body.distance,
        estimatedTime: body.estimatedTime,
      },
    });

    if (body.driverId) {
      await prisma.driver.update({
        where: { id: body.driverId },
        data: { status: "ON_DELIVERY" },
      });
    }

    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
