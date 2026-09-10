"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface OrderStep {
  id: number;
  label: string;
  description: string;
  time: string;
  completed: boolean;
  active: boolean;
  icon: string;
}

const initialSteps: OrderStep[] = [
  {
    id: 1,
    label: "Order Confirmed",
    description: "Restaurant received your order",
    time: "7:30 PM",
    completed: true,
    active: false,
    icon: "✅",
  },
  {
    id: 2,
    label: "Being Prepared",
    description: "Chef is making your food",
    time: "7:35 PM",
    completed: true,
    active: false,
    icon: "👨‍🍳",
  },
  {
    id: 3,
    label: "Ready for Pickup",
    description: "Food is packed and waiting for rider",
    time: "7:52 PM",
    completed: false,
    active: true,
    icon: "📦",
  },
  {
    id: 4,
    label: "On the Way",
    description: "Rider is heading to you",
    time: "",
    completed: false,
    active: false,
    icon: "🛵",
  },
  {
    id: 5,
    label: "Delivered",
    description: "Enjoy your meal!",
    time: "",
    completed: false,
    active: false,
    icon: "🎉",
  },
];

const orderData = {
  id: "ORD-2024-001",
  restaurant: "Pizza Palace",
  restaurantAddress: "456 Food Street, Downtown",
  items: [
    { name: "Margherita Pizza", quantity: 2, price: 12.99 },
    { name: "Garlic Bread", quantity: 1, price: 5.99 },
    { name: "Tiramisu", quantity: 1, price: 6.99 },
  ],
  subtotal: 38.96,
  deliveryFee: 2.99,
  serviceFee: 1.95,
  tip: 3.0,
  total: 46.9,
  deliveryAddress: "123 Home Street, Apt 4B, New York",
  estimatedDelivery: "8:00 PM",
  paymentMethod: "Visa •••• 4242",
  riderName: "Ahmed K.",
  riderPhone: "+1 (555) 987-6543",
  riderVehicle: "Blue Honda Scooter",
};

export default function OrderTrackingPage({
  params,
}: {
  params: { id: string };
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSteps((prev) => {
        const activeIndex = prev.findIndex((s) => s.active);
        if (activeIndex < prev.length - 1) {
          const newSteps = [...prev];
          newSteps[activeIndex] = {
            ...newSteps[activeIndex],
            completed: true,
            active: false,
          };
          newSteps[activeIndex + 1] = {
            ...newSteps[activeIndex + 1],
            active: true,
          };
          return newSteps;
        }
        return prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container py-6">
      {/* Back Button */}
      <Link
        href="/orders"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to orders
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Tracking */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Header */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Order {orderData.id}
                </h1>
                <p className="text-sm text-muted-foreground">
                  From {orderData.restaurant}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">
                  Estimated delivery
                </p>
                <p className="text-lg font-bold text-primary">
                  {orderData.estimatedDelivery}
                </p>
              </div>
            </div>
          </div>

          {/* Live Tracking Map (Placeholder) */}
          <div className="card">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted sm:aspect-[21/9]">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-center">
                  <div className="text-6xl">🗺️</div>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    Live tracking map
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Real-time rider location
                  </p>
                </div>
              </div>
              {/* Map Overlay Elements */}
              <div className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-xs font-medium text-foreground">
                    Rider nearby
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Steps */}
          <div className="card">
            <h2 className="mb-6 font-semibold text-foreground">
              Order Status
            </h2>
            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step.id} className="relative flex gap-4">
                  {/* Line + Dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition-all ${
                        step.completed
                          ? "bg-emerald-100 text-emerald-600"
                          : step.active
                          ? "bg-primary/10 text-primary ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.icon}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 ${
                          step.completed ? "bg-emerald-200" : "bg-muted"
                        }`}
                      ></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-6">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-medium ${
                          step.active
                            ? "text-foreground"
                            : step.completed
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </h3>
                      {step.active && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                    {step.time && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {step.time}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rider Info */}
          <div className="card">
            <h2 className="mb-4 font-semibold text-foreground">
              Your Rider
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {orderData.riderName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {orderData.riderName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {orderData.riderVehicle}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowContact(!showContact)}
                  className="btn-icon border border-border"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </button>
                <button className="btn-icon border border-border">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </button>
              </div>
            </div>

            {showContact && (
              <div className="mt-4 animate-fade-in rounded-xl border border-border bg-muted/50 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium text-foreground">
                      {orderData.riderPhone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="font-medium text-foreground">
                      {orderData.riderVehicle}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-4">
          {/* Delivery Address */}
          <div className="card">
            <h3 className="mb-2 font-semibold text-foreground">
              Delivery address
            </h3>
            <p className="text-sm text-muted-foreground">
              {orderData.deliveryAddress}
            </p>
          </div>

          {/* Order Items */}
          <div className="card">
            <h3 className="mb-4 font-semibold text-foreground">Order items</h3>
            <div className="space-y-3">
              {orderData.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      {item.quantity}x
                    </span>
                    <span className="text-foreground">{item.name}</span>
                  </div>
                  <span className="text-foreground">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">
                  ${orderData.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span className="text-foreground">
                  ${orderData.deliveryFee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service fee</span>
                <span className="text-foreground">
                  ${orderData.serviceFee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip</span>
                <span className="text-foreground">
                  ${orderData.tip.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-foreground">
                    ${orderData.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="card">
            <h3 className="mb-2 font-semibold text-foreground">Payment</h3>
            <div className="flex items-center gap-3">
              <span className="text-xl">💳</span>
              <span className="text-sm text-muted-foreground">
                {orderData.paymentMethod}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="card space-y-2">
            <button className="btn-secondary w-full justify-start text-sm">
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
              Download Receipt
            </button>
            <button className="btn-secondary w-full justify-start text-sm">
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1H21M3 3v18" />
              </svg>
              Report an Issue
            </button>
            <Link
              href="/restaurants"
              className="btn-primary w-full justify-center text-sm"
            >
              Order Again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
