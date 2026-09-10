"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  Clock,
  Package,
  Star,
  TrendingUp,
  MapPin,
  Navigation,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ToggleLeft,
  ToggleRight,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

type TodayStats = {
  earnings: number;
  deliveries: number;
  hoursOnline: number;
  avgRating: number;
  acceptanceRate: number;
};

type WeeklyStats = {
  totalEarnings: number;
  totalDeliveries: number;
  dailyAvg: number;
  change: number;
};

type ActiveDelivery = {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  customerAddress: string;
  items: number;
  estimatedEarning: number;
  distance: string;
  estimatedTime: string;
  status: "pickup" | "delivering";
};

type WeeklyChart = {
  day: string;
  earnings: number;
  deliveries: number;
};

const MOCK_TODAY_STATS: TodayStats = {
  earnings: 68.50,
  deliveries: 5,
  hoursOnline: 4.5,
  avgRating: 4.9,
  acceptanceRate: 92,
};

const MOCK_WEEKLY_STATS: WeeklyStats = {
  totalEarnings: 412.75,
  totalDeliveries: 32,
  dailyAvg: 68.79,
  change: 12.5,
};

const MOCK_ACTIVE_DELIVERIES: ActiveDelivery[] = [
  {
    id: "1",
    restaurantName: "Bella Napoli",
    restaurantAddress: "123 Main St",
    customerAddress: "456 Oak Ave, Apt 2B",
    items: 3,
    estimatedEarning: 8.50,
    distance: "1.2 km",
    estimatedTime: "12 min",
    status: "pickup",
  },
  {
    id: "2",
    restaurantName: "Sakura Garden",
    restaurantAddress: "789 Elm St",
    customerAddress: "321 Pine Rd",
    items: 2,
    estimatedEarning: 6.75,
    distance: "0.8 km",
    estimatedTime: "8 min",
    status: "delivering",
  },
];

const MOCK_WEEKLY_CHART: WeeklyChart[] = [
  { day: "Mon", earnings: 52, deliveries: 4 },
  { day: "Tue", earnings: 68, deliveries: 5 },
  { day: "Wed", earnings: 45, deliveries: 3 },
  { day: "Thu", earnings: 78, deliveries: 6 },
  { day: "Fri", earnings: 95, deliveries: 7 },
  { day: "Sat", earnings: 74.25, deliveries: 7 },
  { day: "Sun", earnings: 68.5, deliveries: 5 },
];

export default function DriverDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>(MOCK_ACTIVE_DELIVERIES);

  const maxEarning = Math.max(...MOCK_WEEKLY_CHART.map((d) => d.earnings));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Online Toggle */}
      <div
        className={`rounded-2xl p-5 flex items-center justify-between transition-all ${
          isOnline
            ? "bg-gradient-to-r from-success/10 to-emerald-50 border border-success/20"
            : "bg-white border border-gray-200"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isOnline ? "bg-success text-white" : "bg-gray-100 text-gray-400"
            }`}
          >
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {isOnline ? "You're Online" : "You're Offline"}
            </h2>
            <p className="text-sm text-gray-500">
              {isOnline
                ? "You're visible to customers and receiving delivery requests"
                : "Go online to start receiving deliveries"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`p-2 rounded-xl transition-colors ${
            isOnline ? "bg-success text-white" : "bg-gray-100 text-gray-400"
          }`}
        >
          {isOnline ? (
            <ToggleRight className="w-8 h-8" />
          ) : (
            <ToggleLeft className="w-8 h-8" />
          )}
        </button>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Today's Earnings",
            value: `$${MOCK_TODAY_STATS.earnings.toFixed(2)}`,
            icon: DollarSign,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "Deliveries",
            value: MOCK_TODAY_STATS.deliveries.toString(),
            icon: Package,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Hours Online",
            value: `${MOCK_TODAY_STATS.hoursOnline}h`,
            icon: Clock,
            color: "text-info",
            bg: "bg-info/10",
          },
          {
            label: "Avg Rating",
            value: MOCK_TODAY_STATS.avgRating.toString(),
            icon: Star,
            color: "text-accent",
            bg: "bg-accent/10",
          },
          {
            label: "Acceptance",
            value: `${MOCK_TODAY_STATS.acceptanceRate}%`,
            icon: CheckCircle,
            color: "text-primary",
            bg: "bg-primary/10",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Active Deliveries */}
      {activeDeliveries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Active Deliveries</h3>
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
              {activeDeliveries.length} active
            </span>
          </div>
          <div className="space-y-3">
            {activeDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        delivery.status === "pickup"
                          ? "bg-accent/10 text-accent"
                          : "bg-info/10 text-info"
                      }`}
                    >
                      {delivery.status === "pickup" ? "Pickup" : "Delivering"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {delivery.items} item{delivery.items !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-success">
                    ${delivery.estimatedEarning.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 bg-accent rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {delivery.restaurantName}
                      </p>
                      <p className="text-xs text-gray-500">{delivery.restaurantAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {delivery.customerAddress}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{delivery.distance}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{delivery.estimatedTime}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/driver/deliveries/${delivery.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    {delivery.status === "pickup" ? "Start Navigation" : "Mark Delivered"}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                    Contact
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Performance */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Weekly Performance</h3>
            <p className="text-sm text-gray-500">This week&apos;s earnings overview</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${MOCK_WEEKLY_STATS.totalEarnings.toFixed(2)}
            </p>
            <div className="flex items-center gap-1 text-sm text-success">
              <TrendingUp className="w-4 h-4" />
              <span>+{MOCK_WEEKLY_STATS.change}%</span>
            </div>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="flex items-end gap-3 h-40 mb-4">
          {MOCK_WEEKLY_CHART.map((day) => (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-900">
                ${day.earnings}
              </span>
              <div className="w-full relative">
                <div
                  className="w-full bg-gradient-to-t from-primary/80 to-primary/40 rounded-t-lg transition-all duration-500"
                  style={{ height: `${(day.earnings / maxEarning) * 100}px` }}
                />
              </div>
              <span className="text-xs text-gray-500">{day.day}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded" />
            <span>Earnings</span>
          </div>
          <div>
            Avg: ${MOCK_WEEKLY_STATS.dailyAvg.toFixed(2)}/day
          </div>
          <div>
            {MOCK_WEEKLY_STATS.totalDeliveries} deliveries
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/driver/deliveries"
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delivery History</h3>
                <p className="text-sm text-gray-500">View past deliveries</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
          </div>
        </Link>
        <Link
          href="/driver/earnings"
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-success/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Earnings Details</h3>
                <p className="text-sm text-gray-500">Track your earnings</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
