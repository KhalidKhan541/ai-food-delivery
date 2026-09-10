"use client";

import { useState, useCallback } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  Check,
  X,
  Shield,
  Visa,
  Lock,
  Edit3,
  MoreVertical,
  Receipt,
  Smartphone,
  Banknote,
} from "lucide-react";

type PaymentMethod = {
  id: string;
  type: "card" | "apple_pay" | "google_pay" | "cash";
  label: string;
  last4?: string;
  brand?: string;
  expiry?: string;
  isDefault: boolean;
  icon: string;
};

type Transaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
  paymentMethod: string;
  orderId: string;
};

type CardFormData = {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
};

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "1",
    type: "card",
    label: "Visa ending in 4242",
    last4: "4242",
    brand: "Visa",
    expiry: "12/27",
    isDefault: true,
    icon: "💳",
  },
  {
    id: "2",
    type: "card",
    label: "Mastercard ending in 8888",
    last4: "8888",
    brand: "Mastercard",
    expiry: "06/28",
    isDefault: false,
    icon: "💳",
  },
  {
    id: "3",
    type: "apple_pay",
    label: "Apple Pay",
    isDefault: false,
    icon: "🍎",
  },
  {
    id: "4",
    type: "cash",
    label: "Cash on delivery",
    isDefault: false,
    icon: "💵",
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    description: "Bella Napoli - Order #1234",
    amount: 32.50,
    date: "Today, 7:30 PM",
    status: "completed",
    paymentMethod: "Visa •••• 4242",
    orderId: "ORD-1234",
  },
  {
    id: "2",
    description: "Green Bowl - Order #1230",
    amount: 18.75,
    date: "Yesterday, 12:15 PM",
    status: "completed",
    paymentMethod: "Visa •••• 4242",
    orderId: "ORD-1230",
  },
  {
    id: "3",
    description: "Sakura Garden - Order #1228",
    amount: 45.20,
    date: "Sep 8, 6:45 PM",
    status: "completed",
    paymentMethod: "Mastercard •••• 8888",
    orderId: "ORD-1228",
  },
  {
    id: "4",
    description: "Burger Barn - Order #1225",
    amount: 22.99,
    date: "Sep 7, 1:30 PM",
    status: "failed",
    paymentMethod: "Visa •••• 4242",
    orderId: "ORD-1225",
  },
  {
    id: "5",
    description: "Sweet Dreams - Order #1220",
    amount: 15.60,
    date: "Sep 5, 3:20 PM",
    status: "completed",
    paymentMethod: "Apple Pay",
    orderId: "ORD-1220",
  },
];

const BRAND_COLORS: Record<string, string> = {
  Visa: "text-blue-600 bg-blue-50",
  Mastercard: "text-orange-600 bg-orange-50",
  Amex: "text-blue-500 bg-blue-50",
};

export default function PaymentsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(MOCK_PAYMENT_METHODS);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState<CardFormData>({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"methods" | "history">("methods");

  const handleSetDefault = useCallback((id: string) => {
    setPaymentMethods((prev) =>
      prev.map((m) => ({ ...m, isDefault: m.id === id }))
    );
    setOpenMenu(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setPaymentMethods((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      if (filtered.length > 0 && !filtered.some((m) => m.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
    setOpenMenu(null);
  }, []);

  const handleAddCard = useCallback(() => {
    const last4 = cardForm.number.replace(/\s/g, "").slice(-4);
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: "card",
      label: `Card ending in ${last4}`,
      last4,
      brand: "Visa",
      expiry: cardForm.expiry,
      isDefault: paymentMethods.length === 0,
      icon: "💳",
    };
    setPaymentMethods((prev) => [...prev, newMethod]);
    setCardForm({ number: "", name: "", expiry: "", cvv: "" });
    setShowAddCard(false);
  }, [cardForm, paymentMethods.length]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500 mt-1">Manage payment methods & view history</p>
          </div>
          <button
            onClick={() => setShowAddCard(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl border border-gray-100 p-1 mb-6">
          {[
            { id: "methods" as const, label: "Payment Methods", icon: CreditCard },
            { id: "history" as const, label: "History", icon: Receipt },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payment Methods Tab */}
        {activeTab === "methods" && (
          <>
            <div className="space-y-3 mb-6">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                    method.isDefault
                      ? "border-primary/20 ring-1 ring-primary/10"
                      : "border-gray-100"
                  }`}
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl shrink-0">
                      {method.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">{method.label}</h3>
                        {method.isDefault && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                            Default
                          </span>
                        )}
                      </div>
                      {method.brand && (
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              BRAND_COLORS[method.brand] || "text-gray-600 bg-gray-100"
                            }`}
                          >
                            {method.brand}
                          </span>
                          {method.expiry && (
                            <span className="text-xs text-gray-400">Exp {method.expiry}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative shrink-0">
                      <button
                        onClick={() =>
                          setOpenMenu(openMenu === method.id ? null : method.id)
                        }
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      {openMenu === method.id && (
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                          {!method.isDefault && method.type !== "cash" && (
                            <button
                              onClick={() => handleSetDefault(method.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Check className="w-4 h-4" />
                              Set as default
                            </button>
                          )}
                          {method.type === "card" && (
                            <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Edit3 className="w-4 h-4" />
                              Edit card
                            </button>
                          )}
                          {!method.isDefault && (
                            <button
                              onClick={() => handleDelete(method.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/5"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Security Notice */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">Secure payments</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Your payment information is encrypted and securely stored. We never share your
                    card details with restaurants or drivers.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {MOCK_TRANSACTIONS.map((txn, i) => (
              <div
                key={txn.id}
                className={`px-5 py-4 ${i > 0 ? "border-t border-gray-50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{txn.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{txn.date}</p>
                    <p className="text-xs text-gray-400">{txn.paymentMethod}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-gray-900">${txn.amount.toFixed(2)}</p>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                        txn.status === "completed"
                          ? "bg-success/10 text-success"
                          : txn.status === "pending"
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {txn.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Card Modal */}
        {showAddCard && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddCard(false)}
            />
            <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-bottom">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Add payment method</h2>
                <button
                  onClick={() => setShowAddCard(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={cardForm.number}
                      onChange={(e) =>
                        setCardForm((f) => ({
                          ...f,
                          number: formatCardNumber(e.target.value),
                        }))
                      }
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder name
                  </label>
                  <input
                    type="text"
                    value={cardForm.name}
                    onChange={(e) =>
                      setCardForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry date
                    </label>
                    <input
                      type="text"
                      value={cardForm.expiry}
                      onChange={(e) =>
                        setCardForm((f) => ({
                          ...f,
                          expiry: formatExpiry(e.target.value),
                        }))
                      }
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={cardForm.cvv}
                        onChange={(e) =>
                          setCardForm((f) => ({
                            ...f,
                            cvv: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center gap-2 p-3 bg-success/5 rounded-xl">
                  <Shield className="w-4 h-4 text-success shrink-0" />
                  <p className="text-xs text-gray-600">
                    Your card information is encrypted and stored securely
                  </p>
                </div>

                {/* Add Button */}
                <button
                  onClick={handleAddCard}
                  disabled={
                    !cardForm.number || !cardForm.name || !cardForm.expiry || !cardForm.cvv
                  }
                  className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add card
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
