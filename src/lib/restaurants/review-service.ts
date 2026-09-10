import { prisma } from "@/lib/prisma";
import { Prisma, Review, ReviewStatus } from "@prisma/client";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  restaurantId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  title: z.string().min(1).max(100).optional(),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(5).default([]),
  foodRating: z.number().min(1).max(5).optional(),
  deliveryRating: z.number().min(1).max(5).optional(),
  serviceRating: z.number().min(1).max(5).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  title: z.string().min(1).max(100).optional(),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
  foodRating: z.number().min(1).max(5).optional(),
  deliveryRating: z.number().min(1).max(5).optional(),
  serviceRating: z.number().min(1).max(5).optional(),
});

export const replyToReviewSchema = z.object({
  restaurantId: z.string().uuid(),
  reviewId: z.string().uuid(),
  ownerId: z.string().uuid(),
  comment: z.string().min(1).max(1000),
});

export const reviewFilterSchema = z.object({
  restaurantId: z.string().uuid(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  sortBy: z.enum(["newest", "oldest", "highest", "lowest", "helpful"]).default("newest"),
  minRating: z.number().min(1).max(5).optional(),
  hasImages: z.boolean().optional(),
  verifiedOnly: z.boolean().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReplyToReviewInput = z.infer<typeof replyToReviewSchema>;
export type ReviewFilterInput = z.infer<typeof reviewFilterSchema>;

export type ReviewWithRelations = Review & {
  user: { id: string; name: string; image: string | null };
  restaurant: { id: string; name: string; slug: string };
  replies: Array<{
    id: string;
    comment: string;
    createdAt: Date;
    owner: { id: string; name: string; image: string | null };
  }>;
  _count: { helpfulVotes: number };
};

export type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  averageFoodRating: number;
  averageDeliveryRating: number;
  averageServiceRating: number;
  percentWithImages: number;
  recentTrend: "improving" | "stable" | "declining";
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class ReviewService {
  /**
   * Create a review for a restaurant. Optionally linked to an order.
   */
  static async create(input: CreateReviewInput): Promise<ReviewWithRelations> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
    });
    if (!restaurant) throw new Error("Restaurant not found");

    if (input.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
      });
      if (!order) throw new Error("Order not found");
      if (order.userId !== input.userId) throw new Error("Cannot review another user's order");
      if (order.restaurantId !== input.restaurantId) throw new Error("Order does not belong to this restaurant");
      if (order.status !== "DELIVERED") throw new Error("Can only review after order is delivered");

      const existingReview = await prisma.review.findFirst({
        where: { orderId: input.orderId, userId: input.userId },
      });
      if (existingReview) throw new Error("You already reviewed this order");
    }

    const recentReview = await prisma.review.findFirst({
      where: {
        restaurantId: input.restaurantId,
        userId: input.userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentReview) {
      throw new Error("You can only review a restaurant once per day");
    }

    const review = await prisma.review.create({
      data: {
        restaurantId: input.restaurantId,
        orderId: input.orderId,
        userId: input.userId,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        images: input.images,
        foodRating: input.foodRating,
        deliveryRating: input.deliveryRating,
        serviceRating: input.serviceRating,
        isVerified: !!input.orderId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        restaurant: { select: { id: true, name: true, slug: true } },
        replies: {
          include: { owner: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { helpfulVotes: true } },
      },
    });

    await this.recalculateRestaurantStats(input.restaurantId);

    return review;
  }

  /**
   * Get a single review by ID.
   */
  static async getById(id: string): Promise<ReviewWithRelations | null> {
    return prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true } },
        restaurant: { select: { id: true, name: true, slug: true } },
        replies: {
          include: { owner: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { helpfulVotes: true } },
      },
    });
  }

  /**
   * Update a review. Only the author can update.
   */
  static async update(
    id: string,
    userId: string,
    input: UpdateReviewInput
  ): Promise<ReviewWithRelations> {
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) throw new Error("Review not found");
    if (existing.userId !== userId) throw new Error("Unauthorized: not the review author");

    const review = await prisma.review.update({
      where: { id },
      data: {
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.comment !== undefined && { comment: input.comment }),
        ...(input.images !== undefined && { images: input.images }),
        ...(input.foodRating !== undefined && { foodRating: input.foodRating }),
        ...(input.deliveryRating !== undefined && { deliveryRating: input.deliveryRating }),
        ...(input.serviceRating !== undefined && { serviceRating: input.serviceRating }),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        restaurant: { select: { id: true, name: true, slug: true } },
        replies: {
          include: { owner: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { helpfulVotes: true } },
      },
    });

    await this.recalculateRestaurantStats(existing.restaurantId);

    return review;
  }

  /**
   * Delete a review. Only the author or restaurant owner can delete.
   */
  static async delete(id: string, userId: string, isRestaurantOwner: boolean = false): Promise<void> {
    const existing = await prisma.review.findUnique({
      where: { id },
      include: { restaurant: { select: { ownerId: true } } },
    });
    if (!existing) throw new Error("Review not found");

    if (!isRestaurantOwner && existing.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const restaurantId = existing.restaurantId;

    await prisma.$transaction([
      prisma.reviewHelpful.deleteMany({ where: { reviewId: id } }),
      prisma.reviewReply.deleteMany({ where: { reviewId: id } }),
      prisma.review.delete({ where: { id } }),
    ]);

    await this.recalculateRestaurantStats(restaurantId);
  }

  /**
   * Reply to a review (restaurant owner only).
   */
  static async reply(input: ReplyToReviewInput): Promise<void> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
    });
    if (!restaurant) throw new Error("Restaurant not found");
    if (restaurant.ownerId !== input.ownerId) throw new Error("Unauthorized: not the restaurant owner");

    const review = await prisma.review.findUnique({
      where: { id: input.reviewId },
    });
    if (!review) throw new Error("Review not found");
    if (review.restaurantId !== input.restaurantId) throw new Error("Review does not belong to this restaurant");

    const existingReply = await prisma.reviewReply.findFirst({
      where: { reviewId: input.reviewId, ownerId: input.ownerId },
    });
    if (existingReply) throw new Error("You already replied to this review");

    await prisma.reviewReply.create({
      data: {
        reviewId: input.reviewId,
        ownerId: input.ownerId,
        comment: input.comment,
      },
    });
  }

  /**
   * Delete a restaurant owner's reply.
   */
  static async deleteReply(replyId: string, ownerId: string): Promise<void> {
    const reply = await prisma.reviewReply.findUnique({ where: { id: replyId } });
    if (!reply) throw new Error("Reply not found");
    if (reply.ownerId !== ownerId) throw new Error("Unauthorized");

    await prisma.reviewReply.delete({ where: { id: replyId } });
  }

  /**
   * Toggle helpful vote on a review.
   */
  static async toggleHelpful(reviewId: string, userId: string): Promise<boolean> {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new Error("Review not found");
    if (review.userId === userId) throw new Error("Cannot vote on your own review");

    const existing = await prisma.reviewHelpful.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });

    if (existing) {
      await prisma.reviewHelpful.delete({
        where: { reviewId_userId: { reviewId, userId } },
      });
      return false;
    } else {
      await prisma.reviewHelpful.create({
        data: { reviewId, userId },
      });
      return true;
    }
  }

  /**
   * List reviews for a restaurant with filters.
   */
  static async list(filters: ReviewFilterInput): Promise<{
    reviews: ReviewWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (filters.page - 1) * filters.limit;

    const where: Prisma.ReviewWhereInput = {
      restaurantId: filters.restaurantId,
      status: "APPROVED" as ReviewStatus,
      ...(filters.minRating && { rating: { gte: filters.minRating } }),
      ...(filters.hasImages && { images: { not: { equals: [] } } }),
      ...(filters.verifiedOnly && { isVerified: true }),
    };

    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      filters.sortBy === "newest"
        ? { createdAt: "desc" }
        : filters.sortBy === "oldest"
          ? { createdAt: "asc" }
          : filters.sortBy === "highest"
            ? { rating: "desc" }
            : filters.sortBy === "lowest"
              ? { rating: "asc" }
              : { helpfulVotes: { _count: "desc" } };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, image: true } },
          restaurant: { select: { id: true, name: true, slug: true } },
          replies: {
            include: { owner: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { helpfulVotes: true } },
        },
        orderBy,
        skip,
        take: filters.limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  /**
   * Get reviews written by a user.
   */
  static async getByUser(
    userId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{
    reviews: ReviewWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 10, 50);
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        include: {
          user: { select: { id: true, name: true, image: true } },
          restaurant: { select: { id: true, name: true, slug: true } },
          replies: {
            include: { owner: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { helpfulVotes: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { userId } }),
    ]);

    return { reviews, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get comprehensive review statistics for a restaurant.
   */
  static async getStats(restaurantId: string): Promise<ReviewStats> {
    const reviews = await prisma.review.findMany({
      where: { restaurantId, status: "APPROVED" as ReviewStatus },
      select: {
        rating: true,
        foodRating: true,
        deliveryRating: true,
        serviceRating: true,
        images: true,
        createdAt: true,
      },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        averageFoodRating: 0,
        averageDeliveryRating: 0,
        averageServiceRating: 0,
        percentWithImages: 0,
        recentTrend: "stable",
      };
    }

    const totalReviews = reviews.length;
    const sumRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = sumRating / totalReviews;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    });

    const foodRatings = reviews.filter((r) => r.foodRating);
    const deliveryRatings = reviews.filter((r) => r.deliveryRating);
    const serviceRatings = reviews.filter((r) => r.serviceRating);

    const averageFoodRating = foodRatings.length
      ? foodRatings.reduce((sum, r) => sum + (r.foodRating ?? 0), 0) / foodRatings.length
      : 0;
    const averageDeliveryRating = deliveryRatings.length
      ? deliveryRatings.reduce((sum, r) => sum + (r.deliveryRating ?? 0), 0) / deliveryRatings.length
      : 0;
    const averageServiceRating = serviceRatings.length
      ? serviceRatings.reduce((sum, r) => sum + (r.serviceRating ?? 0), 0) / serviceRatings.length
      : 0;

    const percentWithImages = (reviews.filter((r) => r.images.length > 0).length / totalReviews) * 100;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentReviews = reviews.filter((r) => r.createdAt >= thirtyDaysAgo);
    const olderReviews = reviews.filter(
      (r) => r.createdAt >= sixtyDaysAgo && r.createdAt < thirtyDaysAgo
    );

    const recentAvg = recentReviews.length
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
      : 0;
    const olderAvg = olderReviews.length
      ? olderReviews.reduce((sum, r) => sum + r.rating, 0) / olderReviews.length
      : 0;

    let recentTrend: "improving" | "stable" | "declining" = "stable";
    if (recentAvg > olderAvg + 0.2) recentTrend = "improving";
    else if (recentAvg < olderAvg - 0.2) recentTrend = "declining";

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
      averageFoodRating: Math.round(averageFoodRating * 10) / 10,
      averageDeliveryRating: Math.round(averageDeliveryRating * 10) / 10,
      averageServiceRating: Math.round(averageServiceRating * 10) / 10,
      percentWithImages: Math.round(percentWithImages),
      recentTrend,
    };
  }

  /**
   * Moderate a review (admin action).
   */
  static async moderate(
    id: string,
    status: ReviewStatus,
    reason?: string
  ): Promise<ReviewWithRelations> {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review not found");

    const updated = await prisma.review.update({
      where: { id },
      data: {
        status,
        ...(reason && { moderationNote: reason }),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        restaurant: { select: { id: true, name: true, slug: true } },
        replies: {
          include: { owner: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { helpfulVotes: true } },
      },
    });

    await this.recalculateRestaurantStats(review.restaurantId);

    return updated;
  }

  /**
   * Internal: recalculate and update restaurant rating stats.
   */
  private static async recalculateRestaurantStats(restaurantId: string): Promise<void> {
    const result = await prisma.review.aggregate({
      where: {
        restaurantId,
        status: "APPROVED" as ReviewStatus,
      },
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
}
