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
    const status = searchParams.get("status");
    const search = searchParams.get("q");
    const sortBy = searchParams.get("sort") ?? "rating";

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      };
    }

    const orderBy: any = (() => {
      switch (sortBy) {
        case "deliveries":
          return { totalDeliveries: "desc" };
        case "earnings":
          return { totalEarnings: "desc" };
        case "newest":
          return { createdAt: "desc" };
        default:
          return { rating: "desc" };
      }
    })();

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              image: true,
            },
          },
          _count: {
            select: {
              deliveries: true,
            },
          },
        },
      }),
      prisma.driver.count({ where }),
    ]);

    return NextResponse.json({
      data: drivers,
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

    if (!["ADMIN"].includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const existingDriver = await prisma.driver.findUnique({
      where: { userId: body.userId },
    });

    if (existingDriver) {
      return NextResponse.json(
        { error: "User is already a driver" },
        { status: 409 }
      );
    }

    const driver = await prisma.driver.create({
      data: {
        userId: body.userId,
        licenseNumber: body.licenseNumber,
        vehicleType: body.vehicleType ?? "MOTORBIKE",
        vehiclePlate: body.vehiclePlate,
        status: "OFFLINE",
        isAvailable: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
