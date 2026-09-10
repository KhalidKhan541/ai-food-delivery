import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;

    const loyaltyAccount = await prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!loyaltyAccount) {
      return NextResponse.json(
        { error: "Loyalty account not found" },
        { status: 404 }
      );
    }

    const currentTier = config.loyalty.tiers[loyaltyAccount.tier];
    const tiers = Object.entries(config.loyalty.tiers).map(([key, value]) => ({
      name: key,
      displayName: value.name,
      minPoints: value.minPoints,
      multiplier: value.multiplier,
      isCurrent: key === loyaltyAccount.tier,
      isUnlocked: loyaltyAccount.points >= value.minPoints,
    }));

    const nextTier = tiers.find(
      (t) => t.minPoints > loyaltyAccount.points && !t.isUnlocked
    );

    const pointsToNextTier = nextTier
      ? nextTier.minPoints - loyaltyAccount.points
      : 0;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      config.pagination.maxPageSize,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20"))
    );

    const [transactions, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: { loyaltyAccountId: loyaltyAccount.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.loyaltyTransaction.count({
        where: { loyaltyAccountId: loyaltyAccount.id },
      }),
    ]);

    return NextResponse.json({
      account: {
        id: loyaltyAccount.id,
        points: loyaltyAccount.points,
        tier: loyaltyAccount.tier,
        tierDisplayName: currentTier.name,
        totalEarned: loyaltyAccount.totalEarned,
        totalRedeemed: loyaltyAccount.totalRedeemed,
        multiplier: currentTier.multiplier,
        pointsToNextTier,
        nextTier: nextTier?.displayName ?? null,
      },
      tiers,
      transactions: {
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
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
    const { orderId, points, type, description } = body;

    if (!points || points <= 0) {
      return NextResponse.json(
        { error: "Invalid points amount" },
        { status: 400 }
      );
    }

    const loyaltyAccount = await prisma.loyaltyAccount.findUnique({
      where: { userId },
    });

    if (!loyaltyAccount) {
      return NextResponse.json(
        { error: "Loyalty account not found" },
        { status: 404 }
      );
    }

    if (type === "REDEEM" && loyaltyAccount.points < points) {
      return NextResponse.json(
        { error: "Insufficient points" },
        { status: 400 }
      );
    }

    const updatedAccount = await prisma.$transaction(async (tx) => {
      const newPoints =
        type === "EARN"
          ? loyaltyAccount.points + points
          : loyaltyAccount.points - points;

      let newTier = loyaltyAccount.tier;
      const tiers = Object.entries(config.loyalty.tiers).reverse();
      for (const [tierName, tierConfig] of tiers) {
        if (newPoints >= tierConfig.minPoints) {
          newTier = tierName as any;
          break;
        }
      }

      const account = await tx.loyaltyAccount.update({
        where: { id: loyaltyAccount.id },
        data: {
          points: newPoints,
          tier: newTier,
          totalEarned: type === "EARN" ? { increment: points } : undefined,
          totalRedeemed: type === "REDEEM" ? { increment: points } : undefined,
        },
      });

      await tx.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: loyaltyAccount.id,
          type: type ?? "EARN",
          points,
          description,
          orderId,
        },
      });

      return account;
    });

    return NextResponse.json({
      message: `${points} points ${type === "EARN" ? "earned" : "redeemed"}`,
      account: {
        points: updatedAccount.points,
        tier: updatedAccount.tier,
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
