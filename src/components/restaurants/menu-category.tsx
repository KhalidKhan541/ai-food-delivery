"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuItemCard } from "./menu-item-card";

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
  allergens?: string[];
  customizations?: {
    name: string;
    type: "single" | "multiple";
    required: boolean;
    options: { name: string; price: number }[];
  }[];
}

interface MenuCategoryProps {
  name: string;
  description?: string;
  items: MenuItem[];
  cart?: Record<string, number>;
  onAddItem?: (item: MenuItem) => void;
  onRemoveItem?: (itemId: string) => void;
  onCustomizeItem?: (item: MenuItem) => void;
  defaultExpanded?: boolean;
  className?: string;
}

export function MenuCategory({
  name,
  description,
  items,
  cart = {},
  onAddItem,
  onRemoveItem,
  onCustomizeItem,
  defaultExpanded = true,
  className,
}: MenuCategoryProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const availableCount = items.filter((item) => item.isAvailable).length;
  const cartCount = items.reduce(
    (sum, item) => sum + (cart[item.id] || 0),
    0
  );

  return (
    <div className={cn("scroll-mt-24", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors",
          "hover:bg-muted/50",
          isExpanded && "bg-muted/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-card-foreground">
                {name}
              </h3>
              {cartCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          {availableCount} item{availableCount !== 1 ? "s" : ""}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2 px-1">
          {items.length > 3 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search ${name.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery
                ? "No items match your search"
                : "No items in this category"}
            </div>
          ) : (
            filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                quantity={cart[item.id] || 0}
                onAdd={onAddItem}
                onRemove={onRemoveItem}
                onCustomize={onCustomizeItem}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
