"use client";

import * as React from "react";
import { Star, Clock, MapPin, Flame, Percent, Heart } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

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

interface RestaurantCardProps {
  restaurant: Restaurant;
  onFavoriteToggle?: (id: string) => void;
  isFavorited?: boolean;
  className?: string;
}

export function RestaurantCard({
  restaurant,
  onFavoriteToggle,
  isFavorited = false,
  className,
}: RestaurantCardProps) {
  const {
    id,
    name,
    description,
    imageUrl,
    cuisineType,
    rating,
    reviewCount,
    deliveryTime,
    deliveryFee,
    minimumOrder,
    distance,
    isOpen,
    isFeatured,
    isPromoted,
    promotion,
    address,
  } = restaurant;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300",
        "hover:shadow-lg hover:ring-2 hover:ring-primary/20",
        !isOpen && "opacity-60 grayscale",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {isFeatured && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
            <Flame className="h-3 w-3" />
            Featured
          </div>
        )}

        {isPromoted && promotion && (
          <div className="absolute right-12 top-3 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
            <Percent className="h-3 w-3" />
            {promotion.discountPercent}% OFF
          </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteToggle?.(id);
          }}
          className={cn(
            "absolute right-3 top-3 rounded-full p-2 backdrop-blur-sm transition-all",
            isFavorited
              ? "bg-primary text-primary-foreground"
              : "bg-white/80 text-gray-600 hover:bg-white hover:text-primary"
          )}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={cn("h-4 w-4", isFavorited && "fill-current")}
          />
        </button>

        {!isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg">
              Currently Closed
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-bold text-white drop-shadow-md">{name}</h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-white/90">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{address}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {cuisineType.map((cuisine) => (
            <span
              key={cuisine}
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {cuisine}
            </span>
          ))}
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {description}
        </p>

        <div className="mt-auto flex items-center gap-4 border-t pt-3 text-sm">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount})</span>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {deliveryTime.min}-{deliveryTime.max} min
            </span>
          </div>

          {distance !== undefined && (
            <span className="text-muted-foreground">
              {distance.toFixed(1)} km
            </span>
          )}

          <div className="ml-auto">
            {deliveryFee === 0 ? (
              <span className="font-semibold text-success">Free Delivery</span>
            ) : (
              <span className="text-muted-foreground">
                {formatCurrency(deliveryFee)} delivery
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Min. order {formatCurrency(minimumOrder)}</span>
          {promotion && (
            <span className="font-medium text-primary">
              Promo available
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
