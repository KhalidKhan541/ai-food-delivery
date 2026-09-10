import { prisma } from "@/lib/prisma";
import { Prisma, Restaurant, RestaurantStatus } from "@prisma/client";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const createRestaurantSchema = z.object({
  ownerId: z.string().uuid(),
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  cuisineType: z.string().min(1).max(50),
  phone: z.string().min(10).max(20),
  email: z.string().email(),
  website: z.string().url().optional(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().min(1).default("US"),
  }),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  images: z.array(z.string().url()).max(10).default([]),
  bannerImage: z.string().url().optional(),
  logo: z.string().url().optional(),
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).default("$$"),
  tags: z.array(z.string().max(30)).max(20).default([]),
  minOrderAmount: z.number().min(0).default(0),
  deliveryFee: z.number().min(0).default(0),
  estimatedDeliveryTime: z.number().min(5).max(120).default(30),
  isOpen: z.boolean().default(false),
});

export const updateRestaurantSchema = createRestaurantSchema.partial().omit({
  ownerId: true,
});

export const restaurantHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed: z.boolean().default(false),
});

export const bulkUpdateHoursSchema = z.array(restaurantHoursSchema);

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type RestaurantHoursInput = z.infer<typeof restaurantHoursSchema>;

export type RestaurantWithRelations = Restaurant & {
  owner: { id: string; name: string; email: string };
  hours: Array<{
    id: string;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  _count: {
    menuItems: number;
    reviews: number;
    orders: number;
  };
};

export type RestaurantListItem = Pick<
  Restaurant,
  | "id"
  | "name"
  | "slug"
  | "cuisineType"
  | "priceRange"
  | "rating"
  | "reviewCount"
  | "images"
  | "logo"
  | "estimatedDeliveryTime"
  | "deliveryFee"
  | "minOrderAmount"
  | "isOpen"
  | "tags"
> & { distance?: number };

export type RestaurantSearchFilters = {
  query?: string;
  cuisineType?: string;
  priceRange?: string[];
  tags?: string[];
  minRating?: number;
  maxDeliveryFee?: number;
  maxEstimatedDeliveryTime?: number;
  isOpen?: boolean;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sortBy?: "rating" | "deliveryTime" | "deliveryFee" | "distance" | "popularity";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class RestaurantService {
  /**
   * Create a new restaurant with default hours for each day of the week.
   */
  static async create(input: CreateRestaurantInput): Promise<RestaurantWithRelations> {
    const existing = await prisma.restaurant.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new Error(`Restaurant with slug "${input.slug}" already exists`);
    }

    return prisma.restaurant.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        cuisineType: input.cuisineType,
        phone: input.phone,
        email: input.email,
        website: input.website,
        streetAddress: input.address.street,
        city: input.address.city,
        state: input.address.state,
        zipCode: input.address.zipCode,
        country: input.address.country,
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        images: input.images,
        bannerImage: input.bannerImage,
        logo: input.logo,
        priceRange: input.priceRange,
        tags: input.tags,
        minOrderAmount: input.minOrderAmount,
        deliveryFee: input.deliveryFee,
        estimatedDeliveryTime: input.estimatedDeliveryTime,
        isOpen: input.isOpen,
        hours: {
          create: Array.from({ length: 7 }, (_, i) => ({
            dayOfWeek: i,
            openTime: "09:00",
            closeTime: "22:00",
            isClosed: i === 0,
          })),
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        hours: true,
        _count: { select: { menuItems: true, reviews: true, orders: true } },
      },
    });
  }

  /**
   * Get a restaurant by ID with all relations.
   */
  static async getById(id: string): Promise<RestaurantWithRelations | null> {
    return prisma.restaurant.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        hours: { orderBy: { dayOfWeek: "asc" } },
        _count: { select: { menuItems: true, reviews: true, orders: true } },
      },
    });
  }

  /**
   * Get a restaurant by slug (SEO-friendly).
   */
  static async getBySlug(slug: string): Promise<RestaurantWithRelations | null> {
    return prisma.restaurant.findUnique({
      where: { slug },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        hours: { orderBy: { dayOfWeek: "asc" } },
        _count: { select: { menuItems: true, reviews: true, orders: true } },
      },
    });
  }

  /**
   * Update restaurant details. Only the owner can update.
   */
  static async update(
    id: string,
    ownerId: string,
    input: UpdateRestaurantInput
  ): Promise<RestaurantWithRelations> {
    const existing = await prisma.restaurant.findUnique({ where: { id } });

    if (!existing) throw new Error("Restaurant not found");
    if (existing.ownerId !== ownerId) throw new Error("Unauthorized: not the restaurant owner");

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await prisma.restaurant.findUnique({ where: { slug: input.slug } });
      if (slugTaken) throw new Error(`Slug "${input.slug}" is already taken`);
    }

    return prisma.restaurant.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.cuisineType && { cuisineType: input.cuisineType }),
        ...(input.phone && { phone: input.phone }),
        ...(input.email && { email: input.email }),
        ...(input.website !== undefined && { website: input.website }),
        ...(input.address && {
          streetAddress: input.address.street,
          city: input.address.city,
          state: input.address.state,
          zipCode: input.address.zipCode,
          country: input.address.country,
        }),
        ...(input.location && {
          latitude: input.location.latitude,
          longitude: input.location.longitude,
        }),
        ...(input.images && { images: input.images }),
        ...(input.bannerImage !== undefined && { bannerImage: input.bannerImage }),
        ...(input.logo !== undefined && { logo: input.logo }),
        ...(input.priceRange && { priceRange: input.priceRange }),
        ...(input.tags && { tags: input.tags }),
        ...(input.minOrderAmount !== undefined && { minOrderAmount: input.minOrderAmount }),
        ...(input.deliveryFee !== undefined && { deliveryFee: input.deliveryFee }),
        ...(input.estimatedDeliveryTime !== undefined && {
          estimatedDeliveryTime: input.estimatedDeliveryTime,
        }),
        ...(input.isOpen !== undefined && { isOpen: input.isOpen }),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        hours: { orderBy: { dayOfWeek: "asc" } },
        _count: { select: { menuItems: true, reviews: true, orders: true } },
      },
    });
  }

  /**
   * Soft-delete a restaurant by setting status to INACTIVE.
   */
  static async deactivate(id: string, ownerId: string): Promise<void> {
    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) throw new Error("Restaurant not found");
    if (existing.ownerId !== ownerId) throw new Error("Unauthorized");

    await prisma.restaurant.update({
      where: { id },
      data: { status: "INACTIVE" as RestaurantStatus },
    });
  }

  /**
   * Reactivate a restaurant.
   */
  static async reactivate(id: string, ownerId: string): Promise<void> {
    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) throw new Error("Restaurant not found");
    if (existing.ownerId !== ownerId) throw new Error("Unauthorized");

    await prisma.restaurant.update({
      where: { id },
      data: { status: "ACTIVE" as RestaurantStatus },
    });
  }

  /**
   * Toggle restaurant open/closed status.
   */
  static async toggleOpen(id: string, ownerId: string): Promise<boolean> {
    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) throw new Error("Restaurant not found");
    if (existing.ownerId !== ownerId) throw new Error("Unauthorized");

    const updated = await prisma.restaurant.update({
      where: { id },
      data: { isOpen: !existing.isOpen },
      select: { isOpen: true },
    });

    return updated.isOpen;
  }

  /**
   * Update operating hours for a restaurant. Replaces all hours.
   */
  static async updateHours(
    id: string,
    ownerId: string,
    hours: RestaurantHoursInput[]
  ): Promise<void> {
    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) throw new Error("Restaurant not found");
    if (existing.ownerId !== ownerId) throw new Error("Unauthorized");

    await prisma.$transaction([
      prisma.restaurantHours.deleteMany({ where: { restaurantId: id } }),
      prisma.restaurantHours.createMany({
        data: hours.map((h) => ({
          restaurantId: id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        })),
      }),
    ]);
  }

  /**
   * Check if a restaurant is currently open based on its hours.
   */
  static async isCurrentlyOpen(restaurantId: string): Promise<boolean> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { isOpen: true, timezone: true },
    });

    if (!restaurant || !restaurant.isOpen) return false;

    const now = new Date();
    const hours = await prisma.restaurantHours.findMany({
      where: { restaurantId },
      orderBy: { dayOfWeek: "asc" },
    });

    const currentDay = now.getUTCDay();
    const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

    const todayHours = hours.find((h) => h.dayOfWeek === currentDay);
    if (!todayHours || todayHours.isClosed) return false;

    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
  }

  /**
   * Get all restaurants owned by a user.
   */
  static async getByOwner(ownerId: string): Promise<RestaurantWithRelations[]> {
    return prisma.restaurant.findMany({
      where: { ownerId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        hours: { orderBy: { dayOfWeek: "asc" } },
        _count: { select: { menuItems: true, reviews: true, orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get restaurant statistics for the owner dashboard.
   */
  static async getStats(
    restaurantId: string,
    ownerId: string
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
    todayOrders: number;
    todayRevenue: number;
  }> {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new Error("Restaurant not found");
    if (restaurant.ownerId !== ownerId) throw new Error("Unauthorized");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [orderStats, reviewStats, todayStats] = await Promise.all([
      prisma.order.aggregate({
        where: { restaurantId, status: "DELIVERED" },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.review.aggregate({
        where: { restaurantId },
        _avg: { rating: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: todayStart },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders: orderStats._count,
      totalRevenue: Number(orderStats._sum.totalAmount ?? 0),
      averageRating: Number(reviewStats._avg.rating ?? 0),
      totalReviews: reviewStats._count,
      todayOrders: todayStats._count,
      todayRevenue: Number(todayStats._sum.totalAmount ?? 0),
    };
  }

  /**
   * Update restaurant rating from review aggregate.
   */
  static async recalculateRating(restaurantId: string): Promise<void> {
    const result = await prisma.review.aggregate({
      where: { restaurantId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        rating: Number(result._avg.rating ?? 0),
        reviewCount: result._count,
      },
    });
  }

  /**
   * List restaurants with pagination and filters.
   */
  static async list(filters: {
    page?: number;
    limit?: number;
    status?: RestaurantStatus;
    cuisineType?: string;
  }): Promise<{ restaurants: RestaurantListItem[]; total: number; page: number; totalPages: number }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.RestaurantWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(filters.cuisineType && { cuisineType: filters.cuisineType }),
    };

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          cuisineType: true,
          priceRange: true,
          rating: true,
          reviewCount: true,
          images: true,
          logo: true,
          estimatedDeliveryTime: true,
          deliveryFee: true,
          minOrderAmount: true,
          isOpen: true,
          tags: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.restaurant.count({ where }),
    ]);

    return {
      restaurants,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
