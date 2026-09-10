import { z } from "zod";
import { getAIProvider, type ChatMessage } from "../ai/provider";

// --- Types ----------------------------------------------------------------

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface LoyaltyProfile {
  userId: string;
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  joinedAt: Date;
  lastActivityAt: Date;
  referrals: number;
  streakDays: number;
  lastOrderDate?: Date;
  expiringPoints: ExpiringPoints[];
  badges: Badge[];
}

export interface ExpiringPoints {
  points: number;
  expiresAt: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: Date;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface PointsTransaction {
  id: string;
  userId: string;
  type: PointsType;
  amount: number;
  balance: number;
  description: string;
  orderId?: string;
  referenceId?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export type PointsType = "earned" | "redeemed" | "bonus" | "referral" | "expired" | "adjusted" | "streak_bonus";

export interface Reward {
  id: string;
  name: string;
  description: string;
  category: RewardCategory;
  pointsCost: number;
  cashValue: number;
  imageUrl?: string;
  isActive: boolean;
  stock: number;
  maxPerUser: number;
  validFrom: Date;
  validUntil: Date;
  terms: string[];
  requiredTier: LoyaltyTier;
}

export type RewardCategory = "discount" | "free_item" | "free_delivery" | "exclusive" | "partner" | "experience";

export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  pointsSpent: number;
  status: "pending" | "fulfilled" | "expired" | "cancelled";
  redeemedAt: Date;
  fulfilledAt?: Date;
  code?: string;
  expiresAt: Date;
}

export interface TierBenefit {
  tier: LoyaltyTier;
  pointsMultiplier: number;
  freeDeliveriesPerMonth: number;
  exclusiveOffers: boolean;
  earlyAccess: boolean;
  prioritySupport: boolean;
  birthdayBonus: number;
  minimumOrderDiscount: number;
  maxDiscountAmount: number;
}

export interface ReferralProgram {
  referrerBonus: number;
  refereeBonus: number;
  maxReferrals: number;
  validDays: number;
  codePrefix: string;
}

export interface LoyaltyAnalytics {
  totalMembers: number;
  membersByTier: Record<LoyaltyTier, number>;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  activeRate: number;
  averagePointsPerMember: number;
  topRewards: Array<{ rewardId: string; name: string; redemptions: number }>;
  monthlyActivity: Array<{ month: string; newMembers: number; pointsIssued: number; pointsRedeemed: number }>;
}

// --- Constants ------------------------------------------------------------

const TIER_CONFIG: Record<LoyaltyTier, TierBenefit> = {
  bronze: {
    tier: "bronze", pointsMultiplier: 1, freeDeliveriesPerMonth: 0,
    exclusiveOffers: false, earlyAccess: false, prioritySupport: false,
    birthdayBonus: 50, minimumOrderDiscount: 0, maxDiscountAmount: 0,
  },
  silver: {
    tier: "silver", pointsMultiplier: 1.2, freeDeliveriesPerMonth: 1,
    exclusiveOffers: false, earlyAccess: false, prioritySupport: false,
    birthdayBonus: 100, minimumOrderDiscount: 5, maxDiscountAmount: 3,
  },
  gold: {
    tier: "gold", pointsMultiplier: 1.5, freeDeliveriesPerMonth: 3,
    exclusiveOffers: true, earlyAccess: false, prioritySupport: false,
    birthdayBonus: 200, minimumOrderDiscount: 10, maxDiscountAmount: 5,
  },
  platinum: {
    tier: "platinum", pointsMultiplier: 2, freeDeliveriesPerMonth: 5,
    exclusiveOffers: true, earlyAccess: true, prioritySupport: true,
    birthdayBonus: 500, minimumOrderDiscount: 15, maxDiscountAmount: 10,
  },
  diamond: {
    tier: "diamond", pointsMultiplier: 3, freeDeliveriesPerMonth: 999,
    exclusiveOffers: true, earlyAccess: true, prioritySupport: true,
    birthdayBonus: 1000, minimumOrderDiscount: 20, maxDiscountAmount: 15,
  },
};

const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
  diamond: 15000,
};

const TIER_ORDER: LoyaltyTier[] = ["bronze", "silver", "gold", "platinum", "diamond"];

// --- Validation -----------------------------------------------------------

const redeemPointsSchema = z.object({
  userId: z.string().uuid(),
  rewardId: z.string().uuid(),
});

// --- Loyalty Service ------------------------------------------------------

export class LoyaltyService {
  private provider = getAIProvider();
  private profiles = new Map<string, LoyaltyProfile>();
  private transactions = new Map<string, PointsTransaction[]>();
  private rewards = new Map<string, Reward>();
  private redemptions = new Map<string, RewardRedemption[]>();
  private referralCodes = new Map<string, string>();

  constructor() {
    this.initializeDefaultRewards();
  }

  private initializeDefaultRewards(): void {
    const defaults: Reward[] = [
      { id: "r1", name: "$2 Off", description: "$2 discount on your next order", category: "discount", pointsCost: 200, cashValue: 2, isActive: true, stock: 999, maxPerUser: 5, validFrom: new Date(), validUntil: new Date(Date.now() + 365 * 86400000), terms: ["Min order $10"], requiredTier: "bronze" },
      { id: "r2", name: "$5 Off", description: "$5 discount on your next order", category: "discount", pointsCost: 450, cashValue: 5, isActive: true, stock: 999, maxPerUser: 3, validFrom: new Date(), validUntil: new Date(Date.now() + 365 * 86400000), terms: ["Min order $15"], requiredTier: "bronze" },
      { id: "r3", name: "Free Delivery", description: "Free delivery on your next order", category: "free_delivery", pointsCost: 150, cashValue: 3, isActive: true, stock: 999, maxPerUser: 10, validFrom: new Date(), validUntil: new Date(Date.now() + 365 * 86400000), terms: [], requiredTier: "bronze" },
      { id: "r4", name: "Free Dessert", description: "Complimentary dessert with any main course", category: "free_item", pointsCost: 300, cashValue: 4, isActive: true, stock: 50, maxPerUser: 2, validFrom: new Date(), validUntil: new Date(Date.now() + 180 * 86400000), terms: ["Select restaurants only"], requiredTier: "silver" },
      { id: "r5", name: "VIP Early Access", description: "24-hour early access to new restaurant launches", category: "exclusive", pointsCost: 1000, cashValue: 0, isActive: true, stock: 100, maxPerUser: 1, validFrom: new Date(), validUntil: new Date(Date.now() + 90 * 86400000), terms: ["Platinum+ only"], requiredTier: "platinum" },
      { id: "r6", name: "$10 Off Premium", description: "$10 discount on premium restaurants", category: "discount", pointsCost: 800, cashValue: 10, isActive: true, stock: 200, maxPerUser: 2, validFrom: new Date(), validUntil: new Date(Date.now() + 180 * 86400000), terms: ["Min order $30", "Premium restaurants only"], requiredTier: "gold" },
    ];
    for (const reward of defaults) this.rewards.set(reward.id, reward);
  }

  getOrCreateProfile(userId: string): LoyaltyProfile {
    let profile = this.profiles.get(userId);
    if (profile) return profile;
    profile = {
      userId,
      points: 0,
      lifetimePoints: 0,
      tier: "bronze",
      joinedAt: new Date(),
      lastActivityAt: new Date(),
      referrals: 0,
      streakDays: 0,
      expiringPoints: [],
      badges: [],
    };
    this.profiles.set(userId, profile);
    this.transactions.set(userId, []);
    this.redemptions.set(userId, []);
    return profile;
  }

  earnPoints(userId: string, amount: number, type: PointsType, description: string, orderId?: string): PointsTransaction {
    const profile = this.getOrCreateProfile(userId);
    const benefit = TIER_CONFIG[profile.tier];
    const actualAmount = Math.round(amount * benefit.pointsMultiplier);

    const transaction: PointsTransaction = {
      id: crypto.randomUUID(),
      userId,
      type,
      amount: actualAmount,
      balance: profile.points + actualAmount,
      description,
      orderId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 86400000),
    };

    profile.points += actualAmount;
    profile.lifetimePoints += actualAmount;
    profile.lastActivityAt = new Date();

    if (orderId) profile.lastOrderDate = new Date();
    this.updateStreak(profile);
    this.checkTierUpgrade(profile);
    this.checkBadges(profile);

    const txs = this.transactions.get(userId) ?? [];
    txs.push(transaction);
    this.transactions.set(userId, txs);

    return transaction;
  }

  redeemPoints(userId: string, pointsCost: number, description: string, referenceId?: string): PointsTransaction | null {
    const profile = this.getOrCreateProfile(userId);
    if (profile.points < pointsCost) return null;

    const transaction: PointsTransaction = {
      id: crypto.randomUUID(),
      userId,
      type: "redeemed",
      amount: -pointsCost,
      balance: profile.points - pointsCost,
      description,
      referenceId,
      createdAt: new Date(),
    };

    profile.points -= pointsCost;
    profile.lastActivityAt = new Date();

    const txs = this.transactions.get(userId) ?? [];
    txs.push(transaction);
    this.transactions.set(userId, txs);

    return transaction;
  }

  async redeemReward(userId: string, rewardId: string): Promise<RewardRedemption | null> {
    const validated = redeemPointsSchema.parse({ userId, rewardId });
    const profile = this.getOrCreateProfile(userId);
    const reward = this.rewards.get(validated.rewardId);
    if (!reward || !reward.isActive) return null;
    if (reward.stock <= 0) return null;
    if (profile.points < reward.pointsCost) return null;
    if (!this.meetsTierRequirement(profile.tier, reward.requiredTier)) return null;

    const userRedemptions = this.redemptions.get(userId) ?? [];
    const userRedemptionCount = userRedemptions.filter((r) => r.rewardId === validated.rewardId && r.status !== "cancelled").length;
    if (userRedemptionCount >= reward.maxPerUser) return null;

    const now = new Date();
    if (now < reward.validFrom || now > reward.validUntil) return null;

    this.redeemPoints(userId, reward.pointsCost, `Redeemed: ${reward.name}`, validated.rewardId);

    const redemption: RewardRedemption = {
      id: crypto.randomUUID(),
      userId,
      rewardId: validated.rewardId,
      pointsSpent: reward.pointsCost,
      status: "pending",
      redeemedAt: now,
      code: this.generateRedemptionCode(),
      expiresAt: new Date(now.getTime() + 30 * 86400000),
    };

    reward.stock--;
    userRedemptions.push(redemption);
    this.redemptions.set(userId, userRedemptions);

    return redemption;
  }

  async getAIRecommendations(userId: string): Promise<string> {
    const profile = this.getOrCreateProfile(userId);
    const messages: ChatMessage[] = [
      { role: "system", content: "You are a loyalty program advisor. Recommend the best way for the user to earn or spend their points. Be specific and encouraging. 2-3 sentences." },
      {
        role: "user",
        content: JSON.stringify({
          points: profile.points,
          tier: profile.tier,
          lifetimePoints: profile.lifetimePoints,
          streakDays: profile.streakDays,
          availableRewards: [...this.rewards.values()].filter((r) => r.isActive && r.stock > 0).map((r) => ({ name: r.name, cost: r.pointsCost, value: r.cashValue, category: r.category })),
        }),
      },
    ];

    try {
      const res = await this.provider.complete({ messages, temperature: 0.6, maxTokens: 200 });
      return res.content;
    } catch {
      const affordable = [...this.rewards.values()].filter((r) => r.isActive && r.stock > 0 && r.pointsCost <= profile.points);
      if (affordable.length) {
        return `With ${profile.points} points, you can redeem "${affordable[0].name}" for ${affordable[0].cashValue ? `$${affordable[0].cashValue} off` : 'exclusive perks'}. Keep earning to reach ${TIER_ORDER[TIER_ORDER.indexOf(profile.tier) + 1] ?? "Diamond"} tier!`;
      }
      return `You have ${profile.points} points. Keep ordering to earn more and unlock exciting rewards!`;
    }
  }

  createReferralCode(userId: string): string {
    const existing = this.referralCodes.get(userId);
    if (existing) return existing;
    const code = `FOODIE${userId.slice(0, 4).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    this.referralCodes.set(userId, code);
    return code;
  }

  processReferral(referrerUserId: string, refereeUserId: string, program: ReferralProgram): { referrerBonus: PointsTransaction; refereeBonus: PointsTransaction } | null {
    const referrerProfile = this.getOrCreateProfile(referrerUserId);
    if (referrerProfile.referrals >= program.maxReferrals) return null;

    referrerProfile.referrals++;
    const referrerBonus = this.earnPoints(referrerUserId, program.referrerBonus, "referral", `Referral bonus for inviting a friend`);
    const refereeBonus = this.earnPoints(refereeUserId, program.refereeBonus, "referral", "Welcome bonus from referral");
    return { referrerBonus, refereeBonus };
  }

  getAvailableRewards(userId: string): Reward[] {
    const profile = this.getOrCreateProfile(userId);
    return [...this.rewards.values()].filter((r) => {
      if (!r.isActive || r.stock <= 0) return false;
      const now = new Date();
      if (now < r.validFrom || now > r.validUntil) return false;
      if (profile.points < r.pointsCost) return false;
      if (!this.meetsTierRequirement(profile.tier, r.requiredTier)) return false;
      const userRedemptions = this.redemptions.get(userId) ?? [];
      const count = userRedemptions.filter((red) => red.rewardId === r.id && red.status !== "cancelled").length;
      return count < r.maxPerUser;
    });
  }

  getPointsHistory(userId: string): PointsTransaction[] {
    return this.transactions.get(userId) ?? [];
  }

  getRedemptionHistory(userId: string): RewardRedemption[] {
    return this.redemptions.get(userId) ?? [];
  }

  getTierBenefits(tier: LoyaltyTier): TierBenefit {
    return TIER_CONFIG[tier];
  }

  getPointsToNextTier(userId: string): { currentTier: LoyaltyTier; nextTier: LoyaltyTier | null; pointsNeeded: number; progress: number } {
    const profile = this.getOrCreateProfile(userId);
    const currentIdx = TIER_ORDER.indexOf(profile.tier);
    const nextTier = currentIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentIdx + 1] : null;
    if (!nextTier) return { currentTier: profile.tier, nextTier: null, pointsNeeded: 0, progress: 1 };
    const currentThreshold = TIER_THRESHOLDS[profile.tier];
    const nextThreshold = TIER_THRESHOLDS[nextTier];
    const pointsNeeded = nextThreshold - profile.lifetimePoints;
    const progress = (profile.lifetimePoints - currentThreshold) / (nextThreshold - currentThreshold);
    return { currentTier: profile.tier, nextTier, pointsNeeded: Math.max(0, pointsNeeded), progress: Math.min(Math.max(progress, 0), 1) };
  }

  async getLoyaltyAnalytics(): Promise<LoyaltyAnalytics> {
    const profiles = [...this.profiles.values()];
    const membersByTier: Record<LoyaltyTier, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
    profiles.forEach((p) => membersByTier[p.tier]++);

    let totalIssued = 0;
    let totalRedeemed = 0;
    for (const txs of this.transactions.values()) {
      for (const tx of txs) {
        if (tx.amount > 0) totalIssued += tx.amount;
        if (tx.type === "redeemed") totalRedeemed += Math.abs(tx.amount);
      }
    }

    const allRedemptions = [...this.redemptions.values()].flat();
    const rewardCounts = new Map<string, number>();
    allRedemptions.forEach((r) => rewardCounts.set(r.rewardId, (rewardCounts.get(r.rewardId) ?? 0) + 1));
    const topRewards = [...rewardCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => {
      const reward = this.rewards.get(id);
      return { rewardId: id, name: reward?.name ?? "Unknown", redemptions: count };
    });

    return {
      totalMembers: profiles.length,
      membersByTier,
      totalPointsIssued: totalIssued,
      totalPointsRedeemed: totalRedeemed,
      activeRate: profiles.length ? Math.round((profiles.filter((p) => Date.now() - p.lastActivityAt.getTime() < 30 * 86400000).length / profiles.length) * 100) : 0,
      averagePointsPerMember: profiles.length ? Math.round(totalIssued / profiles.length) : 0,
      topRewards,
      monthlyActivity: [],
    };
  }

  private updateStreak(profile: LoyaltyProfile): void {
    const now = new Date();
    const lastOrder = profile.lastOrderDate;
    if (!lastOrder) { profile.streakDays = 1; return; }
    const diffDays = Math.floor((now.getTime() - lastOrder.getTime()) / 86400000);
    if (diffDays === 1) profile.streakDays++;
    else if (diffDays > 1) profile.streakDays = 1;
  }

  private checkTierUpgrade(profile: LoyaltyProfile): void {
    const currentIdx = TIER_ORDER.indexOf(profile.tier);
    for (let i = TIER_ORDER.length - 1; i > currentIdx; i--) {
      const tier = TIER_ORDER[i];
      if (profile.lifetimePoints >= TIER_THRESHOLDS[tier]) {
        profile.tier = tier;
        break;
      }
    }
  }

  private meetsTierRequirement(current: LoyaltyTier, required: LoyaltyTier): boolean {
    return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(required);
  }

  private checkBadges(profile: LoyaltyProfile): void {
    const existingIds = new Set(profile.badges.map((b) => b.id));
    const newBadges: Badge[] = [];
    if (profile.lifetimePoints >= 100 && !existingIds.has("first_order")) {
      newBadges.push({ id: "first_order", name: "First Order", description: "Earned your first 100 points", iconUrl: "/badges/first-order.png", earnedAt: new Date(), rarity: "common" });
    }
    if (profile.streakDays >= 7 && !existingIds.has("week_warrior")) {
      newBadges.push({ id: "week_warrior", name: "Week Warrior", description: "7-day ordering streak", iconUrl: "/badges/week-warrior.png", earnedAt: new Date(), rarity: "uncommon" });
    }
    if (profile.lifetimePoints >= 5000 && !existingIds.has("point_master")) {
      newBadges.push({ id: "point_master", name: "Point Master", description: "Earned 5,000 lifetime points", iconUrl: "/badges/point-master.png", earnedAt: new Date(), rarity: "rare" });
    }
    if (profile.tier === "diamond" && !existingIds.has("diamond_status")) {
      newBadges.push({ id: "diamond_status", name: "Diamond Elite", description: "Reached Diamond tier", iconUrl: "/badges/diamond.png", earnedAt: new Date(), rarity: "legendary" });
    }
    profile.badges.push(...newBadges);
  }

  private generateRedemptionCode(): string {
    return `RWD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
}

export const loyaltyService = new LoyaltyService();
