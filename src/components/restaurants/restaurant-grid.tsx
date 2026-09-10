"use client";

import * as React from "react";
import { Loader2, Search, SlidersHorizontal, Grid3X3, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { RestaurantCard } from "./restaurant-card";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  coverImageUrl?: string;
  cuisineType: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: { min: number; max: number };
  deliveryFee: number;
  minimumOrder: number;
  distance?: number;
  isOpen: boolean;
  isFeatured?: boolean;
  isPromoted?: boolean;
  promotion?: { discountPercent: number; expiresAt: string };
  address: string;
}

interface RestaurantGridProps {
  restaurants: Restaurant[];
  isLoading?: boolean;
  favorites?: string[];
  onFavoriteToggle?: (id: string) => void;
  onSelectRestaurant?: (restaurant: Restaurant) => void;
  sortBy?: "rating" | "deliveryTime" | "distance" | "popular";
  onSortChange?: (sort: string) => void;
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export function RestaurantGrid({
  restaurants,
  isLoading = false,
  favorites = [],
  onFavoriteToggle,
  onSelectRestaurant,
  sortBy = "popular",
  onSortChange,
  viewMode = "grid",
  onViewModeChange,
  hasMore = false,
  onLoadMore,
  className,
}: RestaurantGridProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  const sortedRestaurants = React.useMemo(() => {
    const sorted = [...restaurants];
    switch (sortBy) {
      case "rating":
        return sorted.sort((a, b) => b.rating - a.rating);
      case "deliveryTime":
        return sorted.sort(
          (a, b) => a.deliveryTime.min - b.deliveryTime.min
        );
      case "distance":
        return sorted.sort(
          (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
        );
      case "popular":
      default:
        return sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    }
  }, [restaurants, sortBy]);

  const sortOptions = [
    { value: "popular", label: "Most Popular" },
    { value: "rating", label: "Highest Rated" },
    { value: "deliveryTime", label: "Fastest Delivery" },
    { value: "distance", label: "Nearest" },
  ] as const;

  if (isLoading && restaurants.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-20", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          Finding the best restaurants for you...
        </p>
      </div>
    );
  }

  if (!isLoading && restaurants.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-20", className)}>
        <Search className="h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-semibold">No restaurants found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your filters or search terms
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {restaurants.length} Restaurant{restaurants.length !== 1 ? "s" : ""}
          </h2>
          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
            <span className="text-xs font-medium text-primary">
              {restaurants.filter((r) => r.isOpen).length} open now
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              showFilters
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>

          <div className="flex items-center rounded-lg border">
            <button
              onClick={() => onViewModeChange?.("grid")}
              className={cn(
                "rounded-l-lg p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange?.("list")}
              className={cn(
                "rounded-r-lg p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "flex flex-col gap-4"
        )}
      >
        {sortedRestaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            isFavorited={favorites.includes(restaurant.id)}
            onFavoriteToggle={onFavoriteToggle}
            onClick={() => onSelectRestaurant?.(restaurant)}
            className={cn(
              viewMode === "list" && "flex-row"
            )}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
