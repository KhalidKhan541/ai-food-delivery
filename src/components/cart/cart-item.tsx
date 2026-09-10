"use client";

import * as React from "react";
import { Minus, Plus, Trash2, MessageSquare } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface CartItemData {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  imageUrl: string;
  customizations?: { name: string; value: string; price: number }[];
  specialInstructions?: string;
}

interface CartItemProps {
  item: CartItemData;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onRemove?: (itemId: string) => void;
  onEditInstructions?: (itemId: string) => void;
  compact?: boolean;
  className?: string;
}

export function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  onEditInstructions,
  compact = false,
  className,
}: CartItemProps) {
  const { id, name, description, price, quantity, imageUrl, customizations, specialInstructions } = item;

  const customizationTotal = customizations?.reduce((sum, c) => sum + c.price, 0) || 0;
  const unitPrice = price + customizationTotal;
  const totalPrice = unitPrice * quantity;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-3 transition-all",
        "hover:shadow-sm",
        className
      )}
    >
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-card-foreground">
              {name}
            </h4>
            {!compact && description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <button
            onClick={() => onRemove?.(id)}
            className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove ${name} from cart`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {customizations && customizations.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {customizations.map((customization, index) => (
              <span
                key={index}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {customization.name}: {customization.value}
                {customization.price > 0 && (
                  <span className="ml-0.5 text-primary">
                    +{formatCurrency(customization.price)}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}

        {specialInstructions && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span className="truncate">{specialInstructions}</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateQuantity?.(id, quantity - 1)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
                quantity <= 1
                  ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                  : "hover:bg-muted"
              )}
              aria-label={`Decrease quantity of ${name}`}
            >
              {quantity <= 1 ? (
                <Trash2 className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
            </button>

            <span className="w-8 text-center text-sm font-bold">
              {quantity}
            </span>

            <button
              onClick={() => onUpdateQuantity?.(id, quantity + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full border bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              aria-label={`Increase quantity of ${name}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <span className="text-sm font-bold text-card-foreground">
            {formatCurrency(totalPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
