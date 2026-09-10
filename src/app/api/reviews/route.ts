import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      config.pagination.maxPageSize,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20"))
    );
    const restaurantId = searchParams.get("restaurantId");
    const rating = parseInt(searchParams.get("rating") ?? "0");
    const sortBy = searchParams.get("sort") ?? "newest";

    const where: any = { isVisible: true };

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    if (rating > 0) {
      where.rating = rating;
    }

    const orderBy: any = (() => {
      switch (sortBy) {
        case "highest":
          return { rating: "desc" };
        case "lowest":
          return { rating: "asc" };
        case "restaurant":
          return { restaurant: { name: "asc" } };
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
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      data: reviews,
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

    const body = await request.json();
    const { restaurantId, orderId, rating, comment, images } = body;

    if (!restaurantId || !rating) {
      return NextResponse.json(
        { error: "Restaurant ID and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        restaurantId,
        orderId: orderId ?? undefined,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this restaurant for this order" },
        { status: 409 }
      );
    }

    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          userId,
          restaurantId,
          orderId,
          rating,
          comment,
          images: images ?? [],
        },
      });

      const stats = await tx.review.aggregate({
        where: { restaurantId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.restaurant.update({
        where: { id: restaurantId },
        data: {
          rating: parseFloat((stats._avg.rating ?? 0).toFixed(1)),
          reviewCount: stats._count.rating,
        },
      });

      return newReview;
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const body = await request.json();
    const { id, reply } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id },
      include: { restaurant: true },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    if (reply) {
      const isOwner =
        userRole === "RESTAURANT_OWNER" &&
        review.restaurant.ownerId === userId;
      const isAdmin = userRole === "ADMIN";

      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { error: "Not authorized to reply to this review" },
          { status: 403 }
        );
      }

      const updatedReview = await prisma.review.update({
        where: { id },
        data: {
          reply,
          replyAt: new Date(),
        },
      });

      return NextResponse.json(updatedReview);
    }

    if (review.userId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to update this review" },
        { status: 403 }
      );
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        rating: body.rating,
        comment: body.comment,
        images: body.images,
      },
    });

    const stats = await prisma.review.aggregate({
      where: { restaurantId: review.restaurantId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.restaurant.update({
      where: { id: review.restaurantId },
      data: {
        rating: parseFloat((stats._avg.rating ?? 0).toFixed(1)),
        reviewCount: stats._count.rating,
      },
    });

    return NextResponse.json(updatedReview);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("id");

    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    const isOwner = review.userId === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Not authorized to delete this review" },
        { status: 403 }
      );
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { isVisible: false },
    });

    return NextResponse.json({ message: "Review hidden" });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
