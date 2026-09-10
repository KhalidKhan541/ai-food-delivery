import { describe, it, expect, beforeEach, jest } from "@jest/globals";

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: "requires_payment_method" | "requires_confirmation" | "succeeded" | "failed";
  clientSecret: string;
  metadata: Record<string, string>;
}

interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
  errorCode?: string;
}

interface RefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}

interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, any>;
  };
  created: Date;
}

class PaymentProcessor {
  private gateway: PaymentGateway;

  constructor(gateway: PaymentGateway) {
    this.gateway = gateway;
  }

  async processPayment(
    amount: number,
    currency: string,
    metadata: Record<string, string>
  ): Promise<PaymentResult> {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    if (amount > 999999) {
      return { success: false, error: "Amount exceeds maximum" };
    }

    if (!currency || currency.length !== 3) {
      return { success: false, error: "Invalid currency" };
    }

    try {
      const intent = await this.gateway.createPaymentIntent({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        metadata,
      });

      const confirmed = await this.gateway.confirmPayment(intent.id);

      if (confirmed.status === "succeeded") {
        return {
          success: true,
          paymentIntentId: confirmed.id,
        };
      }

      return {
        success: false,
        error: "Payment confirmation failed",
        errorCode: confirmed.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: number
  ): Promise<RefundResult> {
    try {
      const refund = await this.gateway.createRefund(paymentIntentId, amount);
      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Refund failed",
      };
    }
  }
}

interface PaymentGateway {
  createPaymentIntent(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent>;
  confirmPayment(id: string): Promise<PaymentIntent>;
  createRefund(paymentIntentId: string, amount?: number): Promise<{
    id: string;
    amount: number;
  }>;
}

class MockPaymentGateway implements PaymentGateway {
  private intents = new Map<string, PaymentIntent>();
  private shouldFail = false;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent> {
    if (this.shouldFail) {
      throw new Error("Gateway connection failed");
    }

    const intent: PaymentIntent = {
      id: `pi_${Date.now()}`,
      amount: params.amount,
      currency: params.currency,
      status: "requires_confirmation",
      clientSecret: `cs_${Date.now()}`,
      metadata: params.metadata,
    };
    this.intents.set(intent.id, intent);
    return intent;
  }

  async confirmPayment(id: string): Promise<PaymentIntent> {
    if (this.shouldFail) {
      throw new Error("Confirmation failed");
    }

    const intent = this.intents.get(id);
    if (!intent) throw new Error("Payment intent not found");

    intent.status = "succeeded";
    return intent;
  }

  async createRefund(
    paymentIntentId: string,
    amount?: number
  ): Promise<{ id: string; amount: number }> {
    if (this.shouldFail) {
      throw new Error("Refund failed");
    }

    const intent = this.intents.get(paymentIntentId);
    if (!intent) throw new Error("Payment intent not found");

    const refundAmount = amount ?? intent.amount;
    return {
      id: `re_${Date.now()}`,
      amount: refundAmount,
    };
  }
}

function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) return false;
  const expectedSignature = `hmac_sha256=${secret}`;
  return signature === expectedSignature;
}

function parseWebhookEvent(payload: string): WebhookEvent | null {
  try {
    const parsed = JSON.parse(payload);
    if (!parsed.id || !parsed.type || !parsed.data) return null;
    return {
      ...parsed,
      created: new Date(parsed.created * 1000),
    };
  } catch {
    return null;
  }
}

describe("Payment Processor Unit Tests", () => {
  let gateway: MockPaymentGateway;
  let processor: PaymentProcessor;

  beforeEach(() => {
    gateway = new MockPaymentGateway();
    processor = new PaymentProcessor(gateway);
  });

  describe("Payment Processing", () => {
    it("should process payment successfully", async () => {
      const result = await processor.processPayment(25.99, "usd", {
        orderId: "order-1",
      });

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBeDefined();
    });

    it("should reject zero amount", async () => {
      const result = await processor.processPayment(0, "usd", {
        orderId: "order-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Amount must be positive");
    });

    it("should reject negative amount", async () => {
      const result = await processor.processPayment(-10, "usd", {
        orderId: "order-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Amount must be positive");
    });

    it("should reject amount exceeding maximum", async () => {
      const result = await processor.processPayment(1000000, "usd", {
        orderId: "order-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Amount exceeds maximum");
    });

    it("should reject invalid currency", async () => {
      const result = await processor.processPayment(10, "", {
        orderId: "order-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid currency");
    });

    it("should handle gateway connection failure", async () => {
      gateway.setShouldFail(true);
      const result = await processor.processPayment(25.99, "usd", {
        orderId: "order-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Gateway connection failed");
    });

    it("should convert dollars to cents", async () => {
      await processor.processPayment(25.99, "usd", { orderId: "order-1" });
      const intents = Array.from((gateway as any).intents.values());
      expect(intents[0].amount).toBe(2599);
    });

    it("should include metadata in payment intent", async () => {
      await processor.processPayment(25.99, "usd", {
        orderId: "order-1",
        customerId: "cust-1",
      });

      const intents = Array.from((gateway as any).intents.values());
      expect(intents[0].metadata.orderId).toBe("order-1");
      expect(intents[0].metadata.customerId).toBe("cust-1");
    });
  });

  describe("Refund Processing", () => {
    it("should process full refund", async () => {
      await processor.processPayment(25.99, "usd", { orderId: "order-1" });
      const intents = Array.from((gateway as any).intents.values());

      const result = await processor.refundPayment(intents[0].id);
      expect(result.success).toBe(true);
      expect(result.refundId).toBeDefined();
      expect(result.amount).toBe(25.99);
    });

    it("should process partial refund", async () => {
      await processor.processPayment(50, "usd", { orderId: "order-1" });
      const intents = Array.from((gateway as any).intents.values());

      const result = await processor.refundPayment(intents[0].id, 2000);
      expect(result.success).toBe(true);
      expect(result.amount).toBe(20);
    });

    it("should handle refund for non-existent payment", async () => {
      const result = await processor.refundPayment("pi_nonexistent");
      expect(result.success).toBe(false);
    });

    it("should handle gateway failure during refund", async () => {
      await processor.processPayment(25.99, "usd", { orderId: "order-1" });
      const intents = Array.from((gateway as any).intents.values());
      gateway.setShouldFail(true);

      const result = await processor.refundPayment(intents[0].id);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Refund failed");
    });
  });

  describe("Webhook Signature Validation", () => {
    it("should validate correct signature", () => {
      const valid = validateWebhookSignature(
        "test-payload",
        "hmac_sha256=test-secret",
        "test-secret"
      );
      expect(valid).toBe(true);
    });

    it("should reject incorrect signature", () => {
      const valid = validateWebhookSignature(
        "test-payload",
        "hmac_sha256=wrong-secret",
        "test-secret"
      );
      expect(valid).toBe(false);
    });

    it("should reject empty payload", () => {
      const valid = validateWebhookSignature("", "sig", "secret");
      expect(valid).toBe(false);
    });

    it("should reject empty signature", () => {
      const valid = validateWebhookSignature("payload", "", "secret");
      expect(valid).toBe(false);
    });

    it("should reject empty secret", () => {
      const valid = validateWebhookSignature("payload", "sig", "");
      expect(valid).toBe(false);
    });
  });

  describe("Webhook Event Parsing", () => {
    it("should parse valid webhook event", () => {
      const payload = JSON.stringify({
        id: "evt_123",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_123", amount: 2599 } },
        created: 1704067200,
      });

      const event = parseWebhookEvent(payload);
      expect(event).not.toBeNull();
      expect(event!.type).toBe("payment_intent.succeeded");
      expect(event!.created).toBeInstanceOf(Date);
    });

    it("should return null for invalid JSON", () => {
      const event = parseWebhookEvent("not-json");
      expect(event).toBeNull();
    });

    it("should return null for missing fields", () => {
      const event = parseWebhookEvent(JSON.stringify({ id: "123" }));
      expect(event).toBeNull();
    });

    it("should return null for empty string", () => {
      const event = parseWebhookEvent("");
      expect(event).toBeNull();
    });
  });

  describe("Currency Handling", () => {
    it("should support USD", async () => {
      const result = await processor.processPayment(10, "usd", {});
      expect(result.success).toBe(true);
    });

    it("should support EUR", async () => {
      const result = await processor.processPayment(10, "eur", {});
      expect(result.success).toBe(true);
    });

    it("should convert currency to lowercase", async () => {
      await processor.processPayment(10, "USD", {});
      const intents = Array.from((gateway as any).intents.values());
      expect(intents[0].currency).toBe("usd");
    });
  });

  describe("Payment Status Tracking", () => {
    it("should track payment as succeeded after confirmation", async () => {
      await processor.processPayment(25.99, "usd", { orderId: "order-1" });
      const intents = Array.from((gateway as any).intents.values());
      expect(intents[0].status).toBe("succeeded");
    });

    it("should track payment intent through states", async () => {
      await processor.processPayment(25.99, "usd", { orderId: "order-1" });
      const intents = Array.from((gateway as any).intents.values());
      expect(intents[0].status).toBe("succeeded");
      expect(intents[0].clientSecret).toBeDefined();
    });
  });
});
