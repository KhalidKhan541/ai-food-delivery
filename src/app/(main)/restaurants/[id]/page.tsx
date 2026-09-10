"use client";

import { useState } from "react";
import Link from "next/link";

const restaurantData = {
  id: 1,
  name: "Pizza Palace",
  cuisine: "Italian, Pizza, Pasta",
  description:
    "Authentic Italian pizza made with imported San Marzano tomatoes, fresh mozzarella, and hand-tossed dough. Family-owned since 1985.",
  rating: 4.8,
  reviewCount: 324,
  deliveryTime: "20-30",
  deliveryFee: "Free",
  distance: "1.2 km",
  priceRange: "$$",
  address: "123 Main Street, Downtown",
  phone: "+1 (555) 123-4567",
  openingHours: "11:00 AM - 11:00 PM",
  isOpen: true,
  aiMatch: 98,
  features: ["Delivery", "Takeaway", "Dine-in", "Outdoor seating"],
};

const menuCategories = [
  { id: "popular", label: "Most Popular" },
  { id: "pizzas", label: "Pizzas" },
  { id: "pasta", label: "Pasta" },
  { id: "sides", label: "Sides" },
  { id: "drinks", label: "Drinks" },
  { id: "desserts", label: "Desserts" },
];

const menuItems = [
  {
    id: 1,
    name: "Margherita Pizza",
    description: "Tomato sauce, fresh mozzarella, basil, extra virgin olive oil",
    price: 12.99,
    category: "pizzas",
    isPopular: true,
    isVeg: true,
    calories: 850,
    spiceLevel: 0,
  },
  {
    id: 2,
    name: "Pepperoni Pizza",
    description: "Tomato sauce, mozzarella, spicy pepperoni, oregano",
    price: 14.99,
    category: "pizzas",
    isPopular: true,
    isVeg: false,
    calories: 1100,
    spiceLevel: 1,
  },
  {
    id: 3,
    name: "Quattro Formaggi",
    description: "Mozzarella, gorgonzola, parmesan, fontina, honey drizzle",
    price: 16.99,
    category: "pizzas",
    isPopular: false,
    isVeg: true,
    calories: 950,
    spiceLevel: 0,
  },
  {
    id: 4,
    name: "Spaghetti Carbonara",
    description: "Pancetta, egg, parmesan, black pepper, spaghetti",
    price: 15.99,
    category: "pasta",
    isPopular: true,
    isVeg: false,
    calories: 780,
    spiceLevel: 0,
  },
  {
    id: 5,
    name: "Penne Arrabbiata",
    description: "Spicy tomato sauce, garlic, chili flakes, penne pasta",
    price: 13.99,
    category: "pasta",
    isPopular: false,
    isVeg: true,
    calories: 650,
    spiceLevel: 2,
  },
  {
    id: 6,
    name: "Fettuccine Alfredo",
    description: "Cream sauce, parmesan, butter, fettuccine pasta",
    price: 14.99,
    category: "pasta",
    isPopular: false,
    isVeg: true,
    calories: 880,
    spiceLevel: 0,
  },
  {
    id: 7,
    name: "Garlic Bread",
    description: "Freshly baked bread with garlic butter and herbs",
    price: 5.99,
    category: "sides",
    isPopular: true,
    isVeg: true,
    calories: 320,
    spiceLevel: 0,
  },
  {
    id: 8,
    name: "Caesar Salad",
    description: "Romaine lettuce, parmesan, croutons, Caesar dressing",
    price: 8.99,
    category: "sides",
    isPopular: false,
    isVeg: true,
    calories: 280,
    spiceLevel: 0,
  },
  {
    id: 9,
    name: "Mozzarella Sticks",
    description: "Breaded mozzarella with marinara sauce",
    price: 7.99,
    category: "sides",
    isPopular: false,
    isVeg: true,
    calories: 450,
    spiceLevel: 0,
  },
  {
    id: 10,
    name: "Coca-Cola",
    description: "330ml can",
    price: 2.49,
    category: "drinks",
    isPopular: false,
    isVeg: true,
    calories: 140,
    spiceLevel: 0,
  },
  {
    id: 11,
    name: "Italian Lemonade",
    description: "Freshly made with real lemons and mint",
    price: 3.99,
    category: "drinks",
    isPopular: true,
    isVeg: true,
    calories: 120,
    spiceLevel: 0,
  },
  {
    id: 12,
    name: "Tiramisu",
    description: "Classic Italian dessert with espresso and mascarpone",
    price: 6.99,
    category: "desserts",
    isPopular: true,
    isVeg: true,
    calories: 380,
    spiceLevel: 0,
  },
  {
    id: 13,
    name: "Panna Cotta",
    description: "Vanilla cream with berry compote",
    price: 5.99,
    category: "desserts",
    isPopular: false,
    isVeg: true,
    calories: 300,
    spiceLevel: 0,
  },
  {
    id: 14,
    name: "Diavola Pizza",
    description: "Tomato sauce, mozzarella, spicy salami, chili oil",
    price: 15.99,
    category: "pizzas",
    isPopular: false,
    isVeg: false,
    calories: 980,
    spiceLevel: 3,
  },
];

export default function RestaurantMenuPage({
  params,
}: {
  params: { id: string };
}) {
  const [activeCategory, setActiveCategory] = useState("popular");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [showInfo, setShowInfo] = useState(false);

  const addToCart = (itemId: number) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => {
      if (!prev[itemId] || prev[itemId] <= 1) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: prev[itemId] - 1 };
    });
  };

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((i) => i.id === Number(id));
    return sum + (item?.price || 0) * qty;
  }, 0);

  const cartItemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const displayedItems =
    activeCategory === "popular"
      ? menuItems.filter((i) => i.isPopular)
      : menuItems.filter((i) => i.category === activeCategory);

  const getSpiceIndicator = (level: number) => {
    return Array.from({ length: 3 }, (_, i) => (
      <span
        key={i}
        className={`text-xs ${i < level ? "text-red-500" : "text-gray-300"}`}
      >
        🌶️
      </span>
    ));
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Image */}
      <div className="relative h-64 w-full bg-muted sm:h-80">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-orange-100 text-8xl">
          🍕
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <Link
          href="/restaurants"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition-all hover:bg-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition-all hover:bg-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </div>

      {/* Restaurant Info */}
      <div className="page-container -mt-12 relative z-10">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {restaurantData.name}
                </h1>
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {restaurantData.aiMatch}% match
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{restaurantData.cuisine}</p>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                {restaurantData.description}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-4 sm:mt-0">
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <span className="text-amber-500">★</span>
                  <span className="text-xl font-bold text-foreground">{restaurantData.rating}</span>
                </div>
                <p className="text-xs text-muted-foreground">{restaurantData.reviewCount} reviews</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {restaurantData.deliveryTime} min
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">{restaurantData.distance}</span>
            <span className="text-muted-foreground">|</span>
            <span className={`font-medium ${restaurantData.deliveryFee === "Free" ? "text-emerald-600" : "text-muted-foreground"}`}>
              {restaurantData.deliveryFee === "Free" ? "Free delivery" : `${restaurantData.deliveryFee} delivery`}
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">{restaurantData.priceRange}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {restaurantData.features.map((feature) => (
              <span key={feature} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {feature}
              </span>
            ))}
          </div>

          <button onClick={() => setShowInfo(!showInfo)} className="mt-3 text-sm font-medium text-primary hover:underline">
            {showInfo ? "Hide details" : "Show more details"}
          </button>

          {showInfo && (
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm animate-fade-in">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {restaurantData.address}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {restaurantData.phone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {restaurantData.openingHours}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Categories */}
      <div className="page-container mt-6">
        <div className="sticky top-16 z-30 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex gap-1">
            {menuCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="page-container mt-6">
        <div className="space-y-3">
          {displayedItems.map((item) => (
            <div
              key={item.id}
              className="card-hover flex gap-4 p-4"
            >
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  {item.isVeg && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-emerald-500 p-0.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-lg font-bold text-foreground">
                    ${item.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.calories} cal</span>
                  {item.spiceLevel > 0 && (
                    <div className="flex gap-0.5">{getSpiceIndicator(item.spiceLevel)}</div>
                  )}
                </div>
                <div className="mt-3">
                  {cart[item.id] ? (
                    <div className="inline-flex items-center gap-3 rounded-full border border-primary bg-primary/5">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                      </button>
                      <span className="min-w-[24px] text-center text-sm font-semibold text-primary">
                        {cart[item.id]}
                      </span>
                      <button
                        onClick={() => addToCart(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item.id)}
                      className="btn-primary px-4 py-1.5 text-xs"
                    >
                      Add to cart
                    </button>
                  )}
                </div>
              </div>
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl sm:h-28 sm:w-28">
                {item.name.includes("Pizza")
                  ? "🍕"
                  : item.name.includes("Spaghetti") || item.name.includes("Penne") || item.name.includes("Fettuccine")
                  ? "🍝"
                  : item.name.includes("Salad")
                  ? "🥗"
                  : item.name.includes("Garlic") || item.name.includes("Mozzarella Sticks")
                  ? "🍞"
                  : item.name.includes("Coca") || item.name.includes("Lemonade")
                  ? "🥤"
                  : item.name.includes("Tiramisu") || item.name.includes("Panna")
                  ? "🍰"
                  : "🍽️"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Cart Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4 md:bottom-4">
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-4 shadow-xl">
            <Link href="/cart" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  <span className="text-sm font-bold">{cartItemCount}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">View Cart</p>
                  <p className="text-xs text-muted-foreground">
                    {cartItemCount} item{cartItemCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">
                  ${cartTotal.toFixed(2)}
                </span>
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
