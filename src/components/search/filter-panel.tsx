"use client";

import * as React from "react";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  RotateCcw,
  Star,
  Clock,
  DollarSign,
  Leaf,
  Flame,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  label: string;
  icon?: React.ElementType;
  count?: number;
}

interface PriceRange {
  min: number;
  max: number;
  label: string;
}

interface FilterPanelProps {
  cuisines?: FilterOption[];
  dietaryOptions?: FilterOption[];
  sortBy?: string;
  priceRange?: PriceRange[];
  deliveryTimeOptions?: FilterOption[];
  ratingOptions?: FilterOption[];
  activeFilters: {
    cuisines?: string[];
    dietary?: string[];
    priceRange?: string;
    maxDeliveryTime?: number;
    minRating?: number;
    freeDelivery?: boolean;
    openNow?: boolean;
    sortBy?: string;
  };
  onFilterChange?: (filters: FilterPanelProps["activeFilters"]) => void;
  onReset?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const defaultCuisines: FilterOption[] = [
  { id: "italian", label: "Italian" },
  { id: "japanese", label: "Japanese" },
  { id: "chinese", label: "Chinese" },
  { id: "indian", label: "Indian" },
  { id: "mexican", label: "Mexican" },
  { id: "thai", label: "Thai" },
  { id: "american", label: "American" },
  { id: "mediterranean", label: "Mediterranean" },
  { id: "korean", label: "Korean" },
  { id: "vietnamese", label: "Vietnamese" },
];

const defaultDietary: FilterOption[] = [
  { id: "vegetarian", label: "Vegetarian", icon: Leaf },
  { id: "vegan", label: "Vegan", icon: Leaf },
  { id: "gluten_free", label: "Gluten Free" },
  { id: "halal", label: "Halal" },
  { id: "spicy", label: "Spicy", icon: Flame },
];

const defaultPriceRanges: PriceRange[] = [
  { min: 0, max: 10, label: "$" },
  { min: 10, max: 20, label: "$$" },
  { min: 20, max: 40, label: "$$$" },
  { min: 40, max: Infinity, label: "$$$$" },
];

const defaultDeliveryTime: FilterOption[] = [
  { id: "15", label: "Under 15 min" },
  { id: "30", label: "Under 30 min" },
  { id: "45", label: "Under 45 min" },
  { id: "60", label: "Under 60 min" },
];

const defaultRatings: FilterOption[] = [
  { id: "4.5", label: "4.5+ Stars" },
  { id: "4.0", label: "4.0+ Stars" },
  { id: "3.5", label: "3.5+ Stars" },
  { id: "3.0", label: "3.0+ Stars" },
];

const sortOptions = [
  { id: "relevance", label: "Relevance" },
  { id: "rating", label: "Highest Rated" },
  { id: "delivery_time", label: "Fastest Delivery" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
  { id: "distance", label: "Nearest" },
  { id: "popular", label: "Most Popular" },
];

export function FilterPanel({
  cuisines = defaultCuisines,
  dietaryOptions = defaultDietary,
  priceRange = defaultPriceRanges,
  deliveryTimeOptions = defaultDeliveryTime,
  ratingOptions = defaultRatings,
  activeFilters,
  onFilterChange,
  onReset,
  isOpen = false,
  onClose,
  className,
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    sort: true,
    cuisine: true,
    dietary: false,
    price: false,
    deliveryTime: false,
    rating: false,
    other: false,
  });

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (activeFilters.cuisines?.length) count += activeFilters.cuisines.length;
    if (activeFilters.dietary?.length) count += activeFilters.dietary.length;
    if (activeFilters.priceRange) count++;
    if (activeFilters.maxDeliveryTime) count++;
    if (activeFilters.minRating) count++;
    if (activeFilters.freeDelivery) count++;
    if (activeFilters.openNow) count++;
    return count;
  }, [activeFilters]);

  function toggleSection(section: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function toggleFilter(category: string, value: string) {
    const current = (activeFilters as Record<string, unknown>)[category] as string[] | undefined;
    const updated = current?.includes(value)
      ? current.filter((v) => v !== value)
      : [...(current || []), value];
    onFilterChange?.({ ...activeFilters, [category]: updated });
  }

  function updateFilter(key: string, value: unknown) {
    onFilterChange?.({ ...activeFilters, [key]: value });
  }

  function handleReset() {
    onReset?.();
    onClose?.();
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card shadow-sm",
        isOpen && "ring-2 ring-primary/20",
        className
      )}
    >
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-card-foreground">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[calc(100vh-20rem)] overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <button
              onClick={() => toggleSection("sort")}
              className="flex w-full items-center justify-between py-2"
            >
              <span className="text-sm font-semibold">Sort By</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSections.sort && "rotate-180"
                )}
              />
            </button>

            {expandedSections.sort && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateFilter("sortBy", option.id)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                      activeFilters.sortBy === option.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <div>
            <button
              onClick={() => toggleSection("cuisine")}
              className="flex w-full items-center justify-between py-2"
            >
              <span className="text-sm font-semibold">Cuisine</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSections.cuisine && "rotate-180"
                )}
              />
            </button>

            {expandedSections.cuisine && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cuisines.map((cuisine) => (
                  <button
                    key={cuisine.id}
                    onClick={() => toggleFilter("cuisines", cuisine.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      activeFilters.cuisines?.includes(cuisine.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {cuisine.label}
                    {cuisine.count !== undefined && (
                      <span className="ml-1 text-[10px] opacity-70">
                        ({cuisine.count})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <div>
            <button
              onClick={() => toggleSection("dietary")}
              className="flex w-full items-center justify-between py-2"
            >
              <span className="text-sm font-semibold">Dietary</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSections.dietary && "rotate-180"
                )}
              />
            </button>

            {expandedSections.dietary && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dietaryOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleFilter("dietary", option.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      activeFilters.dietary?.includes(option.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {option.icon && <option.icon className="h-3 w-3" />}
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <div>
            <button
              onClick={() => toggleSection("price")}
              className="flex w-full items-center justify-between py-2"
            >
              <span className="text-sm font-semibold">Price Range</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSections.price && "rotate-180"
                )}
              />
            </button>

            {expandedSections.price && (
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {priceRange.map((range) => (
                  <button
                    key={range.label}
                    onClick={() =>
                      updateFilter(
                        "priceRange",
                        activeFilters.priceRange === range.label ? undefined : range.label
                      )
                    }
                    className={cn(
                      "rounded-lg py-2 text-sm font-medium transition-colors",
                      activeFilters.priceRange === range.label
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <div>
            <button
              onClick={() => toggleSection("deliveryTime")}
              className="flex w-full items-center justify-between py-2"
            >
              <span className="text-sm font-semibold">Delivery Time</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSections.deliveryTime && "rotate-180"
                )}
              />
            </button>

            {expandedSections.deliveryTime && (
              <div className="mt-2 space-y-1.5">
                {deliveryTimeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() =>
                      updateFilter(
                        "maxDeliveryTime",
                        activeFilters.maxDeliveryTime === parseInt(option.id)
                          ? undefined
                          : parseInt(option.id)
                      )
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors w-full",
                      activeFilters.maxDeliveryTime === parseInt(option.id)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <div>
            <button
              onClick={() => toggleSection("rating")}
              className="flex w-full items-center justify-between py-2"
            >
              <span className="text-sm font-semibold">Rating</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSections.rating && "rotate-180"
                )}
              />
            </button>

            {expandedSections.rating && (
              <div className="mt-2 space-y-1.5">
                {ratingOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() =>
                      updateFilter(
                        "minRating",
                        activeFilters.minRating === parseFloat(option.id)
                          ? undefined
                          : parseFloat(option.id)
                      )
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors w-full",
                      activeFilters.minRating === parseFloat(option.id)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <div>
            <button
              onClick={() => toggleSection("other")}
              className="flex w-full items-center justify-between py-2"
            >
              <span className="text-sm font-semibold">Other</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSections.other && "rotate-180"
                )}
              />
            </button>

            {expandedSections.other && (
              <div className="mt-2 space-y-2">
                <button
                  onClick={() => updateFilter("freeDelivery", !activeFilters.freeDelivery)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    activeFilters.freeDelivery
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Truck className="h-3.5 w-3.5" />
                  Free Delivery
                </button>

                <button
                  onClick={() => updateFilter("openNow", !activeFilters.openNow)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    activeFilters.openNow
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Open Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Show {activeFilterCount} Result{activeFilterCount !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}
