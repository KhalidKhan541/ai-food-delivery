"use client";

import * as React from "react";
import {
  Star,
  Trophy,
  Gift,
  Crown,
  Gem,
  ChevronRight,
  Sparkles,
  Zap,
  Clock,
  TrendingUp,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  icon: React.ElementType;
  isAvailable: boolean;
}

interface LoyaltyCardProps {
  userId: string;
  userName: string;
  tier: LoyaltyTier;
  currentPoints: number;
  totalPointsEarned: number;
  pointsToNextTier?: number;
  nextTier?: LoyaltyTier;
  recentActivity?: {
    id: string;
    description: string;
    points: number;
    date: string;
    type: "earned" | "redeemed";
  }[];
  availableRewards?: LoyaltyReward[];
  onRedeemReward?: (rewardId: string) => void;
  onViewAllRewards?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

const tierConfig: Record<
  LoyaltyTier,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ElementType;
    gradient: string;
  }
> = {
  BRONZE: {
    label: "Bronze",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Trophy,
    gradient: "from-amber-100 to-amber-200",
  },
  SILVER: {
    label: "Silver",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Crown,
    gradient: "from-gray-100 to-gray-200",
  },
  GOLD: {
    label: "Gold",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: Gem,
    gradient: "from-yellow-100 to-yellow-200",
  },
  PLATINUM: {
    label: "Platinum",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Sparkles,
    gradient: "from-purple-100 to-purple-200",
  },
};

export function LoyaltyCard({
  userId,
  userName,
  tier,
  currentPoints,
  totalPointsEarned,
  pointsToNextTier,
  nextTier,
  recentActivity = [],
  availableRewards = [],
  onRedeemReward,
  onViewAllRewards,
  onViewHistory,
  className,
}: LoyaltyCardProps) {
  const config = tierConfig[tier];
  const TierIcon = config.icon;

  const progressToNextTier = React.useMemo(() => {
    if (!pointsToNextTier || !nextTier) return 100;
    const currentThreshold = tierConfig[tier] ? 0 : 0;
    const nextThreshold = currentThreshold + pointsToNextTier;
    return Math.min(100, (currentPoints / nextThreshold) * 100);
  }, [currentPoints, pointsToNextTier, nextTier, tier]);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6",
          config.gradient,
          config.borderColor
        )}
      >
        <div className="absolute right-0 top-0 opacity-10">
          <TierIcon className="h-40 w-40 -translate-y-10 translate-x-10" />
        </div>

        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  config.bgColor,
                  config.color
                )}
              >
                <TierIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-card-foreground">
                  {config.label} Member
                </h3>
                <p className="text-xs text-muted-foreground">{userName}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-card-foreground">
                {currentPoints.toLocaleString()}
              </p>
              <p className="text-[10px] uppercase text-muted-foreground">
                Points
              </p>
            </div>
          </div>

          {nextTier && pointsToNextTier !== undefined && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{pointsToNextTier.toLocaleString()} pts to {tierConfig[nextTier].label}</span>
                <span>{Math.round(progressToNextTier)}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/50">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressToNextTier}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/50 p-2.5 text-center backdrop-blur-sm">
              <Zap className="mx-auto h-4 w-4 text-primary" />
              <p className="mt-1 text-xs font-bold text-card-foreground">
                {totalPointsEarned.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Total Earned</p>
            </div>
            <div className="rounded-xl bg-white/50 p-2.5 text-center backdrop-blur-sm">
              <TrendingUp className="mx-auto h-4 w-4 text-success" />
              <p className="mt-1 text-xs font-bold text-card-foreground">
                {recentActivity.filter((a) => a.type === "earned").length}
              </p>
              <p className="text-[10px] text-muted-foreground">Transactions</p>
            </div>
            <div className="rounded-xl bg-white/50 p-2.5 text-center backdrop-blur-sm">
              <Gift className="mx-auto h-4 w-4 text-accent-foreground" />
              <p className="mt-1 text-xs font-bold text-card-foreground">
                {availableRewards.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Rewards</p>
            </div>
          </div>
        </div>
      </div>

      {availableRewards.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-bold text-card-foreground">Available Rewards</h4>
            {onViewAllRewards && (
              <button
                onClick={onViewAllRewards}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {availableRewards.slice(0, 3).map((reward) => {
              const RewardIcon = reward.icon;
              const canAfford = currentPoints >= reward.pointsCost;

              return (
                <div
                  key={reward.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-all",
                    canAfford
                      ? "border-primary/20 bg-primary/5 hover:shadow-sm"
                      : "opacity-60"
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <RewardIcon className="h-5 w-5 text-accent-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-card-foreground truncate">
                      {reward.name}
                    </h5>
                    <p className="text-xs text-muted-foreground truncate">
                      {reward.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-primary">
                      {reward.pointsCost.toLocaleString()} pts
                    </span>
                    {canAfford && reward.isAvailable && (
                      <button
                        onClick={() => onRedeemReward?.(reward.id)}
                        className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Redeem
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-bold text-card-foreground">Recent Activity</h4>
            {onViewHistory && (
              <button
                onClick={onViewHistory}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View History
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {recentActivity.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      activity.type === "earned"
                        ? "bg-success/10 text-success"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {activity.type === "earned" ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-card-foreground">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {activity.date}
                    </div>
                  </div>
                </div>

                <span
                  className={cn(
                    "text-sm font-bold",
                    activity.type === "earned"
                      ? "text-success"
                      : "text-primary"
                  )}
                >
                  {activity.type === "earned" ? "+" : "-"}
                  {activity.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
        <Star className="mx-auto h-6 w-6 text-primary" />
        <p className="mt-2 text-sm font-semibold text-card-foreground">
          Earn {10} points per $1 spent
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Points are earned on every order placed through the platform
        </p>
      </div>
    </div>
  );
}
