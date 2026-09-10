"use client";

import * as React from "react";
import {
  ShoppingBag,
  Truck,
  Tag,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface CartSummaryProps {
  items: { id: string; name: string; quantity: number; price: number }[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount?: number;
  promoCode?: string;
  total: number;
  pointsEarned?: number;
  estimatedDeliveryTime?: string;
  isApplyingPromo?: boolean;
  onApplyPromo?: (code: string) => void;
  onRemovePromo?: () => void;
  onCheckout?: () => void;
  onBack?: () => void;
  freeDeliveryThreshold?: number;
  className?: string;
}

export function CartSummary({
  items,
  subtotal,
  deliveryFee,
  tax,
  discount = 0,
  promoCode,
  total,
  pointsEarned,
  estimatedDeliveryTime,
  isApplyingPromo = false,
  onApplyPromo,
  onRemovePromo,
  onCheckout,
  onBack,
  freeDeliveryThreshold = 25,
  className,
}: CartSummaryProps) {
  const [promoInput, setPromoInput] = React.useState(promoCode || "");
  const [showPromoInput, setShowPromoInput] = React.useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Order Summary</h3>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3 border-b py-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.name} x{item.quantity}
            </span>
            <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-b py-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            <Truck className="mr-1 inline h-4 w-4" />
            Delivery Fee
          </span>
          {deliveryFee === 0 ? (
            <span className="font-medium text-success">Free</span>
          ) : (
            <span className="font-medium">{formatCurrency(deliveryFee)}</span>
          )}
        </div>

        {amountToFreeDelivery > 0 && deliveryFee > 0 && (
          <div className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
            Add {formatCurrency(amountToFreeDelivery)} more for free delivery!
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span className="font-medium">{formatCurrency(tax)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1 text-success">
              <Tag className="h-3.5 w-3.5" />
              Discount
              {promoCode && (
                <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-bold">
                  {promoCode}
                </span>
              )}
            </span>
            <span className="font-medium text-success">
              -{formatCurrency(discount)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-b py-4">
        <span className="text-base font-bold">Total</span>
        <span className="text-xl font-bold text-primary">
          {formatCurrency(total)}
        </span>
      </div>

      {pointsEarned !== undefined && pointsEarned > 0 && (
        <div className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-center text-xs">
          <span className="font-medium text-accent-foreground">
            You&apos;ll earn {pointsEarned} loyalty points with this order
          </span>
        </div>
      )}

      {!showPromoInput && !promoCode && (
        <button
          onClick={() => setShowPromoInput(true)}
          className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Tag className="h-4 w-4" />
          Have a promo code?
        </button>
      )}

      {showPromoInput && !promoCode && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm uppercase placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={() => {
              if (promoInput.trim()) {
                onApplyPromo?.(promoInput.trim());
              }
            }}
            disabled={isApplyingPromo || !promoInput.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isApplyingPromo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </button>
        </div>
      )}

      {promoCode && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-success/10 px-3 py-2">
          <div className="flex items-center gap-1.5 text-sm text-success">
            <Tag className="h-4 w-4" />
            <span className="font-medium">{promoCode}</span>
          </div>
          <button
            onClick={onRemovePromo}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        </div>
      )}

      {estimatedDeliveryTime && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Truck className="h-4 w-4" />
          <span>Estimated delivery: {estimatedDeliveryTime}</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" />
        <span>Secure checkout powered by Stripe</span>
      </div>

      <div className="mt-4 flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all",
            "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <CreditCard className="h-4 w-4" />
          Place Order
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
