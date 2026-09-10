import { Check, Clock, ChefHat, Truck, PackageCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Progress } from "./progress";
import type { OrderStatus } from "@/types";

export interface DeliveryTrackerProps {
  status: OrderStatus;
  estimatedTime?: Date;
  className?: string;
}

const steps: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: "PENDING", label: "Order Placed", icon: PackageCheck },
  { status: "CONFIRMED", label: "Confirmed", icon: Check },
  { status: "PREPARING", label: "Preparing", icon: ChefHat },
  { status: "OUT_FOR_DELIVERY", label: "On the Way", icon: Truck },
  { status: "DELIVERED", label: "Delivered", icon: Check },
];

function getStepIndex(status: OrderStatus): number {
  const order: OrderStatus[] = [
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ];
  return order.indexOf(status);
}

function DeliveryTracker({ status, estimatedTime, className }: DeliveryTrackerProps) {
  const currentStepIndex = getStepIndex(status);
  const progressPercentage =
    status === "DELIVERED"
      ? 100
      : status === "CANCELLED"
      ? 0
      : Math.min((currentStepIndex / (steps.length - 1)) * 100, 100);

  return (
    <div className={cn("w-full", className)}>
      {estimatedTime && status !== "DELIVERED" && status !== "CANCELLED" && (
        <div className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-orange-50 p-4 dark:bg-orange-950">
          <Clock className="h-5 w-5 text-orange-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Estimated Delivery
            </p>
            <p className="text-lg font-bold text-orange-500">
              {new Date(estimatedTime).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      )}

      <Progress value={progressPercentage} className="mb-6" />

      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStepIndex > index;
          const isCurrent = currentStepIndex === index;
          const Icon = step.icon;

          return (
            <div
              key={step.status}
              className="flex flex-1 flex-col items-center"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-orange-500 text-white ring-4 ring-orange-100 dark:ring-orange-900"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-center text-xs font-medium",
                  isCurrent
                    ? "text-orange-500"
                    : isCompleted
                    ? "text-green-500"
                    : "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {status === "CANCELLED" && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-center dark:bg-red-950">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            This order has been cancelled
          </p>
        </div>
      )}
    </div>
  );
}

export { DeliveryTracker };
