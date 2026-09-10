"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Tag,
  Copy,
  Check,
  Clock,
  Percent,
  Gift,
  Truck,
  Star,
  Sparkles,
  Search,
  ArrowRight,
  Zap,
  AlertCircle,
} from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: "percentage" | "fixed" | "free_delivery" | "bogo";
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  expiresAt: string;
  usageLimit?: number;
  usageCount: number;
  isUsed: boolean;
  restaurantName?: string;
  tags: string[];
  color: string;
};

type AiRecommendation = {
  id: string;
  title: string;
  description: string;
  promoCode: string;
  savings: string;
  confidence: number;
};

const MOCK_PROMOS: PromoCode[] = [
  {
    id: "1",
    code: "WELCOME20",
    title: "Welcome Offer",
    description: "20% off your first order",
    discountType: "percentage",
    discountValue: 20,
    minOrder: 15,
    maxDiscount: 10,
    expiresAt: "Dec 31, 2026",
    usageLimit: 1,
    usageCount: 0,
    isUsed: false,
    tags: ["New User", "One-time"],
    color: "from-primary to-secondary",
  },
  {
    id: "2",
    code: "FREEDEL",
    title: "Free Delivery",
    description: "Free delivery on your next 3 orders",
    discountType: "free_delivery",
    discountValue: 3.99,
    minOrder: 10,
    expiresAt: "Oct 15, 2026",
    usageLimit: 3,
    usageCount: 1,
    isUsed: false,
    tags: ["Delivery", "Multiple uses"],
    color: "from-success to-emerald-600",
  },
  {
    id: "3",
    code: "PIZZA15",
    title: "Pizza Night",
    description: "15% off all pizza orders over $20",
    discountType: "percentage",
    discountValue: 15,
    minOrder: 20,
    maxDiscount: 8,
    expiresAt: "Sep 30, 2026",
    usageLimit: 2,
    usageCount: 2,
    isUsed: true,
    restaurantName: "Bella Napoli",
    tags: ["Italian", "Pizza", "Restaurant"],
    color: "from-accent to-amber-600",
  },
  {
    id: "4",
    code: "LUNCH10",
    title: "Lunch Special",
    description: "$10 off orders between 11 AM - 2 PM",
    discountType: "fixed",
    discountValue: 10,
    minOrder: 25,
    expiresAt: "Oct 1, 2026",
    usageLimit: 1,
    usageCount: 0,
    isUsed: false,
    tags: ["Lunch", "Time-limited"],
    color: "from-info to-blue-600",
  },
  {
    id: "5",
    code: "BOGO50",
    title: "Buy One Get One",
    description: "50% off your second item at select restaurants",
    discountType: "bogo",
    discountValue: 50,
    minOrder: 0,
    expiresAt: "Sep 25, 2026",
    usageCount: 0,
    isUsed: false,
    tags: ["BOGO", "Limited"],
    color: "from-secondary to-rose-500",
  },
];

const MOCK_AI_RECOMMENDATIONS: AiRecommendation[] = [
  {
    id: "1",
    title: "Best deal for your order",
    description: "Based on your cart at Bella Napoli, use WELCOME20 to save $6.50",
    promoCode: "WELCOME20",
    savings: "$6.50",
    confidence: 95,
  },
  {
    id: "2",
    title: "Save on delivery",
    description: "Your order qualifies for free delivery with FREEDEL",
    promoCode: "FREEDEL",
    savings: "$3.99",
    confidence: 88,
  },
  {
    id: "3",
    title: "Lunchtime special",
    description: "Order before 2 PM and save $10 with LUNCH10",
    promoCode: "LUNCH10",
    savings: "$10.00",
    confidence: 72,
  },
];

export default function PromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>(MOCK_PROMOS);
  const [promoInput, setPromoInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "used" | "ai">("available");
  const [applyMessage, setApplyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleCopyCode = useCallback((id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleApplyPromo = useCallback(() => {
    const promo = promos.find(
      (p) => p.code.toLowerCase() === promoInput.toLowerCase() && !p.isUsed
    );
    if (promo) {
      setApplyMessage({
        type: "success",
        text: `Promo "${promo.code}" applied! ${promo.description}`,
      });
    } else if (promos.find((p) => p.code.toLowerCase() === promoInput.toLowerCase())) {
      setApplyMessage({ type: "error", text: "This promo code has already been used" });
    } else {
      setApplyMessage({ type: "error", text: "Invalid promo code" });
    }
    setPromoInput("");
    setTimeout(() => setApplyMessage(null), 4000);
  }, [promoInput, promos]);

  const availablePromos = promos.filter((p) => !p.isUsed);
  const usedPromos = promos.filter((p) => p.isUsed);

  const getDiscountLabel = (promo: PromoCode) => {
    switch (promo.discountType) {
      case "percentage":
        return `${promo.discountValue}% OFF`;
      case "fixed":
        return `$${promo.discountValue} OFF`;
      case "free_delivery":
        return "FREE DEL";
      case "bogo":
        return `BOGO ${promo.discountValue}%`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
          <p className="text-gray-500 mt-1">Save on your next orders</p>
        </div>

        {/* Promo Input */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                placeholder="Enter promo code"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono"
              />
            </div>
            <button
              onClick={handleApplyPromo}
              disabled={!promoInput}
              className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
          {applyMessage && (
            <div
              className={`mt-3 p-3 rounded-xl text-sm flex items-center gap-2 ${
                applyMessage.type === "success"
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {applyMessage.type === "success" ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {applyMessage.text}
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        {activeTab === "available" && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-gray-900">AI-Picked for You</h2>
            </div>
            <div className="space-y-3">
              {MOCK_AI_RECOMMENDATIONS.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl border border-primary/10 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <h3 className="text-sm font-semibold text-gray-900">{rec.title}</h3>
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {rec.confidence}% match
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{rec.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-success">{rec.savings}</p>
                      <button
                        onClick={() => {
                          setPromoInput(rec.promoCode);
                          handleApplyPromo();
                        }}
                        className="text-xs text-primary font-medium hover:underline mt-0.5"
                      >
                        Apply now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-xl border border-gray-100 p-1 mb-6">
          {[
            { id: "available" as const, label: `Available (${availablePromos.length})`, icon: Tag },
            { id: "used" as const, label: `Used (${usedPromos.length})`, icon: Check },
            { id: "ai" as const, label: "AI Picks", icon: Sparkles },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Available Promos */}
        {(activeTab === "available" || activeTab === "ai") && (
          <div className="space-y-3">
            {availablePromos.map((promo) => (
              <div
                key={promo.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div className={`h-1.5 bg-gradient-to-r ${promo.color}`} />
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-16 h-16 bg-gradient-to-br ${promo.color} rounded-xl flex flex-col items-center justify-center text-white shrink-0`}
                    >
                      <span className="text-xs font-medium opacity-80">UP TO</span>
                      <span className="text-lg font-bold leading-tight">
                        {getDiscountLabel(promo)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{promo.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{promo.description}</p>
                      {promo.restaurantName && (
                        <p className="text-xs text-gray-400 mt-1">
                          Valid at {promo.restaurantName}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {promo.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          Expires {promo.expiresAt}
                        </div>
                        {promo.minOrder > 0 && (
                          <span className="text-xs text-gray-400">
                            Min ${promo.minOrder} order
                          </span>
                        )}
                        {promo.usageLimit && (
                          <span className="text-xs text-gray-400">
                            {promo.usageLimit - promo.usageCount}/{promo.usageLimit} uses left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl font-mono text-sm text-gray-700">
                      <span className="flex-1 tracking-wider">{promo.code}</span>
                      <button
                        onClick={() => handleCopyCode(promo.id, promo.code)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copiedId === promo.id ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <Link
                      href={`/search?promo=${promo.code}`}
                      className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Use
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Used Promos */}
        {activeTab === "used" && (
          <div className="space-y-3">
            {usedPromos.map((promo) => (
              <div
                key={promo.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 opacity-60"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 shrink-0">
                    <span className="text-xs">USED</span>
                    <span className="text-sm font-bold line-through">
                      {getDiscountLabel(promo)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-500 line-through">{promo.title}</h3>
                    <p className="text-sm text-gray-400">{promo.description}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Check className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400">Used</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {usedPromos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No used promo codes yet</p>
              </div>
            )}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
