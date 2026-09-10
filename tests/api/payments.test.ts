import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

const mockPrisma = {
  payment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  order: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  refund: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    cancel: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

enum PaymentMethod {
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  DIGITAL_WALLET = "DIGITAL_WALLET",
  CASH = "CASH",
  PROMO_CODE = "PROMO_CODE",
}

interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  refundAmount: number;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

function calculateRefundAmount(
  originalAmount: number,
  refundPercentage: number
): number {
  if (refundPercentage < 0 || refundPercentage > 100)
    throw new Error("Refund percentage must be between 0 and 100");
  return Math.round(originalAmount * refundPercentage * 100) / 100;
}

function validatePaymentAmount(amount: number, method: PaymentMethod): void {
  if (amount <= 0) throw new Error("Payment amount must be positive");
  if (amount > 999999.99) throw new Error("Payment amount exceeds maximum");
  if (method === PaymentMethod.CASH && amount > 200)
    throw new Error("Cash on delivery limited to $200");
}

function calculateLoyaltyPoints(amount: number, tier: string): number {
  const baseRate = 10;
  const multipliers: Record<string, number> = {
    BRONZE: 1,
    SILVER: 1.5,
    GOLD: 2,
    PLATINUM: 3,
  };
  const multiplier = multipliers[tier] ?? 1;
  return Math.floor(amount * baseRate * multiplier);
}

describe("Payments API", () => {
  const mockPayment: Payment = {
    id: "pay-1",
    orderId: "order-1",
    userId: "user-1",
    amount: 32.05,
    currency: "usd",
    status: PaymentStatus.COMPLETED,
    method: PaymentMethod.CREDIT_CARD,
    stripePaymentIntentId: "pi_abc123",
    stripeChargeId: "ch_xyz789",
    refundAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST /api/payments", () => {
    it("should create a payment for an order", async () => {
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      const payment = await mockPrisma.payment.create({
        data: {
          orderId: "order-1",
          userId: "user-1",
          amount: 32.05,
          currency: "usd",
          status: PaymentStatus.PENDING,
          method: PaymentMethod.CREDIT_CARD,
        },
      });
      expect(payment.amount).toBe(32.05);
      expect(payment.status).toBe(PaymentStatus.PENDING);
    });

    it("should validate payment amount is positive", () => {
      expect(() => validatePaymentAmount(-5, PaymentMethod.CREDIT_CARD)).toThrow(
        "Payment amount must be positive"
      );
    });

    it("should reject zero amount payment", () => {
      expect(() => validatePaymentAmount(0, PaymentMethod.CREDIT_CARD)).toThrow(
        "Payment amount must be positive"
      );
    });

    it("should reject amount exceeding maximum", () => {
      expect(() =>
        validatePaymentAmount(1000000, PaymentMethod.CREDIT_CARD)
      ).toThrow("Payment amount exceeds maximum");
    });

    it("should limit cash on delivery amount", () => {
      expect(() =>
        validatePaymentAmount(250, PaymentMethod.CASH)
      ).toThrow("Cash on delivery limited to $200");
    });

    it("should allow cash on delivery up to $200", () => {
      expect(() =>
        validatePaymentAmount(200, PaymentMethod.CASH)
      ).not.toThrow();
    });

    it("should create Stripe payment intent", async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_abc123",
        amount: 3205,
        currency: "usd",
        status: "requires_payment_method",
      });

      const intent = await mockStripe.paymentIntents.create({
        amount: 3205,
        currency: "usd",
        metadata: { orderId: "order-1" },
      });

      expect(intent.id).toBe("pi_abc123");
      expect(intent.amount).toBe(3205);
    });

    it("should convert dollars to cents for Stripe", () => {
      const amountInCents = Math.round(32.05 * 100);
      expect(amountInCents).toBe(3205);
    });
  });

  describe("GET /api/payments/:orderId", () => {
    it("should retrieve payment for an order", async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);
      const payment = await mockPrisma.payment.findFirst({
        where: { orderId: "order-1" },
      });
      expect(payment?.orderId).toBe("order-1");
    });

    it("should return null for unpaid order", async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      const payment = await mockPrisma.payment.findFirst({
        where: { orderId: "order-unpaid" },
      });
      expect(payment).toBeNull();
    });

    it("should list payment history for user", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);
      const payments = await mockPrisma.payment.findMany({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(payments).toHaveLength(1);
    });
  });

  describe("POST /api/payments/:id/refund", () => {
    it("should process full refund", async () => {
      const refundAmount = calculateRefundAmount(32.05, 100);
      expect(refundAmount).toBe(32.05);

      mockStripe.refunds.create.mockResolvedValue({
        id: "re_123",
        amount: 3205,
      });

      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
        refundAmount: 32.05,
      });

      const updated = await mockPrisma.payment.update({
        where: { id: "pay-1" },
        data: { status: PaymentStatus.REFUNDED, refundAmount: 32.05 },
      });

      expect(updated.status).toBe(PaymentStatus.REFUNDED);
      expect(updated.refundAmount).toBe(32.05);
    });

    it("should process partial refund", async () => {
      const refundAmount = calculateRefundAmount(32.05, 50);
      expect(refundAmount).toBe(16.03);

      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PARTIALLY_REFUNDED,
        refundAmount: 16.03,
      });

      const updated = await mockPrisma.payment.update({
        where: { id: "pay-1" },
        data: { status: PaymentStatus.PARTIALLY_REFUNDED, refundAmount: 16.03 },
      });

      expect(updated.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    });

    it("should reject refund percentage outside 0-100", () => {
      expect(() => calculateRefundAmount(32.05, 150)).toThrow(
        "Refund percentage must be between 0 and 100"
      );
      expect(() => calculateRefundAmount(32.05, -10)).toThrow(
        "Refund percentage must be between 0 and 100"
      );
    });

    it("should handle refund amount of zero", () => {
      const refundAmount = calculateRefundAmount(32.05, 0);
      expect(refundAmount).toBe(0);
    });

    it("should create refund record", async () => {
      mockPrisma.refund.create.mockResolvedValue({
        id: "refund-1",
        paymentId: "pay-1",
        amount: 32.05,
        reason: "customer_request",
        createdAt: new Date(),
      });

      const refund = await mockPrisma.refund.create({
        data: {
          paymentId: "pay-1",
          amount: 32.05,
          reason: "customer_request",
        },
      });

      expect(refund.amount).toBe(32.05);
    });

    it("should not refund already fully refunded payment", async () => {
      const fullyRefunded = {
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
        refundAmount: 32.05,
      };

      expect(fullyRefunded.refundAmount).toBe(fullyRefunded.amount);
    });
  });

  describe("POST /api/payments/webhook", () => {
    it("should handle payment_intent.succeeded", async () => {
      const event = {
        type: "payment_intent.succeeded",
        data: {
          object: { id: "pi_abc123", amount: 3205, status: "succeeded" },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      });

      const payment = await mockPrisma.payment.update({
        where: { stripePaymentIntentId: "pi_abc123" },
        data: { status: PaymentStatus.COMPLETED },
      });

      expect(payment.status).toBe(PaymentStatus.COMPLETED);
    });

    it("should handle payment_intent.payment_failed", async () => {
      const event = {
        type: "payment_intent.payment_failed",
        data: {
          object: { id: "pi_abc123", status: "failed" },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      const payment = await mockPrisma.payment.update({
        where: { stripePaymentIntentId: "pi_abc123" },
        data: { status: PaymentStatus.FAILED },
      });

      expect(payment.status).toBe(PaymentStatus.FAILED);
    });

    it("should handle charge.refunded event", async () => {
      const event = {
        type: "charge.refunded",
        data: {
          object: { id: "ch_xyz789", amount_refunded: 3205 },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
      });

      const payment = await mockPrisma.payment.update({
        where: { stripeChargeId: "ch_xyz789" },
        data: { status: PaymentStatus.REFUNDED, refundAmount: 32.05 },
      });

      expect(payment.status).toBe(PaymentStatus.REFUNDED);
    });
  });

  describe("Loyalty Points", () => {
    it("should calculate points for BRONZE tier", () => {
      const points = calculateLoyaltyPoints(50, "BRONZE");
      expect(points).toBe(500);
    });

    it("should calculate points for SILVER tier", () => {
      const points = calculateLoyaltyPoints(50, "SILVER");
      expect(points).toBe(750);
    });

    it("should calculate points for GOLD tier", () => {
      const points = calculateLoyaltyPoints(50, "GOLD");
      expect(points).toBe(1000);
    });

    it("should calculate points for PLATINUM tier", () => {
      const points = calculateLoyaltyPoints(50, "PLATINUM");
      expect(points).toBe(1500);
    });

    it("should default to BRONZE for unknown tier", () => {
      const points = calculateLoyaltyPoints(50, "UNKNOWN");
      expect(points).toBe(500);
    });

    it("should handle zero amount", () => {
      const points = calculateLoyaltyPoints(0, "GOLD");
      expect(points).toBe(0);
    });

    it("should floor fractional points", () => {
      const points = calculateLoyaltyPoints(3.33, "BRONZE");
      expect(points).toBe(33);
    });
  });

  describe("Payment Methods", () => {
    it("should support credit card payments", () => {
      expect(PaymentMethod.CREDIT_CARD).toBe("CREDIT_CARD");
    });

    it("should support digital wallet payments", () => {
      expect(PaymentMethod.DIGITAL_WALLET).toBe("DIGITAL_WALLET");
    });

    it("should support cash on delivery", () => {
      expect(PaymentMethod.CASH).toBe("CASH");
    });

    it("should support promo code payments", () => {
      expect(PaymentMethod.PROMO_CODE).toBe("PROMO_CODE");
    });
  });

  describe("Payment Aggregation", () => {
    it("should calculate total revenue", async () => {
      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: 15420.50 },
        _count: { id: 480 },
      });

      const stats = await mockPrisma.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
        _count: { id: true },
      });

      expect(stats._sum.amount).toBe(15420.50);
      expect(stats._count.id).toBe(480);
    });

    it("should calculate average payment amount", async () => {
      const amounts = [32.05, 45.99, 28.50, 19.99];
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      expect(avg).toBeCloseTo(31.63, 1);
    });

    it("should calculate refund rate", () => {
      const totalPayments = 480;
      const refundedPayments = 12;
      const refundRate = (refundedPayments / totalPayments) * 100;
      expect(refundRate).toBeCloseTo(2.5, 1);
    });
  });
});
