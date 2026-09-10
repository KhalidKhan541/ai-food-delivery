import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;

    const loyaltyAccount = await prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: {
        rewards: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!loyaltyAccount) {
      return NextResponse.json(
        { error: "Loyalty account not found" },
        { status: 404 }
      );
    }

    const availableRewards = [
      {
        id: "free_delivery",
        name: "Free Delivery",
        description: "Get free delivery on your next order",
        pointsCost: 200,
        type: "DELIVERY",
      },
      {
        id: "5_percent_off",
        name: "5% Off Order",
        description: "Get 5% off your next order (up to $5)",
        pointsCost: 300,
        type: "DISCOUNT",
        maxValue: 5,
      },
      {
        id: "10_percent_off",
        name: "10% Off Order",
        description: "Get 10% off your next order (up to $10)",
        pointsCost: 500,
        type: "DISCOUNT",
        maxValue: 10,
      },
      {
        id: "15_percent_off",
        name: "15% Off Order",
        description: "Get 15% off your next order (up to $15)",
        pointsCost: 800,
        type: "DISCOUNT",
        maxValue: 15,
      },
      {
        id: "free_item",
        name: "Free Item",
        description: "Get a free item (up to $15 value) on your next order",
        pointsCost: 1000,
        type: "FREE_ITEM",
        maxValue: 15,
      },
      {
        id: "20_percent_off",
        name: "20% Off Order",
        description: "Get 20% off your next order (up to $20)",
        pointsCost: 1500,
        type: "DISCOUNT",
        maxValue: 20,
      },
      {
        id: "double_points",
        name: "Double Points",
        description: "Earn double loyalty points on your next order",
        pointsCost: 400,
        type: "MULTIPLIER",
      },
    ];

    const enrichedRewards = availableRewards.map((reward) => ({
      ...reward,
      canAfford: loyaltyAccount.points >= reward.pointsCost,
      alreadyRedeemed: loyaltyAccount.rewards.some(
        (r) => r.name === reward.name && r.isRedeemed
      ),
    }));

    return NextResponse.json({
      availableRewards: enrichedRewards,
      redeemedRewards: loyaltyAccount.rewards.filter((r) => r.isRedeemed),
      currentPoints: loyaltyAccount.points,
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
    const { rewardId } = body;

    const loyaltyAccount = await prisma.loyaltyAccount.findUnique({
      where: { userId },
    });

    if (!loyaltyAccount) {
      return NextResponse.json(
        { error: "Loyalty account not found" },
        { status: 404 }
      );
    }

    const REWARDS_MAP: Record<string, { name: string; description: string; pointsCost: number }> = {
      free_delivery: {
        name: "Free Delivery",
        description: "Free delivery on next order",
        pointsCost: 200,
      },
      "5_percent_off": {
        name: "5% Off Order",
        description: "5% off next order (up to $5)",
        pointsCost: 300,
      },
      "10_percent_off": {
        name: "10% Off Order",
        description: "10% off next order (up to $10)",
        pointsCost: 500,
      },
      "15_percent_off": {
        name: "15% Off Order",
        description: "15% off next order (up to $15)",
        pointsCost: 800,
      },
      free_item: {
        name: "Free Item",
        description: "Free item (up to $15) on next order",
        pointsCost: 1000,
      },
      "20_percent_off": {
        name: "20% Off Order",
        description: "20% off next order (up to $20)",
        pointsCost: 1500,
      },
      double_points: {
        name: "Double Points",
        description: "Double points on next order",
        pointsCost: 400,
      },
    };

    const rewardConfig = REWARDS_MAP[rewardId];

    if (!rewardConfig) {
      return NextResponse.json(
        { error: "Invalid reward" },
        { status: 400 }
      );
    }

    if (loyaltyAccount.points < rewardConfig.pointsCost) {
      return NextResponse.json(
        {
          error: `Insufficient points. You need ${rewardConfig.pointsCost} points but have ${loyaltyAccount.points}`,
        },
        { status: 400 }
      );
    }

    const reward = await prisma.$transaction(async (tx) => {
      const newReward = await tx.loyaltyReward.create({
        data: {
          loyaltyAccountId: loyaltyAccount.id,
          name: rewardConfig.name,
          description: rewardConfig.description,
          pointsCost: rewardConfig.pointsCost,
          isRedeemed: false,
        },
      });

      await tx.loyaltyAccount.update({
        where: { id: loyaltyAccount.id },
        data: {
          points: { decrement: rewardConfig.pointsCost },
          totalRedeemed: { increment: rewardConfig.pointsCost },
        },
      });

      await tx.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: loyaltyAccount.id,
          type: "REDEEM",
          points: rewardConfig.pointsCost,
          description: `Redeemed: ${rewardConfig.name}`,
        },
      });

      return newReward;
    });

    return NextResponse.json({
      message: `Successfully redeemed ${rewardConfig.name}`,
      reward,
      remainingPoints: loyaltyAccount.points - rewardConfig.pointsCost,
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
