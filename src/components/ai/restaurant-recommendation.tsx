"use client";

import * as React from "react";
import {
  Sparkles,
  Star,
  Clock,
  MapPin,
  TrendingUp,
  Heart,
  ChevronRight,
  RefreshCw,
  Brain,
  ThumbsUp,
  ThumbsDown,
  Percent,
  Zap,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface RecommendedRestaurant {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  coverImageUrl?: string;
  cuisineType: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: { min: number; max: number };
  deliveryFee: number;
  distance: number;
  isOpen: boolean;
  reason: string;
  reasonType: "trending" | "personal" | "nearby" | "new" | "popular" | "quick";
  confidence: number;
  promotion?: { discountPercent: number; expiresAt: string };
  topItems?: { name: string; price: number }[];
}

interface RestaurantRecommendationProps {
  recommendations: RecommendedRestaurant[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  onSelectRestaurant?: (restaurant: RecommendedRestaurant) => void;
  onAddFavorite?: (restaurantId: string) => void;
  onFeedback?: (restaurantId: string, isPositive: boolean) => void;
  onRefresh?: () => void;
  maxDisplay?: number;
  className?: string;
}

const reasonConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  trending: {
    icon: TrendingUp,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    label: "Trending",
  },
  personal: {
    icon: Heart,
    color: "text-primary",
    bgColor: "bg-primary/10",
    label: "For You",
  },
  nearby: {
    icon: MapPin,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    label: "Nearby",
  },
  new: {
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    label: "New",
  },
  popular: {
    icon: Star,
    color: "text-accent-foreground",
    bgColor: "bg-accent/10",
    label: "Popular",
  },
  quick: {
    icon: Clock,
    color: "text-green-600",
    bgColor: "bg-green-50",
    label: "Quick Delivery",
  },
};

export function RestaurantRecommendation({
  recommendations,
  title = "Recommended Restaurants",
  subtitle = "AI-curated picks based on your taste",
  isLoading = false,
  onSelectRestaurant,
  onAddFavorite,
  onFeedback,
  onRefresh,
  maxDisplay = 4,
  className,
}: RestaurantRecommendationProps) {
  const [visibleCount, setVisibleCount] = React.useState(maxDisplay);
  const [feedbackGiven, setFeedbackGiven] = React.useState<Record<string, boolean>>({});

  const displayedRecommendations = recommendations.slice(0, visibleCount);

  function handleFeedback(restaurantId: string, isPositive: boolean) {
    setFeedbackGiven((prev) => ({ ...prev, [restaurantId]: isPositive }));
    onFeedback?.(restaurantId, isPositive);
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-5 w-56 animate-pulse rounded bg-muted" />
            <div className="h-3 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border bg-card p-3"
            >
              <div className="aspect-[16/10] rounded-xl bg-muted" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-card-foreground">{title}</h3>
          </div>
          <p className="mt-0.5 ml-10 text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-muted"
            aria-label="Refresh recommendations"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {displayedRecommendations.map((restaurant) => {
          const reason = reasonConfig[restaurant.reasonType];
          const ReasonIcon = reason.icon;
          const isFeedbackGiven = feedbackGiven[restaurant.id] !== undefined;

          return (
            <div
              key={restaurant.id}
              className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/10"
            >
              <div
                className="cursor-pointer"
                onClick={() => onSelectRestaurant?.(restaurant)}
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={restaurant.imageUrl}
                    alt={restaurant.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  <div
                    className={cn(
                      "absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      reason.bgColor,
                      reason.color
                    )}
                  >
                    <ReasonIcon className="h-3 w-3" />
                    {reason.label}
                  </div>

                  <div className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    {Math.round(restaurant.confidence * 100)}% match
                  </div>

                  {restaurant.promotion && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      <Percent className="h-3 w-3" />
                      {restaurant.promotion.discountPercent}% OFF
                    </div>
                  )}

                  {!restaurant.isOpen && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-bold text-gray-900">
                        Closed
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 right-2">
                    <h4 className="text-sm font-bold text-white drop-shadow-md">
                      {restaurant.name}
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {restaurant.cuisineType.slice(0, 2).map((cuisine) => (
                        <span
                          key={cuisine}
                          className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm"
                        >
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-accent text-accent" />
                      <span className="font-medium">
                        {restaurant.rating.toFixed(1)}
                      </span>
                      <span>({restaurant.reviewCount})</span>
                    </div>
                    <span className="text-muted-foreground/30">|</span>
                    <div className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        {restaurant.deliveryTime.min}-{restaurant.deliveryTime.max} min
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{restaurant.distance.toFixed(1)} km</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {restaurant.deliveryFee === 0
                      ? "Free delivery"
                      : `${formatCurrency(restaurant.deliveryFee)} delivery`}
                  </span>
                </div>

                {restaurant.topItems && restaurant.topItems.length > 0 && (
                  <div className="mt-2 rounded-lg bg-muted/50 px-2 py-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">
                      Top picks:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {restaurant.topItems.slice(0, 2).map((item, index) => (
                        <span
                          key={index}
                          className="text-[10px] text-card-foreground"
                        >
                          {item.name}
                          {index < Math.min(restaurant.topItems!.length, 2) - 1 && (
                            <span className="text-muted-foreground">, </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="rounded-lg bg-primary/5 px-2 py-1">
                    <div className="flex items-center gap-1 text-[10px] text-primary">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-medium">{restaurant.reason}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onFeedback && (
                      <>
                        <button
                          onClick={() => handleFeedback(restaurant.id, true)}
                          className={cn(
                            "rounded-full p-1 transition-colors",
                            isFeedbackGiven && feedbackGiven[restaurant.id]
                              ? "bg-success/10 text-success"
                              : "text-muted-foreground hover:bg-success/10 hover:text-success"
                          )}
                          aria-label="Good recommendation"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(restaurant.id, false)}
                          className={cn(
                            "rounded-full p-1 transition-colors",
                            isFeedbackGiven && !feedbackGiven[restaurant.id]
                              ? "bg-destructive/10 text-destructive"
                              : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          )}
                          aria-label="Bad recommendation"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </>
                    )}

                    {onAddFavorite && (
                      <button
                        onClick={() => onAddFavorite(restaurant.id)}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        aria-label="Add to favorites"
                      >
                        <Heart className="h-3 w-3" />
                      </button>
                    )}

                    <button
                      onClick={() => onSelectRestaurant?.(restaurant)}
                      className="rounded-full bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
                      aria-label={`View ${restaurant.name}`}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {recommendations.length > visibleCount && (
        <div className="flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + maxDisplay)}
            className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            Show More
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
