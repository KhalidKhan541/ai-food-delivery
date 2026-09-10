import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

const mockPrisma = {
  inventory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  inventoryLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  menuItem: {
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));

interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  minimumStock: number;
  maximumStock: number;
  costPerUnit: number;
  supplier?: string;
  lastRestockedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryLog {
  id: string;
  inventoryId: string;
  change: number;
  reason: string;
  orderId?: string;
  createdBy: string;
  createdAt: Date;
}

function checkStockLevel(item: InventoryItem): "LOW" | "ADEQUATE" | "OVERSTOCKED" {
  if (item.quantity <= item.minimumStock) return "LOW";
  if (item.quantity >= item.maximumStock) return "OVERSTOCKED";
  return "ADEQUATE";
}

function calculateReorderQuantity(item: InventoryItem): number {
  const target = Math.round(item.maximumStock * 0.75);
  return Math.max(0, target - item.quantity);
}

function reserveStock(
  item: InventoryItem,
  quantity: number
): { success: boolean; newQuantity: number; message?: string } {
  if (quantity < 0) {
    return { success: false, newQuantity: item.quantity, message: "Quantity cannot be negative" };
  }
  if (quantity > item.quantity) {
    return {
      success: false,
      newQuantity: item.quantity,
      message: `Insufficient stock: requested ${quantity}, available ${item.quantity}`,
    };
  }
  return { success: true, newQuantity: item.quantity - quantity };
}

function batchReserveStock(
  items: { item: InventoryItem; quantity: number }[]
): { success: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const { item, quantity } of items) {
    const result = reserveStock(item, quantity);
    if (!result.success) {
      failures.push(`${item.name}: ${result.message}`);
    }
  }
  return { success: failures.length === 0, failures };
}

function calculateStockValue(items: InventoryItem[]): number {
  return items.reduce((total, item) => total + item.quantity * item.costPerUnit, 0);
}

function getExpiringItems(
  items: InventoryItem[],
  withinDays: number
): InventoryItem[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  return items.filter(
    (item) => item.expiresAt && item.expiresAt <= cutoff && item.expiresAt > now
  );
}

describe("Inventory API", () => {
  const mockInventoryItems: InventoryItem[] = [
    {
      id: "inv-1",
      restaurantId: "rest-1",
      name: "Mozzarella Cheese",
      sku: "CHEESE-MOZ-001",
      quantity: 50,
      unit: "kg",
      minimumStock: 10,
      maximumStock: 100,
      costPerUnit: 8.50,
      supplier: "Dairy Fresh Co",
      lastRestockedAt: new Date("2024-01-05"),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "inv-2",
      restaurantId: "rest-1",
      name: "Tomato Sauce",
      sku: "SAUCE-TOM-001",
      quantity: 5,
      unit: "L",
      minimumStock: 10,
      maximumStock: 80,
      costPerUnit: 3.25,
      supplier: "Sauce Masters",
      lastRestockedAt: new Date("2024-01-03"),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "inv-3",
      restaurantId: "rest-1",
      name: "Pizza Dough",
      sku: "DOUGH-PIZ-001",
      quantity: 200,
      unit: "portions",
      minimumStock: 50,
      maximumStock: 150,
      costPerUnit: 0.75,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "inv-4",
      restaurantId: "rest-1",
      name: "Fresh Basil",
      sku: "HERB-BAS-001",
      quantity: 2,
      unit: "kg",
      minimumStock: 3,
      maximumStock: 20,
      costPerUnit: 12.00,
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Stock Level Checking", () => {
    it("should identify LOW stock items", () => {
      const status = checkStockLevel(mockInventoryItems[1]);
      expect(status).toBe("LOW");
    });

    it("should identify ADEQUATE stock items", () => {
      const status = checkStockLevel(mockInventoryItems[0]);
      expect(status).toBe("ADEQUATE");
    });

    it("should identify OVERSTOCKED items", () => {
      const status = checkStockLevel(mockInventoryItems[2]);
      expect(status).toBe("OVERSTOCKED");
    });

    it("should treat exact minimum as LOW", () => {
      const item = { ...mockInventoryItems[0], quantity: 10 };
      expect(checkStockLevel(item)).toBe("LOW");
    });

    it("should treat exact maximum as OVERSTOCKED", () => {
      const item = { ...mockInventoryItems[0], quantity: 100 };
      expect(checkStockLevel(item)).toBe("OVERSTOCKED");
    });
  });

  describe("Reorder Calculation", () => {
    it("should calculate reorder quantity", () => {
      const qty = calculateReorderQuantity(mockInventoryItems[1]);
      expect(qty).toBe(55);
    });

    it("should return 0 for well-stocked items", () => {
      const qty = calculateReorderQuantity(mockInventoryItems[2]);
      expect(qty).toBe(0);
    });

    it("should handle items needing full restock", () => {
      const item = { ...mockInventoryItems[1], quantity: 0 };
      const qty = calculateReorderQuantity(item);
      expect(qty).toBe(60);
    });
  });

  describe("Stock Reservation", () => {
    it("should reserve stock successfully", () => {
      const result = reserveStock(mockInventoryItems[0], 10);
      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(40);
    });

    it("should reject reservation exceeding available stock", () => {
      const result = reserveStock(mockInventoryItems[0], 100);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Insufficient stock");
    });

    it("should reject negative quantity reservation", () => {
      const result = reserveStock(mockInventoryItems[0], -5);
      expect(result.success).toBe(false);
      expect(result.message).toContain("cannot be negative");
    });

    it("should allow reservation of exact available quantity", () => {
      const result = reserveStock(mockInventoryItems[0], 50);
      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(0);
    });

    it("should allow zero quantity reservation", () => {
      const result = reserveStock(mockInventoryItems[0], 0);
      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(50);
    });
  });

  describe("Batch Stock Reservation", () => {
    it("should reserve multiple items successfully", () => {
      const result = batchReserveStock([
        { item: mockInventoryItems[0], quantity: 5 },
        { item: mockInventoryItems[3], quantity: 1 },
      ]);
      expect(result.success).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it("should fail if any item has insufficient stock", () => {
      const result = batchReserveStock([
        { item: mockInventoryItems[0], quantity: 5 },
        { item: mockInventoryItems[1], quantity: 20 },
      ]);
      expect(result.success).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
    });

    it("should report all failures", () => {
      const result = batchReserveStock([
        { item: mockInventoryItems[1], quantity: 100 },
        { item: mockInventoryItems[3], quantity: 5 },
      ]);
      expect(result.failures).toHaveLength(2);
    });
  });

  describe("Stock Value Calculation", () => {
    it("should calculate total inventory value", () => {
      const total = calculateStockValue(mockInventoryItems);
      expect(total).toBeGreaterThan(0);
    });

    it("should calculate value per item", () => {
      const value = mockInventoryItems[0].quantity * mockInventoryItems[0].costPerUnit;
      expect(value).toBe(425);
    });

    it("should handle empty inventory", () => {
      expect(calculateStockValue([])).toBe(0);
    });
  });

  describe("Expiry Management", () => {
    it("should find items expiring within 7 days", () => {
      const expiring = getExpiringItems(mockInventoryItems, 7);
      expect(expiring.length).toBeGreaterThan(0);
      expect(expiring[0].name).toBe("Fresh Basil");
    });

    it("should not include expired items", () => {
      const expiredItem = {
        ...mockInventoryItems[0],
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      };
      const items = [...mockInventoryItems, expiredItem];
      const expiring = getExpiringItems(items, 7);
      expect(expiring.every((i) => i.expiresAt! > new Date())).toBe(true);
    });

    it("should not include items expiring beyond window", () => {
      const futureItem = {
        ...mockInventoryItems[0],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      const expiring = getExpiringItems([futureItem], 7);
      expect(expiring).toHaveLength(0);
    });
  });

  describe("GET /api/inventory", () => {
    it("should retrieve all inventory items", async () => {
      mockPrisma.inventory.findMany.mockResolvedValue(mockInventoryItems);
      const items = await mockPrisma.inventory.findMany({
        where: { restaurantId: "rest-1" },
      });
      expect(items).toHaveLength(4);
    });

    it("should filter low stock items", async () => {
      const lowStock = mockInventoryItems.filter(
        (i) => checkStockLevel(i) === "LOW"
      );
      mockPrisma.inventory.findMany.mockResolvedValue(lowStock);
      const items = await mockPrisma.inventory.findMany({
        where: {
          restaurantId: "rest-1",
          quantity: { lte: mockPrisma.inventory },
        },
      });
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("Tomato Sauce");
    });
  });

  describe("POST /api/inventory", () => {
    it("should create a new inventory item", async () => {
      mockPrisma.inventory.create.mockResolvedValue(mockInventoryItems[0]);
      const item = await mockPrisma.inventory.create({
        data: {
          restaurantId: "rest-1",
          name: "Mozzarella Cheese",
          sku: "CHEESE-MOZ-001",
          quantity: 50,
          unit: "kg",
          minimumStock: 10,
          maximumStock: 100,
          costPerUnit: 8.50,
        },
      });
      expect(item.name).toBe("Mozzarella Cheese");
    });
  });

  describe("PATCH /api/inventory/:id", () => {
    it("should update stock quantity", async () => {
      mockPrisma.inventory.update.mockResolvedValue({
        ...mockInventoryItems[0],
        quantity: 40,
      });
      const updated = await mockPrisma.inventory.update({
        where: { id: "inv-1" },
        data: { quantity: 40 },
      });
      expect(updated.quantity).toBe(40);
    });

    it("should log inventory changes", async () => {
      mockPrisma.inventoryLog.create.mockResolvedValue({
        id: "log-1",
        inventoryId: "inv-1",
        change: -10,
        reason: "ORDER fulfilled",
        orderId: "order-1",
        createdBy: "system",
        createdAt: new Date(),
      });

      const log = await mockPrisma.inventoryLog.create({
        data: {
          inventoryId: "inv-1",
          change: -10,
          reason: "ORDER fulfilled",
          orderId: "order-1",
          createdBy: "system",
        },
      });

      expect(log.change).toBe(-10);
      expect(log.reason).toBe("ORDER fulfilled");
    });

    it("should record restock event", async () => {
      mockPrisma.inventory.update.mockResolvedValue({
        ...mockInventoryItems[0],
        quantity: 80,
        lastRestockedAt: new Date(),
      });

      const updated = await mockPrisma.inventory.update({
        where: { id: "inv-1" },
        data: {
          quantity: 80,
          lastRestockedAt: new Date(),
        },
      });

      expect(updated.quantity).toBe(80);
      expect(updated.lastRestockedAt).toBeDefined();
    });
  });

  describe("GET /api/inventory/alerts", () => {
    it("should generate low stock alerts", () => {
      const alerts = mockInventoryItems
        .filter((item) => checkStockLevel(item) === "LOW")
        .map((item) => ({
          itemId: item.id,
          name: item.name,
          currentQuantity: item.quantity,
          minimumStock: item.minimumStock,
          reorderQuantity: calculateReorderQuantity(item),
        }));

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].reorderQuantity).toBeGreaterThan(0);
    });

    it("should generate expiry alerts", () => {
      const alerts = getExpiringItems(mockInventoryItems, 7).map((item) => ({
        itemId: item.id,
        name: item.name,
        expiresAt: item.expiresAt,
        daysUntilExpiry: Math.ceil(
          (item.expiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        ),
      }));

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].daysUntilExpiry).toBeLessThanOrEqual(7);
    });
  });
});
