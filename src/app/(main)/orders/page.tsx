"use client";

import { useState } from "react";
import Link from "next/link";

interface Order {
  id: string;
  restaurant: string;
  items: string[];
  total: number;
  date: string;
  status: "delivered" | "in-progress" | "cancelled";
  estimatedTime?: string;
  deliveryAddress: string;
}

const orders: Order[] = [
  {
    id: "ORD-2024-001",
    restaurant: "Pizza Palace",
    items: ["2x Margherita Pizza", "1x Garlic Bread", "1x Tiramisu"],
    total: 38.96,
    date: "Today, 7:30 PM",
    status: "in-progress",
    estimatedTime: "8:00 PM",
    deliveryAddress: "123 Home Street, Apt 4B",
  },
  {
    id: "ORD-2024-002",
    restaurant: "Tokyo Grill",
    items: ["1x Chicken Teriyaki Bowl", "1x Edamame", "1x Miso Soup"],
    total: 24.49,
    date: "Yesterday, 12:15 PM",
    status: "delivered",
    deliveryAddress: "123 Home Street, Apt 4B",
  },
  {
    id: "ORD-2024-003",
    restaurant: "Green Garden",
    items: ["1x Caesar Salad", "1x Quinoa Bowl", "1x Green Smoothie"],
    total: 22.97,
    date: "Dec 8, 6:45 PM",
    status: "delivered",
    deliveryAddress: "456 Office Blvd, Floor 3",
  },
  {
    id: "ORD-2024-004",
    restaurant: "Burger Barn",
    items: ["2x Classic Burger", "1x Loaded Fries", "2x Milkshake"],
    total: 36.96,
    date: "Dec 5, 8:20 PM",
    status: "delivered",
    deliveryAddress: "123 Home Street, Apt 4B",
  },
  {
    id: "ORD-2024-005",
    restaurant: "Curry House",
    items: ["1x Butter Chicken", "1x Garlic Naan", "1x Mango Lassi"],
    total: 19.97,
    date: "Dec 3, 7:00 PM",
    status: "cancelled",
    deliveryAddress: "123 Home Street, Apt 4B",
  },
  {
    id: "ORD-2024-006",
    restaurant: "Taco Fiesta",
    items: ["3x Street Tacos", "1x Guacamole", "1x Horchata"],
    total: 21.47,
    date: "Dec 1, 1:30 PM",
    status: "delivered",
    deliveryAddress: "456 Office Blvd, Floor 3",
  },
];

const statusConfig = {
  "delivered": {
    label: "Delivered",
    color: "bg-emerald-50 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  "in-progress": {
    label: "On the way",
    color: "bg-primary/10 text-primary",
    dotColor: "bg-primary",
  },
  "cancelled": {
    label: "Cancelled",
    color: "bg-destructive/10 text-destructive",
    dotColor: "bg-destructive",
  },
};

const filters = ["All", "In Progress", "Delivered", "Cancelled"];

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredOrders =
    activeFilter === "All"
      ? orders
      : orders.filter(
          (o) =>
            (activeFilter === "In Progress" && o.status === "in-progress") ||
            (activeFilter === "Delivered" && o.status === "delivered") ||
            (activeFilter === "Cancelled" && o.status === "cancelled")
        );

  const activeOrders = orders.filter((o) => o.status === "in-progress");

  return (
    <div className="page-container py-6">
      {/* Header */}
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
        <p className="mt-1 text-muted-foreground">
          {orders.length} total orders
        </p>
      </section>

      {/* Active Order Banner */}
      {activeOrders.length > 0 && (
        <section className="mb-6">
          {activeOrders.map((order) => (
            <Link
              key={order.id}
              href={`/(main)/orders/${order.id}`}
              className="block"
            >
              <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4 transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
                      <svg className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21a.75.75 0 00.75-.75V11.25a3 3 0 00-3-3h-1.5l-1.72-4.578A1.5 1.5 0 0013.1 2.618l-.1.132V7.5h-2.25V3.75a.75.75 0 00-.75-.75H8.25" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Order from {order.restaurant}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Estimated delivery by {order.estimatedTime}
                      </p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Order placed</span>
                    <span>Preparing</span>
                    <span>On the way</span>
                    <span>Delivered</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-3/4 rounded-full bg-primary transition-all"></div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Filters */}
      <section className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                activeFilter === filter
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-6xl">📋</div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No orders found
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeFilter === "All"
              ? "You haven't placed any orders yet"
              : `No ${activeFilter.toLowerCase()} orders`}
          </p>
          <Link href="/restaurants" className="btn-primary mt-6">
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status];
            return (
              <Link
                key={order.id}
                href={`/(main)/orders/${order.id}`}
                className="block"
              >
                <div className="card-hover">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl">
                        {order.status === "in-progress"
                          ? "🚚"
                          : order.status === "delivered"
                          ? "✅"
                          : "❌"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {order.restaurant}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${status.dotColor}`}
                            ></span>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {order.items.join(" • ")}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{order.id}</span>
                          <span>•</span>
                          <span>{order.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        ${order.total.toFixed(2)}
                      </p>
                      {order.status === "delivered" && (
                        <button
                          className="mt-1 text-xs font-medium text-primary hover:underline"
                          onClick={(e) => e.preventDefault()}
                        >
                          Reorder
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Help Section */}
      <section className="mt-12">
        <div className="card bg-muted/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl">
              💬
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                Need help with an order?
              </h3>
              <p className="text-sm text-muted-foreground">
                Chat with our support team or check our FAQ
              </p>
            </div>
            <button className="btn-secondary">Get Help</button>
          </div>
        </div>
      </section>
    </div>
  );
}
