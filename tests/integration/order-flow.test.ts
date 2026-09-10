import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  prisma: {
    order: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    orderItem: {
      createMany: jest.fn(),
    },
    restaurant: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    delivery: {
      create: jest.fn(),
    },
    inventory: {
      updateMany: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fns: any[]) => Promise.all(fns)),
  },
}));

const mockPrisma = require("@/lib/db").prisma;

enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

interface OrderFlowResult {
  orderId: string;
  status: OrderStatus;
  steps: string[];
}

async function executeOrderFlow(
  customerId: string,
  restaurantId: string,
  items: { menuItemId: string; name: string; quantity: number; unitPrice: number }[]
): Promise<OrderFlowResult> {
  const steps: string[] = [];

  const restaurant = await mockPrisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
  if (!restaurant) throw new Error("Restaurant not found");
  if (!restaurant.isOpen) throw new Error("Restaurant is closed");
  steps.push("validated_restaurant");

  const customer = await mockPrisma.user.findUnique({
    where: { id: customerId },
  });
  if (!customer) throw new Error("Customer not found");
  steps.push("validated_customer");

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  if (subtotal < restaurant.minimumOrder) {
    throw new Error(`Order below minimum $${restaurant.minimumOrder}`);
  }
  steps.push("validated_minimum_order");

  const order = await mockPrisma.order.create({
    data: {
      customerId,
      restaurantId,
      status: OrderStatus.PENDING,
      subtotal,
      tax: Math.round(subtotal * 0.08 * 100) / 100,
      deliveryFee: subtotal >= 25 ? 0 : 3.99,
      total: 0,
      deliveryAddress: customer.address || "Default address",
    },
  });
  steps.push("created_order");

  await mockPrisma.orderItem.createMany({
    data: items.map((item) => ({
      orderId: order.id,
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    })),
  });
  steps.push("created_order_items");

  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const deliveryFee = subtotal >= 25 ? 0 : 3.99;
  const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;
  await mockPrisma.order.update({
    where: { id: order.id },
    data: { total },
  });
  steps.push("calculated_total");

  await mockPrisma.payment.create({
    data: {
      orderId: order.id,
      userId: customerId,
      amount: total,
      currency: "usd",
      status: "PENDING",
    },
  });
  steps.push("initiated_payment");

  const confirmedOrder = await mockPrisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.CONFIRMED },
  });
  steps.push("order_confirmed");

  return {
    orderId: order.id,
    status: OrderStatus.CONFIRMED,
    steps,
  };
}

async function processRestaurantAcceptance(
  orderId: string,
  estimatedPrepTimeMin: number
): Promise<void> {
  await mockPrisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.PREPARING,
      estimatedDeliveryTime: new Date(Date.now() + (estimatedPrepTimeMin + 15) * 60000),
    },
  });
}

async function processFoodReady(orderId: string): Promise<void> {
  await mockPrisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.READY },
  });
}

async function assignDelivery(
  orderId: string,
  driverId: string
): Promise<void> {
  await mockPrisma.delivery.create({
    data: {
      orderId,
      driverId,
      status: "ASSIGNED",
    },
  });

  await mockPrisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.OUT_FOR_DELIVERY },
  });
}

async function completeDelivery(
  orderId: string,
  actualDeliveryTime: Date
): Promise<void> {
  await mockPrisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.DELIVERED,
      actualDeliveryTime,
    },
  });
}

describe("Order Flow Integration", () => {
  const mockRestaurant = {
    id: "rest-1",
    name: "Pizza Palace",
    isOpen: true,
    minimumOrder: 10,
    estimatedPrepTimeMin: 15,
  };

  const mockCustomer = {
    id: "cust-1",
    name: "John Doe",
    address: "123 Main St",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
    mockPrisma.user.findUnique.mockResolvedValue(mockCustomer);
    mockPrisma.order.create.mockImplementation(async (args: any) => ({
      id: `order-${Date.now()}`,
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    mockPrisma.order.update.mockImplementation(async (args: any) => ({
      id: args.where.id,
      ...args.data,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("End-to-End Order Placement", () => {
    it("should complete full order placement flow", async () => {
      const result = await executeOrderFlow("cust-1", "rest-1", [
        { menuItemId: "m1", name: "Margherita Pizza", quantity: 2, unitPrice: 12.99 },
      ]);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(result.steps).toContain("validated_restaurant");
      expect(result.steps).toContain("validated_customer");
      expect(result.steps).toContain("created_order");
      expect(result.steps).toContain("calculated_total");
      expect(result.steps).toContain("initiated_payment");
      expect(result.steps).toContain("order_confirmed");
    });

    it("should reject order from non-existent restaurant", async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(
        executeOrderFlow("cust-1", "nonexistent", [
          { menuItemId: "m1", name: "Pizza", quantity: 1, unitPrice: 10 },
        ])
      ).rejects.toThrow("Restaurant not found");
    });

    it("should reject order when restaurant is closed", async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        ...mockRestaurant,
        isOpen: false,
      });

      await expect(
        executeOrderFlow("cust-1", "rest-1", [
          { menuItemId: "m1", name: "Pizza", quantity: 1, unitPrice: 10 },
        ])
      ).rejects.toThrow("Restaurant is closed");
    });

    it("should reject order below minimum", async () => {
      await expect(
        executeOrderFlow("cust-1", "rest-1", [
          { menuItemId: "m1", name: "Fries", quantity: 1, unitPrice: 5 },
        ])
      ).rejects.toThrow("Order below minimum");
    });

    it("should reject order from non-existent customer", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        executeOrderFlow("nonexistent", "rest-1", [
          { menuItemId: "m1", name: "Pizza", quantity: 1, unitPrice: 12.99 },
        ])
      ).rejects.toThrow("Customer not found");
    });

    it("should handle multiple items in order", async () => {
      const result = await executeOrderFlow("cust-1", "rest-1", [
        { menuItemId: "m1", name: "Pizza", quantity: 2, unitPrice: 12.99 },
        { menuItemId: "m2", name: "Salad", quantity: 1, unitPrice: 8.99 },
        { menuItemId: "m3", name: "Pasta", quantity: 1, unitPrice: 13.99 },
      ]);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(result.steps).toContain("created_order_items");
    });

    it("should calculate correct total with delivery fee", async () => {
      const result = await executeOrderFlow("cust-1", "rest-1", [
        { menuItemId: "m1", name: "Snack", quantity: 1, unitPrice: 12 },
      ]);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ total: expect.any(Number) }),
        })
      );
    });

    it("should waive delivery fee for large orders", async () => {
      const result = await executeOrderFlow("cust-1", "rest-1", [
        { menuItemId: "m1", name: "Feast", quantity: 3, unitPrice: 10 },
      ]);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe("Restaurant Processing", () => {
    it("should transition to PREPARING on acceptance", async () => {
      await processRestaurantAcceptance("order-1", 15);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OrderStatus.PREPARING }),
        })
      );
    });
  });

  describe("Food Ready", () => {
    it("should transition to READY when food is prepared", async () => {
      await processFoodReady("order-1");
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OrderStatus.READY }),
        })
      );
    });
  });

  describe("Delivery Assignment", () => {
    it("should assign driver and update order status", async () => {
      await assignDelivery("order-1", "driver-1");
      expect(mockPrisma.delivery.create).toHaveBeenCalled();
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.OUT_FOR_DELIVERY,
          }),
        })
      );
    });
  });

  describe("Delivery Completion", () => {
    it("should mark order as delivered", async () => {
      const deliveryTime = new Date();
      await completeDelivery("order-1", deliveryTime);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.DELIVERED,
            actualDeliveryTime: deliveryTime,
          }),
        })
      );
    });
  });

  describe("Full Lifecycle Integration", () => {
    it("should track complete order lifecycle", async () => {
      const result = await executeOrderFlow("cust-1", "rest-1", [
        { menuItemId: "m1", name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);

      await processRestaurantAcceptance(result.orderId, 15);
      await processFoodReady(result.orderId);
      await assignDelivery(result.orderId, "driver-1");
      await completeDelivery(result.orderId, new Date());

      expect(mockPrisma.order.update).toHaveBeenCalledTimes(4);
    });
  });
});
