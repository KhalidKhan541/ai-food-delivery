import { Clock, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "./card";
import { Badge } from "./badge";
import { formatPrice } from "@/lib/utils";
import { DELIVERY_STATUS_LABELS } from "@/lib/constants";
import type { Order, OrderStatus } from "@/types";

export interface OrderCardProps {
  order: Order;
  className?: string;
}

const statusVariantMap: Record<OrderStatus, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  PENDING: "warning",
  CONFIRMED: "default",
  PREPARING: "default",
  READY: "success",
  OUT_FOR_DELIVERY: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

function OrderCard({ order, className }: OrderCardProps) {
  const statusVariant = statusVariantMap[order.status];

  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-md", className)}>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
              <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {order.restaurant.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Order #{order.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <Badge variant={statusVariant}>
            {DELIVERY_STATUS_LABELS[order.status]}
          </Badge>
        </div>

        <div className="mb-3 space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {item.quantity}x {item.menuItem.name}
              </span>
              <span className="text-gray-900 dark:text-gray-100">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatPrice(order.total)}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export { OrderCard };
