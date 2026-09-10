import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;

    const body = await request.json();
    const { code, orderTotal, restaurantId } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Promo code is required" },
        { status: 400 }
      );
    }

    const promo = await prisma.promo.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!promo) {
      return NextResponse.json(
        { error: "Invalid promo code" },
        { status: 404 }
      );
    }

    const now = new Date();

    if (!promo.isActive) {
      return NextResponse.json(
        { error: "This promo code is no longer active" },
        { status: 400 }
      );
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < now) {
      return NextResponse.json(
        { error: "This promo code has expired" },
        { status: 400 }
      );
    }

    if (promo.startDate && new Date(promo.startDate) > now) {
      return NextResponse.json(
        { error: "This promo code is not yet valid" },
        { status: 400 }
      );
    }

    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      return NextResponse.json(
        { error: "This promo code has reached its usage limit" },
        { status: 400 }
      );
    }

    if (promo.restaurantId && promo.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "This promo code is not valid for this restaurant" },
        { status: 400 }
      );
    }

    if (orderTotal && orderTotal < promo.minOrderAmount) {
      return NextResponse.json(
        {
          error: `Minimum order amount is $${promo.minOrderAmount.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const userPromoUsage = await prisma.order.count({
      where: {
        userId,
        promoCode: code.toUpperCase().trim(),
      },
    });

    if (userPromoUsage >= 3) {
      return NextResponse.json(
        { error: "You have reached the usage limit for this promo code" },
        { status: 400 }
      );
    }

    let discount = 0;
    if (promo.discountPercent) {
      discount = (orderTotal ?? 0) * (promo.discountPercent / 100);
      if (promo.maxDiscount) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else if (promo.discountAmount) {
      discount = promo.discountAmount;
    }

    discount = parseFloat(discount.toFixed(2));

    return NextResponse.json({
      valid: true,
      promoId: promo.id,
      code: promo.code,
      description: promo.description,
      discount,
      discountType: promo.discountPercent ? "percentage" : "fixed",
      discountValue: promo.discountPercent ?? promo.discountAmount,
      maxDiscount: promo.maxDiscount,
      minOrderAmount: promo.minOrderAmount,
      newOrderTotal: Math.max(0, (orderTotal ?? 0) - discount),
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
