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
            id: true,
            name: true,
            slug: true,
            logo: true,
            address: true,
            phone: true,
            latitude: true,
            longitude: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
              },
            },
          },
        },
        delivery: {
          include: {
            driver: {
              select: {
                id: true,
                rating: true,
                totalDeliveries: true,
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
              take: 50,
            },
          },
        },
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (userRole === "CUSTOMER" && order.userId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to view this order" },
        { status: 403 }
      );
    }

    if (userRole === "RESTAURANT_OWNER") {
      const restaurant = await prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (!restaurant || restaurant.id !== order.restaurantId) {
        return NextResponse.json(
          { error: "Not authorized to view this order" },
          { status: 403 }
        );
      }
    }

    if (userRole === "DRIVER") {
      const driver = await prisma.driver.findUnique({
        where: { userId },
      });
      if (!driver || order.delivery?.driverId !== driver.id) {
        return NextResponse.json(
          { error: "Not authorized to view this order" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(order);
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

    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (userRole === "RESTAURANT_OWNER") {
      const restaurant = await prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (!restaurant || restaurant.id !== order.restaurantId) {
        return NextResponse.json(
          { error: "Not authorized to update this order" },
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

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: body.status,
        paymentStatus: body.paymentStatus,
        estimatedDelivery: body.estimatedDelivery,
        specialInstructions: body.specialInstructions,
      },
    });

    return NextResponse.json(updatedOrder);
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
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Not authorized to cancel this order" },
        { status: 403 }
      );
    }

    const cancellableStatuses = ["PENDING", "CONFIRMED"];
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: "Order cannot be cancelled at this stage" },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      message: "Order cancelled",
      order: updatedOrder,
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
