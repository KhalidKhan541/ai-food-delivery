import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            deliveryAddress: true,
            specialInstructions: true,
            restaurant: {
              select: {
                name: true,
                address: true,
                phone: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        driver: {
          select: {
            id: true,
            rating: true,
            vehicleType: true,
            vehiclePlate: true,
            currentLat: true,
            currentLng: true,
            user: {
              select: {
                name: true,
                phone: true,
                image: true,
              },
            },
          },
        },
        locations: {
          orderBy: { timestamp: "desc" },
          take: 100,
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    if (userRole === "CUSTOMER") {
      if (delivery.order && delivery.order.status !== undefined) {
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
    }

    if (userRole === "DRIVER") {
      const driver = await prisma.driver.findUnique({
        where: { userId },
      });
      if (!driver || delivery.driverId !== driver.id) {
        return NextResponse.json(
          { error: "Not authorized" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(delivery);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    if (userRole === "DRIVER") {
      const driver = await prisma.driver.findUnique({
        where: { userId },
      });
      if (!driver || delivery.driverId !== driver.id) {
        return NextResponse.json(
          { error: "Not authorized" },
          { status: 403 }
        );
      }
    } else if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updatedDelivery = await prisma.delivery.update({
      where: { id: params.id },
      data: {
        status: body.status,
        driverId: body.driverId,
        currentLat: body.currentLat,
        currentLng: body.currentLng,
        actualTime: body.actualTime,
        pickedUpAt: body.pickedUpAt,
        deliveredAt: body.deliveredAt,
      },
    });

    return NextResponse.json(updatedDelivery);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
