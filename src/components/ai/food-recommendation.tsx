"use client";

import * as React from "react";
import {
  Sparkles,
  Clock,
  Star,
  TrendingUp,
  Heart,
  ChevronRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Brain,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface RecommendedFood {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  restaurantName: string;
  restaurantId: string;
  rating: number;
  prepTime: number;
  reason: string;
  reasonType: "trending" | "personal" | "similar" | "new" | "popular";
  confidence: number;
  tags?: string[];
}

interface FoodRecommendationProps {
  recommendations: RecommendedFood[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  onAddToCart?: (food: RecommendedFood) => void;
  onViewDetails?: (food: RecommendedFood) => void;
  onFeedback?: (foodId: string, isPositive: boolean) => void;
  onRefresh?: () => void;
  onDismiss?: (foodId: string) => className;
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
    label: "Trending Now",
  },
  personal: {
    icon: Heart,
    color: "text-primary",
    bgColor: "bg-primary/10",
    label: "Picked for You",
  },
  similar: {
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    label: "You Might Like",
  },
  new: {
    icon: Zap,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    label: "New Discovery",
  },
  popular: {
    icon: Star,
    color: "text-accent-foreground",
    bgColor: "bg-accent/10",
    label: "Popular Choice",
  },
};

export function FoodRecommendation({
  recommendations,
  title = "Recommended for You",
  subtitle = "AI-powered suggestions based on your preferences",
  isLoading = false,
  onAddToCart,
  onViewDetails,
  onFeedback,
  onRefresh,
  onDismiss,
  maxDisplay = 6,
  className,
}: FoodRecommendationProps) {
  const [visibleCount, setVisibleCount] = React.useState(maxDisplay);
  const [feedbackGiven, setFeedbackGiven] = React.useState<Record<string, boolean>>({});

  const displayedRecommendations = recommendations.slice(0, visibleCount);

  function handleFeedback(foodId: string, isPositive: boolean) {
    setFeedbackGiven((prev) => ({ ...prev, [foodId]: isPositive }));
    onFeedback?.(foodId, isPositive);
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-3 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border bg-card p-3"
            >
              <div className="aspect-[4/3] rounded-xl bg-muted" />
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayedRecommendations.map((food) => {
          const reason = reasonConfig[food.reasonType];
          const ReasonIcon = reason.icon;
          const isFeedbackGiven = feedbackGiven[food.id] !== undefined;

          return (
            <div
              key={food.id}
              className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-primary/10"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={food.imageUrl}
                  alt={food.name}
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
                  {Math.round(food.confidence * 100)}% match
                </div>

                <div className="absolute bottom-2 left-2 right-2">
                  <h4 className="text-sm font-bold text-white drop-shadow-md">
                    {food.name}
                  </h4>
                  <p className="text-xs text-white/80">{food.restaurantName}</p>
                </div>
              </div>

              <div className="p-3">
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {food.description}
                </p>

                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    <span className="font-medium">{food.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{food.prepTime} min</span>
                  </div>
                </div>

                <div className="mt-1 rounded-lg bg-primary/5 px-2 py-1">
                  <div className="flex items-center gap-1 text-[10px] text-primary">
                    <Sparkles className="h-3 w-3" />
                    <span className="font-medium">{food.reason}</span>
                  </div>
                </div>

                {food.tags && food.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {food.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-card-foreground">
                    {formatCurrency(food.price)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {onFeedback && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleFeedback(food.id, true)}
                          className={cn(
                            "rounded-full p-1.5 transition-colors",
                            isFeedbackGiven && feedbackGiven[food.id]
                              ? "bg-success/10 text-success"
                              : "text-muted-foreground hover:bg-success/10 hover:text-success"
                          )}
                          aria-label="Good recommendation"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleFeedback(food.id, false)}
                          className={cn(
                            "rounded-full p-1.5 transition-colors",
                            isFeedbackGiven && !feedbackGiven[food.id]
                              ? "bg-destructive/10 text-destructive"
                              : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          )}
                          aria-label="Bad recommendation"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {onViewDetails && (
                      <button
                        onClick={() => onViewDetails(food)}
                        className="rounded-full border p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                        aria-label="View details"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {onAddToCart && (
                      <button
                        onClick={() => onAddToCart(food)}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Add
                      </button>
                    )}
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
