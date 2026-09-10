import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { config } from "@/lib/config";
import { withTransaction } from "@/lib/db";

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
    const sortBy = searchParams.get("sort") ?? "newest";

    const where: any = {};

    if (userRole === "CUSTOMER") {
      where.userId = userId;
    } else if (userRole === "RESTAURANT_OWNER") {
      const restaurant = await prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (restaurant) {
        where.restaurantId = restaurant.id;
      }
    } else if (userRole === "DRIVER") {
      const driver = await prisma.driver.findUnique({
        where: { userId },
      });
      if (driver) {
        where.driverId = driver.id;
      }
    }

    if (status) {
      where.status = status;
    }

    const orderBy: any = (() => {
      switch (sortBy) {
        case "oldest":
          return { createdAt: "asc" };
        case "status":
          return { status: "asc" };
        case "total_desc":
          return { total: "desc" };
        default:
          return { createdAt: "desc" };
      }
    })();

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
          items: {
            include: {
              menuItem: {
                select: {
                  name: true,
                  image: true,
                },
              },
            },
          },
          delivery: {
            select: {
              status: true,
              driver: {
                select: {
                  id: true,
                  user: {
                    select: {
                      name: true,
                      image: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
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
    const userId = (session.user as any).id;

    const customer = await prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const cart = await prisma.cart.findFirst({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: cart.restaurantId },
    });

    if (!restaurant || !restaurant.isActive) {
      return NextResponse.json(
        { error: "Restaurant is unavailable" },
        { status: 400 }
      );
    }

    const subtotal = cart.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    let deliveryFee = cart.deliveryFee;
    if (subtotal >= (config.delivery.freeDeliveryThreshold ?? 25)) {
      deliveryFee = 0;
    }

    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + deliveryFee + tax).toFixed(2));

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const order = await withTransaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          restaurantId: cart.restaurantId,
          subtotal,
          deliveryFee,
          tax,
          tip: body.tip ?? 0,
          discount: body.discount ?? 0,
          total: total + (body.tip ?? 0) - (body.discount ?? 0),
          paymentMethod: body.paymentMethod ?? "CREDIT_CARD",
          deliveryAddress: body.deliveryAddress,
          specialInstructions: body.specialInstructions,
          promoCode: body.promoCode,
          estimatedDelivery: new Date(
            Date.now() + (config.delivery.estimatedDeliveryTimeMin ?? 30) * 60 * 1000
          ),
          items: {
            create: cart.items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              options: item.options,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: true,
          restaurant: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      });

      await tx.delivery.create({
        data: {
          orderId: newOrder.id,
          pickupLat: restaurant.latitude,
          pickupLng: restaurant.longitude,
          dropoffLat: (body.deliveryAddress as any)?.latitude,
          dropoffLng: (body.deliveryAddress as any)?.longitude,
        },
      });

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.delete({
        where: { id: cart.id },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: total },
        },
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
