import { z } from "zod";

// --- Types ----------------------------------------------------------------

export type PaymentProvider = "stripe" | "paypal" | "apple_pay" | "google_pay" | "cash";

export type PaymentMethodType = "card" | "digital_wallet" | "bank_transfer" | "cash";

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  provider: PaymentProvider;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  billingAddress?: Address;
  token: string;
  createdAt: Date;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  methodId: string;
  status: PaymentStatus;
  type: TransactionType;
  description: string;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  refundIds: string[];
  captures: CaptureRecord[];
}

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded" | "partially_refunded" | "disputed";

export type TransactionType = "charge" | "refund" | "authorization" | "capture" | "void" | "tip_adjustment";

export interface CaptureRecord {
  id: string;
  amount: number;
  capturedAt: Date;
  metadata?: Record<string, string>;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: RefundReason;
  description?: string;
  metadata?: Record<string, string>;
}

export type RefundReason = "duplicate" | "fraudulent" | "requested_by_customer" | "order_cancelled" | "quality_issue" | "delivery_failed" | "wrong_order" | "other";

export interface RefundResult {
  id: string;
  transactionId: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  estimatedArrival: Date;
  reason: RefundReason;
  createdAt: Date;
}

export interface PaymentConfig {
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  paypalClientId?: string;
  paypalClientSecret?: string;
  defaultCurrency: string;
  processingFeePercent: number;
  minimumCharge: number;
  maximumCharge: number;
  enableCashOnDelivery: boolean;
  enablePartialRefunds: boolean;
  refundWindowDays: number;
  taxRate: number;
}

export interface PaymentReceipt {
  id: string;
  transactionId: string;
  orderId: string;
  userId: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  discount: number;
  tip: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paidAt: Date;
  receiptUrl: string;
}

export interface FraudCheck {
  transactionId: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  flags: string[];
  recommendation: "approve" | "review" | "decline";
  checkedAt: Date;
}

// --- Validation -----------------------------------------------------------

const paymentMethodSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["card", "digital_wallet", "bank_transfer", "cash"]),
  provider: z.enum(["stripe", "paypal", "apple_pay", "google_pay", "cash"]),
  token: z.string().min(1),
  last4: z.string().length(4).optional(),
  brand: z.string().optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(2024).optional(),
  billingAddress: z.object({ line1: z.string(), line2: z.string().optional(), city: z.string(), state: z.string(), postalCode: z.string(), country: z.string() }).optional(),
});

const refundRequestSchema = z.object({
  transactionId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer", "order_cancelled", "quality_issue", "delivery_failed", "wrong_order", "other"]),
  description: z.string().optional(),
});

// --- Payment Provider Adapters --------------------------------------------

interface PaymentAdapter {
  createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>): Promise<{ id: string; clientSecret?: string }>;
  confirmPayment(paymentIntentId: string, paymentMethodToken: string): Promise<{ status: string; error?: string }>;
  createRefund(transactionId: string, amount: number, reason: string): Promise<{ id: string; status: string }>;
  getTransactionStatus(transactionId: string): Promise<{ status: string; metadata: Record<string, string> }>;
}

class StripeAdapter implements PaymentAdapter {
  constructor(private secretKey: string) {}

  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>): Promise<{ id: string; clientSecret?: string }> {
    const amountInCents = Math.round(amount * 100);
    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ amount: String(amountInCents), currency, "metadata[orderId]": metadata.orderId ?? "", "metadata[userId]": metadata.userId ?? "" }),
    });
    if (!res.ok) throw new PaymentError("stripe", res.status, await res.text());
    const data = await res.json();
    return { id: data.id, clientSecret: data.client_secret };
  }

  async confirmPayment(paymentIntentId: string, paymentMethodToken: string): Promise<{ status: string; error?: string }> {
    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ payment_method: paymentMethodToken }),
    });
    if (!res.ok) {
      const err = await res.json();
      return { status: "failed", error: err.error?.message ?? "Payment failed" };
    }
    const data = await res.json();
    return { status: data.status };
  }

  async createRefund(transactionId: string, amount: number, reason: string): Promise<{ id: string; status: string }> {
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ payment_intent: transactionId, amount: String(Math.round(amount * 100)), reason }),
    });
    if (!res.ok) throw new PaymentError("stripe", res.status, await res.text());
    const data = await res.json();
    return { id: data.id, status: data.status };
  }

  async getTransactionStatus(transactionId: string): Promise<{ status: string; metadata: Record<string, string> }> {
    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${transactionId}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    if (!res.ok) throw new PaymentError("stripe", res.status, await res.text());
    const data = await res.json();
    return { status: data.status, metadata: data.metadata ?? {} };
  }
}

class MockAdapter implements PaymentAdapter {
  async createPaymentIntent(amount: number, _currency: string, _metadata: Record<string, string>): Promise<{ id: string; clientSecret?: string }> {
    const id = `mock_pi_${crypto.randomUUID().slice(0, 8)}`;
    return { id, clientSecret: `${id}_secret` };
  }

  async confirmPayment(_paymentIntentId: string, _paymentMethodToken: string): Promise<{ status: string; error?: string }> {
    return { status: "succeeded" };
  }

  async createRefund(transactionId: string, _amount: number, _reason: string): Promise<{ id: string; status: string }> {
    return { id: `mock_refund_${transactionId.slice(0, 8)}`, status: "succeeded" };
  }

  async getTransactionStatus(transactionId: string): Promise<{ status: string; metadata: Record<string, string> }> {
    return { status: "succeeded", metadata: {} };
  }
}

// --- Error ----------------------------------------------------------------

export class PaymentError extends Error {
  constructor(public provider: string, public statusCode: number, public detail: string) {
    super(`[Payment:${provider}] ${statusCode}: ${detail}`);
    this.name = "PaymentError";
  }
}

// --- Fraud Detection ------------------------------------------------------

class FraudDetector {
  private suspiciousPatterns = [
    { check: (amount: number) => amount > 500, flag: "high_value_transaction", weight: 0.3 },
    { check: (_: number, meta: Record<string, string>) => meta.multipleFailedAttempts === "true", flag: "repeated_failures", weight: 0.4 },
    { check: (_: number, meta: Record<string, string>) => meta.countryMismatch === "true", flag: "country_mismatch", weight: 0.35 },
  ];

  check(transactionId: string, amount: number, metadata: Record<string, string>): FraudCheck {
    const flags: string[] = [];
    let totalWeight = 0;

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.check(amount, metadata)) {
        flags.push(pattern.flag);
        totalWeight += pattern.weight;
      }
    }

    const riskScore = Math.min(totalWeight, 1);
    let riskLevel: FraudCheck["riskLevel"] = "low";
    if (riskScore > 0.8) riskLevel = "critical";
    else if (riskScore > 0.5) riskLevel = "high";
    else if (riskScore > 0.2) riskLevel = "medium";

    let recommendation: FraudCheck["recommendation"] = "approve";
    if (riskLevel === "critical") recommendation = "decline";
    else if (riskLevel === "high") recommendation = "review";

    return { transactionId, riskScore: Math.round(riskScore * 100) / 100, riskLevel, flags, recommendation, checkedAt: new Date() };
  }
}

// --- Payment Service ------------------------------------------------------

export class PaymentService {
  private adapters = new Map<PaymentProvider, PaymentAdapter>();
  private transactions = new Map<string, PaymentTransaction>();
  private paymentMethods = new Map<string, PaymentMethod[]>();
  private fraudDetector = new FraudDetector();
  private receipts = new Map<string, PaymentReceipt>();
  private config: PaymentConfig;

  constructor(config?: Partial<PaymentConfig>) {
    this.config = {
      defaultCurrency: "usd",
      processingFeePercent: 0.029,
      minimumCharge: 1.00,
      maximumCharge: 10000,
      enableCashOnDelivery: true,
      enablePartialRefunds: true,
      refundWindowDays: 14,
      taxRate: 0.08,
      ...config,
    };

    this.adapters.set("stripe", new MockAdapter());
    this.adapters.set("paypal", new MockAdapter());
    this.adapters.set("apple_pay", new MockAdapter());
    this.adapters.set("google_pay", new MockAdapter());
    this.adapters.set("cash", new MockAdapter());
  }

  configureStripe(secretKey: string): void {
    this.adapters.set("stripe", new StripeAdapter(secretKey));
  }

  async addPaymentMethod(data: z.infer<typeof paymentMethodSchema>): Promise<PaymentMethod> {
    const validated = paymentMethodSchema.parse(data);
    const method: PaymentMethod = {
      id: crypto.randomUUID(),
      ...validated,
      isDefault: false,
      createdAt: new Date(),
    };

    const existing = this.paymentMethods.get(validated.userId) ?? [];
    if (!existing.length) method.isDefault = true;
    existing.push(method);
    this.paymentMethods.set(validated.userId, existing);
    return method;
  }

  getPaymentMethods(userId: string): PaymentMethod[] {
    return this.paymentMethods.get(userId) ?? [];
  }

  setDefaultPaymentMethod(userId: string, methodId: string): boolean {
    const methods = this.paymentMethods.get(userId);
    if (!methods) return false;
    const target = methods.find((m) => m.id === methodId);
    if (!target) return false;
    methods.forEach((m) => (m.isDefault = m.id === methodId));
    return true;
  }

  removePaymentMethod(userId: string, methodId: string): boolean {
    const methods = this.paymentMethods.get(userId);
    if (!methods) return false;
    const idx = methods.findIndex((m) => m.id === methodId);
    if (idx === -1) return false;
    const wasDefault = methods[idx].isDefault;
    methods.splice(idx, 1);
    if (wasDefault && methods.length) methods[0].isDefault = true;
    return true;
  }

  async processPayment(orderId: string, userId: string, amount: number, methodId: string, metadata: Record<string, string> = {}): Promise<PaymentTransaction> {
    if (amount < this.config.minimumCharge) throw new PaymentError("system", 400, `Minimum charge is $${this.config.minimumCharge}`);
    if (amount > this.config.maximumCharge) throw new PaymentError("system", 400, `Maximum charge is $${this.config.maximumCharge}`);

    const methods = this.paymentMethods.get(userId) ?? [];
    const method = methods.find((m) => m.id === methodId);
    if (!method) throw new PaymentError("system", 404, "Payment method not found");

    const transaction: PaymentTransaction = {
      id: crypto.randomUUID(),
      orderId,
      userId,
      amount,
      currency: this.config.defaultCurrency,
      provider: method.provider,
      methodId: method.id,
      status: "pending",
      type: "charge",
      description: `Order #${orderId}`,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      refundIds: [],
      captures: [],
    };

    const fraudCheck = this.fraudDetector.check(transaction.id, amount, metadata);
    if (fraudCheck.recommendation === "decline") {
      transaction.status = "failed";
      transaction.failureReason = "Fraud detection: transaction declined";
      transaction.failedAt = new Date();
      transaction.updatedAt = new Date();
      this.transactions.set(transaction.id, transaction);
      throw new PaymentError(method.provider, 403, "Transaction flagged as fraudulent");
    }

    transaction.status = "processing";
    this.transactions.set(transaction.id, transaction);

    try {
      const adapter = this.adapters.get(method.provider);
      if (!adapter) throw new PaymentError(method.provider, 500, "Payment provider not configured");

      const intent = await adapter.createPaymentIntent(amount, this.config.defaultCurrency, { orderId, userId, transactionId: transaction.id });
      const result = await adapter.confirmPayment(intent.id, method.token);

      if (result.status === "succeeded") {
        transaction.status = "completed";
        transaction.processedAt = new Date();
        transaction.captures.push({ id: crypto.randomUUID(), amount, capturedAt: new Date() });
      } else {
        transaction.status = "failed";
        transaction.failureReason = result.error ?? "Payment declined";
        transaction.failedAt = new Date();
      }
    } catch (err) {
      transaction.status = "failed";
      transaction.failureReason = err instanceof Error ? err.message : "Unknown error";
      transaction.failedAt = new Date();
    }

    transaction.updatedAt = new Date();
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    const validated = refundRequestSchema.parse(request);
    const transaction = this.transactions.get(validated.transactionId);
    if (!transaction) throw new PaymentError("system", 404, "Transaction not found");
    if (transaction.status !== "completed") throw new PaymentError("system", 400, "Can only refund completed transactions");

    const totalRefunded = transaction.refundIds.reduce((sum, id) => {
      const refundTx = this.transactions.get(id);
      return sum + (refundTx?.amount ?? 0);
    }, 0);

    if (totalRefunded + validated.amount > transaction.amount) {
      if (!this.config.enablePartialRefunds || totalRefunded >= transaction.amount) {
        throw new PaymentError("system", 400, "Refund amount exceeds refundable amount");
      }
    }

    const daysSincePurchase = (Date.now() - transaction.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > this.config.refundWindowDays) {
      throw new PaymentError("system", 400, `Refund window of ${this.config.refundWindowDays} days has passed`);
    }

    const refundTx: PaymentTransaction = {
      id: crypto.randomUUID(),
      orderId: transaction.orderId,
      userId: transaction.userId,
      amount: validated.amount,
      currency: transaction.currency,
      provider: transaction.provider,
      methodId: transaction.methodId,
      status: "processing",
      type: "refund",
      description: validated.description ?? `Refund for ${validated.reason}`,
      metadata: { originalTransactionId: transaction.id, reason: validated.reason },
      createdAt: new Date(),
      updatedAt: new Date(),
      refundIds: [],
      captures: [],
    };

    this.transactions.set(refundTx.id, refundTx);
    transaction.refundIds.push(refundTx.id);
    transaction.updatedAt = new Date();

    try {
      const adapter = this.adapters.get(transaction.provider);
      const result = await adapter!.createRefund(transaction.id, validated.amount, validated.reason);
      refundTx.status = result.status === "succeeded" ? "completed" : "failed";
      refundTx.processedAt = new Date();
      if (refundTx.status === "completed" && totalRefunded + validated.amount >= transaction.amount) {
        transaction.status = "refunded";
      } else if (refundTx.status === "completed") {
        transaction.status = "partially_refunded";
      }
    } catch {
      refundTx.status = "failed";
      refundTx.failureReason = "Refund processing failed";
    }

    refundTx.updatedAt = new Date();
    this.transactions.set(refundTx.id, refundTx);

    return {
      id: refundTx.id,
      transactionId: transaction.id,
      amount: validated.amount,
      status: refundTx.status as "pending" | "completed" | "failed",
      estimatedArrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      reason: validated.reason,
      createdAt: refundTx.createdAt,
    };
  }

  getTransaction(transactionId: string): PaymentTransaction | undefined {
    return this.transactions.get(transactionId);
  }

  getTransactionsByOrder(orderId: string): PaymentTransaction[] {
    return [...this.transactions.values()].filter((t) => t.orderId === orderId);
  }

  getTransactionsByUser(userId: string): PaymentTransaction[] {
    return [...this.transactions.values()].filter((t) => t.userId === userId);
  }

  generateReceipt(transactionId: string, items: Array<{ name: string; quantity: number; unitPrice: number }>): PaymentReceipt | undefined {
    const tx = this.transactions.get(transactionId);
    if (!tx || tx.status !== "completed") return undefined;

    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const deliveryFee = 2.99;
    const serviceFee = 1.49;
    const tax = Math.round(subtotal * this.config.taxRate * 100) / 100;
    const discount = 0;
    const tip = 0;
    const total = Math.round((subtotal + deliveryFee + serviceFee + tax - discount + tip) * 100) / 100;

    const receipt: PaymentReceipt = {
      id: crypto.randomUUID(),
      transactionId,
      orderId: tx.orderId,
      userId: tx.userId,
      items: items.map((i) => ({ ...i, total: Math.round(i.unitPrice * i.quantity * 100) / 100 })),
      subtotal: Math.round(subtotal * 100) / 100,
      deliveryFee,
      serviceFee,
      tax,
      discount,
      tip,
      total,
      currency: tx.currency,
      paymentMethod: tx.provider,
      paidAt: tx.processedAt ?? tx.createdAt,
      receiptUrl: `/receipts/${transactionId}`,
    };

    this.receipts.set(transactionId, receipt);
    return receipt;
  }

  getReceipt(transactionId: string): PaymentReceipt | undefined {
    return this.receipts.get(transactionId);
  }

  calculateProcessingFee(amount: number): number {
    return Math.round(amount * this.config.processingFeePercent * 100) / 100;
  }

  getPaymentStats(): { totalTransactions: number; totalRevenue: number; totalRefunds: number; successRate: number; averageTransaction: number } {
    const txs = [...this.transactions.values()];
    const charges = txs.filter((t) => t.type === "charge");
    const completed = charges.filter((t) => t.status === "completed");
    const refunded = txs.filter((t) => t.type === "refund" && t.status === "completed");

    return {
      totalTransactions: charges.length,
      totalRevenue: completed.reduce((s, t) => s + t.amount, 0),
      totalRefunds: refunded.reduce((s, t) => s + t.amount, 0),
      successRate: charges.length ? Math.round((completed.length / charges.length) * 10000) / 100 : 0,
      averageTransaction: completed.length ? Math.round((completed.reduce((s, t) => s + t.amount, 0) / completed.length) * 100) / 100 : 0,
    };
  }
}

export const paymentService = new PaymentService();
