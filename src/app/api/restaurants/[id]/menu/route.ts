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
    const category = searchParams.get("category");
    const search = searchParams.get("q");
    const isAvailable = searchParams.get("available") !== "false";
    const isVegetarian = searchParams.get("vegetarian") === "true";
    const isVegan = searchParams.get("vegan") === "true";
    const isGlutenFree = searchParams.get("glutenFree") === "true";
    const sortBy = searchParams.get("sort") ?? "sortOrder";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      config.pagination.maxPageSize,
      Math.max(1, parseInt(searchParams.get("limit") ?? String(config.pagination.defaultPageSize)))
    );

    const where: any = { restaurantId: params.id };

    if (isAvailable) {
      where.isAvailable = true;
    }

    if (category) {
      where.category = { equals: category, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    if (isVegetarian) where.isVegetarian = true;
    if (isVegan) where.isVegan = true;
    if (isGlutenFree) where.isGlutenFree = true;

    const orderBy: any = (() => {
      switch (sortBy) {
        case "price_asc":
          return { price: "asc" };
        case "price_desc":
          return { price: "desc" };
        case "name":
          return { name: "asc" };
        case "newest":
          return { createdAt: "desc" };
        default:
          return { sortOrder: "asc" };
      }
    })();

    const [items, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.menuItem.count({ where }),
    ]);

    const categories = await prisma.menuItem.findMany({
      where: { restaurantId: params.id, isAvailable: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      data: items,
      categories: categories.map((c) => c.category),
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (!["RESTAURANT_OWNER", "ADMIN"].includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (restaurant.ownerId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Not authorized to add menu items to this restaurant" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: params.id,
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
