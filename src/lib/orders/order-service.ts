import { prisma } from "@/lib/prisma";
import { Prisma, Order, OrderStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  userId: z.string().uuid(),
  cartId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  deliveryAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().min(1),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    instructions: z.string().max(500).optional(),
  }),
  paymentMethodId: z.string().min(1),
  tip: z.number().min(0).max(100).default(0),
  scheduledTime: z.string().datetime().optional(),
  promoCode: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  status: z.enum([
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
  estimatedTime: z.number().optional(),
  cancellationReason: z.string().max(500).optional(),
});

export const orderFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  restaurantId: z.string().uuid().optional(),
  status: z.array(z.nativeEnum(OrderStatus)).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  sortBy: z.enum(["newest", "oldest", "amount_high", "amount_low"]).default("newest"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderFilterInput = z.infer<typeof orderFilterSchema>;

export type OrderWithRelations = Order & {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    logo: string | null;
    address: string;
    latitude: number;
    longitude: number;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specialInstructions: string | null;
    variantSelections: Prisma.JsonValue;
    addOns: Prisma.JsonValue;
  }>;
  delivery: {
    id: string;
    status: string;
    driverName: string | null;
    driverPhone: string | null;
    driverLocation: Prisma.JsonValue | null;
    estimatedArrival: Date | null;
    actualArrival: Date | null;
  } | null;
  payment: {
    id: string;
    status: string;
    method: string;
    amount: number;
  } | null;
};

export type OrderHistoryEntry = {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  estimatedTime?: number;
};

export type OrderStats = {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  favoriteRestaurant: { id: string; name: string; orderCount: number } | null;
  recentOrders: number;
  cancelledOrders: number;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class OrderService {
  /**
   * Create an order from the user's cart.
   * This is a critical path — uses a transaction to ensure consistency.
   */
  static async create(input: CreateOrderInput): Promise<OrderWithRelations> {
    return prisma.$transaction(async (tx) => {
      // 1. Validate cart
      const cart = await tx.cart.findUnique({
        where: { id: input.cartId },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  discountPrice: true,
                  isAvailable: true,
                  restaurantId: true,
                },
              },
            },
          },
          restaurant: {
            select: {
              id: true,
              name: true,
              isOpen: true,
              minOrderAmount: true,
              deliveryFee: true,
            },
          },
        },
      });

      if (!cart) throw new Error("Cart not found");
      if (cart.userId !== input.userId) throw new Error("Unauthorized");
      if (!cart.restaurant) throw new Error("No restaurant in cart");
      if (cart.restaurant.id !== input.restaurantId) throw new Error("Cart restaurant mismatch");
      if (!cart.restaurant.isOpen) throw new Error("Restaurant is currently closed");
      if (cart.items.length === 0) throw new Error("Cart is empty");

      // 2. Validate all items
      for (const item of cart.items) {
        if (!item.menuItem.isAvailable) {
          throw new Error(`"${item.menuItem.name}" is no longer available`);
        }
      }

      // 3. Validate minimum order
      const subtotal = cart.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
      if (cart.restaurant.minOrderAmount > 0 && subtotal < cart.restaurant.minOrderAmount) {
        throw new Error(
          `Minimum order is $${cart.restaurant.minOrderAmount.toFixed(2)}`
        );
      }

      // 4. Calculate totals
      const deliveryFee = Number(cart.restaurant.deliveryFee);
      const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const promoDiscount = Number(cart.promoDiscount ?? 0);
      const totalAmount =
        Math.round((subtotal + deliveryFee + serviceFee + tax - promoDiscount + input.tip) * 100) /
        100;

      // 5. Create payment intent (Stripe)
      const payment = await tx.payment.create({
        data: {
          userId: input.userId,
          amount: totalAmount,
          currency: "usd",
          method: "stripe",
          status: "PENDING" as PaymentStatus,
          stripePaymentIntentId: `pi_placeholder_${Date.now()}`,
        },
      });

      // 6. Create order
      const order = await tx.order.create({
        data: {
          userId: input.userId,
          restaurantId: input.restaurantId,
          status: "PENDING" as OrderStatus,
          subtotal,
          deliveryFee,
          serviceFee,
          tax,
          tip: input.tip,
          promoCode: cart.promoCode,
          promoDiscount,
          totalAmount,
          deliveryStreet: input.deliveryAddress.street,
          deliveryCity: input.deliveryAddress.city,
          deliveryState: input.deliveryAddress.state,
          deliveryZipCode: input.deliveryAddress.zipCode,
          deliveryCountry: input.deliveryAddress.country,
          deliveryLatitude: input.deliveryAddress.latitude,
          deliveryLongitude: input.deliveryAddress.longitude,
          deliveryInstructions: input.deliveryAddress.instructions,
          scheduledTime: input.scheduledTime ? new Date(input.scheduledTime) : null,
          paymentId: payment.id,
          items: {
            create: cart.items.map((item) => ({
              menuItemId: item.menuItemId,
              name: item.menuItem.name,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
              specialInstructions: item.specialInstructions,
              variantSelections: item.variantSelections,
              addOns: item.addOns,
            })),
          },
        },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              phone: true,
              logo: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          items: true,
          delivery: true,
          payment: true,
        },
      });

      // 7. Create order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PENDING" as OrderStatus,
          note: "Order placed successfully",
        },
      });

      // 8. Clear the cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { restaurantId: null, promoCode: null, promoDiscount: 0 },
      });

      // 9. Update restaurant total orders
      await tx.restaurant.update({
        where: { id: input.restaurantId },
        data: { totalOrders: { increment: 1 } },
      });

      return order;
    });
  }

  /**
   * Get an order by ID with all details.
   */
  static async getById(id: string, userId?: string): Promise<OrderWithRelations | null> {
    const where: Prisma.OrderWhereInput = { id };
    if (userId) {
      where.userId = userId;
    }

    return prisma.order.findFirst({
      where,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            logo: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        items: true,
        delivery: true,
        payment: true,
      },
    });
  }

  /**
   * Get order by order number (human-readable).
   */
  static async getByOrderNumber(orderNumber: string): Promise<OrderWithRelations | null> {
    return prisma.order.findFirst({
      where: { orderNumber },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            logo: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        items: true,
        delivery: true,
        payment: true,
      },
    });
  }

  /**
   * Update order status. Only restaurant owners can update.
   */
  static async updateStatus(input: UpdateOrderStatusInput): Promise<OrderWithRelations> {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { restaurant: { select: { ownerId: true } } },
    });
    if (!order) throw new Error("Order not found");
    if (order.restaurant.ownerId !== input.restaurantId) {
      throw new Error("Unauthorized: not the restaurant owner");
    }

    const validTransitions: Record<string, string[]> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
      READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "CANCELLED"],
      OUT_FOR_DELIVERY: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status]?.includes(input.status)) {
      throw new Error(`Cannot transition from ${order.status} to ${input.status}`);
    }

    const updateData: Prisma.OrderUpdateInput = {
      status: input.status as OrderStatus,
    };

    if (input.status === "DELIVERED") {
      updateData.deliveredAt = new Date();
    }
    if (input.status === "CANCELLED") {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = input.cancellationReason;
    }
    if (input.estimatedTime) {
      updateData.estimatedDeliveryTime = input.estimatedTime;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: input.orderId },
        data: updateData,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              phone: true,
              logo: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          items: true,
          delivery: true,
          payment: true,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: input.orderId,
          status: input.status as OrderStatus,
          note: input.cancellationReason,
          estimatedTime: input.estimatedTime,
        },
      });

      if (input.status === "DELIVERED") {
        await tx.payment.update({
          where: { id: order.paymentId },
          data: { status: "COMPLETED" as PaymentStatus },
        });
      }

      if (input.status === "CANCELLED" && order.paymentId) {
        await tx.payment.update({
          where: { id: order.paymentId },
          data: { status: "REFUNDED" as PaymentStatus },
        });
      }

      return updated;
    });

    return updatedOrder;
  }

  /**
   * Cancel an order (customer action).
   */
  static async cancelByCustomer(
    orderId: string,
    userId: string,
    reason?: string
  ): Promise<OrderWithRelations> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized");

    const cancellableStatuses: OrderStatus[] = ["PENDING", "CONFIRMED"];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(`Cannot cancel order in "${order.status}" status`);
    }

    return this.updateStatus({
      orderId,
      restaurantId: order.restaurantId,
      status: "CANCELLED",
      cancellationReason: reason ?? "Cancelled by customer",
    });
  }

  /**
   * Get order status history.
   */
  static async getStatusHistory(orderId: string): Promise<OrderHistoryEntry[]> {
    return prisma.orderStatusHistory.findMany({
      where: { orderId },
      select: {
        status: true,
        createdAt: true,
        note: true,
        estimatedTime: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * List orders with filters and pagination.
   */
  static async list(filters: OrderFilterInput): Promise<{
    orders: OrderWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (filters.page - 1) * filters.limit;

    const where: Prisma.OrderWhereInput = {
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.restaurantId && { restaurantId: filters.restaurantId }),
      ...(filters.status && { status: { in: filters.status } }),
      ...(filters.paymentStatus && { payment: { status: filters.paymentStatus } }),
      ...(filters.dateFrom && {
        createdAt: { gte: new Date(filters.dateFrom) },
      }),
      ...(filters.dateTo && {
        createdAt: { lte: new Date(filters.dateTo) },
      }),
      ...(filters.minAmount && {
        totalAmount: { gte: filters.minAmount },
      }),
      ...(filters.maxAmount && {
        totalAmount: { lte: filters.maxAmount },
      }),
    };

    const orderBy: Prisma.OrderOrderByWithRelationInput =
      filters.sortBy === "newest"
        ? { createdAt: "desc" }
        : filters.sortBy === "oldest"
          ? { createdAt: "asc" }
          : filters.sortBy === "amount_high"
            ? { totalAmount: "desc" }
            : { totalAmount: "asc" };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              phone: true,
              logo: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          items: true,
          delivery: true,
          payment: true,
        },
        orderBy,
        skip,
        take: filters.limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  /**
   * Get order statistics for a user.
   */
  static async getUserStats(userId: string): Promise<OrderStats> {
    const [totalOrders, orderAggregates, recentCount, cancelledCount, favorites] =
      await Promise.all([
        prisma.order.count({ where: { userId } }),
        prisma.order.aggregate({
          where: { userId, status: "DELIVERED" },
          _sum: { totalAmount: true },
          _avg: { totalAmount: true },
        }),
        prisma.order.count({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.order.count({
          where: { userId, status: "CANCELLED" },
        }),
        prisma.order.groupBy({
          by: ["restaurantId"],
          where: { userId },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 1,
        }),
      ]);

    let favoriteRestaurant: OrderStats["favoriteRestaurant"] = null;
    if (favorites.length > 0) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: favorites[0].restaurantId },
        select: { id: true, name: true },
      });
      if (restaurant) {
        favoriteRestaurant = {
          ...restaurant,
          orderCount: favorites[0]._count.id,
        };
      }
    }

    return {
      totalOrders,
      totalSpent: Number(orderAggregates._sum.totalAmount ?? 0),
      averageOrderValue: Number(orderAggregates._avg.totalAmount ?? 0),
      favoriteRestaurant,
      recentOrders: recentCount,
      cancelledOrders: cancelledCount,
    };
  }

  /**
   * Get active (in-progress) orders for a user.
   */
  static async getActiveOrders(userId: string): Promise<OrderWithRelations[]> {
    return prisma.order.findMany({
      where: {
        userId,
        status: {
          in: ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"],
        },
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            logo: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        items: true,
        delivery: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get restaurant orders (owner dashboard).
   */
  static async getRestaurantOrders(
    restaurantId: string,
    options?: { status?: OrderStatus[]; page?: number; limit?: number }
  ): Promise<{ orders: OrderWithRelations[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      restaurantId,
      ...(options?.status && { status: { in: options.status } }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              phone: true,
              logo: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          items: true,
          delivery: true,
          payment: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Reorder — create a new cart from a previous order's items.
   */
  static async reorder(orderId: string, userId: string): Promise<string> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized");

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    await prisma.cartItem.createMany({
      data: order.items.map((item) => ({
        cartId: cart.id,
        menuItemId: item.menuItemId,
        restaurantId: order.restaurantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        specialInstructions: item.specialInstructions,
        variantSelections: item.variantSelections,
        addOns: item.addOns,
      })),
    });

    await prisma.cart.update({
      where: { id: cart.id },
      data: { restaurantId: order.restaurantId },
    });

    return cart.id;
  }
}
