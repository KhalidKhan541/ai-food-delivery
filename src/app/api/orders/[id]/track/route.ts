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

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: params.id },
          { orderNumber: params.id },
        ],
      },
      include: {
        restaurant: {
          select: {
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            phone: true,
          },
        },
        delivery: {
          include: {
            driver: {
              select: {
                id: true,
                currentLat: true,
                currentLng: true,
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
            locations: {
              orderBy: { timestamp: "desc" },
              take: 100,
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.userId !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const estimatedMinutes = order.estimatedDelivery
      ? Math.max(
          0,
          Math.round(
            (new Date(order.estimatedDelivery).getTime() - Date.now()) / 60000
          )
        )
      : null;

    const progress = (() => {
      const statusProgress: Record<string, number> = {
        PENDING: 5,
        CONFIRMED: 15,
        PREPARING: 35,
        READY: 50,
        OUT_FOR_DELIVERY: 75,
        DELIVERED: 100,
        CANCELLED: 0,
      };
      return statusProgress[order.status] ?? 0;
    })();

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: order.status.replace(/_/g, " "),
      progress,
      estimatedDelivery: order.estimatedDelivery,
      estimatedMinutesRemaining: estimatedMinutes,
      actualDelivery: order.actualDelivery,
      restaurant: {
        name: order.restaurant.name,
        address: order.restaurant.address,
        phone: order.restaurant.phone,
        coordinates: {
          lat: order.restaurant.latitude,
          lng: order.restaurant.longitude,
        },
      },
      delivery: order.delivery
        ? {
            status: order.delivery.status,
            driver: order.delivery.driver
              ? {
                  name: order.delivery.driver.user.name,
                  phone: order.delivery.driver.user.phone,
                  image: order.delivery.driver.user.image,
                  vehicleType: order.delivery.driver.vehicleType,
                  vehiclePlate: order.delivery.driver.vehiclePlate,
                  rating: order.delivery.driver.rating,
                  currentLocation: {
                    lat: order.delivery.driver.currentLat,
                    lng: order.delivery.driver.currentLng,
                  },
                }
              : null,
            pickupLocation: {
              lat: order.delivery.pickupLat,
              lng: order.delivery.pickupLng,
            },
            dropoffLocation: {
              lat: order.delivery.dropoffLat,
              lng: order.delivery.dropoffLng,
            },
            distance: order.delivery.distance,
            estimatedTime: order.delivery.estimatedTime,
            route: order.delivery.locations.map((loc) => ({
              lat: loc.latitude,
              lng: loc.longitude,
              timestamp: loc.timestamp,
              speed: loc.speed,
            })),
          }
        : null,
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
