import { describe, it, expect, beforeEach } from "@jest/globals";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  minimumStock: number;
  maximumStock: number;
  costPerUnit: number;
  lastRestockedAt?: Date;
  expiresAt?: Date;
}

interface StockMovement {
  id: string;
  inventoryId: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "WASTE" | "TRANSFER";
  quantity: number;
  referenceId?: string;
  notes: string;
  createdAt: Date;
}

function checkStockLevel(
  quantity: number,
  minimum: number,
  maximum: number
): "CRITICAL" | "LOW" | "ADEQUATE" | "OVERSTOCKED" {
  if (quantity <= 0) return "CRITICAL";
  if (quantity <= minimum * 0.5) return "CRITICAL";
  if (quantity <= minimum) return "LOW";
  if (quantity >= maximum) return "OVERSTOCKED";
  return "ADEQUATE";
}

function calculateReorderPoint(
  averageDailyUsage: number,
  leadTimeDays: number,
  safetyStock: number
): number {
  return Math.ceil(averageDailyUsage * leadTimeDays + safetyStock);
}

function calculateEOQ(
  annualDemand: number,
  orderCost: number,
  holdingCostPerUnit: number
): number {
  if (holdingCostPerUnit <= 0) throw new Error("Holding cost must be positive");
  return Math.round(
    Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit)
  );
}

function calculateFIFO(
  batches: { quantity: number; costPerUnit: number; receivedAt: Date }[],
  consumption: number
): { totalCost: number; remaining: typeof batches } {
  let remainingConsumption = consumption;
  let totalCost = 0;
  const remaining = [...batches];

  for (let i = 0; i < remaining.length && remainingConsumption > 0; i++) {
    const batch = remaining[i];
    const consumeFromBatch = Math.min(batch.quantity, remainingConsumption);
    totalCost += consumeFromBatch * batch.costPerUnit;
    remainingConsumption -= consumeFromBatch;
    remaining[i] = { ...batch, quantity: batch.quantity - consumeFromBatch };
  }

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    remaining: remaining.filter((b) => b.quantity > 0),
  };
}

function calculateWasteRate(
  wasteQuantity: number,
  totalReceived: number
): number {
  if (totalReceived === 0) return 0;
  return Math.round((wasteQuantity / totalReceived) * 10000) / 100;
}

function calculateShrinkage(
  expectedQuantity: number,
  actualQuantity: number
): { quantity: number; percentage: number } {
  const quantity = Math.max(0, expectedQuantity - actualQuantity);
  const percentage =
    expectedQuantity > 0
      ? Math.round((quantity / expectedQuantity) * 10000) / 100
      : 0;
  return { quantity, percentage };
}

describe("Inventory Unit Tests", () => {
  describe("Stock Level Classification", () => {
    it("should classify as CRITICAL when quantity is 0", () => {
      expect(checkStockLevel(0, 10, 100)).toBe("CRITICAL");
    });

    it("should classify as CRITICAL when below half minimum", () => {
      expect(checkStockLevel(4, 10, 100)).toBe("CRITICAL");
    });

    it("should classify as LOW when at or below minimum", () => {
      expect(checkStockLevel(10, 10, 100)).toBe("LOW");
      expect(checkStockLevel(8, 10, 100)).toBe("LOW");
    });

    it("should classify as ADEQUATE when between min and max", () => {
      expect(checkStockLevel(50, 10, 100)).toBe("ADEQUATE");
    });

    it("should classify as OVERSTOCKED when at or above maximum", () => {
      expect(checkStockLevel(100, 10, 100)).toBe("OVERSTOCKED");
      expect(checkStockLevel(120, 10, 100)).toBe("OVERSTOCKED");
    });

    it("should handle edge case at exact minimum", () => {
      expect(checkStockLevel(5, 5, 100)).toBe("LOW");
    });

    it("should handle edge case just above minimum", () => {
      expect(checkStockLevel(6, 5, 100)).toBe("ADEQUATE");
    });
  });

  describe("Reorder Point Calculation", () => {
    it("should calculate basic reorder point", () => {
      const rop = calculateReorderPoint(20, 3, 10);
      expect(rop).toBe(70);
    });

    it("should handle same-day delivery", () => {
      const rop = calculateReorderPoint(20, 0, 10);
      expect(rop).toBe(10);
    });

    it("should handle zero safety stock", () => {
      const rop = calculateReorderPoint(20, 3, 0);
      expect(rop).toBe(60);
    });

    it("should round up to nearest integer", () => {
      const rop = calculateReorderPoint(7, 3, 2);
      expect(rop).toBe(23);
    });
  });

  describe("Economic Order Quantity", () => {
    it("should calculate EOQ correctly", () => {
      const eoq = calculateEOQ(1000, 50, 2);
      expect(eoq).toBe(224);
    });

    it("should handle high holding costs", () => {
      const eoq = calculateEOQ(1000, 50, 100);
      expect(eoq).toBe(32);
    });

    it("should handle low order costs", () => {
      const eoq = calculateEOQ(1000, 10, 2);
      expect(eoq).toBe(100);
    });

    it("should reject zero holding cost", () => {
      expect(() => calculateEOQ(1000, 50, 0)).toThrow(
        "Holding cost must be positive"
      );
    });
  });

  describe("FIFO Costing", () => {
    it("should consume from oldest batch first", () => {
      const batches = [
        { quantity: 10, costPerUnit: 5.0, receivedAt: new Date("2024-01-01") },
        { quantity: 10, costPerUnit: 6.0, receivedAt: new Date("2024-01-05") },
      ];

      const result = calculateFIFO(batches, 15);
      expect(result.totalCost).toBe(55);
      expect(result.remaining).toHaveLength(1);
      expect(result.remaining[0].quantity).toBe(5);
    });

    it("should handle consumption less than first batch", () => {
      const batches = [
        { quantity: 10, costPerUnit: 5.0, receivedAt: new Date("2024-01-01") },
      ];

      const result = calculateFIFO(batches, 5);
      expect(result.totalCost).toBe(25);
      expect(result.remaining).toHaveLength(1);
      expect(result.remaining[0].quantity).toBe(5);
    });

    it("should handle exact batch consumption", () => {
      const batches = [
        { quantity: 10, costPerUnit: 5.0, receivedAt: new Date("2024-01-01") },
      ];

      const result = calculateFIFO(batches, 10);
      expect(result.totalCost).toBe(50);
      expect(result.remaining).toHaveLength(0);
    });

    it("should handle zero consumption", () => {
      const batches = [
        { quantity: 10, costPerUnit: 5.0, receivedAt: new Date("2024-01-01") },
      ];

      const result = calculateFIFO(batches, 0);
      expect(result.totalCost).toBe(0);
      expect(result.remaining).toHaveLength(1);
    });

    it("should handle consumption exceeding all batches", () => {
      const batches = [
        { quantity: 5, costPerUnit: 5.0, receivedAt: new Date("2024-01-01") },
      ];

      const result = calculateFIFO(batches, 10);
      expect(result.totalCost).toBe(25);
      expect(result.remaining).toHaveLength(0);
    });
  });

  describe("Waste Rate", () => {
    it("should calculate waste rate correctly", () => {
      const rate = calculateWasteRate(5, 100);
      expect(rate).toBe(5);
    });

    it("should return 0 for no waste", () => {
      const rate = calculateWasteRate(0, 100);
      expect(rate).toBe(0);
    });

    it("should handle zero received", () => {
      const rate = calculateWasteRate(0, 0);
      expect(rate).toBe(0);
    });

    it("should round to 2 decimal places", () => {
      const rate = calculateWasteRate(1, 3);
      expect(rate).toBe(33.33);
    });
  });

  describe("Shrinkage Calculation", () => {
    it("should calculate shrinkage correctly", () => {
      const result = calculateShrinkage(100, 95);
      expect(result.quantity).toBe(5);
      expect(result.percentage).toBe(5);
    });

    it("should return 0 when no shrinkage", () => {
      const result = calculateShrinkage(100, 100);
      expect(result.quantity).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it("should handle 100% shrinkage", () => {
      const result = calculateShrinkage(100, 0);
      expect(result.quantity).toBe(100);
      expect(result.percentage).toBe(100);
    });

    it("should handle more stock than expected", () => {
      const result = calculateShrinkage(80, 100);
      expect(result.quantity).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it("should handle zero expected", () => {
      const result = calculateShrinkage(0, 0);
      expect(result.quantity).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  describe("Stock Movement Tracking", () => {
    it("should track incoming stock", () => {
      const movement: StockMovement = {
        id: "mov-1",
        inventoryId: "inv-1",
        type: "IN",
        quantity: 50,
        referenceId: "po-123",
        notes: "Restock from supplier",
        createdAt: new Date(),
      };

      expect(movement.type).toBe("IN");
      expect(movement.quantity).toBe(50);
    });

    it("should track outgoing stock", () => {
      const movement: StockMovement = {
        id: "mov-2",
        inventoryId: "inv-1",
        type: "OUT",
        quantity: -5,
        referenceId: "order-123",
        notes: "Used in order",
        createdAt: new Date(),
      };

      expect(movement.type).toBe("OUT");
      expect(movement.quantity).toBe(-5);
    });

    it("should track waste", () => {
      const movement: StockMovement = {
        id: "mov-3",
        inventoryId: "inv-1",
        type: "WASTE",
        quantity: -2,
        notes: "Expired product",
        createdAt: new Date(),
      };

      expect(movement.type).toBe("WASTE");
    });

    it("should track adjustments", () => {
      const movement: StockMovement = {
        id: "mov-4",
        inventoryId: "inv-1",
        type: "ADJUSTMENT",
        quantity: -1,
        notes: "Physical count correction",
        createdAt: new Date(),
      };

      expect(movement.type).toBe("ADJUSTMENT");
    });

    it("should track transfers between locations", () => {
      const movement: StockMovement = {
        id: "mov-5",
        inventoryId: "inv-1",
        type: "TRANSFER",
        quantity: -20,
        referenceId: "inv-2",
        notes: "Transfer to Kitchen B",
        createdAt: new Date(),
      };

      expect(movement.type).toBe("TRANSFER");
    });
  });

  describe("Expiry Management", () => {
    it("should identify items expiring within N days", () => {
      const items: InventoryItem[] = [
        {
          id: "1",
          name: "Cheese",
          sku: "CH-001",
          quantity: 10,
          unit: "kg",
          minimumStock: 5,
          maximumStock: 50,
          costPerUnit: 8,
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
        {
          id: "2",
          name: "Sauce",
          sku: "SA-001",
          quantity: 20,
          unit: "L",
          minimumStock: 5,
          maximumStock: 30,
          costPerUnit: 3,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ];

      const expiring = items.filter(
        (i) =>
          i.expiresAt &&
          i.expiresAt <=
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      expect(expiring).toHaveLength(1);
      expect(expiring[0].name).toBe("Cheese");
    });

    it("should calculate days until expiry", () => {
      const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const daysUntil = Math.ceil(
        (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      expect(daysUntil).toBe(5);
    });
  });
});
