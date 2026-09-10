"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  SlidersHorizontal,
  X,
  Clock,
  Star,
  MapPin,
  Flame,
  Leaf,
  Zap,
  ChevronDown,
  Heart,
  ShoppingCart,
  Utensils,
  Pizza,
  Coffee,
  Salad,
  Beef,
  IceCreamCone,
} from "lucide-react";

type CuisineFilter = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type Restaurant = {
  id: string;
  name: string;
  image: string;
  cuisine: string;
  rating: number;
  reviews: number;
  deliveryTime: string;
  deliveryFee: number;
  distance: string;
  tags: string[];
  isPromoted?: boolean;
  isNew?: boolean;
  isFavorite: boolean;
};

type SortOption = "relevance" | "rating" | "delivery_time" | "distance" | "price";

const CUISINE_FILTERS: CuisineFilter[] = [
  { id: "all", label: "All", icon: <Utensils className="w-5 h-5" /> },
  { id: "pizza", label: "Pizza", icon: <Pizza className="w-5 h-5" /> },
  { id: "burger", label: "Burgers", icon: <Beef className="w-5 h-5" /> },
  { id: "sushi", label: "Sushi", icon: <Utensils className="w-5 h-5" /> },
  { id: "salad", label: "Salads", icon: <Salad className="w-5 h-5" /> },
  { id: "coffee", label: "Coffee", icon: <Coffee className="w-5 h-5" /> },
  { id: "dessert", label: "Desserts", icon: <IceCreamCone className="w-5 h-5" /> },
  { id: "healthy", label: "Healthy", icon: <Leaf className="w-5 h-5" /> },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Highest Rated" },
  { value: "delivery_time", label: "Fastest Delivery" },
  { value: "distance", label: "Nearest" },
  { value: "price", label: "Price: Low to High" },
];

const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: "1",
    name: "Bella Napoli",
    image: "/images/restaurants/bella-napoli.jpg",
    cuisine: "Italian",
    rating: 4.8,
    reviews: 342,
    deliveryTime: "25-35",
    deliveryFee: 0,
    distance: "1.2 km",
    tags: ["Pizza", "Pasta", "Italian"],
    isPromoted: true,
    isFavorite: false,
  },
  {
    id: "2",
    name: "Sakura Garden",
    image: "/images/restaurants/sakura.jpg",
    cuisine: "Japanese",
    rating: 4.6,
    reviews: 218,
    deliveryTime: "30-45",
    deliveryFee: 2.99,
    distance: "2.5 km",
    tags: ["Sushi", "Ramen", "Japanese"],
    isNew: true,
    isFavorite: true,
  },
  {
    id: "3",
    name: "Green Bowl",
    image: "/images/restaurants/green-bowl.jpg",
    cuisine: "Healthy",
    rating: 4.9,
    reviews: 156,
    deliveryTime: "15-25",
    deliveryFee: 1.99,
    distance: "0.8 km",
    tags: ["Salads", "Vegan", "Healthy"],
    isFavorite: false,
  },
  {
    id: "4",
    name: "Burger Barn",
    image: "/images/restaurants/burger-barn.jpg",
    cuisine: "American",
    rating: 4.4,
    reviews: 523,
    deliveryTime: "20-30",
    deliveryFee: 0,
    distance: "1.8 km",
    tags: ["Burgers", "Fries", "American"],
    isPromoted: true,
    isFavorite: false,
  },
  {
    id: "5",
    name: "Sweet Dreams Bakery",
    image: "/images/restaurants/sweet-dreams.jpg",
    cuisine: "Desserts",
    rating: 4.7,
    reviews: 189,
    deliveryTime: "20-40",
    deliveryFee: 2.49,
    distance: "3.1 km",
    tags: ["Cakes", "Pastries", "Desserts"],
    isNew: false,
    isFavorite: true,
  },
  {
    id: "6",
    name: "Spice Route",
    image: "/images/restaurants/spice-route.jpg",
    cuisine: "Indian",
    rating: 4.5,
    reviews: 276,
    deliveryTime: "35-50",
    deliveryFee: 1.49,
    distance: "4.2 km",
    tags: ["Curry", "Biryani", "Indian"],
    isFavorite: false,
  },
  {
    id: "7",
    name: "Le Petit Café",
    image: "/images/restaurants/petit-cafe.jpg",
    cuisine: "French",
    rating: 4.8,
    reviews: 98,
    deliveryTime: "25-40",
    deliveryFee: 3.49,
    distance: "2.0 km",
    tags: ["Coffee", "Pastries", "French"],
    isFavorite: false,
  },
  {
    id: "8",
    name: "Dragon Palace",
    image: "/images/restaurants/dragon-palace.jpg",
    cuisine: "Chinese",
    rating: 4.3,
    reviews: 412,
    deliveryTime: "30-45",
    deliveryFee: 1.99,
    distance: "3.5 km",
    tags: ["Dim Sum", "Noodles", "Chinese"],
    isFavorite: false,
  },
];

const AI_SUGGESTIONS = [
  "Based on your order history, try Italian tonight",
  "Popular near you: Sushi restaurants",
  "New opening: Green Bowl - 20% off first order",
  "Healthy options for your fitness goals",
  "Quick lunch: 15-min delivery spots nearby",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeCuisine, setActiveCuisine] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [maxDeliveryFee, setMaxDeliveryFee] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(MOCK_RESTAURANTS.filter((r) => r.isFavorite).map((r) => r.id))
  );

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const filteredRestaurants = useMemo(() => {
    let results = MOCK_RESTAURANTS.filter((r) => {
      const matchesQuery =
        query === "" ||
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(query.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
      const matchesCuisine =
        activeCuisine === "all" ||
        r.cuisine.toLowerCase() === activeCuisine ||
        r.tags.some((t) => t.toLowerCase() === activeCuisine);
      const matchesFee = r.deliveryFee <= maxDeliveryFee;
      const matchesRating = r.rating >= minRating;
      return matchesQuery && matchesCuisine && matchesFee && matchesRating;
    });

    results.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "delivery_time":
          return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
        case "distance":
          return parseFloat(a.distance) - parseFloat(b.distance);
        case "price":
          return a.deliveryFee - b.deliveryFee;
        default:
          return (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0) || b.rating - a.rating;
      }
    });

    return results;
  }, [query, activeCuisine, sortBy, maxDeliveryFee, minRating]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Search Restaurants</h1>
          <p className="text-gray-500 mt-1">Find your next favorite meal</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants, cuisines, or dishes..."
              className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="absolute right-16 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* AI Suggestions */}
        {showAISuggestions && query === "" && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-900">AI Suggestions</span>
              </div>
              <button
                onClick={() => setShowAISuggestions(false)}
                className="p-1 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {AI_SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const searchTerm = suggestion.split(": ")[1] || suggestion.split(" ").slice(-2).join(" ");
                    setQuery(searchTerm);
                  }}
                  className="text-xs px-3 py-1.5 bg-white rounded-full text-gray-600 hover:text-primary hover:bg-primary/5 border border-gray-100 hover:border-primary/20 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 animate-in slide-in-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Filters</h3>
              <button
                onClick={() => {
                  setMaxDeliveryFee(10);
                  setMinRating(0);
                  setSortBy("relevance");
                }}
                className="text-sm text-primary hover:underline"
              >
                Reset all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Max delivery fee: ${maxDeliveryFee.toFixed(2)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={maxDeliveryFee}
                  onChange={(e) => setMaxDeliveryFee(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Free</span>
                  <span>$10</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Minimum rating: {minRating > 0 ? `${minRating}+` : "Any"}
                </label>
                <div className="flex gap-2">
                  {[0, 4, 4.5, 4.7].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        minRating === rating
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {rating > 0 && <Star className="w-3 h-3 fill-current" />}
                      {rating > 0 ? rating : "Any"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Sort by</label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full appearance-none px-3 py-2 pr-8 bg-gray-100 border-0 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cuisine Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {CUISINE_FILTERS.map((cuisine) => (
            <button
              key={cuisine.id}
              onClick={() => setActiveCuisine(cuisine.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeCuisine === cuisine.id
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {cuisine.icon}
              {cuisine.label}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? "s" : ""} found
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>Delivering to Home</span>
          </div>
        </div>

        {/* Restaurant Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/restaurant/${restaurant.id}`}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300"
            >
              <div className="relative aspect-[4/3] bg-gray-100">
                <Image
                  src={restaurant.image}
                  alt={restaurant.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  {restaurant.isPromoted && (
                    <span className="px-2 py-1 bg-accent text-xs font-semibold rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Promoted
                    </span>
                  )}
                  {restaurant.isNew && (
                    <span className="px-2 py-1 bg-success text-xs font-semibold rounded-full">
                      New
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(restaurant.id);
                  }}
                  className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      favorites.has(restaurant.id)
                        ? "text-primary fill-primary"
                        : "text-gray-400"
                    }`}
                  />
                </button>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-medium">{restaurant.deliveryTime} min</span>
                    <span className="mx-1">·</span>
                    <span>
                      {restaurant.deliveryFee === 0
                        ? "Free delivery"
                        : `$${restaurant.deliveryFee.toFixed(2)} delivery`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                    {restaurant.name}
                  </h3>
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                    <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {restaurant.rating}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-2">{restaurant.cuisine}</p>
                <div className="flex flex-wrap gap-1">
                  {restaurant.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>{restaurant.distance}</span>
                  <span className="mx-1">·</span>
                  <span>{restaurant.reviews} reviews</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredRestaurants.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Try adjusting your search or filters to find what you&apos;re looking for
            </p>
            <button
              onClick={() => {
                setQuery("");
                setActiveCuisine("all");
                setSortBy("relevance");
                setMaxDeliveryFee(10);
                setMinRating(0);
              }}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
