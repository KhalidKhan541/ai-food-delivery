import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { config } from "@/lib/config";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      config.pagination.maxPageSize,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20"))
    );
    const rating = parseInt(searchParams.get("rating") ?? "0");
    const sortBy = searchParams.get("sort") ?? "newest";

    const where: any = {
      restaurantId: params.id,
      isVisible: true,
    };

    if (rating > 0) {
      where.rating = rating;
    }

    const orderBy: any = (() => {
      switch (sortBy) {
        case "highest":
          return { rating: "desc" };
        case "lowest":
          return { rating: "asc" };
        case "helpful":
          return { createdAt: "desc" };
        default:
          return { createdAt: "desc" };
      }
    })();

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    const ratingDistribution = await prisma.review.groupBy({
      by: ["rating"],
      where: { restaurantId: params.id, isVisible: true },
      _count: { rating: true },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((r) => {
      distribution[r.rating] = r._count.rating;
    });

    return NextResponse.json({
      data: reviews,
      stats: {
        averageRating: restaurant.rating,
        totalReviews: restaurant.reviewCount,
        distribution,
      },
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
