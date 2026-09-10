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
    const search = searchParams.get("q");
    const category = searchParams.get("category");
    const restaurantId = searchParams.get("restaurantId");
    const minPrice = parseFloat(searchParams.get("minPrice") ?? "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") ?? "9999");
    const isVegetarian = searchParams.get("vegetarian") === "true";
    const isVegan = searchParams.get("vegan") === "true";
    const isGlutenFree = searchParams.get("glutenFree") === "true";

    const where: any = { isAvailable: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: "insensitive" };
    }

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    where.price = {};
    if (minPrice > 0) where.price.gte = minPrice;
    if (maxPrice < 9999) where.price.lte = maxPrice;

    if (isVegetarian) where.isVegetarian = true;
    if (isVegan) where.isVegan = true;
    if (isGlutenFree) where.isGlutenFree = true;

    const [items, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              deliveryFee: true,
              estimatedPrepTime: true,
            },
          },
        },
      }),
      prisma.menuItem.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
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
    const userRole = (session.user as any).role;

    if (!["RESTAURANT_OWNER", "ADMIN"].includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: body.restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if ((session.user as any).id !== restaurant.ownerId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Not authorized to add items to this restaurant" },
        { status: 403 }
      );
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: body.restaurantId,
        name: body.name,
        description: body.description,
        price: body.price,
        discountedPrice: body.discountedPrice,
        category: body.category,
        subcategory: body.subcategory,
        image: body.image,
        images: body.images ?? [],
        isAvailable: body.isAvailable ?? true,
        isFeatured: body.isFeatured ?? false,
        isVegetarian: body.isVegetarian ?? false,
        isVegan: body.isVegan ?? false,
        isGlutenFree: body.isGlutenFree ?? false,
        spiceLevel: body.spiceLevel ?? 0,
        calories: body.calories,
        prepTimeMinutes: body.prepTimeMinutes,
        tags: body.tags ?? [],
        allergens: body.allergens ?? [],
        options: body.options,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
