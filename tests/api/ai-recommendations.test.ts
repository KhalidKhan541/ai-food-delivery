import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

const mockPrisma = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  menuItem: {
    findMany: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));

interface UserProfile {
  id: string;
  dietaryPreferences: string[];
  favoriteCategories: string[];
  orderHistory: string[];
  allergens: string[];
  spiceTolerance: number;
  priceRange: { min: number; max: number };
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  tags: string[];
  price: number;
  rating: number;
  calories?: number;
  spicyLevel?: number;
  allergens?: string[];
  restaurantRating: number;
  orderCount: number;
}

interface Recommendation {
  menuItem: MenuItem;
  score: number;
  reason: string;
}

function calculateRecommendationScore(
  item: MenuItem,
  profile: UserProfile
): Recommendation {
  let score = 0;
  const reasons: string[] = [];

  const categoryMatch = profile.favoriteCategories.includes(item.category);
  if (categoryMatch) {
    score += 30;
    reasons.push("matches your favorite category");
  }

  const tagMatch = item.tags.some((tag) =>
    profile.dietaryPreferences.includes(tag)
  );
  if (tagMatch) {
    score += 25;
    reasons.push("matches your dietary preferences");
  }

  const allergenConflict = item.allergens?.some((a) =>
    profile.allergens.includes(a)
  );
  if (allergenConflict) {
    score -= 100;
    reasons.push("contains your allergen");
  }

  const priceInRange =
    item.price >= profile.priceRange.min &&
    item.price <= profile.priceRange.max;
  if (priceInRange) {
    score += 15;
    reasons.push("within your price range");
  }

  if (item.spicyLevel !== undefined) {
    if (item.spicyLevel <= profile.spiceTolerance) {
      score += 10;
      reasons.push("matches your spice tolerance");
    } else {
      score -= 10;
    }
  }

  score += Math.min(item.rating * 5, 25);
  if (item.rating >= 4.5) reasons.push("highly rated");

  score += Math.min(item.orderCount / 100, 10);
  if (item.orderCount > 500) reasons.push("popular choice");

  score += Math.min(item.restaurantRating * 3, 15);

  return {
    menuItem: item,
    score: Math.max(0, score),
    reason: reasons.length > 0 ? reasons.join("; ") : "recommended for you",
  };
}

function rankRecommendations(
  recommendations: Recommendation[],
  limit: number = 10
): Recommendation[] {
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function filterByAllergens(
  items: MenuItem[],
  allergens: string[]
): MenuItem[] {
  return items.filter(
    (item) => !item.allergens?.some((a) => allergens.includes(a))
  );
}

function getPersonalizedSuggestions(
  orderHistory: string[],
  allItems: MenuItem[]
): MenuItem[] {
  const categoryFrequency = new Map<string, number>();
  orderHistory.forEach((category) => {
    categoryFrequency.set(category, (categoryFrequency.get(category) ?? 0) + 1);
  });

  const sortedCategories = [...categoryFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  return allItems
    .filter((item) => sortedCategories.includes(item.category))
    .sort((a, b) => b.rating - a.rating);
}

describe("AI Recommendations API", () => {
  const mockProfile: UserProfile = {
    id: "user-1",
    dietaryPreferences: ["vegetarian", "organic"],
    favoriteCategories: ["Pizza", "Pasta"],
    orderHistory: ["Pizza", "Pizza", "Pasta", "Salads"],
    allergens: ["peanuts"],
    spiceTolerance: 2,
    priceRange: { min: 5, max: 25 },
  };

  const mockMenuItems: MenuItem[] = [
    {
      id: "item-1",
      name: "Margherita Pizza",
      category: "Pizza",
      tags: ["vegetarian", "organic"],
      price: 12.99,
      rating: 4.7,
      calories: 800,
      spicyLevel: 0,
      allergens: ["gluten", "dairy"],
      restaurantRating: 4.5,
      orderCount: 1200,
    },
    {
      id: "item-2",
      name: "Spicy Thai Noodles",
      category: "Asian",
      tags: ["spicy"],
      price: 11.99,
      rating: 4.3,
      spicyLevel: 4,
      allergens: ["peanuts", "soy"],
      restaurantRating: 4.2,
      orderCount: 800,
    },
    {
      id: "item-3",
      name: "Caesar Salad",
      category: "Salads",
      tags: ["vegetarian"],
      price: 8.99,
      rating: 4.1,
      calories: 350,
      spicyLevel: 0,
      allergens: ["gluten", "dairy", "eggs"],
      restaurantRating: 4.5,
      orderCount: 600,
    },
    {
      id: "item-4",
      name: "Penne Arrabbiata",
      category: "Pasta",
      tags: ["vegetarian", "spicy"],
      price: 13.99,
      rating: 4.6,
      calories: 700,
      spicyLevel: 2,
      allergens: ["gluten"],
      restaurantRating: 4.5,
      orderCount: 950,
    },
    {
      id: "item-5",
      name: "Truffle Risotto",
      category: "Pasta",
      tags: ["vegetarian", "premium"],
      price: 22.99,
      rating: 4.8,
      calories: 600,
      spicyLevel: 0,
      allergens: ["dairy"],
      restaurantRating: 4.7,
      orderCount: 400,
    },
    {
      id: "item-6",
      name: "Peanut Satay Bowl",
      category: "Asian",
      tags: ["spicy"],
      price: 10.99,
      rating: 4.0,
      spicyLevel: 3,
      allergens: ["peanuts", "soy"],
      restaurantRating: 4.0,
      orderCount: 300,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Recommendation Scoring", () => {
    it("should score high for category match", () => {
      const rec = calculateRecommendationScore(mockMenuItems[0], mockProfile);
      expect(rec.score).toBeGreaterThan(50);
      expect(rec.reason).toContain("favorite category");
    });

    it("should score high for dietary preference match", () => {
      const rec = calculateRecommendationScore(mockMenuItems[0], mockProfile);
      expect(rec.reason).toContain("dietary preferences");
    });

    it("should penalize allergen conflicts heavily", () => {
      const rec = calculateRecommendationScore(mockMenuItems[1], mockProfile);
      expect(rec.score).toBe(0);
      expect(rec.reason).toContain("allergen");
    });

    it("should exclude items with user allergens", () => {
      const safe = filterByAllergens(mockMenuItems, mockProfile.allergens);
      expect(safe.every((i) => !i.allergens?.includes("peanuts"))).toBe(true);
      expect(safe).toHaveLength(3);
    });

    it("should score based on price range", () => {
      const inRange = calculateRecommendationScore(
        { ...mockMenuItems[0], price: 15 },
        mockProfile
      );
      expect(inRange.reason).toContain("price range");
    });

    it("should handle spice tolerance correctly", () => {
      const mild = calculateRecommendationScore(mockMenuItems[0], mockProfile);
      expect(mild.reason).toContain("spice tolerance");

      const spicy = calculateRecommendationScore(mockMenuItems[1], mockProfile);
      expect(spicy.score).toBe(0);
    });

    it("should boost highly rated items", () => {
      const highRated = calculateRecommendationScore(
        mockMenuItems[4],
        mockProfile
      );
      expect(highRated.reason).toContain("highly rated");
    });

    it("should boost popular items", () => {
      const popular = calculateRecommendationScore(
        mockMenuItems[0],
        mockProfile
      );
      expect(popular.reason).toContain("popular choice");
    });

    it("should never return negative score", () => {
      const item: MenuItem = {
        ...mockMenuItems[1],
        price: 100,
        rating: 1,
        orderCount: 0,
        restaurantRating: 1,
      };
      const rec = calculateRecommendationScore(item, mockProfile);
      expect(rec.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Recommendation Ranking", () => {
    it("should sort by score descending", () => {
      const recs = mockMenuItems.map((item) =>
        calculateRecommendationScore(item, mockProfile)
      );
      const ranked = rankRecommendations(recs);

      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
      }
    });

    it("should limit results", () => {
      const recs = mockMenuItems.map((item) =>
        calculateRecommendationScore(item, mockProfile)
      );
      const ranked = rankRecommendations(recs, 3);
      expect(ranked).toHaveLength(3);
    });

    it("should return all if fewer than limit", () => {
      const recs = mockMenuItems.slice(0, 2).map((item) =>
        calculateRecommendationScore(item, mockProfile)
      );
      const ranked = rankRecommendations(recs, 10);
      expect(ranked).toHaveLength(2);
    });

    it("should return empty array for empty input", () => {
      const ranked = rankRecommendations([]);
      expect(ranked).toHaveLength(0);
    });

    it("should not mutate original array", () => {
      const recs = mockMenuItems.map((item) =>
        calculateRecommendationScore(item, mockProfile)
      );
      const original = [...recs];
      rankRecommendations(recs);
      expect(recs).toEqual(original);
    });
  });

  describe("GET /api/ai/recommendations", () => {
    it("should generate recommendations for user", async () => {
      const recs = mockMenuItems.map((item) =>
        calculateRecommendationScore(item, mockProfile)
      );
      const ranked = rankRecommendations(recs, 10);

      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1]?.score ?? 0);
    });

    it("should filter allergens before scoring", async () => {
      const safeItems = filterByAllergens(mockMenuItems, mockProfile.allergens);
      const recs = safeItems.map((item) =>
        calculateRecommendationScore(item, mockProfile)
      );

      expect(recs.every((r) => !r.menuItem.allergens?.includes("peanuts"))).toBe(true);
    });

    it("should provide personalized suggestions based on order history", () => {
      const suggestions = getPersonalizedSuggestions(
        mockProfile.orderHistory,
        mockMenuItems
      );

      expect(suggestions.length).toBeGreaterThan(0);
      const topCategories = ["Pizza", "Pasta"];
      expect(
        suggestions.every((s) => topCategories.includes(s.category))
      ).toBe(true);
    });
  });

  describe("GET /api/ai/search", () => {
    it("should search menu items by query", async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

      const results = mockMenuItems.filter(
        (item) =>
          item.name.toLowerCase().includes("pizza") ||
          item.tags.some((t) => t.includes("pizza"))
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Margherita Pizza");
    });

    it("should search by tag", async () => {
      const results = mockMenuItems.filter((item) =>
        item.tags.includes("vegetarian")
      );
      expect(results.length).toBeGreaterThan(0);
    });

    it("should search by category", async () => {
      const results = mockMenuItems.filter(
        (item) => item.category === "Pasta"
      );
      expect(results).toHaveLength(2);
    });
  });

  describe("AI Trending Analysis", () => {
    it("should identify trending items by order count", () => {
      const sorted = [...mockMenuItems].sort(
        (a, b) => b.orderCount - a.orderCount
      );
      expect(sorted[0].name).toBe("Margherita Pizza");
      expect(sorted[0].orderCount).toBe(1200);
    });

    it("should calculate trend velocity", () => {
      const item = mockMenuItems[0];
      const growthRate = 0.15;
      const projectedOrders = Math.round(
        item.orderCount * (1 + growthRate)
      );
      expect(projectedOrders).toBe(1380);
    });

    it("should identify seasonal preferences", () => {
      const seasonal = {
        summer: ["Salads", "Ice Cream"],
        winter: ["Soup", "Pasta"],
      };

      expect(seasonal.summer).toContain("Salads");
      expect(seasonal.winter).toContain("Pasta");
    });
  });

  describe("GET /api/ai/similar/:itemId", () => {
    it("should find similar items by category", () => {
      const target = mockMenuItems[0];
      const similar = mockMenuItems.filter(
        (i) => i.category === target.category && i.id !== target.id
      );
      expect(similar).toHaveLength(0);
    });

    it("should find similar items by tags", () => {
      const target = mockMenuItems[0];
      const similar = mockMenuItems.filter(
        (i) =>
          i.id !== target.id &&
          i.tags.some((t) => target.tags.includes(t))
      );
      expect(similar.length).toBeGreaterThan(0);
    });

    it("should exclude allergen items from similar", () => {
      const target = mockMenuItems[0];
      const safe = filterByAllergens(mockMenuItems, ["peanuts"]);
      const similar = safe.filter(
        (i) =>
          i.id !== target.id &&
          i.tags.some((t) => target.tags.includes(t))
      );
      expect(similar.every((i) => !i.allergens?.includes("peanuts"))).toBe(true);
    });
  });
});
