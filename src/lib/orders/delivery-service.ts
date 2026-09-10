import { prisma } from "@/lib/prisma";
import { Prisma, Delivery, DeliveryStatus } from "@prisma/client";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const createDeliverySchema = z.object({
  orderId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  driverId: z.string().uuid().optional(),
});

export const updateDeliveryStatusSchema = z.object({
  deliveryId: z.string().uuid(),
  driverId: z.string().uuid(),
  status: z.enum([
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "ARRIVING",
    "DELIVERED",
    "FAILED",
  ]),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  failureReason: z.string().max(500).optional(),
});

export const updateDriverLocationSchema = z.object({
  driverId: z.string().uuid(),
  deliveryId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
});

export const driverAvailabilitySchema = z.object({
  driverId: z.string().uuid(),
  isAvailable: z.boolean(),
  currentLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  maxDeliveries: z.number().min(1).max(10).default(3),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
export type UpdateDriverLocationInput = z.infer<typeof updateDriverLocationSchema>;

export type DeliveryWithRelations = Delivery & {
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    deliveryStreet: string;
    deliveryCity: string;
    deliveryState: string;
    deliveryZipCode: string;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    deliveryInstructions: string | null;
    items: Array<{
      name: string;
      quantity: number;
    }>;
    restaurant: {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      phone: string;
    };
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string | null;
    vehiclePlate: string | null;
    rating: number;
  } | null;
};

export type DriverProfile = {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalDeliveries: number;
  isAvailable: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  activeDeliveries: number;
  maxDeliveries: number;
  earnings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
};

export type ETAResult = {
  estimatedMinutes: number;
  distanceKm: number;
  trafficFactor: number;
  route: Array<{ latitude: number; longitude: number }>;
};

export type DeliveryTrackingInfo = {
  deliveryId: string;
  status: DeliveryStatus;
  driverName: string | null;
  driverPhone: string | null;
  driverLocation: { latitude: number; longitude: number } | null;
  estimatedArrival: Date | null;
  lastUpdated: Date;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    location: { latitude: number; longitude: number } | null;
  }>;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class DeliveryService {
  /**
   * Create a delivery record for an order.
   * Attempts auto-assignment to the nearest available driver.
   */
  static async create(input: CreateDeliveryInput): Promise<DeliveryWithRelations> {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            phone: true,
          },
        },
      },
    });
    if (!order) throw new Error("Order not found");
    if (order.restaurantId !== input.restaurantId) throw new Error("Order restaurant mismatch");

    const existingDelivery = await prisma.delivery.findFirst({
      where: { orderId: input.orderId },
    });
    if (existingDelivery) throw new Error("Delivery already exists for this order");

    let driverId = input.driverId;
    if (!driverId) {
      driverId = await this.findNearestDriver(
        order.restaurant.latitude,
        order.restaurant.longitude
      );
    }

    const delivery = await prisma.delivery.create({
      data: {
        orderId: input.orderId,
        driverId: driverId ?? undefined,
        status: driverId ? ("ASSIGNED" as DeliveryStatus) : ("PENDING" as DeliveryStatus),
        pickupLatitude: order.restaurant.latitude,
        pickupLongitude: order.restaurant.longitude,
        dropoffLatitude: order.deliveryLatitude ?? 0,
        dropoffLongitude: order.deliveryLongitude ?? 0,
      },
      include: {
        order: {
          include: {
            items: { select: { name: true, quantity: true } },
            restaurant: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
                phone: true,
              },
            },
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehiclePlate: true,
            rating: true,
          },
        },
      },
    });

    if (driverId) {
      await prisma.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          status: "ASSIGNED",
          driverId,
        },
      });
    }

    return delivery as DeliveryWithRelations;
  }

  /**
   * Assign a driver to a delivery.
   */
  static async assignDriver(
    deliveryId: string,
    driverId: string
  ): Promise<DeliveryWithRelations> {
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new Error("Delivery not found");
    if (delivery.status !== "PENDING") {
      throw new Error("Can only assign driver to pending deliveries");
    }

    const activeCount = await prisma.delivery.count({
      where: {
        driverId,
        status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVING"] },
      },
    });

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: driverId },
    });
    const maxDeliveries = driverProfile?.maxDeliveries ?? 3;

    if (activeCount >= maxDeliveries) {
      throw new Error("Driver has reached maximum concurrent deliveries");
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: { driverId, status: "ASSIGNED" as DeliveryStatus },
      include: {
        order: {
          include: {
            items: { select: { name: true, quantity: true } },
            restaurant: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
                phone: true,
              },
            },
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehiclePlate: true,
            rating: true,
          },
        },
      },
    });

    await prisma.deliveryStatusHistory.create({
      data: {
        deliveryId,
        status: "ASSIGNED",
        driverId,
      },
    });

    return updated as DeliveryWithRelations;
  }

  /**
   * Update delivery status with location tracking.
   */
  static async updateStatus(
    input: UpdateDeliveryStatusInput
  ): Promise<DeliveryWithRelations> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: input.deliveryId },
      include: { order: { select: { restaurantId: true } } },
    });
    if (!delivery) throw new Error("Delivery not found");
    if (delivery.driverId !== input.driverId) throw new Error("Unauthorized: not assigned driver");

    const validTransitions: Record<string, string[]> = {
      ASSIGNED: ["PICKED_UP", "FAILED"],
      PICKED_UP: ["IN_TRANSIT", "FAILED"],
      IN_TRANSIT: ["ARRIVING", "FAILED"],
      ARRIVING: ["DELIVERED", "FAILED"],
      DELIVERED: [],
      FAILED: [],
    };

    if (!validTransitions[delivery.status]?.includes(input.status)) {
      throw new Error(`Cannot transition from ${delivery.status} to ${input.status}`);
    }

    const updateData: Prisma.DeliveryUpdateInput = {
      status: input.status as DeliveryStatus,
    };

    if (input.location) {
      updateData.currentLatitude = input.location.latitude;
      updateData.currentLongitude = input.location.longitude;
    }

    if (input.status === "PICKED_UP") {
      updateData.pickedUpAt = new Date();
    }
    if (input.status === "DELIVERED") {
      updateData.deliveredAt = new Date();
    }
    if (input.status === "FAILED") {
      updateData.failureReason = input.failureReason;
    }

    const updated = await prisma.delivery.update({
      where: { id: input.deliveryId },
      data: updateData,
      include: {
        order: {
          include: {
            items: { select: { name: true, quantity: true } },
            restaurant: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
                phone: true,
              },
            },
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehiclePlate: true,
            rating: true,
          },
        },
      },
    });

    await prisma.deliveryStatusHistory.create({
      data: {
        deliveryId: input.deliveryId,
        status: input.status,
        driverId: input.driverId,
        latitude: input.location?.latitude,
        longitude: input.location?.longitude,
      },
    });

    if (input.status === "DELIVERED") {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
        },
      });
    }

    return updated as DeliveryWithRelations;
  }

  /**
   * Update driver's real-time location.
   */
  static async updateDriverLocation(input: UpdateDriverLocationInput): Promise<void> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: input.deliveryId },
    });
    if (!delivery) throw new Error("Delivery not found");
    if (delivery.driverId !== input.driverId) throw new Error("Unauthorized");

    await prisma.delivery.update({
      where: { id: input.deliveryId },
      data: {
        currentLatitude: input.latitude,
        currentLongitude: input.longitude,
      },
    });

    await prisma.driverLocation.create({
      data: {
        driverId: input.driverId,
        deliveryId: input.deliveryId,
        latitude: input.latitude,
        longitude: input.longitude,
        heading: input.heading,
        speed: input.speed,
      },
    });
  }

  /**
   * Get real-time tracking information for a customer.
   */
  static async getTrackingInfo(deliveryId: string): Promise<DeliveryTrackingInfo | null> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        driver: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });
    if (!delivery) return null;

    const history = await prisma.deliveryStatusHistory.findMany({
      where: { deliveryId },
      orderBy: { createdAt: "asc" },
    });

    return {
      deliveryId: delivery.id,
      status: delivery.status,
      driverName: delivery.driver?.name ?? null,
      driverPhone: delivery.driver?.phone ?? null,
      driverLocation:
        delivery.currentLatitude && delivery.currentLongitude
          ? { latitude: delivery.currentLatitude, longitude: delivery.currentLongitude }
          : null,
      estimatedArrival: delivery.estimatedArrival,
      lastUpdated: new Date(),
      statusHistory: history.map((h) => ({
        status: h.status,
        timestamp: h.createdAt,
        location:
          h.latitude && h.longitude
            ? { latitude: h.latitude, longitude: h.longitude }
            : null,
      })),
    };
  }

  /**
   * Get driver profile with earnings and stats.
   */
  static async getDriverProfile(driverId: string): Promise<DriverProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: driverId },
      select: { id: true, name: true, phone: true },
    });
    if (!user) return null;

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: driverId },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeDeliveries, todayEarnings, weekEarnings, monthEarnings, totalDeliveries] =
      await Promise.all([
        prisma.delivery.count({
          where: {
            driverId,
            status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVING"] },
          },
        }),
        prisma.deliveryEarnings.aggregate({
          where: {
            driverId,
            createdAt: { gte: todayStart },
          },
          _sum: { amount: true },
        }),
        prisma.deliveryEarnings.aggregate({
          where: {
            driverId,
            createdAt: { gte: weekStart },
          },
          _sum: { amount: true },
        }),
        prisma.deliveryEarnings.aggregate({
          where: {
            driverId,
            createdAt: { gte: monthStart },
          },
          _sum: { amount: true },
        }),
        prisma.delivery.count({
          where: { driverId, status: "DELIVERED" },
        }),
      ]);

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      rating: profile?.rating ?? 5.0,
      totalDeliveries,
      isAvailable: profile?.isAvailable ?? false,
      currentLocation:
        profile?.currentLatitude && profile?.currentLongitude
          ? { latitude: profile.currentLatitude, longitude: profile.currentLongitude }
          : null,
      activeDeliveries,
      maxDeliveries: profile?.maxDeliveries ?? 3,
      earnings: {
        today: Number(todayEarnings._sum.amount ?? 0),
        thisWeek: Number(weekEarnings._sum.amount ?? 0),
        thisMonth: Number(monthEarnings._sum.amount ?? 0),
      },
    };
  }

  /**
   * Update driver availability status.
   */
  static async updateDriverAvailability(input: {
    driverId: string;
    isAvailable: boolean;
    currentLocation?: { latitude: number; longitude: number };
    maxDeliveries?: number;
  }): Promise<void> {
    await prisma.driverProfile.upsert({
      where: { userId: input.driverId },
      create: {
        userId: input.driverId,
        isAvailable: input.isAvailable,
        currentLatitude: input.currentLocation?.latitude,
        currentLongitude: input.currentLocation?.longitude,
        maxDeliveries: input.maxDeliveries ?? 3,
      },
      update: {
        isAvailable: input.isAvailable,
        ...(input.currentLocation && {
          currentLatitude: input.currentLocation.latitude,
          currentLongitude: input.currentLocation.longitude,
        }),
        ...(input.maxDeliveries && { maxDeliveries: input.maxDeliveries }),
      },
    });
  }

  /**
   * Calculate ETA using Haversine distance and traffic multiplier.
   */
  static async calculateETA(
    deliveryId: string
  ): Promise<ETAResult> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) throw new Error("Delivery not found");

    const driverLat = delivery.currentLatitude ?? delivery.pickupLatitude;
    const driverLng = delivery.currentLongitude ?? delivery.pickupLongitude;

    const distance = this.haversineDistance(
      driverLat,
      driverLng,
      delivery.dropoffLatitude,
      delivery.dropoffLongitude
    );

    const baseSpeedKmh = 30;
    const trafficFactor = this.getTrafficFactor();
    const adjustedSpeed = baseSpeedKmh / trafficFactor;
    const estimatedMinutes = Math.ceil((distance / adjustedSpeed) * 60);

    const route = this.generateApproximateRoute(
      driverLat,
      driverLng,
      delivery.dropoffLatitude,
      delivery.dropoffLongitude
    );

    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        estimatedArrival: new Date(Date.now() + estimatedMinutes * 60 * 1000),
        distance: Math.round(distance * 100) / 100,
      },
    });

    return {
      estimatedMinutes,
      distanceKm: Math.round(distance * 100) / 100,
      trafficFactor,
      route,
    };
  }

  /**
   * Get delivery history for a driver.
   */
  static async getDriverDeliveryHistory(
    driverId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ deliveries: DeliveryWithRelations[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where: { driverId },
        include: {
          order: {
            include: {
              items: { select: { name: true, quantity: true } },
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  latitude: true,
                  longitude: true,
                  phone: true,
                },
              },
            },
          },
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
              vehicleType: true,
              vehiclePlate: true,
              rating: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.delivery.count({ where: { driverId } }),
    ]);

    return { deliveries: deliveries as DeliveryWithRelations[], total };
  }

  /**
   * Get unassigned deliveries (for driver app).
   */
  static async getAvailableDeliveries(
    options?: { latitude?: number; longitude?: number; radiusKm?: number }
  ): Promise<DeliveryWithRelations[]> {
    const deliveries = await prisma.delivery.findMany({
      where: {
        status: "PENDING",
        driverId: null,
      },
      include: {
        order: {
          include: {
            items: { select: { name: true, quantity: true } },
            restaurant: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
                phone: true,
              },
            },
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehiclePlate: true,
            rating: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    if (options?.latitude && options?.longitude && options?.radiusKm) {
      return deliveries.filter((d) => {
        const distance = this.haversineDistance(
          options.latitude!,
          options.longitude!,
          d.pickupLatitude,
          d.pickupLongitude
        );
        return distance <= options.radiusKm!;
      }) as DeliveryWithRelations[];
    }

    return deliveries as DeliveryWithRelations[];
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private static async findNearestDriver(
    restaurantLat: number,
    restaurantLng: number
  ): Promise<string | null> {
    const availableDrivers = await prisma.driverProfile.findMany({
      where: {
        isAvailable: true,
        currentLatitude: { not: null },
        currentLongitude: { not: null },
      },
      include: {
        user: { select: { id: true } },
      },
    });

    if (availableDrivers.length === 0) return null;

    const activeCountMap = new Map<string, number>();
    const activeDrivers = await prisma.delivery.groupBy({
      by: ["driverId"],
      where: {
        driverId: { in: availableDrivers.map((d) => d.userId) },
        status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVING"] },
      },
      _count: true,
    });
    activeDrivers.forEach((d) => activeCountMap.set(d.driverId, d._count));

    let bestDriver: string | null = null;
    let bestScore = Infinity;

    for (const driver of availableDrivers) {
      if (!driver.currentLatitude || !driver.currentLongitude) continue;

      const activeCount = activeCountMap.get(driver.userId) ?? 0;
      if (activeCount >= driver.maxDeliveries) continue;

      const distance = this.haversineDistance(
        restaurantLat,
        restaurantLng,
        driver.currentLatitude,
        driver.currentLongitude
      );

      const score = distance + activeCount * 2;
      if (score < bestScore) {
        bestScore = score;
        bestDriver = driver.userId;
      }
    }

    return bestDriver;
  }

  private static haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static getTrafficFactor(): number {
    const hour = new Date().getHours();
    if (hour >= 7 && hour <= 9) return 1.5;
    if (hour >= 11 && hour <= 13) return 1.3;
    if (hour >= 17 && hour <= 19) return 1.6;
    if (hour >= 20 && hour <= 22) return 1.1;
    return 1.0;
  }

  private static generateApproximateRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Array<{ latitude: number; longitude: number }> {
    const steps = 5;
    const route: Array<{ latitude: number; longitude: number }> = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      route.push({
        latitude: fromLat + (toLat - fromLat) * t + (Math.random() - 0.5) * 0.001,
        longitude: fromLng + (toLng - fromLng) * t + (Math.random() - 0.5) * 0.001,
      });
    }
    return route;
  }
}
