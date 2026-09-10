"use client";

import { useState } from "react";
import Link from "next/link";

const categories = [
  { id: "all", label: "All", icon: "🍽️" },
  { id: "pizza", label: "Pizza", icon: "🍕" },
  { id: "sushi", label: "Sushi", icon: "🍣" },
  { id: "burger", label: "Burgers", icon: "🍔" },
  { id: "asian", label: "Asian", icon: "🍜" },
  { id: "healthy", label: "Healthy", icon: "🥗" },
  { id: "dessert", label: "Desserts", icon: "🍰" },
  { id: "coffee", label: "Coffee", icon: "☕" },
];

const recommendedRestaurants = [
  {
    id: 1,
    name: "Pizza Palace",
    cuisine: "Italian • Pizza",
    rating: 4.8,
    reviewCount: 324,
    deliveryTime: "20-30",
    deliveryFee: "Free",
    distance: "1.2 km",
    image: "/restaurant-pizza.jpg",
    isPromoted: true,
    aiMatch: 98,
  },
  {
    id: 2,
    name: "Tokyo Grill",
    cuisine: "Japanese • Asian",
    rating: 4.9,
    reviewCount: 512,
    deliveryTime: "25-35",
    deliveryFee: "$2.99",
    distance: "0.8 km",
    image: "/restaurant-asian.jpg",
    isPromoted: false,
    aiMatch: 95,
  },
  {
    id: 3,
    name: "Green Garden",
    cuisine: "Healthy • Salads",
    rating: 4.7,
    reviewCount: 189,
    deliveryTime: "15-25",
    deliveryFee: "Free",
    distance: "0.5 km",
    image: "/restaurant-healthy.jpg",
    isPromoted: false,
    aiMatch: 92,
  },
  {
    id: 4,
    name: "Burger Barn",
    cuisine: "American • Burgers",
    rating: 4.6,
    reviewCount: 876,
    deliveryTime: "15-25",
    deliveryFee: "$1.99",
    distance: "1.5 km",
    image: "/restaurant-burger.jpg",
    isPromoted: true,
    aiMatch: 90,
  },
  {
    id: 5,
    name: "Curry House",
    cuisine: "Indian • Curry",
    rating: 4.8,
    reviewCount: 298,
    deliveryTime: "30-40",
    deliveryFee: "$2.49",
    distance: "2.1 km",
    image: "/restaurant-indian.jpg",
    isPromoted: false,
    aiMatch: 88,
  },
  {
    id: 6,
    name: "Taco Fiesta",
    cuisine: "Mexican • Tacos",
    rating: 4.5,
    reviewCount: 445,
    deliveryTime: "20-30",
    deliveryFee: "Free",
    distance: "1.0 km",
    image: "/restaurant-mexican.jpg",
    isPromoted: false,
    aiMatch: 85,
  },
];

const popularDishes = [
  {
    id: 1,
    name: "Margherita Pizza",
    restaurant: "Pizza Palace",
    price: 12.99,
    image: "/dish-pizza.jpg",
    category: "pizza",
  },
  {
    id: 2,
    name: "Chicken Teriyaki",
    restaurant: "Tokyo Grill",
    price: 14.5,
    image: "/dish-teriyaki.jpg",
    category: "asian",
  },
  {
    id: 3,
    name: "Caesar Salad",
    restaurant: "Green Garden",
    price: 9.99,
    image: "/dish-salad.jpg",
    category: "healthy",
  },
  {
    id: 4,
    name: "Classic Burger",
    restaurant: "Burger Barn",
    price: 11.99,
    image: "/dish-burger.jpg",
    category: "burger",
  },
  {
    id: 5,
    name: "Pad Thai",
    restaurant: "Tokyo Grill",
    price: 13.25,
    image: "/dish-padthai.jpg",
    category: "asian",
  },
  {
    id: 6,
    name: "Butter Chicken",
    restaurant: "Curry House",
    price: 15.99,
    image: "/dish-curry.jpg",
    category: "asian",
  },
];

const recentOrders = [
  {
    id: 1,
    restaurant: "Pizza Palace",
    items: "2x Margherita, 1x Garlic Bread",
    total: 28.97,
    date: "2 hours ago",
    status: "delivered",
  },
  {
    id: 2,
    restaurant: "Tokyo Grill",
    items: "1x Teriyaki Bowl, 1x Edamame",
    total: 19.5,
    date: "Yesterday",
    status: "delivered",
  },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredDishes =
    selectedCategory === "all"
      ? popularDishes
      : popularDishes.filter((d) => d.category === selectedCategory);

  return (
    <div className="page-container py-6">
      {/* Greeting Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Good evening, John 👋
            </h1>
            <p className="mt-1 text-muted-foreground">
              What would you like to eat today?
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-primary/10 px-4 py-2 sm:flex">
            <span className="text-sm font-medium text-primary">
              📍 Downtown, NYC
            </span>
            <svg
              className="h-4 w-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* AI Recommendation Banner */}
      <section className="mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-orange-400 p-6 text-white">
          <div className="relative z-10 flex items-center justify-between">
            <div className="max-w-md">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white"></span>
                </span>
                AI Powered
              </div>
              <h2 className="text-xl font-bold">
                Your personalized picks are ready
              </h2>
              <p className="mt-1 text-sm text-white/80">
                Based on your recent orders and preferences, we&apos;ve found 6 new
                restaurants you&apos;ll love.
              </p>
              <Link
                href="/restaurants"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-white/90"
              >
                Explore Picks
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
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
            <div className="hidden text-8xl opacity-30 lg:block">🤖</div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10"></div>
          <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10"></div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-lg">Categories</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Popular Dishes */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-lg">Popular dishes</h2>
          <Link
            href="/restaurants"
            className="text-sm font-medium text-primary hover:underline"
          >
            See all
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {filteredDishes.map((dish) => (
            <div
              key={dish.id}
              className="flex-shrink-0 w-44 rounded-xl border border-border bg-card p-3 transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20"
            >
              <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-muted text-3xl">
                {dish.name.includes("Pizza")
                  ? "🍕"
                  : dish.name.includes("Teriyaki")
                  ? "🍜"
                  : dish.name.includes("Caesar") || dish.name.includes("Salad")
                  ? "🥗"
                  : dish.name.includes("Burger")
                  ? "🍔"
                  : dish.name.includes("Pad")
                  ? "🥘"
                  : "🍛"}
              </div>
              <h3 className="text-sm font-semibold text-foreground truncate">
                {dish.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {dish.restaurant}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-primary">
                  ${dish.price.toFixed(2)}
                </span>
                <button className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended Restaurants */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title text-lg">Recommended for you</h2>
            <p className="section-subtitle">Based on your taste profile</p>
          </div>
          <Link
            href="/restaurants"
            className="text-sm font-medium text-primary hover:underline"
          >
            See all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/(main)/restaurants/${restaurant.id}`}
              className="group"
            >
              <div className="card-hover overflow-hidden">
                <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-lg bg-muted">
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-orange-100 text-4xl">
                    {restaurant.name.includes("Pizza")
                      ? "🍕"
                      : restaurant.name.includes("Tokyo") || restaurant.name.includes("Grill")
                      ? "🍣"
                      : restaurant.name.includes("Green")
                      ? "🥗"
                      : restaurant.name.includes("Burger")
                      ? "🍔"
                      : restaurant.name.includes("Curry")
                      ? "🍛"
                      : "🌮"}
                  </div>
                  <div className="absolute left-3 top-3 flex gap-2">
                    {restaurant.isPromoted && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                        Sponsored
                      </span>
                    )}
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {restaurant.aiMatch}% match
                    </span>
                  </div>
                  <button
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-400 shadow-sm transition-all hover:bg-white hover:text-red-500"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
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
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {restaurant.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {restaurant.cuisine}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <span className="text-amber-500">★</span>
                      <span className="font-medium text-foreground">
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
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        restaurant.deliveryFee === "Free"
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {restaurant.deliveryFee === "Free"
                        ? "Free delivery"
                        : `${restaurant.deliveryFee} delivery`}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-lg">Reorder</h2>
            <Link
              href="/orders"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all orders
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg">
                    🔄
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {order.restaurant}
                    </p>
                    <p className="text-sm text-muted-foreground">{order.items}</p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">
                    ${order.total.toFixed(2)}
                  </span>
                  <button className="btn-primary px-3 py-1.5 text-xs">
                    Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
