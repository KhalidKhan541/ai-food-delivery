import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";

interface RouteParams {
  params: { id: string };
}

const STATUS_FLOW: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        restaurant: {
          select: { ownerId: true },
        },
        delivery: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const allowedTransitions = STATUS_FLOW[order.status] ?? [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${order.status} to ${newStatus}`,
          allowedTransitions,
        },
        { status: 400 }
      );
    }

    const isRestaurantOwner = userRole === "RESTAURANT_OWNER" && order.restaurant.ownerId === userId;
    const isDriver = userRole === "DRIVER";
    const isAdmin = userRole === "ADMIN";

    const allowedByRole = (() => {
      if (isAdmin) return true;
      if (isRestaurantOwner) {
        return ["CONFIRMED", "PREPARING", "READY"].includes(newStatus);
      }
      if (isDriver) {
        return ["OUT_FOR_DELIVERY", "DELIVERED"].includes(newStatus);
      }
      if (order.userId === userId) {
        return newStatus === "CANCELLED";
      }
      return false;
    })();

    if (!allowedByRole) {
      return NextResponse.json(
        { error: "Not authorized to update order to this status" },
        { status: 403 }
      );
    }

    const updateData: any = { status: newStatus };

    if (newStatus === "DELIVERED") {
      updateData.actualDelivery = new Date();

      if (order.delivery?.driverId) {
        await prisma.driver.update({
          where: { id: order.delivery.driverId },
          data: {
            totalDeliveries: { increment: 1 },
            status: "AVAILABLE",
          },
        });

        await prisma.delivery.update({
          where: { orderId: params.id },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
          },
        });
      }
    }

    if (newStatus === "OUT_FOR_DELIVERY") {
      await prisma.delivery.update({
        where: { orderId: params.id },
        data: { status: "IN_TRANSIT" },
      });
    }

    if (newStatus === "PREPARING") {
      await prisma.delivery.update({
        where: { orderId: params.id },
        data: { status: "PICKED_UP" },
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
    });

    if (newStatus === "CANCELLED" && order.paymentStatus === "COMPLETED") {
      await prisma.payment.update({
        where: { orderId: params.id },
        data: {
          status: "REFUNDED",
          refundAmount: order.total,
          refundReason: "Order cancelled",
        },
      });

      await prisma.order.update({
        where: { id: params.id },
        data: { paymentStatus: "REFUNDED" },
      });
    }

    return NextResponse.json({
      message: `Order status updated to ${newStatus}`,
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
