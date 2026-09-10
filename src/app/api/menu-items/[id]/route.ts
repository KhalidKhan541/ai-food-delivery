import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: params.id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            deliveryFee: true,
            estimatedPrepTime: true,
            minOrderAmount: true,
            rating: true,
          },
        },
        _count: {
          select: {
            favorites: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const existingItem = await prisma.menuItem.findUnique({
      where: { id: params.id },
      include: { restaurant: true },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    if (existingItem.restaurant.ownerId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Not authorized to update this item" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updatedItem = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        discountedPrice: body.discountedPrice,
        category: body.category,
        subcategory: body.subcategory,
        image: body.image,
        images: body.images,
        isAvailable: body.isAvailable,
        isFeatured: body.isFeatured,
        isVegetarian: body.isVegetarian,
        isVegan: body.isVegan,
        isGlutenFree: body.isGlutenFree,
        spiceLevel: body.spiceLevel,
        calories: body.calories,
        prepTimeMinutes: body.prepTimeMinutes,
        tags: body.tags,
        allergens: body.allergens,
        options: body.options,
        sortOrder: body.sortOrder,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const existingItem = await prisma.menuItem.findUnique({
      where: { id: params.id },
      include: { restaurant: true },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    if (existingItem.restaurant.ownerId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Not authorized to delete this item" },
        { status: 403 }
      );
    }

    await prisma.menuItem.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Menu item deleted" });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
