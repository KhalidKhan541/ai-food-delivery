import { describe, it, expect } from "@jest/globals";

interface PriceCalculation {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  discount: number;
  total: number;
}

interface PromoCode {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
}

const TAX_RATE = 0.08;
const FREE_DELIVERY_THRESHOLD = 25;
const DELIVERY_FEE = 3.99;
const MAX_DISCOUNT_PERCENT = 50;
const MAX_DISCOUNT_AMOUNT = 20;
const MIN_ORDER_FOR_PROMO = 10;

function calculatePrice(
  items: { price: number; quantity: number }[],
  options: {
    tip?: number;
    promoCode?: PromoCode;
    isPickup?: boolean;
  } = {}
): PriceCalculation {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;

  const deliveryFee =
    options.isPickup || subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_FEE;

  const tip = options.tip ?? 0;

  let discount = 0;
  if (options.promoCode && options.promoCode.isActive) {
    const now = new Date();
    if (
      now >= options.promoCode.validFrom &&
      now <= options.promoCode.validUntil &&
      subtotal >= options.promoCode.minOrderAmount &&
      options.promoCode.usageCount < options.promoCode.usageLimit
    ) {
      if (options.promoCode.type === "percentage") {
        discount = Math.round(subtotal * (options.promoCode.value / 100) * 100) / 100;
        discount = Math.min(discount, options.promoCode.maxDiscount);
        discount = Math.min(discount, MAX_DISCOUNT_AMOUNT);
      } else {
        discount = Math.min(options.promoCode.value, subtotal);
      }
    }
  }

  const total = Math.round(
    Math.max(0, subtotal + tax + deliveryFee + tip - discount) * 100
  ) / 100;

  return { subtotal, tax, deliveryFee, tip, discount, total };
}

function calculateTip(
  subtotal: number,
  percentage: number
): number {
  if (percentage < 0 || percentage > 100)
    throw new Error("Tip percentage must be between 0 and 100");
  return Math.round(subtotal * (percentage / 100) * 100) / 100;
}

function calculateServiceFee(subtotal: number): number {
  const rate = 0.05;
  const minFee = 1.00;
  const maxFee = 5.00;
  const fee = Math.round(subtotal * rate * 100) / 100;
  return Math.min(Math.max(fee, minFee), maxFee);
}

function validatePromoCode(
  code: PromoCode,
  subtotal: number,
  usageCount: number
): { valid: boolean; reason?: string } {
  if (!code.isActive) return { valid: false, reason: "Promo code is inactive" };

  const now = new Date();
  if (now < code.validFrom)
    return { valid: false, reason: "Promo code not yet valid" };
  if (now > code.validUntil)
    return { valid: false, reason: "Promo code has expired" };

  if (subtotal < code.minOrderAmount)
    return {
      valid: false,
      reason: `Minimum order amount is $${code.minOrderAmount}`,
    };

  if (usageCount >= code.usageLimit)
    return { valid: false, reason: "Promo code usage limit reached" };

  return { valid: true };
}

describe("Pricing Engine", () => {
  describe("Basic Price Calculation", () => {
    it("should calculate subtotal correctly", () => {
      const result = calculatePrice([
        { price: 12.99, quantity: 2 },
        { price: 8.99, quantity: 1 },
      ]);
      expect(result.subtotal).toBe(34.97);
    });

    it("should apply 8% tax", () => {
      const result = calculatePrice([{ price: 100, quantity: 1 }]);
      expect(result.tax).toBe(8.00);
    });

    it("should round tax to 2 decimals", () => {
      const result = calculatePrice([{ price: 9.99, quantity: 1 }]);
      expect(result.tax).toBe(0.8);
    });

    it("should add delivery fee for small orders", () => {
      const result = calculatePrice([{ price: 15, quantity: 1 }]);
      expect(result.deliveryFee).toBe(DELIVERY_FEE);
    });

    it("should offer free delivery above threshold", () => {
      const result = calculatePrice([{ price: 30, quantity: 1 }]);
      expect(result.deliveryFee).toBe(0);
    });

    it("should offer free delivery exactly at threshold", () => {
      const result = calculatePrice([{ price: 25, quantity: 1 }]);
      expect(result.deliveryFee).toBe(0);
    });

    it("should calculate total correctly", () => {
      const result = calculatePrice([
        { price: 12.99, quantity: 2 },
      ]);
      const expected = Math.round((25.98 + 2.08 + 0) * 100) / 100;
      expect(result.total).toBe(expected);
    });
  });

  describe("Pickup Orders", () => {
    it("should waive delivery fee for pickup", () => {
      const result = calculatePrice([{ price: 15, quantity: 1 }], {
        isPickup: true,
      });
      expect(result.deliveryFee).toBe(0);
    });

    it("should still apply tax for pickup", () => {
      const result = calculatePrice([{ price: 15, quantity: 1 }], {
        isPickup: true,
      });
      expect(result.tax).toBe(1.2);
    });
  });

  describe("Tip Calculation", () => {
    it("should calculate 15% tip", () => {
      const tip = calculateTip(50, 15);
      expect(tip).toBe(7.50);
    });

    it("should calculate 20% tip", () => {
      const tip = calculateTip(50, 20);
      expect(tip).toBe(10.00);
    });

    it("should round tip to 2 decimals", () => {
      const tip = calculateTip(33.33, 18);
      expect(tip).toBe(6.0);
    });

    it("should handle 0% tip", () => {
      const tip = calculateTip(50, 0);
      expect(tip).toBe(0);
    });

    it("should reject negative tip percentage", () => {
      expect(() => calculateTip(50, -5)).toThrow(
        "Tip percentage must be between 0 and 100"
      );
    });

    it("should reject tip percentage over 100", () => {
      expect(() => calculateTip(50, 150)).toThrow(
        "Tip percentage must be between 0 and 100"
      );
    });

    it("should include tip in total", () => {
      const result = calculatePrice([{ price: 25, quantity: 1 }], { tip: 5 });
      expect(result.tip).toBe(5);
      expect(result.total).toBeGreaterThan(25 + 2);
    });
  });

  describe("Service Fee", () => {
    it("should calculate 5% service fee", () => {
      const fee = calculateServiceFee(100);
      expect(fee).toBe(5.00);
    });

    it("should enforce minimum fee of $1", () => {
      const fee = calculateServiceFee(5);
      expect(fee).toBe(1.00);
    });

    it("should enforce maximum fee of $5", () => {
      const fee = calculateServiceFee(200);
      expect(fee).toBe(5.00);
    });

    it("should calculate correctly for average order", () => {
      const fee = calculateServiceFee(35);
      expect(fee).toBe(1.75);
    });
  });

  describe("Promo Code Validation", () => {
    const validPromo: PromoCode = {
      code: "SAVE20",
      type: "percentage",
      value: 20,
      minOrderAmount: 15,
      maxDiscount: 10,
      validFrom: new Date("2024-01-01"),
      validUntil: new Date("2025-12-31"),
      usageLimit: 100,
      usageCount: 0,
      isActive: true,
    };

    it("should validate active promo code", () => {
      const result = validatePromoCode(validPromo, 30, 0);
      expect(result.valid).toBe(true);
    });

    it("should reject inactive promo code", () => {
      const result = validatePromoCode(
        { ...validPromo, isActive: false },
        30,
        0
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Promo code is inactive");
    });

    it("should reject expired promo code", () => {
      const expired = {
        ...validPromo,
        validUntil: new Date("2023-01-01"),
      };
      const result = validatePromoCode(expired, 30, 0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Promo code has expired");
    });

    it("should reject promo below minimum order", () => {
      const result = validatePromoCode(validPromo, 10, 0);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Minimum order amount");
    });

    it("should reject promo at usage limit", () => {
      const result = validatePromoCode(validPromo, 30, 100);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("usage limit reached");
    });
  });

  describe("Promo Code Application", () => {
    it("should apply percentage discount", () => {
      const promo: PromoCode = {
        code: "SAVE20",
        type: "percentage",
        value: 20,
        minOrderAmount: 10,
        maxDiscount: 10,
        validFrom: new Date("2024-01-01"),
        validUntil: new Date("2025-12-31"),
        usageLimit: 100,
        usageCount: 0,
        isActive: true,
      };

      const result = calculatePrice([{ price: 50, quantity: 1 }], {
        promoCode: promo,
      });
      expect(result.discount).toBe(10);
    });

    it("should apply fixed discount", () => {
      const promo: PromoCode = {
        code: "FLAT5",
        type: "fixed",
        value: 5,
        minOrderAmount: 10,
        maxDiscount: 5,
        validFrom: new Date("2024-01-01"),
        validUntil: new Date("2025-12-31"),
        usageLimit: 100,
        usageCount: 0,
        isActive: true,
      };

      const result = calculatePrice([{ price: 30, quantity: 1 }], {
        promoCode: promo,
      });
      expect(result.discount).toBe(5);
    });

    it("should cap discount at max discount amount", () => {
      const promo: PromoCode = {
        code: "BIG50",
        type: "percentage",
        value: 50,
        minOrderAmount: 10,
        maxDiscount: 10,
        validFrom: new Date("2024-01-01"),
        validUntil: new Date("2025-12-31"),
        usageLimit: 100,
        usageCount: 0,
        isActive: true,
      };

      const result = calculatePrice([{ price: 100, quantity: 1 }], {
        promoCode: promo,
      });
      expect(result.discount).toBe(10);
    });

    it("should not exceed subtotal with discount", () => {
      const promo: PromoCode = {
        code: "HUGE",
        type: "fixed",
        value: 100,
        minOrderAmount: 10,
        maxDiscount: 100,
        validFrom: new Date("2024-01-01"),
        validUntil: new Date("2025-12-31"),
        usageLimit: 100,
        usageCount: 0,
        isActive: true,
      };

      const result = calculatePrice([{ price: 20, quantity: 1 }], {
        promoCode: promo,
      });
      expect(result.discount).toBe(20);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("should not apply discount without promo code", () => {
      const result = calculatePrice([{ price: 50, quantity: 1 }]);
      expect(result.discount).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty items array", () => {
      const result = calculatePrice([]);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it("should handle large quantity orders", () => {
      const result = calculatePrice([{ price: 5, quantity: 1000 }]);
      expect(result.subtotal).toBe(5000);
    });

    it("should handle items with zero price", () => {
      const result = calculatePrice([{ price: 0, quantity: 5 }]);
      expect(result.subtotal).toBe(0);
    });

    it("should never return negative total", () => {
      const promo: PromoCode = {
        code: "FREE",
        type: "fixed",
        value: 999,
        minOrderAmount: 0,
        maxDiscount: 999,
        validFrom: new Date("2024-01-01"),
        validUntil: new Date("2025-12-31"),
        usageLimit: 100,
        usageCount: 0,
        isActive: true,
      };

      const result = calculatePrice([{ price: 10, quantity: 1 }], {
        promoCode: promo,
      });
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });
});
