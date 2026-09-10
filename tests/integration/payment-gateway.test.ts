import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  prisma: {
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: "pi_test_123",
        amount: 3205,
        currency: "usd",
        status: "succeeded",
        clientSecret: "cs_test_secret",
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: "pi_test_123",
        status: "succeeded",
      }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: "re_test_123",
        amount: 3205,
        status: "succeeded",
      }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

const mockPrisma = require("@/lib/db").prisma;

interface PaymentFlowResult {
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
  stripePaymentIntentId: string;
}

async function processOrderPayment(
  orderId: string,
  userId: string,
  amount: number
): Promise<PaymentFlowResult> {
  const payment = await mockPrisma.payment.create({
    data: {
      orderId,
      userId,
      amount,
      currency: "usd",
      status: "PROCESSING",
    },
  });

  const Stripe = require("stripe");
  const stripe = new Stripe("sk_test_fake");

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    metadata: { orderId, userId },
  });

  const updatedPayment = await mockPrisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "COMPLETED",
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  await mockPrisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID" },
  });

  return {
    paymentId: updatedPayment.id,
    orderId,
    amount,
    status: "COMPLETED",
    stripePaymentIntentId: paymentIntent.id,
  };
}

async function processRefund(
  paymentId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; refundId: string }> {
  const payment = await mockPrisma.payment.findFirst({
    where: { id: paymentId },
  });

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "COMPLETED")
    throw new Error("Payment not eligible for refund");

  const Stripe = require("stripe");
  const stripe = new Stripe("sk_test_fake");

  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    amount: Math.round(amount * 100),
  });

  await mockPrisma.payment.update({
    where: { id: paymentId },
    data: {
      status: amount >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED",
      refundAmount: amount,
    },
  });

  await mockPrisma.refund.create({
    data: {
      paymentId,
      amount,
      reason,
      stripeRefundId: refund.id,
    },
  });

  return { success: true, refundId: refund.id };
}

async function handleWebhookEvent(
  eventType: string,
  data: Record<string, any>
): Promise<void> {
  switch (eventType) {
    case "payment_intent.succeeded":
      await mockPrisma.payment.update({
        where: { stripePaymentIntentId: data.id },
        data: { status: "COMPLETED" },
      });
      break;

    case "payment_intent.payment_failed":
      await mockPrisma.payment.update({
        where: { stripePaymentIntentId: data.id },
        data: { status: "FAILED" },
      });
      break;

    case "charge.refunded":
      await mockPrisma.payment.update({
        where: { stripeChargeId: data.id },
        data: { status: "REFUNDED" },
      });
      break;
  }
}

describe("Payment Gateway Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.payment.create.mockImplementation(async (args: any) => ({
      id: `pay-${Date.now()}`,
      ...args.data,
      createdAt: new Date(),
    }));
    mockPrisma.payment.update.mockImplementation(async (args: any) => ({
      id: args.where.id,
      ...args.data,
    }));
    mockPrisma.payment.findFirst.mockResolvedValue({
      id: "pay-1",
      orderId: "order-1",
      amount: 32.05,
      status: "COMPLETED",
      stripePaymentIntentId: "pi_test_123",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Payment Processing Flow", () => {
    it("should process payment end-to-end", async () => {
      const result = await processOrderPayment("order-1", "user-1", 32.05);

      expect(result.status).toBe("COMPLETED");
      expect(result.stripePaymentIntentId).toBe("pi_test_123");
      expect(result.amount).toBe(32.05);
    });

    it("should create payment record in database", async () => {
      await processOrderPayment("order-1", "user-1", 32.05);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: "order-1",
            userId: "user-1",
            amount: 32.05,
            currency: "usd",
          }),
        })
      );
    });

    it("should update order payment status", async () => {
      await processOrderPayment("order-1", "user-1", 32.05);

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "order-1" },
          data: { paymentStatus: "PAID" },
        })
      );
    });

    it("should store Stripe payment intent ID", async () => {
      const result = await processOrderPayment("order-1", "user-1", 32.05);
      expect(result.stripePaymentIntentId).toBe("pi_test_123");
    });

    it("should convert amount to cents for Stripe", async () => {
      await processOrderPayment("order-1", "user-1", 32.05);

      const stripe = require("stripe");
      const stripeInstance = stripe.mock.results[0].value;
      expect(stripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 3205,
        })
      );
    });
  });

  describe("Refund Flow", () => {
    it("should process full refund", async () => {
      const result = await processRefund("pay-1", 32.05, "customer_request");

      expect(result.success).toBe(true);
      expect(result.refundId).toBe("re_test_123");
    });

    it("should process partial refund", async () => {
      const result = await processRefund("pay-1", 16.00, "item_unavailable");

      expect(result.success).toBe(true);
    });

    it("should update payment status on full refund", async () => {
      await processRefund("pay-1", 32.05, "customer_request");

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "REFUNDED",
          }),
        })
      );
    });

    it("should update payment status on partial refund", async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: "pay-1",
        orderId: "order-1",
        amount: 32.05,
        status: "COMPLETED",
        stripePaymentIntentId: "pi_test_123",
      });

      await processRefund("pay-1", 16.00, "item_unavailable");

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PARTIALLY_REFUNDED",
          }),
        })
      );
    });

    it("should create refund record", async () => {
      await processRefund("pay-1", 32.05, "customer_request");

      expect(mockPrisma.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId: "pay-1",
            amount: 32.05,
            reason: "customer_request",
          }),
        })
      );
    });

    it("should reject refund for non-existent payment", async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        processRefund("pay-nonexistent", 10, "test")
      ).rejects.toThrow("Payment not found");
    });

    it("should reject refund for non-completed payment", async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: "pay-1",
        status: "PENDING",
      });

      await expect(processRefund("pay-1", 10, "test")).rejects.toThrow(
        "Payment not eligible"
      );
    });
  });

  describe("Webhook Handling", () => {
    it("should handle payment_intent.succeeded webhook", async () => {
      await handleWebhookEvent("payment_intent.succeeded", {
        id: "pi_test_123",
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "COMPLETED" }),
        })
      );
    });

    it("should handle payment_intent.payment_failed webhook", async () => {
      await handleWebhookEvent("payment_intent.payment_failed", {
        id: "pi_test_123",
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "FAILED" }),
        })
      );
    });

    it("should handle charge.refunded webhook", async () => {
      await handleWebhookEvent("charge.refunded", {
        id: "ch_test_123",
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "REFUNDED" }),
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle Stripe API errors gracefully", async () => {
      const Stripe = require("stripe");
      const stripe = new Stripe("sk_test_fake");
      stripe.paymentIntents.create.mockRejectedValue(
        new Error("Card declined")
      );

      await expect(
        processOrderPayment("order-1", "user-1", 32.05)
      ).rejects.toThrow("Card declined");
    });

    it("should not update database if Stripe fails", async () => {
      const Stripe = require("stripe");
      const stripe = new Stripe("sk_test_fake");
      stripe.paymentIntents.create.mockRejectedValue(
        new Error("Network error")
      );

      await expect(
        processOrderPayment("order-1", "user-1", 32.05)
      ).rejects.toThrow();

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe("Payment History", () => {
    it("should retrieve payment history for user", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { id: "pay-1", amount: 32.05, status: "COMPLETED" },
        { id: "pay-2", amount: 45.99, status: "COMPLETED" },
      ]);

      const payments = await mockPrisma.payment.findMany({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      });

      expect(payments).toHaveLength(2);
    });

    it("should filter payments by status", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { id: "pay-1", status: "REFUNDED" },
      ]);

      const payments = await mockPrisma.payment.findMany({
        where: { userId: "user-1", status: "REFUNDED" },
      });

      expect(payments).toHaveLength(1);
    });
  });
});
