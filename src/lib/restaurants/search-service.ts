import { prisma } from "@/lib/prisma";
import { Prisma, Restaurant } from "@prisma/client";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const restaurantSearchSchema = z.object({
  query: z.string().max(200).optional(),
  cuisineType: z.string().max(50).optional(),
  priceRange: z.array(z.enum(["$", "$$", "$$$", "$$$$"])).optional(),
  tags: z.array(z.string().max(30)).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxDeliveryFee: z.number().min(0).optional(),
  maxEstimatedDeliveryTime: z.number().min(0).optional(),
  isOpen: z.boolean().optional(),
  hasPromo: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().min(0.1).max(50).default(10),
  sortBy: z
    .enum(["relevance", "rating", "deliveryTime", "deliveryFee", "distance", "popularity", "price_low", "price_high"])
    .default("relevance"),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

export const popularSearchSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusKm: z.number().min(0.1).max(50).default(10),
  limit: z.number().min(1).max(20).default(10),
});

export const trendingSearchSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  limit: z.number().min(1).max(20).default(10),
});

export const nearbySearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.1).max(50).default(5),
  cuisineType: z.string().optional(),
  isOpen: z.boolean().default(true),
  limit: z.number().min(1).max(50).default(20),
});

export const discoverySectionSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type RestaurantSearchInput = z.infer<typeof restaurantSearchSchema>;

export type SearchResult = {
  id: string;
  name: string;
  slug: string;
  cuisineType: string;
  priceRange: string;
  rating: number;
  reviewCount: number;
  images: string[];
  logo: string | null;
  estimatedDeliveryTime: number;
  deliveryFee: number;
  minOrderAmount: number;
  isOpen: boolean;
  tags: string[];
  distance?: number;
  relevanceScore?: number;
  matchReasons?: string[];
};

export type SearchResponse = {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  query: string | null;
  filters: Record<string, unknown>;
  suggestions: string[];
  searchTime: number;
};

export type DiscoverySection = {
  title: string;
  type: "featured" | "trending" | "nearby" | "popular" | "cuisine" | "new" | "promo";
  description?: string;
  restaurants: SearchResult[];
};

export type AutocompleteResult = {
  text: string;
  type: "restaurant" | "cuisine" | "tag" | "dish";
  restaurantId?: string;
  slug?: string;
  image?: string;
};

export type SearchAnalytics = {
  query: string;
  resultCount: number;
  filters: Record<string, unknown>;
  userId?: string;
  timestamp: Date;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class SearchService {
  /**
   * Full-text restaurant search with filters, sorting, and distance calculation.
   */
  static async search(input: RestaurantSearchInput): Promise<SearchResponse> {
    const startTime = Date.now();
    const { query, page, limit, sortBy, radiusKm, ...filters } = input;
    const skip = (page - 1) * limit;

    // Build Prisma where clause
    const where: Prisma.RestaurantWhereInput = {
      status: "ACTIVE",
      ...(filters.isOpen !== undefined && { isOpen: filters.isOpen }),
      ...(filters.cuisineType && {
        cuisineType: { contains: filters.cuisineType, mode: "insensitive" },
      }),
      ...(filters.priceRange && filters.priceRange.length > 0 && {
        priceRange: { in: filters.priceRange },
      }),
      ...(filters.tags && filters.tags.length > 0 && {
        tags: { hasSome: filters.tags },
      }),
      ...(filters.minRating && { rating: { gte: filters.minRating } }),
      ...(filters.maxDeliveryFee !== undefined && {
        deliveryFee: { lte: filters.maxDeliveryFee },
      }),
      ...(filters.maxEstimatedDeliveryTime !== undefined && {
        estimatedDeliveryTime: { lte: filters.maxEstimatedDeliveryTime },
      }),
      ...(filters.hasPromo && {
        promoCodes: { some: { isActive: true } },
      }),
    };

    // Text search
    if (query && query.trim()) {
      const searchTerms = query.trim().split(/\s+/);
      where.OR = searchTerms.map((term) => ({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { cuisineType: { contains: term, mode: "insensitive" } },
          { tags: { has: term.toLowerCase() } },
        ],
      }));
    }

    // Determine ordering
    let orderBy: Prisma.RestaurantOrderByWithRelationInput;
    switch (sortBy) {
      case "rating":
        orderBy = { rating: "desc" };
        break;
      case "deliveryTime":
        orderBy = { estimatedDeliveryTime: "asc" };
        break;
      case "deliveryFee":
        orderBy = { deliveryFee: "asc" };
        break;
      case "popularity":
        orderBy = { totalOrders: "desc" };
        break;
      case "price_low":
        orderBy = { priceRange: "asc" };
        break;
      case "price_high":
        orderBy = { priceRange: "desc" };
        break;
      default:
        orderBy = [{ isFeatured: "desc" }, { rating: "desc" }, { totalOrders: "desc" }];
    }

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          cuisineType: true,
          priceRange: true,
          rating: true,
          reviewCount: true,
          images: true,
          logo: true,
          estimatedDeliveryTime: true,
          deliveryFee: true,
          minOrderAmount: true,
          isOpen: true,
          tags: true,
          latitude: true,
          longitude: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.restaurant.count({ where }),
    ]);

    // Calculate distances if location provided
    let results: SearchResult[] = restaurants.map((r) => {
      const result: SearchResult = {
        id: r.id,
        name: r.name,
        slug: r.slug,
        cuisineType: r.cuisineType,
        priceRange: r.priceRange,
        rating: Number(r.rating),
        reviewCount: r.reviewCount,
        images: r.images,
        logo: r.logo,
        estimatedDeliveryTime: r.estimatedDeliveryTime,
        deliveryFee: Number(r.deliveryFee),
        minOrderAmount: Number(r.minOrderAmount),
        isOpen: r.isOpen,
        tags: r.tags,
      };

      if (input.latitude && input.longitude) {
        result.distance = this.haversineDistance(
          input.latitude,
          input.longitude,
          r.latitude,
          r.longitude
        );
      }

      return result;
    });

    // Filter by radius if location provided
    if (input.latitude && input.longitude && radiusKm) {
      results = results.filter((r) => !r.distance || r.distance <= radiusKm);
    }

    // Sort by distance if using distance sort
    if (sortBy === "distance" && input.latitude && input.longitude) {
      results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }

    // Calculate relevance scores for text search
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase();
      results = results.map((r) => {
        const matchReasons: string[] = [];
        let score = 0;

        if (r.name.toLowerCase().includes(lowerQuery)) {
          score += 10;
          matchReasons.push("name match");
        }
        if (r.cuisineType.toLowerCase().includes(lowerQuery)) {
          score += 5;
          matchReasons.push("cuisine match");
        }
        if (r.tags.some((t) => t.toLowerCase().includes(lowerQuery))) {
          score += 3;
          matchReasons.push("tag match");
        }

        return { ...r, relevanceScore: score, matchReasons };
      });

      if (sortBy === "relevance") {
        results.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
      }
    }

    // Generate suggestions
    const suggestions = await this.generateSuggestions(query ?? "");

    // Log search analytics
    this.logSearch({
      query: query ?? "",
      resultCount: results.length,
      filters: input,
      timestamp: new Date(),
    }).catch(() => {});

    return {
      results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      query: query ?? null,
      filters: input,
      suggestions,
      searchTime: Date.now() - startTime,
    };
  }

  /**
   * Autocomplete for search input.
   */
  static async autocomplete(
    query: string,
    options?: { latitude?: number; longitude?: number; limit?: number }
  ): Promise<AutocompleteResult[]> {
    if (!query || query.length < 2) return [];

    const limit = options?.limit ?? 8;
    const lowerQuery = query.toLowerCase();

    const [restaurants, cuisines, tags] = await Promise.all([
      prisma.restaurant.findMany({
        where: {
          status: "ACTIVE",
          name: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          cuisineType: true,
        },
        take: limit,
      }),
      prisma.restaurant.findMany({
        where: {
          status: "ACTIVE",
          cuisineType: { contains: query, mode: "insensitive" },
        },
        select: { cuisineType: true },
        distinct: ["cuisineType"],
        take: 5,
      }),
      prisma.restaurant.findMany({
        where: {
          status: "ACTIVE",
          tags: { has: lowerQuery },
        },
        select: { tags: true },
        take: 5,
      }),
    ]);

    const results: AutocompleteResult[] = [];

    for (const r of restaurants) {
      results.push({
        text: r.name,
        type: "restaurant",
        restaurantId: r.id,
        slug: r.slug,
        image: r.logo ?? undefined,
      });
    }

    const seenCuisines = new Set<string>();
    for (const c of cuisines) {
      if (!seenCuisines.has(c.cuisineType)) {
        seenCuisines.add(c.cuisineType);
        results.push({
          text: c.cuisineType,
          type: "cuisine",
        });
      }
    }

    const seenTags = new Set<string>();
    for (const t of tags) {
      for (const tag of t.tags) {
        if (!seenTags.has(tag) && tag.includes(lowerQuery)) {
          seenTags.add(tag);
          results.push({
            text: tag,
            type: "tag",
          });
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Get discovery sections for the home screen.
   */
  static async getDiscoverySections(
    input?: { latitude?: number; longitude?: number }
  ): Promise<DiscoverySection[]> {
    const sections: DiscoverySection[] = [];

    const [featured, trending, nearby, newRestaurants, promoRestaurants] = await Promise.all([
      prisma.restaurant.findMany({
        where: { status: "ACTIVE", isFeatured: true, isOpen: true },
        select: this.getRestaurantSelectFields(),
        orderBy: { rating: "desc" },
        take: 10,
      }),
      prisma.restaurant.findMany({
        where: { status: "ACTIVE", isOpen: true },
        select: this.getRestaurantSelectFields(),
        orderBy: { totalOrders: "desc" },
        take: 10,
      }),
      input?.latitude && input?.longitude
        ? prisma.restaurant.findMany({
            where: { status: "ACTIVE", isOpen: true },
            select: {
              ...this.getRestaurantSelectFields(),
              latitude: true,
              longitude: true,
            },
            take: 50,
          })
        : [],
      prisma.restaurant.findMany({
        where: {
          status: "ACTIVE",
          isOpen: true,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: this.getRestaurantSelectFields(),
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.restaurant.findMany({
        where: {
          status: "ACTIVE",
          isOpen: true,
          promoCodes: { some: { isActive: true } },
        },
        select: this.getRestaurantSelectFields(),
        take: 10,
      }),
    ]);

    if (featured.length > 0) {
      sections.push({
        title: "Featured Restaurants",
        type: "featured",
        description: "Handpicked by our team",
        restaurants: featured.map((r) => this.toSearchResult(r)),
      });
    }

    if (trending.length > 0) {
      sections.push({
        title: "Trending Now",
        type: "trending",
        description: "Most popular this week",
        restaurants: trending.map((r) => this.toSearchResult(r)),
      });
    }

    if (input?.latitude && input?.longitude) {
      const nearbyWithDistance = nearby
        .map((r) => ({
          ...this.toSearchResult(r),
          distance: this.haversineDistance(
            input.latitude!,
            input.longitude!,
            (r as any).latitude,
            (r as any).longitude
          ),
        }))
        .filter((r) => r.distance !== undefined && r.distance <= 10)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
        .slice(0, 10);

      if (nearbyWithDistance.length > 0) {
        sections.push({
          title: "Near You",
          type: "nearby",
          description: `${nearbyWithDistance.length} restaurants nearby`,
          restaurants: nearbyWithDistance,
        });
      }
    }

    if (newRestaurants.length > 0) {
      sections.push({
        title: "New on the Platform",
        type: "new",
        description: "Recently added restaurants",
        restaurants: newRestaurants.map((r) => this.toSearchResult(r)),
      });
    }

    if (promoRestaurants.length > 0) {
      sections.push({
        title: "Active Promotions",
        type: "promo",
        description: "Restaurants with deals",
        restaurants: promoRestaurants.map((r) => this.toSearchResult(r)),
      });
    }

    // Cuisine-based sections
    const topCuisines = await prisma.restaurant.groupBy({
      by: ["cuisineType"],
      where: { status: "ACTIVE", isOpen: true },
      _count: true,
      orderBy: { _count: { cuisineType: "desc" } },
      take: 3,
    });

    for (const cuisine of topCuisines) {
      if (cuisine._count < 2) continue;

      const cuisineRestaurants = await prisma.restaurant.findMany({
        where: {
          status: "ACTIVE",
          isOpen: true,
          cuisineType: cuisine.cuisineType,
        },
        select: this.getRestaurantSelectFields(),
        orderBy: { rating: "desc" },
        take: 10,
      });

      if (cuisineRestaurants.length > 0) {
        sections.push({
          title: `${cuisine.cuisineType} Restaurants`,
          type: "cuisine",
          restaurants: cuisineRestaurants.map((r) => this.toSearchResult(r)),
        });
      }
    }

    return sections;
  }

  /**
   * Get nearby restaurants sorted by distance.
   */
  static async getNearby(
    input: z.infer<typeof nearbySearchSchema>
  ): Promise<SearchResult[]> {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        status: "ACTIVE",
        isOpen: input.isOpen,
        ...(input.cuisineType && { cuisineType: input.cuisineType }),
      },
      select: {
        ...this.getRestaurantSelectFields(),
        latitude: true,
        longitude: true,
      },
      take: 100,
    });

    return restaurants
      .map((r) => ({
        ...this.toSearchResult(r),
        distance: this.haversineDistance(
          input.latitude,
          input.longitude,
          (r as any).latitude,
          (r as any).longitude
        ),
      }))
      .filter((r) => r.distance !== undefined && r.distance <= input.radiusKm)
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, input.limit);
  }

  /**
   * Get popular/trending searches.
   */
  static async getTrendingSearches(
    options?: { limit?: number }
  ): Promise<string[]> {
    const limit = options?.limit ?? 10;

    const recentSearches = await prisma.searchAnalytics.groupBy({
      by: ["query"],
      where: {
        query: { not: "" },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _count: true,
      orderBy: { _count: { query: "desc" } },
      take: limit,
    });

    return recentSearches.map((s) => s.query);
  }

  /**
   * Get all available cuisine types with counts.
   */
  static async getCuisineTypes(): Promise<
    Array<{ cuisineType: string; count: number; image?: string }>
  > {
    const cuisines = await prisma.restaurant.groupBy({
      by: ["cuisineType"],
      where: { status: "ACTIVE" },
      _count: true,
      orderBy: { _count: { cuisineType: "desc" } },
    });

    const images = await prisma.restaurant.findMany({
      where: { status: "ACTIVE" },
      select: { cuisineType: true, images: true },
    });

    const imageMap = new Map<string, string>();
    for (const img of images) {
      if (!imageMap.has(img.cuisineType) && img.images.length > 0) {
        imageMap.set(img.cuisineType, img.images[0]);
      }
    }

    return cuisines.map((c) => ({
      cuisineType: c.cuisineType,
      count: c._count,
      image: imageMap.get(c.cuisineType),
    }));
  }

  /**
   * Get all available tags with counts.
   */
  static async getTags(): Promise<Array<{ tag: string; count: number }>> {
    const restaurants = await prisma.restaurant.findMany({
      where: { status: "ACTIVE" },
      select: { tags: true },
    });

    const tagCounts = new Map<string, number>();
    for (const r of restaurants) {
      for (const tag of r.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Log a search query for analytics.
   */
  static async logSearch(analytics: SearchAnalytics): Promise<void> {
    try {
      await prisma.searchAnalytics.create({
        data: {
          query: analytics.query,
          resultCount: analytics.resultCount,
          filters: analytics.filters,
          userId: analytics.userId,
        },
      });
    } catch {
      // Silently fail — analytics should not break search
    }
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private static getRestaurantSelectFields() {
    return {
      id: true,
      name: true,
      slug: true,
      cuisineType: true,
      priceRange: true,
      rating: true,
      reviewCount: true,
      images: true,
      logo: true,
      estimatedDeliveryTime: true,
      deliveryFee: true,
      minOrderAmount: true,
      isOpen: true,
      tags: true,
    } as const;
  }

  private static toSearchResult(r: any): SearchResult {
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      cuisineType: r.cuisineType,
      priceRange: r.priceRange,
      rating: Number(r.rating),
      reviewCount: r.reviewCount,
      images: r.images,
      logo: r.logo,
      estimatedDeliveryTime: r.estimatedDeliveryTime,
      deliveryFee: Number(r.deliveryFee),
      minOrderAmount: Number(r.minOrderAmount),
      isOpen: r.isOpen,
      tags: r.tags,
    };
  }

  private static haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  private static async generateSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const [cuisineMatches, tagMatches] = await Promise.all([
      prisma.restaurant.findMany({
        where: {
          status: "ACTIVE",
          cuisineType: { contains: query, mode: "insensitive" },
        },
        select: { cuisineType: true },
        distinct: ["cuisineType"],
        take: 3,
      }),
      prisma.restaurant.findMany({
        where: {
          status: "ACTIVE",
          tags: { has: query.toLowerCase() },
        },
        select: { tags: true },
        take: 5,
      }),
    ]);

    const suggestions = new Set<string>();
    for (const m of cuisineMatches) suggestions.add(m.cuisineType);
    for (const t of tagMatches) {
      for (const tag of t.tags) {
        if (tag.includes(query.toLowerCase())) suggestions.add(tag);
      }
    }

    return Array.from(suggestions).slice(0, 5);
  }
}
