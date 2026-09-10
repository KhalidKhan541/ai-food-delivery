"use client";

import { Plus, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { formatPrice } from "@/lib/utils";
import type { MenuItem } from "@/types";

export interface FoodCardProps {
  item: MenuItem;
  onAddToCart?: (item: MenuItem) => void;
  className?: string;
}

function FoodCard({ item, onAddToCart, className }: FoodCardProps) {
  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5", className)}>
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img
          src={item.image}
          alt={item.name}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
        {item.isPopular && (
          <Badge className="absolute left-2 top-2" variant="default">
            <Star className="mr-1 h-3 w-3 fill-current" />
            Popular
          </Badge>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="secondary">Unavailable</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
            {item.name}
          </h3>
          <span className="shrink-0 text-sm font-bold text-orange-500">
            {formatPrice(item.price)}
          </span>
        </div>
        <p className="mb-3 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
          {item.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>{item.calories} cal</span>
            {item.spiceLevel > 0 && (
              <>
                <span>·</span>
                <span>{"🌶️".repeat(item.spiceLevel)}</span>
              </>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => onAddToCart?.(item)}
            disabled={!item.isAvailable}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </Card>
  );
}

export { FoodCard };
