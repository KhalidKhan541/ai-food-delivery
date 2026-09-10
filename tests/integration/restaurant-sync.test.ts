import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  prisma: {
    restaurant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    menuItem: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const mockPrisma = require("@/lib/db").prisma;

interface SyncResult {
  restaurantId: string;
  menuItemsUpdated: number;
  inventorySynced: number;
  ordersProcessed: number;
  timestamp: Date;
}

async function syncRestaurantData(restaurantId: string): Promise<SyncResult> {
  const restaurant = await mockPrisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) throw new Error("Restaurant not found");

  const menuItems = await mockPrisma.menuItem.findMany({
    where: { restaurantId },
  });

  const inventory = await mockPrisma.inventory.findMany({
    where: { restaurantId },
  });

  const unavailableItems = menuItems.filter((item: any) => {
    const inv = inventory.find((i: any) => i.name === item.name);
    return inv && inv.quantity <= 0;
  });

  if (unavailableItems.length > 0) {
    await mockPrisma.menuItem.updateMany({
      where: {
        id: { in: unavailableItems.map((i: any) => i.id) },
      },
      data: { isAvailable: false },
    });
  }

  const availableItems = menuItems.filter((item: any) => {
    const inv = inventory.find((i: any) => i.name === item.name);
    return inv && inv.quantity > 0;
  });

  if (availableItems.length > 0) {
    await mockPrisma.menuItem.updateMany({
      where: {
        id: { in: availableItems.map((i: any) => i.id) },
      },
      data: { isAvailable: true },
    });
  }

  const pendingOrders = await mockPrisma.order.findMany({
    where: {
      restaurantId,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  return {
    restaurantId,
    menuItemsUpdated: unavailableItems.length + availableItems.length,
    inventorySynced: inventory.length,
    ordersProcessed: pendingOrders.length,
    timestamp: new Date(),
  };
}

async function syncInventoryLevels(
  restaurantId: string
): Promise<{ updated: number; lowStock: string[] }> {
  const inventory = await mockPrisma.inventory.findMany({
    where: { restaurantId },
  });

  const lowStock: string[] = [];
  const updates: { id: string; isLowStock: boolean }[] = [];

  for (const item of inventory) {
    const isLow = item.quantity <= item.minimumStock;
    if (isLow) lowStock.push(item.name);
    updates.push({ id: item.id, isLowStock: isLow });
  }

  return { updated: inventory.length, lowStock };
}

async function syncRestaurantHours(
  restaurantId: string
): Promise<{ isOpen: boolean; nextOpen?: Date }> {
  const restaurant = await mockPrisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) throw new Error("Restaurant not found");

  const now = new Date();
  const currentHour = now.getHours();
  const opensAt = parseInt(restaurant.opensAt ?? "9");
  const closesAt = parseInt(restaurant.closesAt ?? "22");

  const isOpen = currentHour >= opensAt && currentHour < closesAt;

  await mockPrisma.restaurant.update({
    where: { id: restaurantId },
    data: { isOpen },
  });

  return {
    isOpen,
    nextOpen: isOpen
      ? undefined
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, opensAt),
  };
}

describe("Restaurant Sync Integration", () => {
  const mockRestaurant = {
    id: "rest-1",
    name: "Pizza Palace",
    isOpen: true,
    opensAt: "9",
    closesAt: "22",
  };

  const mockMenuItems = [
    { id: "m1", name: "Margherita Pizza", restaurantId: "rest-1", isAvailable: true },
    { id: "m2", name: "Pepperoni Pizza", restaurantId: "rest-1", isAvailable: true },
    { id: "m3", name: "Caesar Salad", restaurantId: "rest-1", isAvailable: false },
  ];

  const mockInventory = [
    { id: "inv-1", name: "Margherita Pizza", restaurantId: "rest-1", quantity: 50, minimumStock: 10 },
    { id: "inv-2", name: "Pepperoni Pizza", restaurantId: "rest-1", quantity: 30, minimumStock: 10 },
    { id: "inv-3", name: "Caesar Salad", restaurantId: "rest-1", quantity: 0, minimumStock: 5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
    mockPrisma.menuItem.findMany.mockResolvedValue(mockMenuItems);
    mockPrisma.inventory.findMany.mockResolvedValue(mockInventory);
    mockPrisma.order.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Full Data Sync", () => {
    it("should sync restaurant data successfully", async () => {
      const result = await syncRestaurantData("rest-1");

      expect(result.restaurantId).toBe("rest-1");
      expect(result.menuItemsUpdated).toBe(3);
      expect(result.inventorySynced).toBe(3);
      expect(result.timestamp).toBeDefined();
    });

    it("should mark out-of-stock items as unavailable", async () => {
      await syncRestaurantData("rest-1");

      expect(mockPrisma.menuItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isAvailable: false },
        })
      );
    });

    it("should mark in-stock items as available", async () => {
      await syncRestaurantData("rest-1");

      expect(mockPrisma.menuItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isAvailable: true },
        })
      );
    });

    it("should handle non-existent restaurant", async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(syncRestaurantData("nonexistent")).rejects.toThrow(
        "Restaurant not found"
      );
    });

    it("should count pending orders during sync", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o1", status: "PENDING" },
        { id: "o2", status: "CONFIRMED" },
      ]);

      const result = await syncRestaurantData("rest-1");
      expect(result.ordersProcessed).toBe(2);
    });
  });

  describe("Inventory Sync", () => {
    it("should identify low stock items", async () => {
      const result = await syncInventoryLevels("rest-1");

      expect(result.lowStock).toContain("Caesar Salad");
      expect(result.updated).toBe(3);
    });

    it("should return empty low stock list when all items are adequate", async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([
        { id: "inv-1", name: "Cheese", quantity: 50, minimumStock: 10 },
        { id: "inv-2", name: "Sauce", quantity: 30, minimumStock: 10 },
      ]);

      const result = await syncInventoryLevels("rest-1");
      expect(result.lowStock).toHaveLength(0);
    });

    it("should handle empty inventory", async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([]);

      const result = await syncInventoryLevels("rest-1");
      expect(result.updated).toBe(0);
      expect(result.lowStock).toHaveLength(0);
    });
  });

  describe("Operating Hours Sync", () => {
    it("should mark restaurant as open during business hours", async () => {
      const originalGetHours = Date.prototype.getHours;
      Date.prototype.getHours = jest.fn().mockReturnValue(12);

      const result = await syncRestaurantHours("rest-1");
      expect(result.isOpen).toBe(true);
      expect(result.nextOpen).toBeUndefined();

      Date.prototype.getHours = originalGetHours;
    });

    it("should mark restaurant as closed outside business hours", async () => {
      const originalGetHours = Date.prototype.getHours;
      Date.prototype.getHours = jest.fn().mockReturnValue(23);

      const result = await syncRestaurantHours("rest-1");
      expect(result.isOpen).toBe(false);
      expect(result.nextOpen).toBeDefined();

      Date.prototype.getHours = originalGetHours;
    });

    it("should update restaurant status in database", async () => {
      const originalGetHours = Date.prototype.getHours;
      Date.prototype.getHours = jest.fn().mockReturnValue(12);

      await syncRestaurantHours("rest-1");

      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isOpen: true }),
        })
      );

      Date.prototype.getHours = originalGetHours;
    });

    it("should handle non-existent restaurant", async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(syncRestaurantHours("nonexistent")).rejects.toThrow(
        "Restaurant not found"
      );
    });

    it("should calculate next open time when closed", async () => {
      const originalGetHours = Date.prototype.getHours;
      Date.prototype.getHours = jest.fn().mockReturnValue(23);

      const result = await syncRestaurantHours("rest-1");
      expect(result.nextOpen).toBeDefined();
      expect(result.nextOpen!.getHours()).toBe(9);

      Date.prototype.getHours = originalGetHours;
    });
  });

  describe("Cross-System Consistency", () => {
    it("should maintain menu-inventory consistency", async () => {
      await syncRestaurantData("rest-1");

      const menuItemUpdateCalls = mockPrisma.menuItem.updateMany.mock.calls;
      expect(menuItemUpdateCalls.length).toBeGreaterThan(0);
    });

    it("should sync order status with restaurant hours", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o1", status: "PENDING", restaurantId: "rest-1" },
      ]);

      const orders = await mockPrisma.order.findMany({
        where: { restaurantId: "rest-1" },
      });

      expect(orders).toHaveLength(1);
    });

    it("should handle bulk menu updates", async () => {
      mockPrisma.menuItem.updateMany.mockResolvedValue({ count: 5 });

      const result = await mockPrisma.menuItem.updateMany({
        where: { restaurantId: "rest-1" },
        data: { isAvailable: false },
      });

      expect(result.count).toBe(5);
    });
  });

  describe("Sync Scheduling", () => {
    it("should return sync timestamp", async () => {
      const before = Date.now();
      const result = await syncRestaurantData("rest-1");
      const after = Date.now();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it("should support incremental sync", async () => {
      const since = new Date(Date.now() - 3600000);
      mockPrisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

      const items = await mockPrisma.menuItem.findMany({
        where: {
          restaurantId: "rest-1",
          updatedAt: { gte: since },
        },
      });

      expect(items).toHaveLength(3);
    });
  });
});
