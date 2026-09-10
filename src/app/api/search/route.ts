import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      config.pagination.maxPageSize,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20"))
    );
    const type = searchParams.get("type") ?? "all";
    const cuisine = searchParams.get("cuisine");
    const minPrice = parseFloat(searchParams.get("minPrice") ?? "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") ?? "9999");
    const sortBy = searchParams.get("sort") ?? "relevance";

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const results: any = { restaurants: [], menuItems: [] };

    const includeRestaurant = type === "all" || type === "restaurants";
    const includeMenuItems = type === "all" || type === "menu-items";

    if (includeRestaurant) {
      const restaurantWhere: any = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { cuisineType: { has: query } },
        ],
      };

      if (cuisine) {
        restaurantWhere.cuisineType = { has: cuisine };
      }

      results.restaurants = await prisma.restaurant.findMany({
        where: restaurantWhere,
        take: type === "restaurants" ? limit : 5,
        orderBy: sortBy === "rating" ? { rating: "desc" } : { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          cuisineType: true,
          logo: true,
          rating: true,
          reviewCount: true,
          deliveryFee: true,
          estimatedPrepTime: true,
          city: true,
        },
      });
    }

    if (includeMenuItems) {
      const menuItemWhere: any = {
        isAvailable: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { tags: { has: query } },
        ],
        restaurant: { isActive: true },
      };

      if (minPrice > 0 || maxPrice < 9999) {
        menuItemWhere.price = {};
        if (minPrice > 0) menuItemWhere.price.gte = minPrice;
        if (maxPrice < 9999) menuItemWhere.price.lte = maxPrice;
      }

      results.menuItems = await prisma.menuItem.findMany({
        where: menuItemWhere,
        take: type === "menu-items" ? limit : 10,
        orderBy:
          sortBy === "price_asc"
            ? { price: "asc" }
            : sortBy === "price_desc"
            ? { price: "desc" }
            : { name: "asc" },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              deliveryFee: true,
              estimatedPrepTime: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      query,
      results,
      totalResults:
        results.restaurants.length + results.menuItems.length,
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
