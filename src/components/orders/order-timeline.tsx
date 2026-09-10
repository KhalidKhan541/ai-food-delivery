"use client";

import * as React from "react";
import {
  Clock,
  CheckCircle2,
  Package,
  ChefHat,
  Bike,
  MapPin,
  Utensils,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineStep {
  status: string;
  label: string;
  description?: string;
  timestamp?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface OrderTimelineProps {
  steps: TimelineStep[];
  orderStatus: string;
  className?: string;
}

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: Utensils,
  picked_up: Package,
  on_the_way: Bike,
  delivered: MapPin,
  cancelled: XCircle,
};

export function OrderTimeline({
  steps,
  orderStatus,
  className,
}: OrderTimelineProps) {
  const currentStepIndex = steps.findIndex((step) => step.isCurrent);

  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((step, index) => {
        const Icon = statusIcons[step.status] || Clock;
        const isLast = index === steps.length - 1;
        const isCompleted = step.isCompleted;
        const isCurrent = step.isCurrent;

        return (
          <div key={step.status} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  isCompleted && "border-success bg-success text-success-foreground",
                  isCurrent && "border-primary bg-primary text-primary-foreground animate-pulse-glow",
                  !isCompleted && !isCurrent && "border-muted-foreground/30 bg-background text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 transition-colors",
                    isCompleted ? "bg-success" : "bg-muted-foreground/20"
                  )}
                  style={{ minHeight: "2rem" }}
                />
              )}
            </div>

            <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
              <div className="flex items-center gap-2">
                <h4
                  className={cn(
                    "text-sm font-semibold",
                    isCompleted && "text-success",
                    isCurrent && "text-primary",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </h4>
                {isCurrent && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Current
                  </span>
                )}
              </div>

              {step.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
              )}

              {step.timestamp && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {step.timestamp}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
