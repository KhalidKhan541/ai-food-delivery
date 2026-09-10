"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const allRestaurants = [
  {
    id: 1,
    name: "Pizza Palace",
    cuisine: "Italian • Pizza • Pasta",
    rating: 4.8,
    reviewCount: 324,
    deliveryTime: "20-30",
    deliveryFee: "Free",
    distance: "1.2 km",
    priceRange: "$$",
    tags: ["popular", "top-rated"],
    image: "/restaurant-pizza.jpg",
    aiMatch: 98,
    isOpen: true,
  },
  {
    id: 2,
    name: "Tokyo Grill",
    cuisine: "Japanese • Asian • Sushi",
    rating: 4.9,
    reviewCount: 512,
    deliveryTime: "25-35",
    deliveryFee: "$2.99",
    distance: "0.8 km",
    priceRange: "$$$",
    tags: ["popular", "new"],
    image: "/restaurant-asian.jpg",
    aiMatch: 95,
    isOpen: true,
  },
  {
    id: 3,
    name: "Green Garden",
    cuisine: "Healthy • Salads • Bowls",
    rating: 4.7,
    reviewCount: 189,
    deliveryTime: "15-25",
    deliveryFee: "Free",
    distance: "0.5 km",
    priceRange: "$$",
    tags: ["healthy", "organic"],
    image: "/restaurant-healthy.jpg",
    aiMatch: 92,
    isOpen: true,
  },
  {
    id: 4,
    name: "Burger Barn",
    cuisine: "American • Burgers • Fries",
    rating: 4.6,
    reviewCount: 876,
    deliveryTime: "15-25",
    deliveryFee: "$1.99",
    distance: "1.5 km",
    priceRange: "$",
    tags: ["popular", "fast"],
    image: "/restaurant-burger.jpg",
    aiMatch: 90,
    isOpen: true,
  },
  {
    id: 5,
    name: "Curry House",
    cuisine: "Indian • Curry • Naan",
    rating: 4.8,
    reviewCount: 298,
    deliveryTime: "30-40",
    deliveryFee: "$2.49",
    distance: "2.1 km",
    priceRange: "$$",
    tags: ["spicy", "authentic"],
    image: "/restaurant-indian.jpg",
    aiMatch: 88,
    isOpen: false,
  },
  {
    id: 6,
    name: "Taco Fiesta",
    cuisine: "Mexican • Tacos • Burritos",
    rating: 4.5,
    reviewCount: 445,
    deliveryTime: "20-30",
    deliveryFee: "Free",
    distance: "1.0 km",
    priceRange: "$",
    tags: ["popular", "late-night"],
    image: "/restaurant-mexican.jpg",
    aiMatch: 85,
    isOpen: true,
  },
  {
    id: 7,
    name: "Pho 99",
    cuisine: "Vietnamese • Pho • Noodles",
    rating: 4.7,
    reviewCount: 201,
    deliveryTime: "25-35",
    deliveryFee: "$1.49",
    distance: "1.8 km",
    priceRange: "$",
    tags: ["authentic", "comfort"],
    image: "/restaurant-vietnamese.jpg",
    aiMatch: 82,
    isOpen: true,
  },
  {
    id: 8,
    name: "Sushi Master",
    cuisine: "Japanese • Sushi • Ramen",
    rating: 4.9,
    reviewCount: 678,
    deliveryTime: "30-40",
    deliveryFee: "$3.99",
    distance: "2.5 km",
    priceRange: "$$$",
    tags: ["premium", "top-rated"],
    image: "/restaurant-sushi.jpg",
    aiMatch: 80,
    isOpen: true,
  },
  {
    id: 9,
    name: "Mediterranean Breeze",
    cuisine: "Mediterranean • Greek • Falafel",
    rating: 4.6,
    reviewCount: 156,
    deliveryTime: "20-30",
    deliveryFee: "Free",
    distance: "1.3 km",
    priceRange: "$$",
    tags: ["healthy", "halal"],
    image: "/restaurant-med.jpg",
    aiMatch: 78,
    isOpen: true,
  },
];

const filterOptions = [
  { id: "all", label: "All Restaurants" },
  { id: "open", label: "Open Now" },
  { id: "free-delivery", label: "Free Delivery" },
  { id: "top-rated", label: "Top Rated" },
  { id: "nearby", label: "Nearest" },
  { id: "fast", label: "Fastest" },
  { id: "budget", label: "Budget Friendly" },
];

const sortOptions = [
  { id: "recommended", label: "Recommended" },
  { id: "rating", label: "Highest Rated" },
  { id: "delivery-time", label: "Fastest Delivery" },
  { id: "distance", label: "Nearest" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
];

export default function RestaurantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");

  const filteredRestaurants = useMemo(() => {
    let results = [...allRestaurants];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q)
      );
    }

    switch (activeFilter) {
      case "open":
        results = results.filter((r) => r.isOpen);
        break;
      case "free-delivery":
        results = results.filter((r) => r.deliveryFee === "Free");
        break;
      case "top-rated":
        results = results.filter((r) => r.rating >= 4.7);
        break;
      case "nearby":
        results = results.filter((r) => parseFloat(r.distance) <= 1.5);
        break;
      case "fast":
        results = results.filter(
          (r) => parseInt(r.deliveryTime.split("-")[0]) <= 20
        );
        break;
      case "budget":
        results = results.filter((r) => r.priceRange === "$");
        break;
    }

    switch (sortBy) {
      case "rating":
        results.sort((a, b) => b.rating - a.rating);
        break;
      case "delivery-time":
        results.sort(
          (a, b) =>
            parseInt(a.deliveryTime.split("-")[0]) -
            parseInt(b.deliveryTime.split("-")[0])
        );
        break;
      case "distance":
        results.sort(
          (a, b) => parseFloat(a.distance) - parseFloat(b.distance)
        );
        break;
      case "price-low":
        results.sort(
          (a, b) => a.priceRange.length - b.priceRange.length
        );
        break;
      case "price-high":
        results.sort(
          (a, b) => b.priceRange.length - a.priceRange.length
        );
        break;
      default:
        results.sort((a, b) => b.aiMatch - a.aiMatch);
    }

    return results;
  }, [searchQuery, activeFilter, sortBy]);

  return (
    <div className="page-container py-6">
      {/* Header */}
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Restaurants</h1>
        <p className="mt-1 text-muted-foreground">
          Discover {allRestaurants.length} restaurants near you
        </p>
      </section>

      {/* Search */}
      <section className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name, cuisine, or dish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-11 pr-4"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                activeFilter === filter.id
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {/* Sort */}
      <section className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredRestaurants.length} restaurant
          {filteredRestaurants.length !== 1 ? "s" : ""} found
        </p>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input-field w-auto py-1.5 text-sm"
        >
          {sortOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </section>

      {/* Restaurant List */}
      {filteredRestaurants.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl">🔍</div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No restaurants found
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setActiveFilter("all");
            }}
            className="btn-primary mt-4"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/(main)/restaurants/${restaurant.id}`}
              className="group block"
            >
              <div className="card-hover overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl bg-muted sm:aspect-auto sm:h-48 sm:w-56 sm:rounded-t-none sm:rounded-l-xl">
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-orange-100 text-5xl">
                      {restaurant.name.includes("Pizza")
                        ? "🍕"
                        : restaurant.name.includes("Tokyo") || restaurant.name.includes("Sushi")
                        ? "🍣"
                        : restaurant.name.includes("Green")
                        ? "🥗"
                        : restaurant.name.includes("Burger")
                        ? "🍔"
                        : restaurant.name.includes("Curry")
                        ? "🍛"
                        : restaurant.name.includes("Taco")
                        ? "🌮"
                        : restaurant.name.includes("Pho")
                        ? "🍜"
                        : restaurant.name.includes("Mediterranean")
                        ? "🥙"
                        : "🍽️"}
                    </div>
                    <div className="absolute left-3 top-3 flex gap-2">
                      {restaurant.aiMatch >= 90 && (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                          {restaurant.aiMatch}% match
                        </span>
                      )}
                      {!restaurant.isOpen && (
                        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs font-semibold text-white">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {restaurant.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {restaurant.cuisine}
                        </p>
                      </div>
                      <button
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                        onClick={(e) => e.preventDefault()}
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="text-amber-500">★</span>
                        <span className="font-semibold text-foreground">
                          {restaurant.rating}
                        </span>
                        <span className="text-muted-foreground">
                          ({restaurant.reviewCount})
                        </span>
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {restaurant.deliveryTime} min
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {restaurant.distance}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {restaurant.priceRange}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          restaurant.deliveryFee === "Free"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {restaurant.deliveryFee === "Free"
                          ? "Free delivery"
                          : `${restaurant.deliveryFee} delivery`}
                      </span>
                      {restaurant.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                          {tag.replace("-", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
