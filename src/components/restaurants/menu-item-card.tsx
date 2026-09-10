"use client";

import * as React from "react";
import { Plus, Minus, Flame, Leaf, AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  imageUrl: string;
  isAvailable: boolean;
  isPopular?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: 0 | 1 | 2 | 3;
  calories?: number;
  prepTime?: number;
  allergens?: string[];
  customizations?: {
    name: string;
    type: "single" | "multiple";
    required: boolean;
    options: { name: string; price: number }[];
  }[];
}

interface MenuItemCardProps {
  item: MenuItem;
  quantity?: number;
  onAdd?: (item: MenuItem) => void;
  onRemove?: (itemId: string) => void;
  onCustomize?: (item: MenuItem) => void;
  className?: string;
}

export function MenuItemCard({
  item,
  quantity = 0,
  onAdd,
  onRemove,
  onCustomize,
  className,
}: MenuItemCardProps) {
  const {
    id,
    name,
    description,
    price,
    discountedPrice,
    imageUrl,
    isAvailable,
    isPopular,
    isVegetarian,
    isVegan,
    isGlutenFree,
    spiceLevel = 0,
    calories,
    allergens,
    customizations,
  } = item;

  const hasCustomizations = customizations && customizations.length > 0;
  const hasDiscount = discountedPrice !== undefined && discountedPrice < price;

  const spiceIcons = React.useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => (
      <Flame
        key={i}
        className={cn(
          "h-3 w-3",
          i < spiceLevel ? "text-orange-500 fill-orange-500" : "text-gray-300"
        )}
      />
    ));
  }, [spiceLevel]);

  return (
    <div
      className={cn(
        "group flex gap-4 rounded-xl border bg-card p-3 transition-all duration-200",
        "hover:shadow-md hover:ring-1 hover:ring-primary/10",
        !isAvailable && "pointer-events-none opacity-50",
        className
      )}
    >
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-28">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {isPopular && (
          <div className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5">
            <span className="text-[10px] font-bold text-accent-foreground">
              Popular
            </span>
          </div>
        )}

        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-900">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-card-foreground truncate">{name}</h4>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isVegetarian && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                  <Leaf className="h-2.5 w-2.5" />
                  Veg
                </span>
              )}
              {isVegan && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">
                  <Leaf className="h-2.5 w-2.5" />
                  Vegan
                </span>
              )}
              {isGlutenFree && (
                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  GF
                </span>
              )}
              {spiceLevel > 0 && (
                <div className="flex">{spiceIcons}</div>
              )}
              {calories && (
                <span className="text-[10px] text-muted-foreground">
                  {calories} cal
                </span>
              )}
            </div>
          </div>

          {hasDiscount && (
            <span className="flex-shrink-0 text-xs text-muted-foreground line-through">
              {formatCurrency(price)}
            </span>
          )}
        </div>

        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>

        {allergens && allergens.length > 0 && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>Contains: {allergens.join(", ")}</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-card-foreground">
              {formatCurrency(hasDiscount ? discountedPrice! : price)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {quantity > 0 ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onRemove?.(id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border bg-background transition-colors hover:bg-muted"
                  aria-label={`Remove ${name} from cart`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <span className="w-6 text-center text-sm font-semibold">
                  {quantity}
                </span>

                <button
                  onClick={() => onAdd?.(item)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                  aria-label={`Add another ${name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : hasCustomizations ? (
              <button
                onClick={() => onCustomize?.(item)}
                className="flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Plus className="h-3 w-3" />
                Customize
              </button>
            ) : (
              <button
                onClick={() => onAdd?.(item)}
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
