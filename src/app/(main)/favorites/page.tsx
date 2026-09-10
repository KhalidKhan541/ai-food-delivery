"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  Clock,
  Star,
  MapPin,
  Trash2,
  Plus,
  Search,
  UtensilsCrossed,
  ShoppingCart,
  Filter,
} from "lucide-react";

type FavoriteRestaurant = {
  id: string;
  name: string;
  image: string;
  cuisine: string;
  rating: number;
  reviews: number;
  deliveryTime: string;
  deliveryFee: number;
  distance: string;
  lastOrdered?: string;
  addedAt: string;
};

type SortBy = "recent" | "name" | "rating" | "last_ordered";

const MOCK_FAVORITES: FavoriteRestaurant[] = [
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
    lastOrdered: "2 days ago",
    addedAt: "1 week ago",
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
    lastOrdered: "1 day ago",
    addedAt: "3 days ago",
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
    addedAt: "5 days ago",
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
    lastOrdered: "3 days ago",
    addedAt: "2 weeks ago",
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
    addedAt: "1 week ago",
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
    lastOrdered: "5 days ago",
    addedAt: "3 weeks ago",
  },
];

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>(MOCK_FAVORITES);
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const filteredFavorites = favorites
    .filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rating":
          return b.rating - a.rating;
        case "last_ordered":
          if (!a.lastOrdered) return 1;
          if (!b.lastOrdered) return -1;
          return 0;
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
            <p className="text-gray-500 mt-1">
              {favorites.length} saved restaurant{favorites.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Sort
            </button>
            {showSortMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                {[
                  { value: "recent", label: "Recently added" },
                  { value: "name", label: "Name" },
                  { value: "rating", label: "Highest rated" },
                  { value: "last_ordered", label: "Last ordered" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value as SortBy);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      sortBy === option.value ? "text-primary font-medium" : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search favorites..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        {/* Favorites List */}
        {filteredFavorites.length > 0 ? (
          <div className="space-y-4">
            {filteredFavorites.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="flex gap-4 p-4">
                  <Link
                    href={`/restaurant/${restaurant.id}`}
                    className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-gray-100 shrink-0"
                  >
                    <Image
                      src={restaurant.image}
                      alt={restaurant.name}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                      sizes="128px"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/restaurant/${restaurant.id}`}
                        className="group"
                      >
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">
                          {restaurant.name}
                        </h3>
                      </Link>
                      <button
                        onClick={() => removeFavorite(restaurant.id)}
                        className="p-2 text-gray-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                        aria-label="Remove from favorites"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{restaurant.cuisine}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-sm font-semibold text-gray-900">
                          {restaurant.rating}
                        </span>
                        <span className="text-xs text-gray-400">({restaurant.reviews})</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{restaurant.deliveryTime} min</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{restaurant.distance}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {restaurant.deliveryFee === 0 ? (
                        <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                          Free delivery
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          ${restaurant.deliveryFee.toFixed(2)} delivery
                        </span>
                      )}
                      {restaurant.lastOrdered && (
                        <span className="text-xs text-gray-400">
                          Last ordered {restaurant.lastOrdered}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/50 flex gap-3">
                  <Link
                    href={`/restaurant/${restaurant.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Order again
                  </Link>
                  <Link
                    href={`/restaurant/${restaurant.id}?view=menu`}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    View menu
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              {searchQuery ? (
                <Search className="w-8 h-8 text-gray-400" />
              ) : (
                <Heart className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? "No matches found" : "No favorites yet"}
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              {searchQuery
                ? `No favorites match "${searchQuery}"`
                : "Start exploring restaurants and save the ones you love!"}
            </p>
            {!searchQuery && (
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Discover restaurants
              </Link>
            )}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
