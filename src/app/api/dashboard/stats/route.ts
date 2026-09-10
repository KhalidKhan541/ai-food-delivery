import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "7d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const now = new Date();
    let dateFilter: Date;

    switch (period) {
      case "24h":
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "custom":
        dateFilter = startDate ? new Date(startDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const where: any = {
      createdAt: { gte: dateFilter },
    };

    if (userRole === "RESTAURANT_OWNER") {
      const restaurant = await prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (restaurant) {
        where.restaurantId = restaurant.id;
      }
    }

    const [
      totalOrders,
      totalRevenue,
      ordersByStatus,
      recentOrders,
      topRestaurants,
      ordersByDay,
      averageOrderValue,
      activeDrivers,
      activeRestaurants,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: "COMPLETED" },
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
          restaurant: { select: { name: true } },
        },
      }),
      userRole !== "RESTAURANT_OWNER"
        ? prisma.restaurant.findMany({
            where: { isActive: true },
            orderBy: { rating: "desc" },
            take: 5,
            select: {
              id: true,
              name: true,
              rating: true,
              reviewCount: true,
              _count: { select: { orders: true } },
            },
          })
        : [],
      prisma.order.groupBy({
        by: ["createdAt"],
        where,
        _count: { id: true },
        _sum: { total: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: "COMPLETED" },
        _avg: { total: true },
      }),
      prisma.driver.count({
        where: { isAvailable: true, status: "AVAILABLE" },
      }),
      prisma.restaurant.count({
        where: { isActive: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    ordersByStatus.forEach((s) => {
      statusCounts[s.status] = s._count.status;
    });

    const revenue = totalRevenue._sum.total ?? 0;
    const avgOrder = averageOrderValue._avg.total ?? 0;

    return NextResponse.json({
      period,
      summary: {
        totalOrders,
        totalRevenue: parseFloat(revenue.toFixed(2)),
        averageOrderValue: parseFloat(avgOrder.toFixed(2)),
        activeDrivers,
        activeRestaurants,
      },
      ordersByStatus: statusCounts,
      recentOrders,
      topRestaurants,
      ordersByDay: ordersByDay.map((d) => ({
        date: d.createdAt,
        orders: d._count.id,
        revenue: d._sum.total ?? 0,
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
