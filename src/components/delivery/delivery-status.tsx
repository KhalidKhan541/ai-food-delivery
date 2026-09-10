"use client";

import * as React from "react";
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  Package,
  Bike,
  MapPin,
  XCircle,
  Phone,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DeliveryStatusType =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

interface DeliveryStatusProps {
  status: DeliveryStatusType;
  restaurantName?: string;
  driverName?: string;
  driverPhoto?: string;
  estimatedArrival?: string;
  steps: {
    status: DeliveryStatusType;
    label: string;
    timestamp?: string;
    isCompleted: boolean;
    isCurrent: boolean;
  }[];
  onCallDriver?: () => void;
  onMessageDriver?: () => void;
  onRefresh?: () => void;
  className?: string;
}

const statusConfig: Record<
  DeliveryStatusType,
  {
    label: string;
    description: string;
    color: string;
    bgColor: string;
    icon: React.ElementType;
  }
> = {
  pending: {
    label: "Order Placed",
    description: "Waiting for restaurant confirmation",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    icon: Clock,
  },
  confirmed: {
    label: "Order Confirmed",
    description: "Restaurant has accepted your order",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: CheckCircle2,
  },
  preparing: {
    label: "Being Prepared",
    description: "Your food is being cooked with care",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    icon: ChefHat,
  },
  ready: {
    label: "Ready for Pickup",
    description: "Your order is packed and ready",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    icon: Utensils,
  },
  picked_up: {
    label: "Picked Up",
    description: "Driver has your order",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    icon: Package,
  },
  on_the_way: {
    label: "On the Way",
    description: "Your order is en route to you",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: Bike,
  },
  delivered: {
    label: "Delivered",
    description: "Enjoy your meal!",
    color: "text-success",
    bgColor: "bg-success/10",
    icon: MapPin,
  },
  cancelled: {
    label: "Cancelled",
    description: "This order has been cancelled",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    icon: XCircle,
  },
};

export function DeliveryStatus({
  status,
  restaurantName,
  driverName,
  driverPhoto,
  estimatedArrival,
  steps,
  onCallDriver,
  onMessageDriver,
  onRefresh,
  className,
}: DeliveryStatusProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isActive = ["pending", "confirmed", "preparing", "ready", "picked_up", "on_the_way"].includes(status);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "flex items-center gap-4 rounded-2xl border p-4",
          config.bgColor
        )}
      >
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            isActive ? "bg-primary text-primary-foreground animate-pulse-glow" : config.bgColor
          )}
        >
          <StatusIcon className={cn("h-7 w-7", isActive ? "" : config.color)} />
        </div>

        <div className="flex-1">
          <h3 className={cn("text-lg font-bold", config.color)}>
            {config.label}
          </h3>
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
          {estimatedArrival && isActive && (
            <p className="mt-1 text-xs font-medium text-primary">
              ETA: {estimatedArrival}
            </p>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="rounded-xl border bg-background p-2 transition-colors hover:bg-muted"
            aria-label="Refresh status"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-0">
        {steps.map((step, index) => {
          const StepIcon = statusConfig[step.status]?.icon || Clock;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.status} className="relative flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "z-10 flex h-8 w-8 items-center justify-center rounded-full border-2",
                    step.isCompleted
                      ? "border-success bg-success text-success-foreground"
                      : step.isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 bg-background text-muted-foreground"
                  )}
                >
                  <StepIcon className="h-4 w-4" />
                </div>

                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1",
                      step.isCompleted ? "bg-success" : "bg-muted-foreground/20"
                    )}
                    style={{ minHeight: "1.5rem" }}
                  />
                )}
              </div>

              <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
                <div className="flex items-center justify-between">
                  <h4
                    className={cn(
                      "text-sm font-medium",
                      step.isCompleted
                        ? "text-success"
                        : step.isCurrent
                        ? "text-primary font-semibold"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </h4>
                  {step.timestamp && (
                    <span className="text-[10px] text-muted-foreground">
                      {step.timestamp}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(onCallDriver || onMessageDriver) && driverName && (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          {driverPhoto ? (
            <img
              src={driverPhoto}
              alt={driverName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {driverName.charAt(0)}
            </div>
          )}

          <div className="flex-1">
            <p className="text-sm font-medium">{driverName}</p>
            <p className="text-xs text-muted-foreground">Your driver</p>
          </div>

          <div className="flex gap-2">
            {onCallDriver && (
              <button
                onClick={onCallDriver}
                className="flex h-9 w-9 items-center justify-center rounded-full border bg-background transition-colors hover:bg-muted"
                aria-label="Call driver"
              >
                <Phone className="h-4 w-4" />
              </button>
            )}
            {onMessageDriver && (
              <button
                onClick={onMessageDriver}
                className="flex h-9 w-9 items-center justify-center rounded-full border bg-background transition-colors hover:bg-muted"
                aria-label="Message driver"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
