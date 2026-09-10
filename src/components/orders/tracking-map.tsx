"use client";

import * as React from "react";
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  MessageCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverLocation {
  lat: number;
  lng: number;
}

interface DeliveryRoute {
  restaurant: { name: string; address: string; lat: number; lng: number };
  customer: { address: string; lat: number; lng: number };
  driver?: DriverLocation;
}

interface TrackingMapProps {
  route: DeliveryRoute;
  driverName?: string;
  driverPhoto?: string;
  driverPhone?: string;
  estimatedArrival?: string;
  distanceRemaining?: number;
  status: "preparing" | "ready" | "picked_up" | "on_the_way" | "delivered";
  onCallDriver?: () => void;
  onMessageDriver?: () => void;
  onRefreshLocation?: () => void;
  className?: string;
}

const statusMessages: Record<string, { message: string; color: string }> = {
  preparing: {
    message: "Your food is being prepared with care",
    color: "text-orange-600",
  },
  ready: {
    message: "Your order is ready for pickup",
    color: "text-purple-600",
  },
  picked_up: {
    message: "Driver has picked up your order",
    color: "text-indigo-600",
  },
  on_the_way: {
    message: "Your order is on its way!",
    color: "text-primary",
  },
  delivered: {
    message: "Your order has been delivered!",
    color: "text-success",
  },
};

export function TrackingMap({
  route,
  driverName,
  driverPhoto,
  driverPhone,
  estimatedArrival,
  distanceRemaining,
  status,
  onCallDriver,
  onMessageDriver,
  onRefreshLocation,
  className,
}: TrackingMapProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const statusInfo = statusMessages[status];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        className
      )}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 sm:aspect-video">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-full w-full">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -left-32 top-0 flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="mt-1 rounded-lg bg-white px-2 py-1 text-[10px] font-medium shadow-md">
                    {route.restaurant.name}
                  </div>
                </div>

                <div className="absolute -right-32 top-0 flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-white shadow-lg">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="mt-1 rounded-lg bg-white px-2 py-1 text-[10px] font-medium shadow-md">
                    Your Location
                  </div>
                </div>

                {route.driver && (status === "picked_up" || status === "on_the_way") && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="animate-food-float">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-white">
                        <Navigation className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                )}

                <svg className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2">
                  <line
                    x1="0"
                    y1="0"
                    x2="100%"
                    y2="0"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="8 4"
                    className="text-primary/30"
                  />
                </svg>
              </div>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
                <span className={cn("font-semibold", statusInfo.color)}>
                  {statusInfo.message}
                </span>
              </div>

              {onRefreshLocation && (
                <button
                  onClick={onRefreshLocation}
                  className="rounded-lg bg-white/90 p-2 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                  aria-label="Refresh location"
                >
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {driverName && (
              <>
                {driverPhoto ? (
                  <img
                    src={driverPhoto}
                    alt={driverName}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {driverName.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-card-foreground">{driverName}</h4>
                  <p className="text-xs text-muted-foreground">Your delivery driver</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onCallDriver && (
              <button
                onClick={onCallDriver}
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-background transition-colors hover:bg-muted"
                aria-label="Call driver"
              >
                <Phone className="h-4 w-4" />
              </button>
            )}
            {onMessageDriver && (
              <button
                onClick={onMessageDriver}
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-background transition-colors hover:bg-muted"
                aria-label="Message driver"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {estimatedArrival && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary/5 px-4 py-3">
            <Clock className="h-5 w-5 text-primary" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Estimated arrival</p>
              <p className="text-lg font-bold text-primary">{estimatedArrival}</p>
            </div>
            {distanceRemaining !== undefined && (
              <>
                <span className="text-muted-foreground/30">|</span>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-lg font-bold text-card-foreground">
                    {distanceRemaining.toFixed(1)} km
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs">From</span>
            </div>
            <p className="mt-1 text-xs font-medium text-card-foreground truncate">
              {route.restaurant.address}
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs">To</span>
            </div>
            <p className="mt-1 text-xs font-medium text-card-foreground truncate">
              {route.customer.address}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
