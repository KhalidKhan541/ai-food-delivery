import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { getAIProvider } from "@/lib/ai/provider";

export async function POST(request: NextRequest) {
  try {
    const { getServerSession } = await import("@/lib/auth");
    const session = await getServerSession();
    const userId = (session.user as any).id;

    const body = await request.json();
    const { context, preferences, count } = body;

    const customer = await prisma.customer.findUnique({
      where: { userId },
    });

    const recentOrders = customer
      ? await prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            items: {
              include: {
                menuItem: {
                  select: {
                    name: true,
                    category: true,
                    tags: true,
                    price: true,
                    restaurant: {
                      select: { name: true, cuisineType: true },
                    },
                  },
                },
              },
            },
          },
        })
      : [];

    const orderHistory = recentOrders.flatMap((order) =>
      order.items.map((item) => ({
        name: item.menuItem.name,
        category: item.menuItem.category,
        tags: item.menuItem.tags,
        price: item.price,
        restaurant: item.menuItem.restaurant.name,
        cuisine: item.menuItem.restaurant.cuisineType,
      }))
    );

    const favoriteItems = await prisma.favorite.findMany({
      where: { userId },
      include: {
        menuItem: {
          select: {
            name: true,
            category: true,
            tags: true,
            price: true,
          },
        },
      },
    });

    const favorites = favoriteItems.map((f) => ({
      name: f.menuItem.name,
      category: f.menuItem.category,
      tags: f.menuItem.tags,
      price: f.menuItem.price,
    }));

    const topRestaurants = await prisma.restaurant.findMany({
      where: { isActive: true },
      orderBy: { rating: "desc" },
      take: 5,
      select: {
        name: true,
        cuisineType: true,
        rating: true,
        menuItems: {
          where: { isAvailable: true },
          take: 3,
          select: {
            name: true,
            category: true,
            price: true,
            tags: true,
          },
        },
      },
    });

    const systemPrompt = `You are an AI food recommendation engine for a food delivery platform. 
Based on the user's order history, favorites, and preferences, recommend food items they might enjoy.

Rules:
- Return exactly ${count ?? 5} recommendations as JSON array
- Each recommendation should have: name, restaurant, reason, confidence (0-1), price, category
- Confidence reflects how well it matches their taste profile
- Be diverse but personalized
- Consider dietary restrictions if provided
- Response must be valid JSON only`;

    const userPrompt = `User preferences: ${JSON.stringify(preferences ?? {})}
Context: ${context ?? "general recommendations"}

Order history (last 10 orders):
${JSON.stringify(orderHistory, null, 2)}

Favorite items:
${JSON.stringify(favorites, null, 2)}

Top restaurants in the area:
${JSON.stringify(
  topRestaurants.map((r) => ({
    name: r.name,
    cuisines: r.cuisineType,
    rating: r.rating,
    popularItems: r.menuItems,
  })),
  null,
  2
)}

Generate ${count ?? 5} personalized food recommendations as a JSON array.`;

    const provider = getAIProvider();

    try {
      const response = await provider.complete({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 2000,
        responseFormat: { type: "json_object" },
      });

      let recommendations;
      try {
        const parsed = JSON.parse(response.content);
        recommendations = parsed.recommendations ?? parsed;
        if (!Array.isArray(recommendations)) {
          recommendations = [recommendations];
        }
      } catch {
        recommendations = [];
      }

      return NextResponse.json({
        recommendations,
        metadata: {
          provider: response.provider,
          model: response.model,
          latencyMs: response.latencyMs,
          tokensUsed: response.usage.totalTokens,
        },
      });
    } catch (aiError) {
      const fallbackRecommendations = topRestaurants.flatMap((restaurant) =>
        restaurant.menuItems.map((item) => ({
          name: item.name,
          restaurant: restaurant.name,
          reason: `Popular item at ${restaurant.name} (${restaurant.rating}★)`,
          confidence: 0.5,
          price: item.price,
          category: item.category,
        }))
      );

      return NextResponse.json({
        recommendations: fallbackRecommendations.slice(0, count ?? 5),
        metadata: {
          provider: "fallback",
          model: "rule-based",
          latencyMs: 0,
          tokensUsed: 0,
        },
      });
    }
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
