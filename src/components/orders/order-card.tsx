"use client";

import * as React from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  Star,
  Package,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "picked_up" | "on_the_way" | "delivered" | "cancelled";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface OrderCardProps {
  orderId: string;
  restaurantName: string;
  restaurantImage?: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  driverName?: string;
  driverPhoto?: string;
  rating?: number;
  isRated?: boolean;
  onViewDetails?: (orderId: string) => void;
  onReorder?: (orderId: string) => void;
  onTrack?: (orderId: string) => void;
  onRate?: (orderId: string) => void;
  className?: string;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  pending: {
    label: "Order Placed",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: CheckCircle2,
  },
  preparing: {
    label: "Being Prepared",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    icon: Package,
  },
  ready: {
    label: "Ready for Pickup",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    icon: CheckCircle2,
  },
  picked_up: {
    label: "Picked Up",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    icon: Package,
  },
  on_the_way: {
    label: "On the Way",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: Clock,
  },
  delivered: {
    label: "Delivered",
    color: "text-success",
    bgColor: "bg-success/10",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    icon: XCircle,
  },
};

export function OrderCard({
  orderId,
  restaurantName,
  restaurantImage,
  status,
  items,
  total,
  createdAt,
  estimatedDelivery,
  deliveredAt,
  driverName,
  driverPhoto,
  rating,
  isRated = false,
  onViewDetails,
  onReorder,
  onTrack,
  onRate,
  className,
}: OrderCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isActive = ["pending", "confirmed", "preparing", "ready", "picked_up", "on_the_way"].includes(status);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm transition-all",
        "hover:shadow-md",
        isActive && "ring-2 ring-primary/20",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {restaurantImage && (
            <div className="h-12 w-12 overflow-hidden rounded-xl">
              <img
                src={restaurantImage}
                alt={restaurantName}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <h4 className="font-bold text-card-foreground">{restaurantName}</h4>
            <p className="text-xs text-muted-foreground">
              Order #{orderId.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            config.bgColor,
            config.color
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {config.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{createdAt}</span>
        {estimatedDelivery && !deliveredAt && (
          <>
            <span className="text-muted-foreground/50">|</span>
            <span>Est. {estimatedDelivery}</span>
          </>
        )}
        {deliveredAt && (
          <>
            <span className="text-muted-foreground/50">|</span>
            <span className="text-success">Delivered at {deliveredAt}</span>
          </>
        )}
      </div>

      <div className="mt-3 border-t pt-3">
        <div className="space-y-1.5">
          {items.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {item.quantity}x {item.name}
              </span>
              <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{items.length - 3} more item{items.length - 3 > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {driverName && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          {driverPhoto ? (
            <img
              src={driverPhoto}
              alt={driverName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {driverName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-xs font-medium">{driverName}</p>
            <p className="text-[10px] text-muted-foreground">Your driver</p>
          </div>
        </div>
      )}

      {status === "delivered" && !isRated && (
        <div className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-dashed border-accent bg-accent/5 py-2">
          <Star className="h-4 w-4 text-accent" />
          <button
            onClick={() => onRate?.(orderId)}
            className="text-xs font-medium text-accent hover:underline"
          >
            Rate your experience
          </button>
        </div>
      )}

      {isRated && rating !== undefined && (
        <div className="mt-3 flex items-center justify-center gap-1 py-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < rating
                  ? "fill-accent text-accent"
                  : "text-gray-300"
              )}
            />
          ))}
          <span className="ml-1 text-xs text-muted-foreground">
            {rating}/5
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <span className="text-base font-bold text-card-foreground">
          {formatCurrency(total)}
        </span>

        <div className="flex items-center gap-2">
          {isActive && onTrack && (
            <button
              onClick={() => onTrack?.(orderId)}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Track Order
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          {!isActive && onReorder && (
            <button
              onClick={() => onReorder?.(orderId)}
              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reorder
            </button>
          )}

          <button
            onClick={() => onViewDetails?.(orderId)}
            className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Details
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
