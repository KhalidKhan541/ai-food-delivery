"use client";

import { useState } from "react";
import Link from "next/link";

interface CartItem {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  restaurant: string;
  image: string;
}

const initialCartItems: CartItem[] = [
  {
    id: 1,
    name: "Margherita Pizza",
    description: "Tomato sauce, fresh mozzarella, basil",
    price: 12.99,
    quantity: 2,
    restaurant: "Pizza Palace",
    image: "/dish-pizza.jpg",
  },
  {
    id: 2,
    name: "Garlic Bread",
    description: "Freshly baked with garlic butter and herbs",
    price: 5.99,
    quantity: 1,
    restaurant: "Pizza Palace",
    image: "/dish-garlic.jpg",
  },
  {
    id: 3,
    name: "Tiramisu",
    description: "Classic Italian dessert with espresso",
    price: 6.99,
    quantity: 1,
    restaurant: "Pizza Palace",
    image: "/dish-tiramisu.jpg",
  },
];

const deliveryOptions = [
  {
    id: "standard",
    label: "Standard",
    time: "30-45 min",
    price: 2.99,
    icon: "🚴",
  },
  {
    id: "express",
    label: "Express",
    time: "15-25 min",
    price: 5.99,
    icon: "⚡",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    time: "Choose time",
    price: 1.99,
    icon: "📅",
  },
];

const paymentMethods = [
  { id: "card", label: "Credit Card", icon: "💳" },
  { id: "apple", label: "Apple Pay", icon: "🍎" },
  { id: "google", label: "Google Pay", icon: "🟢" },
  { id: "cash", label: "Cash on Delivery", icon: "💵" },
];

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>(initialCartItems);
  const [selectedDelivery, setSelectedDelivery] = useState("standard");
  const [selectedPayment, setSelectedPayment] = useState("card");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [tip, setTip] = useState(0);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const updateQuantity = (id: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryFee =
    deliveryOptions.find((o) => o.id === selectedDelivery)?.price || 0;
  const serviceFee = subtotal * 0.05;
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal + deliveryFee + serviceFee + tip - discount;

  const handlePromo = () => {
    if (promoCode.toUpperCase() === "FREE3" || promoCode.toUpperCase() === "SAVE10") {
      setPromoApplied(true);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page-container py-20 text-center">
        <div className="text-6xl">🛒</div>
        <h2 className="mt-4 text-xl font-bold text-foreground">
          Your cart is empty
        </h2>
        <p className="mt-2 text-muted-foreground">
          Add items from a restaurant to get started
        </p>
        <Link href="/restaurants" className="btn-primary mt-6">
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container py-6">
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Cart Items */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Your Cart</h1>
            <p className="mt-1 text-muted-foreground">
              From{" "}
              <span className="font-medium text-foreground">
                {items[0].restaurant}
              </span>
            </p>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="card flex items-center gap-4 animate-fade-in"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                  {item.name.includes("Pizza")
                    ? "🍕"
                    : item.name.includes("Garlic")
                    ? "🍞"
                    : "🍰"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-semibold text-foreground">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-2 rounded-full border border-border">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                    >
                      {item.quantity === 1 ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                      )}
                    </button>
                    <span className="min-w-[20px] text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Special Instructions */}
          <div className="mt-6">
            <label className="label mb-2 block">Special instructions</label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any allergies or special requests? Let us know..."
              className="input-field min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-4">
            {/* Delivery Options */}
            <div className="card">
              <h3 className="mb-3 font-semibold text-foreground">
                Delivery options
              </h3>
              <div className="space-y-2">
                {deliveryOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedDelivery(option.id)}
                    className={`flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition-all ${
                      selectedDelivery === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{option.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {option.time}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      ${option.price.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tip */}
            <div className="card">
              <h3 className="mb-3 font-semibold text-foreground">
                Add a tip for your rider
              </h3>
              <div className="flex gap-2">
                {[0, 2, 3, 5].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTip(amount)}
                    className={`flex-1 rounded-xl border-2 py-2 text-sm font-medium transition-all ${
                      tip === amount
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {amount === 0 ? "None" : `$${amount}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="card">
              <h3 className="mb-3 font-semibold text-foreground">
                Payment method
              </h3>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                      selectedPayment === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span className="text-xl">{method.icon}</span>
                    <span className="text-sm font-medium text-foreground">
                      {method.label}
                    </span>
                    {selectedPayment === method.id && (
                      <svg className="ml-auto h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Promo Code */}
            <div className="card">
              <h3 className="mb-3 font-semibold text-foreground">Promo code</h3>
              {promoApplied ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                  Promo code applied! 10% off
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="input-field flex-1"
                  />
                  <button onClick={handlePromo} className="btn-secondary px-4">
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="card">
              <h3 className="mb-4 font-semibold text-foreground">
                Order summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery fee</span>
                  <span className="text-foreground">
                    ${deliveryFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service fee</span>
                  <span className="text-foreground">
                    ${serviceFee.toFixed(2)}
                  </span>
                </div>
                {tip > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rider tip</span>
                    <span className="text-foreground">${tip.toFixed(2)}</span>
                  </div>
                )}
                {promoApplied && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount (10%)</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-lg font-bold text-foreground">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button className="btn-primary mt-4 w-full py-3">
                Place Order
              </button>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                By placing this order you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
