"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { formatPrice } from "@/lib/utils";
import type { CartItem as CartItemType } from "@/types";

export interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

function CartItem({ item, onUpdateQuantity, onRemove, className }: CartItemProps) {
  const { id, menuItem, quantity, specialInstructions } = item;

  return (
    <div
      className={cn(
        "flex gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700",
        className
      )}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        <img
          src={menuItem.image}
          alt={menuItem.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {menuItem.name}
            </h4>
            <span className="shrink-0 font-semibold text-orange-500">
              {formatPrice(menuItem.price * quantity)}
            </span>
          </div>
          {specialInstructions && (
            <p className="mt-1 text-xs text-gray-500 italic dark:text-gray-400">
              {specialInstructions}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdateQuantity?.(id, quantity - 1)}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdateQuantity?.(id, quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-500"
            onClick={() => onRemove?.(id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { CartItem };
