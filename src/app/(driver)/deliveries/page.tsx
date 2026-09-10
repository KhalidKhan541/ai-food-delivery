"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Clock,
  MapPin,
  Navigation,
  CheckCircle,
  XCircle,
  ChevronRight,
  Filter,
  Search,
  DollarSign,
  Star,
  Phone,
  MessageCircle,
  ArrowUpRight,
  Calendar,
  TrendingUp,
  RotateCcw,
} from "lucide-react";

type DeliveryStatus = "pending" | "picked_up" | "delivering" | "completed" | "cancelled";

type Delivery = {
  id: string;
  orderId: string;
  restaurantName: string;
  restaurantAddress: string;
  customerName: string;
  customerAddress: string;
  items: number;
  totalAmount: number;
  earning: number;
  distance: string;
  status: DeliveryStatus;
  requestedAt: string;
  completedAt?: string;
  rating?: number;
  tip?: number;
};

type FilterTab = "all" | "active" | "completed" | "cancelled";

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string; bgColor: string; icon: typeof Clock }
> = {
  pending: { label: "Pending", color: "text-warning", bgColor: "bg-warning/10", icon: Clock },
  picked_up: { label: "Picked Up", color: "text-accent", bgColor: "bg-accent/10", icon: Package },
  delivering: { label: "Delivering", color: "text-info", bgColor: "bg-info/10", icon: Navigation },
  completed: { label: "Completed", color: "text-success", bgColor: "bg-success/10", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-destructive", bgColor: "bg-destructive/10", icon: XCircle },
};

const MOCK_DELIVERIES: Delivery[] = [
  {
    id: "1",
    orderId: "ORD-1234",
    restaurantName: "Bella Napoli",
    restaurantAddress: "123 Main St",
    customerName: "Sarah M.",
    customerAddress: "456 Oak Ave, Apt 2B",
    items: 3,
    totalAmount: 32.50,
    earning: 8.50,
    distance: "1.2 km",
    status: "delivering",
    requestedAt: "7:15 PM",
  },
  {
    id: "2",
    orderId: "ORD-1230",
    restaurantName: "Green Bowl",
    restaurantAddress: "789 Elm St",
    customerName: "James K.",
    customerAddress: "321 Pine Rd",
    items: 2,
    totalAmount: 18.75,
    earning: 6.75,
    distance: "0.8 km",
    status: "completed",
    requestedAt: "12:00 PM",
    completedAt: "12:28 PM",
    rating: 5,
    tip: 3.00,
  },
  {
    id: "3",
    orderId: "ORD-1228",
    restaurantName: "Sakura Garden",
    restaurantAddress: "456 Market St",
    customerName: "Lisa T.",
    customerAddress: "789 Broadway",
    items: 4,
    totalAmount: 45.20,
    earning: 10.20,
    distance: "2.1 km",
    status: "completed",
    requestedAt: "6:30 PM",
    completedAt: "7:05 PM",
    rating: 4,
  },
  {
    id: "4",
    orderId: "ORD-1225",
    restaurantName: "Burger Barn",
    restaurantAddress: "101 Burger Ln",
    customerName: "Mike R.",
    customerAddress: "202 Fast Ave",
    items: 2,
    totalAmount: 22.99,
    earning: 5.50,
    distance: "0.6 km",
    status: "cancelled",
    requestedAt: "1:15 PM",
  },
  {
    id: "5",
    orderId: "ORD-1220",
    restaurantName: "Sweet Dreams Bakery",
    restaurantAddress: "55 Dessert Dr",
    customerName: "Emily W.",
    customerAddress: "88 Sweet St",
    items: 1,
    totalAmount: 15.60,
    earning: 4.60,
    distance: "1.5 km",
    status: "completed",
    requestedAt: "3:00 PM",
    completedAt: "3:22 PM",
    rating: 5,
    tip: 2.00,
  },
  {
    id: "6",
    orderId: "ORD-1218",
    restaurantName: "Spice Route",
    restaurantAddress: "99 Curry Ct",
    customerName: "David L.",
    customerAddress: "77 Spice Way",
    items: 5,
    totalAmount: 52.80,
    earning: 12.80,
    distance: "3.2 km",
    status: "completed",
    requestedAt: "8:00 PM",
    completedAt: "8:45 PM",
    rating: 5,
    tip: 5.00,
  },
];

export default function DeliveriesPage() {
  const [deliveries] = useState<Delivery[]>(MOCK_DELIVERIES);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && ["pending", "picked_up", "delivering"].includes(d.status)) ||
      (activeTab === "completed" && d.status === "completed") ||
      (activeTab === "cancelled" && d.status === "cancelled");
    const matchesSearch =
      searchQuery === "" ||
      d.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const stats = {
    total: deliveries.length,
    completed: deliveries.filter((d) => d.status === "completed").length,
    totalEarnings: deliveries
      .filter((d) => d.status === "completed")
      .reduce((sum, d) => sum + d.earning + (d.tip || 0), 0),
    avgRating:
      deliveries.filter((d) => d.rating).reduce((sum, d) => sum + (d.rating || 0), 0) /
      deliveries.filter((d) => d.rating).length || 0,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Deliveries",
            value: stats.total.toString(),
            icon: Package,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Completed",
            value: stats.completed.toString(),
            icon: CheckCircle,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "Total Earnings",
            value: `$${stats.totalEarnings.toFixed(2)}`,
            icon: DollarSign,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "Avg Rating",
            value: stats.avgRating.toFixed(1),
            icon: Star,
            color: "text-accent",
            bg: "bg-accent/10",
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by restaurant, order ID, or customer..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-white rounded-xl border border-gray-100 p-1">
        {[
          { id: "all" as const, label: "All" },
          { id: "active" as const, label: "Active" },
          { id: "completed" as const, label: "Completed" },
          { id: "cancelled" as const, label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deliveries List */}
      <div className="space-y-3">
        {filteredDeliveries.map((delivery) => {
          const statusConfig = STATUS_CONFIG[delivery.status];
          const StatusIcon = statusConfig.icon;
          return (
            <div
              key={delivery.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all"
            >
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 ${statusConfig.bgColor} rounded-xl flex items-center justify-center`}
                  >
                    <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{delivery.restaurantName}</h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {delivery.orderId} · {delivery.items} item{delivery.items !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-success">
                    ${delivery.earning.toFixed(2)}
                  </p>
                  {delivery.tip && delivery.tip > 0 && (
                    <p className="text-xs text-gray-400">+${delivery.tip.toFixed(2)} tip</p>
                  )}
                </div>
              </div>

              {/* Route */}
              <div className="px-5 pb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 bg-accent rounded-full" />
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {delivery.restaurantName} · {delivery.restaurantAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {delivery.customerName} · {delivery.customerAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-gray-50/80 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" />
                    {delivery.distance}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {delivery.requestedAt}
                  </span>
                  {delivery.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                      {delivery.rating}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {delivery.status === "delivering" && (
                    <button className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                      <Navigation className="w-4 h-4" />
                    </button>
                  )}
                  {delivery.status === "completed" && (
                    <button className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    href={`/driver/deliveries/${delivery.id}`}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDeliveries.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No deliveries found</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            {activeTab === "active"
              ? "No active deliveries right now"
              : "No deliveries match your search"}
          </p>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
