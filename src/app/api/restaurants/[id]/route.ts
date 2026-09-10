import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        menuItems: {
          where: { isAvailable: true },
          orderBy: { sortOrder: "asc" },
          take: 50,
        },
        _count: {
          select: {
            reviews: true,
            orders: true,
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(restaurant);
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
        { error: "Not authorized to update this restaurant" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        cuisineType: body.cuisineType,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logo: body.logo,
        coverImage: body.coverImage,
        openingHours: body.openingHours,
        estimatedPrepTime: body.estimatedPrepTime,
        minOrderAmount: body.minOrderAmount,
        deliveryFee: body.deliveryFee,
        freeDeliveryThreshold: body.freeDeliveryThreshold,
        isActive: body.isActive,
        isFeatured: body.isFeatured,
      },
    });

    return NextResponse.json(updatedRestaurant);
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

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (restaurant.ownerId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Not authorized to delete this restaurant" },
        { status: 403 }
      );
    }

    if (restaurant._count.orders > 0) {
      await prisma.restaurant.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "Restaurant deactivated (has existing orders)",
      });
    }

    await prisma.restaurant.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Restaurant deleted" });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
