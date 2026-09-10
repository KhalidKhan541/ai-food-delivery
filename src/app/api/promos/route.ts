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
    const isActive = searchParams.get("active") !== "false";
    const search = searchParams.get("q");

    const where: any = {};

    if (isActive) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { code: { contains: search.toUpperCase() } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [promos, total] = await Promise.all([
      prisma.promo.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.promo.count({ where }),
    ]);

    const now = new Date();
    const activePromos = promos.filter((p) => {
      if (!p.isActive) return false;
      if (p.expiresAt && new Date(p.expiresAt) < now) return false;
      if (p.maxUses && p.currentUses >= p.maxUses) return false;
      return true;
    });

    return NextResponse.json({
      data: promos,
      activePromos,
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
    const code = body.code.toUpperCase().trim();

    const existing = await prisma.promo.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Promo code already exists" },
        { status: 409 }
      );
    }

    if (body.discountPercent && body.discountPercent > config.promo.maxDiscountPercent) {
      return NextResponse.json(
        {
          error: `Maximum discount is ${config.promo.maxDiscountPercent}%`,
        },
        { status: 400 }
      );
    }

    if (body.discountAmount && body.discountAmount > config.promo.maxDiscountAmount) {
      return NextResponse.json(
        {
          error: `Maximum discount is $${config.promo.maxDiscountAmount}`,
        },
        { status: 400 }
      );
    }

    const promo = await prisma.promo.create({
      data: {
        code,
        description: body.description,
        discountPercent: body.discountPercent,
        discountAmount: body.discountAmount,
        maxDiscount: body.maxDiscount,
        minOrderAmount: body.minOrderAmount ?? config.promo.minOrderAmount,
        maxUses: body.maxUses,
        restaurantId: body.restaurantId,
        isActive: body.isActive ?? true,
        startDate: body.startDate ? new Date(body.startDate) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(promo, { status: 201 });
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
    const userRole = (session.user as any).role;

    if (!["RESTAURANT_OWNER", "ADMIN"].includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Promo ID is required" },
        { status: 400 }
      );
    }

    const promo = await prisma.promo.findUnique({
      where: { id },
    });

    if (!promo) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    const updatedPromo = await prisma.promo.update({
      where: { id },
      data: {
        description: data.description,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        maxDiscount: data.maxDiscount,
        minOrderAmount: data.minOrderAmount,
        maxUses: data.maxUses,
        isActive: data.isActive,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    return NextResponse.json(updatedPromo);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
