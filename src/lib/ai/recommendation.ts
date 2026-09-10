import { z } from "zod";
import { getAIProvider, type ChatMessage } from "./provider";

// --- Types ----------------------------------------------------------------

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string[];
  rating: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  priceRange: 1 | 2 | 3 | 4;
  latitude: number;
  longitude: number;
  menu: MenuItem[];
  tags: string[];
  isActive: boolean;
  avgOrderValue: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  allergens: string[];
  calories?: number;
  isAvailable: boolean;
  popularityScore: number;
}

export interface UserPreferences {
  userId: string;
  favoriteCuisines: string[];
  dietaryRestrictions: string[];
  allergens: string[];
  pricePreference: 1 | 2 | 3 | 4;
  orderHistory: OrderHistoryEntry[];
  location: { latitude: number; longitude: number };
  recentSearches: string[];
}

export interface OrderHistoryEntry {
  restaurantId: string;
  restaurantName: string;
  items: string[];
  rating?: number;
  timestamp: Date;
  totalAmount: number;
}

export interface RecommendationRequest {
  userId: string;
  preferences: UserPreferences;
  restaurants: Restaurant[];
  context?: "lunch" | "dinner" | "snack" | "late_night" | "breakfast";
  mood?: string;
  budget?: { min: number; max: number };
  dietaryOverride?: string[];
  limit?: number;
}

export interface RecommendationResult {
  restaurantId: string;
  restaurantName: string;
  score: number;
  reason: string;
  suggestedItems: string[];
  estimatedDeliveryTime: number;
  estimatedPrice: number;
  confidence: number;
}

export interface FoodSearchResult {
  restaurantId: string;
  restaurantName: string;
  menuItem: MenuItem;
  relevanceScore: number;
  matchReason: string;
}

// --- Validation -----------------------------------------------------------

const recommendationRequestSchema = z.object({
  userId: z.string().uuid(),
  preferences: z.object({ favoriteCuisines: z.array(z.string()), dietaryRestrictions: z.array(z.string()), allergens: z.array(z.string()), pricePreference: z.number().int().min(1).max(4) }),
  restaurants: z.array(z.object({ id: z.string(), isActive: z.boolean() })).min(1),
  limit: z.number().int().min(1).max(20).default(5),
});

// --- Scoring Helpers ------------------------------------------------------

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cuisineMatchScore(cuisines: string[], favorites: string[]): number {
  if (!favorites.length) return 0.5;
  const overlap = cuisines.filter((c) => favorites.some((f) => c.toLowerCase().includes(f.toLowerCase())));
  return Math.min(overlap.length / Math.min(favorites.length, 3), 1);
}

function priceMatchScore(restaurantPrice: number, userPreference: number): number {
  const diff = Math.abs(restaurantPrice - userPreference);
  return 1 - diff * 0.25;
}

function dietaryComplianceScore(tags: string[], restrictions: string[]): number {
  if (!restrictions.length) return 1;
  const violation = restrictions.some((r) => tags.some((t) => t.toLowerCase().includes("non-") && r.toLowerCase().includes(t.toLowerCase())));
  return violation ? 0 : 1;
}

function historicalAffinityScore(restaurantId: string, history: OrderHistoryEntry[]): number {
  const visits = history.filter((h) => h.restaurantId === restaurantId);
  if (!visits.length) return 0;
  const rated = visits.filter((h) => h.rating !== undefined);
  const avgRating = rated.length ? rated.reduce((s, h) => s + (h.rating ?? 0), 0) / rated.length : 3.5;
  const recency = 1 / (1 + (Date.now() - new Date(visits[visits.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24));
  const frequency = Math.min(visits.length / 10, 1);
  return 0.4 * (avgRating / 5) + 0.3 * recency + 0.3 * frequency;
}

function contextScore(restaurant: Restaurant, context?: string): number {
  if (!context) return 1;
  const cuisineContext: Record<string, string[]> = {
    breakfast: ["cafe", "bakery", "american", "brunch"],
    lunch: ["salad", "sandwich", "japanese", "mexican", "indian"],
    dinner: ["italian", "steakhouse", "french", "thai", "chinese"],
    snack: ["bakery", "dessert", "fast food", "coffee"],
    late_night: ["fast food", "pizza", "diner", "kebab"],
  };
  const preferred = cuisineContext[context] ?? [];
  if (!preferred.length) return 1;
  const match = restaurant.cuisine.some((c) => preferred.some((p) => c.toLowerCase().includes(p)));
  return match ? 1 : 0.6;
}

// --- AI Recommendation Service --------------------------------------------

export class RecommendationService {
  private provider = getAIProvider();

  async getRecommendations(req: RecommendationRequest): Promise<RecommendationResult[]> {
    const validated = recommendationRequestSchema.parse(req);
    const active = validated.restaurants.filter((r) => (r as Restaurant).isActive !== false) as Restaurant[];
    if (!active.length) return [];

    const scored = active.map((restaurant) => {
      const distance = haversineDistance(
        req.preferences.location.latitude, req.preferences.location.longitude,
        restaurant.latitude, restaurant.longitude
      );
      const distanceScore = Math.max(0, 1 - distance / 15);
      const cuisineScore = cuisineMatchScore(restaurant.cuisine, req.preferences.favoriteCuisines);
      const priceScore = priceMatchScore(restaurant.priceRange, req.preferences.pricePreference);
      const dietaryScore = dietaryComplianceScore(restaurant.tags, req.preferences.dietaryRestrictions);
      const historyScore = historicalAffinityScore(restaurant.id, req.preferences.orderHistory);
      const ctxScore = contextScore(restaurant, req.context);

      const weights = { distance: 0.2, cuisine: 0.25, price: 0.15, dietary: 0.15, history: 0.15, context: 0.1 };
      const score = weights.distance * distanceScore + weights.cuisine * cuisineScore + weights.price * priceScore + weights.dietary * dietaryScore + weights.history * historyScore + weights.context * ctxScore;

      return {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        score: Math.round(score * 1000) / 1000,
        reason: this.generateReason(restaurant, { distanceScore, cuisineScore, priceScore, dietaryScore, historyScore }),
        suggestedItems: this.pickSuggestedItems(restaurant.menu, req.preferences, req.context),
        estimatedDeliveryTime: restaurant.deliveryTimeMin + Math.round(distance * 2),
        estimatedPrice: restaurant.avgOrderValue,
        confidence: Math.round(dietaryScore * (cuisineScore * 0.5 + priceScore * 0.3 + historyScore * 0.2) * 100) / 100,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, validated.limit);

    try {
      return await this.enrichWithAI(top, req);
    } catch {
      return top;
    }
  }

  async searchFood(query: string, restaurants: Restaurant[], limit: number = 10): Promise<FoodSearchResult[]> {
    const queryLower = query.toLowerCase();
    const results: FoodSearchResult[] = [];

    for (const restaurant of restaurants) {
      if (!restaurant.isActive) continue;
      for (const item of restaurant.menu) {
        if (!item.isAvailable) continue;
        let score = 0;
        const nameMatch = item.name.toLowerCase().includes(queryLower);
        const descMatch = item.description.toLowerCase().includes(queryLower);
        const tagMatch = item.tags.some((t) => t.toLowerCase().includes(queryLower));
        if (nameMatch) score += 0.5;
        if (descMatch) score += 0.3;
        if (tagMatch) score += 0.2;
        if (score === 0) continue;
        score *= item.popularityScore;
        results.push({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          menuItem: item,
          relevanceScore: Math.round(score * 1000) / 1000,
          matchReason: nameMatch ? "Name match" : descMatch ? "Description match" : "Tag match",
        });
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, limit);
  }

  async getPersonalizedMenu(restaurant: Restaurant, preferences: UserPreferences): Promise<MenuItem[]> {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are a food recommendation engine. Return ONLY a JSON array of menu item IDs ordered by relevance. No explanation." },
      {
        role: "user",
        content: JSON.stringify({
          menu: restaurant.menu.filter((m) => m.isAvailable).map((m) => ({ id: m.id, name: m.name, tags: m.tags, price: m.price, calories: m.calories })),
          preferences: {
            favoriteCuisines: preferences.favoriteCuisines,
            dietaryRestrictions: preferences.dietaryRestrictions,
            allergens: preferences.allergens,
            pricePreference: preferences.pricePreference,
            recentOrders: preferences.orderHistory.slice(-5).map((h) => h.items),
          },
        }),
      },
    ];

    try {
      const res = await this.provider.complete({ messages, temperature: 0.3, maxTokens: 500, responseFormat: { type: "json_object" } });
      const parsed = JSON.parse(res.content) as { itemIds?: string[] } | string[];
      const ids = Array.isArray(parsed) ? parsed : (parsed.itemIds ?? []);
      return ids.map((id: string) => restaurant.menu.find((m) => m.id === id)).filter((m): m is MenuItem => m !== undefined);
    } catch {
      return restaurant.menu.filter((m) => m.isAvailable).sort((a, b) => b.popularityScore - a.popularityScore);
    }
  }

  async detectTrends(restaurants: Restaurant[]): Promise<{ trending: string[]; insights: string }> {
    const cuisineCount = new Map<string, number>();
    for (const r of restaurants) {
      for (const c of r.cuisine) cuisineCount.set(c, (cuisineCount.get(c) ?? 0) + 1);
    }
    const trending = [...cuisineCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);

    try {
      const res = await this.provider.complete({
        messages: [
          { role: "system", content: "Analyze food delivery trends. Be concise, 1-2 sentences." },
          { role: "user", content: `Top cuisines in area: ${trending.join(", ")}. Total restaurants: ${restaurants.length}. Average rating: ${(restaurants.reduce((s, r) => s + r.rating, 0) / restaurants.length).toFixed(1)}. Provide a brief market insight.` },
        ],
        temperature: 0.5,
        maxTokens: 150,
      });
      return { trending, insights: res.content };
    } catch {
      return { trending, insights: `${trending[0]} cuisine leads the market with ${cuisineCount.get(trending[0]) ?? 0} restaurants available.` };
    }
  }

  private generateReason(r: Restaurant, scores: Record<string, number>): string {
    const parts: string[] = [];
    if (scores.cuisineScore > 0.7) parts.push(`matches your cuisine preference`);
    if (scores.priceScore > 0.7) parts.push(`fits your budget`);
    if (scores.historyScore > 0.3) parts.push(`you've ordered here before`);
    if (scores.distanceScore > 0.7) parts.push(`close to you`);
    if (scores.dietaryScore < 1) parts.push(`dietary mismatch`);
    return parts.length ? parts.slice(0, 2).join(" and ") : "popular choice";
  }

  private pickSuggestedItems(menu: MenuItem[], prefs: UserPreferences, context?: string): string[] {
    const available = menu.filter((m) => m.isAvailable && !m.allergens.some((a) => prefs.allergens.includes(a)));
    return available.sort((a, b) => b.popularityScore - a.popularityScore).slice(0, 3).map((m) => m.name);
  }

  private async enrichWithAI(results: RecommendationResult[], req: RecommendationRequest): Promise<RecommendationResult[]> {
    const res = await this.provider.complete({
      messages: [
        { role: "system", content: "You are a food delivery assistant. Refine the top 5 restaurant recommendations. Return ONLY JSON with the same structure, adjusting scores by 0-10% based on overall quality. Keep same IDs." },
        {
          role: "user",
          content: JSON.stringify({
            restaurants: results,
            context: req.context,
            mood: req.mood,
            budget: req.budget,
          }),
        },
      ],
      temperature: 0.3,
      maxTokens: 1000,
      responseFormat: { type: "json_object" },
    });
    const enriched = JSON.parse(res.content) as { recommendations?: RecommendationResult[] } | RecommendationResult[];
    const items = Array.isArray(enriched) ? enriched : (enriched.recommendations ?? results);
    return items.map((item, i) => ({
      ...results[i],
      score: item.score,
      reason: item.reason || results[i].reason,
    }));
  }
}

export const recommendationService = new RecommendationService();
