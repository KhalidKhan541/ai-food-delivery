import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { config } from "@/lib/config";
import Stripe from "stripe";

const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: "2024-12-18.acacia" as any })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment processing not configured" },
        { status: 503 }
      );
    }

    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.userId !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    if (order.paymentStatus === "COMPLETED") {
      return NextResponse.json(
        { error: "Order already paid" },
        { status: 400 }
      );
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment?.stripePaymentId) {
      return NextResponse.json({
        clientSecret: existingPayment.metadata,
        paymentId: existingPayment.id,
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: "usd",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    const payment = await prisma.payment.upsert({
      where: { orderId },
      update: {
        stripePaymentId: paymentIntent.id,
        amount: order.total,
        method: order.paymentMethod as any,
        metadata: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      },
      create: {
        orderId: order.id,
        amount: order.total,
        method: order.paymentMethod as any,
        stripePaymentId: paymentIntent.id,
        status: "PENDING",
        metadata: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      amount: order.total,
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      config.pagination.maxPageSize,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20"))
    );
    const status = searchParams.get("status");

    const where: any = {};

    if (userRole === "CUSTOMER") {
      where.order = { userId };
    } else if (userRole === "RESTAURANT_OWNER") {
      const restaurant = await prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (restaurant) {
        where.order = { restaurantId: restaurant.id };
      }
    } else if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
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
