"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star,
  Trophy,
  Gift,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Check,
  Clock,
  Flame,
  Zap,
  Crown,
  Award,
  Target,
} from "lucide-react";

type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

type Reward = {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: "discount" | "free_item" | "delivery" | "exclusive";
  icon: string;
  isAvailable: boolean;
  expiresAt?: string;
};

type PointHistory = {
  id: string;
  description: string;
  points: number;
  type: "earned" | "redeemed";
  date: string;
  orderId?: string;
};

const TIER_CONFIG: Record<
  LoyaltyTier,
  {
    label: string;
    minPoints: number;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: typeof Crown;
    benefits: string[];
  }
> = {
  BRONZE: {
    label: "Bronze",
    minPoints: 0,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Award,
    benefits: ["1x points on all orders", "Birthday bonus 50 pts", "Basic support"],
  },
  SILVER: {
    label: "Silver",
    minPoints: 500,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Trophy,
    benefits: [
      "1.5x points on all orders",
      "Free delivery on orders over $20",
      "Priority support",
      "Birthday bonus 100 pts",
    ],
  },
  GOLD: {
    label: "Gold",
    minPoints: 1500,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: Sparkles,
    benefits: [
      "2x points on all orders",
      "Free delivery on all orders",
      "Priority support",
      "Exclusive deals",
      "Birthday bonus 200 pts",
    ],
  },
  PLATINUM: {
    label: "Platinum",
    minPoints: 5000,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Crown,
    benefits: [
      "3x points on all orders",
      "Free delivery on all orders",
      "Dedicated support line",
      "Exclusive experiences",
      "Early access to new restaurants",
      "Birthday bonus 500 pts",
    ],
  },
};

const MOCK_REWARDS: Reward[] = [
  {
    id: "1",
    title: "$5 Off Next Order",
    description: "Get $5 off any order over $15",
    pointsCost: 200,
    category: "discount",
    icon: "💰",
    isAvailable: true,
  },
  {
    id: "2",
    title: "Free Delivery",
    description: "Free delivery on your next 3 orders",
    pointsCost: 150,
    category: "delivery",
    icon: "🚴",
    isAvailable: true,
  },
  {
    id: "3",
    title: "Free Dessert",
    description: "Complimentary dessert from any restaurant",
    pointsCost: 300,
    category: "free_item",
    icon: "🍰",
    isAvailable: true,
  },
  {
    id: "4",
    title: "$10 Off Premium Order",
    description: "$10 off orders over $40",
    pointsCost: 400,
    category: "discount",
    icon: "🎁",
    isAvailable: true,
  },
  {
    id: "5",
    title: "VIP Restaurant Access",
    description: "Exclusive tasting event at partner restaurant",
    pointsCost: 2000,
    category: "exclusive",
    icon: "👑",
    isAvailable: false,
    expiresAt: "Dec 31, 2026",
  },
  {
    id: "6",
    title: "Mystery Box",
    description: "Surprise meal from top-rated restaurant",
    pointsCost: 500,
    category: "exclusive",
    icon: "📦",
    isAvailable: true,
  },
];

const MOCK_HISTORY: PointHistory[] = [
  { id: "1", description: "Order #1234 - Bella Napoli", points: 85, type: "earned", date: "Today" },
  { id: "2", description: "$5 Off coupon redeemed", points: -200, type: "redeemed", date: "Yesterday" },
  { id: "3", description: "Order #1230 - Green Bowl", points: 45, type: "earned", date: "2 days ago" },
  { id: "4", description: "Order #1228 - Sakura Garden", points: 120, type: "earned", date: "5 days ago" },
  { id: "5", description: "Free Delivery redeemed", points: -150, type: "redeemed", date: "1 week ago" },
  { id: "6", description: "Welcome bonus", points: 100, type: "earned", date: "2 weeks ago" },
];

export default function LoyaltyPage() {
  const [currentPoints, setCurrentPoints] = useState(820);
  const [currentTier, setCurrentTier] = useState<LoyaltyTier>("SILVER");
  const [activeTab, setActiveTab] = useState<"rewards" | "history" | "tiers">("rewards");

  const tierConfig = TIER_CONFIG[currentTier];
  const TierIcon = tierConfig.icon;
  const nextTier = currentTier === "BRONZE" ? "SILVER" : currentTier === "SILVER" ? "GOLD" : currentTier === "GOLD" ? "PLATINUM" : null;
  const nextTierConfig = nextTier ? TIER_CONFIG[nextTier] : null;
  const progressToNext = nextTierConfig
    ? ((currentPoints - tierConfig.minPoints) / (nextTierConfig.minPoints - tierConfig.minPoints)) * 100
    : 100;

  const handleRedeem = (reward: Reward) => {
    if (currentPoints >= reward.pointsCost) {
      setCurrentPoints((p) => p - reward.pointsCost);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Tier Card */}
        <div
          className={`relative overflow-hidden rounded-2xl border ${tierConfig.borderColor} ${tierConfig.bgColor} mb-6`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <Trophy className="w-full h-full" />
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center">
                <TierIcon className={`w-6 h-6 ${tierConfig.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current Tier</p>
                <h2 className={`text-xl font-bold ${tierConfig.color}`}>{tierConfig.label}</h2>
              </div>
            </div>

            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold text-gray-900">{currentPoints.toLocaleString()}</span>
              <span className="text-sm text-gray-500 mb-1">points</span>
            </div>

            {nextTierConfig && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{tierConfig.label}</span>
                  <span>
                    {nextTierConfig.label} ({nextTierConfig.minPoints.toLocaleString()} pts)
                  </span>
                </div>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progressToNext, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {(nextTierConfig.minPoints - currentPoints).toLocaleString()} points to{" "}
                  {nextTierConfig.label}
                </p>
              </div>
            )}

            {/* Points per order info */}
            <div className="flex items-center gap-2 mt-4 p-3 bg-white/60 rounded-xl">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-600">
                Earn <strong className="text-gray-900">
                  {currentTier === "BRONZE" ? "1x" : currentTier === "SILVER" ? "1.5x" : currentTier === "GOLD" ? "2x" : "3x"}
                </strong> points on every order
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl border border-gray-100 p-1 mb-6">
          {[
            { id: "rewards" as const, label: "Rewards", icon: Gift },
            { id: "history" as const, label: "History", icon: Clock },
            { id: "tiers" as const, label: "Tiers", icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rewards Tab */}
        {activeTab === "rewards" && (
          <div className="space-y-3">
            {MOCK_REWARDS.map((reward) => (
              <div
                key={reward.id}
                className={`bg-white rounded-2xl border border-gray-100 p-4 ${
                  !reward.isAvailable ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-primary/5 rounded-xl flex items-center justify-center text-2xl shrink-0">
                    {reward.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{reward.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{reward.description}</p>
                      </div>
                      {reward.expiresAt && (
                        <span className="text-xs text-gray-400 shrink-0">
                          Expires {reward.expiresAt}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-accent fill-accent" />
                        <span className="text-sm font-bold text-gray-900">
                          {reward.pointsCost.toLocaleString()} pts
                        </span>
                      </div>
                      {reward.isAvailable ? (
                        <button
                          onClick={() => handleRedeem(reward)}
                          disabled={currentPoints < reward.pointsCost}
                          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {currentPoints >= reward.pointsCost ? "Redeem" : "Not enough points"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {MOCK_HISTORY.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center justify-between px-5 py-4 ${
                  i > 0 ? "border-t border-gray-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      item.type === "earned" ? "bg-success/10" : "bg-primary/10"
                    }`}
                  >
                    {item.type === "earned" ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <Gift className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.description}</p>
                    <p className="text-xs text-gray-400">{item.date}</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold ${
                    item.type === "earned" ? "text-success" : "text-primary"
                  }`}
                >
                  {item.points > 0 ? "+" : ""}
                  {item.points}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tiers Tab */}
        {activeTab === "tiers" && (
          <div className="space-y-4">
            {(Object.entries(TIER_CONFIG) as [LoyaltyTier, (typeof TIER_CONFIG)[LoyaltyTier]][]).map(
              ([tier, config]) => {
                const Icon = config.icon;
                const isActive = tier === currentTier;
                return (
                  <div
                    key={tier}
                    className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                      isActive
                        ? `${config.borderColor} shadow-md`
                        : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className={`font-bold ${isActive ? config.color : "text-gray-900"}`}>
                          {config.label}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {config.minPoints.toLocaleString()}+ points
                        </p>
                      </div>
                      {isActive && (
                        <span className="ml-auto text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {config.benefits.map((benefit) => (
                        <div key={benefit} className="flex items-center gap-2">
                          <Check className={`w-3.5 h-3.5 ${isActive ? config.color : "text-gray-400"}`} />
                          <span className="text-sm text-gray-600">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
