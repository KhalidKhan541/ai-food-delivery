"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Package,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Users,
  BarChart3,
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  UtensilsCrossed,
  Zap,
} from "lucide-react";

type TodayStats = {
  revenue: number;
  orders: number;
  avgOrderValue: number;
  avgPrepTime: number;
  rating: number;
  newCustomers: number;
};

type WeeklyStats = {
  totalRevenue: number;
  totalOrders: number;
  revenueChange: number;
  ordersChange: number;
};

type RecentOrder = {
  id: string;
  customerName: string;
  items: string[];
  total: number;
  status: "new" | "preparing" | "ready" | "picked_up";
  placedAt: string;
  estimatedReady: string;
};

type PopularItem = {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  trend: "up" | "down" | "stable";
};

const MOCK_TODAY_STATS: TodayStats = {
  revenue: 892.50,
  orders: 47,
  avgOrderValue: 18.99,
  avgPrepTime: 14,
  rating: 4.8,
  newCustomers: 12,
};

const MOCK_WEEKLY_STATS: WeeklyStats = {
  totalRevenue: 5642.30,
  totalOrders: 298,
  revenueChange: 8.3,
  ordersChange: 5.1,
};

const MOCK_RECENT_ORDERS: RecentOrder[] = [
  {
    id: "ORD-1240",
    customerName: "Sarah M.",
    items: ["Margherita Pizza", "Tiramisu"],
    total: 28.50,
    status: "new",
    placedAt: "2 min ago",
    estimatedReady: "18 min",
  },
  {
    id: "ORD-1239",
    customerName: "James K.",
    items: ["Pepperoni Pizza", "Garlic Bread"],
    total: 22.75,
    status: "preparing",
    placedAt: "8 min ago",
    estimatedReady: "12 min",
  },
  {
    id: "ORD-1238",
    customerName: "Lisa T.",
    items: ["Pasta Carbonara"],
    total: 16.99,
    status: "ready",
    placedAt: "22 min ago",
    estimatedReady: "Ready",
  },
  {
    id: "ORD-1237",
    customerName: "Mike R.",
    items: ["Quattro Formaggi", "Caesar Salad", "Sparkling Water"],
    total: 35.20,
    status: "picked_up",
    placedAt: "35 min ago",
    estimatedReady: "Picked up",
  },
];

const MOCK_POPULAR_ITEMS: PopularItem[] = [
  { id: "1", name: "Margherita Pizza", orders: 89, revenue: 1689.11, trend: "up" },
  { id: "2", name: "Pasta Carbonara", orders: 67, revenue: 1138.33, trend: "up" },
  { id: "3", name: "Pepperoni Pizza", orders: 54, revenue: 1133.46, trend: "stable" },
  { id: "4", name: "Tiramisu", orders: 43, revenue: 386.57, trend: "down" },
  { id: "5", name: "Garlic Bread", orders: 38, revenue: 227.62, trend: "up" },
];

const ORDER_STATUS_CONFIG = {
  new: { label: "New Order", color: "text-primary", bgColor: "bg-primary/10", pulse: true },
  preparing: { label: "Preparing", color: "text-accent", bgColor: "bg-accent/10", pulse: false },
  ready: { label: "Ready for Pickup", color: "text-success", bgColor: "bg-success/10", pulse: true },
  picked_up: { label: "Picked Up", color: "text-info", bgColor: "bg-info/10", pulse: false },
};

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState<RecentOrder[]>(MOCK_RECENT_ORDERS);

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "preparing" as const } : o))
    );
  };

  const handleMarkReady = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "ready" as const } : o))
    );
  };

  const weeklyRevenueChart = [
    { day: "Mon", revenue: 720 },
    { day: "Tue", revenue: 850 },
    { day: "Wed", revenue: 680 },
    { day: "Thu", revenue: 920 },
    { day: "Fri", revenue: 1150 },
    { day: "Sat", revenue: 1380 },
    { day: "Sun", revenue: 892 },
  ];

  const maxRevenue = Math.max(...weeklyRevenueChart.map((d) => d.revenue));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Today's Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            label: "Today's Revenue",
            value: `$${MOCK_TODAY_STATS.revenue.toFixed(2)}`,
            icon: DollarSign,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "Orders",
            value: MOCK_TODAY_STATS.orders.toString(),
            icon: Package,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Avg Order",
            value: `$${MOCK_TODAY_STATS.avgOrderValue.toFixed(2)}`,
            icon: BarChart3,
            color: "text-info",
            bg: "bg-info/10",
          },
          {
            label: "Prep Time",
            value: `${MOCK_TODAY_STATS.avgPrepTime} min`,
            icon: Clock,
            color: "text-accent",
            bg: "bg-accent/10",
          },
          {
            label: "Rating",
            value: MOCK_TODAY_STATS.rating.toString(),
            icon: Star,
            color: "text-yellow-500",
            bg: "bg-yellow-50",
          },
          {
            label: "New Customers",
            value: MOCK_TODAY_STATS.newCustomers.toString(),
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly Overview & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Weekly Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Weekly Revenue</h3>
              <p className="text-sm text-gray-500">This week&apos;s performance</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">
                ${MOCK_WEEKLY_STATS.totalRevenue.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-sm text-success justify-end">
                <TrendingUp className="w-4 h-4" />
                +{MOCK_WEEKLY_STATS.revenueChange}%
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2 h-36 mb-4">
            {weeklyRevenueChart.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-900">${day.revenue}</span>
                <div
                  className="w-full bg-gradient-to-t from-accent/80 to-accent/40 rounded-t-lg transition-all duration-500"
                  style={{ height: `${(day.revenue / maxRevenue) * 100}px` }}
                />
                <span className="text-xs text-gray-500">{day.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-50">
            <span>{MOCK_WEEKLY_STATS.totalOrders} total orders</span>
            <span className="flex items-center gap-1 text-success">
              <TrendingUp className="w-3.5 h-3.5" />+{MOCK_WEEKLY_STATS.ordersChange}%
            </span>
          </div>
        </div>

        {/* Active Orders */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Active Orders</h3>
            <Link
              href="/restaurant/orders"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {orders.filter((o) => o.status !== "picked_up").map((order) => {
              const statusConfig = ORDER_STATUS_CONFIG[order.status];
              return (
                <div
                  key={order.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{order.id}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color} ${
                          statusConfig.pulse ? "animate-pulse" : ""
                        }`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{order.customerName}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    {order.items.join(", ")}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {order.placedAt} · Ready in {order.estimatedReady}
                    </span>
                    <div className="flex gap-2">
                      {order.status === "new" && (
                        <button
                          onClick={() => handleAcceptOrder(order.id)}
                          className="px-3 py-1.5 bg-success text-white rounded-lg text-xs font-medium hover:bg-success/90 transition-colors"
                        >
                          Accept
                        </button>
                      )}
                      {order.status === "preparing" && (
                        <button
                          onClick={() => handleMarkReady(order.id)}
                          className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-colors"
                        >
                          Mark Ready
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popular Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Popular Items</h3>
            <p className="text-sm text-gray-500">Top performing menu items this week</p>
          </div>
          <Link
            href="/restaurant/menu"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Manage menu <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Item
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Orders
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Revenue
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_POPULAR_ITEMS.map((item, i) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{item.orders}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    ${item.revenue.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    {item.trend === "up" && (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <TrendingUp className="w-3.5 h-3.5" /> Up
                      </span>
                    )}
                    {item.trend === "down" && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <TrendingDown className="w-3.5 h-3.5" /> Down
                      </span>
                    )}
                    {item.trend === "stable" && (
                      <span className="text-xs text-gray-400">Stable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/restaurant/menu"
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Menu</h3>
                <p className="text-sm text-gray-500">Add or update items</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-accent transition-colors" />
          </div>
        </Link>
        <Link
          href="/restaurant/orders"
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">All Orders</h3>
                <p className="text-sm text-gray-500">View order history</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
          </div>
        </Link>
        <Link
          href="/restaurant/analytics"
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-info/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-info" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Analytics</h3>
                <p className="text-sm text-gray-500">Detailed insights</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-info transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
