import { describe, it, expect, beforeEach, jest } from "@jest/globals";

interface AIModel {
  id: string;
  name: string;
  version: string;
  type: "recommendation" | "prediction" | "nlp" | "pricing";
  accuracy: number;
  lastTrainedAt: Date;
  parameters: Record<string, any>;
}

interface RecommendationResult {
  itemId: string;
  score: number;
  confidence: number;
  explanation: string;
}

interface DemandPrediction {
  restaurantId: string;
  date: string;
  predictedOrders: number;
  confidence: number;
  factors: string[];
}

interface SurgePricing {
  restaurantId: string;
  multiplier: number;
  reason: string;
  validUntil: Date;
  affectedItems: string[];
}

function calculateItemAffinity(
  userOrderHistory: string[],
  menuItemCategories: Map<string, string[]>
): Map<string, number> {
  const categoryFrequency = new Map<string, number>();
  userOrderHistory.forEach((itemId) => {
    const categories = menuItemCategories.get(itemId) ?? [];
    categories.forEach((cat) => {
      categoryFrequency.set(cat, (categoryFrequency.get(cat) ?? 0) + 1);
    });
  });

  const total = Array.from(categoryFrequency.values()).reduce((s, v) => s + v, 0);
  const affinity = new Map<string, number>();
  categoryFrequency.forEach((count, category) => {
    affinity.set(category, count / total);
  });

  return affinity;
}

function predictDemand(
  historicalOrders: number[],
  dayOfWeek: number,
  weather: string,
  isHoliday: boolean
): DemandPrediction {
  const avg = historicalOrders.reduce((s, v) => s + v, 0) / historicalOrders.length;
  let multiplier = 1;

  if (dayOfWeek === 5 || dayOfWeek === 6) multiplier *= 1.3;
  if (weather === "rain") multiplier *= 1.2;
  if (weather === "snow") multiplier *= 1.5;
  if (isHoliday) multiplier *= 1.4;

  const predicted = Math.round(avg * multiplier);
  const confidence = Math.min(0.95, 0.6 + historicalOrders.length * 0.05);

  return {
    restaurantId: "",
    date: "",
    predictedOrders: predicted,
    confidence,
    factors: [
      dayOfWeek >= 5 ? "weekend" : "weekday",
      weather,
      isHoliday ? "holiday" : "regular",
    ],
  };
}

function calculateSurgePricing(
  currentDemand: number,
  averageDemand: number,
  driverAvailability: number,
  maxMultiplier: number = 2.0
): SurgePricing {
  let multiplier = 1;

  if (averageDemand > 0) {
    const demandRatio = currentDemand / averageDemand;
    if (demandRatio > 2) multiplier = Math.min(maxMultiplier, 1.5);
    else if (demandRatio > 1.5) multiplier = Math.min(maxMultiplier, 1.25);
    else if (demandRatio > 1.2) multiplier = Math.min(maxMultiplier, 1.1);
  }

  if (driverAvailability < 0.3) multiplier = Math.min(maxMultiplier, multiplier * 1.3);
  else if (driverAvailability < 0.5) multiplier = Math.min(maxMultiplier, multiplier * 1.15);

  return {
    restaurantId: "",
    multiplier: Math.round(multiplier * 100) / 100,
    reason: multiplier > 1 ? "High demand" : "Normal",
    validUntil: new Date(Date.now() + 30 * 60 * 1000),
    affectedItems: [],
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vectors must have same length");
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function generateFeatureVector(
  item: {
    price: number;
    rating: number;
    calories: number;
    spicyLevel: number;
    orderCount: number;
    category: string;
  },
  categoryIndex: Map<string, number>
): number[] {
  return [
    item.price / 50,
    item.rating / 5,
    item.calories / 1500,
    item.spicyLevel / 5,
    item.orderCount / 2000,
    (categoryIndex.get(item.category) ?? 0) / 10,
  ];
}

describe("AI Engine Unit Tests", () => {
  describe("Item Affinity Calculation", () => {
    it("should calculate category affinity from order history", () => {
      const history = ["item-1", "item-2", "item-3"];
      const categories = new Map([
        ["item-1", ["Pizza"]],
        ["item-2", ["Pizza", "Pasta"]],
        ["item-3", ["Salads"]],
      ]);

      const affinity = calculateItemAffinity(history, categories);
      expect(affinity.get("Pizza")).toBeCloseTo(0.67, 1);
      expect(affinity.get("Pasta")).toBeCloseTo(0.17, 1);
      expect(affinity.get("Salads")).toBeCloseTo(0.17, 1);
    });

    it("should handle empty order history", () => {
      const affinity = calculateItemAffinity([], new Map());
      expect(affinity.size).toBe(0);
    });

    it("should handle single item history", () => {
      const history = ["item-1"];
      const categories = new Map([["item-1", ["Pizza"]]]);
      const affinity = calculateItemAffinity(history, categories);
      expect(affinity.get("Pizza")).toBe(1);
    });

    it("should handle items with no categories", () => {
      const history = ["item-1"];
      const affinity = calculateItemAffinity(history, new Map());
      expect(affinity.size).toBe(0);
    });
  });

  describe("Demand Prediction", () => {
    it("should predict higher demand on weekends", () => {
      const history = [30, 35, 40, 32, 38];
      const weekday = predictDemand(history, 2, "sunny", false);
      const weekend = predictDemand(history, 6, "sunny", false);
      expect(weekend.predictedOrders).toBeGreaterThan(weekday.predictedOrders);
    });

    it("should predict higher demand in rain", () => {
      const history = [30, 35, 40, 32, 38];
      const sunny = predictDemand(history, 2, "sunny", false);
      const rainy = predictDemand(history, 2, "rain", false);
      expect(rainy.predictedOrders).toBeGreaterThan(sunny.predictedOrders);
    });

    it("should predict higher demand on holidays", () => {
      const history = [30, 35, 40, 32, 38];
      const regular = predictDemand(history, 2, "sunny", false);
      const holiday = predictDemand(history, 2, "sunny", true);
      expect(holiday.predictedOrders).toBeGreaterThan(regular.predictedOrders);
    });

    it("should increase confidence with more history", () => {
      const shortHistory = [30];
      const longHistory = [30, 35, 40, 32, 38, 45, 37, 42];
      const shortPred = predictDemand(shortHistory, 2, "sunny", false);
      const longPred = predictDemand(longHistory, 2, "sunny", false);
      expect(longPred.confidence).toBeGreaterThan(shortPred.confidence);
    });

    it("should cap confidence at 0.95", () => {
      const longHistory = Array(100).fill(30);
      const pred = predictDemand(longHistory, 2, "sunny", false);
      expect(pred.confidence).toBeLessThanOrEqual(0.95);
    });

    it("should handle empty history", () => {
      const pred = predictDemand([], 2, "sunny", false);
      expect(pred.predictedOrders).toBe(0);
    });
  });

  describe("Surge Pricing", () => {
    it("should not surge during normal demand", () => {
      const surge = calculateSurgePricing(30, 30, 0.8);
      expect(surge.multiplier).toBe(1);
    });

    it("should surge during high demand", () => {
      const surge = calculateSurgePricing(60, 30, 0.8);
      expect(surge.multiplier).toBeGreaterThan(1);
    });

    it("should surge more with low driver availability", () => {
      const highDrivers = calculateSurgePricing(45, 30, 0.8);
      const lowDrivers = calculateSurgePricing(45, 30, 0.2);
      expect(lowDrivers.multiplier).toBeGreaterThan(highDrivers.multiplier);
    });

    it("should respect maximum multiplier", () => {
      const surge = calculateSurgePricing(200, 10, 0.1, 1.5);
      expect(surge.multiplier).toBeLessThanOrEqual(1.5);
    });

    it("should use default max multiplier of 2.0", () => {
      const surge = calculateSurgePricing(200, 10, 0.1);
      expect(surge.multiplier).toBeLessThanOrEqual(2.0);
    });

    it("should round multiplier to 2 decimal places", () => {
      const surge = calculateSurgePricing(50, 30, 0.5);
      expect(surge.multiplier.toString().split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
    });

    it("should set valid until to 30 minutes", () => {
      const before = Date.now();
      const surge = calculateSurgePricing(50, 30, 0.5);
      const expected = before + 30 * 60 * 1000;
      expect(surge.validUntil.getTime()).toBeGreaterThanOrEqual(expected - 1000);
      expect(surge.validUntil.getTime()).toBeLessThanOrEqual(expected + 1000);
    });
  });

  describe("Cosine Similarity", () => {
    it("should return 1 for identical vectors", () => {
      const sim = cosineSimilarity([1, 2, 3], [1, 2, 3]);
      expect(sim).toBeCloseTo(1, 5);
    });

    it("should return 0 for orthogonal vectors", () => {
      const sim = cosineSimilarity([1, 0], [0, 1]);
      expect(sim).toBeCloseTo(0, 5);
    });

    it("should return -1 for opposite vectors", () => {
      const sim = cosineSimilarity([1, 1], [-1, -1]);
      expect(sim).toBeCloseTo(-1, 5);
    });

    it("should handle zero vectors", () => {
      const sim = cosineSimilarity([0, 0], [1, 1]);
      expect(sim).toBe(0);
    });

    it("should throw for mismatched lengths", () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
        "Vectors must have same length"
      );
    });

    it("should calculate partial similarity", () => {
      const sim = cosineSimilarity([1, 2, 3], [2, 4, 6]);
      expect(sim).toBeCloseTo(1, 5);
    });
  });

  describe("Feature Vector Generation", () => {
    it("should generate normalized feature vector", () => {
      const categoryIndex = new Map([["Pizza", 0]]);
      const vector = generateFeatureVector(
        {
          price: 12.99,
          rating: 4.5,
          calories: 800,
          spicyLevel: 1,
          orderCount: 1200,
          category: "Pizza",
        },
        categoryIndex
      );

      expect(vector).toHaveLength(6);
      vector.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      });
    });

    it("should normalize price correctly", () => {
      const categoryIndex = new Map([["Pizza", 0]]);
      const vector = generateFeatureVector(
        {
          price: 25,
          rating: 4,
          calories: 600,
          spicyLevel: 2,
          orderCount: 500,
          category: "Pizza",
        },
        categoryIndex
      );

      expect(vector[0]).toBeCloseTo(0.5, 2);
    });

    it("should normalize rating correctly", () => {
      const categoryIndex = new Map([["Pizza", 0]]);
      const vector = generateFeatureVector(
        {
          price: 10,
          rating: 5,
          calories: 500,
          spicyLevel: 0,
          orderCount: 100,
          category: "Pizza",
        },
        categoryIndex
      );

      expect(vector[1]).toBe(1);
    });
  });

  describe("Model Evaluation", () => {
    it("should calculate precision", () => {
      const recommended = ["item-1", "item-2", "item-3", "item-4", "item-5"];
      const relevant = ["item-1", "item-2", "item-3"];
      const relevantAndRecommended = recommended.filter((r) =>
        relevant.includes(r)
      );

      const precision = relevantAndRecommended.length / recommended.length;
      expect(precision).toBe(0.6);
    });

    it("should calculate recall", () => {
      const recommended = ["item-1", "item-2", "item-3"];
      const relevant = ["item-1", "item-2", "item-3", "item-4", "item-5"];
      const relevantAndRecommended = recommended.filter((r) =>
        relevant.includes(r)
      );

      const recall = relevantAndRecommended.length / relevant.length;
      expect(recall).toBe(0.6);
    });

    it("should calculate F1 score", () => {
      const precision = 0.6;
      const recall = 0.6;
      const f1 = (2 * precision * recall) / (precision + recall);
      expect(f1).toBeCloseTo(0.6, 5);
    });

    it("should handle zero precision gracefully", () => {
      const precision = 0;
      const recall = 0.5;
      const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
      expect(f1).toBe(0);
    });
  });

  describe("Recommendation Diversity", () => {
    it("should calculate category diversity", () => {
      const recommendations = [
        { category: "Pizza" },
        { category: "Pizza" },
        { category: "Pasta" },
        { category: "Salads" },
      ];
      const uniqueCategories = new Set(recommendations.map((r) => r.category));
      const diversity = uniqueCategories.size / recommendations.length;
      expect(diversity).toBeCloseTo(0.75, 2);
    });

    it("should penalize too many same-category items", () => {
      const allSame = [{ category: "Pizza" }, { category: "Pizza" }];
      const diverse = [{ category: "Pizza" }, { category: "Pasta" }];

      const sameDiv = new Set(allSame.map((r) => r.category)).size / allSame.length;
      const divDiv = new Set(diverse.map((r) => r.category)).size / diverse.length;

      expect(divDiv).toBeGreaterThan(sameDiv);
    });
  });
});
