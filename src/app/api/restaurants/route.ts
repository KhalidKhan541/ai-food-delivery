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
      Math.max(1, parseInt(searchParams.get("limit") ?? String(config.pagination.defaultPageSize)))
    );
    const skip = (page - 1) * limit;

    const cuisine = searchParams.get("cuisine");
    const city = searchParams.get("city");
    const search = searchParams.get("q");
    const sortBy = searchParams.get("sort") ?? "rating";
    const isFeatured = searchParams.get("featured") === "true";
    const minRating = parseFloat(searchParams.get("minRating") ?? "0");
    const maxDeliveryFee = parseFloat(searchParams.get("maxDeliveryFee") ?? "999");
    const freeDeliveryOnly = searchParams.get("freeDelivery") === "true";

    const where: any = { isActive: true };

    if (cuisine) {
      where.cuisineType = { has: cuisine };
    }

    if (city) {
      where.city = { equals: city, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { cuisineType: { has: search } },
      ];
    }

    if (isFeatured) {
      where.isFeatured = true;
    }

    if (minRating > 0) {
      where.rating = { gte: minRating };
    }

    if (freeDeliveryOnly) {
      where.deliveryFee = 0;
    } else if (maxDeliveryFee < 999) {
      where.deliveryFee = { lte: maxDeliveryFee };
    }

    const orderBy: any = (() => {
      switch (sortBy) {
        case "rating":
          return { rating: "desc" };
        case "newest":
          return { createdAt: "desc" };
        case "delivery_fee":
          return { deliveryFee: "asc" };
        case "name":
          return { name: "asc" };
        default:
          return { rating: "desc" };
      }
    })();

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          cuisineType: true,
          address: true,
          city: true,
          logo: true,
          coverImage: true,
          rating: true,
          reviewCount: true,
          deliveryFee: true,
          minOrderAmount: true,
          estimatedPrepTime: true,
          freeDeliveryThreshold: true,
          openingHours: true,
          isFeatured: true,
        },
      }),
      prisma.restaurant.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: restaurants,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
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

    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { ownerId: userId },
    });

    if (existingRestaurant) {
      return NextResponse.json(
        { error: "You already own a restaurant" },
        { status: 409 }
      );
    }

    const slug = body.name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");

    const existingSlug = await prisma.restaurant.findUnique({
      where: { slug },
    });

    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: userId,
        name: body.name,
        slug: finalSlug,
        description: body.description,
        cuisineType: body.cuisineType ?? [],
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        country: body.country ?? "US",
        latitude: body.latitude,
        longitude: body.longitude,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logo: body.logo,
        coverImage: body.coverImage,
        openingHours: body.openingHours,
        estimatedPrepTime: body.estimatedPrepTime ?? 15,
        minOrderAmount: body.minOrderAmount ?? 0,
        deliveryFee: body.deliveryFee ?? 3.99,
        freeDeliveryThreshold: body.freeDeliveryThreshold,
      },
    });

    return NextResponse.json(restaurant, { status: 201 });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
